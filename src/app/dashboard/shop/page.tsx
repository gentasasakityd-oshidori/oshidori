"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Store,
  MapPin,
  Clock,
  Phone,
  Camera,
  Save,
  Loader2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Globe,
  Info,
  Search,
  Train,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PREFECTURES, CATEGORIES } from "@/lib/constants";
import { toast } from "sonner";

// ────────────────────────────────────────────
// 型定義
// ────────────────────────────────────────────
type ShopData = {
  id: string;
  name: string;
  owner_name: string;
  owner_real_name: string | null;
  area: string;
  category: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  hours: unknown;
  holidays: string | null;
  image_url: string | null;
  is_published: boolean;
  tabelog_url?: string | null;
  gmb_url?: string | null;
  homepage_url?: string | null;
};

type HoursData = {
  periods: Array<{ label: string; open: string; close: string }>;
  note: string;
};

type HolidaysData = {
  type: "regular" | "irregular" | "always_open";
  closed_days: string[];
  note: string;
};

type GeoStation = {
  station: string;
  distanceKm: number;
  walkMinutes: number;
};

// ────────────────────────────────────────────
// 定数
// ────────────────────────────────────────────
const DAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"] as const;

/** 15分刻みの時間選択肢 (06:00 ~ 24:00) */
function generateTimeOptions(): string[] {
  const times: string[] = [];
  for (let h = 6; h <= 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 24 && m > 0) break;
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      times.push(`${hh}:${mm}`);
    }
  }
  return times;
}
const TIME_OPTIONS = generateTimeOptions();

// ────────────────────────────────────────────
// ユーティリティ: 既存データの解析
// ────────────────────────────────────────────

/** 既存の address 文字列を都道府県/市区町村/町名番地/建物名に分解（ベストエフォート） */
function parseAddress(address: string | null): {
  prefecture: string;
  city: string;
  street: string;
  building: string;
} {
  const result = { prefecture: "東京都", city: "", street: "", building: "" };
  if (!address) return result;

  // 都道府県を抽出
  const prefMatch = address.match(
    /^(北海道|東京都|(?:京都|大阪)府|.{2,3}県)/
  );
  if (prefMatch) {
    result.prefecture = prefMatch[1];
    const rest = address.slice(prefMatch[1].length);
    // 市区町村を抽出 (市/区/町/村/郡)
    const cityMatch = rest.match(
      /^(.+?(?:市|区|町|村|郡.+?(?:町|村)))/
    );
    if (cityMatch) {
      result.city = cityMatch[1];
      const afterCity = rest.slice(cityMatch[1].length);
      // 建物名: スペース以降やビル/階を含む部分
      const buildingMatch = afterCity.match(
        /\s+(.+)$/
      );
      if (buildingMatch) {
        result.street = afterCity.slice(0, afterCity.length - buildingMatch[0].length);
        result.building = buildingMatch[1];
      } else {
        result.street = afterCity;
      }
    } else {
      result.city = rest;
    }
  } else {
    // 都道府県が見つからない場合は全体を street に
    result.prefecture = "東京都";
    result.street = address;
  }

  return result;
}

/** 既存の phone 文字列を3分割 */
function parsePhone(phone: string | null): [string, string, string] {
  if (!phone) return ["", "", ""];
  const cleaned = phone.replace(/[\s（）()ー−]/g, "");
  // ハイフン区切り
  const parts = cleaned.split("-");
  if (parts.length >= 3) {
    return [parts[0], parts[1], parts.slice(2).join("")];
  }
  // ハイフンなし: 先頭2-5桁を推測
  const digits = cleaned.replace(/-/g, "");
  if (digits.startsWith("03") || digits.startsWith("06")) {
    return [digits.slice(0, 2), digits.slice(2, 6), digits.slice(6)];
  }
  if (digits.startsWith("0120")) {
    return [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6)];
  }
  if (digits.startsWith("0")) {
    // 一般的な市外局番3桁
    return [digits.slice(0, 3), digits.slice(3, 7), digits.slice(7)];
  }
  return [digits, "", ""];
}

/** 既存の hours を HoursData に解析 */
function parseHours(hours: unknown): HoursData {
  const defaultData: HoursData = {
    periods: [],
    note: "",
  };

  if (!hours) return defaultData;

  // すでにJSON
  if (typeof hours === "object" && hours !== null) {
    const h = hours as Record<string, unknown>;
    if (Array.isArray(h.periods)) {
      return {
        periods: h.periods as HoursData["periods"],
        note: (h.note as string) || "",
      };
    }
  }

  // 文字列をベストエフォートで解析
  if (typeof hours === "string") {
    const str = hours.trim();
    // JSON文字列の可能性
    try {
      const parsed = JSON.parse(str);
      if (parsed && Array.isArray(parsed.periods)) {
        return {
          periods: parsed.periods,
          note: parsed.note || "",
        };
      }
    } catch {
      // パースに失敗: テキストとして扱う
    }

    // "11:00〜14:30 / 17:00〜21:00" のような形式
    const periods: HoursData["periods"] = [];
    const segments = str.split(/[/／]/).map((s) => s.trim());
    for (let i = 0; i < segments.length; i++) {
      const timeMatch = segments[i].match(
        /(\d{1,2}:\d{2})\s*[〜~ー−\-]\s*(\d{1,2}:\d{2})/
      );
      if (timeMatch) {
        periods.push({
          label: i === 0 ? "ランチ" : "ディナー",
          open: timeMatch[1].padStart(5, "0"),
          close: timeMatch[2].padStart(5, "0"),
        });
      }
    }

    if (periods.length > 0) {
      return { periods, note: "" };
    }

    // 解析できない場合はnoteに保持
    return { periods: [], note: str };
  }

  return defaultData;
}

