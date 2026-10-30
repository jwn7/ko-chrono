import type { Fragment, ParseOptions, ParseResult } from './types.js';
import { relativeDay } from './parsers/relativeDay.js';
import { offset } from './parsers/offset.js';
import { weekday } from './parsers/weekday.js';
import { absoluteDate } from './parsers/absoluteDate.js';
import { relativeMonth } from './parsers/relativeMonth.js';
import { relativeYear } from './parsers/relativeYear.js';
import { time } from './parsers/time.js';
import { groupFragments, resolve } from './resolve.js';

export type { ParseOptions, ParseResult, WeekStart } from './types.js';

const PARSERS = [relativeDay, offset, weekday, absoluteDate, relativeMonth, relativeYear, time];

// "~까지" / "~부터" 접미 감지
const UNTIL = /^\s*(까지|이내|안에)/;
const FROM = /^\s*부터/;

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

/** 문장에서 모든 날짜/시간 표현을 찾는다. */
export function parseAll(text: string, options?: ParseOptions): ParseResult[] {
  const opts = withDefaults(options);
  const frags = dedupe(PARSERS.flatMap((p) => p(text)));
  const groups = groupFragments(frags, text);
  const results: ParseResult[] = [];

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
  }

  // "A부터 B까지" → 하나의 구간으로 합침
  const merged: ParseResult[] = [];
  for (let i = 0; i < results.length; i++) {
    const a = results[i], b = results[i + 1];
    const aTail = text.slice(a.index + a.text.length);
    if (b && FROM.test(aTail) && b.end) {
      merged.push({ ...a, end: b.end, text: text.slice(a.index, b.index + b.text.length).trim() });
      i++;
    } else {
      merged.push(a);
    }
  }
  return merged;
}

/** 문장에서 첫 번째 날짜/시간 표현을 찾는다. 없으면 null. */
export function parse(text: string, options?: ParseOptions): ParseResult | null {
  return parseAll(text, options)[0] ?? null;
}

/** parse()의 날짜만 돌려주는 단축형 */
export function parseDate(text: string, options?: ParseOptions): Date | null {
  return parse(text, options)?.date ?? null;
}
