"use client";

import { useCallback, useState } from "react";
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from "@react-google-maps/api";

type MapShop = {
  slug: string;
  name: string;
  area: string;
  category: string;
  latitude: number;
  longitude: number;
};

type MapViewProps = {
  shops: MapShop[];
  onShopClick?: (slug: string) => void;
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

export function MapView({ shops, onShopClick }: MapViewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
  });

  const [selectedShop, setSelectedShop] = useState<MapShop | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

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

      // ズーム・ドラッグ時に状態を保存
      mapInstance.addListener("idle", () => {
        const c = mapInstance.getCenter();
        const z = mapInstance.getZoom();
        if (c && z !== undefined) {
          saveMapState({ lat: c.lat(), lng: c.lng() }, z);
        }
      });
    },
    [shops]
  );

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

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
    <div className="h-[calc(100vh-16rem)] min-h-[400px] w-full overflow-hidden rounded-xl border border-gray-200">
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
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
        }}
      >
        {shops.map((shop) => (
          <MarkerF
            key={shop.slug}
            position={{ lat: shop.latitude, lng: shop.longitude }}
            onClick={() => setSelectedShop(shop)}
            label={{
              text: shop.name.length > 8 ? shop.name.slice(0, 8) + "…" : shop.name,
              color: "white",
              fontSize: "11px",
              fontWeight: "600",
            }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 0,
            }}
          />
        ))}

        {/* Custom markers with labels */}
        {shops.map((shop) => (
          <MarkerF
            key={`pin-${shop.slug}`}
            position={{ lat: shop.latitude, lng: shop.longitude }}
            onClick={() => setSelectedShop(shop)}
            icon={{
              url: "data:image/svg+xml," + encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="#E06A4E" stroke="white" stroke-width="3"/>
                  <circle cx="18" cy="18" r="5" fill="white"/>
                </svg>
              `),
              scaledSize: new google.maps.Size(36, 36),
              anchor: new google.maps.Point(18, 18),
            }}
          />
        ))}

        {selectedShop && (
          <InfoWindowF
            position={{ lat: selectedShop.latitude, lng: selectedShop.longitude }}
            onCloseClick={() => setSelectedShop(null)}
            options={{ pixelOffset: new google.maps.Size(0, -20) }}
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
