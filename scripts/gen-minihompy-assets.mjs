// 미니홈피 남은 에셋 생성 — gpt-image-2 (quality: low).
// 배경 2종(설경·별밤) + 특별 미니미 2종(산타·스쿠버, 투명배경).
//
// 실행: node --env-file=.env.local scripts/gen-minihompy-assets.mjs

import OpenAI from "openai";
import { writeFile, mkdir } from "node:fs/promises";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
if (!process.env.OPENAI_API_KEY) { console.error("OPENAI_API_KEY 없음 (.env.local 확인)"); process.exit(1); }

const JOBS = [
  {
    file: "public/minihompy/bg-snow.png", size: "1536x1024", background: "opaque",
    prompt: "Cute soft 2D storybook illustration, Hallasan snowy winter landscape in Jeju, snow-covered pine trees and a white rounded hill, soft blue-white pastel palette, gentle falling snow. Flat snowy ground at the bottom for a character to stand. No characters, no people, no text, no watermark.",
  },
  {
    file: "public/minihompy/bg-night.png", size: "1536x1024", background: "opaque",
    prompt: "Cute soft 2D storybook illustration, Jeju starry night sky, milky way and glowing stars over a dark oreum hill silhouette, deep blue and purple pastel palette, fireflies. Flat grassy ground at the bottom for a character to stand. No characters, no people, no text, no watermark.",
  },
  {
    file: "public/minihompy/sprites/mm-santa.png", size: "1024x1536", background: "transparent",
    prompt: "Cute chibi character wearing a Santa Claus outfit (red hat with white pompom, red coat with white trim, black belt), full body, standing front view, friendly smile, big head small body, soft cel-shaded cartoon with thick clean outline, Korean minihompy avatar style. Transparent background, single character centered, no text, no ground shadow.",
  },
  {
    file: "public/minihompy/sprites/mm-diver.png", size: "1024x1536", background: "transparent",
    prompt: "Cute chibi character wearing a black scuba diving wetsuit with orange diving mask on forehead and a small air tank on the back, full body, standing front view, friendly smile, big head small body, soft cel-shaded cartoon with thick clean outline, Korean minihompy avatar style. Transparent background, single character centered, no text, no ground shadow.",
  },
];

await mkdir("public/minihompy/sprites", { recursive: true });

for (const j of JOBS) {
  process.stdout.write(`generating ${j.file} ... `);
  try {
    const res = await client.images.generate({
      model: "gpt-image-2",
      prompt: j.prompt,
      n: 1,
      size: j.size,
      quality: "low",
      background: j.background,
    });
    const b64 = res.data?.[0]?.b64_json;
    if (!b64) throw new Error("no image");
    await writeFile(j.file, Buffer.from(b64, "base64"));
    console.log("✓");
  } catch (e) {
    console.log("FAILED:", e?.message || e);
  }
}
console.log("done.");
