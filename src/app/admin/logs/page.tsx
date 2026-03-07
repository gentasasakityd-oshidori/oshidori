"use client";

import { useState, useEffect } from "react";
import { ScrollText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LogEntry {
  timestamp: string;
  action: string;
  target: string;
  detail: string;
}

const STORAGE_KEY = "oshidori_admin_logs";

/** 管理者操作ログを記録する（他ページから呼ばれる） */
export function addAdminLog(action: string, target: string, detail: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const logs: LogEntry[] = raw ? JSON.parse(raw) : [];
    logs.unshift({
      timestamp: new Date().toISOString(),
      action,
      target,
      detail,
    });
    // 最大100件保持
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(0, 100)));
  } catch {
    // localStorage エラーは無視
  }
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setLogs(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
  }, []);

  function clearLogs() {
    localStorage.removeItem(STORAGE_KEY);
    setLogs([]);
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">操作ログ</h1>
        </div>
        {logs.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearLogs}>
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            クリア
          </Button>
        )}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        管理者の操作履歴（ブラウザローカル保存・直近100件）
      </p>

      {logs.length === 0 ? (
        <div className="mt-12 text-center text-sm text-muted-foreground">
          操作ログはありません
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground">日時</th>
                <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground">操作</th>
                <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground">対象</th>
                <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground">詳細</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-gray-50/50">
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {formatDate(log.timestamp)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium">{log.action}</td>
                  <td className="px-3 py-2">{log.target}</td>
                  <td className="px-3 py-2 text-muted-foreground">{log.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
