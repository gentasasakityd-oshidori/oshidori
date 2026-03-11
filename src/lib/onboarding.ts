/**
 * オンボーディングパイプライン定義
 * 店舗の登録〜公開までのフェーズ管理
 */

// ─── フェーズ定義 ───

export const ONBOARDING_PHASES = [
  "application_pending",
  "approved",
  "pipeline_error",
  "pre_research_running",
  "pre_research_done",
  "design_doc_generating",
  "ready_for_interview",
  "interviewer_assigned",
  "interview_scheduled",
  "interview_completed",
  "story_generating",
  "story_review",
  "photo_pending",
  "published",
] as const;

export type OnboardingPhase = (typeof ONBOARDING_PHASES)[number];

// ─── フェーズメタデータ ───

export interface PhaseMetadata {
  label: string;
  shortLabel: string;
  description: string;
  color: string; // Tailwind bg color class
  textColor: string; // Tailwind text color class
  actor: "system" | "cs" | "interviewer" | "owner" | "ai";
  needsAction: boolean; // CS/インタビュアーのアクションが必要か
}

export const PHASE_METADATA: Record<OnboardingPhase, PhaseMetadata> = {
  application_pending: {
    label: "申請審査中",
    shortLabel: "審査中",
    description: "店舗権限の申請が審査待ちです",
    color: "bg-gray-100",
    textColor: "text-gray-700",
    actor: "cs",
    needsAction: true,
  },
  approved: {
    label: "承認済み",
    shortLabel: "承認済",
    description: "申請が承認されました。事前調査を開始します",
    color: "bg-blue-100",
    textColor: "text-blue-700",
    actor: "system",
    needsAction: false,
  },
  pipeline_error: {
    label: "パイプラインエラー",
    shortLabel: "エラー",
    description: "自動処理でエラーが発生しました。再実行してください",
    color: "bg-red-100",
    textColor: "text-red-700",
    actor: "cs",
    needsAction: true,
  },
  pre_research_running: {
    label: "事前調査中",
    shortLabel: "調査中",
    description: "AIが公開情報をもとに事前調査を実施中です",
    color: "bg-blue-100",
    textColor: "text-blue-700",
    actor: "ai",
    needsAction: false,
  },
  pre_research_done: {
    label: "事前調査完了",
    shortLabel: "調査完了",
    description: "事前調査が完了し、インタビュー設計書の生成を開始します",
    color: "bg-blue-200",
    textColor: "text-blue-800",
    actor: "system",
    needsAction: false,
  },
  design_doc_generating: {
    label: "設計書生成中",
    shortLabel: "設計書生成",
    description: "AIがインタビュー設計書（質問リスト20問）を生成中です",
    color: "bg-indigo-100",
    textColor: "text-indigo-700",
    actor: "ai",
    needsAction: false,
  },
  ready_for_interview: {
    label: "インタビュー準備完了",
    shortLabel: "準備完了",
    description: "インタビュー設計書が完成しました。インタビュアーの割当が必要です",
    color: "bg-yellow-100",
    textColor: "text-yellow-800",
    actor: "cs",
    needsAction: true,
  },
  interviewer_assigned: {
    label: "インタビュアー割当済み",
    shortLabel: "割当済",
    description: "インタビュアーが割り当てられました。日程調整を行ってください",
    color: "bg-orange-100",
    textColor: "text-orange-700",
    actor: "interviewer",
    needsAction: true,
  },
  interview_scheduled: {
    label: "インタビュー日程確定",
    shortLabel: "日程確定",
    description: "インタビューの日程が確定しました",
    color: "bg-orange-200",
    textColor: "text-orange-800",
    actor: "interviewer",
    needsAction: false,
  },
  interview_completed: {
    label: "インタビュー完了",
    shortLabel: "取材完了",
    description: "インタビューが完了しました。ストーリー生成に進みます",
    color: "bg-green-100",
    textColor: "text-green-700",
    actor: "system",
    needsAction: false,
  },
  story_generating: {
    label: "ストーリー生成中",
    shortLabel: "生成中",
    description: "AIがインタビュー内容をもとにストーリーを生成中です",
    color: "bg-purple-100",
    textColor: "text-purple-700",
    actor: "ai",
    needsAction: false,
  },
  story_review: {
    label: "ストーリーレビュー",
    shortLabel: "レビュー中",
    description: "生成されたストーリーの確認・修正をお願いします",
    color: "bg-purple-200",
    textColor: "text-purple-800",
    actor: "owner",
    needsAction: true,
  },
  photo_pending: {
    label: "写真待ち",
    shortLabel: "写真待ち",
    description: "店舗・オーナーの写真をアップロードしてください",
    color: "bg-pink-100",
    textColor: "text-pink-700",
    actor: "owner",
    needsAction: true,
  },
  published: {
    label: "公開済み",
    shortLabel: "公開",
    description: "店舗ページが公開されています",
    color: "bg-green-200",
    textColor: "text-green-800",
    actor: "system",
    needsAction: false,
  },
};

