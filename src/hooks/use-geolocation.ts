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
  /** 設定変更ガイドのテキスト (拒否時) */
  settingsGuide: string | null;
  /** 位置情報を取得する */
  requestLocation: () => void;
  /** 位置情報をクリアする */
  clearLocation: () => void;
};

/** デバイスとブラウザに応じた設定変更ガイドを生成 */
function getSettingsGuide(): string {
  const ua = navigator.userAgent;

  if (/iPhone|iPad|iPod/.test(ua)) {
    // iOS
    if (/CriOS/.test(ua)) {
      return "iPhoneの「設定」→「Chrome」→「位置情報」→「使用中のみ許可」に変更してください。その後、このページをリロードしてください。";
    }
    if (/FxiOS/.test(ua)) {
      return "iPhoneの「設定」→「Firefox」→「位置情報」→「使用中のみ許可」に変更してください。その後、このページをリロードしてください。";
    }
    // Safari (default)
    return "iPhoneの「設定」→「Safari」→「位置情報」→「確認」または「許可」に変更してください。もしくは、Safari のアドレスバー左の「ぁあ」→「Webサイトの設定」→「位置情報」→「許可」でも設定できます。";
  }

  if (/Android/.test(ua)) {
    if (/Chrome/.test(ua)) {
      return "アドレスバーの左端にある鍵アイコン（🔒）をタップ →「権限」または「サイトの設定」→「位置情報」→「許可」に変更してください。";
    }
    return "ブラウザの設定 →「サイトの設定」→「位置情報」から、このサイトの位置情報を許可してください。";
  }

  // Desktop
  if (/Chrome/.test(ua) && !/Edg/.test(ua)) {
    return "アドレスバーの左端にある鍵アイコン（🔒）をクリック →「位置情報」→「許可」に変更してください。";
  }
  if (/Edg/.test(ua)) {
    return "アドレスバーの左端にある鍵アイコン（🔒）をクリック →「このサイトのアクセス許可」→「位置情報」→「許可」に変更してください。";
  }
  if (/Firefox/.test(ua)) {
    return "アドレスバーの左端にあるアイコンをクリック →「位置情報へのアクセス」→「許可」に変更してください。";
  }
  if (/Safari/.test(ua)) {
    return "Safari メニュー →「この Web サイトの設定」→「位置情報」→「許可」に変更してください。";
  }

  return "ブラウザの設定から、このサイトの位置情報の利用を許可してください。変更後、ページをリロードしてください。";
}

/**
 * ブラウザの Geolocation API を使って現在地を取得するフック。
 * Permissions API で事前に許可状態をチェックし、拒否済みなら
 * デバイス別の設定変更ガイドを提供する。
 */
export function useGeolocation(): GeoState {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<GeoPermission>("unknown");
  const [settingsGuide, setSettingsGuide] = useState<string | null>(null);

  // Permissions API で状態を監視
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (!navigator.permissions) {
      // Permissions API 非対応（Safari 15以前など）
      setPermission("unknown");
      return;
    }

    let status: PermissionStatus | null = null;

    navigator.permissions.query({ name: "geolocation" }).then((result) => {
      status = result;
      setPermission(result.state as GeoPermission);
      if (result.state === "denied") {
        setSettingsGuide(getSettingsGuide());
      }

      // 状態変更を監視（ユーザーがブラウザ設定で許可した場合など）
      result.addEventListener("change", () => {
        setPermission(result.state as GeoPermission);
        if (result.state === "denied") {
          setSettingsGuide(getSettingsGuide());
        } else {
          setSettingsGuide(null);
          setError(null);
        }
      });
    }).catch(() => {
      setPermission("unknown");
    });

    return () => {
      // PermissionStatus の change リスナーは自動でクリーンアップされないが、
      // コンポーネントアンマウント時に status を null にして参照を切る
      status = null;
    };
  }, []);

  const requestLocation = useCallback(() => {
    if (location) {
      // 既に取得済み
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("お使いのブラウザは位置情報に対応していません。");
      return;
    }

    // 拒否済みの場合は設定変更を促す
    if (permission === "denied") {
      setError("位置情報の利用が拒否されています。以下の手順で許可してください。");
      setSettingsGuide(getSettingsGuide());
      return;
    }

    setLoading(true);
    setError(null);
    setSettingsGuide(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setError(null);
        setSettingsGuide(null);
        setLoading(false);
        setPermission("granted");
      },
      (err) => {
        setLoading(false);
        console.error("Geolocation error:", err);

        if (err.code === err.PERMISSION_DENIED) {
          setPermission("denied");
          setError("位置情報の利用が拒否されました。以下の手順で許可してください。");
          setSettingsGuide(getSettingsGuide());
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
  }, [location, permission]);

  const clearLocation = useCallback(() => {
    setLocation(null);
    setError(null);
    setSettingsGuide(null);
  }, []);

  return {
    location,
    loading,
    error,
    permission,
    isDenied: permission === "denied",
    settingsGuide,
    requestLocation,
    clearLocation,
  };
}
