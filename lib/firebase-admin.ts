import "server-only";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

/**
 * Firebase Admin SDK 싱글톤
 *
 * 필요 환경변수: FIREBASE_SERVICE_ACCOUNT
 * - Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → "새 비공개 키 생성"
 * - 다운로드한 JSON 전체를 그대로 환경변수에 붙여넣기 (한 줄로 만들 필요 없음)
 *
 * Admin SDK는 Firestore 보안 규칙을 우회하므로
 * 클라이언트 규칙은 항상 잠궈둘 수 있습니다.
 */

let adminApp: App | null = null;
let adminDb:  Firestore | null = null;

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT 환경변수가 설정되지 않았습니다.\n" +
      "Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성 → 다운로드한 JSON 전체를 Vercel 환경변수에 등록하세요."
    );
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT JSON 파싱 실패. JSON 형식이 올바른지 확인하세요.");
  }
}

export function getAdminApp(): App {
  if (adminApp) return adminApp;

  const existing = getApps();
  if (existing.length > 0) {
    adminApp = existing[0];
    return adminApp;
  }

  const serviceAccount = parseServiceAccount();
  adminApp = initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
  return adminApp;
}

export function getAdminDb(): Firestore {
  if (adminDb) return adminDb;
  adminDb = getFirestore(getAdminApp());
  return adminDb;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

/** Authorization: Bearer <Firebase ID 토큰> 검증 → uid/email 반환 (실패 시 null) */
export async function verifyFirebaseToken(
  authHeader: string | null
): Promise<{ uid: string; name?: string; email?: string } | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(authHeader.slice(7));
    return {
      uid: decoded.uid,
      name: decoded.name as string | undefined,
      email: decoded.email,
    };
  } catch {
    return null;
  }
}
