import type { Cctv } from "@/types/cctv";

export const mockCctvs: Cctv[] = [
  {
    id: "hamdeok",
    name: "함덕 해변 CCTV",
    region: "제주시",
    category: "해변",
    status: "실시간",
    description: "바다 색과 혼잡도를 빠르게 확인하기 좋은 북동부 대표 해변입니다.",
    latitude: 33.543,
    longitude: 126.669,
    isSaved: false
  },
  {
    id: "seongsan",
    name: "성산 일출봉 CCTV",
    region: "서귀포시",
    category: "오름",
    status: "실시간",
    description: "동쪽 날씨와 일출 분위기를 확인하고 주변 동선을 잡기 좋습니다.",
    latitude: 33.458,
    longitude: 126.942,
    isSaved: true
  },
  {
    id: "aewol",
    name: "애월 해안도로 CCTV",
    region: "제주시",
    category: "드라이브",
    status: "실시간",
    description: "해안도로 교통과 노을 분위기를 함께 참고할 수 있는 지점입니다.",
    latitude: 33.463,
    longitude: 126.309,
    isSaved: false
  },
  {
    id: "jungmun",
    name: "중문 관광단지 CCTV",
    region: "서귀포시",
    category: "관광지",
    status: "실시간",
    description: "서귀포 남부 관광지 이동 전 날씨와 현장 분위기를 확인합니다.",
    latitude: 33.245,
    longitude: 126.412,
    isSaved: false
  }
];
