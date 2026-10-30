import type { Fragment, Parser } from '../types.js';

const WORDS: Record<string, number> = {
  그저께: -2,
  그제: -2,
  어제: -1,
  오늘: 0,
  내일: 1,
  모레: 2,
  글피: 3,
};

const RE = /(그저께|그제|어제|오늘|내일|모레|글피)/g;

/** 오늘/내일/모레/글피/어제/그저께 */
export const relativeDay: Parser = (text) => {
  const out: Fragment[] = [];
  for (const m of text.matchAll(RE)) {
    out.push({ text: m[0], index: m.index!, components: { dayOffset: WORDS[m[1]] } });
  }
  return out;
};
