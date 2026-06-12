"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

interface KakaoMapProps {
  address?: string;
  lat?: number;
  lng?: number;
  placeName?: string;
  className?: string;
}

// 카카오 지도 SDK 로더 (한 번만 로드)
let kakaoLoaderPromise: Promise<void> | null = null;

function loadKakaoSdk(appKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject();
  // 이미 로드됨
  if ((window as unknown as { kakao?: { maps?: unknown } }).kakao?.maps) {
    return Promise.resolve();
  }
  if (kakaoLoaderPromise) return kakaoLoaderPromise;

  kakaoLoaderPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    // autoload=false 후 kakao.maps.load로 명시적 초기화, services 라이브러리로 지오코딩
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=services`;
    script.async = true;
    script.onload = () => {
      const kakao = (window as unknown as { kakao: { maps: { load: (cb: () => void) => void } } }).kakao;
      kakao.maps.load(() => resolve());
    };
    script.onerror = () => reject(new Error("kakao sdk load failed"));
    document.head.appendChild(script);
  });
  return kakaoLoaderPromise;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function KakaoMap({ address, lat, lng, placeName, className }: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

  useEffect(() => {
    if (!appKey || !containerRef.current) {
      setFailed(true);
      return;
    }
    let cancelled = false;

    loadKakaoSdk(appKey)
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const kakao = (window as any).kakao;

        const render = (latitude: number, longitude: number) => {
          if (cancelled || !containerRef.current) return;
          const center = new kakao.maps.LatLng(latitude, longitude);
          const map = new kakao.maps.Map(containerRef.current, { center, level: 3 });
          const marker = new kakao.maps.Marker({ position: center });
          marker.setMap(map);
          if (placeName) {
            const iw = new kakao.maps.InfoWindow({
              content: `<div style="padding:5px 10px;font-size:12px;font-weight:600;white-space:nowrap;">${placeName}</div>`,
            });
            iw.open(map, marker);
          }
        };

        if (lat && lng) {
          render(lat, lng);
          return;
        }
        // 좌표 없으면 주소 → 좌표 지오코딩
        if (address) {
          const geocoder = new kakao.maps.services.Geocoder();
          geocoder.addressSearch(address, (result: any[], status: string) => {
            if (status === kakao.maps.services.Status.OK && result[0]) {
              render(Number(result[0].y), Number(result[0].x));
            } else {
              // 주소 검색 실패 시 키워드(상호명)로 재시도
              const places = new kakao.maps.services.Places();
              places.keywordSearch(placeName || address, (res: any[], st: string) => {
                if (st === kakao.maps.services.Status.OK && res[0]) {
                  render(Number(res[0].y), Number(res[0].x));
                } else {
                  setFailed(true);
                }
              });
            }
          });
        } else {
          setFailed(true);
        }
      })
      .catch(() => setFailed(true));

    return () => { cancelled = true; };
  }, [appKey, address, lat, lng, placeName]);

  if (failed) {
    return (
      <div className={className} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <MapPin size={28} style={{ opacity: 0.4 }} />
        <span style={{ fontSize: 13, opacity: 0.5 }}>지도를 표시할 수 없습니다</span>
      </div>
    );
  }

  return <div ref={containerRef} className={className} />;
}
