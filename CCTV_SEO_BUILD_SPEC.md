# CCTV 페이지 생성 — Claude Code 실행 스펙

> 목적: `locations.json`을 단일 소스로, 지역별 CCTV 페이지 50개를 생성한다.
> 각 페이지는 `[지역]날씨 / [지역]cctv` 계열 키워드(정식명·약칭·시설명 변형 포함) 노출이 목표.
> "왜"에 대한 배경은 `펀제주_CCTV_날씨_SEO전략.md` 참조. 이 파일은 **무엇을·어떻게 만들지**만 정의한다.

---

## 0. 작업 전 확인 (사람이 결정 → Claude Code에 전달)
- [ ] **스택**: Next.js 라우트 컴포넌트 / 정적 HTML / 그누보드 게시글 중 무엇? → 렌더 형식만 그에 맞춤. 아래 "출력 계약"의 DOM·메타·스키마는 스택과 무관하게 동일하게 충족할 것.
- [ ] **per-location 콘텐츠 출처**: `locations.json`의 `weather_note`·`faq` 필드를 (A) 사람이 채움 (B) Claude Code가 초안 생성 후 사람이 검수. **둘 중 무엇이든, 검수 없이 사실을 단정 생성하지 말 것**(가드레일 G3).

---

## 1. 데이터 소스: `locations.json`
- 페이지 1개 = 배열 1개 항목. 모든 텍스트·링크·스키마는 이 데이터에서 파생.
- 스키마(필드):

| 필드 | 타입 | 용도 | 비고 |
|---|---|---|---|
| `id` | string | URL slug, 내부링크 키 | 영문소문자, 예 `woljeong` |
| `formal` | string | 정식명 | 예 `월정리` |
| `short` | string | 약칭 | 예 `월정` |
| `facility` | string[] | 시설명/별칭 | 예 `["월정리해수욕장","월정 해변"]` |
| `group` | string | 지역군 | `동부해안/서부해안/남부서귀포/한라산중산간/명소섬/도심공항` |
| `lat`,`lng` | number | Place 스키마 좌표 | 없으면 생략 가능 |
| `weather_note` | string | 이 지역 날씨 특징 1~2문장 | ★현지 사실. 검수 필수(G3) |
| `check_points` | string[] | 이 CCTV로 볼 수 있는 것 | 예 `["파도 높이","바람 세기","혼잡도","일몰"]` |
| `faq` | {q,a}[] | 질문형 롱테일 3~5개 | q는 검색 문장 그대로 |
| `nearby` | string[] | 인근 CCTV id 3~5개 | 내부링크용 |
| `stream_url` | string | 라이브 contentUrl | 스키마용 |
| `embed_url` | string | 페이지/임베드 URL | 스키마용 |
| `thumb_url` | string | 썸네일 | 스키마·OG용 |

---

## 2. 출력 계약 (페이지마다 반드시 충족할 마크업) — 스택 무관

### 2-1. 메타·헤드
```
<title>{formal}날씨 실시간 | {short 또는 facility[0]} CCTV로 보는 지금 제주 날씨 - 펀제주</title>
<meta name="description" content="지금 {formal}({short}) 날씨가 궁금하다면? {facility[0]} 실시간 CCTV로 파도·바람·하늘을 직접 확인하세요. 펀제주가 24시간 송출하는 제주 {formal} 라이브 화면.">
<link rel="canonical" href="{embed_url}">
<meta property="og:title" content="{formal} 실시간 CCTV — 지금 {formal} 날씨">
<meta property="og:description" content="{meta description와 동일}">
<meta property="og:image" content="{thumb_url}">
```

### 2-2. 본문 DOM (순서·요소 고정, 텍스트는 데이터에서)
```
H1:  {formal} 실시간 CCTV — 지금 {formal} 날씨 바로 확인
[라이브 영상 임베드]  (img/video의 alt·title = "{formal} 실시간 CCTV 화면")
도입 1문단: {formal}({short}) 날씨를 영상으로 즉시 확인한다는 약속  ← 3종 세트(formal/short/facility) 자연 등장
H2 "이 지역 날씨, 이런 특징이 있어요": {weather_note}
H2 "이 CCTV로 확인할 수 있는 것": {check_points} → <ul>
각 H3 = {faq[i].q} (검색 문장 그대로), 본문 = {faq[i].a}
H2 "주변 실시간 CCTV": {nearby} → 각 id로 내부링크 <a>
마무리 1문단: CTA
```

