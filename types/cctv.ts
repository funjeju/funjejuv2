export type CctvStatus = "실시간" | "점검중" | "비활성";

export type Cctv = {
  id: string;
  name: string;
  region: string;
  category: string;
  status: CctvStatus;
  description: string;
  latitude: number;
  longitude: number;
  isSaved: boolean;
  /**
   * Cloudflare Worker 프록시 URL (클라이언트에 노출)
   * e.g. "https://worker.funjeju.com/cctv/hamdeok"
   * null이면 스트림 미등록 상태
   */
  streamProxyUrl: string | null;
};
