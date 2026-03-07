"use client";

import { ScrollFadeIn } from "./scroll-fade-in";

interface ComparisonRow {
  label: string;
  before: string;
  after: string;
}

interface ComparisonTableProps {
  rows: ComparisonRow[];
  beforeHeader: string;
  afterHeader: string;
  className?: string;
}

/**
 * 2列の比較表コンポーネント。
 * Before/After や 従来サービス/オシドリ の比較に使用。
 */
export function ComparisonTable({
  rows,
  beforeHeader,
  afterHeader,
  className = "",
}: ComparisonTableProps) {
  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      {/* デスクトップ: テーブル表示 */}
      <table className="hidden w-full border-collapse md:table">
        <thead>
          <tr>
            <th className="w-1/4 border-b-2 border-border/30 px-4 py-3 text-left text-sm font-medium text-muted-foreground" />
            <th className="w-[37.5%] border-b-2 border-border/30 px-4 py-3 text-center text-sm font-medium text-muted-foreground">
              {beforeHeader}
            </th>
            <th className="w-[37.5%] border-b-2 border-primary/40 bg-primary/5 px-4 py-3 text-center text-sm font-bold text-primary">
              {afterHeader}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <ScrollFadeIn key={i} delay={i * 80} direction="none">
              <tr className="border-b border-border/20 transition-colors hover:bg-muted/30">
                <td className="px-4 py-4 text-sm font-medium text-foreground">
                  {row.label}
                </td>
                <td className="px-4 py-4 text-center text-sm text-muted-foreground">
                  {row.before}
                </td>
                <td className="bg-primary/5 px-4 py-4 text-center text-sm font-medium text-foreground">
                  {row.after}
                </td>
              </tr>
            </ScrollFadeIn>
          ))}
        </tbody>
      </table>

      {/* モバイル: カード表示 */}
      <div className="flex flex-col gap-4 md:hidden">
        {rows.map((row, i) => (
          <ScrollFadeIn key={i} delay={i * 100} direction="up">
            <div className="rounded-xl border border-border/30 bg-card p-4 shadow-sm">
              <p className="mb-3 text-sm font-bold text-foreground">
                {row.label}
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-xs text-muted-foreground">
                    ▸
                  </span>
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {beforeHeader}
                    </span>
                    <p className="text-sm text-muted-foreground">{row.before}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-xs text-primary">
                    ★
                  </span>
                  <div>
                    <span className="text-xs font-bold text-primary">
                      {afterHeader}
                    </span>
                    <p className="text-sm font-medium text-foreground">
                      {row.after}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollFadeIn>
        ))}
      </div>
    </div>
  );
}
