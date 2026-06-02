# IA_SCREEN.md

## 문서 목적

서비스 화면 구조와 URL 구조를 정의한다.

목표:

* 메뉴 구조 정의
* URL 구조 정의
* 화면 관계 정의
* 개발 구조 기준 제공

---

## Routing Rule

기본 구조:

* Public Route
* Auth Route
* My Route
* Admin Route

Framework:

* Next.js App Router

---

## Public Route

### /

홈 화면

구성:

* 히어로 섹션
* 추천 CCTV
* 인기 라이브 피드
* AI 추천 스팟
* 유튜브 요약
* AI 일정 CTA

---

### /cctv

CCTV 메인

구성:

* 목록형 보기
* 지도형 보기
* 지역 필터
* 검색
* 제주 통합 채팅

---

### /cctv/[id]

CCTV 상세

구성:

* 실시간 CCTV
* 지역 정보
* 날씨
* CCTV 채팅
* 저장 버튼
* 추천 스팟

---

### /feed

라이브 피드 메인

구성:

* EXIF 카드 피드
* 필터
* 장소 저장
* 인기 피드

---

### /feed/[id]

피드 상세

구성:

* 이미지
* 감성 멘트
* EXIF 정보
* OCR 정보
* 댓글
* 저장
* 공유

---

### /youtube

유튜브 요약 메인

구성:

* 추천 영상
* 검색
* 태그 탐색

---

### /youtube/[id]

유튜브 요약 상세

구성:

* 영상 요약
* 장소 리스트
* 방문 팁
* 저장 버튼

---

### /trip-ai

AI 여행 일정

구성:

* 일정 생성
* 공개 일정
* 일정 검색
* 태그 탐색

---

### /trip-ai/create

AI 일정 생성

구성:

* 질문 플로우
* 저장 장소 선택
* 조건 입력
* 일정 생성

---

### /trip-ai/[id]

일정 상세

구성:

* 일정표
* 지도 동선
* 장소 카드
* 찜
* 복사
* 공유

---

### /spots

여행 스팟 탐색

구성:

* 장소 검색
* 카테고리
* 태그
* 지도

---

### /spots/[id]

여행 스팟 상세

구성:

* 장소 정보
* 이미지
* 저장
* 일정 추가
* 관련 피드

---

## Auth Route

### /login

로그인

기능:

* 이메일 로그인
* 소셜 로그인

---

### /signup

회원가입

기능:

* 일반 회원
* 비즈니스 회원 선택

---

### /business-verify

비즈니스 인증

기능:

* 사업자 인증
* CTA 설정

---

## My Route

### /mypage

마이페이지 홈

구성:

* 저장 장소
* 저장 일정
* 업로드 피드
* 계정 정보

---

### /mypage/spots

저장 장소

---

### /mypage/trips

저장 일정

---

### /mypage/feed

내 피드

---

### /mypage/settings

설정

구성:

* 프로필
* 공개 설정
* CTA 설정
* 알림 설정

---

## Upload Route

### /upload/feed

피드 업로드

구성:

* 이미지 업로드
* 공개 여부
* 설명
* CTA 연결

처리:

* EXIF 분석
* OCR 분석
* AI 멘트 생성

---

## Admin Route

### /admin

관리자 대시보드

구성:

* 회원 통계
* CCTV 통계
* 피드 통계
* 일정 통계
* SEO 통계

---

### /admin/cctv

CCTV 관리

기능:

* 등록
* 수정
* 삭제
* 노출 설정

---

### /admin/spots

여행 스팟 관리

기능:

* 등록
* 수정
* 삭제
* 태그 관리

---

### /admin/users

회원 관리

기능:

* 회원 조회
* 권한 변경
* 비즈니스 인증
* 정지 처리

---

### /admin/feed

피드 관리

기능:

* 신고 처리
* 삭제
* 노출 설정

---

### /admin/trips

AI 일정 관리

기능:

* 일정 조회
* 공개 설정
* 신고 처리

---

### /admin/seo

SEO 콘텐츠 관리

기능:

* 승인
* 수정
* 발행
* 예약 발행

---

### /admin/chat

채팅 관리

기능:

* 신고 처리
* 삭제
* 제한

---

### /admin/settings

관리자 설정

구성:

* 프롬프트 설정
* CTA 기본값
* 메뉴 설정
* 공지사항
* 배너

---

## Layout Rule

### Public Layout

구성:

* Header
* Navigation
* Main Content
* Footer

---

### Mobile Layout

구성:

* Header
* Bottom Navigation
* Floating CTA

---

### Admin Layout

구성:

* Sidebar
* Topbar
* Content Area
