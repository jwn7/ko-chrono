import type { Components, Fragment, Parser } from '../types.js';
import { parseKoreanNumber } from '../util/number.js';

// "3일간", "일주일 동안", "2주간", "한 달간", "2시간 동안", "90분간", "이틀간"
const RE =
  /(?:(\d+|[일이삼사오육칠팔구십한두세네다섯여섯일곱여덟아홉열]+)\s*(일|주|주일|달|개월|시간|분)|(보름|열흘|이틀|사흘|나흘|닷새|엿새|이레|여드레|아흐레))\s*(간|동안)/g;
// "3박 4일" → 4일
const NIGHTS = /(\d+)\s*박\s*(\d+)\s*일/g;

/** 기간 표현. 날짜를 계산하지 않고 길이만 뽑는다. "A부터 N일간"으로 쓰일 때 resolve가 end를 만든다. */
export const duration: Parser = (text) => {
  const out: Fragment[] = [];
  for (const m of text.matchAll(NIGHTS)) {
    out.push({ text: m[0], index: m.index!, components: { durationDays: +m[2] } });
  }
  for (const m of text.matchAll(RE)) {
    const n = parseKoreanNumber(m[3] ?? m[1]);
    if (n == null) continue;
    const c: Components = {};
    switch (m[3] ? '일' : m[2]) {
      case '일':
        c.durationDays = n;
        break;
      case '주':
      case '주일':
        c.durationDays = n * 7;
        break;
      case '달':
      case '개월':
        c.durationMonths = n;
        break;
      case '시간':
        c.durationMinutes = n * 60;
        break;
      case '분':
        c.durationMinutes = n;
        break;
    }
    out.push({ text: m[0], index: m.index!, components: c });
  }
  return out;
};
