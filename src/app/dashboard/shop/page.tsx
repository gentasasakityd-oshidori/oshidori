"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
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
  ArrowLeft,
  Globe,
  Info,
  Search,
  Train,
  Mail,
  Instagram,
  MessageCircle,
  Wallet,
  Users,
  Car,
  Cigarette,
  CalendarDays,
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
import { PREFECTURES, CATEGORIES, PAYMENT_METHODS, SMOKING_POLICIES, PRIVATE_ROOM_OPTIONS } from "@/lib/constants";
import { toast } from "sonner";

// ────────────────────────────────────────────
// 型定義
// ────────────────────────────────────────────
type ShopData = {
  id: string;
  name: string;
  owner_name: string;
  owner_real_name: string | null;
  owner_real_name_sei?: string | null;
  owner_real_name_mei?: string | null;
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
  website_url?: string | null;
  instagram_url?: string | null;
  x_url?: string | null;
  line_url?: string | null;
  // 詳細情報（オプション）
  budget_lunch?: string | null;
  budget_dinner?: string | null;
  payment_methods?: string[] | null;
  service_charge?: string | null;
  total_seats?: number | null;
  private_rooms?: string | null;
  rental_available?: boolean | null;
  smoking_policy?: string | null;
  parking?: string | null;
  opening_date?: string | null;
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

  const prefMatch = address.match(
    /^(北海道|東京都|(?:京都|大阪)府|.{2,3}県)/
  );
  if (prefMatch) {
    result.prefecture = prefMatch[1];
    const rest = address.slice(prefMatch[1].length);
    const cityMatch = rest.match(
      /^(.+?(?:市|区|町|村|郡.+?(?:町|村)))/
    );
    if (cityMatch) {
      result.city = cityMatch[1];
      const afterCity = rest.slice(cityMatch[1].length);
      const buildingMatch = afterCity.match(/\s+(.+)$/);
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
    result.prefecture = "東京都";
    result.street = address;
  }

  return result;
}

/** 既存の phone 文字列を3分割 */
function parsePhone(phone: string | null): [string, string, string] {
  if (!phone) return ["", "", ""];
  const cleaned = phone.replace(/[\s（）()ー−]/g, "");
  const parts = cleaned.split("-");
  if (parts.length >= 3) {
    return [parts[0], parts[1], parts.slice(2).join("")];
  }
  const digits = cleaned.replace(/-/g, "");
  if (digits.startsWith("03") || digits.startsWith("06")) {
    return [digits.slice(0, 2), digits.slice(2, 6), digits.slice(6)];
  }
  if (digits.startsWith("0120")) {
    return [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6)];
  }
  if (digits.startsWith("0")) {
    return [digits.slice(0, 3), digits.slice(3, 7), digits.slice(7)];
  }
  return [digits, "", ""];
}

/** 既存の hours を HoursData に解析 */
function parseHours(hours: unknown): HoursData {
  const defaultData: HoursData = { periods: [], note: "" };
  if (!hours) return defaultData;

  if (typeof hours === "object" && hours !== null) {
    const h = hours as Record<string, unknown>;
    if (Array.isArray(h.periods)) {
      return { periods: h.periods as HoursData["periods"], note: (h.note as string) || "" };
    }
  }

  if (typeof hours === "string") {
    const str = hours.trim();
    try {
      const parsed = JSON.parse(str);
      if (parsed && Array.isArray(parsed.periods)) {
        return { periods: parsed.periods, note: parsed.note || "" };
      }
    } catch { /* テキストとして扱う */ }

    const periods: HoursData["periods"] = [];
    const segments = str.split(/[/／]/).map((s) => s.trim());
    for (let i = 0; i < segments.length; i++) {
      const timeMatch = segments[i].match(/(\d{1,2}:\d{2})\s*[〜~ー−\-]\s*(\d{1,2}:\d{2})/);
      if (timeMatch) {
        periods.push({
          label: i === 0 ? "ランチ" : "ディナー",
          open: timeMatch[1].padStart(5, "0"),
          close: timeMatch[2].padStart(5, "0"),
        });
      }
    }
    if (periods.length > 0) return { periods, note: "" };
    return { periods: [], note: str };
  }

  return defaultData;
}

