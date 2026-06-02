# ARCHITECTURE.md

## 문서 목적

프로젝트 기술 구조와 데이터 흐름을 정의한다.

목표:

* 개발 구조 표준화
* 바이브 에이전트 구현 기준 제공
* 폴더 구조 정의
* 데이터 흐름 정의

---

## 기술 스택

### Frontend

* Next.js (App Router)
* TypeScript
* Tailwind CSS
* Firebase SDK

설명:
모바일 우선 웹앱 구조.

---

## Backend

* Firebase Auth
* Firestore
* Firebase Storage
* Next.js Route Handler

설명:
서버리스 구조 기반.

---

## Deploy

* Vercel

설명:
Preview Deploy + Production Deploy 사용.

---

## 프로젝트 구조

```txt
project-root/

├── app/
│   ├── (public)/
│   ├── (auth)/
│   ├── (mypage)/
│   ├── admin/
│   ├── api/
│   └── layout.tsx
│
├── components/
│   ├── common/
│   ├── cctv/
│   ├── feed/
│   ├── trip/
│   ├── youtube/
│   ├── chatbot/
│   └── admin/
│
├── features/
│   ├── auth/
│   ├── cctv/
│   ├── feed/
│   ├── trip/
│   ├── youtube/
│   ├── chatbot/
│   ├── seo/
│   └── admin/
│
├── services/
│   ├── firebase/
│   ├── ai/
│   ├── exif/
│   ├── ocr/
│   ├── youtube/
│   └── seo/
│
├── lib/
├── hooks/
├── types/
├── constants/
├── styles/
└── docs/
```

---

## Routing 구조

구성:

* Public Route
* Auth Route
* My Route
* Admin Route
* API Route

기준:
App Router 기반.

---

## Firebase 구조

### Firebase Auth

역할:
회원 인증

기능:

* 회원가입
* 로그인
* 소셜 로그인
* 비즈니스 인증 상태 관리

권한:

* user
* business
* admin

---

### Firestore

역할:
실시간 데이터 저장

사용:

* CCTV
* 피드
* 채팅
* 여행 일정
* 저장 스팟
* 회원 데이터
* SEO 콘텐츠

원칙:
Document 기반 설계.

---

### Firebase Storage

역할:
파일 저장

사용:

* 이미지
* 피드 사진
* 썸네일
* SEO 이미지

---

## AI 구조

AI는 Next.js Route Handler 기반으로 처리한다.

구성:

* OCR
* EXIF 분석
* 감성 멘트 생성
* 여행 일정 생성
* 유튜브 요약
* SEO 콘텐츠 생성

원칙:
Client → API → AI → Firestore 저장

---

## EXIF 분석 구조

흐름:

이미지 업로드
→ EXIF 추출
→ GPS 추출
→ 촬영 시간 추출
→ 장소 정보 생성
→ Firestore 저장

출력:

* 위치
* 시간
* 기기 정보
* 좌표

---

## OCR 구조

흐름:

이미지 업로드
→ OCR 처리
→ 텍스트 추출
→ 장소 보정
→ Firestore 저장

출력:

* 간판
* 메뉴
* 텍스트 정보

---

## 라이브 피드 생성 구조

흐름:

사진 업로드
→ EXIF 분석
→ OCR 분석
→ 분위기 분석
→ AI 감성 멘트 생성
→ 카드 데이터 생성
→ Firestore 저장

출력:

* 카드뉴스 피드
* 감성 멘트
* CTA
* 장소 연결

---

## CCTV 구조

흐름:

CCTV 데이터 등록
→ Firestore 저장
→ 목록 노출
→ 상세 진입
→ 채팅 연결

구성:

* 목록형
* 지도형
* 상세
* 채팅

---

## 채팅 구조

기반:
Firestore Realtime Listener

구성:

* CCTV 채팅
* 제주 통합 채팅

기능:

* 메시지
* 신고
* AI 요약

---

## 유튜브 요약 구조

흐름:

영상 URL 입력
→ 자막 추출
→ AI 요약
→ 여행 스팟 추출
→ 장소 저장 가능 상태 생성

출력:

* 요약
* 장소 리스트
* 여행 팁

---

## CCTV Streaming Architecture

설명:

일부 제주 CCTV는 HTTPS 미지원(HTTP) 상태이므로 브라우저 Mixed Content 정책으로 인해 직접 재생이 불가능할 수 있다.

이를 해결하기 위해 HTTPS 기반 Proxy 중계 구조를 사용한다.

### 구조

흐름:

Web App (HTTPS)
→ Cloudflare Worker (HTTPS Proxy)
→ CCTV Original Stream (HTTP)

### 처리 방식

1. Proxy Worker 구성

Cloudflare Worker를 중계 서버로 사용한다.

Worker는 HTTPS 보안 인증 환경에서 동작한다.

---

2. 요청 방향 변경

웹앱은 CCTV 원본 주소를 직접 호출하지 않는다.

대신 Worker Endpoint를 호출한다.

예:

```txt
https://worker.funjeju.com/cctv/hamdeok
```

---

3. Worker Fetch

Worker 내부에서 HTTP CCTV 원본 영상에 접근한다.

예:

```txt
http://211.xxx.xxx.xxx/live.m3u8
```

Worker가 영상을 대신 수신(fetch)한다.

---

4. Response Relay

Worker는 영상 스트림을 다시 클라이언트로 전달한다.

응답 시 브라우저 재생을 위한 Header를 추가한다.

예:

* Access-Control-Allow-Origin: *
* Cache-Control
* Content-Type

---

### 목적

목표:

* Mixed Content 문제 해결
* HTTPS 환경 유지
* CORS 문제 완화
* CCTV 재생 안정성 확보

### 운영 원칙

원칙:

* 원본 CCTV URL은 서버 측 관리
* Client에는 Worker Endpoint만 노출
* 장애 시 fallback 처리
* 비정상 CCTV 자동 비활성 가능 구조

### 데이터 구조 예시

cctv collection:

```json
{
  "name": "함덕 해변 CCTV",
  "streamProxyUrl": "https://worker.funjeju.com/cctv/hamdeok",
  "streamOriginUrl": "http://211.xxx.xxx.xxx/live.m3u8"
}
```


## AI 일정 생성 구조

흐름:

질문 입력
→ 사용자 조건 수집
→ 저장 장소 조회
→ 동선 최적화
→ 일정 생성

출력:

* 일정표
* 장소 카드
* 지도 동선

---

## SEO 자동 발행 구조

흐름:

라이브 피드 수집
→ AI 콘텐츠 생성
→ Draft 저장
→ 자동 또는 수동 발행

출력:

* 제목
* 서브타이틀
* 설명
* 목차
* 콘텐츠

---

## 관리자 구조

역할:
서비스 운영 허브

관리:

* CCTV
* 회원
* 여행 스팟
* 피드
* 일정
* SEO 콘텐츠
* 채팅

권한:
Admin only

---

## 상태 관리 원칙

기준:
Server First

원칙:

* Firebase 기반
* 최소 local state
* React Query 우선
* optimistic update 최소화

---

## 개발 원칙

원칙:

* Feature based structure
* Reusable component
* Mobile first
* Type safe
* Serverless architecture
* Small component
* Lazy loading 우선

---

## 에러 처리 원칙

원칙:

* 사용자 친화 메시지
* 실패 fallback
* retry 지원
* loading 상태 기본 제공
