# 펀제주 AEO / GEO 콘텐츠 가이드 (2026-06 기준)

> 모든 **콘텐츠 자동생성기(웹진·모닝브리핑·카드뉴스·CCTV SEO·가이드)와 신규/재작성 콘텐츠**는 이 규칙을 따른다.
> 목적: 구글/네이버 검색 + **AI 답변·생성 엔진(ChatGPT·Perplexity·Google AI Overviews·Gemini·Copilot)에 인용**되게 하는 것.
> ※ 도민맛집(food)은 분량 방대 → 이 가이드의 전면 적용 대상에서 **제외**(기존 FAQ/JSON-LD 유지).

---

## 0. 핵심 원칙 (한 줄)
- **SEO** = 위에 뜨게 / **AEO** = 정답 박스로 뽑히게 / **GEO** = AI가 답하며 **나를 출처로 인용**하게.
- 기본 SEO 로직은 유지하되, **"AI가 발췌·인용하기 좋은 형태"**를 추가로 갖춘다.

## 1. 글쓰기 구조 (가장 중요 — 인용률 직결)
1. **각 섹션 첫 문장 = 40~60자 내외의 "자기완결적 직답"**.
   - LLM은 검색해 가져온 페이지의 **첫 150~200 토큰**에 큰 가중치를 둔다. 섹션 첫 문장에서 바로 답을 준다.
   - 예) ❌ "제주의 날씨는 다양합니다…" → ✅ "**성산일출봉은 제주 동부 성산읍에 있는 일출 명소로, 새벽 5~7시에 가장 붐빈다.**"
2. **소제목(H2/H3)을 "사용자 질문" 형태로**.
   - 예) "운영시간" → "**성산일출봉 입장 시간은 언제인가요?**"
3. **고유명사·개체(entity)를 명시적으로** 적는다(지명·상호·읍면동·좌표·날짜).
4. **구조화**: 리스트·표·단계(번호)를 적극 사용 → AI가 정확히 발췌.
5. **사실·수치·인용을 추가**(연구상 인용률 최강 3요소 = 통계 / 출처 / 인용문).
   - "에메랄드빛 바다" 같은 수사보다 **"수심 1.5m, 백사장 1.2km"** 같은 사실.
   - 외부 사실은 **출처 표기**(visitjeju, 기상청 등).

## 2. FAQ (AEO 핵심)
- **FAQPage JSON-LD를 단 페이지 = AI Overviews 노출 3.2배.** 단, **실제 Q&A 형식일 때만** 사용(남용 금지).
- 각 답변도 **40~60자 직답 + 근거** 형식.
- CCTV/가이드/웹진/데일리 등 **질문 수요가 명확한 페이지에 FAQ 섹션 + FAQPage 스키마**를 단다.

## 3. 구조화데이터(Schema.org JSON-LD)
- **속성이 풍부한 스키마 = 인용률 61.7%** (빈약하면 오히려 무스키마보다 못함). → 가능한 필드를 꽉 채운다.
- 페이지 타입별 권장: `FAQPage`, `Article`(웹진·데일리), `VideoObject`/`BroadcastEvent`(CCTV), `Restaurant`(맛집), `Organization`/`WebSite`(전역).
- **`sameAs`로 권위 프로필 연결**(공식 SNS·기관). E-E-A-T 신호.
- **author/publisher 명시**(펀제주), datePublished/dateModified.

## 4. 신선도 (GEO 인용 유지)
- AI 인용은 **신선도 신호 없으면 ~14일 후 인용 우선순위 하락**.
- → **dateModified 갱신**, "최종 확인: YYYY-MM-DD" 표기, 변동 정보(영업/날씨)는 evergreen 표현으로.
- 신규 콘텐츠는 **3~5영업일 내** AI 인용 풀 진입 → 꾸준한 발행이 핵심.

## 5. 기술 (크롤 허용)
- **AI 크롤러 명시 허용**(robots.ts): GPTBot·OAI-SearchBot·ChatGPT-User·ClaudeBot·anthropic-ai·Google-Extended·PerplexityBot·Bingbot·Applebot-Extended·CCBot·Amazonbot. **차단 = 그 엔진에 인용 불가.** ✅ 적용됨.
- canonical·sitemap·lastmod 정확히(이미 정비).

## 6. 다중 출처 합의(consensus) — 중기 과제
- AI는 **여러 독립 출처가 일관되게 말할 때** 자신 있게 인용한다.
- → 펀제주 콘텐츠를 **고유 데이터(실시간 CCTV·라이브피드·도민맛집)**로 차별화하고, 외부(블로그·커뮤니티·SNS)에 일관된 메시지를 퍼뜨린다.
- Perplexity는 **Q&A형(레딧·지식인 류)** 출처를 많이 인용 → FAQ·질문형 콘텐츠가 유리.

## 7. 펀제주의 GEO 강점 (적극 활용)
- **남이 없는 1차 데이터**: 실시간 CCTV 57개, 도민맛집 589, EXIF 라이브피드 → "제주 실시간/지금 날씨/현지 맛집"을 AI가 답할 때 **인용할 1차 소스**가 될 잠재력.
- → 콘텐츠에 **"실시간/현지/검증" 사실**을 전면에 내세운다.

---

## 자동생성기 적용 체크리스트 (생성 프롬프트에 주입)
- [ ] 섹션 첫 문장 = 40~60자 자기완결 직답
- [ ] 소제목 = 질문형
- [ ] 지명·좌표·날짜 등 개체 명시
- [ ] 사실·수치 우선(수사 최소), 외부사실 출처 표기
- [ ] 질문 수요 페이지엔 FAQ 3~5개 + FAQPage JSON-LD
- [ ] dateModified/최종확인일 갱신
- [ ] 속성 꽉 찬 JSON-LD(타입별)

---

### 출처(2026-06 조사)
- GEO 베스트프랙티스: gen-optima.com, searchengineland.com, llmrefs.com
- AI 인용 전략(ChatGPT/Perplexity/AI Overviews): pixelmojo.io, sapt.ai, frase.io
- AEO·스키마: cxl.com, airops.com, searchatlas.com
