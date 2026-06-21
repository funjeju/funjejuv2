import type { MiniMiKind, RoomConcept } from "@/lib/biz/types";

/**
 * 제주 미니미 6종 + 미니룸 컨셉 설정.
 * 미니미: 현재 CSS 도형 → 추후 투명 PNG 스프라이트로 교체(head/body 대신 sprite 경로).
 * 방 컨셉: bgImage(일러스트 배경)가 있으면 그걸 쓰고, 없으면 CSS 그라데이션 + 도형 소품 폴백.
 */

export interface MiniMiStyle {
  label: string;
  head: string;
  body: string;
  bodyBorder: string;
  emoji: string;
}

export const MINIMI: Record<MiniMiKind, MiniMiStyle> = {
  haenyeo: { label: "해녀", head: "#ffe0bd", body: "#2f3236", bodyBorder: "#1c1e21", emoji: "🤿" },
  dolharbang: { label: "돌하르방", head: "#cfcfc7", body: "#9a9a92", bodyBorder: "#7c7c74", emoji: "🗿" },
  hallabong: { label: "한라봉", head: "#ffe0bd", body: "#f59e0b", bodyBorder: "#d97706", emoji: "🍊" },
  baram: { label: "바람", head: "#ffe0bd", body: "#bcd4f0", bodyBorder: "#8fb4e0", emoji: "🍃" },
  yuchae: { label: "유채꽃", head: "#ffe0bd", body: "#ffd84d", bodyBorder: "#e8b923", emoji: "🌼" },
  gemeunmorae: { label: "검은모래", head: "#ffe0bd", body: "#1d2b3a", bodyBorder: "#0f1a26", emoji: "🏖️" },
};

export const MINIMI_ORDER: MiniMiKind[] = [
  "haenyeo", "dolharbang", "hallabong", "baram", "yuchae", "gemeunmorae",
];

export interface RoomStyle {
  label: string;
  sub: string;
  /** 방 배경 CSS 그라데이션 (일러스트 없을 때 폴백) */
  bg: string;
  /** 일러스트 배경 (public/minihompy/*). 있으면 우선, 404면 bg 그라데이션 노출 */
  bgImage?: string;
  /** 페이지 전체 배경색 (컨셉 분위기) */
  pageBg: string;
  /** 강조색 (메뉴탭·테두리·타이틀) */
  accent: string;
  /** 강조색 연한 버전 (탭 배경·칩) */
  accentSoft: string;
  emoji: string;
}

export const ROOM_CONCEPTS: Record<RoomConcept, RoomStyle> = {
  oreum: {
    label: "오름",
    sub: "푸른 오름과 들꽃이 있는 제주",
    bg: "linear-gradient(#cdeafe 0 46%,#b6e08a 46% 100%)",
    bgImage: "/minihompy/room-oreum.png",
    pageBg: "#9ec46f",
    accent: "#5b9e3f",
    accentSoft: "#eaf4dc",
    emoji: "⛰️",
  },
  tangerine: {
    label: "귤농장",
    sub: "탐스러운 귤이 가득한 귤농장",
    bg: "linear-gradient(#d6ecff 0 52%,#cdebb0 52% 100%)",
    bgImage: "/minihompy/room-tangerine.png",
    pageBg: "#eaba6a",
    accent: "#e0890a",
    accentSoft: "#fbe8cf",
    emoji: "🍊",
  },
  beach: {
    label: "해수욕장",
    sub: "시원한 바다와 함께하는 여름",
    bg: "linear-gradient(#bfe6ff 0 40%,#9fd4f0 40% 64%,#f0e2bd 64% 100%)",
    bgImage: "/minihompy/room-beach.png",
    pageBg: "#7cc0db",
    accent: "#3f8fc4",
    accentSoft: "#dceefa",
    emoji: "🏖️",
  },
};

export const ROOM_ORDER: RoomConcept[] = ["oreum", "tangerine", "beach"];
