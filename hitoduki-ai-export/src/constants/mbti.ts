export interface MBTIOption {
  type: string;
  label: string;
  group: string;
}

export const MBTI_OPTIONS: MBTIOption[] = [
  // アナリスト型
  { type: 'INTJ', label: '建築家', group: 'アナリスト型' },
  { type: 'INTP', label: '論理学者', group: 'アナリスト型' },
  { type: 'ENTJ', label: '指揮官', group: 'アナリスト型' },
  { type: 'ENTP', label: '討論者', group: 'アナリスト型' },
  // 外交官型
  { type: 'INFJ', label: '提唱者', group: '外交官型' },
  { type: 'INFP', label: '仲介者', group: '外交官型' },
  { type: 'ENFJ', label: '主人公', group: '外交官型' },
  { type: 'ENFP', label: '広報運動家', group: '外交官型' },
  // 番人型
  { type: 'ISTJ', label: '管理者', group: '番人型' },
  { type: 'ISFJ', label: '擁護者', group: '番人型' },
  { type: 'ESTJ', label: '幹部', group: '番人型' },
  { type: 'ESFJ', label: '領事', group: '番人型' },
  // 探検家型
  { type: 'ISTP', label: '巨匠', group: '探検家型' },
  { type: 'ISFP', label: '冒険家', group: '探検家型' },
  { type: 'ESTP', label: '起業家', group: '探検家型' },
  { type: 'ESFP', label: 'エンターテイナー', group: '探検家型' },
];

export const MBTI_GROUPS = ['アナリスト型', '外交官型', '番人型', '探検家型'];
