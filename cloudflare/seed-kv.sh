#!/bin/bash
# CCTV 원본 URL을 KV에 등록하는 스크립트
# 사용법: bash seed-kv.sh
# 사전 조건: wrangler login, wrangler.toml KV id 설정 완료

KV_BINDING="CCTV_ORIGINS"

register() {
  local ID=$1
  local ORIGIN_URL=$2
  local NAME=$3

  echo "등록: $ID → $ORIGIN_URL"
  wrangler kv:key put --binding="$KV_BINDING" "$ID" \
    "{\"originUrl\":\"$ORIGIN_URL\",\"active\":true,\"name\":\"$NAME\"}"
}

# ── 직접 설치 CCTV ────────────────────────────────────────────
# register "hamdeok"  "http://YOUR_IP/live.m3u8"       "함덕 해변"
# register "seongsan" "http://YOUR_IP/live.m3u8"       "성산 일출봉"

# ── 제주도 재난정보 CCTV ──────────────────────────────────────
# 제주도 재난안전대책본부 제공 스트림 주소 입력
# register "jeju_disaster_01" "http://DISASTER_IP/stream.m3u8" "제주시 중심가"
# register "jeju_disaster_02" "http://DISASTER_IP/stream.m3u8" "서귀포 시청"

echo "완료!"