/** 既存の holidays を HolidaysData に解析 */
function parseHolidays(holidays: string | null): HolidaysData {
  const defaultData: HolidaysData = { type: "regular", closed_days: [], note: "" };
  if (!holidays) return defaultData;

  try {
    const parsed = JSON.parse(holidays);
    if (parsed && typeof parsed === "object" && parsed.type) {
      return { type: parsed.type, closed_days: parsed.closed_days || [], note: parsed.note || "" };
    }
  } catch { /* パースに失敗 */ }

  if (holidays === "不定休") return { type: "irregular", closed_days: [], note: "" };
  if (holidays === "年中無休") return { type: "always_open", closed_days: [], note: "" };

  const closedDays: string[] = [];
  for (const day of DAY_LABELS) {
    if (holidays.includes(day)) closedDays.push(day);
  }
  if (closedDays.length > 0) return { type: "regular", closed_days: closedDays, note: "" };
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
// 郵便番号から住所自動入力
// ────────────────────────────────────────────
function ZipcodeField({
  onAddressFound,
}: {
  onAddressFound: (data: { prefecture: string; city: string; street: string }) => void;
}) {
  const [zipcode, setZipcode] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);

  async function searchZipcode(code: string) {
    const digits = code.replace(/[^\d]/g, "");
    if (digits.length !== 7) {
      setZipError("郵便番号は7桁で入力してください");
      return;
    }
    setIsSearching(true);
    setZipError(null);
    try {
      const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${digits}`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const r = data.results[0];
        onAddressFound({
          prefecture: r.address1,
          city: r.address2,
          street: r.address3 || "",
        });
        toast.success("住所を自動入力しました");
      } else {
        setZipError("該当する住所が見つかりませんでした");
      }
    } catch {
      setZipError("住所の検索に失敗しました");
    }
    setIsSearching(false);
  }

  function handleChange(value: string) {
    // 数字とハイフンのみ
    const cleaned = value.replace(/[^\d-]/g, "");
    setZipcode(cleaned);
    // 7桁入力で自動検索
    const digits = cleaned.replace(/-/g, "");
    if (digits.length === 7) {
      searchZipcode(digits);
    }
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground">
        郵便番号（入力で住所を自動補完）
      </label>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">〒</span>
        <Input
          value={zipcode}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="000-0000"
          maxLength={8}
          inputMode="numeric"
          className="w-32"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => searchZipcode(zipcode)}
          disabled={isSearching}
        >
          {isSearching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
        </Button>
      </div>
      {zipError && <p className="text-xs text-red-500">{zipError}</p>}
    </div>
  );
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
  function handleZipcodeResult(data: { prefecture: string; city: string; street: string }) {
    if (data.prefecture) onChange("prefecture", data.prefecture);
    if (data.city) onChange("city", data.city);
    if (data.street) onChange("street", data.street);
  }

  return (
    <div className="space-y-3">
      <Label>
        住所 <span className="text-destructive">*</span>
      </Label>

      {/* 郵便番号 */}
      <ZipcodeField onAddressFound={handleZipcodeResult} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">
            都道府県 <span className="text-destructive">*</span>
          </label>
          <Select value={prefecture} onValueChange={(v) => onChange("prefecture", v)}>
            <SelectTrigger className={`w-full ${errors.prefecture ? "border-red-300" : ""}`}>
              <SelectValue placeholder="都道府県を選択" />
            </SelectTrigger>
            <SelectContent>
              {PREFECTURES.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.prefecture && <p className="text-xs text-red-500">{errors.prefecture}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">
            市区町村 <span className="text-destructive">*</span>
          </label>
          <Input
            value={city}
            onChange={(e) => onChange("city", e.target.value)}
            placeholder="例: おしどり市"
            className={errors.city ? "border-red-300" : ""}
          />
          {errors.city && <p className="text-xs text-red-500">{errors.city}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">
          町名番地 <span className="text-destructive">*</span>
        </label>
        <Input
          value={street}
          onChange={(e) => onChange("street", e.target.value)}
          placeholder="例: さくら町1-2-3"
          className={errors.street ? "border-red-300" : ""}
        />
        {errors.street && <p className="text-xs text-red-500">{errors.street}</p>}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">建物名（任意）</label>
        <Input
          value={building}
          onChange={(e) => onChange("building", e.target.value)}
          placeholder="例: オシドリビル 2F"
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
    const digits = value.replace(/\D/g, "");
    onChange(index, digits);
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
          placeholder="0000"
          maxLength={4}
          inputMode="tel"
          className={`w-20 text-center ${error ? "border-red-300" : ""}`}
        />
        <span className="text-muted-foreground">-</span>
        <Input
          ref={ref3}
          value={parts[2]}
          onChange={(e) => handleChange(2, e.target.value)}
          placeholder="0000"
          maxLength={4}
          inputMode="tel"
          className={`w-20 text-center ${error ? "border-red-300" : ""}`}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">市外局番 - 市内局番 - 加入者番号</p>
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
    label: "ランチ", open: "11:00", close: "14:30",
  };
  const dinnerPeriod = hoursData.periods.find((p) => p.label === "ディナー") || {
    label: "ディナー", open: "17:00", close: "22:00",
  };

  function togglePeriod(label: string, enabled: boolean) {
    let newPeriods = hoursData.periods.filter((p) => p.label !== label);
    if (enabled) {
      const defaultPeriod = label === "ランチ" ? lunchPeriod : dinnerPeriod;
      newPeriods = [...newPeriods, { label, open: defaultPeriod.open, close: defaultPeriod.close }];
      newPeriods.sort((a) => (a.label === "ランチ" ? -1 : 1));
    }
    onChange({ ...hoursData, periods: newPeriods });
  }

  function updatePeriod(label: string, field: "open" | "close", value: string) {
    const newPeriods = hoursData.periods.map((p) =>
      p.label === label ? { ...p, [field]: value } : p
    );
    onChange({ ...hoursData, periods: newPeriods });
  }

  function renderPeriod(label: string, period: { open: string; close: string }, has: boolean) {
    return (
      <div className="rounded-lg border border-input p-3 space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={has}
            onChange={(e) => togglePeriod(label, e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary accent-[#E06A4E]"
          />
          <span className="text-sm font-medium">{label}営業あり</span>
        </label>
        {has && (
          <div className="flex items-center gap-2 pl-6">
            <Select value={period.open} onValueChange={(v) => updatePeriod(label, "open", v)}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((t) => (<SelectItem key={`${label}-o-${t}`} value={t}>{t}</SelectItem>))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">~</span>
            <Select value={period.close} onValueChange={(v) => updatePeriod(label, "close", v)}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((t) => (<SelectItem key={`${label}-c-${t}`} value={t}>{t}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label>営業時間 <span className="text-destructive">*</span></Label>
      {renderPeriod("ランチ", lunchPeriod, hasLunch)}
      {renderPeriod("ディナー", dinnerPeriod, hasDinner)}
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
    onChange({ ...holidaysData, type, closed_days: type === "regular" ? holidaysData.closed_days : [] });
  }

  function toggleDay(day: string) {
    const days = new Set(holidaysData.closed_days);
    if (days.has(day)) days.delete(day); else days.add(day);
    onChange({ ...holidaysData, closed_days: Array.from(days) });
  }

  return (
    <div className="space-y-3">
      <Label>定休日 <span className="text-destructive">*</span></Label>
      <div className="flex flex-wrap gap-2">
        {([
          { value: "regular", label: "通常定休" },
          { value: "irregular", label: "不定休" },
          { value: "always_open", label: "年中無休" },
        ] as const).map((opt) => (
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
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">その他備考（任意）</label>
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
// 最寄り駅検出コンポーネント（複数選択対応）
// ────────────────────────────────────────────
function NearestStationDetector({
  fullAddress,
  selectedStations,
  onStationsChanged,
  onGeoDetected,
}: {
  fullAddress: string;
  selectedStations: string[];
  onStationsChanged: (stations: string[]) => void;
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
        const detectedStations = data.nearestStations.slice(0, 5) as GeoStation[];
        setStations(detectedStations);
        // 最寄り1駅を自動選択
        const nearest = detectedStations[0];
        onStationsChanged([nearest.station]);
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
  }, [fullAddress, onStationsChanged, onGeoDetected]);

  function toggleStation(stationName: string) {
    if (selectedStations.includes(stationName)) {
      onStationsChanged(selectedStations.filter((s) => s !== stationName));
    } else {
      onStationsChanged([...selectedStations, stationName]);
    }
  }

  return (
    <div className="space-y-2">
      <Label>最寄り駅（複数選択可）</Label>

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

      {geoError && <p className="text-xs text-red-500">{geoError}</p>}

      {stations.length > 0 && (
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-1">
          <p className="text-xs text-muted-foreground mb-2">クリックで選択/解除（複数選択可）</p>
          {stations.map((s, i) => {
            const isSelected = selectedStations.includes(s.station);
            return (
              <button
                key={s.station}
                type="button"
                onClick={() => toggleStation(s.station)}
                className={`flex items-center gap-2 w-full text-left rounded px-2 py-1.5 text-sm transition-colors ${
                  isSelected
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-primary/5 text-muted-foreground"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  readOnly
                  className="h-3.5 w-3.5 rounded accent-[#E06A4E]"
                />
                <Train className="h-3.5 w-3.5 shrink-0" />
                <span>{s.station}駅（徒歩{s.walkMinutes}分）</span>
                {i === 0 && (
                  <Badge variant="secondary" className="text-[10px] ml-auto">最寄り</Badge>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 選択済み駅のバッジ表示 */}
      {selectedStations.length > 0 && stations.length === 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedStations.map((s) => (
            <Badge key={s} variant="secondary" className="gap-1">
              <Train className="h-3 w-3" />
              {s}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────
// 外部URL住所抽出ボタン
// ────────────────────────────────────────────
function ExtractAddressButton({
  url,
  onAddressFound,
}: {
  url: string;
  onAddressFound: (data: { prefecture: string; city: string; street: string }) => void;
}) {
  const [isExtracting, setIsExtracting] = useState(false);

  async function handleExtract() {
    if (!url.trim()) return;
    setIsExtracting(true);
    try {
      const res = await fetch("/api/dashboard/shop/extract-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.prefecture) {
        onAddressFound({
          prefecture: data.prefecture,
          city: data.city || "",
          street: data.street || "",
        });
        toast.success("住所情報を取得しました");
      } else {
        toast.error(data.error || "住所を取得できませんでした");
      }
    } catch {
      toast.error("住所の取得に失敗しました");
    }
    setIsExtracting(false);
  }

  if (!url.trim()) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleExtract}
      disabled={isExtracting}
      className="text-xs text-primary gap-1"
    >
      {isExtracting ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
      住所を取得
    </Button>
  );
}

// ────────────────────────────────────────────
// 共通フォームフィールド（新規・編集共用）
// ────────────────────────────────────────────
function useShopForm(initial: {
  name: string;
  ownerName: string;
  ownerRealNameSei: string;
  ownerRealNameMei: string;
  category: string;
  area: string;
  selectedStations: string[];
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
  instagramUrl: string;
  xUrl: string;
  lineUrl: string;
  // 詳細情報（オプション）
  budgetLunch: string;
  budgetDinner: string;
  paymentMethods: string[];
  serviceCharge: string;
  totalSeats: string;
  privateRooms: string;
  rentalAvailable: boolean;
  smokingPolicy: string;
  parking: string;
  openingDate: string;
}) {
  const [name, setName] = useState(initial.name);
  const [ownerName, setOwnerName] = useState(initial.ownerName);
  const [ownerRealNameSei, setOwnerRealNameSei] = useState(initial.ownerRealNameSei);
  const [ownerRealNameMei, setOwnerRealNameMei] = useState(initial.ownerRealNameMei);
  const [category, setCategory] = useState(initial.category);
  const [area, setArea] = useState(initial.area);
  const [selectedStations, setSelectedStations] = useState<string[]>(initial.selectedStations);
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
  const [instagramUrl, setInstagramUrl] = useState(initial.instagramUrl);
  const [xUrl, setXUrl] = useState(initial.xUrl);
  const [lineUrl, setLineUrl] = useState(initial.lineUrl);
  // 詳細情報（オプション）
  const [budgetLunch, setBudgetLunch] = useState(initial.budgetLunch);
  const [budgetDinner, setBudgetDinner] = useState(initial.budgetDinner);
  const [paymentMethods, setPaymentMethods] = useState<string[]>(initial.paymentMethods);
  const [serviceCharge, setServiceCharge] = useState(initial.serviceCharge);
  const [totalSeats, setTotalSeats] = useState(initial.totalSeats);
  const [privateRooms, setPrivateRooms] = useState(initial.privateRooms);
  const [rentalAvailable, setRentalAvailable] = useState(initial.rentalAvailable);
  const [smokingPolicy, setSmokingPolicy] = useState(initial.smokingPolicy);
  const [parking, setParking] = useState(initial.parking);
  const [openingDate, setOpeningDate] = useState(initial.openingDate);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const fullAddress = [addrPref, addrCity, addrStreet, addrBuilding]
    .map((s) => s.trim())
    .filter(Boolean)
    .join("");

  const fullPhone = phoneParts.filter(Boolean).join("-");

  const hoursJson = JSON.stringify({
    periods: hoursData.periods.map((p) => ({ label: p.label, open: p.open, close: p.close })),
    note: hoursData.note,
  });

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

  function handleExternalAddressFound(data: { prefecture: string; city: string; street: string }) {
    if (data.prefecture) setAddrPref(data.prefecture);
    if (data.city) setAddrCity(data.city);
    if (data.street) setAddrStreet(data.street);
  }

  function validateAll(): boolean {
    const errors: Record<string, string> = {};

    if (!name.trim()) errors.name = "店舗名を入力してください";
    if (!ownerName.trim()) errors.ownerName = "ニックネームを入力してください";
    if (!category) errors.category = "カテゴリーを選択してください";
    if (!addrPref) errors.prefecture = "都道府県を選択してください";
    if (!addrCity.trim()) errors.city = "市区町村を入力してください";
    if (!addrStreet.trim()) errors.street = "町名番地を入力してください";

    if (!phoneParts[0] || !phoneParts[1] || !phoneParts[2]) {
      errors.phone = "電話番号を入力してください";
    } else {
      const digits = phoneParts.join("");
      if (!/^0\d{9,10}$/.test(digits)) {
        errors.phone = "電話番号は0から始まる10~11桁で入力してください";
      }
    }

    if (hoursData.periods.length === 0) {
      errors.hours = "ランチまたはディナーの営業時間を1つ以上設定してください";
    }

    if (holidaysData.type === "regular" && holidaysData.closed_days.length === 0) {
      errors.holidays = "定休日の曜日を1つ以上選択してください";
    }

    const tabelogErr = validateUrl(tabelogUrl);
    if (tabelogErr) errors.tabelogUrl = tabelogErr;
    const gmbErr = validateUrl(gmbUrl);
    if (gmbErr) errors.gmbUrl = gmbErr;
    const hpErr = validateUrl(homepageUrl);
    if (hpErr) errors.homepageUrl = hpErr;
    const igErr = validateUrl(instagramUrl);
    if (igErr) errors.instagramUrl = igErr;
    const xErr = validateUrl(xUrl);
    if (xErr) errors.xUrl = xErr;
    const lineErr = validateUrl(lineUrl);
    if (lineErr) errors.lineUrl = lineErr;

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
    ownerRealNameSei, setOwnerRealNameSei,
    ownerRealNameMei, setOwnerRealNameMei,
    category, setCategory,
    area, setArea,
    selectedStations, setSelectedStations,
    description, setDescription,
    addrPref, addrCity, addrStreet, addrBuilding,
    handleAddressChange,
    phoneParts, handlePhoneChange,
    hoursData, setHoursData,
    holidaysData, setHolidaysData,
    tabelogUrl, setTabelogUrl,
    gmbUrl, setGmbUrl,
    homepageUrl, setHomepageUrl,
    instagramUrl, setInstagramUrl,
    xUrl, setXUrl,
    lineUrl, setLineUrl,
    budgetLunch, setBudgetLunch,
    budgetDinner, setBudgetDinner,
    paymentMethods, setPaymentMethods,
    serviceCharge, setServiceCharge,
    totalSeats, setTotalSeats,
    privateRooms, setPrivateRooms,
    rentalAvailable, setRentalAvailable,
    smokingPolicy, setSmokingPolicy,
    parking, setParking,
    openingDate, setOpeningDate,
    fieldErrors, setFieldErrors,
    fullAddress, fullPhone, hoursJson, holidaysJson,
    validateAll,
    canSubmit,
    handleExternalAddressFound,
  };
}

// ────────────────────────────────────────────
// フォーム → API送信用データ変換
// ────────────────────────────────────────────
function buildSubmitData(
  form: ReturnType<typeof useShopForm>,
  geoData: { lat: number; lng: number; station: string; walkMinutes: number } | null,
) {
  return {
    name: form.name.trim(),
    owner_name: form.ownerName.trim(),
    owner_real_name_sei: form.ownerRealNameSei.trim() || null,
    owner_real_name_mei: form.ownerRealNameMei.trim() || null,
    category: form.category,
    area: form.selectedStations.join(",") || form.area || form.addrCity.trim(),
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
    instagram_url: form.instagramUrl.trim() || null,
    x_url: form.xUrl.trim() || null,
    line_url: form.lineUrl.trim() || null,
    nearest_station: form.selectedStations.join(",") || geoData?.station || form.area || null,
    latitude: geoData?.lat || null,
    longitude: geoData?.lng || null,
    walking_minutes: geoData?.walkMinutes || null,
    // 詳細情報（オプション）
    budget_lunch: form.budgetLunch.trim() || null,
    budget_dinner: form.budgetDinner.trim() || null,
    payment_methods: form.paymentMethods.length > 0 ? form.paymentMethods : null,
    service_charge: form.serviceCharge.trim() || null,
    total_seats: form.totalSeats ? parseInt(form.totalSeats, 10) || null : null,
    private_rooms: form.privateRooms || null,
    rental_available: form.rentalAvailable,
    smoking_policy: form.smokingPolicy || null,
    parking: form.parking.trim() || null,
    opening_date: form.openingDate.trim() || null,
  };
}

// ────────────────────────────────────────────
// 店舗詳細情報（オプション）フィールド
// ────────────────────────────────────────────
function ShopDetailFields({
  form,
}: {
  form: ReturnType<typeof useShopForm>;
}) {
  function togglePaymentMethod(method: string) {
    if (form.paymentMethods.includes(method)) {
      form.setPaymentMethods(form.paymentMethods.filter((m) => m !== method));
    } else {
      form.setPaymentMethods([...form.paymentMethods, method]);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Info className="h-4 w-4 text-primary" />
          店舗詳細情報
          <Badge variant="secondary" className="text-[10px]">任意</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-xs text-muted-foreground">
          お客様がお店を探すときの参考になります。後からいつでも変更できます。
        </p>

        {/* 予算 */}
        <div className="space-y-3">
          <Label className="flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5" />
            予算（税込目安）
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">ランチ</label>
              <Input
                value={form.budgetLunch}
                onChange={(e) => form.setBudgetLunch(e.target.value)}
                placeholder="例: 1,000〜1,500円"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">ディナー</label>
              <Input
                value={form.budgetDinner}
                onChange={(e) => form.setBudgetDinner(e.target.value)}
                placeholder="例: 3,000〜5,000円"
              />
            </div>
          </div>
        </div>

        {/* 支払い方法 */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5" />
            支払い方法
          </Label>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHODS.map((method) => {
              const isSelected = form.paymentMethods.includes(method);
              return (
                <button
                  key={method}
                  type="button"
                  onClick={() => togglePaymentMethod(method)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    isSelected
                      ? "border-primary bg-primary text-white"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {method}
                </button>
              );
            })}
          </div>
        </div>

        {/* サービス料 */}
        <div className="space-y-1.5">
          <Label>サービス料</Label>
          <Input
            value={form.serviceCharge}
            onChange={(e) => form.setServiceCharge(e.target.value)}
            placeholder="例: なし / 10% / ランチなし・ディナー10%"
          />
        </div>

        {/* 席数 */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            席数
          </Label>
          <div className="flex items-center gap-2">
            <Input
              value={form.totalSeats}
              onChange={(e) => form.setTotalSeats(e.target.value.replace(/\D/g, ""))}
              placeholder="例: 20"
              inputMode="numeric"
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">席</span>
          </div>
        </div>

        {/* 個室 */}
        <div className="space-y-2">
          <Label>個室</Label>
          <div className="flex flex-wrap gap-2">
            {PRIVATE_ROOM_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="private-rooms"
                  checked={form.privateRooms === opt.value}
                  onChange={() => form.setPrivateRooms(opt.value)}
                  className="h-4 w-4 text-primary accent-[#E06A4E]"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 貸切 */}
        <div className="space-y-2">
          <Label>貸切</Label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.rentalAvailable}
              onChange={(e) => form.setRentalAvailable(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary accent-[#E06A4E]"
            />
            <span className="text-sm">貸切対応可能</span>
          </label>
        </div>

        {/* 喫煙 */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Cigarette className="h-3.5 w-3.5" />
            喫煙
          </Label>
          <div className="flex flex-wrap gap-2">
            {SMOKING_POLICIES.map((opt) => (
              <label key={opt.value} className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="smoking-policy"
                  checked={form.smokingPolicy === opt.value}
                  onChange={() => form.setSmokingPolicy(opt.value)}
                  className="h-4 w-4 text-primary accent-[#E06A4E]"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 駐車場 */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <Car className="h-3.5 w-3.5" />
            駐車場
          </Label>
          <Input
            value={form.parking}
            onChange={(e) => form.setParking(e.target.value)}
            placeholder="例: なし / 3台 / 近隣にコインパーキングあり"
          />
        </div>

        {/* 開業日 */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            開業日
          </Label>
          <Input
            value={form.openingDate}
            onChange={(e) => form.setOpeningDate(e.target.value)}
            placeholder="例: 2020年4月 / 2015年"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────
// 外部ページ・SNS フィールド共通
// ────────────────────────────────────────────
function ExternalLinksFields({
  form,
}: {
  form: ReturnType<typeof useShopForm>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe className="h-4 w-4 text-primary" />
          外部ページ・SNS
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          各種ページのURLを登録すると、お店のページからリンクされます（任意）
        </p>

        {/* 食べログ */}
        <div className="space-y-2">
          <Label>食べログ</Label>
          <div className="flex items-center gap-2">
            <Input
              value={form.tabelogUrl}
              onChange={(e) => form.setTabelogUrl(e.target.value)}
              placeholder="https://tabelog.com/..."
              className={`flex-1 ${form.fieldErrors.tabelogUrl ? "border-red-300" : ""}`}
            />
            <ExtractAddressButton url={form.tabelogUrl} onAddressFound={form.handleExternalAddressFound} />
          </div>
          {form.fieldErrors.tabelogUrl && <p className="text-xs text-red-500">{form.fieldErrors.tabelogUrl}</p>}
        </div>

        {/* Google マップ */}
        <div className="space-y-2">
          <Label>Google マップ / GMB</Label>
          <div className="flex items-center gap-2">
            <Input
              value={form.gmbUrl}
              onChange={(e) => form.setGmbUrl(e.target.value)}
              placeholder="https://maps.google.com/..."
              className={`flex-1 ${form.fieldErrors.gmbUrl ? "border-red-300" : ""}`}
            />
            <ExtractAddressButton url={form.gmbUrl} onAddressFound={form.handleExternalAddressFound} />
          </div>
          {form.fieldErrors.gmbUrl && <p className="text-xs text-red-500">{form.fieldErrors.gmbUrl}</p>}
        </div>

        {/* ホームページ */}
        <div className="space-y-2">
          <Label>ホームページ</Label>
          <Input
            value={form.homepageUrl}
            onChange={(e) => form.setHomepageUrl(e.target.value)}
            placeholder="https://www.example.com"
            className={form.fieldErrors.homepageUrl ? "border-red-300" : ""}
          />
          {form.fieldErrors.homepageUrl && <p className="text-xs text-red-500">{form.fieldErrors.homepageUrl}</p>}
        </div>

        {/* SNS セクション */}
        <div className="border-t pt-4 mt-4">
          <p className="text-xs font-medium text-primary mb-3 flex items-center gap-1.5">
            <MessageCircle className="h-3.5 w-3.5" />
            SNS
          </p>

          <div className="space-y-3">
            {/* Instagram */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm">
                <Instagram className="h-3.5 w-3.5" />
                Instagram
              </Label>
              <Input
                value={form.instagramUrl}
                onChange={(e) => form.setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/yourshop"
                className={form.fieldErrors.instagramUrl ? "border-red-300" : ""}
              />
              {form.fieldErrors.instagramUrl && <p className="text-xs text-red-500">{form.fieldErrors.instagramUrl}</p>}
            </div>

            {/* X (Twitter) */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm">
                <Mail className="h-3.5 w-3.5" />
                X (Twitter)
              </Label>
              <Input
                value={form.xUrl}
                onChange={(e) => form.setXUrl(e.target.value)}
                placeholder="https://x.com/yourshop"
                className={form.fieldErrors.xUrl ? "border-red-300" : ""}
              />
              {form.fieldErrors.xUrl && <p className="text-xs text-red-500">{form.fieldErrors.xUrl}</p>}
            </div>

            {/* LINE */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm">
                <MessageCircle className="h-3.5 w-3.5" />
                LINE公式アカウント
              </Label>
              <Input
                value={form.lineUrl}
                onChange={(e) => form.setLineUrl(e.target.value)}
                placeholder="https://line.me/R/ti/p/@yourshop"
                className={form.fieldErrors.lineUrl ? "border-red-300" : ""}
              />
              {form.fieldErrors.lineUrl && <p className="text-xs text-red-500">{form.fieldErrors.lineUrl}</p>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────
// 確認画面コンポーネント
// ────────────────────────────────────────────
function ConfirmationStep({
  form,
  onBack,
  onConfirm,
  isSubmitting,
}: {
  form: ReturnType<typeof useShopForm>;
  onBack: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}) {
  const hoursDisplay = form.hoursData.periods.map((p) => `${p.label} ${p.open}〜${p.close}`).join(" / ");
  const holidaysDisplay =
    form.holidaysData.type === "always_open"
      ? "年中無休"
      : form.holidaysData.type === "irregular"
        ? "不定休"
        : form.holidaysData.closed_days.length > 0
          ? `毎週${form.holidaysData.closed_days.join("・")}曜日`
          : "未設定";

  function Row({ label, value }: { label: string; value: string | null | undefined }) {
    if (!value) return null;
    return (
      <div className="flex gap-3 py-2 border-b border-gray-100 last:border-0">
        <span className="text-sm text-muted-foreground w-28 shrink-0">{label}</span>
        <span className="text-sm font-medium">{value}</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center py-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">登録内容の確認</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          以下の内容で登録します。よろしければ「登録する」を押してください。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Store className="h-4 w-4 text-primary" />
            基本情報
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Row label="店舗名" value={form.name} />
          <Row label="ニックネーム" value={form.ownerName} />
          <Row label="本名（非公開）" value={[form.ownerRealNameSei, form.ownerRealNameMei].filter(Boolean).join(" ") || undefined} />
          <Row label="カテゴリー" value={form.category} />
          <Row label="紹介文" value={form.description || undefined} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            アクセス・営業情報
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Row label="住所" value={form.fullAddress} />
          <Row label="最寄り駅" value={form.selectedStations.length > 0 ? form.selectedStations.map((s) => `${s}駅`).join("、") : undefined} />
          <Row label="電話番号" value={form.fullPhone} />
          <Row label="営業時間" value={hoursDisplay || undefined} />
          {form.hoursData.note && <Row label="営業備考" value={form.hoursData.note} />}
          <Row label="定休日" value={holidaysDisplay} />
          {form.holidaysData.note && <Row label="定休日備考" value={form.holidaysData.note} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            外部ページ・SNS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Row label="食べログ" value={form.tabelogUrl || undefined} />
          <Row label="Google マップ" value={form.gmbUrl || undefined} />
          <Row label="ホームページ" value={form.homepageUrl || undefined} />
          <Row label="Instagram" value={form.instagramUrl || undefined} />
          <Row label="X (Twitter)" value={form.xUrl || undefined} />
          <Row label="LINE" value={form.lineUrl || undefined} />
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" size="lg" className="flex-1 gap-2" onClick={onBack} disabled={isSubmitting}>
          <ArrowLeft className="h-4 w-4" />
          戻って修正する
        </Button>
        <Button size="lg" className="flex-1 gap-2" onClick={onConfirm} disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {isSubmitting ? "登録中..." : "この内容で登録する"}
        </Button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// 新規店舗登録フォーム
// ────────────────────────────────────────────
function ShopRegistrationForm({
  onCreated,
}: {
  onCreated: (shop: ShopData) => void;
}) {
  const router = useRouter();
  const form = useShopForm({
    name: "",
    ownerName: "",
    ownerRealNameSei: "",
    ownerRealNameMei: "",
    category: "",
    area: "",
    selectedStations: [],
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
    instagramUrl: "",
    xUrl: "",
    lineUrl: "",
    budgetLunch: "",
    budgetDinner: "",
    paymentMethods: [],
    serviceCharge: "",
    totalSeats: "",
    privateRooms: "",
    rentalAvailable: false,
    smokingPolicy: "",
    parking: "",
    openingDate: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [geoData, setGeoData] = useState<{ lat: number; lng: number; station: string; walkMinutes: number } | null>(null);
  const [step, setStep] = useState<"form" | "confirm">("form");

  function handleGoToConfirm() {
    if (!form.validateAll()) {
      toast.error("入力内容に不備があります。赤い項目を確認してください。");
      return;
    }
    setStep("confirm");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleRegister() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setRegError(null);

    try {
      const submitData = buildSubmitData(form, geoData);
      const res = await fetch("/api/dashboard/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (!res.ok) {
        const data = await res.json();
        setRegError(data.error ?? "登録に失敗しました");
        setIsSubmitting(false);
        return;
      }

      const data = await res.json();
      toast.success("店舗を登録しました！ ダッシュボードに移動します。");
      onCreated(data.shop as ShopData);
      // ダッシュボードへ遷移
      setTimeout(() => router.push("/dashboard"), 1000);
    } catch {
      setRegError("ネットワークエラーが発生しました");
    }
    setIsSubmitting(false);
  }

  // 確認画面
  if (step === "confirm") {
    return (
      <ConfirmationStep
        form={form}
        onBack={() => {
          setStep("form");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onConfirm={handleRegister}
        isSubmitting={isSubmitting}
      />
    );
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
        <p className="text-sm text-blue-700">店舗写真はAIインタビュー後に「写真撮影」タブから登録できます</p>
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
            <Label htmlFor="reg-name">店舗名 <span className="text-destructive">*</span></Label>
            <Input
              id="reg-name"
              value={form.name}
              onChange={(e) => form.setName(e.target.value)}
              placeholder="例: おしどり食堂"
              className={form.fieldErrors.name ? "border-red-300" : ""}
            />
            {form.fieldErrors.name && <p className="text-xs text-red-500">{form.fieldErrors.name}</p>}
          </div>

          {/* オーナー情報 */}
          <div className="space-y-4 rounded-lg border border-dashed border-primary/20 bg-primary/5 p-4">
            <p className="text-xs font-medium text-primary">オーナー情報</p>

            <div className="space-y-2">
              <Label htmlFor="reg-owner">ニックネーム（公開名） <span className="text-destructive">*</span></Label>
              <Input
                id="reg-owner"
                value={form.ownerName}
                onChange={(e) => form.setOwnerName(e.target.value)}
                placeholder="例: おしどり店長"
                className={form.fieldErrors.ownerName ? "border-red-300" : ""}
              />
              <p className="text-[11px] text-muted-foreground">お店のページに表示される名前です。本名でもOKです。</p>
              {form.fieldErrors.ownerName && <p className="text-xs text-red-500">{form.fieldErrors.ownerName}</p>}
            </div>

            <div className="space-y-2">
              <Label>本名（非公開）</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input
                    value={form.ownerRealNameSei}
                    onChange={(e) => form.setOwnerRealNameSei(e.target.value)}
                    placeholder="例: 推鳥"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">姓</p>
                </div>
                <div>
                  <Input
                    value={form.ownerRealNameMei}
                    onChange={(e) => form.setOwnerRealNameMei(e.target.value)}
                    placeholder="例: 花子"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">名</p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">運営管理用です。一般には公開されません。</p>
            </div>
          </div>

          {/* カテゴリー */}
          <div className="space-y-2">
            <Label>カテゴリー <span className="text-destructive">*</span></Label>
            <Select value={form.category} onValueChange={form.setCategory}>
              <SelectTrigger className={`w-full ${form.fieldErrors.category ? "border-red-300" : ""}`}>
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
              </SelectContent>
            </Select>
            {form.fieldErrors.category && <p className="text-xs text-red-500">{form.fieldErrors.category}</p>}
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
          <AddressFields
            prefecture={form.addrPref}
            city={form.addrCity}
            street={form.addrStreet}
            building={form.addrBuilding}
            onChange={form.handleAddressChange}
            errors={form.fieldErrors}
          />

          <NearestStationDetector
            fullAddress={form.fullAddress}
            selectedStations={form.selectedStations}
            onStationsChanged={form.setSelectedStations}
            onGeoDetected={setGeoData}
          />

          <PhoneFields
            parts={form.phoneParts}
            onChange={form.handlePhoneChange}
            error={form.fieldErrors.phone}
          />

          <BusinessHoursFields
            hoursData={form.hoursData}
            onChange={form.setHoursData}
            error={form.fieldErrors.hours}
          />

          <HolidayFields
            holidaysData={form.holidaysData}
            onChange={form.setHolidaysData}
            error={form.fieldErrors.holidays}
          />
        </CardContent>
      </Card>

      {/* 外部ページ・SNS */}
      <ExternalLinksFields form={form} />

      {/* 確認画面へ進むボタン */}
      <Button
        size="lg"
        className="w-full gap-2"
        onClick={handleGoToConfirm}
        disabled={!form.canSubmit}
      >
        <ArrowRight className="h-4 w-4" />
        確認画面へ進む
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

  const [formReady, setFormReady] = useState(false);
  const [editFormInitial, setEditFormInitial] = useState<Parameters<typeof useShopForm>[0] | null>(null);

  function buildInitialFromShop(s: ShopData): Parameters<typeof useShopForm>[0] {
    const parsedAddr = parseAddress(s.address);
    const parsedPhone = parsePhone(s.phone);
    const parsedHours = parseHours(s.hours);
    const parsedHolidays = parseHolidays(s.holidays);

    // 既存のarea（カンマ区切りの場合もある）から選択駅を復元
    const existingStations = s.area ? s.area.split(",").map((s) => s.trim()).filter(Boolean) : [];

    return {
      name: s.name ?? "",
      ownerName: s.owner_name ?? "",
      ownerRealNameSei: s.owner_real_name_sei ?? "",
      ownerRealNameMei: s.owner_real_name_mei ?? "",
      category: s.category ?? "",
      area: s.area ?? "",
      selectedStations: existingStations,
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
      homepageUrl: s.website_url ?? "",
      instagramUrl: s.instagram_url ?? "",
      xUrl: s.x_url ?? "",
      lineUrl: s.line_url ?? "",
      // 詳細情報（オプション）
      budgetLunch: s.budget_lunch ?? "",
      budgetDinner: s.budget_dinner ?? "",
      paymentMethods: Array.isArray(s.payment_methods) ? s.payment_methods : [],
      serviceCharge: s.service_charge ?? "",
      totalSeats: s.total_seats != null ? String(s.total_seats) : "",
      privateRooms: s.private_rooms ?? "",
      rentalAvailable: s.rental_available ?? false,
      smokingPolicy: s.smoking_policy ?? "",
      parking: s.parking ?? "",
      openingDate: s.opening_date ?? "",
    };
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/dashboard/shop");
        if (!res.ok) {
          setError(res.status === 401 ? "ログインが必要です" : "データの読み込みに失敗しました");
          setIsLoading(false);
          return;
        }
        const data = await res.json();
        if (data.shop) {
          const s = data.shop as ShopData;
          setShop(s);
          setEditFormInitial(buildInitialFromShop(s));
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
          setEditFormInitial(buildInitialFromShop(s));
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
      const submitData = buildSubmitData(form, geoData);
      const res = await fetch("/api/dashboard/shop", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop_id: shop.id, ...submitData }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "保存に失敗しました。もう一度お試しください。");
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
          <p className="mt-1 text-sm text-muted-foreground">お店の基本情報を編集できます</p>
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
        <p className="text-sm text-blue-700">店舗写真はAIインタビュー後に「写真撮影」タブから登録できます</p>
      </div>

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
                <p className="mt-2 text-sm text-muted-foreground">クリックまたはドラッグで画像をアップロード</p>
                <p className="text-xs text-muted-foreground">推奨サイズ: 1200 x 400px</p>
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
            <Label htmlFor="shop-name">店舗名 <span className="text-destructive">*</span></Label>
            <Input
              id="shop-name"
              value={form.name}
              onChange={(e) => form.setName(e.target.value)}
              className={form.fieldErrors.name ? "border-red-300" : ""}
            />
            {form.fieldErrors.name && <p className="text-xs text-red-500">{form.fieldErrors.name}</p>}
          </div>

          {/* オーナー情報 */}
          <div className="space-y-4 rounded-lg border border-dashed border-primary/20 bg-primary/5 p-4">
            <p className="text-xs font-medium text-primary">オーナー情報</p>

            <div className="space-y-2">
              <Label htmlFor="owner-nickname">ニックネーム（公開名） <span className="text-destructive">*</span></Label>
              <Input
                id="owner-nickname"
                value={form.ownerName}
                onChange={(e) => form.setOwnerName(e.target.value)}
                className={form.fieldErrors.ownerName ? "border-red-300" : ""}
              />
              <p className="text-[11px] text-muted-foreground">お客様に表示される名前です</p>
              {form.fieldErrors.ownerName && <p className="text-xs text-red-500">{form.fieldErrors.ownerName}</p>}
            </div>

            <div className="space-y-2">
              <Label>本名（非公開）</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input
                    value={form.ownerRealNameSei}
                    onChange={(e) => form.setOwnerRealNameSei(e.target.value)}
                    placeholder="例: 推鳥"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">姓</p>
                </div>
                <div>
                  <Input
                    value={form.ownerRealNameMei}
                    onChange={(e) => form.setOwnerRealNameMei(e.target.value)}
                    placeholder="例: 花子"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">名</p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">運営管理用です。一般には公開されません。</p>
            </div>
          </div>

          {/* カテゴリー */}
          <div className="space-y-2">
            <Label>カテゴリー <span className="text-destructive">*</span></Label>
            <Select value={form.category} onValueChange={form.setCategory}>
              <SelectTrigger className={`w-full ${form.fieldErrors.category ? "border-red-300" : ""}`}>
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
              </SelectContent>
            </Select>
            {form.fieldErrors.category && <p className="text-xs text-red-500">{form.fieldErrors.category}</p>}
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
          <AddressFields
            prefecture={form.addrPref}
            city={form.addrCity}
            street={form.addrStreet}
            building={form.addrBuilding}
            onChange={form.handleAddressChange}
            errors={form.fieldErrors}
          />

          <NearestStationDetector
            fullAddress={form.fullAddress}
            selectedStations={form.selectedStations}
            onStationsChanged={form.setSelectedStations}
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
          <BusinessHoursFields
            hoursData={form.hoursData}
            onChange={form.setHoursData}
            error={form.fieldErrors.hours}
          />
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

      {/* 店舗詳細情報（オプション） */}
      <ShopDetailFields form={form} />

      {/* 外部ページ・SNS */}
      <ExternalLinksFields form={form} />

      {/* 公開ステータス */}
      <Card className="border-primary/20">
        <CardContent className="flex items-center justify-between pt-6">
          <div>
            <h2 className="font-semibold">公開ステータス</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {shop.is_published ? "お店のページが一般公開されています" : "お店のページは非公開です"}
            </p>
          </div>
          <Badge variant={shop.is_published ? "default" : "secondary"}>
            {shop.is_published ? "公開中" : "非公開"}
          </Badge>
        </CardContent>
      </Card>

      {/* 下部保存ボタン */}
      <Button className="w-full gap-2" onClick={handleSave} disabled={isSaving}>
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
