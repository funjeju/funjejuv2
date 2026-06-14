import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { SiteSchema, SiteBlock } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 갤러리 이미지를 올렸는데 layout에 갤러리 블록이 없는 사이트 보정.
 * (옛 사이트·갤러리 없는 템플릿으로 생성된 경우 사진이 어디에도 안 떠서 추가)
 * 추천/메뉴 다음, 리뷰·지도·연락처·CTA 앞에 끼워넣는다.
 */
export function ensureGalleryBlock(site: SiteSchema): SiteSchema {
  const hasImages = (site.contentAssets?.galleryImages?.length ?? 0) > 0;
  const hasGallery = site.layout.some((b) => b.componentType.startsWith("Gallery"));
  if (!hasImages || hasGallery) return site;

  const galleryBlock: SiteBlock = {
    blockId: "gallery-auto",
    componentType: "GalleryGrid-v1",
    data: { title: "갤러리" },
    visible: true,
  };
  const layout = [...site.layout];
  const tailIdx = layout.findIndex((b) => /^(Review|Map|Contact|CTA|Blog)/.test(b.componentType));
  layout.splice(tailIdx >= 0 ? tailIdx : layout.length, 0, galleryBlock);
  return { ...site, layout };
}

// 루트 경로와 충돌하면 안 되는 예약어 (siteId가 이것과 같으면 안 됨)
export const RESERVED_SLUGS = new Set([
  "admin", "api", "create", "dashboard", "editor", "login", "signup",
  "tools", "site", "private", "p", "sitemap.xml", "robots.txt", "favicon.ico", "_next",
]);

export function generatePersonalId(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  const suffix = Math.random().toString(36).slice(2, 8);
  return base ? `${base}-${suffix}` : `me-${suffix}`;
}

export function generateSiteId(name: string): string {
  // siteId는 URL 경로(123.com/{siteId})·Firestore 문서ID로 쓰이므로 영숫자만 허용.
  // 한글 등은 제거하고, 남는 게 없으면 "site"를 기본 prefix로 사용.
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
  const suffix = Math.random().toString(36).slice(2, 8);
  // 랜덤 접미사가 항상 붙으므로 예약어와 정확히 같아질 일은 없지만,
  // base가 비었거나 예약어면 안전하게 prefix를 둔다.
  const safeBase = base && !RESERVED_SLUGS.has(base) ? base : "site";
  return `${safeBase}-${suffix}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("ko-KR").format(price) + "원";
}

export function formatPhone(phone: string): string {
  return phone.replace(/(\d{3,4})(\d{3,4})(\d{4})/, "$1-$2-$3");
}

/**
 * 앱의 기준 URL을 반환한다.
 * 1순위: 브라우저에서 실행 중이면 현재 origin (배포 도메인 그대로)
 * 2순위: NEXT_PUBLIC_APP_URL 환경변수
 * 3순위: Vercel 자동 주입 도메인
 * 4순위: localhost (로컬 개발)
 */
export function getAppUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}
