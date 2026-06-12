"use client";

import type { BlockProps } from "../BlockProps";
import { getThemeTokens } from "@/lib/biz/tokens";
import { SectionHeader } from "../SectionHeader";
import { EmptyBlockHint } from "../EmptyBlockHint";
import { ExternalLink, PenLine } from "lucide-react";

interface BlogPost {
  title: string;
  link: string;
  description: string;
  bloggername?: string;
  postdate?: string;
}

function formatDate(yyyymmdd?: string): string {
  if (!yyyymmdd || yyyymmdd.length !== 8) return "";
  return `${yyyymmdd.slice(0, 4)}.${yyyymmdd.slice(4, 6)}.${yyyymmdd.slice(6, 8)}`;
}

export function BlogReviewsV1({ block, site, isEditing, onEdit }: BlockProps) {
  const theme = getThemeTokens(site.designTokens.themeId);
  const title = (block.data.title as string) || "블로그 후기";
  const posts = (block.data.posts as BlogPost[]) || [];

  if (posts.length === 0) {
    if (!isEditing) return null;
    return <EmptyBlockHint label="블로그 후기 (내용 없음)" hint="'블로그' 탭에서 가게명으로 검색하거나 링크를 추가하세요." theme={theme} />;
  }

  return (
    <section className="py-20 px-6" style={{ backgroundColor: theme.surface }}>
      <div className="max-w-2xl mx-auto">
        <SectionHeader eyebrow="Blog" title={title}
          onTitleChange={(v) => onEdit?.(block.blockId, { title: v })} isEditing={isEditing} theme={theme} />

        <div className="mt-10 space-y-3">
          {posts.map((post, i) => (
            <a key={i} href={post.link} target="_blank" rel="noopener noreferrer"
              className="group flex items-start gap-3 rounded-2xl border p-4 transition-colors hover:border-current"
              style={{ borderColor: theme.border }}>
              <PenLine size={18} className="flex-shrink-0 mt-0.5" style={{ color: theme.primary }} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-snug" style={{ color: theme.text }}>{post.title}</p>
                {post.description && (
                  <p className="text-xs mt-1 line-clamp-2 leading-relaxed" style={{ color: theme.textMuted }}>{post.description}</p>
                )}
                <div className="flex items-center gap-2 mt-2 text-[11px]" style={{ color: theme.textMuted }}>
                  {post.bloggername && <span>{post.bloggername}</span>}
                  {post.postdate && <span>· {formatDate(post.postdate)}</span>}
                </div>
              </div>
              <ExternalLink size={14} className="flex-shrink-0 opacity-40 group-hover:opacity-100" style={{ color: theme.primary }} />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
