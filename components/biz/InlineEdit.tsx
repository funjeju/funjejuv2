"use client";

import { useRef, useEffect } from "react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/biz/utils";

interface InlineEditProps {
  value: string;
  onChange: (v: string) => void;
  isEditing?: boolean;
  tag?: "h1" | "h2" | "h3" | "p" | "span";
  className?: string;
  style?: CSSProperties;
  placeholder?: string;
  multiline?: boolean;
}

export function InlineEdit({
  value,
  onChange,
  isEditing,
  tag: Tag = "p",
  className,
  style,
  placeholder = "텍스트를 입력하세요",
  multiline = false,
}: InlineEditProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.innerText !== value) {
      ref.current.innerText = value || "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isEditing) {
    return <Tag className={className} style={style}>{value}</Tag>;
  }

  return (
    <Tag
      ref={ref as React.RefObject<HTMLHeadingElement>}
      contentEditable
      suppressContentEditableWarning
      style={style}
      onBlur={(e) => onChange(e.currentTarget.innerText.trim())}
      onKeyDown={(e) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLElement).blur();
        }
      }}
      className={cn(
        className,
        "outline-none cursor-text",
        "ring-2 ring-indigo-300/0 focus:ring-indigo-300/60 rounded-sm transition-all",
        !value && "opacity-40"
      )}
      data-placeholder={placeholder}
    />
  );
}
