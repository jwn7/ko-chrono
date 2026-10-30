import type { Components, Fragment, Parser } from '../types.js';
import { parseKoreanNumber } from '../util/number.js';

// "3일 뒤", "2주 후", "한 달 전", "세 시간 뒤", "30분 후", "열흘 뒤"
const RE =
  /(?:(\d+|[일이삼사오육칠팔구십한두세네다섯여섯일곱여덟아홉열]+)\s*(일|주|주일|달|개월|시간|분)|(보름|열흘))\s*(뒤|후|전|이내|안에|이후)/g;

/** "N일 뒤 / N주 후 / N달 전 / N시간 뒤 / N분 후" */
export const offset: Parser = (text) => {
  const out: Fragment[] = [];
  for (const m of text.matchAll(RE)) {
    const n = parseKoreanNumber(m[3] ?? m[1]);
    if (n == null) continue;
    const sign = m[4] === '전' ? -1 : 1;
    const c: Components = {};
    switch (m[3] ? '일' : m[2]) {
      case '일':
        c.dayOffset = sign * n;
        break;
      case '주':
      case '주일':
        c.dayOffset = sign * n * 7;
        break;
      case '달':
      case '개월':
        c.monthOffset = sign * n;
        break;
      case '시간':
        c.hourOffset = sign * n;
        break;
      case '분':
        c.minuteOffset = sign * n;
        break;
    }
    if (m[4] === '이내' || m[4] === '안에') c.isEnd = true;
    out.push({ text: m[0], index: m.index!, components: c });
  }
  return out;
};
