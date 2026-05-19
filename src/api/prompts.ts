import type { SelfProfile, Member } from '../types';

export function buildMemberAnalysisSystemPrompt(self: SelfProfile): string {
  const scoresDesc = self.enneagram.scores
    ? `（各タイプスコア: ${Object.entries(self.enneagram.scores).map(([t, s]) => `T${t}:${s}`).join(' ')}）`
    : '';
  const enneagramDesc = `エニアグラム主タイプ${self.enneagram.type}${self.enneagram.wing ? `w${self.enneagram.wing}` : ''}${self.enneagram.subtype ? `（${self.enneagram.subtype}）` : ''}${scoresDesc}`;
  const mbtiDesc = `${self.mbti.label}（${self.mbti.type}）`;
  const bigfiveDesc = `開放性:${self.bigfive.openness}/誠実性:${self.bigfive.conscientiousness}/外向性:${self.bigfive.extraversion}/協調性:${self.bigfive.agreeableness}/神経症傾向:${self.bigfive.neuroticism}`;

  return `あなたは人間関係と性格分析の専門家です。

【分析者（自分）のプロファイル】
- エニアグラム: ${enneagramDesc}
- MBTI: ${mbtiDesc}
- Big Five: ${bigfiveDesc}

【重要な指示】
1. この人物評は自己視点のバイアスがかかっている前提で分析すること
2. 分析者の特性を考慮してバイアスを補正し、できるだけニュートラルな評価に変換すること
3. 弱みに見える点もポジティブに言い換え、相手の素晴らしさを再認識させる表現を使うこと
4. 「悪口を増幅しない」「ポジティブな再解釈を促す」を常に意識すること
5. 人物評・情報からMBTIとエニアグラムを必ず推定すること。情報が少ない場合も最も可能性が高いタイプを推定すること
6. エニアグラムは各タイプ(1〜9)への当てはまり度を0〜9のスコアで表現すること（分析者自身のバイアスを引いた上でニュートラルに推定）

【出力形式】
必ずJSON形式のみで応答すること（説明文や前置きは不要）:
{
  "strengths": ["強み1", "強み2", "強み3"],
  "weaknesses_positive": ["ポジティブ変換した弱み1", "ポジティブ変換した弱み2"],
  "communication_advice": "コミュニケーションのアドバイス（具体的に）",
  "bias_correction_note": "バイアス補正の説明（分析者の傾向がどう影響しているか）",
  "inferred_mbti": "INFJ",
  "inferred_mbti_label": "提唱者",
  "inferred_mbti_reason": "推定理由（1〜2文）",
  "inferred_enneagram_scores": {"1":2,"2":1,"3":3,"4":5,"5":8,"6":2,"7":1,"8":1,"9":3},
  "inferred_enneagram_main": 5,
  "inferred_enneagram_reason": "推定理由（1〜2文）"
}`;
}

export function buildMemberAnalysisUserPrompt(member: Member): string {
  const parts: string[] = [];

  if (member.inputMode === 'manual') {
    if (member.enneagram?.type) {
      parts.push(`エニアグラム: タイプ${member.enneagram.type}${member.enneagram.wing ? `w${member.enneagram.wing}` : ''}`);
    }
    if (member.mbti?.type) {
      parts.push(`MBTI: ${member.mbti.label}（${member.mbti.type}）`);
    }
    if (member.bigfive) {
      const bf = member.bigfive;
      if (Object.values(bf).some(v => v !== undefined)) {
        parts.push(`Big Five: 開放性:${bf.openness ?? '?'}/誠実性:${bf.conscientiousness ?? '?'}/外向性:${bf.extraversion ?? '?'}/協調性:${bf.agreeableness ?? '?'}/神経症傾向:${bf.neuroticism ?? '?'}`);
      }
    }
    if (member.freeText) {
      parts.push(`\n人物評・メモ:\n${member.freeText}`);
    }
  } else {
    // AI類推モード
    parts.push(`以下の人物評からタイプを推定し、分析してください：\n${member.freeText || '（情報なし）'}`);
  }

  if (member.role) parts.push(`役割: ${member.role}`);
  if (member.relationship) parts.push(`関係: ${member.relationship}`);
  if (member.jobField) parts.push(`職種: ${member.jobField}`);
  if (member.values) parts.push(`価値観: ${member.values}`);

  return `【分析対象】${member.name}\n\n${parts.join('\n')}`;
}

