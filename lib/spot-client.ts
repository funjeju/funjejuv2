"use client";

import { getApps } from "firebase/app";
import { ref, uploadBytes, getDownloadURL, getStorage } from "firebase/storage";

/** 틀린그림찾기 이미지 → Firebase Storage 업로드 → 다운로드 URL */
export async function uploadSpotImage(blob: Blob, label: string): Promise<string> {
  const app = getApps()[0];
  if (!app) throw new Error("Firebase not initialized");
  const storage = getStorage(app);
  const path = `spot/${Date.now()}-${label}-${Math.random().toString(36).slice(2, 8)}.png`;
  const r = ref(storage, path);
  await uploadBytes(r, blob, { contentType: "image/png" });
  return getDownloadURL(r);
}

/** base64(순수) → Blob */
export function base64ToBlob(b64: string, mime = "image/png"): Blob {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

/** dataURL → 순수 base64 + mime */
export function splitDataUrl(dataUrl: string): { base64: string; mime: string } {
  const mime = dataUrl.split(";")[0].split(":")[1] || "image/png";
  const base64 = dataUrl.split(",")[1] || "";
  return { base64, mime };
}
