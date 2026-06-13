import type { Timestamp } from "firebase/firestore";

export type ExifData = {
  camera?: string;          // "SONY ILCE-7M4"
  lens?: string;            // "FE 35mm F1.8"
  focalLength?: string;     // "35mm"
  fStop?: string;           // "f/1.8"
  iso?: number;             // 200
  exposureTime?: string;    // "1/500s"
  date?: string;            // "2026:06:04 14:32:18"
};

export type FeedFilter = "none" | "warm" | "cool" | "vivid" | "cinematic";

export type Feed = {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string | null;
  imageUrl: string;        // 대표 이미지 (= images[0], 하위호환)
  images?: string[];       // 여러 장 (최대 5). 단일 피드는 [imageUrl] 또는 미설정
  exif: ExifData;
  aiCopy: string;             // 10~20자
  filter: FeedFilter;
  category: string;           // "자연" | "카페" | "맛집" | "액티비티" | "숙소"
  regionId?: string;          // "jeju-hallim" 등 JEJU_REGIONS id
  regionName?: string;        // "한림읍" (표시용)
  regionCity?: "제주시" | "서귀포시";
  gps?: { lat: number; lng: number };
  placeName?: string;         // 업소명 (GPS로 매칭 후 확인/편집)
  /** 연결된 비즈 홈페이지 — 관리자/영업사원이 대신 올릴 때 등록된 홈페이지 중 선택 */
  homepageSlug?: string;
  homepageName?: string;
  createdAt: Timestamp | null;
  likes: number;
};

export type FeedAuthor = {
  uid: string;
  displayName: string;
  photoURL: string | null;
  isBusiness: boolean;
  ctaData?: {
    text: string;             // 최대 8자
    url: string;
    variant: "primary" | "outline";
  };
};
