"use client";

import { useCallback, useRef, useState } from "react";
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from "@react-google-maps/api";

type MapShop = {
  slug: string;
  name: string;
  area: string;
  category: string;
  latitude: number;
  longitude: number;
};

export type MapBounds = {
  ne: { lat: number; lng: number };
  sw: { lat: number; lng: number };
};

type MapViewProps = {
  shops: MapShop[];
  onShopClick?: (slug: string) => void;
  onBoundsChanged?: (bounds: MapBounds) => void;
  onMapMoved?: () => void;
  highlightedSlug?: string | null;
  height?: string;
};

const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "100%",
};

const TOKYO_CENTER = { lat: 35.6812, lng: 139.7671 };
const MAP_STATE_KEY = "oshidori_map_state";

function saveMapState(center: { lat: number; lng: number }, zoom: number) {
  try {
    sessionStorage.setItem(MAP_STATE_KEY, JSON.stringify({ center, zoom }));
  } catch { /* ignore */ }
}

function loadMapState(): { center: { lat: number; lng: number }; zoom: number } | null {
  try {
    const raw = sessionStorage.getItem(MAP_STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** 番号付きマーカーSVGを生成 */
function numberedMarkerSvg(num: number, isHighlighted: boolean): string {
  const bg = isHighlighted ? "#2C3E50" : "#E06A4E";
  const size = isHighlighted ? 38 : 30;
  const r = size / 2;
  const sw = isHighlighted ? 3 : 2;
  const fs = isHighlighted ? 16 : 13;
  return "data:image/svg+xml," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${r}" cy="${r}" r="${r - sw}" fill="${bg}" stroke="white" stroke-width="${sw}"/>
      <text x="${r}" y="${r + fs * 0.35}" text-anchor="middle" fill="white" font-size="${fs}" font-weight="700" font-family="Arial,sans-serif">${num}</text>
    </svg>`
  );
}

export function MapView({ shops, onShopClick, onBoundsChanged, onMapMoved, highlightedSlug, height }: MapViewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
  });

  const [selectedShop, setSelectedShop] = useState<MapShop | null>(null);
  const [, setMap] = useState<google.maps.Map | null>(null);

  // コールバックのRefを保持（onLoadは一度しか呼ばれないため）
  const onBoundsChangedRef = useRef(onBoundsChanged);
  onBoundsChangedRef.current = onBoundsChanged;
  const onMapMovedRef = useRef(onMapMoved);
  onMapMovedRef.current = onMapMoved;

  const onLoad = useCallback(
    (mapInstance: google.maps.Map) => {
      setMap(mapInstance);

      // sessionStorageから前回の地図状態を復元
      const saved = loadMapState();
      if (saved) {
        mapInstance.setCenter(saved.center);
        mapInstance.setZoom(saved.zoom);
      } else if (shops.length > 1) {
        const bounds = new google.maps.LatLngBounds();
        shops.forEach((s) => bounds.extend({ lat: s.latitude, lng: s.longitude }));
        mapInstance.fitBounds(bounds, 50);
      } else if (shops.length === 1) {
        mapInstance.setCenter({ lat: shops[0].latitude, lng: shops[0].longitude });
        mapInstance.setZoom(15);
      }

      // 初回ロード完了フラグ（初回のidle通知を除外するため）
      let initialized = false;
      setTimeout(() => { initialized = true; }, 1200);

      mapInstance.addListener("idle", () => {
        const c = mapInstance.getCenter();
        const z = mapInstance.getZoom();
        if (c && z !== undefined) {
          saveMapState({ lat: c.lat(), lng: c.lng() }, z);
        }

        // bounds通知
        const bounds = mapInstance.getBounds();
        if (bounds && onBoundsChangedRef.current) {
          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();
          onBoundsChangedRef.current({
            ne: { lat: ne.lat(), lng: ne.lng() },
            sw: { lat: sw.lat(), lng: sw.lng() },
          });
        }

        // ユーザー操作時のみmapMoved通知
        if (initialized) {
          onMapMovedRef.current?.();
        }
      });
    },
    [shops]
  );

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const containerHeight = height ?? "calc(100vh - 16rem)";

  if (!apiKey) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-600">Google Maps を使用するには</p>
          <p className="mt-1 text-xs text-gray-400">
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY を .env.local に設定してください
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
        <p className="text-sm text-red-500">マップの読み込みに失敗しました</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E06A4E] border-t-transparent" />
      </div>
    );
  }

  return (
    <div style={{ height: containerHeight, minHeight: "280px" }} className="w-full overflow-hidden rounded-xl border border-gray-200">
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={TOKYO_CENTER}
        zoom={12}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: "greedy",
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
        }}
      >
        {/* 番号付きマーカー */}
        {shops.map((shop, index) => {
          const isHighlighted = shop.slug === highlightedSlug;
          const markerSize = isHighlighted ? 38 : 30;
          return (
            <MarkerF
              key={shop.slug}
              position={{ lat: shop.latitude, lng: shop.longitude }}
              onClick={() => setSelectedShop(shop)}
              zIndex={isHighlighted ? 1000 : index}
              icon={{
                url: numberedMarkerSvg(index + 1, isHighlighted),
                scaledSize: new google.maps.Size(markerSize, markerSize),
                anchor: new google.maps.Point(markerSize / 2, markerSize / 2),
              }}
            />
          );
        })}

        {selectedShop && (
          <InfoWindowF
            position={{ lat: selectedShop.latitude, lng: selectedShop.longitude }}
            onCloseClick={() => setSelectedShop(null)}
            options={{ pixelOffset: new google.maps.Size(0, -18) }}
          >
            <div style={{ minWidth: 160, fontFamily: "sans-serif", padding: 4 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                {selectedShop.name}
              </div>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
                {selectedShop.area} · {selectedShop.category}
              </div>
              <button
                onClick={() => onShopClick?.(selectedShop.slug)}
                style={{
                  display: "inline-block",
                  background: "#E06A4E",
                  color: "white",
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  border: "none",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ストーリーを読む
              </button>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>
    </div>
  );
}
