import type { ThemeId } from "@/lib/biz/types";

export const SPACING = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40, "2xl": 64 } as const;

export const RADIUS = { sm: "8px", md: "16px", lg: "24px", full: "9999px" } as const;

export const IMAGE_RATIO = {
  hero: "aspect-[16/9]",
  square: "aspect-square",
  portrait: "aspect-[3/4]",
  card: "aspect-[4/3]",
} as const;

export interface ThemeTokens {
  primary: string;
  primaryFg: string;
  surface: string;
  surfaceAlt: string;
  accent: string; // 은은한 포인트 배경 (섹션 구분용, 톤다운)
  ink: string; // 가장 진한 브랜드 컬러 (대담한 헤드라인/푸터용)
  text: string;
  textMuted: string;
  border: string;
  gradient: string;
}

export const THEME_TOKENS: Record<ThemeId, ThemeTokens> = {
  "warm-ocean": {
    primary: "#5B5BD6",
    primaryFg: "#ffffff",
    surface: "#ffffff",
    surfaceAlt: "#FAFAFB",
    accent: "#F1F0FE",
    ink: "#1E1B3A",
    text: "#16161D",
    textMuted: "#71717A",
    border: "#ECECEF",
    gradient: "from-indigo-500 to-violet-600",
  },
  "jeju-warm": {
    primary: "#E8590C",
    primaryFg: "#ffffff",
    surface: "#ffffff",
    surfaceAlt: "#FCFAF7",
    accent: "#FBF0E6",
    ink: "#3D1E0A",
    text: "#1F1B18",
    textMuted: "#7A736C",
    border: "#EFE9E2",
    gradient: "from-orange-500 to-amber-500",
  },
  "luxury-modern": {
    primary: "#18181B",
    primaryFg: "#ffffff",
    surface: "#ffffff",
    surfaceAlt: "#FAFAFA",
    accent: "#F4F4F5",
    ink: "#09090B",
    text: "#09090B",
    textMuted: "#71717A",
    border: "#E4E4E7",
    gradient: "from-zinc-900 to-zinc-700",
  },
  "minimal-clean": {
    primary: "#2563EB",
    primaryFg: "#ffffff",
    surface: "#ffffff",
    surfaceAlt: "#FAFBFC",
    accent: "#EFF4FF",
    ink: "#0B1B3A",
    text: "#0F172A",
    textMuted: "#64748B",
    border: "#E8EDF3",
    gradient: "from-blue-500 to-sky-500",
  },
  "vintage-cozy": {
    primary: "#9A6A3C",
    primaryFg: "#ffffff",
    surface: "#FDFBF6",
    surfaceAlt: "#F8F3EA",
    accent: "#F1E8D8",
    ink: "#3A2A18",
    text: "#2A2018",
    textMuted: "#857A6B",
    border: "#EAE0CF",
    gradient: "from-amber-700 to-orange-600",
  },
  "fresh-green": {
    primary: "#16A34A",
    primaryFg: "#ffffff",
    surface: "#ffffff",
    surfaceAlt: "#FAFCFA",
    accent: "#EBF7EE",
    ink: "#0A2E18",
    text: "#14241A",
    textMuted: "#6B7B70",
    border: "#E4EFE7",
    gradient: "from-emerald-500 to-green-600",
  },
};

export function getThemeTokens(themeId: ThemeId): ThemeTokens {
  return THEME_TOKENS[themeId] ?? THEME_TOKENS["warm-ocean"];
}
