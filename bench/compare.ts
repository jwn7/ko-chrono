// ko-chrono vs LLM 날짜 추출 비교 벤치마크
//
//   cd bench && npm install && npm run build --prefix ..
//   npm run bench:local                          # ko-chrono만 (API 키 불필요)
//   ANTHROPIC_API_KEY=... npm run bench          # Claude와 비교 (요금 발생)
//   node compare.ts --model claude-haiku-5-5 --effort low
//   GEMINI_API_KEY=... npm run bench:gemini      # Gemini와 비교 (Google AI Studio 무료 티어 가능)
//   GEMINI_API_KEY=... npm run gemini:models     # 이 키로 쓸 수 있는 Gemini 모델 목록
//   npm run bench:gemini -- --model gemini-3.8-flash-lite
//
// 같은 112개 문장(tests/cases/messenger.ts)을 양쪽에 넣고 정확도·지연·비용을 잰다.
// Node 22.6+ 의 TypeScript 타입 제거로 바로 실행된다 (빌드 불필요).

import Anthropic from '@anthropic-ai/sdk';
import { parse } from '../dist/index.js';
import { cases, REF, type Case } from '../tests/cases/messenger.ts';

// ---------- 옵션 ----------
const argv = process.argv.slice(2);
const flag = (name: string, fallback: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const LOCAL_ONLY = argv.includes('--local-only');
const PROVIDER = flag('provider', 'claude') as 'claude' | 'gemini';
const MODEL = flag('model', PROVIDER === 'gemini' ? 'gemini-3.8-flash' : 'claude-opus-5-5');
const EFFORT = flag('effort', 'low') as 'low' | 'medium' | 'high';
// Gemini 무료 티어는 분당 요청 수가 적어서 기본 1개씩 보낸다
const CONCURRENCY = Number(flag('concurrency', PROVIDER === 'gemini' ? '1' : '4'));

// 2026-10-06 기준 1M 토큰당 USD (claude-api 레퍼런스). 실제 청구액은 콘솔에서 확인할 것.
const PRICE: Record<string, [number, number]> = {
  'claude-opus-5-5': [4, 20],
  'claude-sonnet-5-5': [2, 10],
  'claude-haiku-5-5': [0.1, 0.5],
};

// ---------- 채점 ----------
// 기대값과 모델 출력은 모두 기준일(서울) 벽시계 'YYYY-MM-DDTHH:mm'.
// "~까지" 마감 케이스는 ko-chrono 규약상 date=기준 시각이지만, LLM에게 그 규약을 강요하지 않도록
// 마감(end)만 비교한다. 구간은 start·end 둘 다, 시점은 start만 본다.
interface Answer {
  start: string | null;
  end: string | null;
}

function expected(c: Case): Answer {
  if (c.date === null) return { start: null, end: null };
  if (c.end && c.date === REF) return { start: null, end: c.end }; // 마감
  return { start: c.date, end: c.end ?? null };
}

function correct(c: Case, got: Answer): boolean {
  const want = expected(c);
  if (want.start === null && want.end === null) return got.start === null && got.end === null;
  if (want.start === null) return got.end === want.end; // 마감: 시작은 따지지 않음
  return got.start === want.start && (want.end === null || got.end === want.end);
}

// ---------- ko-chrono ----------
const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const refDate = (() => {
  const [y, m, d, h, min] = REF.split(/[-T:]/).map(Number);
  return new Date(y, m - 1, d, h, min);
})();

function koChrono(c: Case): Answer {
  const r = parse(c.text, { referenceDate: refDate });
  if (!r) return { start: null, end: null };
  const isDeadline = r.end !== undefined && r.date.getTime() === refDate.getTime();
  return { start: isDeadline ? null : fmt(r.date), end: r.end ? fmt(r.end) : null };
}

// ---------- Claude ----------
const SYSTEM = `You extract the first date/time expression from a Korean chat message.
Reference time: ${REF} (Friday), Asia/Seoul. Weeks start on Monday.
Answer with wall-clock times in the form YYYY-MM-DDTHH:mm.
- A point in time: start = that time, end = null.
- A deadline ("~까지", "~안에", "~이내", "~중으로"): start = null, end = the deadline. A deadline day without a time ends at 23:59.
- A range ("A부터 B까지", "A~B", "오늘부터 3일간"): start = A, end = B (a day without a time ends at 23:59).
- A date without a time: 00:00. A time without a date: today, or tomorrow if it has already passed.
- No date or time expression: start = null, end = null.`;

const SCHEMA = {
  type: 'object',
  properties: {
    start: { type: ['string', 'null'] },
    end: { type: ['string', 'null'] },
  },
  required: ['start', 'end'],
  additionalProperties: false,
};

interface LlmRun {
  answer: Answer;
  ms: number;
  inputTokens: number;
  outputTokens: number;
  servedBy: string;
}

async function claude(client: Anthropic, c: Case): Promise<LlmRun> {
  const t = performance.now();
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM,
    messages: [{ role: 'user', content: c.text }],
    output_config: { effort: EFFORT, format: { type: 'json_schema', schema: SCHEMA } },
    // 안전 분류기가 거절하면 같은 요청을 다른 모델로 다시 돌린다 (서버 측 fallback)
    betas: ['server-side-fallback-2026-06-01'],
    fallbacks: [{ model: 'claude-opus-4-8' }],
  });
  const ms = performance.now() - t;
  let answer: Answer = { start: null, end: null };
  if (response.stop_reason !== 'refusal') {
    const text = response.content.find((b) => b.type === 'text');
    if (text && text.type === 'text') answer = JSON.parse(text.text) as Answer;
  }
  return {
    answer,
    ms,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    servedBy: response.model,
  };
}