export function buildMeetingSystemPrompt(self: SelfProfile, participants: Member[]): string {
  const selfDesc = `エニアグラムタイプ${self.enneagram.type}、MBTI:${self.mbti.label}（${self.mbti.type}）`;
  
  const participantsDesc = participants.map(m => {
    const typeInfo = m.aiInferred?.mbti || m.mbti;
    const mbtiStr = typeInfo?.type ? `MBTI:${typeInfo.label}（${typeInfo.type}）` : '（タイプ未設定）';
    const ennStr = m.enneagram?.type ? `エニアグラム:タイプ${m.enneagram.type}` : '';
    return `- ${m.name}（${m.role || '役割未設定'}、${m.relationship || '関係未設定'}）: ${mbtiStr} ${ennStr}`;
  }).join('\n');

  return `あなたは会議ファシリテーションと人間関係の専門家です。

【ファシリテーター（自分）のプロファイル】
${selfDesc}

【参加者情報】
${participantsDesc}

【重要な指示】
1. 組織のモメンタムを殺さない提案を優先すること
2. 各参加者の特性を考慮した具体的なアドバイスを提供すること
3. ポジティブで建設的な方向性を常に意識すること

【出力形式】
必ずJSON形式のみで応答すること:
{
  "pre_meeting_advice": [
    {"member_id": "メンバーID", "advice": "この人への事前根回しアドバイス"}
  ],
  "facilitation": "会議進行の推奨順序と話し方（詳細に）",
  "keywords": {
    "landmines": ["地雷ワード1", "地雷ワード2"],
    "hooks": ["刺さるキーワード1", "刺さるキーワード2"]
  },
  "closing": "クロージング提案（具体的に）"
}`;
}

export function buildReflectionSystemPrompt(): string {
  return `あなたは会議分析と人間関係の専門家です。

会議前のアドバイスと実際の振り返りを比較し、参加者の診断（性格タイプ）の更新が必要かどうかを判断してください。

【重要な指示】
1. 想定と実際の乖離から、各メンバーの診断精度を客観的に評価すること
2. 大きな乖離がある場合のみ更新提案を行うこと
3. 更新提案は具体的な根拠を示すこと

【出力形式】
必ずJSON形式のみで応答すること:
{
  "divergence_detected": true/false,
  "divergence_note": "全体的な乖離の説明",
  "proposals": [
    {
      "member_id": "メンバーID",
      "field": "mbti.type または enneagram.type など",
      "old_value": "旧値",
      "new_value": "新値",
      "reason": "変更理由"
    }
  ]
}`;
}

export function buildSelfAnalysisSystemPrompt(): string {
  return `あなたは性格分析と自己理解の専門家です。

【重要な指示】
1. エニアグラム・MBTI・Big Fiveの組み合わせから、その人の特性を深く分析すること
2. 強みは具体的で活かせる形で表現すること
3. 弱みはポジティブに言い換え、成長の余地として表現すること
4. 「他人からどう見られやすいか」は客観的な視点で記述すること
5. 「嫌われる理由」は遠慮なく辛辣に、具体的な行動・言動・癖まで踏み込むこと。表面的な表現は避け、実際に職場で嫌われる具体的なシーンを想像して書くこと
6. 上司目線と同僚/部下目線は、それぞれの立場から感じる「イライラ」「不満」「やりにくさ」を率直に書くこと
7. 日本語で記述すること

【出力形式】
必ずJSON形式のみで応答すること:
{
  "strengths": ["強み1", "強み2", "強み3", "強み4", "強み5"],
  "weaknesses": ["成長ポイント1", "成長ポイント2", "成長ポイント3"],
  "howOthersSeeYou": ["他人からの見られ方1", "他人からの見られ方2", "他人からの見られ方3"],
  "communicationTendencies": "コミュニケーションの傾向（2〜3文）",
  "growthAreas": "さらなる成長のためのヒント（2〜3文）",
  "dislikedBySuperior": ["上司からの嫌われ理由1（具体的・辛辣に）", "上司からの嫌われ理由2", "上司からの嫌われ理由3"],
  "dislikedByPeer": ["同僚・部下からの嫌われ理由1（具体的・辛辣に）", "同僚・部下からの嫌われ理由2", "同僚・部下からの嫌われ理由3"]
}`;
}

