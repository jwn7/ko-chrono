import type { Fragment, Parser } from '../types.js';

const WORDS: Record<string, number> = {
  재작년: -2, 작년: -1, 지난해: -1, 올해: 0, 금년: 0, 내년: 1, 명년: 1, 내후년: 2,
};

// "올해 말", "내년 초", "작년", "재작년", "내후년", "지난해", "내년 이맘때", "연말", "연초"
const RE = /(재작년|작년|지난해|올해|금년|내후년|내년|명년)(?:\s*(초|말|이맘때))?|(?<![가-힣])(연말(?!정산)|연초)/g;

/** 올해/내년/작년 (초/말) */
export const relativeYear: Parser = (text) => {
  const out: Fragment[] = [];
  for (const m of text.matchAll(RE)) {
    if (m[3]) {
      // "연초"는 연도가 없으므로 지난 월일 → 내년 규칙(13)을 따른다
      const c: Fragment['components'] =
        m[3] === '연초' ? { month: 1, monthPart: 'start' } : { month: 12, monthPart: 'end' };
      out.push({ text: m[0], index: m.index!, components: c });
      continue;
    }
    const c: Fragment['components'] = { yearOffset: WORDS[m[1]] };
    if (m[2] === '초') Object.assign(c, { month: 1, monthPart: 'start' });
    if (m[2] === '말') Object.assign(c, { month: 12, monthPart: 'end' });
    if (m[2] === '이맘때') c.sameDay = true;
    out.push({ text: m[0], index: m.index!, components: c });
  }
  return out;
};
