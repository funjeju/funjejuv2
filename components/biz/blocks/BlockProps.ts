import type { SiteBlock, SiteSchema } from "@/lib/biz/types";

export interface BlockProps {
  block: SiteBlock;
  site: SiteSchema;
  isEditing?: boolean;
  onEdit?: (blockId: string, data: Record<string, unknown>) => void;
}
