import type { Fragment, Parser } from '../types.js';
import { parseKoreanNumber } from '../util/number.js';

// 2026년 11월 5일 / 26년 11월 5일 / 11월 5일 / 11/5 / 2026-11-05 / 26.11.5 / 11.5(월일로 해석)
const FULL = /(?:(?<!\d)(\d{4}|\d{2})\s*년\s*)?(\d{1,2})\s*월\s*(\d{1,2})\s*일(?!간|\s*동안)/g;
// "2027-01-01T09:00" (ISO 8601 날짜+시각)
const ISO = /(?<![\d/.-])(\d{4}|\d{2})[-./]\s*(\d{1,2})[-./]\s*(\d{1,2})(?!\d)(?:T(\d{2}):(\d{2}))?/g;
const SLASH = /(?<![\d/.-])(\d{1,2})\s*[/.]\s*(\d{1,2})(?![\d/.:])/g;
// "십일월 오일", "유월 이십오일" (오탐 방지를 위해 월과 일이 모두 있을 때만)
const HANGUL = /(?<![가-힣])(유|시|[일이삼사오육칠팔구십]{1,2})월\s*([일이삼사오육칠팔구십]{1,3})일(?!요일)/g;
const HANGUL_MONTH: Record<string, number> = { 유: 6, 시: 10 };
// "2027년" 단독 (월이 뒤따르지 않을 때). "26년"은 "26년 동안" 오탐이 있어 4자리만
const YEAR_ONLY = /(?<!\d)((?:19|20)\d{2})\s*년(?!\s*\d{1,2}\s*월)/g;
// "11월" 단독, "5일" 단독
const MONTH_ONLY = /(?<![\d가-힣])(\d{1,2})\s*월(?!\s*\d{1,2}\s*일|생|세)/g;
// "5일간", "3일 동안", "3박 4일"은 기간이지 날짜가 아니다
const DAY_ONLY = /(?<!\d)(?<!\d\s*박\s*)(\d{1,2})\s*일(?!요일|간|장|째|차|분|\s*동안|\s*연속)/g;

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
    const c: Fragment['components'] = { year: expandYear(m[1]), month, day };
    if (m[4] && +m[4] < 24 && +m[5] < 60) Object.assign(c, { hour: +m[4], minute: +m[5], meridiem: true });
    out.push({ text: m[0], index: m.index!, components: c });
  }
  for (const m of text.matchAll(FULL)) {
    if (!take(m.index!, m[0].length)) continue;
    const c: Fragment['components'] = { month: +m[2], day: +m[3] };
    if (m[1]) c.year = expandYear(m[1]);
    out.push({ text: m[0], index: m.index!, components: c });
  }
  for (const m of text.matchAll(HANGUL)) {
    const month = HANGUL_MONTH[m[1]] ?? parseKoreanNumber(m[1]);
    const day = parseKoreanNumber(m[2]);
    if (month == null || day == null || month < 1 || month > 12 || day < 1 || day > 31) continue;
    if (!take(m.index!, m[0].length)) continue;
    out.push({ text: m[0], index: m.index!, components: { month, day } });
  }
  for (const m of text.matchAll(SLASH)) {
    if (!take(m.index!, m[0].length)) continue;
    const month = +m[1], day = +m[2];
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;
    out.push({ text: m[0], index: m.index!, components: { month, day } });
  }
  for (const m of text.matchAll(YEAR_ONLY)) {
    if (!take(m.index!, m[0].length)) continue;
    out.push({ text: m[0], index: m.index!, components: { year: +m[1] } });
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
