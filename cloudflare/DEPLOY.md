# Cloudflare Worker 배포 가이드

## 사전 준비

1. Cloudflare 계정 (이미 있음 — funjeju 도메인 사용 중)
2. `.env.local`의 환경변수 확인:
   ```
   CLOUDFLARE_ACCOUNT_ID=3344dc9a9cff962102875f9a5f343e80
   CLOUDFLARE_KV_NAMESPACE_ID=a2e7fee994e94d9f9a5f1972201fcbc3
   CLOUDFLARE_API_TOKEN=cfut_4gVB...
   ```

---

## 배포 단계

### 1. Wrangler 설치 + 로그인

```bash
npm i -g wrangler
wrangler login
```

브라우저 열리고 Cloudflare 계정 인증.

### 2. KV에 CCTV 시드 (40개 일괄 등록)

```bash
# .env.local 환경변수 로드
cd cloudflare
node --env-file=../.env.local seed-cctvs.mjs
```

성공하면 ✅ 표시 40개 출력.

### 3. Worker 배포

```bash
cd cloudflare
wrangler deploy
```

배포 완료되면 URL이 출력됨:
```
✨ Deployed funjeju-cctv-proxy
   https://funjeju-cctv-proxy.{사용자ID}.workers.dev
```

### 4. 환경변수 추가

`.env.local`:
```
NEXT_PUBLIC_WORKER_URL=https://funjeju-cctv-proxy.{사용자ID}.workers.dev
```

Vercel 대시보드에도 동일 등록 (Settings → Environment Variables).

### 5. 검증

#### 5-1. Worker 자체 응답 확인
```bash
curl https://funjeju-cctv-proxy.{사용자ID}.workers.dev/
# → "FunJeju CCTV Worker Proxy v2"
```

#### 5-2. m3u8 받기
```bash
curl https://funjeju-cctv-proxy.{사용자ID}.workers.dev/cctv/hagwi
# → m3u8 텍스트 (chunklist URL들이 worker URL로 재작성돼있어야 함)
```

#### 5-3. 통계 확인
```bash
curl https://funjeju-cctv-proxy.{사용자ID}.workers.dev/stats
# → JSON (이벤트, perCctv)
```

### 6. 사이트에서 영상 재생 테스트

Vercel 재배포 후 1개 CCTV 페이지 접속 → 영상 정상 재생되는지 확인.

### 7. 어드민 모니터링

`/admin/origin` → Worker stats로 origin 호출 / 캐시 HIT 패턴 관찰.

---

## 캐시 동작 검증 시나리오

### 단일 사용자 (1명)
1개 CCTV 페이지를 5분간 시청.
- chunklist: 6초 캐시 → 매 5초 갱신이라 거의 hit 안 됨, origin 호출 多
- ts: 새 청크라 항상 origin

### 다중 사용자 (2명)
두 브라우저로 같은 CCTV 시청.
- ts: 첫 사용자가 받은 청크를 두 번째 사용자는 캐시 HIT
- 5초 사이에 같은 청크 요청 시 → HIT 표시

### 핵심 검증
- `/stats`에서 `recent1min.hit` 값이 사용자 수 증가에 따라 함께 증가
- origin 호출은 영상당 분당 12회 근처에서 고정

---

## 롤백

Worker에 문제 생기면:

`.env.local`과 Vercel에서 `NEXT_PUBLIC_WORKER_URL` 제거 → 자동으로 AWS Lightsail로 fallback.

```ts
if (WORKER_URL) return `${WORKER_URL}/cctv/${id}`;
if (PROXY_BASE) return `${PROXY_BASE}/cctv/${id}`;  // ← fallback
```

---

## 가격 모니터링

- Cloudflare 대시보드 → Workers → funjeju-cctv-proxy → Analytics
- 일 100,000 req 초과 시 Paid plan 자동 전환 권유
- Paid Standard: $5 + 사용량 (월 10M req 포함)
