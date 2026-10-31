import type { Fragment, Parser } from '../types.js';

const WORDS: Record<string, number> = { 지난: -1, 저번: -1, 이번: 0, 다음: 1, 다다음: 2, 담: 1 };
const PART: Record<string, 'start' | 'middle' | 'end'> = { 초: 'start', 중순: 'middle', 말: 'end' };

// "이번달 말", "다음 달 초", "이번달 중순", "다음달", "다음달 이맘때", "월초", "월말"
const RE = /(지난|저번|이번|다다음|다음|담)\s*달\s*(초|중순|말|이맘때)?|(?<![가-힣])월(초|말)/g;
// "11월 말", "12월 초" (absoluteDate의 MONTH_ONLY와 겹치지만 part가 있는 경우 우선)
const ABS_PART = /(?<![\d가-힣])(\d{1,2})\s*월\s*(초|중순|말)/g;

// 업무용 한자어 달 (규칙 33): "익월 초", "금월 말까지", "전월 실적". "전월세"는 제외
const FORMAL_MONTH = /(?<![가-힣])(금|익|차|전)월(?!세)(?:\s*(초|중순|말))?/g;
const FORMAL_MONTH_OFFSET: Record<string, number> = { 금: 0, 익: 1, 차: 1, 전: -1 };

/** 이번달/다음달 (초/중순/말) */
export const relativeMonth: Parser = (text) => {
  const out: Fragment[] = [];
  for (const m of text.matchAll(RE)) {
    if (m[3]) {
      out.push({ text: m[0], index: m.index!, components: { monthOffset: 0, monthPart: PART[m[3]] } });
      continue;
    }
    const c: Fragment['components'] = { monthOffset: WORDS[m[1]] };
    if (m[2] === '이맘때') c.sameDay = true;
    else if (m[2]) c.monthPart = PART[m[2]];
    out.push({ text: m[0], index: m.index!, components: c });
  }
  for (const m of text.matchAll(FORMAL_MONTH)) {
    const c: Fragment['components'] = { monthOffset: FORMAL_MONTH_OFFSET[m[1]] };
    if (m[2]) c.monthPart = PART[m[2]];
    out.push({ text: m[0], index: m.index!, components: c });
  }
  for (const m of text.matchAll(ABS_PART)) {
    out.push({ text: m[0], index: m.index!, components: { month: +m[1], monthPart: PART[m[2]] } });
  }
  return out;
};
