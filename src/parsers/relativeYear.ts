import type { Fragment, Parser } from '../types.js';

const WORDS: Record<string, number> = {
  재작년: -2, 작년: -1, 지난해: -1, 올해: 0, 금년: 0, 내년: 1, 명년: 1, 내후년: 2,
};

// "올해 말", "내년 초", "작년", "재작년", "내후년", "지난해"
const RE = /(재작년|작년|지난해|올해|금년|내후년|내년|명년)(?:\s*(초|말))?/g;

/** 올해/내년/작년 (초/말) */
export const relativeYear: Parser = (text) => {
  const out: Fragment[] = [];
  for (const m of text.matchAll(RE)) {
    const c: Fragment['components'] = { yearOffset: WORDS[m[1]] };
    if (m[2] === '초') Object.assign(c, { month: 1, monthPart: 'start' });
    if (m[2] === '말') Object.assign(c, { month: 12, monthPart: 'end' });
    out.push({ text: m[0], index: m.index!, components: c });
  }
  return out;
};