/** 既存の holidays を HolidaysData に解析 */
function parseHolidays(holidays: string | null): HolidaysData {
  const defaultData: HolidaysData = {
    type: "regular",
    closed_days: [],
    note: "",
  };

  if (!holidays) return defaultData;

  // JSON文字列の可能性
  try {
    const parsed = JSON.parse(holidays);
    if (parsed && typeof parsed === "object" && parsed.type) {
      return {
        type: parsed.type,
        closed_days: parsed.closed_days || [],
        note: parsed.note || "",
      };
    }
  } catch {
    // パースに失敗
  }

  // テキスト解析
  if (holidays === "不定休") {
    return { type: "irregular", closed_days: [], note: "" };
  }
  if (holidays === "年中無休") {
    return { type: "always_open", closed_days: [], note: "" };
  }

  // 曜日を検出
  const closedDays: string[] = [];
  for (const day of DAY_LABELS) {
    if (holidays.includes(day)) {
      closedDays.push(day);
    }
  }

  if (closedDays.length > 0) {
    return { type: "regular", closed_days: closedDays, note: "" };
  }

  return { type: "regular", closed_days: [], note: holidays };
}

/** URL バリデーション */
function validateUrl(url: string): string | null {
  if (!url.trim()) return null;
  if (!/^https?:\/\/.+/.test(url.trim())) {
    return "URLは https:// または http:// で始めてください";
  }
  return null;
}

