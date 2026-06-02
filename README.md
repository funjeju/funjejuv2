# FunJeju v2

실시간 제주 데이터를 기반으로 여행 발견, 저장, AI 일정 생성을 연결하는 AI 제주 여행 플랫폼입니다.

## 실행

```bash
npm install
npm run dev
```

개발 서버 기본 주소:

```txt
http://localhost:3000
```

## 현재 범위

- Next.js App Router
- TypeScript
- Tailwind CSS
- Firebase 설정 준비 파일
- Mock 기반 홈 화면
- Mock 기반 CCTV 목록 화면
- 모바일 우선 공통 네비게이션

실제 API, Firestore, CCTV 스트림은 아직 연결하지 않습니다.

## 안정화 기준

현재 셋업 기준:

- Next.js 16.2.7
- React 19.2.7
- Tailwind CSS 4.3.0
- Firebase SDK 12.14.0
- TypeScript 6.0.3
- ESLint 9.39.4

검증 명령:

```bash
npm run lint
npm run type-check
npm run build
```

`npm audit` 기준 high/critical 취약점은 없습니다. `next` 내부 번들 `postcss` 관련 moderate 항목 2개가 남아 있으며, npm의 자동 수정 제안은 Next 9 다운그레이드라 적용하지 않습니다.
