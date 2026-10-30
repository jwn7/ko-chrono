import type { Fragment, Parser } from '../types.js';

// 2026년 11월 5일 / 26년 11월 5일 / 11월 5일 / 11/5 / 2026-11-05 / 26.11.5 / 11.5(월일로 해석)
const FULL = /(?:(?<!\d)(\d{4}|\d{2})\s*년\s*)?(\d{1,2})\s*월\s*(\d{1,2})\s*일/g;
const ISO = /(?<![\d/.-])(\d{4}|\d{2})[-./]\s*(\d{1,2})[-./]\s*(\d{1,2})(?!\d)/g;
const SLASH = /(?<![\d/.-])(\d{1,2})\s*[/.]\s*(\d{1,2})(?![\d/.:])/g;
// "11월" 단독, "5일" 단독
const MONTH_ONLY = /(?<![\d가-힣])(\d{1,2})\s*월(?!\s*\d{1,2}\s*일)/g;
const DAY_ONLY = /(?<!\d)(\d{1,2})\s*일(?!요일)/g;

/** 두 자리 연도 확장: 00~69 → 20xx, 70~99 → 19xx */
const expandYear = (y: string): number => {
  const n = +y;
  if (y.length !== 2) return n;
  return n < 70 ? 2000 + n : 1900 + n;
};

/** 절대 날짜 표현 */
export const absoluteDate: Parser = (text) => {
  const out: Fragment[] = [];
  const taken: Array<[number, number]> = [];
  const take = (i: number, len: number) => {
    if (taken.some(([s, e]) => i < e && i + len > s)) return false;
    taken.push([i, i + len]);
    return true;
  };

  for (const m of text.matchAll(ISO)) {
    const month = +m[2], day = +m[3];
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;
    if (!take(m.index!, m[0].length)) continue;
    out.push({ text: m[0], index: m.index!, components: { year: expandYear(m[1]), month, day } });
  }
  for (const m of text.matchAll(FULL)) {
    if (!take(m.index!, m[0].length)) continue;
    const c: Fragment['components'] = { month: +m[2], day: +m[3] };
    if (m[1]) c.year = expandYear(m[1]);
    out.push({ text: m[0], index: m.index!, components: c });
  }
  for (const m of text.matchAll(SLASH)) {
    if (!take(m.index!, m[0].length)) continue;
    const month = +m[1], day = +m[2];
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;
    out.push({ text: m[0], index: m.index!, components: { month, day } });
  }
  for (const m of text.matchAll(MONTH_ONLY)) {
    if (!take(m.index!, m[0].length)) continue;
    const month = +m[1];
    if (month < 1 || month > 12) continue;
    out.push({ text: m[0], index: m.index!, components: { month } });
  }
  for (const m of text.matchAll(DAY_ONLY)) {
    if (!take(m.index!, m[0].length)) continue;
    const day = +m[1];
    if (day < 1 || day > 31) continue;
    out.push({ text: m[0], index: m.index!, components: { day } });
  }
  return out;
};
