import type { Components, Fragment, Parser } from '../types.js';
import { parseKoreanNumber } from '../util/number.js';

// "3일 뒤", "2주 후", "한 달 전", "세 시간 뒤", "30분 후", "열흘 뒤", "이틀 뒤", "1년 뒤", "30분 내로", "30분쯤 뒤"
const RE =
  /(?:(\d+|[일이삼사오육칠팔구십한두세네다섯여섯일곱여덟아홉열]+)\s*(일|주|주일|달|개월|년|시간|분)|(보름|열흘|이틀|사흘|나흘|닷새|엿새|이레|여드레|아흐레))\s*(?:쯤|정도)?\s*(뒤|후|전|이내|안에|안으로|내로|이후)/g;

// "한 시간 반 뒤", "1시간 30분 후", "2시간반 전"
const HOUR_MIN =
  /(\d+|[일이삼사오육칠팔구십한두세네다섯여섯일곱여덟아홉열]+)\s*시간\s*(?:(반)|(\d+)\s*분)\s*(?:쯤|정도)?\s*(뒤|후|전|이내|안에|이후)/g;

/** "N일 뒤 / N주 후 / N달 전 / N시간 뒤 / N분 후" */
export const offset: Parser = (text) => {
  const out: Fragment[] = [];
  const taken: Array<[number, number]> = [];
  for (const m of text.matchAll(HOUR_MIN)) {
    const h = parseKoreanNumber(m[1]);
    if (h == null) continue;
    const sign = m[4] === '전' ? -1 : 1;
    const c: Components = { hourOffset: sign * h, minuteOffset: sign * (m[2] ? 30 : +m[3]) };
    if (m[4] === '이내' || m[4] === '안에') c.isEnd = true;
    out.push({ text: m[0], index: m.index!, components: c });
    taken.push([m.index!, m.index! + m[0].length]);
  }
  for (const m of text.matchAll(RE)) {
    if (taken.some(([s, e]) => m.index! < e && m.index! + m[0].length > s)) continue;
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
      case '년':
        c.yearOffset = sign * n;
        c.sameDay = true;
        break;
      case '시간':
        c.hourOffset = sign * n;
        break;
      case '분':
        c.minuteOffset = sign * n;
        break;
    }
    if (['이내', '안에', '안으로', '내로'].includes(m[4])) c.isEnd = true;
    out.push({ text: m[0], index: m.index!, components: c });
  }
  return out;
};
