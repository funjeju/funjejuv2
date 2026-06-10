/**
 * Vercel Cron — Lightsail 헬스체크 + 자동 재부팅
 *
 * 흐름:
 *  1. 1분마다 PROXY_URL/health 핑
 *  2. 3번 연속 실패 시 AWS Lightsail API로 reboot
 *  3. 결과를 Firestore에 로깅 (admin/logs에서 확인)
 *
 * vercel.json:
 *  { "crons": [{ "path": "/api/cron/health-check", "schedule": "* * * * *" }] }
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const PROXY_URL  = process.env.NEXT_PUBLIC_PROXY_URL ?? "";
const HEALTH_FAILURE_KV = "_proxyHealthFails"; // Firestore에 저장할 키

// AWS Lightsail API 인증 (서명) — 환경변수 필요:
//   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION (ap-northeast-2)
//   LIGHTSAIL_INSTANCE_NAME
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET     = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION     = process.env.AWS_REGION ?? "ap-northeast-2";
const LS_INSTANCE    = process.env.LIGHTSAIL_INSTANCE_NAME;

const FAILURE_THRESHOLD = 3;

export async function GET(req: NextRequest) {
  // Vercel Cron이 호출할 때만 허용 (CRON_SECRET 검증)
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!PROXY_URL) {
    return NextResponse.json({ error: "PROXY_URL not configured" }, { status: 500 });
  }

  // 1) Health 핑 (3초 timeout)
  const healthy = await pingHealth(PROXY_URL);

  // 2) 실패 카운터 (Firestore에 영구 저장 — Vercel 함수는 상태 없음)
  const failures = await readFailureCount();

  if (healthy) {
    if (failures > 0) await writeFailureCount(0);
    return NextResponse.json({ status: "ok", healthy: true, failures: 0 });
  }

  // 실패
  const newFailures = failures + 1;
  await writeFailureCount(newFailures);

  if (newFailures < FAILURE_THRESHOLD) {
    return NextResponse.json({ status: "unhealthy", failures: newFailures, threshold: FAILURE_THRESHOLD });
  }

  // 3) 임계치 초과 → AWS Lightsail 재부팅
  if (!AWS_ACCESS_KEY || !AWS_SECRET || !LS_INSTANCE) {
    return NextResponse.json({
      status: "reboot_skipped",
      reason: "AWS credentials not configured",
      failures: newFailures,
    });
  }

  const rebootResult = await rebootLightsail();
  await writeFailureCount(0); // 재부팅 시도했으니 카운터 리셋

  return NextResponse.json({
    status: "reboot_triggered",
    failures: newFailures,
    rebootResult,
  });
}

async function pingHealth(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/health`, {
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = await res.json() as { ok?: boolean };
    return !!data.ok;
  } catch {
    return false;
  }
}

// ── Firestore에 실패 카운터 저장 (Vercel 함수 stateless) ──────
async function readFailureCount(): Promise<number> {
  try {
    const { getAdminDb } = await import("@/lib/firebase-admin");
    const doc = await getAdminDb().collection("_meta").doc(HEALTH_FAILURE_KV).get();
    return doc.exists ? (doc.data()?.count ?? 0) : 0;
  } catch {
    return 0;
  }
}

async function writeFailureCount(count: number): Promise<void> {
  try {
    const { getAdminDb } = await import("@/lib/firebase-admin");
    await getAdminDb().collection("_meta").doc(HEALTH_FAILURE_KV).set({
      count,
      updatedAt: new Date(),
    });
  } catch (e) {
    console.error("[health-check] failure count write failed:", e);
  }
}

// ── AWS Lightsail reboot API (서명 v4) ─────────────────────────
async function rebootLightsail(): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const service = "lightsail";
    const host = `lightsail.${AWS_REGION}.amazonaws.com`;
    const endpoint = `https://${host}/`;
    const target = "Lightsail_20161128.RebootInstance";
    const body = JSON.stringify({ instanceName: LS_INSTANCE });

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);

    const canonicalHeaders =
      `host:${host}\n` +
      `x-amz-date:${amzDate}\n` +
      `x-amz-target:${target}\n`;
    const signedHeaders = "host;x-amz-date;x-amz-target";

    const hashedBody = await sha256Hex(body);
    const canonicalRequest =
      `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${hashedBody}`;

    const credentialScope = `${dateStamp}/${AWS_REGION}/${service}/aws4_request`;
    const stringToSign =
      `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${await sha256Hex(canonicalRequest)}`;

    const signingKey = await getSigningKey(AWS_SECRET!, dateStamp, AWS_REGION, service);
    const signature = await hmacHex(signingKey, stringToSign);

    const authHeader =
      `AWS4-HMAC-SHA256 Credential=${AWS_ACCESS_KEY}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": target,
        "X-Amz-Date": amzDate,
        "Authorization": authHeader,
      },
      body,
      signal: AbortSignal.timeout(10000),
    });

    return { ok: res.ok, status: res.status, error: res.ok ? undefined : await res.text().catch(() => "") };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function sha256Hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(key: ArrayBuffer | Uint8Array, msg: string): Promise<ArrayBuffer> {
  const keyBuf = key instanceof Uint8Array ? key : new Uint8Array(key);
  const cryptoKey = await crypto.subtle.importKey(
    "raw", keyBuf, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(msg));
}

async function hmacHex(key: ArrayBuffer | Uint8Array, msg: string): Promise<string> {
  const sig = await hmac(key, msg);
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getSigningKey(secret: string, date: string, region: string, service: string): Promise<ArrayBuffer> {
  const kDate    = await hmac(new TextEncoder().encode(`AWS4${secret}`), date);
  const kRegion  = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, "aws4_request");
  return kSigning;
}