// ---------- Gemini (Google AI Studio) ----------
// REST로 직접 호출한다. 키는 URL이 아니라 x-goog-api-key 헤더로 보낸다.
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_SCHEMA = {
  type: 'OBJECT',
  properties: {
    start: { type: 'STRING', nullable: true },
    end: { type: 'STRING', nullable: true },
  },
  required: ['start', 'end'],
};

function geminiKey(): string {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY 환경 변수가 없습니다. https://aistudio.google.com/apikey 에서 발급');
  }
  return key;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
  error?: { code: number; message: string; details?: { '@type': string; retryDelay?: string }[] };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function gemini(c: Case): Promise<LlmRun> {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: 'user', parts: [{ text: c.text }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: GEMINI_SCHEMA },
  });
  for (let attempt = 1; ; attempt++) {
    const t = performance.now();
    const res = await fetch(`${GEMINI_BASE}/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': geminiKey() },
      body,
    });
    const ms = performance.now() - t;
    const json = (await res.json()) as GeminiResponse;
    // 무료 티어 한도(429)나 일시 과부하(503)는 기다렸다가 다시. 대기 시간은 지연 측정에 넣지 않는다.
    if ((res.status === 429 || res.status === 503) && attempt < 8) {
      const delay = json.error?.details?.find((d) => d.retryDelay)?.retryDelay;
      const waitMs = delay ? parseFloat(delay) * 1000 + 500 : 15_000;
      process.stderr.write(`  ${res.status}: ${(waitMs / 1000).toFixed(0)}초 기다렸다 다시 (${c.text})\n`);
      await sleep(waitMs);
      continue;
    }
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${json.error?.message ?? res.statusText}`);
    const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    let answer: Answer = { start: null, end: null };
    try {
      answer = JSON.parse(text) as Answer;
    } catch {
      // 형식이 깨진 답은 오답으로 센다
    }
    const u = json.usageMetadata ?? {};
    return {
      answer,
      ms,
      inputTokens: u.promptTokenCount ?? 0,
      outputTokens: (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0),
      servedBy: MODEL,
    };
  }
}

async function listGeminiModels(): Promise<void> {
  const res = await fetch(`${GEMINI_BASE}/models?pageSize=200`, { headers: { 'x-goog-api-key': geminiKey() } });
  const json = (await res.json()) as {
    models?: { name: string; displayName: string; supportedGenerationMethods: string[] }[];
    error?: { message: string };
  };
  if (!res.ok) throw new Error(json.error?.message ?? res.statusText);
  for (const m of json.models ?? []) {
    if (m.supportedGenerationMethods.includes('generateContent')) {
      console.log(`${m.name.replace('models/', '').padEnd(40)} ${m.displayName}`);
    }
  }
}

async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

