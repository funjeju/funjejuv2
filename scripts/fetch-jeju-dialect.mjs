// 제주도청 OpenAPI(제주방언사전 B01 + 제주생활방언 B02)를 전부 긁어
// data/jeju-dialect.json 으로 캐시한다. 돌AI 제주어 모드의 검증 사전·예문 소스.
// 실행: node scripts/fetch-jeju-dialect.mjs
import { writeFile } from "node:fs/promises";
import path from "node:path";

const B01 = "https://www.jeju.go.kr/rest/JejuDialectService/getJejuDialectServiceList";
const B02 = "https://www.jeju.go.kr/rest/JejuLifeDialectService/getJejuLifeDialectServiceList";
const HJSON = { Accept: "application/json" };

const clean = (s) => (s ?? "").toString().replace(/\r/g, "").replace(/\n+/g, " ").trim();

async function fetchAll(base, pageSize = 1000) {
  // 1페이지로 전체 페이지 수 파악 후 순회
  const first = await (await fetch(`${base}?page=1&pageSize=${pageSize}`, { headers: HJSON })).json();
  const totalPages = first.query?.pages ?? 1;
  const rows = first.query?.rows ?? 0;
  let items = [...(first.items ?? [])];
  for (let p = 2; p <= totalPages; p++) {
    const j = await (await fetch(`${base}?page=${p}&pageSize=${pageSize}`, { headers: HJSON })).json();
    items.push(...(j.items ?? []));
    process.stdout.write(`\r  ${base.includes("Life") ? "B02" : "B01"} ${items.length}/${rows}`);
  }
  process.stdout.write("\n");
  return items;
}

(async () => {
  console.log("제주 방언 API 수집 시작…");
  const b01 = await fetchAll(B01);
  const b02 = await fetchAll(B02);

  // B01: 제주어↔표준어 사전
  const dictionary = b01
    .filter((x) => x.name && x.contents)
    .map((x) => ({
      jeju: clean(x.name),
      standard: clean(x.contents),
      en: clean(x.engContents) || undefined,
      soundUrl: x.soundUrl || undefined,
      type: x.type || undefined,
    }));

  // B02: 실제 제주어 문장/문단 (말투·어미 예문)
  const lifePhrases = b02
    .filter((x) => x.contents)
    .map((x) => ({
      title: clean(x.name),
      text: (x.contents ?? "").replace(/\r/g, "").trim(),
    }));

  const out = {
    source: "제주특별자치도 OpenAPI (B01 제주방언사전 · B02 제주생활방언)",
    fetchedAt: new Date().toISOString(),
    dictionaryCount: dictionary.length,
    lifePhraseCount: lifePhrases.length,
    dictionary,
    lifePhrases,
  };

  const dest = path.join(process.cwd(), "data", "jeju-dialect.json");
  await writeFile(dest, JSON.stringify(out, null, 0), "utf-8");
  console.log(`완료 → ${dest}`);
  console.log(`  사전 ${dictionary.length}개 · 생활방언 예문 ${lifePhrases.length}개`);
  console.log(`  샘플: ${dictionary.slice(0, 3).map((d) => `${d.jeju}=${d.standard}`).join(" / ")}`);
})();