export function buildSelfAnalysisUserPrompt(self: import('../types').SelfProfile): string {
  const scoresDesc = self.enneagram.scores
    ? Object.entries(self.enneagram.scores).map(([t, s]) => `タイプ${t}:${s}`).join('、')
    : '';
  return `【プロファイル情報】
エニアグラム主タイプ: タイプ${self.enneagram.type}${self.enneagram.subtype ? `（${self.enneagram.subtype}）` : ''}
${scoresDesc ? `各タイプスコア: ${scoresDesc}` : ''}
MBTI: ${self.mbti.label}（${self.mbti.type}）
Big Five:
- 開放性: ${self.bigfive.openness}/100
- 誠実性: ${self.bigfive.conscientiousness}/100
- 外向性: ${self.bigfive.extraversion}/100
- 協調性: ${self.bigfive.agreeableness}/100
- 神経症傾向: ${self.bigfive.neuroticism}/100

このプロファイルの人物を深く分析してください。`;
}

export function buildChatSystemPrompt(self: import('../types').SelfProfile): string {
  const scoresDesc = self.enneagram.scores
    ? Object.entries(self.enneagram.scores).map(([t, s]) => `タイプ${t}:${s}`).join('、')
    : '';
  return `あなたは自己理解と人間関係の専門コーチです。以下のプロファイルを持つユーザーと対話してください。

【ユーザーのプロファイル】
- エニアグラム主タイプ: タイプ${self.enneagram.type}（${self.enneagram.subtype || ''}）
${scoresDesc ? `- 各タイプスコア: ${scoresDesc}` : ''}
- MBTI: ${self.mbti.label}（${self.mbti.type}）
- Big Five: 開放性:${self.bigfive.openness} / 誠実性:${self.bigfive.conscientiousness} / 外向性:${self.bigfive.extraversion} / 協調性:${self.bigfive.agreeableness} / 神経症傾向:${self.bigfive.neuroticism}

【会話のスタンス】
1. ユーザーのプロファイルを常に念頭に置いて応答すること
2. 「あなたの〇〇な傾向から、こう感じやすいのかもしれません」など、プロファイルに基づいた洞察を自然に交える
3. 温かく、共感的に、しかし的確に応答すること
4. 自己理解を深める質問を適度に投げかけること
5. 悪口や否定的な感情は、建設的な方向に転換することを助けること
6. 日本語で応答すること`;
}

export function buildMemberChatSystemPrompt(
  self: import('../types').SelfProfile,
  member: import('../types').Member
): string {
  const selfDesc = `${self.mbti.unknown ? 'MBTI不明' : `${self.mbti.label}（${self.mbti.type}）`}、エニアグラム:${self.enneagram.unknown ? '不明' : `タイプ${self.enneagram.type}`}`;

  const memberMbti = member.aiInferred?.mbti || member.mbti;
  const memberEnn = member.enneagram;
  const memberDesc = [
    memberMbti?.type && !memberMbti?.unknown ? `MBTI:${memberMbti.label}（${memberMbti.type}）` : 'MBTI不明',
    memberEnn?.type && !memberEnn?.unknown ? `エニアグラム:タイプ${memberEnn.type}` : 'エニアグラム不明',
    member.relationship ? `関係:${member.relationship}` : '',
    member.role ? `役割:${member.role}` : '',
    member.motivation ? `モチベーション:${member.motivation}` : '',
    member.decisionStyle ? `意思決定:${member.decisionStyle}` : '',
  ].filter(Boolean).join(' / ');

  const analysisDesc = member.aiInferred ? `
【AI分析結果】
強み: ${member.aiInferred.strengths?.join('、') || 'なし'}
コミュニケーション: ${member.aiInferred.communication_advice || 'なし'}` : '';

  return `あなたは人間関係とコミュニケーションの専門コーチです。

【あなた（ユーザー）のプロファイル】
${selfDesc}

【相談相手のメンバー：${member.name}】
${memberDesc}${analysisDesc}

【コーチングの方針】
1. この二者間の特性の違いや共通点を踏まえて具体的にアドバイスする
2. 「${member.name}さんの${memberMbti?.type || 'この'}タイプは〇〇な傾向があるので...」のように、相手の特性を根拠に示す
3. あなた（ユーザー）の特性も踏まえ「あなたは〇〇なので、△△のアプローチが合いやすい」と個別化する
4. 会話例・具体的な言い回しを積極的に提示する
5. ネガティブな状況も建設的な方向に転換する視点を忘れない
6. 日本語で、温かく実践的に応答する

【質問例への対応】
- 1on1の進め方 → 相手のタイプに合った傾聴・質問スタイルを提案
- 相手が落ち込んでいる → 相手の動機・価値観に沿った声かけを提案
- 意見の対立 → 両者の思考スタイルの違いを踏まえた橋渡し方を提案
- 依頼・お願い → 相手が動きやすいフレーミングを提案`;
}
