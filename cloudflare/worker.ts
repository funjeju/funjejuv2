/**
 * FunJeju CCTV Proxy Worker
 *
 * 라우팅:
 *   GET /cctv/:id          → KV에서 원본 URL 조회 후 m3u8 프록시 (세그먼트 URL 재작성)
 *   GET /cctv/:id/seg      → ?path= 로 전달된 .ts 세그먼트 프록시
 *   GET /cctv/:id/status   → 스트림 온라인 여부 확인 (헬스체크)
 *
 * KV 네임스페이스: CCTV_ORIGINS
 *   key: cctv ID (e.g. "hamdeok")
 *   value: JSON { originUrl: string, active: boolean }
 */

export interface Env {
  CCTV_ORIGINS: KVNamespace;
  ALLOWED_ORIGIN: string; // e.g. "https://funjeju.com" or "*" for dev
}

const COMMON_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Range",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: COMMON_HEADERS });
    }

    const url = new URL(request.url);
    const segments = url.pathname.split("/").filter(Boolean);
    // segments: ["cctv", ":id"] or ["cctv", ":id", "seg"]

    if (segments[0] !== "cctv" || !segments[1]) {
      return jsonError(404, "Not found");
    }

    const id = segments[1];
    const action = segments[2]; // "seg" | "status" | undefined

    // KV에서 CCTV 원본 정보 조회
    const raw = await env.CCTV_ORIGINS.get(id);
    if (!raw) return jsonError(404, `CCTV '${id}' not found`);

    const meta = JSON.parse(raw) as { originUrl: string; active: boolean };
    if (!meta.active) return jsonError(503, `CCTV '${id}' is currently offline`);

    const workerBase = `${url.protocol}//${url.host}/cctv/${id}`;

    // ── 세그먼트 프록시 ──────────────────────────────────────
    if (action === "seg") {
      const segPath = url.searchParams.get("path");
      if (!segPath) return jsonError(400, "Missing ?path param");

      const originSegUrl = resolveUrl(segPath, meta.originUrl);
      return proxyStream(request, originSegUrl, "video/MP2T");
    }

    // ── 헬스체크 ─────────────────────────────────────────────
    if (action === "status") {
      try {
        const r = await fetch(meta.originUrl, { method: "HEAD" });
        return json({ id, online: r.ok, status: r.status });
      } catch {
        return json({ id, online: false, status: 0 });
      }
    }

    // ── m3u8 프록시 (기본) ────────────────────────────────────
    return proxyM3u8(request, meta.originUrl, workerBase);
  },
};

// ─────────────────────────────────────────────────────────────
// m3u8 취득 → 세그먼트 URL 재작성 → 응답
// ─────────────────────────────────────────────────────────────
async function proxyM3u8(
  request: Request,
  originUrl: string,
  workerBase: string
): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(originUrl, {
      headers: { "User-Agent": "FunJeju-Proxy/1.0" },
    });
  } catch (e) {
    return jsonError(502, `Failed to fetch origin stream: ${e}`);
  }

  if (!res.ok) {
    return jsonError(res.status, `Origin returned ${res.status}`);
  }

  const text = await res.text();
  const rewritten = rewriteM3u8(text, originUrl, workerBase);

  return new Response(rewritten, {
    status: 200,
    headers: {
      ...COMMON_HEADERS,
      "Content-Type": "application/vnd.apple.mpegurl",
      "Cache-Control": "no-cache, no-store",
    },
  });
}

// ─────────────────────────────────────────────────────────────
// .ts 세그먼트 / 서브 m3u8 스트리밍 프록시
// ─────────────────────────────────────────────────────────────
async function proxyStream(
  request: Request,
  targetUrl: string,
  contentType: string
): Promise<Response> {
  const headers: Record<string, string> = {
    "User-Agent": "FunJeju-Proxy/1.0",
  };
  // Range 헤더 전달 (부분 요청 지원)
  const range = request.headers.get("Range");
  if (range) headers["Range"] = range;

  let res: Response;
  try {
    res = await fetch(targetUrl, { headers });
  } catch (e) {
    return jsonError(502, `Segment fetch failed: ${e}`);
  }

  return new Response(res.body, {
    status: res.status,
    headers: {
      ...COMMON_HEADERS,
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=10",
      ...(res.headers.get("Content-Length")
        ? { "Content-Length": res.headers.get("Content-Length")! }
        : {}),
      ...(res.headers.get("Content-Range")
        ? { "Content-Range": res.headers.get("Content-Range")! }
        : {}),
    },
  });
}

// ─────────────────────────────────────────────────────────────
// m3u8 내 URL 재작성
//   절대/상대 경로 모두 처리
//   서브 m3u8(마스터 플레이리스트) 안의 variant URL도 재작성
// ─────────────────────────────────────────────────────────────
function rewriteM3u8(m3u8: string, originUrl: string, workerBase: string): string {
  return m3u8
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return line;

      // 세그먼트 또는 서브 플레이리스트 URL
      const absolute = resolveUrl(trimmed, originUrl);

      if (trimmed.endsWith(".m3u8") || trimmed.includes(".m3u8?")) {
        // 서브 m3u8도 Worker 경유 (쿼리로 원본 URL 전달)
        return `${workerBase}/seg?path=${encodeURIComponent(absolute)}`;
      }

      // .ts 세그먼트
      return `${workerBase}/seg?path=${encodeURIComponent(absolute)}`;
    })
    .join("\n");
}

// ─────────────────────────────────────────────────────────────
// 상대 URL → 절대 URL 변환
// ─────────────────────────────────────────────────────────────
function resolveUrl(path: string, base: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  try {
    return new URL(path, base).href;
  } catch {
    return path;
  }
}

// ─────────────────────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────────────────────
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...COMMON_HEADERS, "Content-Type": "application/json" },
  });
}

function jsonError(status: number, message: string): Response {
  return json({ error: message }, status);
}
