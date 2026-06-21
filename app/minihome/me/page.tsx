import type { Metadata } from "next";
import { MyMiniHome } from "@/components/biz/minihompy/MyMiniHome";

export const metadata: Metadata = {
  title: "내 미니홈피 🏠 | 펀제주",
  description: "나만의 제주 미니홈피 — 미니미 고르고 방 꾸미기.",
};

export default function MyMiniHomePage() {
  return <MyMiniHome />;
}
