export type Restaurant = {
  id: string;
  title: string;
  content: string;        // HTML 포함
  region: string;         // "한경", "애월", "구좌" 등
  menu: string;           // "카페", "흑돼지", "갈치요리" 등
  options: string;        // "펀제주인증||주차|혼밥" 같은 || 구분 문자열
  hours: string;          // "09|30|18|50" 형태
  prices: string;
  images: string[];       // 파일명 배열
  address?: string;       // 도로명/지번 주소
  lat?: number;
  lng?: number;
};

export type RestaurantSummary = Pick<
  Restaurant,
  "id" | "title" | "region" | "menu" | "options"
> & {
  thumbnail: string | null;
  shortDescription: string;
  address?: string;
  lat?: number;
  lng?: number;
};
