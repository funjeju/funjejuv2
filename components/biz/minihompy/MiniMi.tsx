"use client";

import type { CSSProperties } from "react";
import type { MiniMiKind } from "@/lib/biz/types";
import { MINIMI } from "./minimi-config";

/** 투명 PNG 스프라이트가 있는 종류 (public/minihompy/sprites/{kind}-{pose}.png) */
const SPRITE_KINDS = new Set<MiniMiKind>([
  "haenyeo", "dolharbang", "hallabong", "baram", "yuchae", "gemeunmorae",
]);

const BASE_H = 84; // scale 1일 때 스프라이트 높이(px)

/**
 * 미니미 캐릭터 한 명.
 * 스프라이트가 있으면 투명 PNG, 없으면(유채꽃 등) CSS 도형 폴백.
 * pose: front(정면) / side(측면), flip: 측면 좌우반전(걷는 방향).
 */
export function MiniMi({
  kind,
  name,
  scale = 1,
  pose = "front",
  flip = false,
  customSprite,
  style,
}: {
  kind: MiniMiKind;
  name?: string;
  scale?: number;
  pose?: "front" | "side";
  flip?: boolean;
  /** 특별 미니미 등 커스텀 스프라이트(투명 PNG) 경로. 있으면 kind보다 우선. */
  customSprite?: string;
  style?: CSSProperties;
}) {
  const s = MINIMI[kind];

  if (customSprite || SPRITE_KINDS.has(kind)) {
    const src = customSprite ?? `/minihompy/sprites/${kind}-${pose}.png`;
    const h0 = BASE_H * scale;
    if (customSprite) {
      return (
        <div style={{ textAlign: "center", ...style }}>
          <img src={src} alt={`${s.label} 미니미`} draggable={false} style={{ height: h0, width: "auto", display: "block", margin: "0 auto", transform: flip ? "scaleX(-1)" : undefined, userSelect: "none" }} />
          {name && (<div style={{ fontSize: 11 * Math.max(scale, 0.85), background: "#fff", border: "1px solid #ddd", borderRadius: 7, marginTop: 1, padding: "0 3px", whiteSpace: "nowrap", display: "inline-block" }}>{name}</div>)}
        </div>
      );
    }
    const h = BASE_H * scale;
    return (
      <div style={{ textAlign: "center", ...style }}>
        <img
          src={`/minihompy/sprites/${kind}-${pose}.png`}
          alt={`${s.label} 미니미`}
          draggable={false}
          style={{ height: h, width: "auto", display: "block", margin: "0 auto", transform: flip ? "scaleX(-1)" : undefined, userSelect: "none" }}
        />
        {name && (
          <div style={{ fontSize: 11 * Math.max(scale, 0.85), background: "#fff", border: "1px solid #ddd", borderRadius: 7, marginTop: 1, padding: "0 3px", whiteSpace: "nowrap", display: "inline-block" }}>{name}</div>
        )}
      </div>
    );
  }

  // CSS 도형 폴백 (스프라이트 없는 종류)
  const head = 32 * scale;
  const bodyW = 40 * scale;
  const bodyH = 42 * scale;
  return (
    <div style={{ width: bodyW, textAlign: "center", ...style }}>
      <div style={{ margin: "0 auto", width: head, height: head, background: s.head, border: "1px solid #d9a", borderRadius: "50%" }} />
      <div style={{ margin: "2px auto 0", width: bodyW, height: bodyH, background: s.body, border: `1px solid ${s.bodyBorder}`, borderRadius: "12px 12px 6px 6px" }} />
      {name && (
        <div style={{ fontSize: 11 * Math.max(scale, 0.85), background: "#fff", border: "1px solid #ddd", borderRadius: 7, marginTop: 3, padding: "0 3px", whiteSpace: "nowrap", display: "inline-block" }}>{name}</div>
      )}
    </div>
  );
}
