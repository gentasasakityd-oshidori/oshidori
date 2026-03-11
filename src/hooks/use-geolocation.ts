"use client";

import { useState, useEffect, useCallback } from "react";

type GeoPermission = "granted" | "prompt" | "denied" | "unknown";

type GeoState = {
  /** 現在地 (取得済みの場合) */
  location: { lat: number; lng: number } | null;
  /** 位置情報の取得中 */
  loading: boolean;
  /** エラーメッセージ (ユーザー向け) */
  error: string | null;
  /** ブラウザのパーミッション状態 */
  permission: GeoPermission;
  /** パーミッションが拒否されているか */
  isDenied: boolean;
  /** 位置情報を取得する（ネイティブブラウザポップアップを表示） */
  requestLocation: () => void;
  /** 位置情報をクリアする */
  clearLocation: () => void;
};

/**
 * ブラウザの Geolocation API を使って現在地を取得するフック。
 * ボタンクリック時に getCurrentPosition() を呼び、
 * ブラウザのネイティブ許可ポップアップを表示させる。
 */
export function useGeolocation(): GeoState {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<GeoPermission>("unknown");

  // Permissions API で状態を監視（対応ブラウザのみ）
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (!navigator.permissions) {
      setPermission("unknown");
      return;
    }

    let status: PermissionStatus | null = null;

    navigator.permissions.query({ name: "geolocation" }).then((result) => {
      status = result;
      setPermission(result.state as GeoPermission);

      // 状態変更を監視（ユーザーがブラウザ設定で許可した場合など）
      result.addEventListener("change", () => {
        setPermission(result.state as GeoPermission);
        if (result.state !== "denied") {
          setError(null);
        }
      });
    }).catch(() => {
      setPermission("unknown");
    });

    return () => {
      status = null;
    };
  }, []);

  const requestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("お使いのブラウザは位置情報に対応していません。");
      return;
    }

    // 常に getCurrentPosition を呼び出す
    // → 初回: ブラウザのネイティブ許可ポップアップが表示される
    // → 許可済み: 即座に位置情報を取得
    // → 拒否済み: エラーコールバックで通知
    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setError(null);
        setLoading(false);
        setPermission("granted");
      },
      (err) => {
        setLoading(false);
        console.error("Geolocation error:", err);

        if (err.code === err.PERMISSION_DENIED) {
          setPermission("denied");
          setError("位置情報の利用が許可されていません。ブラウザの設定から位置情報を許可してください。");
        } else if (err.code === err.TIMEOUT) {
          setError("位置情報の取得がタイムアウトしました。電波状況を確認して、もう一度お試しください。");
        } else {
          setError("位置情報の取得に失敗しました。もう一度お試しください。");
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 300000, // 5分キャッシュ
      },
    );
  }, []);

  const clearLocation = useCallback(() => {
    setLocation(null);
    setError(null);
  }, []);

  return {
    location,
    loading,
    error,
    permission,
    isDenied: permission === "denied",
    requestLocation,
    clearLocation,
  };
}
