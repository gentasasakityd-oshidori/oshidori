import { Eye, Heart, MessageCircle, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EMPATHY_TAGS } from "@/lib/constants";

// ダミーKPIデータ
const KPI = [
  {
    label: "今月のPV",
    value: "1,284",
    change: "+12.3%",
    trend: "up" as const,
    icon: Eye,
  },
  {
    label: "推し登録数",
    value: "24",
    change: "+3",
    trend: "up" as const,
    icon: Heart,
  },
  {
    label: "共感タップ数",
    value: "156",
    change: "+18",
    trend: "up" as const,
    icon: MessageCircle,
  },
];

// 直近7日の推移データ
const DAILY_STATS = [
  { date: "2/22（土）", pv: 45, oshi: 1, empathy: 8 },
  { date: "2/23（日）", pv: 62, oshi: 2, empathy: 12 },
  { date: "2/24（月）", pv: 38, oshi: 0, empathy: 5 },
  { date: "2/25（火）", pv: 41, oshi: 1, empathy: 7 },
  { date: "2/26（水）", pv: 55, oshi: 0, empathy: 9 },
  { date: "2/27（木）", pv: 73, oshi: 2, empathy: 14 },
  { date: "2/28（金）", pv: 68, oshi: 1, empathy: 11 },
];

// 最近の共感タップ一覧
const RECENT_EMPATHY = [
  {
    id: "1",
    nickname: "グルメ太郎",
    tagId: "craftsman",
    storyTitle: "祖父から受け継いだ石臼と、朝4時の仕込み",
    time: "5分前",
  },
  {
    id: "2",
    nickname: "食べ歩きさん",
    tagId: "ingredient",
    storyTitle: "祖父から受け継いだ石臼と、朝4時の仕込み",
    time: "1時間前",
  },
  {
    id: "3",
    nickname: "蔵前住民",
    tagId: "story",
    storyTitle: "祖父から受け継いだ石臼と、朝4時の仕込み",
    time: "3時間前",
  },
  {
    id: "4",
    nickname: "そば好き",
    tagId: "kodawari",
    storyTitle: "祖父から受け継いだ石臼と、朝4時の仕込み",
    time: "5時間前",
  },
  {
    id: "5",
    nickname: "下町散歩",
    tagId: "hospitality",
    storyTitle: "祖父から受け継いだ石臼と、朝4時の仕込み",
    time: "昨日",
  },
];

// 感情タグの分布データ
const TAG_DISTRIBUTION = [
  { tagId: "craftsman", count: 45 },
  { tagId: "ingredient", count: 32 },
  { tagId: "kodawari", count: 28 },
  { tagId: "story", count: 24 },
  { tagId: "passion", count: 18 },
  { tagId: "hospitality", count: 9 },
];

function getEmpathyTag(tagId: string) {
  return EMPATHY_TAGS.find((t) => t.id === tagId);
}

function TextBar({ value, max }: { value: number; max: number }) {
  const percentage = Math.round((value / max) * 100);
  const barLength = Math.max(1, Math.round(percentage / 5)); // 20段階
  return (
    <div className="flex items-center gap-2">
      <div className="h-4 rounded-sm bg-primary/80" style={{ width: `${percentage}%` }} />
      <span className="shrink-0 text-xs text-muted-foreground">{value}</span>
    </div>
  );
}

export default function DashboardPage() {
  const maxTagCount = Math.max(...TAG_DISTRIBUTION.map((t) => t.count));
  const maxPV = Math.max(...DAILY_STATS.map((d) => d.pv));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* ページタイトル */}
      <div>
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          蔵前 手打ちそば やまと
        </p>
      </div>

      {/* KPIカード */}
      <div className="grid gap-4 sm:grid-cols-3">
        {KPI.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {kpi.label}
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <kpi.icon className="h-4 w-4 text-primary" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-3xl font-bold">{kpi.value}</span>
              </div>
              <div className="mt-1 flex items-center gap-1">
                {kpi.trend === "up" ? (
                  <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                )}
                <span
                  className={`text-xs font-medium ${
                    kpi.trend === "up" ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {kpi.change}
                </span>
                <span className="text-xs text-muted-foreground">
                  先月比
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 直近7日の推移 */}
      <Card>
        <CardContent className="p-4">
          <h2 className="font-semibold">直近7日間の推移</h2>
          <div className="mt-4 space-y-2">
            <div className="grid grid-cols-[100px_1fr] gap-2 text-xs font-medium text-muted-foreground">
              <span>日付</span>
              <span>PV数</span>
            </div>
            <Separator />
            {DAILY_STATS.map((day) => (
              <div
                key={day.date}
                className="grid grid-cols-[100px_1fr] items-center gap-2"
              >
                <span className="text-xs text-muted-foreground">
                  {day.date}
                </span>
                <TextBar value={day.pv} max={maxPV} />
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>
              合計PV:{" "}
              <strong className="text-foreground">
                {DAILY_STATS.reduce((sum, d) => sum + d.pv, 0)}
              </strong>
            </span>
            <span>
              推し登録:{" "}
              <strong className="text-foreground">
                +{DAILY_STATS.reduce((sum, d) => sum + d.oshi, 0)}
              </strong>
            </span>
            <span>
              共感タップ:{" "}
              <strong className="text-foreground">
                +{DAILY_STATS.reduce((sum, d) => sum + d.empathy, 0)}
              </strong>
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 最近の共感タップ */}
        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold">最近の共感タップ</h2>
            <div className="mt-4 space-y-3">
              {RECENT_EMPATHY.map((item) => {
                const tag = getEmpathyTag(item.tagId);
                return (
                  <div key={item.id} className="flex items-start gap-3">
                    <span className="mt-0.5 text-lg">{tag?.emoji ?? "👏"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <strong>{item.nickname}</strong>さんが
                        <span className="rounded-sm bg-primary/10 px-1 text-primary">
                          &quot;{tag?.label}&quot;
                        </span>
                        と共感しました
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {item.storyTitle}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {item.time}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 感情タグの分布 */}
        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold">感情タグの分布</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              どの想いに共感が集まっているか
            </p>
            <div className="mt-4 space-y-3">
              {TAG_DISTRIBUTION.map((item) => {
                const tag = getEmpathyTag(item.tagId);
                return (
                  <div key={item.tagId} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5">
                        <span>{tag?.emoji}</span>
                        {tag?.label}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {item.count}
                      </Badge>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary/70 transition-all"
                        style={{
                          width: `${(item.count / maxTagCount) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
