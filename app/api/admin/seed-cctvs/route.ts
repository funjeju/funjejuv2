/**
 * 서버사이드 CCTV 시딩 API
 * admin 쿠키 인증 + Firebase Admin SDK 사용
 * → Firestore 보안 규칙 우회하므로 클라이언트 규칙은 항상 잠궈둘 수 있음
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminDb } from "@/lib/firebase-admin";
import { getDirection } from "@/constants/cctv-directions";

export const runtime = "nodejs";
export const maxDuration = 60;

// ── mock 메타 + 원본 URL 통합 시드 데이터 ────────────────────
const SEED: {
  id: string; name: string; region: string; category: string;
  description: string; lat: number; lng: number; originUrl: string;
}[] = [
  { id:"gimnyeong",      name:"김녕해변",      region:"제주시 구좌읍",   category:"해변",  description:"제주 동쪽 구좌읍의 에메랄드빛 해변입니다.",         lat:33.553, lng:126.757, originUrl:"http://211.114.96.121:1935/jejusi6/11-20.stream/playlist.m3u8" },
  { id:"woljeong",       name:"월정해변",      region:"제주시 구좌읍",   category:"해변",  description:"투명한 바다색으로 유명한 인기 해변입니다.",           lat:33.558, lng:126.796, originUrl:"http://211.114.96.121:1935/jejusi7/11-21.stream/playlist.m3u8" },
  { id:"pyeongdae",      name:"평대해변",      region:"제주시 구좌읍",   category:"해변",  description:"한적하고 조용한 동쪽 해변입니다.",                   lat:33.543, lng:126.830, originUrl:"http://211.114.96.121:1935/jejusi7/11-22.stream/playlist.m3u8" },
  { id:"hamdeok",        name:"함덕해변",      region:"제주시 조천읍",   category:"해변",  description:"북동부 대표 해변으로 바다색이 아름답습니다.",         lat:33.543, lng:126.669, originUrl:"http://211.114.96.121:1935/jejusi6/11-19.stream/playlist.m3u8" },
  { id:"hagwi",          name:"하귀가문동",    region:"제주시 애월읍",   category:"포구",  description:"애월읍 하귀 해안 포구입니다.",                       lat:33.479, lng:126.388, originUrl:"http://211.114.96.121:1935/jejusi6/11-15.stream/playlist.m3u8" },
  { id:"gwakji",         name:"곽지해변",      region:"제주시 애월읍",   category:"해변",  description:"애월읍의 조용하고 예쁜 해변입니다.",                 lat:33.460, lng:126.338, originUrl:"http://211.114.96.121:1935/jejusi6/11-16.stream/playlist.m3u8" },
  { id:"hyeopjae",       name:"협재해변",      region:"제주시 한림읍",   category:"해변",  description:"에메랄드빛 바다와 비양도가 보이는 서쪽 대표 해변입니다.", lat:33.394, lng:126.239, originUrl:"http://211.114.96.121:1935/jejusi6/11-17.stream/playlist.m3u8" },
  { id:"ongpo",          name:"옹포항",        region:"제주시 한림읍",   category:"항구",  description:"한림읍 옹포리 항구입니다.",                          lat:33.411, lng:126.253, originUrl:"http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100005/0/1/1.m3u8" },
  { id:"sinchang",       name:"신창포구",      region:"제주시 한경면",   category:"포구",  description:"풍력발전기가 있는 신창리 포구입니다.",               lat:33.332, lng:126.148, originUrl:"http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100004/0/1/1.m3u8" },
  { id:"panpo",          name:"판포해변",      region:"제주시 한경면",   category:"해변",  description:"한경면 서쪽 해안의 한적한 해변입니다.",              lat:33.352, lng:126.178, originUrl:"http://211.114.96.121:1935/jejusi6/11-18.stream/playlist.m3u8" },
  { id:"udo_cheonjin",   name:"우도천진항",    region:"제주시 우도면",   category:"항구",  description:"우도 주요 항구로 배편이 운행됩니다.",               lat:33.506, lng:126.951, originUrl:"http://211.114.96.121:1935/jejusi7/11-24.stream/playlist.m3u8" },
  { id:"udo_haumoktong", name:"우도하우목동",  region:"제주시 우도면",   category:"포구",  description:"우도 하우목동 해안 전경입니다.",                    lat:33.497, lng:126.941, originUrl:"http://211.114.96.121:1935/jejusi7/11-23.stream/playlist.m3u8" },
  { id:"samyang",        name:"삼양해변",      region:"제주시 삼양동",   category:"해변",  description:"검은 모래로 유명한 제주시 동쪽 해변입니다.",         lat:33.524, lng:126.582, originUrl:"http://211.114.96.121:1935/jejusi6/11-14.stream/playlist.m3u8" },
  { id:"jeju_airport",   name:"제주공항",      region:"제주시 용담동",   category:"공항",  description:"제주국제공항 주변 현황을 확인합니다.",               lat:33.511, lng:126.493, originUrl:"http://123.140.197.51/stream/33/play.m3u8" },
  { id:"tapdong",        name:"탑동서부두",    region:"제주시 탑동",     category:"관광지",description:"제주시 탑동 서부두 해안가 일대입니다.",             lat:33.514, lng:126.521, originUrl:"http://211.114.96.121:1935/jejusi6/11-11.stream/playlist.m3u8" },
  { id:"donghandugi",    name:"동한두기",      region:"제주시 용담동",   category:"포구",  description:"용연·한두기 인근 동한두기 해안입니다.",             lat:33.514, lng:126.508, originUrl:"http://211.114.96.121:1935/jejusi6/11-12.stream/playlist.m3u8" },
  { id:"iho",            name:"이호해변",      region:"제주시 이호동",   category:"해변",  description:"제주시 도심에서 가까운 이호테우 해변입니다.",       lat:33.498, lng:126.453, originUrl:"http://211.114.96.121:1935/jejusi7/11-30T.stream/playlist.m3u8" },
  { id:"sechon",         name:"세천포구",      region:"제주시 이호동",   category:"포구",  description:"이호 서쪽 세천 해안 포구입니다.",                   lat:33.499, lng:126.444, originUrl:"http://211.34.191.215:1935/live/1-149.stream/playlist.m3u8" },
  { id:"pyoseon",        name:"표선항",        region:"서귀포시 표선면", category:"항구",  description:"서귀포 동부 표선 해안의 항구입니다.",               lat:33.324, lng:126.838, originUrl:"http://211.34.191.215:1935/live/1-77.stream/playlist.m3u8" },
  { id:"daepo",          name:"대포포구",      region:"서귀포시 중문동", category:"포구",  description:"중문 인근 대포동 주상절리 해안 포구입니다.",         lat:33.234, lng:126.428, originUrl:"http://211.34.191.215:1935/live/1-115.stream/playlist.m3u8" },
  { id:"dodu",           name:"도두항",        region:"제주시 도두동",   category:"항구",  description:"제주공항 인근 도두 어항입니다.",                    lat:33.513, lng:126.475, originUrl:"http://211.114.96.121:1935/jejusi6/11-13.stream/playlist.m3u8" },
  { id:"chuja_daeseo",   name:"추자대서",      region:"제주시 추자면",   category:"포구",  description:"추자도 대서리 해안입니다.",                         lat:33.961, lng:126.886, originUrl:"http://211.114.96.121:1935/jejusi7/11-26.stream/playlist.m3u8" },
  { id:"chuja_sinyang",  name:"추자신양",      region:"제주시 추자면",   category:"포구",  description:"추자도 신양리 포구입니다.",                         lat:33.956, lng:126.892, originUrl:"http://211.114.96.121:1935/jejusi7/11-28.stream/playlist.m3u8" },
  { id:"chuja_mukri",    name:"추자묵리",      region:"제주시 추자면",   category:"포구",  description:"추자도 묵리 해안입니다.",                           lat:33.952, lng:126.878, originUrl:"http://211.114.96.121:1935/jejusi7/11-27.stream/playlist.m3u8" },
  { id:"chuja_yecho",    name:"추자예초",      region:"제주시 추자면",   category:"포구",  description:"추자도 예초리 포구입니다.",                         lat:33.946, lng:126.871, originUrl:"http://211.114.96.121:1935/jejusi7/11-29.stream/playlist.m3u8" },
  { id:"seongsan",       name:"성산일출봉",    region:"서귀포시 성산읍", category:"관광지",description:"유네스코 세계자연유산, 일출 명소입니다.",           lat:33.458, lng:126.942, originUrl:"http://123.140.197.51/stream/34/play.m3u8" },
  { id:"seongsan_hang",  name:"성산항",        region:"서귀포시 성산읍", category:"항구",  description:"우도 배편이 출발하는 성산항입니다.",               lat:33.469, lng:126.929, originUrl:"http://211.34.191.215:1935/live/1-140.stream/playlist.m3u8" },
  { id:"seongsan_suma",  name:"성산수마포구",  region:"서귀포시 성산읍", category:"포구",  description:"성산읍 수마포구 일대입니다.",                       lat:33.461, lng:126.921, originUrl:"http://211.34.191.215:1935/live/1-76.stream/playlist.m3u8" },
  { id:"seopjikoji",     name:"섭지코지",      region:"서귀포시 성산읍", category:"관광지",description:"드라마 올인 촬영지로 유명한 해안 절경입니다.",     lat:33.428, lng:126.930, originUrl:"http://211.34.191.215:1935/live/1-116.stream/playlist.m3u8" },
  { id:"sinsan",         name:"신산포구",      region:"서귀포시 성산읍", category:"포구",  description:"성산읍 신산리 포구입니다.",                         lat:33.440, lng:126.914, originUrl:"http://211.34.191.215:1935/live/1-143.stream/playlist.m3u8" },
  { id:"namwon_deokdol", name:"남원덕돌",      region:"서귀포시 남원읍", category:"포구",  description:"남원읍 덕돌포구입니다.",                            lat:33.280, lng:126.715, originUrl:"http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100006/0/1/1.m3u8" },
  { id:"namwon_taeheung",name:"남원태흥포구",  region:"서귀포시 남원읍", category:"항구",  description:"남원읍 태흥리 포구입니다.",                         lat:33.270, lng:126.700, originUrl:"http://211.34.191.215:1935/live/1-146.stream/playlist.m3u8" },
  { id:"hwasun",         name:"화순해변",      region:"서귀포시 안덕면", category:"해변",  description:"서귀포 서쪽 화순해수욕장입니다.",                   lat:33.239, lng:126.318, originUrl:"http://211.34.191.215:1935/live/11-25.stream/playlist.m3u8" },
  { id:"sanbangsan",     name:"산방산",        region:"서귀포시 안덕면", category:"관광지",description:"제주 서남쪽의 용암돔 산방산 일대입니다.",           lat:33.240, lng:126.315, originUrl:"http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100012/0/1/1.m3u8" },
  { id:"sindo",          name:"신도포구",      region:"서귀포시 대정읍", category:"포구",  description:"대정읍 신도리 포구입니다.",                         lat:33.226, lng:126.183, originUrl:"http://211.34.191.215:1935/live/1-71.stream/playlist.m3u8" },
  { id:"mosulpo",        name:"모슬포항",      region:"서귀포시 대정읍", category:"항구",  description:"마라도 배편이 출발하는 제주 최남단 항구입니다.",     lat:33.214, lng:126.252, originUrl:"http://211.34.191.215:1935/live/1-155.stream/playlist.m3u8" },
  { id:"hamo_beach",     name:"하모해변",      region:"서귀포시 대정읍", category:"해변",  description:"대정읍 하모리 해수욕장입니다.",                     lat:33.217, lng:126.255, originUrl:"http://211.34.191.215:1935/live/11-24.stream/playlist.m3u8" },
  { id:"daejeong_hamo",  name:"대정하모",      region:"서귀포시 대정읍", category:"포구",  description:"대정 하모 해안 일대입니다.",                        lat:33.218, lng:126.257, originUrl:"http://211.34.191.215:1935/live/1-73.stream/playlist.m3u8" },
  { id:"jungmun",        name:"중문해수욕장",  region:"서귀포시 중문동", category:"해변",  description:"서귀포 대표 해수욕장으로 관광단지가 인접합니다.",   lat:33.245, lng:126.412, originUrl:"http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100010/0/1/1.m3u8" },
  { id:"bomok",          name:"보목포구",      region:"서귀포시 보목동", category:"항구",  description:"서귀포시 보목동 포구입니다.",                       lat:33.236, lng:126.582, originUrl:"http://211.34.191.215:1935/live/1-152.stream/playlist.m3u8" },
  { id:"cheonjiyeon",    name:"천지연",        region:"서귀포시 서홍동", category:"관광지",description:"서귀포 대표 폭포 관광지입니다.",                   lat:33.245, lng:126.559, originUrl:"http://211.34.191.215:1935/live/1-72.stream/playlist.m3u8" },
  { id:"saeyeongyo",     name:"새연교",        region:"서귀포시 서홍동", category:"관광지",description:"서귀포항과 새섬을 잇는 보행교입니다.",             lat:33.242, lng:126.562, originUrl:"http://123.140.197.51/stream/35/play.m3u8" },
  { id:"nonjitmul",      name:"논짓물",        region:"서귀포시 하예동", category:"관광지",description:"서귀포 하예동 해안 용천수 명소입니다.",             lat:33.233, lng:126.488, originUrl:"http://211.34.191.215:1935/live/1-193.stream/playlist.m3u8" },
  { id:"seogwipo_hang1", name:"서귀포항",      region:"서귀포시",        category:"항구",  description:"서귀포 여객터미널 항구입니다.",                     lat:33.240, lng:126.561, originUrl:"http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100009/0/1/1.m3u8" },
  { id:"seogwipo_hang2", name:"서귀포항2",     region:"서귀포시",        category:"항구",  description:"서귀포항 추가 앵글입니다.",                         lat:33.241, lng:126.563, originUrl:"http://211.34.191.215:1935/live/1-34.stream/playlist.m3u8" },
];

export async function POST(req: NextRequest) {
  // Admin 인증
  const cookieStore = await cookies();
  const authCookie  = cookieStore.get("admin_auth")?.value;
  if (!authCookie || authCookie !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const batch = db.batch();

    for (const c of SEED) {
      const ref = db.collection("cctvs").doc(c.id);
      batch.set(ref, {
        id:          c.id,
        name:        c.name,
        region:      c.region,
        direction:   getDirection(c.region),
        category:    c.category,
        originUrl:   c.originUrl,
        youtubeId:   null,
        active:      true,
        description: c.description,
        lat:         c.lat,
        lng:         c.lng,
        addedAt:     new Date(),
      }, { merge: true });
    }

    await batch.commit();

    return NextResponse.json({ ok: true, count: SEED.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Admin SDK 설정 문제
    if (msg.includes("FIREBASE_SERVICE_ACCOUNT")) {
      return NextResponse.json({
        error: "Firebase Admin SDK 미설정",
        hint: "Vercel 환경변수 FIREBASE_SERVICE_ACCOUNT에 서비스 계정 JSON을 등록해주세요.",
        guide: "Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성 → JSON 다운로드 → 내용 전체를 Vercel 환경변수 FIREBASE_SERVICE_ACCOUNT 에 복사",
      }, { status: 500 });
    }
    return NextResponse.json({ error: msg.slice(0, 300) }, { status: 500 });
  }
}
