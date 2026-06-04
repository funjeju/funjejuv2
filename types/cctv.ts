export type CctvDirection = "북" | "동" | "남" | "서";
export type CctvStatus = "실시간" | "점검중" | "비활성";

/** 앱 전체 공통 타입 (originUrl 미포함) */
export type Cctv = {
  id: string;
  name: string;
  region: string;
  direction: CctvDirection;
  category: string;
  status: CctvStatus;
  description: string;
  latitude: number;
  longitude: number;
  isSaved: boolean;
  youtubeId?: string;       // 유튜브 라이브/영상 ID — 있으면 HLS 대신 유튜브 재생
  streamProxyUrl: string | null;
};

/** Firestore 저장 타입 (originUrl 포함) */
export type CctvEntry = {
  id: string;
  name: string;
  region: string;
  direction: CctvDirection;
  category: string;
  originUrl: string;        // HLS 원본 URL (Lightsail 프록시용)
  youtubeId?: string;
  active: boolean;
  description: string;
  lat?: number;
  lng?: number;
  addedAt?: string;
};
