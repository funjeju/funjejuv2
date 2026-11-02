import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { findSkyCamera, skyCameraSub } from "@/lib/sky/cameras";
import { httpViewerUrl } from "@/lib/sky/watch";
import { SkyPlayer } from "@/components/sky/SkyPlayer";
import { SkyFonts } from "@/components/sky/SkyFonts";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cam = findSkyCamera((await params).id);
  return {
    title: cam ? `${cam.name} 실시간 CCTV` : "실시간 CCTV",
    robots: { index: false, follow: false },
  };
}

const JEJUSI_OFFICIAL = "https://www.jejusi.go.kr/bangjae/realcctvHls/waveHlsCctv.do";

export default async function WatchPage({ params }: Props) {
  const cam = findSkyCamera((await params).id);
  if (!cam) notFound();
  // 평문 HTTP 원본은 HTTPS 페이지에서 못 튼다 → HTTP 뷰어로 넘긴다
  if (cam.source.kind === "http") redirect(httpViewerUrl(cam));

  const credit =
    cam.source.kind === "jejusi" ? "제주시 재난안전대책본부" : "제주특별자치도 한라산국립공원";

  return (
    <>
      <SkyFonts />
      <SkyPlayer
        id={cam.id}
        name={cam.name}
        sub={skyCameraSub(cam)}
        kind={cam.source.kind}
        url={cam.source.kind === "hls" ? cam.source.url : undefined}
        officialUrl={cam.source.kind === "jejusi" ? JEJUSI_OFFICIAL : "https://www.jeju.go.kr/tool/halla/cctv.html"}
        credit={credit}
      />
    </>
  );
}
