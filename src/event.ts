import type { Ambiguity, ParseResult, Recurrence } from './types.js';

/** parseEvent()의 결과: 할 일·일정 한 줄을 제목과 시점으로 나눈 것 */
export interface ParsedEvent {
  /** 날짜 부분을 뺀 나머지 ("내일 3시 치과" → "치과"). 없으면 '' */
  title: string;
  /** 첫 번째 날짜 표현의 date. 날짜가 없으면 null */
  date: Date | null;
  /** 구간의 끝이나 마감 */
  end?: Date;
  hasTime: boolean;
  /** 반복 일정이면 그 규칙 */
  recurrence?: Recurrence;
  /** 해석이 갈릴 수 있으면 그 이유와 다른 후보 ("3시" → 15시, 후보 3시) */
  ambiguity?: Ambiguity;
}

// 날짜 바로 뒤에 붙은 조사: "3시에", "모레까지는", "주말엔"
const TRAILING_PARTICLE = /^(?:에는|에도|에|엔|은|는|도|까지는|까지|부터|쯤|께|경)(?=[\s,.!?]|$)/;

/**
 * 문장에서 날짜로 인식된 부분과 거기 붙은 조사를 빼서 제목을 만든다 (규칙 28).
 * 장소("강남역에서")나 동사("만나기")는 그대로 남긴다.
 */
export function toEvent(text: string, results: ParseResult[]): ParsedEvent {
  let rest = text;
  // 뒤에서부터 지워야 앞쪽 index가 어긋나지 않는다
  for (const r of [...results].sort((a, b) => b.index - a.index)) {
    const after = rest.slice(r.index + r.text.length);
    const particle = TRAILING_PARTICLE.exec(after)?.[0] ?? '';
    rest = rest.slice(0, r.index) + ' ' + after.slice(particle.length);
  }
  const title = rest
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?])/g, '$1')
    .replace(/^[\s,]+|[\s,]+$/g, '');

  const first = results[0];
  if (!first) return { title, date: null, hasTime: false };
  const event: ParsedEvent = { title, date: first.date, hasTime: first.hasTime };
  if (first.end) event.end = first.end;
  if (first.recurrence) event.recurrence = first.recurrence;
  if (first.ambiguity) event.ambiguity = first.ambiguity;
  return event;
}