### 2-3. 구조화 데이터 (JSON-LD, `<script type="application/ld+json">`)
```json
{
  "@context":"https://schema.org","@type":"VideoObject",
  "name":"{formal} 실시간 CCTV — 지금 제주 {formal} 날씨",
  "description":"{meta description}",
  "thumbnailUrl":["{thumb_url}"],
  "uploadDate":"{빌드시각 ISO8601 +09:00}",
  "contentUrl":"{stream_url}","embedUrl":"{embed_url}",
  "publication":{"@type":"BroadcastEvent","isLiveBroadcast":true,"startDate":"{ISO8601}"}
}
```
- `lat`/`lng` 있으면 `Place`+`GeoCoordinates` 스키마 1개 더 추가.

---

## 3. 키워드 변형 규칙 (페이지마다)
- **3종 세트**(`formal`·`short`·`facility`)를 title+본문에 **각 1~2회** 자연스럽게 등장. 도배 금지.
- title 맨 앞 형태(`formal` vs `short`)는 검색량 많은 쪽. 데이터에 `title_lead` 필드로 오버라이드 허용(없으면 `formal` 기본).
- 띄어쓰기 정규화 불필요("월정cctv"="월정 cctv").

---

## 4. 하드 가드레일 (위반 시 생성 중단·플래그)
- **G1 중복 금지**: 50개 본문이 템플릿만 같고 내용이 같으면 안 됨. `weather_note`·`faq`·`check_points`가 지역별로 실질적으로 달라야 통과. 동일/유사 문장 재사용 감지 시 플래그.
- **G2 최소 분량**: 본문 텍스트 ≥ 400자(영상만 있는 페이지 금지).
- **G3 할루시네이션 금지**: `weather_note`·`faq`에 검증 안 된 사실을 **지어내지 말 것**. 데이터가 비어 있으면 일반·안전 문구로 두고 `NEEDS_REVIEW` 플래그. 특히 결항/운항/통제는 단정 금지 — "현장 참고용, 공식 정보는 항공사·기상청 확인" 문구 의무.
- **G4 키워드 도배 금지**: 동일 키워드 본문 내 과다 반복 금지(자연 문맥 우선).
- **G5 내부링크 유효성**: `nearby`의 모든 id가 실제 존재하는 `id`여야 함.

---

## 5. 빌드 순서
1. `locations.json` 로드·검증(필수 필드 누락 시 중단, 누락 항목 리포트).
2. 항목별 페이지 렌더(2장 계약 충족) → 가드레일 G1~G5 검사.
3. `sitemap.xml` 생성(전 페이지 URL) → 루트에 배치.
4. 생성 리포트 출력: 페이지 수, `NEEDS_REVIEW` 목록, 가드레일 위반 목록.
5. (사람) 네이버 서치어드바이저 + 구글 서치콘솔에 사이트맵 제출.

## 6. 우선순위 (Phase 2 = 먼저 만들 고가치 지점)
제주공항 · 한라산(1100고지/백록담) · 중문 · 성산일출봉 · 월정리 · 함덕 · 협재 · 우도 · 이호테우 · 애월
→ 이 10개부터 생성·검수 후 나머지 확장.

## 7. Definition of Done (페이지 1개 기준)
```
□ title/meta/canonical/OG 4종 (2-1 형식)
□ H1 1개 + 본문 DOM 순서 (2-2)
□ 3종 세트(formal/short/facility) 본문 등장
□ check_points ul, faq H3 3~5개, nearby 내부링크 3~5개
□ VideoObject+BroadcastEvent JSON-LD (+좌표 있으면 Place)
□ 모든 영상/이미지 alt = "{formal} 실시간 CCTV 화면"
□ 본문 ≥400자, 가드레일 G1~G5 통과, NEEDS_REVIEW 없음
```
