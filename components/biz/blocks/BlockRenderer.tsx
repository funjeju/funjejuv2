"use client";

import type { SiteBlock, SiteSchema } from "@/lib/biz/types";
import { HeroCenteredV1 } from "./hero/HeroCenteredV1";
import { HeroCenteredV2 } from "./hero/HeroCenteredV2";
import { HeroCenteredV3 } from "./hero/HeroCenteredV3";
import { HeroSplitV1 } from "./hero/HeroSplitV1";
import { MenuGridV1 } from "./menu/MenuGridV1";
import { MenuGridV2 } from "./menu/MenuGridV2";
import { FeaturedCardV1 } from "./featured/FeaturedCardV1";
import { FeaturedCardV2 } from "./featured/FeaturedCardV2";
import { GalleryGridV1 } from "./gallery/GalleryGridV1";
import { GalleryMasonryV2 } from "./gallery/GalleryMasonryV2";
import { ReviewCarouselV1 } from "./review/ReviewCarouselV1";
import { ReviewCardV2 } from "./review/ReviewCardV2";
import { MapBlockV1 } from "./map/MapBlockV1";
import { CTABannerV1 } from "./cta/CTABannerV1";
import { CTABannerV2 } from "./cta/CTABannerV2";
import { ContactBlockV1 } from "./contact/ContactBlockV1";
import { PriceListV1 } from "./menu/PriceListV1";
import { BusinessHoursV1 } from "./contact/BusinessHoursV1";
import { BlogReviewsV1 } from "./blog/BlogReviewsV1";
import { AttractionInfoV1 } from "./attraction/AttractionInfoV1";

interface BlockRendererProps {
  block: SiteBlock;
  site: SiteSchema;
  isEditing?: boolean;
  onEdit?: (blockId: string, data: Record<string, unknown>) => void;
}

export function BlockRenderer({ block, site, isEditing, onEdit }: BlockRendererProps) {
  if (block.visible === false && !isEditing) return null;

  const props = { block, site, isEditing, onEdit };

  switch (block.componentType) {
    case "HeroCentered-v1": return <HeroCenteredV1 {...props} />;
    case "HeroCentered-v2": return <HeroCenteredV2 {...props} />;
    case "HeroCentered-v3": return <HeroCenteredV3 {...props} />;
    case "HeroSplit-v1": return <HeroSplitV1 {...props} />;
    case "MenuGrid-v1": return <MenuGridV1 {...props} />;
    case "MenuGrid-v2": return <MenuGridV2 {...props} />;
    case "FeaturedCard-v1": return <FeaturedCardV1 {...props} />;
    case "FeaturedCard-v2": return <FeaturedCardV2 {...props} />;
    case "FeaturedCard-v3": return <FeaturedCardV2 {...props} />;
    case "GalleryGrid-v1": return <GalleryGridV1 {...props} />;
    case "GalleryMasonry-v2": return <GalleryMasonryV2 {...props} />;
    case "ReviewCarousel-v1": return <ReviewCarouselV1 {...props} />;
    case "ReviewCard-v2": return <ReviewCardV2 {...props} />;
    case "MapBlock-v1": return <MapBlockV1 {...props} />;
    case "CTABanner-v1": return <CTABannerV1 {...props} />;
    case "CTABanner-v2": return <CTABannerV2 {...props} />;
    case "ContactBlock-v1": return <ContactBlockV1 {...props} />;
    case "PriceList-v1": return <PriceListV1 {...props} />;
    case "BusinessHours-v1": return <BusinessHoursV1 {...props} />;
    case "BlogReviews-v1": return <BlogReviewsV1 {...props} />;
    case "AttractionInfo-v1": return <AttractionInfoV1 {...props} />;
    default: return null;
  }
}
