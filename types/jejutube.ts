// 제주tube — 관리자가 등록한 유튜브 영상에서 추출한 스팟

export type JejutubeSpot = {
  name: string;
  category: string;      // 해변/오름/카페/맛집/관광지/액티비티/숙소
  description: string;   // 영상 속 맥락 1문장
  timestamp: string;     // MM:SS
  emoji: string;
  address?: string;
  lat?: number;
  lng?: number;
};

export type JejutubeVideo = {
  videoId: string;
  url: string;
  title: string;
  author: string;
  thumbnail: string;
  summary: string;
  tags: string[];
  spots: JejutubeSpot[];
  transcriptSource: "socialkit" | "gemini-video";
  createdAt: number; // epoch ms
};
