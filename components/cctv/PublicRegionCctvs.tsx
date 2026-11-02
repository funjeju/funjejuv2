"use client";
import { usePublicCctvs } from "@/hooks/usePublicCctvs";
import { CctvList } from "@/components/cctv/CctvList";
export function PublicRegionCctvs({ region }: { region: string }) {
  const { cctvs, loading, error } = usePublicCctvs();
  const visible = cctvs.filter(camera => camera.region === region);
  if (loading || error || !visible.length) return <p role="status" className="p-6 text-sm">{loading ? "공개 카메라를 확인하고 있어요." : error ? "목록을 확인할 수 없어 연결을 보류합니다." : "이 지역은 최근 재생 확인을 마친 공개 카메라가 없습니다. 기존 기록은 보존됩니다."}</p>;
  return <CctvList cctvs={visible} />;
}
