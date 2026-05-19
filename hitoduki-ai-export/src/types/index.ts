export interface EnneagramScores {
  1: number; 2: number; 3: number; 4: number; 5: number;
  6: number; 7: number; 8: number; 9: number;
}

export const DEFAULT_ENNEAGRAM_SCORES: EnneagramScores = {
  1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0,
};

export interface Enneagram {
  type: number;
  scores?: EnneagramScores;
  wing?: number;
  subtype?: string;
  unknown?: boolean; // 不明フラグ
}

export interface MBTI {
  type: string;
  label: string;
  unknown?: boolean; // 不明フラグ
}

export interface BigFive {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  unknown?: boolean; // 不明フラグ
}

export interface SelfProfile {
  id: 'self';
  enneagram: Enneagram;
  mbti: MBTI;
  bigfive: BigFive;
  updatedAt: Date;
}

// 各指標の入力モード
export type IndicatorMode = 'manual' | 'ai' | 'unknown';

export interface MemberIndicatorModes {
  enneagram: IndicatorMode;
  mbti: IndicatorMode;
  bigfive: IndicatorMode;
}

export interface Member {
  id: string;
  name: string;
  role?: string;
  relationship?: string;
  contactFrequency?: string;
  communicationStyle?: string;
  decisionStyle?: string;
  jobField?: string;
  experienceLevel?: string;
  values?: string;
  motivation?: string;
  inputMode: 'manual' | 'ai'; // 後方互換のため残す
  indicatorModes?: MemberIndicatorModes; // 指標ごとのモード
  freeText?: string;
  enneagram?: Partial<Enneagram>;
  mbti?: Partial<MBTI>;
  bigfive?: Partial<BigFive>;
  aiInferred?: {
    enneagram?: Partial<Enneagram>;
    mbti?: Partial<MBTI>;
    bigfive?: Partial<BigFive>;
    strengths?: string[];
    weaknesses_positive?: string[];
    communication_advice?: string;
    bias_correction_note?: string;
    // AI推定タイプ（バイアス補正済み）
    inferred_mbti?: string;
    inferred_mbti_label?: string;
    inferred_mbti_reason?: string;
    inferred_enneagram_scores?: Record<string, number>;
    inferred_enneagram_main?: number;
    inferred_enneagram_reason?: string;
  };
  revisedByReflection?: boolean;
  // ネットワーク相性スコア（AIが算出）
  compatibility?: {
    [memberId: string]: {
      score: number; // -1〜1 (-1:相性悪 0:中立 1:相性良)
      complementary: number; // 0〜1 (補完度)
      label: string; // '相性◎' | '相性△' | '補完関係' | '中立'
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface MeetingConsultation {
  id: string;
  title: string;
  participantIds: string[];
  agenda: string;
  concerns?: string;
  adviceResult?: {
    pre_meeting_advice: { member_id: string; advice: string }[];
    facilitation: string;
    keywords: { landmines: string[]; hooks: string[] };
    closing: string;
  };
  reflection?: {
    memo?: string;
    rating?: '◎' | '○' | '△' | '×';
    divergenceNote?: string;
    updateProposals?: {
      member_id: string;
      field: string;
      old_value: string;
      new_value: string;
      reason: string;
    }[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface AnalysisResult {
  strengths: string[];
  weaknesses_positive: string[];
  communication_advice: string;
  bias_correction_note: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

export interface SelfAnalysis {
  id: 'self_analysis';
  strengths: string[];
  weaknesses: string[];
  howOthersSeeYou: string[];
  communicationTendencies: string;
  growthAreas: string;
  dislikedBySuperior?: string[];
  dislikedByPeer?: string[];
  updatedAt: Date;
}

export interface MemberChatMessage {
  id: string;
  memberId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}
