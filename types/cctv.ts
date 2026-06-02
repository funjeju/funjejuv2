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
};