// ─── オーナー向け簡易ステップ ───

export interface OwnerStep {
  step: number;
  label: string;
  description: string;
  phases: OnboardingPhase[];
}

export const OWNER_VISIBLE_STEPS: OwnerStep[] = [
  {
    step: 1,
    label: "申請・承認",
    description: "店舗の登録申請と承認",
    phases: ["application_pending", "approved"],
  },
  {
    step: 2,
    label: "事前調査",
    description: "AIによる公開情報の調査",
    phases: ["pre_research_running", "pre_research_done"],
  },
  {
    step: 3,
    label: "インタビュー準備",
    description: "質問リストの作成と日程調整",
    phases: [
      "design_doc_generating",
      "ready_for_interview",
      "interviewer_assigned",
      "interview_scheduled",
    ],
  },
  {
    step: 4,
    label: "インタビュー",
    description: "店主インタビューの実施",
    phases: ["interview_completed"],
  },
  {
    step: 5,
    label: "ストーリー作成",
    description: "インタビューをもとにストーリーを作成",
    phases: ["story_generating", "story_review"],
  },
  {
    step: 6,
    label: "公開",
    description: "写真の準備と店舗ページの公開",
    phases: ["photo_pending", "published"],
  },
];

// ─── ユーティリティ関数 ───

/** フェーズのインデックスを取得 */
export function getPhaseIndex(phase: string): number {
  return ONBOARDING_PHASES.indexOf(phase as OnboardingPhase);
}

/** フェーズのラベルを取得 */
export function getPhaseLabel(phase: string): string {
  return PHASE_METADATA[phase as OnboardingPhase]?.label ?? phase;
}

/** フェーズの短縮ラベルを取得 */
export function getPhaseShortLabel(phase: string): string {
  return PHASE_METADATA[phase as OnboardingPhase]?.shortLabel ?? phase;
}

/** フェーズの色クラスを取得 */
export function getPhaseColor(phase: string): { bg: string; text: string } {
  const meta = PHASE_METADATA[phase as OnboardingPhase];
  return meta
    ? { bg: meta.color, text: meta.textColor }
    : { bg: "bg-gray-100", text: "text-gray-700" };
}

/** フェーズからオーナー向けステップ番号を取得 */
export function getOwnerStep(phase: string): number {
  const step = OWNER_VISIBLE_STEPS.find((s) =>
    s.phases.includes(phase as OnboardingPhase)
  );
  return step?.step ?? 1;
}

/** フェーズからオーナー向けステップ情報を取得 */
export function getOwnerStepInfo(phase: string): OwnerStep {
  return (
    OWNER_VISIBLE_STEPS.find((s) =>
      s.phases.includes(phase as OnboardingPhase)
    ) ?? OWNER_VISIBLE_STEPS[0]
  );
}

/** フェーズが指定フェーズ以降かどうか */
export function isPhaseAtOrAfter(
  currentPhase: string,
  targetPhase: OnboardingPhase
): boolean {
  return getPhaseIndex(currentPhase) >= getPhaseIndex(targetPhase);
}

/** アクションが必要なフェーズかどうか */
export function phaseNeedsAction(phase: string): boolean {
  return PHASE_METADATA[phase as OnboardingPhase]?.needsAction ?? false;
}

/** CSが対応すべきフェーズのリスト */
export function getCSActionPhases(): OnboardingPhase[] {
  return ONBOARDING_PHASES.filter(
    (p) => PHASE_METADATA[p].actor === "cs" && PHASE_METADATA[p].needsAction
  );
}

/** インタビュアーが対応すべきフェーズのリスト */
export function getInterviewerActionPhases(): OnboardingPhase[] {
  return ONBOARDING_PHASES.filter(
    (p) =>
      PHASE_METADATA[p].actor === "interviewer" && PHASE_METADATA[p].needsAction
  );
}
