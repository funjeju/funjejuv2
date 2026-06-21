import { notFound } from "next/navigation";
import { cache } from "react";
import type { Metadata } from "next";
import { getSite as getSiteRaw } from "@/lib/biz/store";
import { listGuestPosts } from "@/lib/biz/minihompy-store";
import { MiniHompy } from "@/components/biz/minihompy/MiniHompy";
import type { SiteSchema } from "@/lib/biz/types";

const SITE_URL = "https://funjeju.com";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toPlain<T>(data: unknown): T {
  return JSON.parse(JSON.stringify(data)) as T;
}

const getSite = cache(async (slug: string): Promise<SiteSchema | null> => {
  try {
    const s = await getSiteRaw(slug);
    return s && s.published ? toPlain<SiteSchema>(s) : null;
  } catch (e) {
    console.error("[minihompy] read failed:", e);
    return null;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const site = await getSite(slug);
  if (!site) return { title: "미니홈피를 찾을 수 없습니다 | 펀제주" };

  const m = site.merchantInfo;
  const url = `${SITE_URL}/biz/${slug}/home`;
  const title = `${m.name} 미니홈피 🏠 | 펀제주`;
  const description = `${m.name}의 미니홈피에 놀러오세요! 방명록 남기고 일촌해요 ♥`;
  const images = site.contentAssets.heroImage ? [site.contentAssets.heroImage] : [];

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", locale: "ko_KR", url, title, description, siteName: m.name, images },
    twitter: { card: images.length ? "summary_large_image" : "summary", title, description, images },
  };
}

export default async function MiniHompyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const site = await getSite(slug);
  if (!site) notFound();

  const initialPosts = await listGuestPosts(slug).catch(() => []);

  return <MiniHompy site={site} initialPosts={initialPosts} />;
}
