import type { CctvDirection } from "@/types/cctv";

const EAST = ["구좌읍", "조천읍", "우도면", "성산읍", "남원읍"];
const WEST = ["애월읍", "한림읍", "한경면", "안덕면", "대정읍", "화순"];

export function getDirection(region: string): CctvDirection {
  if (EAST.some((k) => region.includes(k))) return "동";
  if (WEST.some((k) => region.includes(k))) return "서";
  if (region.includes("서귀포시")) return "남";
  return "북";
}

export const DIRECTION_META: Record<CctvDirection, { emoji: string; sub: string }> = {
  북: { emoji: "🧭", sub: "탑동·함덕·공항" },
  동: { emoji: "🌅", sub: "성산·구좌·우도" },
  남: { emoji: "🏖️", sub: "서귀포·중문·남원" },
  서: { emoji: "🌿", sub: "애월·한림·대정" },
};

export function extractYoutubeId(input: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = input.match(p);
    if (m) return m[1];
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) return input.trim();
  return null;
}
