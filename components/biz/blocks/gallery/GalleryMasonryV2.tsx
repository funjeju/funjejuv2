"use client";

import Image from "next/image";
import type { BlockProps } from "../BlockProps";
import { getThemeTokens } from "@/lib/biz/tokens";
import { cn } from "@/lib/biz/utils";

const ASPECT_CLASSES = ["aspect-square", "aspect-[3/4]", "aspect-[4/3]", "aspect-square", "aspect-[3/4]", "aspect-square"];

export function GalleryMasonryV2({ block, site }: BlockProps) {
  const theme = getThemeTokens(site.designTokens.themeId);
  const title = (block.data.title as string) || "스타일";
  const images = site.contentAssets.galleryImages.slice(0, 6);

  if (images.length === 0) return null;

  return (
    <section className="py-16 px-6" style={{ backgroundColor: theme.surface }}>
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-8 text-center" style={{ color: theme.text }}>
          {title}
        </h2>
        <div className="columns-2 gap-2 space-y-2">
          {images.map((src, i) => (
            <div
              key={i}
              className={cn("relative w-full break-inside-avoid rounded-2xl overflow-hidden", ASPECT_CLASSES[i % ASPECT_CLASSES.length])}
            >
              <Image src={src} alt={`${title} ${i + 1}`} fill className="object-cover" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
