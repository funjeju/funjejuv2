"use client";

/** 틀린그림찾기 이미지 → 서버 업로드 API → Firebase Storage → 다운로드 URL */
export async function uploadSpotImage(blob: Blob, label: string): Promise<string> {
  const base64 = await blobToBase64(blob);
  const res = await fetch("/api/admin/spot/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64, mime: blob.type || "image/png", label }),
  });
  const d = await res.json();
  if (!res.ok) throw new Error(d.error || "이미지 업로드 실패");
  return d.url;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
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
