const API_ENDPOINT = '/api/claude';

async function callClaude(systemPrompt: string, userMessage: string): Promise<string> {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`API エラー: ${response.status} ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || '';
}

function parseJSON<T>(text: string): T {
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(clean);
}

export async function analyzeMemember(systemPrompt: string, userPrompt: string) {
  const raw = await callClaude(systemPrompt, userPrompt);
  return parseJSON<{
    strengths: string[];
    weaknesses_positive: string[];
    communication_advice: string;
    bias_correction_note: string;
  }>(raw);
}

export async function getMeetingAdvice(systemPrompt: string, userPrompt: string) {
  const raw = await callClaude(systemPrompt, userPrompt);
  return parseJSON<{
    pre_meeting_advice: { member_id: string; advice: string }[];
    facilitation: string;
    keywords: { landmines: string[]; hooks: string[] };
    closing: string;
  }>(raw);
}

export async function analyzeReflection(systemPrompt: string, userPrompt: string) {
  const raw = await callClaude(systemPrompt, userPrompt);
  return parseJSON<{
    divergence_detected: boolean;
    divergence_note: string;
    proposals: {
      member_id: string;
      field: string;
      old_value: string;
      new_value: string;
      reason: string;
    }[];
  }>(raw);
}

export async function analyzeSelf(systemPrompt: string, userPrompt: string) {
  const raw = await callClaude(systemPrompt, userPrompt);
  return parseJSON<{
    strengths: string[];
    weaknesses: string[];
    howOthersSeeYou: string[];
    communicationTendencies: string;
    growthAreas: string;
  }>(raw);
}

export async function chatWithAI(systemPrompt: string, messages: { role: 'user' | 'assistant'; content: string }[]) {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`API エラー: ${response.status} ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || '';
}
