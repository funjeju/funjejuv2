# FunJeju HTTP CCTV 뷰어

평문 HTTP로만 송출되는 카메라(서귀포·공항·방재 vurix, 2026-11-06 기준 40대)를 새 창에서 재생하는 정적 페이지입니다.
HTTPS 페이지(funjeju.com)는 HTTP 영상을 불러올 수 없어서, 이 파일만 **HTTP로** 서빙되는 곳에 둡니다.
영상은 시청자 브라우저가 원본에서 직접 받기 때문에 중계 서버(Vultr, Cloudflare Worker)가 필요 없습니다.

사용: `index.html?src=<원본 m3u8>&name=<카메라 이름>` — funjeju.com의 `lib/sky/watch.ts`가 이 주소를 만듭니다.

## 현재 호스팅: 카페24 웹호스팅 (2026-11-06~)

- 주소: `http://cctv-view.funjeju.com/`
- 상품: 뉴아우토반호스팅 절약형, 서비스 아이디 `funjeju202611` (만료 2027-11-05, 자동연장 미사용)
- 도메인: 카페24 나의서비스관리 → 도메인 연결관리에서 `cctv-view.funjeju.com`을 직접 입력해 연결. DNS A 레코드는 자동 생성됨.

### 반드시 지킬 것

- **`cctv-view.funjeju.com`에 SSL 인증서를 신청하지 않습니다.** https가 열리면 크롬이 http 주소를 https로 바꿔 열고, 그러면 HTTP 영상이 막힙니다.
- **기본 주소 `funjeju202611.mycafe24.com`은 쓰지 않습니다.** 카페24가 인증서를 기본으로 붙여 둬서 크롬이 https로 바꿉니다(2026-11-06 확인).

### 파일 올리기

카페24 관리 화면에는 웹 업로드가 없어 FTP로 올립니다. FTP에 로그인하면 바로 웹 루트입니다(`www/` 폴더 없음).

```
curl.exe -T http-viewer\index.html --user funjeju202611 ftp://funjeju202611.mycafe24.com/index.html
```

비밀번호는 프롬프트에 직접 입력합니다.

### 올린 뒤 확인

`http://cctv-view.funjeju.com/?src=http%3A%2F%2F211.34.191.215%3A1935%2Flive%2F1-155.stream%2Fplaylist.m3u8&name=모슬포항`
이 주소가 **http 그대로** 열리고 영상이 나오면 정상입니다.

## funjeju.com 연결

Vercel 환경변수 `NEXT_PUBLIC_HTTP_VIEWER_URL=http://cctv-view.funjeju.com/`을 넣고 다시 배포합니다.
이 변수가 없으면 funjeju.com은 Vultr 뷰어(`http://141.164.53.216:8080/watch`)로 엽니다.

## Vultr를 끄기 전 확인

- 위 환경변수를 넣고 배포한 뒤, funjeju.com에서 서귀포·공항·방재 카메라를 눌렀을 때 `cctv-view.funjeju.com`으로 열리는지 확인합니다.
- 옛 `/cctv` 화면, 카드뉴스 스냅샷, 어드민 origin 통계는 Vultr가 꺼지면 같이 멈춥니다.
- 그 다음 Vultr 인스턴스를 Destroy합니다. Stop은 계속 과금됩니다.

<!--
## (사용 안 함) GitHub Pages로 올리기 — 2026-11-06 카페24로 대체

GitHub Pages는 커스텀 도메인에 https 인증서를 자동 발급해서, 크롬이 https로 바꿔 열 위험이 있어 쓰지 않기로 했습니다.
같은 폴더의 `CNAME` 파일은 이 방식용으로 남아 있습니다.

1. GitHub에 새 공개 리포지토리를 만들고 이 폴더의 `index.html`과 `CNAME`을 루트에 올립니다.
2. 리포 Settings → Pages → Source를 `main` 브랜치 `/ (root)`로 지정합니다.
3. 카페24 DNS 관리에서 `cctv-view` 호스트에 CNAME 레코드를 추가합니다. (값: `<GitHub 계정>.github.io`)
4. Settings → Pages → Custom domain에 `cctv-view.funjeju.com`을 넣고 저장합니다.
5. Enforce HTTPS 체크를 끕니다.
-->
