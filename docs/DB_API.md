# DB_API.md

## 문서 목적

Firestore 컬렉션 구조와 API 규칙을 정의한다.

목표:

* 데이터 구조 표준화
* API 구현 기준 제공
* 바이브 에이전트 개발 기준 제공

원칙:

* Collection 기반
* Nested 최소화
* Realtime 친화 구조
* Query 최적화 우선

---

## Firebase Collections

구성:

* users
* business_profiles
* cctvs
* feeds
* feed_comments
* feed_likes
* chats
* chat_rooms
* spots
* saved_spots
* trips
* saved_trips
* youtube_contents
* seo_contents
* reports
* notifications

---

## users

설명:
회원 데이터

fields:

* id
* email
* nickname
* profileImage
* role
* isBusiness
* createdAt
* updatedAt

role:

* user
* business
* admin

example:

```json
{
  "id": "uid",
  "email": "test@test.com",
  "nickname": "funjeju",
  "role": "user",
  "isBusiness": false
}
```

---

## business_profiles

설명:
비즈니스 회원 정보

fields:

* userId
* businessName
* category
* businessNumber
* verified
* cta
* createdAt

cta example:

```json
{
  "label": "예약하기",
  "url": "https://..."
}
```

---

## cctvs

설명:
CCTV 데이터

fields:

* id
* name
* region
* category
* latitude
* longitude
* streamUrl
* thumbnail
* description
* active
* createdAt

example:

```json
{
  "name": "함덕 해변 CCTV",
  "region": "제주시",
  "latitude": 33.54,
  "longitude": 126.67,
  "active": true
}
```

---

## chat_rooms

설명:
채팅방

type:

* cctv
* global

fields:

* id
* type
* cctvId
* title
* createdAt

---

## chats

설명:
채팅 메시지

fields:

* roomId
* userId
* message
* createdAt
* deleted
* reported

example:

```json
{
  "roomId": "hamdeok",
  "message": "오늘 노을 좋네요"
}
```

---

## feeds

설명:
EXIF 라이브 피드

fields:

* userId
* imageUrl
* caption
* aiCaption
* exif
* ocrText
* spotId
* visibility
* createdAt

visibility:

* public
* private

---

## feed_comments

설명:
피드 댓글

fields:

* feedId
* userId
* comment
* createdAt

---

## feed_likes

설명:
피드 좋아요

fields:

* feedId
* userId
* createdAt

---

## spots

설명:
여행 장소 데이터

fields:

* name
* category
* latitude
* longitude
* description
* tags
* thumbnail
* active

category example:

* cafe
* beach
* restaurant
* sunset
* indoor

---

## saved_spots

설명:
사용자 저장 장소

fields:

* userId
* spotId
* memo
* createdAt

---

## trips

설명:
AI 여행 일정

fields:

* userId
* title
* visibility
* schedule
* spotIds
* createdAt

visibility:

* public
* private

---

## saved_trips

설명:
찜한 일정

fields:

* userId
* tripId
* createdAt

---

## youtube_contents

설명:
유튜브 요약 데이터

fields:

* youtubeId
* title
* summary
* spots
* thumbnail
* createdAt

---

## seo_contents

설명:
SEO 콘텐츠

fields:

* title
* subtitle
* description
* content
* status
* createdAt

status:

* draft
* scheduled
* published

---

## reports

설명:
신고 데이터

fields:

* targetType
* targetId
* userId
* reason
* createdAt

targetType:

* chat
* feed
* user
* trip

---

## notifications

설명:
알림 데이터

fields:

* userId
* type
* title
* read
* createdAt

---

## API Rule

기준:
Next.js Route Handler 사용

pattern:

```txt id="z7l90r"
app/api/{feature}/{action}/route.ts
```

example:

```txt id="1r8t2x"
api/
├── auth/
├── cctv/
├── feed/
├── trip/
├── youtube/
├── chatbot/
├── seo/
└── admin/
```

---

## API Naming Rule

원칙:
REST 기반

예:

* GET /api/cctv
* GET /api/cctv/:id
* POST /api/feed
* GET /api/feed
* POST /api/trip/create
* POST /api/youtube/summary

---

## Security Rule

원칙:
Firestore Security Rule 적용

기준:

* 본인 데이터만 수정
* admin only route 분리
* business 권한 분리
* private 데이터 보호

---

## Query Rule

원칙:
Collection query 우선

기준:

* pagination 필수
* limit 사용
* createdAt index 사용
* nested query 최소화
* denormalization 허용

---

## Realtime Rule

Firestore realtime 사용 대상:

* 채팅
* 피드
* 알림
* CCTV 상태
