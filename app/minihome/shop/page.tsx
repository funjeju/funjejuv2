import type { Metadata } from "next";
import { Shop } from "@/components/biz/minihompy/Shop";

export const metadata: Metadata = {
  title: "미니홈피 상점 🛍️ | 펀제주",
  description: "보말로 커스텀 배경·특별 미니미·아이템을 꾸며보세요.",
};

export default function ShopPage() {
  return <Shop />;
}
