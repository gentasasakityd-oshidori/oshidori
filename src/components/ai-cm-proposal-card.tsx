"use client";

/**
 * AIコミュニティマネージャー提案カード
 * 店舗ダッシュボードに表示される提案UI
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface CMProposal {
  id: string;
  proposal_type: string;
  title: string;
  description: string;
  suggested_action: string;
  suggested_message?: string;
  priority: "high" | "normal" | "low";
  target_user_id?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  status: "pending" | "accepted" | "dismissed" | "expired";
  expires_at?: string;
  created_at: string;
}

interface AICMProposalCardProps {
  proposal: CMProposal;
  onRespond: (proposalId: string, action: "accept" | "dismiss") => Promise<void>;
}

export function AICMProposalCard({ proposal, onRespond }: AICMProposalCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleRespond = async (action: "accept" | "dismiss") => {
    setIsLoading(true);
    try {
      await onRespond(proposal.id, action);
    } finally {
      setIsLoading(false);
    }
  };

  // 優先度のバッジ色
  const priorityColors = {
    high: "bg-red-500 text-white",
    normal: "bg-blue-500 text-white",
    low: "bg-gray-400 text-white",
  };

  // 優先度のラベル
  const priorityLabels = {
    high: "優先度: 高",
    normal: "優先度: 中",
    low: "優先度: 低",
  };

  // 提案タイプのアイコン
  const getProposalIcon = (type: string) => {
    switch (type) {
      case "welcome_message":
        return "👋";
      case "milestone_celebration":
        return "🎉";
      case "fan_letter_reply":
        return "💌";
      case "seasonal_update":
        return "🌸";
      case "engagement_boost":
        return "📣";
      case "story_follow_up":
        return "📖";
      case "menu_highlight":
        return "🍽️";
      default:
        return "💡";
    }
  };

  return (
    <Card className="p-4 mb-4 border-l-4 border-l-blue-500">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-3 flex-1">
          <span className="text-2xl">{getProposalIcon(proposal.proposal_type)}</span>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">{proposal.title}</h3>
            <p className="text-gray-600 text-sm mb-2">{proposal.description}</p>
          </div>
        </div>
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${priorityColors[proposal.priority]}`}
        >
          {priorityLabels[proposal.priority]}
        </span>
      </div>

      {/* 提案されたアクション */}
      <div className="bg-gray-50 p-3 rounded mb-3">
        <p className="text-sm font-medium text-gray-700 mb-1">提案アクション:</p>
        <p className="text-sm text-gray-600">{proposal.suggested_action}</p>
      </div>

      {/* 提案されたメッセージ（ある場合） */}
      {proposal.suggested_message && (
        <div className="mb-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            {isExpanded ? "▼" : "▶"} 提案メッセージを見る
          </button>
          {isExpanded && (
            <div className="mt-2 bg-blue-50 p-3 rounded border border-blue-200">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {proposal.suggested_message}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                ※このメッセージは編集してから送信できます
              </p>
            </div>
          )}
        </div>
      )}

      {/* 期限表示 */}
      {proposal.expires_at && (
        <p className="text-xs text-gray-500 mb-3">
          有効期限: {new Date(proposal.expires_at).toLocaleDateString("ja-JP")}
        </p>
      )}

      {/* アクションボタン */}
      <div className="flex gap-2">
        <Button
          onClick={() => handleRespond("accept")}
          disabled={isLoading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isLoading ? "処理中..." : "承認して実行"}
        </Button>
        <Button
          onClick={() => handleRespond("dismiss")}
          disabled={isLoading}
          variant="outline"
          className="flex-1"
        >
          後で
        </Button>
      </div>
    </Card>
  );
}
