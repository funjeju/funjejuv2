"use client";

import { CctvFavoriteButton } from "@/components/common/CctvFavoriteButton";
import { ShareButton } from "@/components/common/ShareButton";

type Props = {
  cctvId: string;
  cctvName: string;
  description?: string;
};

export function CctvDetailActions({ cctvId, cctvName, description }: Props) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5">
      <ShareButton
        title={`${cctvName} — 제주 실시간 CCTV | FunJeju`}
        description={description}
        compact={false}
      />
      <CctvFavoriteButton id={cctvId} label={true} />
    </div>
  );
}
