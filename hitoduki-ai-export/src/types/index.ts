export interface EnneagramScores {
  1: number; 2: number; 3: number; 4: number; 5: number;
  6: number; 7: number; 8: number; 9: number;
}

export const DEFAULT_ENNEAGRAM_SCORES: EnneagramScores = {
  1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0,
};

export interface Enneagram {
  type: number; // 最高スコアのタイプ（自動算出）
  scores?: EnneagramScores; // 各タイプへの点数 0-9
  wing?: number;
  subtype?: string;
}

export interface MBTI {
  type: string;
  label: string;
}

export interface BigFive {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface SelfProfile {
  id: 'self';
  enneagram: Enneagram;
  mbti: MBTI;
  bigfive: BigFive;
  updatedAt: Date;
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
  inputMode: 'manual' | 'ai';
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
  };
  revisedByReflection?: boolean;
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
  updatedAt: Date;
}
