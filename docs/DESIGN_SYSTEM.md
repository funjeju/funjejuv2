# DESIGN_SYSTEM.md

## 문서 목적

UI/UX 디자인 규칙을 정의한다.

목표:

* 디자인 일관성 유지
* 컴포넌트 기준 정의
* 모바일 우선 설계
* 바이브 에이전트 UI 구현 기준 제공

---

## 디자인 컨셉

제주 감성 여행 다이어리 스타일 기반 UI.

키워드:

* Warm Travel
* Scrapbook UI
* Postcard Mood
* Soft Premium
* Travel Diary

느낌:

* 따뜻함
* 여행 기록
* 감성 카드
* 종이 질감
* 제주 자연색

---

## 디자인 원칙

원칙:

* 모바일 우선
* 카드 중심 UI
* 이미지 중심
* 감성 + 정보 균형
* 과한 인터랙션 금지
* 빠른 탐색 우선

---

## Color System

### Background

* bg-primary: `#F7F2E8`
* bg-secondary: `#EFE4D3`

### Text

* text-primary: `#2B2B2B`
* text-secondary: `#6E665E`

### Accent

* ocean-blue: `#6DA7D8`
* sunset-orange: `#D69C62`
* forest-green: `#7FA58A`

### Border

* border-soft: `#D8CCBC`

---

## Typography

### Heading

용도:
제목 및 강조

Style:

* Semi Bold
* 손글씨 느낌 보조 사용 가능

### Body

용도:
본문 및 정보

Style:

* 높은 가독성
* Mobile First

추천:

* Pretendard
* SUIT

---

## Spacing Rule

기본 spacing 단위:

* 4
* 8
* 12
* 16
* 24
* 32

원칙:
작은 여백 반복 사용

---

## Radius Rule

기본 radius:

* sm: 8px
* md: 16px
* lg: 24px

원칙:
부드러운 카드 형태

---

## Shadow Rule

사용:
약한 그림자만 사용

예:

* 카드
* 모달
* CTA

금지:
과한 depth

---

## Layout Rule

### Desktop

구성:

* 최대 width 제한
* 카드 grid 기반
* 2~4 column

### Mobile

구성:

* Single Column
* Bottom Navigation
* Thumb Friendly

---

## Component Rule

### Card

용도:
콘텐츠 기본 단위

스타일:

* Rounded
* Warm background
* Soft shadow

사용:

* CCTV
* Feed
* Spot
* Trip

---

### CTA Button

원칙:
명확하고 크기 충분

스타일:

* Rounded
* Medium Weight
* High Contrast

예:

* 저장하기
* 일정 추가
* AI 일정 생성

---

### Navigation

Desktop:
Top Navigation

Mobile:
Bottom Navigation

메뉴:

* 홈
* CCTV
* 피드
* AI
* 일정
* 마이페이지

---

## Feed Card Rule

구성:

* 이미지
* 감성 멘트
* EXIF 정보
* CTA
* 저장 버튼

스타일:
폴라로이드 카드 느낌

---

## CCTV Card Rule

구성:

* 영상 썸네일
* 지역명
* 상태
* 저장 버튼

스타일:
실시간 정보 중심

---

## Chat UI Rule

스타일:
가볍고 빠른 채팅

원칙:

* 짧은 메시지
* 빠른 입력
* AI 요약 강조

---

## Animation Rule

허용:

* Fade
* Slide
* Soft Motion

금지:

* 과한 Motion
* Heavy Animation

---

## Responsive Rule

모든 화면은 모바일 우선 설계한다.

우선순위:
Mobile → Tablet → Desktop

---

## Accessibility Rule

원칙:

* 큰 터치 영역
* 높은 가독성
* 명확한 버튼
* 충분한 대비
