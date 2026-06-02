# CHANGELOG.md

## 문서 목적

프로젝트 변경 사항과 의사결정 기록을 관리한다.

목표:

* 변경 이력 관리
* 기능 추가/수정 기록
* 구조 변경 추적
* 바이브 에이전트 컨텍스트 유지

원칙:

* 날짜 기준 기록
* 변경 이유 기록
* 영향 범위 기록
* 짧고 명확하게 작성

---

## Format Rule

기록 형식:

```txt
[DATE]

Type:
- Added
- Updated
- Removed
- Fixed
- Decision

Scope:
영향 범위

Reason:
변경 이유

Description:
변경 내용
```

---

## Example

```txt
[2026-06-02]

Type:
Decision

Scope:
Architecture

Reason:
서버리스 운영 단순화

Description:
Backend 구조를 Firebase + Next.js Route Handler 기반으로 통일.
```

---

## 2026-06-02

### Decision

Scope:
Core / Architecture

Reason:
실시간 데이터 중심 서비스 구조

Description:
Frontend는 Next.js App Router, Backend는 Firebase 기반 서버리스 구조 채택.

---

### Added

Scope:
Core

Reason:
서비스 범위 정의

Description:
핵심 서비스 구조 정의.

* CCTV 허브
* EXIF 라이브 피드
* AI 도슨트
* 유튜브 요약
* AI 일정 생성
* SEO 자동 콘텐츠
* 관리자 시스템

---

### Added

Scope:
Feature Spec

Reason:
기능 누락 방지

Description:
전체 메뉴 및 기능 명세 정의.

---

### Added

Scope:
Admin

Reason:
운영 시스템 필요

Description:
관리자 기능 추가.

* CCTV 관리
* 여행 스팟 관리
* 회원 관리
* 피드 관리
* 채팅 관리
* 일정 관리
* SEO 관리

---

### Decision

Scope:
Design

Reason:
모바일 중심 서비스

Description:
모바일 우선 + 제주 감성 카드 UI 채택.

---

### Decision

Scope:
Marketing

Reason:
검색 기반 성장

Description:
SEO + UGC + 실시간 콘텐츠 중심 성장 구조 채택.

---

### Decision

Scope:
Database

Reason:
확장성과 realtime 구조

Description:
Firestore Collection 기반 설계 적용.

---

## Change Rule

변경 시 반드시 기록한다.

대상:

* 기능 변경
* DB 변경
* Route 변경
* 디자인 변경
* 권한 변경
* AI 로직 변경
* 운영 정책 변경

금지:

* 기록 없는 구조 변경
* 암묵적 의사결정
