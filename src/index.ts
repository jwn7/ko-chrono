import type { Components, Fragment, ParseOptions, ParseResult } from './types.js';
import { relativeDay } from './parsers/relativeDay.js';
import { offset } from './parsers/offset.js';
import { weekday } from './parsers/weekday.js';
import { absoluteDate } from './parsers/absoluteDate.js';
import { relativeMonth } from './parsers/relativeMonth.js';
import { relativeYear } from './parsers/relativeYear.js';
import { time } from './parsers/time.js';
import { alignEnd, groupFragments, isDayOnly, isTimeOnly, merge, resolve } from './resolve.js';

export type { ParseOptions, ParseResult, WeekStart } from './types.js';

const PARSERS = [relativeDay, offset, weekday, absoluteDate, relativeMonth, relativeYear, time];

// "~까지" / "~부터" 접미 감지. "3시~5시"의 "~"도 시작 표시로 본다
const UNTIL = /^\s*(까지|이내|안에|안으로|내로|중으로)/;
const FROM = /^\s*(부터|~)\s*/;

function withDefaults(opts?: ParseOptions): Required<ParseOptions> {
  return {
    referenceDate: opts?.referenceDate ?? new Date(),
    weekStart: opts?.weekStart ?? 'monday',
    defaultHour: opts?.defaultHour ?? 0,
  };
}

/** 겹치는 조각 제거: 더 긴 것 우선 */
function dedupe(frags: Fragment[]): Fragment[] {
  const sorted = [...frags].sort((a, b) => b.text.length - a.text.length);
  const kept: Fragment[] = [];
  for (const f of sorted) {
    const s = f.index, e = f.index + f.text.length;
    if (kept.some((k) => s < k.index + k.text.length && e > k.index)) continue;
    kept.push(f);
  }
  return kept;
}

/**
 * 문장에서 모든 날짜/시간 표현을 찾는다. 등장 순서대로 반환하며, 없으면 빈 배열.
 *
 * @example
 * parseAll('내일 10시 아니면 모레 2시');
 * // → [{ date: 내일 10:00, text: '내일 10시', ... }, { date: 모레 02:00, text: '모레 2시', ... }]
 *
 * @example
 * parseAll('11월 1일부터 11월 3일까지');
 * // → [{ date: 11-01 00:00, end: 11-03 00:00, ... }]  "A부터 B까지"는 하나의 구간으로 합쳐진다
 */
export function parseAll(text: string, options?: ParseOptions): ParseResult[] {
  const opts = withDefaults(options);
  const frags = dedupe(PARSERS.flatMap((p) => p(text)));
  const groups = groupFragments(frags, text);
  const results: ParseResult[] = [];
  const comps: Components[] = [];

  for (const g of groups) {
    const last = g[g.length - 1];
    const tail = text.slice(last.index + last.text.length);
    const until = UNTIL.exec(tail);
    if (until) last.components.isEnd = true;
    if (FROM.test(tail)) last.components.isStart = true;

    const r = resolve(g, opts);
    if (!r) continue;
    let end = (r as ParseResult & { _end: number })._end;
    if (until) end += until[0].length;
    delete (r as Partial<ParseResult & { _end: number }>)._end;
    r.index = g[0].index;
    r.text = text.slice(g[0].index, end).trim();
    results.push(r);
    comps.push(merge(g.map((f) => f.components)));
  }

  // "A부터 B까지", "A~B" → 하나의 구간으로 합침
  const merged: ParseResult[] = [];
  for (let i = 0; i < results.length; i++) {
    const a = results[i], b = results[i + 1];
    const from = FROM.exec(text.slice(a.index + a.text.length));
    // "~"는 바로 뒤에 B가 붙어 있을 때만. "부터"는 B가 "까지"로 끝날 때만
    const tilde = from?.[1] === '~' && b?.index === a.index + a.text.length + from[0].length;
    if (b && from && (b.end || tilde)) {
      const bc = comps[i + 1];
      let end = b.end ?? b.date;
      if (isTimeOnly(bc)) {
        end = alignEnd(a.date, bc);
      } else {
        // "11월 1일부터 3일까지": 끝에 일만 있으면 시작의 연월을 이어받는다
        // ("11월 28일부터 2일까지"처럼 시작보다 이르면 다음 달)
        if (isDayOnly(bc)) {
          const y = a.date.getFullYear(), m0 = a.date.getMonth();
          end = new Date(y, m0, bc.day!, end.getHours(), end.getMinutes());
          if (end < a.date) end = new Date(y, m0 + 1, bc.day!, end.getHours(), end.getMinutes());
        }
        if (!b.end && !b.hasTime) end = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59);
      }
      merged.push({ ...a, end, text: text.slice(a.index, b.index + b.text.length).trim() });
      i++;
    } else {
      merged.push(a);
    }
  }
  return merged;
}

/**
 * 문장에서 첫 번째 날짜/시간 표현을 찾는다. 없으면 null.
 *
 * @example
 * parse('그럼 다음주 수요일 저녁 7시에 강남에서 볼까?');
 * // → { date: 다음주 수요일 19:00, text: '다음주 수요일 저녁 7시', index: 3, hasTime: true }
 *
 * @example
 * parse('이번달 말까지 보내주세요');
 * // → { date: 기준 시각, end: 이번달 마지막날 23:59, text: '이번달 말까지', hasTime: false, ... }
 *
 * @example
 * parse('오후 3시', { referenceDate: new Date(2026, 9, 30, 14) });
 * // → 2026-10-30 15:00 (시간만 있으면 오늘, 이미 지났으면 내일)
 */
export function parse(text: string, options?: ParseOptions): ParseResult | null {
  return parseAll(text, options)[0] ?? null;
}

/**
 * parse()의 date만 돌려주는 단축형. 구간이면 시작 시각.
 *
 * @example
 * parseDate('다음주 화요일 오후 3시'); // → Date
 * parseDate('아무 날짜도 없음');       // → null
 */
export function parseDate(text: string, options?: ParseOptions): Date | null {
  return parse(text, options)?.date ?? null;
}