// ---------- 실행 ----------
// process.exit()는 쓰지 않는다: Windows의 Node는 fetch 연결이 열린 채 종료하면
// 'Assertion failed: UV_HANDLE_CLOSING'으로 죽는다. main이 끝나면 자연스럽게 종료된다.
async function main(): Promise<void> {
  if (argv.includes('--list-models')) return listGeminiModels();

  const pct = (x: number) => `${((x / cases.length) * 100).toFixed(1)}%`;
  const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

  // ko-chrono: 정확도 + 지연 (워밍업 후 1000회 반복 평균)
  const kcAnswers = cases.map(koChrono);
  const kcCorrect = cases.filter((c, i) => correct(c, kcAnswers[i])).length;
  for (let i = 0; i < 200; i++) cases.forEach(koChrono);
  const t0 = performance.now();
  for (let i = 0; i < 1000; i++) cases.forEach(koChrono);
  const kcUs = ((performance.now() - t0) / (1000 * cases.length)) * 1000;

  console.log(`\n문장 ${cases.length}개, 기준 시각 ${REF} (금, 서울)\n`);
  console.log(`ko-chrono            정확도 ${pct(kcCorrect)} (${kcCorrect}/${cases.length})  지연 ${kcUs.toFixed(1)}µs/문장  비용 $0`);

  if (LOCAL_ONLY) {
    console.log('\n(--local-only: LLM 비교는 건너뜀. `npm run bench` 또는 `npm run bench:gemini`로 실행)\n');
    return;
  }

  let call: (c: Case) => Promise<LlmRun>;
  if (PROVIDER === 'gemini') {
    geminiKey();
    console.log(`(${MODEL}에 ${cases.length}개 문장을 보내는 중. 무료 티어면 몇 분 걸릴 수 있음)`);
    call = gemini;
  } else {
    const client = new Anthropic();
    call = (c) => claude(client, c);
  }
  const runs = await pool(cases, CONCURRENCY, call);
  const llmCorrect = cases.filter((c, i) => correct(c, runs[i].answer)).length;
  const inTok = runs.reduce((s, r) => s + r.inputTokens, 0);
  const outTok = runs.reduce((s, r) => s + r.outputTokens, 0);
  const price = PRICE[MODEL];
  const cost = price ? (inTok * price[0] + outTok * price[1]) / 1e6 : NaN;
  const costText = price
    ? `비용 $${cost.toFixed(4)}`
    : '비용: 단가 미등록 (무료 티어면 $0, 유료 단가는 ai.google.dev/pricing)';
  const fallbackCount = runs.filter((r) => r.servedBy !== MODEL).length;

  console.log(
    `${MODEL.padEnd(20)} 정확도 ${pct(llmCorrect)} (${llmCorrect}/${cases.length})  ` +
      `지연 중앙값 ${median(runs.map((r) => r.ms)).toFixed(0)}ms/문장  ` +
      `${costText} (${cases.length}문장, 입력 ${inTok} / 출력 ${outTok} 토큰${PROVIDER === 'claude' ? `, effort ${EFFORT}` : ''})`,
  );
  if (fallbackCount) console.log(`  (거절 후 다른 모델이 답한 문장 ${fallbackCount}개)`);
  if (price) console.log(`  → 100만 문장 환산: ko-chrono $0 · ${MODEL} 약 $${((cost / cases.length) * 1e6).toFixed(0)}`);
  console.log(`  → 지연: ko-chrono가 약 ${Math.round((median(runs.map((r) => r.ms)) * 1000) / kcUs).toLocaleString()}배 빠름`);

  // 둘이 다르게 답한 문장
  console.log('\n다르게 답한 문장 (✓ = 기대값과 일치)');
  cases.forEach((c, i) => {
    const a = correct(c, kcAnswers[i]), b = correct(c, runs[i].answer);
    if (a === b) return;
    const show = (x: Answer) => `${x.start ?? '-'} ~ ${x.end ?? '-'}`;
    console.log(`  ${c.text}`);
    console.log(`    기대 ${show(expected(c))}`);
    console.log(`    ko-chrono ${a ? '✓' : '✗'} ${show(kcAnswers[i])}   ${MODEL} ${b ? '✓' : '✗'} ${show(runs[i].answer)}`);
  });
  console.log();
}

main().catch((e: unknown) => {
  console.error(`\n${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
});
