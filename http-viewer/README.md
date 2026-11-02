# FunJeju HTTP CCTV 뷰어

평문 HTTP로만 송출되는 카메라(서귀포 17대, 공항 3대, 방재 vurix 9대)를 새 창에서 재생하는 정적 페이지입니다.
HTTPS 페이지(funjeju.com)는 HTTP 영상을 불러올 수 없어서, 이 파일만 **HTTP로** 서빙되는 곳에 둡니다.
영상은 시청자 브라우저가 원본에서 직접 받기 때문에 중계 서버(Vultr, Cloudflare Worker)가 필요 없습니다.

사용: `index.html?src=<원본 m3u8>&name=<카메라 이름>` — funjeju.com의 `lib/sky/watch.ts`가 이 주소를 만듭니다.

## GitHub Pages로 올리기

1. GitHub에 새 공개 리포지토리를 만들고 이 폴더의 `index.html`과 `CNAME`을 루트에 올립니다.
2. 리포 Settings → Pages → Source를 `main` 브랜치 `/ (root)`로 지정합니다.
3. 카페24 DNS 관리에서 `cctv-view` 호스트에 CNAME 레코드를 추가합니다.
   - 값: `<GitHub 계정>.github.io`
   - funjeju.com에는 `*` 와일드카드 레코드가 있으므로, 이 개별 레코드가 우선 적용되는지 확인합니다.
4. Settings → Pages → Custom domain에 `cctv-view.funjeju.com`을 넣고 저장합니다.
5. **Enforce HTTPS 체크를 끕니다.** 켜져 있으면 HTTP 영상이 다시 막힙니다.
6. 브라우저에서 아래 주소가 HTTP로 열리고 영상이 나오는지 확인합니다.
   `http://cctv-view.funjeju.com/?src=http%3A%2F%2F211.34.191.215%3A1935%2Flive%2F1-115.stream%2Fplaylist.m3u8&name=대포포구`
7. Vercel 환경변수에 `NEXT_PUBLIC_HTTP_VIEWER_URL=http://cctv-view.funjeju.com/`을 넣고 다시 배포합니다.
   이 변수가 없으면 funjeju.com은 지금처럼 Vultr 뷰어로 엽니다.

## Vultr를 끄기 전 확인

- 7번까지 끝나고, funjeju.com에서 서귀포·공항·방재 카메라를 눌렀을 때 `cctv-view.funjeju.com`으로 열리는지 확인합니다.
- 그 다음 Vultr 인스턴스를 Destroy합니다. Stop은 계속 과금됩니다.
