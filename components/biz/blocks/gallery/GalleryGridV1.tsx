"use client";

import Image from "next/image";
import type { BlockProps } from "../BlockProps";
import { getThemeTokens } from "@/lib/biz/tokens";
import { EmptyBlockHint } from "../EmptyBlockHint";

export function GalleryGridV1({ block, site, isEditing }: BlockProps) {
  const theme = getThemeTokens(site.designTokens.themeId);
  const title = (block.data.title as string) || "갤러리";
  const images = site.contentAssets.galleryImages.slice(0, 6);

  if (images.length === 0) {
    if (!isEditing) return null;
    return <EmptyBlockHint label="갤러리 (사진 없음)" hint="‘사진’ 탭에서 갤러리 이미지를 업로드하세요." theme={theme} />;
  }

  return (
    <section className="py-16 px-6" style={{ backgroundColor: theme.surfaceAlt }}>
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-8 text-center" style={{ color: theme.text }}>
          {title}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {images.map((src, i) => (
            <div key={i} className="relative aspect-square rounded-2xl overflow-hidden">
              <Image src={src} alt={`${title} ${i + 1}`} fill className="object-cover hover:scale-105 transition-transform duration-300" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