// ────────────────────────────────────────────
// 住所入力コンポーネント
// ────────────────────────────────────────────
function AddressFields({
  prefecture,
  city,
  street,
  building,
  onChange,
  errors,
}: {
  prefecture: string;
  city: string;
  street: string;
  building: string;
  onChange: (field: "prefecture" | "city" | "street" | "building", value: string) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-3">
      <Label>
        住所 <span className="text-destructive">*</span>
      </Label>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">
            都道府県 <span className="text-destructive">*</span>
          </label>
          <Select
            value={prefecture}
            onValueChange={(v) => onChange("prefecture", v)}
          >
            <SelectTrigger className={`w-full ${errors.prefecture ? "border-red-300" : ""}`}>
              <SelectValue placeholder="都道府県を選択" />
            </SelectTrigger>
            <SelectContent>
              {PREFECTURES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.prefecture && (
            <p className="text-xs text-red-500">{errors.prefecture}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">
            市区町村 <span className="text-destructive">*</span>
          </label>
          <Input
            value={city}
            onChange={(e) => onChange("city", e.target.value)}
            placeholder="例: 目黒区"
            className={errors.city ? "border-red-300" : ""}
          />
          {errors.city && (
            <p className="text-xs text-red-500">{errors.city}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">
          町名番地 <span className="text-destructive">*</span>
        </label>
        <Input
          value={street}
          onChange={(e) => onChange("street", e.target.value)}
          placeholder="例: 大岡山2-1-1"
          className={errors.street ? "border-red-300" : ""}
        />
        {errors.street && (
          <p className="text-xs text-red-500">{errors.street}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">
          建物名（任意）
        </label>
        <Input
          value={building}
          onChange={(e) => onChange("building", e.target.value)}
          placeholder="例: ABCビル 2F"
        />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// 電話番号3ボックス入力コンポーネント
// ────────────────────────────────────────────
function PhoneFields({
  parts,
  onChange,
  error,
}: {
  parts: [string, string, string];
  onChange: (index: 0 | 1 | 2, value: string) => void;
  error?: string;
}) {
  const ref1 = useRef<HTMLInputElement>(null);
  const ref2 = useRef<HTMLInputElement>(null);
  const ref3 = useRef<HTMLInputElement>(null);
  const refs = [ref1, ref2, ref3] as const;

  const maxLengths = [5, 4, 4] as const;

  function handleChange(index: 0 | 1 | 2, value: string) {
    // 数字のみ
    const digits = value.replace(/\D/g, "");
    onChange(index, digits);
    // auto-tab
    if (digits.length >= maxLengths[index] && index < 2) {
      refs[index + 1].current?.focus();
    }
  }

  return (
    <div className="space-y-1.5">
      <Label>
        電話番号 <span className="text-destructive">*</span>
      </Label>
      <div className="flex items-center gap-1.5">
        <Input
          ref={ref1}
          value={parts[0]}
          onChange={(e) => handleChange(0, e.target.value)}
          placeholder="03"
          maxLength={5}
          inputMode="tel"
          className={`w-20 text-center ${error ? "border-red-300" : ""}`}
        />
        <span className="text-muted-foreground">-</span>
        <Input
          ref={ref2}
          value={parts[1]}
          onChange={(e) => handleChange(1, e.target.value)}
          placeholder="1234"
          maxLength={4}
          inputMode="tel"
          className={`w-20 text-center ${error ? "border-red-300" : ""}`}
        />
        <span className="text-muted-foreground">-</span>
        <Input
          ref={ref3}
          value={parts[2]}
          onChange={(e) => handleChange(2, e.target.value)}
          placeholder="5678"
          maxLength={4}
          inputMode="tel"
          className={`w-20 text-center ${error ? "border-red-300" : ""}`}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        市外局番 - 市内局番 - 加入者番号
      </p>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ────────────────────────────────────────────
// 営業時間 構造化入力コンポーネント
// ────────────────────────────────────────────
function BusinessHoursFields({
  hoursData,
  onChange,
  error,
}: {
  hoursData: HoursData;
  onChange: (data: HoursData) => void;
  error?: string;
}) {
  const hasLunch = hoursData.periods.some((p) => p.label === "ランチ");
  const hasDinner = hoursData.periods.some((p) => p.label === "ディナー");

  const lunchPeriod = hoursData.periods.find((p) => p.label === "ランチ") || {
    label: "ランチ",
    open: "11:00",
    close: "14:30",
  };
  const dinnerPeriod = hoursData.periods.find(
    (p) => p.label === "ディナー"
  ) || { label: "ディナー", open: "17:00", close: "22:00" };

  function togglePeriod(label: string, enabled: boolean) {
    let newPeriods = hoursData.periods.filter((p) => p.label !== label);
    if (enabled) {
      const defaultPeriod =
        label === "ランチ" ? lunchPeriod : dinnerPeriod;
      newPeriods = [
        ...newPeriods,
        { label, open: defaultPeriod.open, close: defaultPeriod.close },
      ];
      // ソート: ランチ先
      newPeriods.sort((a) => (a.label === "ランチ" ? -1 : 1));
    }
    onChange({ ...hoursData, periods: newPeriods });
  }

  function updatePeriod(
    label: string,
    field: "open" | "close",
    value: string
  ) {
    const newPeriods = hoursData.periods.map((p) =>
      p.label === label ? { ...p, [field]: value } : p
    );
    onChange({ ...hoursData, periods: newPeriods });
  }

  return (
    <div className="space-y-3">
      <Label>
        営業時間 <span className="text-destructive">*</span>
      </Label>

      {/* ランチ */}
      <div className="rounded-lg border border-input p-3 space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={hasLunch}
            onChange={(e) => togglePeriod("ランチ", e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary accent-[#E06A4E]"
          />
          <span className="text-sm font-medium">ランチ営業あり</span>
        </label>
        {hasLunch && (
          <div className="flex items-center gap-2 pl-6">
            <Select
              value={lunchPeriod.open}
              onValueChange={(v) => updatePeriod("ランチ", "open", v)}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={`l-o-${t}`} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">~</span>
            <Select
              value={lunchPeriod.close}
              onValueChange={(v) => updatePeriod("ランチ", "close", v)}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={`l-c-${t}`} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* ディナー */}
      <div className="rounded-lg border border-input p-3 space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={hasDinner}
            onChange={(e) => togglePeriod("ディナー", e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary accent-[#E06A4E]"
          />
          <span className="text-sm font-medium">ディナー営業あり</span>
        </label>
        {hasDinner && (
          <div className="flex items-center gap-2 pl-6">
            <Select
              value={dinnerPeriod.open}
              onValueChange={(v) => updatePeriod("ディナー", "open", v)}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={`d-o-${t}`} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">~</span>
            <Select
              value={dinnerPeriod.close}
              onValueChange={(v) => updatePeriod("ディナー", "close", v)}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={`d-c-${t}`} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* 備考 */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">備考</label>
        <Input
          value={hoursData.note}
          onChange={(e) => onChange({ ...hoursData, note: e.target.value })}
          placeholder="例: ラストオーダー 閉店30分前"
          className="text-sm"
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ────────────────────────────────────────────
// 定休日 構造化入力コンポーネント
// ────────────────────────────────────────────
function HolidayFields({
  holidaysData,
  onChange,
  error,
}: {
  holidaysData: HolidaysData;
  onChange: (data: HolidaysData) => void;
  error?: string;
}) {
  function setType(type: HolidaysData["type"]) {
    onChange({
      ...holidaysData,
      type,
      closed_days: type === "regular" ? holidaysData.closed_days : [],
    });
  }

  function toggleDay(day: string) {
    const days = new Set(holidaysData.closed_days);
    if (days.has(day)) {
      days.delete(day);
    } else {
      days.add(day);
    }
    onChange({ ...holidaysData, closed_days: Array.from(days) });
  }

  return (
    <div className="space-y-3">
      <Label>
        定休日 <span className="text-destructive">*</span>
      </Label>

      {/* タイプ選択 */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { value: "regular", label: "通常定休" },
            { value: "irregular", label: "不定休" },
            { value: "always_open", label: "年中無休" },
          ] as const
        ).map((opt) => (
          <label key={opt.value} className="flex items-center gap-1.5">
            <input
              type="radio"
              name="holiday-type"
              checked={holidaysData.type === opt.value}
              onChange={() => setType(opt.value)}
              className="h-4 w-4 text-primary accent-[#E06A4E]"
            />
            <span className="text-sm">{opt.label}</span>
          </label>
        ))}
      </div>

      {/* 曜日チェックボックス（通常定休のときのみ） */}
      {holidaysData.type === "regular" && (
        <div className="flex flex-wrap gap-1.5">
          {DAY_LABELS.map((day) => {
            const checked = holidaysData.closed_days.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  checked
                    ? "border-primary bg-primary text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      )}

      {/* その他備考 */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">
          その他備考（任意）
        </label>
        <Input
          value={holidaysData.note}
          onChange={(e) => onChange({ ...holidaysData, note: e.target.value })}
          placeholder="例: 祝日は営業、年末年始休業あり"
          className="text-sm"
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ────────────────────────────────────────────
// 最寄り駅検出コンポーネント
// ────────────────────────────────────────────
function NearestStationDetector({
  fullAddress,
  detectedStation,
  onStationDetected,
  onGeoDetected,
}: {
  fullAddress: string;
  detectedStation: string;
  onStationDetected: (station: string) => void;
  onGeoDetected?: (data: { lat: number; lng: number; station: string; walkMinutes: number }) => void;
}) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [stations, setStations] = useState<GeoStation[]>([]);
  const [geoError, setGeoError] = useState<string | null>(null);

  const detectStation = useCallback(async () => {
    if (!fullAddress || fullAddress.length < 5) {
      setGeoError("住所を入力してから検出してください");
      return;
    }
    setIsDetecting(true);
    setGeoError(null);
    setStations([]);
    try {
      const res = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: fullAddress }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "検出に失敗しました" }));
        setGeoError(data.error || "検出に失敗しました");
        setIsDetecting(false);
        return;
      }
      const data = await res.json();
      if (data.nearestStations && data.nearestStations.length > 0) {
        setStations(data.nearestStations.slice(0, 3));
        const nearest = data.nearestStations[0];
        onStationDetected(nearest.station);
        if (data.lat != null && data.lng != null) {
          onGeoDetected?.({
            lat: data.lat,
            lng: data.lng,
            station: nearest.station,
            walkMinutes: nearest.walkMinutes,
          });
        }
      } else {
        setGeoError("最寄り駅が見つかりませんでした");
      }
    } catch (err) {
      console.error("Station detection error:", err);
      setGeoError("ネットワークエラーが発生しました");
    } finally {
      setIsDetecting(false);
    }
  }, [fullAddress, onStationDetected, onGeoDetected]);

  return (
    <div className="space-y-2">
      <Label>最寄り駅（自動検出）</Label>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={detectStation}
          disabled={isDetecting || !fullAddress}
          className="gap-1.5"
        >
          {isDetecting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Search className="h-3 w-3" />
          )}
          住所から最寄り駅を検出
        </Button>
      </div>

      {geoError && (
        <p className="text-xs text-red-500">{geoError}</p>
      )}

      {stations.length > 0 && (
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-1">
          {stations.map((s, i) => (
            <button
              key={s.station}
              type="button"
              onClick={() => onStationDetected(s.station)}
              className={`flex items-center gap-2 w-full text-left rounded px-2 py-1 text-sm transition-colors ${
                detectedStation === s.station
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-primary/5 text-muted-foreground"
              }`}
            >
              <Train className="h-3.5 w-3.5 shrink-0" />
              <span>
                {s.station}駅（徒歩{s.walkMinutes}分）
              </span>
              {i === 0 && (
                <Badge variant="secondary" className="text-[10px] ml-auto">
                  最寄り
                </Badge>
              )}
            </button>
          ))}
        </div>
      )}

      {detectedStation && stations.length === 0 && (
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Train className="h-3.5 w-3.5" />
          エリア: {detectedStation}
        </p>
      )}
    </div>
  );
}

// ────────────────────────────────────────────
// 共通フォームフィールド（新規・編集共用）
// ────────────────────────────────────────────
function useShopForm(initial: {
  name: string;
  ownerName: string;
  ownerRealName: string;
  category: string;
  area: string;
  description: string;
  addressPrefecture: string;
  addressCity: string;
  addressStreet: string;
  addressBuilding: string;
  phoneParts: [string, string, string];
  hoursData: HoursData;
  holidaysData: HolidaysData;
  tabelogUrl: string;
  gmbUrl: string;
  homepageUrl: string;
}) {
  const [name, setName] = useState(initial.name);
  const [ownerName, setOwnerName] = useState(initial.ownerName);
  const [ownerRealName, setOwnerRealName] = useState(initial.ownerRealName);
  const [category, setCategory] = useState(initial.category);
  const [area, setArea] = useState(initial.area);
  const [description, setDescription] = useState(initial.description);
  const [addrPref, setAddrPref] = useState(initial.addressPrefecture);
  const [addrCity, setAddrCity] = useState(initial.addressCity);
  const [addrStreet, setAddrStreet] = useState(initial.addressStreet);
  const [addrBuilding, setAddrBuilding] = useState(initial.addressBuilding);
  const [phoneParts, setPhoneParts] = useState<[string, string, string]>(initial.phoneParts);
  const [hoursData, setHoursData] = useState<HoursData>(initial.hoursData);
  const [holidaysData, setHolidaysData] = useState<HolidaysData>(initial.holidaysData);
  const [tabelogUrl, setTabelogUrl] = useState(initial.tabelogUrl);
  const [gmbUrl, setGmbUrl] = useState(initial.gmbUrl);
  const [homepageUrl, setHomepageUrl] = useState(initial.homepageUrl);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // 組み立てた住所
  const fullAddress = [addrPref, addrCity, addrStreet, addrBuilding]
    .map((s) => s.trim())
    .filter(Boolean)
    .join("");

  // 組み立てた電話番号
  const fullPhone = phoneParts.filter(Boolean).join("-");

  // 組み立てた営業時間JSON
  const hoursJson = JSON.stringify({
    periods: hoursData.periods.map((p) => ({
      label: p.label,
      open: p.open,
      close: p.close,
    })),
    note: hoursData.note,
  });

  // 組み立てた定休日JSON
  const holidaysJson = JSON.stringify(holidaysData);

  function handleAddressChange(field: "prefecture" | "city" | "street" | "building", value: string) {
    switch (field) {
      case "prefecture": setAddrPref(value); break;
      case "city": setAddrCity(value); break;
      case "street": setAddrStreet(value); break;
      case "building": setAddrBuilding(value); break;
    }
  }

  function handlePhoneChange(index: 0 | 1 | 2, value: string) {
    const newParts: [string, string, string] = [...phoneParts];
    newParts[index] = value;
    setPhoneParts(newParts);
  }

  function validateAll(): boolean {
    const errors: Record<string, string> = {};

    if (!name.trim()) errors.name = "店舗名を入力してください";
    if (!ownerName.trim()) errors.ownerName = "ニックネームを入力してください";
    if (!category) errors.category = "カテゴリーを選択してください";
    if (!addrPref) errors.prefecture = "都道府県を選択してください";
    if (!addrCity.trim()) errors.city = "市区町村を入力してください";
    if (!addrStreet.trim()) errors.street = "町名番地を入力してください";

    // 電話番号バリデーション
    if (!phoneParts[0] || !phoneParts[1] || !phoneParts[2]) {
      errors.phone = "電話番号を入力してください";
    } else {
      const digits = phoneParts.join("");
      if (!/^0\d{9,10}$/.test(digits)) {
        errors.phone = "電話番号は0から始まる10~11桁で入力してください";
      }
    }

    // 営業時間バリデーション
    if (hoursData.periods.length === 0) {
      errors.hours = "ランチまたはディナーの営業時間を1つ以上設定してください";
    }

    // 定休日バリデーション
    if (
      holidaysData.type === "regular" &&
      holidaysData.closed_days.length === 0
    ) {
      errors.holidays = "定休日の曜日を1つ以上選択してください";
    }

    // URL バリデーション
    const tabelogErr = validateUrl(tabelogUrl);
    if (tabelogErr) errors.tabelogUrl = tabelogErr;
    const gmbErr = validateUrl(gmbUrl);
    if (gmbErr) errors.gmbUrl = gmbErr;
    const hpErr = validateUrl(homepageUrl);
    if (hpErr) errors.homepageUrl = hpErr;

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  const canSubmit =
    name.trim() &&
    ownerName.trim() &&
    category &&
    addrPref &&
    addrCity.trim() &&
    addrStreet.trim() &&
    phoneParts[0] &&
    phoneParts[1] &&
    phoneParts[2] &&
    hoursData.periods.length > 0;

  return {
    name, setName,
    ownerName, setOwnerName,
    ownerRealName, setOwnerRealName,
    category, setCategory,
    area, setArea,
    description, setDescription,
    addrPref, addrCity, addrStreet, addrBuilding,
    handleAddressChange,
    phoneParts, handlePhoneChange,
    hoursData, setHoursData,
    holidaysData, setHolidaysData,
    tabelogUrl, setTabelogUrl,
    gmbUrl, setGmbUrl,
    homepageUrl, setHomepageUrl,
    fieldErrors, setFieldErrors,
    fullAddress, fullPhone, hoursJson, holidaysJson,
    validateAll,
    canSubmit,
  };
}

// ────────────────────────────────────────────
// 新規店舗登録フォーム
// ────────────────────────────────────────────
function ShopRegistrationForm({
  onCreated,
}: {
  onCreated: (shop: ShopData) => void;
}) {
  const form = useShopForm({
    name: "",
    ownerName: "",
    ownerRealName: "",
    category: "",
    area: "",
    description: "",
    addressPrefecture: "東京都",
    addressCity: "",
    addressStreet: "",
    addressBuilding: "",
    phoneParts: ["", "", ""],
    hoursData: { periods: [], note: "" },
    holidaysData: { type: "regular", closed_days: [], note: "" },
    tabelogUrl: "",
    gmbUrl: "",
    homepageUrl: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [geoData, setGeoData] = useState<{ lat: number; lng: number; station: string; walkMinutes: number } | null>(null);

  async function handleRegister() {
    if (isSubmitting) return;
    if (!form.validateAll()) return;
    setIsSubmitting(true);
    setRegError(null);

    try {
      const res = await fetch("/api/dashboard/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          owner_name: form.ownerName.trim(),
          owner_real_name: form.ownerRealName.trim() || null,
          category: form.category,
          area: form.area || form.addrCity.trim(),
          description: form.description.trim() || null,
          address: form.fullAddress,
          address_prefecture: form.addrPref || null,
          address_city: form.addrCity.trim() || null,
          address_street: form.addrStreet.trim() || null,
          address_building: form.addrBuilding.trim() || null,
          phone: form.fullPhone,
          hours: form.hoursJson,
          holidays: form.holidaysJson,
          tabelog_url: form.tabelogUrl.trim() || null,
          gmb_url: form.gmbUrl.trim() || null,
          homepage_url: form.homepageUrl.trim() || null,
          nearest_station: geoData?.station || form.area || null,
          latitude: geoData?.lat || null,
          longitude: geoData?.lng || null,
          walking_minutes: geoData?.walkMinutes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setRegError(data.error ?? "登録に失敗しました");
        setIsSubmitting(false);
        return;
      }

      const data = await res.json();
      toast.success("店舗を登録しました！");
      onCreated(data.shop as ShopData);
    } catch {
      setRegError("ネットワークエラーが発生しました");
    }
    setIsSubmitting(false);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ヘッダー */}
      <div className="text-center py-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">お店を登録しましょう</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          お店の基本情報を入力してください。
          <br />
          あとからいつでも変更できます。
        </p>
      </div>

      {/* 写真登録の案内 */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-700">
          店舗写真はAIインタビュー後に「写真撮影」タブから登録できます
        </p>
      </div>

      {regError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">{regError}</p>
        </div>
      )}

      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Store className="h-4 w-4 text-primary" />
            基本情報
            <Badge variant="secondary" className="text-[10px]">必須</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="reg-name">
              店舗名 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="reg-name"
              value={form.name}
              onChange={(e) => form.setName(e.target.value)}
              placeholder="例: 鶏白湯そば とりの"
              className={form.fieldErrors.name ? "border-red-300" : ""}
            />
            {form.fieldErrors.name && (
              <p className="text-xs text-red-500">{form.fieldErrors.name}</p>
            )}
          </div>

          {/* オーナー情報 */}
          <div className="space-y-4 rounded-lg border border-dashed border-primary/20 bg-primary/5 p-4">
            <p className="text-xs font-medium text-primary">オーナー情報</p>

            <div className="space-y-2">
              <Label htmlFor="reg-owner">
                ニックネーム（公開名） <span className="text-destructive">*</span>
              </Label>
              <Input
                id="reg-owner"
                value={form.ownerName}
                onChange={(e) => form.setOwnerName(e.target.value)}
                placeholder="例: 太郎さん、タロウ、Taro"
                className={form.fieldErrors.ownerName ? "border-red-300" : ""}
              />
              <p className="text-[11px] text-muted-foreground">
                お店のページに表示される名前です。本名でもOKです。
              </p>
              {form.fieldErrors.ownerName && (
                <p className="text-xs text-red-500">{form.fieldErrors.ownerName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-real-name">本名（非公開）</Label>
              <Input
                id="reg-real-name"
                value={form.ownerRealName}
                onChange={(e) => form.setOwnerRealName(e.target.value)}
                placeholder="例: 田中 太郎"
              />
              <p className="text-[11px] text-muted-foreground">
                運営管理用です。一般には公開されません。
              </p>
            </div>
          </div>

          {/* カテゴリー */}
          <div className="space-y-2">
            <Label>
              カテゴリー <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.category}
              onValueChange={form.setCategory}
            >
              <SelectTrigger
                className={`w-full ${form.fieldErrors.category ? "border-red-300" : ""}`}
              >
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.fieldErrors.category && (
              <p className="text-xs text-red-500">{form.fieldErrors.category}</p>
            )}
          </div>

          {/* 紹介文 */}
          <div className="space-y-2">
            <Label htmlFor="reg-description">お店の紹介文</Label>
            <Textarea
              id="reg-description"
              value={form.description}
              onChange={(e) => form.setDescription(e.target.value)}
              placeholder="お店を一言で表すフレーズ（任意）"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* アクセス・営業情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-primary" />
            アクセス・営業情報
            <Badge variant="secondary" className="text-[10px]">必須</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* 住所 */}
          <AddressFields
            prefecture={form.addrPref}
            city={form.addrCity}
            street={form.addrStreet}
            building={form.addrBuilding}
            onChange={form.handleAddressChange}
            errors={form.fieldErrors}
          />

          {/* 最寄り駅検出 */}
          <NearestStationDetector
            fullAddress={form.fullAddress}
            detectedStation={form.area}
            onStationDetected={form.setArea}
            onGeoDetected={setGeoData}
          />

          {/* 電話番号 */}
          <PhoneFields
            parts={form.phoneParts}
            onChange={form.handlePhoneChange}
            error={form.fieldErrors.phone}
          />

          {/* 営業時間 */}
          <BusinessHoursFields
            hoursData={form.hoursData}
            onChange={form.setHoursData}
            error={form.fieldErrors.hours}
          />

          {/* 定休日 */}
          <HolidayFields
            holidaysData={form.holidaysData}
            onChange={form.setHolidaysData}
            error={form.fieldErrors.holidays}
          />
        </CardContent>
      </Card>

      {/* 外部ページ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 text-primary" />
            外部ページ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            各種外部ページのURLを登録すると、お店のページからリンクされます（任意）
          </p>

          <div className="space-y-2">
            <Label htmlFor="reg-tabelog">食べログ</Label>
            <Input
              id="reg-tabelog"
              value={form.tabelogUrl}
              onChange={(e) => form.setTabelogUrl(e.target.value)}
              placeholder="https://tabelog.com/..."
              className={form.fieldErrors.tabelogUrl ? "border-red-300" : ""}
            />
            {form.fieldErrors.tabelogUrl && (
              <p className="text-xs text-red-500">{form.fieldErrors.tabelogUrl}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reg-gmb">Google マップ / GMB</Label>
            <Input
              id="reg-gmb"
              value={form.gmbUrl}
              onChange={(e) => form.setGmbUrl(e.target.value)}
              placeholder="https://maps.google.com/..."
              className={form.fieldErrors.gmbUrl ? "border-red-300" : ""}
            />
            {form.fieldErrors.gmbUrl && (
              <p className="text-xs text-red-500">{form.fieldErrors.gmbUrl}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reg-homepage">ホームページ</Label>
            <Input
              id="reg-homepage"
              value={form.homepageUrl}
              onChange={(e) => form.setHomepageUrl(e.target.value)}
              placeholder="https://www.example.com"
              className={form.fieldErrors.homepageUrl ? "border-red-300" : ""}
            />
            {form.fieldErrors.homepageUrl && (
              <p className="text-xs text-red-500">{form.fieldErrors.homepageUrl}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 登録ボタン */}
      <Button
        size="lg"
        className="w-full gap-2"
        onClick={handleRegister}
        disabled={!form.canSubmit || isSubmitting}
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ArrowRight className="h-4 w-4" />
        )}
        {isSubmitting ? "登録中..." : "お店を登録する"}
      </Button>
    </div>
  );
}

// ────────────────────────────────────────────
// メインページ（既存店舗の編集 + 新規登録の振り分け）
// ────────────────────────────────────────────
export default function ShopInfoPage() {
  const [shop, setShop] = useState<ShopData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 編集用のフォーム状態は shop がロードされてから初期化する
  const [formReady, setFormReady] = useState(false);
  const [editFormInitial, setEditFormInitial] = useState<Parameters<typeof useShopForm>[0] | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/dashboard/shop");
        if (!res.ok) {
          setError(
            res.status === 401
              ? "ログインが必要です"
              : "データの読み込みに失敗しました"
          );
          setIsLoading(false);
          return;
        }
        const data = await res.json();
        if (data.shop) {
          const s = data.shop as ShopData;
          setShop(s);

          // 既存データを構造化フォーム用に解析
          const parsedAddr = parseAddress(s.address);
          const parsedPhone = parsePhone(s.phone);
          const parsedHours = parseHours(s.hours);
          const parsedHolidays = parseHolidays(s.holidays);

          setEditFormInitial({
            name: s.name ?? "",
            ownerName: s.owner_name ?? "",
            ownerRealName: s.owner_real_name ?? "",
            category: s.category ?? "",
            area: s.area ?? "",
            description: s.description ?? "",
            addressPrefecture: parsedAddr.prefecture,
            addressCity: parsedAddr.city,
            addressStreet: parsedAddr.street,
            addressBuilding: parsedAddr.building,
            phoneParts: parsedPhone,
            hoursData: parsedHours,
            holidaysData: parsedHolidays,
            tabelogUrl: s.tabelog_url ?? "",
            gmbUrl: s.gmb_url ?? "",
            homepageUrl: s.homepage_url ?? "",
          });
          setFormReady(true);
        }
      } catch {
        setError("ネットワークエラーが発生しました");
      }
      setIsLoading(false);
    }
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !shop) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!shop) {
    return (
      <ShopRegistrationForm
        onCreated={(s) => {
          setShop(s);
          const parsedAddr = parseAddress(s.address);
          const parsedPhone = parsePhone(s.phone);
          const parsedHours = parseHours(s.hours);
          const parsedHolidays = parseHolidays(s.holidays);
          setEditFormInitial({
            name: s.name ?? "",
            ownerName: s.owner_name ?? "",
            ownerRealName: s.owner_real_name ?? "",
            category: s.category ?? "",
            area: s.area ?? "",
            description: s.description ?? "",
            addressPrefecture: parsedAddr.prefecture,
            addressCity: parsedAddr.city,
            addressStreet: parsedAddr.street,
            addressBuilding: parsedAddr.building,
            phoneParts: parsedPhone,
            hoursData: parsedHours,
            holidaysData: parsedHolidays,
            tabelogUrl: s.tabelog_url ?? "",
            gmbUrl: s.gmb_url ?? "",
            homepageUrl: s.homepage_url ?? "",
          });
          setFormReady(true);
        }}
      />
    );
  }

  if (!formReady || !editFormInitial) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ShopEditForm
      shop={shop}
      initialValues={editFormInitial}
      error={error}
      setError={setError}
      isSaving={isSaving}
      setIsSaving={setIsSaving}
      saved={saved}
      setSaved={setSaved}
      onShopUpdated={setShop}
    />
  );
}

// ────────────────────────────────────────────
// 編集フォーム（既存店舗用）
// ────────────────────────────────────────────
function ShopEditForm({
  shop,
  initialValues,
  error,
  setError,
  isSaving,
  setIsSaving,
  saved,
  setSaved,
  onShopUpdated,
}: {
  shop: ShopData;
  initialValues: Parameters<typeof useShopForm>[0];
  error: string | null;
  setError: (e: string | null) => void;
  isSaving: boolean;
  setIsSaving: (v: boolean) => void;
  saved: boolean;
  setSaved: (v: boolean) => void;
  onShopUpdated: (s: ShopData) => void;
}) {
  const form = useShopForm(initialValues);
  const [geoData, setGeoData] = useState<{ lat: number; lng: number; station: string; walkMinutes: number } | null>(null);

  async function handleSave() {
    if (isSaving) return;
    if (!form.validateAll()) {
      toast.error("入力内容に不備があります。赤い項目を確認してください。");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/shop", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_id: shop.id,
          name: form.name.trim(),
          owner_name: form.ownerName.trim(),
          owner_real_name: form.ownerRealName.trim() || null,
          category: form.category,
          area: form.area || form.addrCity.trim(),
          description: form.description.trim() || null,
          address: form.fullAddress || null,
          address_prefecture: form.addrPref || null,
          address_city: form.addrCity.trim() || null,
          address_street: form.addrStreet.trim() || null,
          address_building: form.addrBuilding.trim() || null,
          phone: form.fullPhone || null,
          hours: form.hoursJson || null,
          holidays: form.holidaysJson || null,
          tabelog_url: form.tabelogUrl.trim() || null,
          gmb_url: form.gmbUrl.trim() || null,
          homepage_url: form.homepageUrl.trim() || null,
          nearest_station: geoData?.station || form.area || null,
          latitude: geoData?.lat || null,
          longitude: geoData?.lng || null,
          walking_minutes: geoData?.walkMinutes || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(
          data.error ?? "保存に失敗しました。もう一度お試しください。"
        );
        setIsSaving(false);
        return;
      }
      const data = await res.json();
      onShopUpdated(data.shop as ShopData);
      setSaved(true);
      toast.success("保存しました！");
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("ネットワークエラーが発生しました");
    }
    setIsSaving(false);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ページタイトル */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">店舗情報</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            お店の基本情報を編集できます
          </p>
        </div>
        <Button className="gap-2" onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saved ? "保存しました！" : "保存する"}
        </Button>
      </div>

      {/* 写真登録の案内 */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-700">
          店舗写真はAIインタビュー後に「写真撮影」タブから登録できます
        </p>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* カバー画像 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Camera className="h-4 w-4 text-primary" />
            カバー画像
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-border bg-warm">
            {shop.image_url ? (
              <p className="text-sm text-muted-foreground">画像設定済み</p>
            ) : (
              <div className="text-center">
                <Camera className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <p className="mt-2 text-sm text-muted-foreground">
                  クリックまたはドラッグで画像をアップロード
                </p>
                <p className="text-xs text-muted-foreground">
                  推奨サイズ: 1200 x 400px
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Store className="h-4 w-4 text-primary" />
            基本情報
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="shop-name">
              店舗名 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="shop-name"
              value={form.name}
              onChange={(e) => form.setName(e.target.value)}
              className={form.fieldErrors.name ? "border-red-300" : ""}
            />
            {form.fieldErrors.name && (
              <p className="text-xs text-red-500">{form.fieldErrors.name}</p>
            )}
          </div>

          {/* オーナー情報 */}
          <div className="space-y-4 rounded-lg border border-dashed border-primary/20 bg-primary/5 p-4">
            <p className="text-xs font-medium text-primary">オーナー情報</p>

            <div className="space-y-2">
              <Label htmlFor="owner-nickname">
                ニックネーム（公開名） <span className="text-destructive">*</span>
              </Label>
              <Input
                id="owner-nickname"
                value={form.ownerName}
                onChange={(e) => form.setOwnerName(e.target.value)}
                className={form.fieldErrors.ownerName ? "border-red-300" : ""}
              />
              <p className="text-[11px] text-muted-foreground">
                お客様に表示される名前です
              </p>
              {form.fieldErrors.ownerName && (
                <p className="text-xs text-red-500">{form.fieldErrors.ownerName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner-real-name">本名（非公開）</Label>
              <Input
                id="owner-real-name"
                value={form.ownerRealName}
                onChange={(e) => form.setOwnerRealName(e.target.value)}
                placeholder="例: 田中 太郎"
              />
              <p className="text-[11px] text-muted-foreground">
                運営管理用です。一般には公開されません。
              </p>
            </div>
          </div>

          {/* カテゴリー */}
          <div className="space-y-2">
            <Label>
              カテゴリー <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.category}
              onValueChange={form.setCategory}
            >
              <SelectTrigger
                className={`w-full ${form.fieldErrors.category ? "border-red-300" : ""}`}
              >
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.fieldErrors.category && (
              <p className="text-xs text-red-500">{form.fieldErrors.category}</p>
            )}
          </div>

          {/* 紹介文 */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">お店の紹介文</Label>
            <Textarea
              id="edit-description"
              value={form.description}
              onChange={(e) => form.setDescription(e.target.value)}
              placeholder="お店を一言で表すフレーズ"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* アクセス情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-primary" />
            アクセス情報
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* 住所 */}
          <AddressFields
            prefecture={form.addrPref}
            city={form.addrCity}
            street={form.addrStreet}
            building={form.addrBuilding}
            onChange={form.handleAddressChange}
            errors={form.fieldErrors}
          />

          {/* 最寄り駅検出 */}
          <NearestStationDetector
            fullAddress={form.fullAddress}
            detectedStation={form.area}
            onStationDetected={form.setArea}
            onGeoDetected={setGeoData}
          />
        </CardContent>
      </Card>

      {/* 営業情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-primary" />
            営業情報
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* 営業時間 */}
          <BusinessHoursFields
            hoursData={form.hoursData}
            onChange={form.setHoursData}
            error={form.fieldErrors.hours}
          />

          {/* 定休日 */}
          <HolidayFields
            holidaysData={form.holidaysData}
            onChange={form.setHolidaysData}
            error={form.fieldErrors.holidays}
          />
        </CardContent>
      </Card>

      {/* 連絡先 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-4 w-4 text-primary" />
            連絡先
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <PhoneFields
            parts={form.phoneParts}
            onChange={form.handlePhoneChange}
            error={form.fieldErrors.phone}
          />
        </CardContent>
      </Card>

      {/* 外部ページ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 text-primary" />
            外部ページ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            各種外部ページのURLを登録すると、お店のページからリンクされます（任意）
          </p>

          <div className="space-y-2">
            <Label htmlFor="edit-tabelog">食べログ</Label>
            <Input
              id="edit-tabelog"
              value={form.tabelogUrl}
              onChange={(e) => form.setTabelogUrl(e.target.value)}
              placeholder="https://tabelog.com/..."
              className={form.fieldErrors.tabelogUrl ? "border-red-300" : ""}
            />
            {form.fieldErrors.tabelogUrl && (
              <p className="text-xs text-red-500">{form.fieldErrors.tabelogUrl}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-gmb">Google マップ / GMB</Label>
            <Input
              id="edit-gmb"
              value={form.gmbUrl}
              onChange={(e) => form.setGmbUrl(e.target.value)}
              placeholder="https://maps.google.com/..."
              className={form.fieldErrors.gmbUrl ? "border-red-300" : ""}
            />
            {form.fieldErrors.gmbUrl && (
              <p className="text-xs text-red-500">{form.fieldErrors.gmbUrl}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-homepage">ホームページ</Label>
            <Input
              id="edit-homepage"
              value={form.homepageUrl}
              onChange={(e) => form.setHomepageUrl(e.target.value)}
              placeholder="https://www.example.com"
              className={form.fieldErrors.homepageUrl ? "border-red-300" : ""}
            />
            {form.fieldErrors.homepageUrl && (
              <p className="text-xs text-red-500">{form.fieldErrors.homepageUrl}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 公開ステータス */}
      <Card className="border-primary/20">
        <CardContent className="flex items-center justify-between pt-6">
          <div>
            <h2 className="font-semibold">公開ステータス</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {shop.is_published
                ? "お店のページが一般公開されています"
                : "お店のページは非公開です"}
            </p>
          </div>
          <Badge variant={shop.is_published ? "default" : "secondary"}>
            {shop.is_published ? "公開中" : "非公開"}
          </Badge>
        </CardContent>
      </Card>

      {/* 下部保存ボタン */}
      <Button
        className="w-full gap-2"
        onClick={handleSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : saved ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {saved ? "保存しました！" : "変更を保存する"}
      </Button>
    </div>
  );
}
