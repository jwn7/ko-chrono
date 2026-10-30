import type { Fragment, Parser } from '../types.js';

const WEEKDAY: Record<string, number> = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };
const WEEK_WORDS: Record<string, number> = {
  지지난: -2, 저저번: -2, 지난: -1, 저번: -1, 이번: 0, 다음: 1, 다다음: 2, 다담: 2, 담: 1,
};
const WEEK_WORD = '지지난|저저번|지난|저번|이번|다다음|다음|다담|담';
const DAY = '월|화|수|목|금|토|일';

// "이번 주말", "다음주말", "지난 주말" → 그 주의 토요일
const WEEKEND = new RegExp(`(${WEEK_WORD})\\s*주말`, 'g');
// "월~금", "화~목요일" → 두 조각 (index.ts가 "~"로 구간을 합친다)
const RANGE = new RegExp(`(?<![\\d가-힣])(${DAY})\\s*~\\s*((${DAY})(?:요일|욜)?)(?![가-힣])`, 'g');
// "11/3(화)", "11월 5일 (목)" 뒤에 붙는 요일 표시
const PAREN = new RegExp(`\\((${DAY})\\)`, 'g');
// "지난 금요일" = 오늘 제외 가장 가까운 과거, "다음 금요일" = 오늘 제외 가장 가까운 미래
const DIR = new RegExp(`(지난|저번|다음)\\s*(${DAY})(?:요일|욜)`, 'g');
// "주말에 보자" ("이번 주말"은 위 WEEKEND가 먼저 잡는다)
const BARE_WEEKEND = /(?<![가-힣])주말/g;
// "다음주 화요일", "이번 주 금", "다다음주 월요일", "담주 월욜"
const WITH_WEEK = new RegExp(`(${WEEK_WORD})\\s*주\\s*(${DAY})(요일|욜)?`, 'g');
// "화요일", "화욜" 단독 (요일 글자만은 오탐이 많아 '요일'/'욜'까지 요구)
const BARE = /(?<![가-힣])(월|화|수|목|금|토|일)(?:요일|욜)/g;
// "다음주", "이번주" 단독 (요일 없음) → 그 주의 시작 요일
const WEEK_ONLY = new RegExp(`(${WEEK_WORD})\\s*주(\\s*이맘때)?(?!\\s*(${DAY}))`, 'g');

/** 요일 관련 표현 */
export const weekday: Parser = (text) => {
  const out: Fragment[] = [];
  const taken: Array<[number, number]> = [];
  const overlaps = (i: number, len: number) => taken.some(([s, e]) => i < e && i + len > s);

  for (const m of text.matchAll(RANGE)) {
    const bIndex = m.index! + m[0].length - m[2].length;
    out.push({ text: m[1], index: m.index!, components: { weekday: WEEKDAY[m[1]] } });
    out.push({ text: m[2], index: bIndex, components: { weekday: WEEKDAY[m[3]] } });
    taken.push([m.index!, m.index! + m[0].length]);
  }
  for (const m of text.matchAll(PAREN)) {
    out.push({ text: m[0], index: m.index!, components: { weekday: WEEKDAY[m[1]] } });
    taken.push([m.index!, m.index! + m[0].length]);
  }
  for (const m of text.matchAll(DIR)) {
    const dir = m[1] === '다음' ? 'next' : 'past';
    out.push({ text: m[0], index: m.index!, components: { weekday: WEEKDAY[m[2]], weekdayDir: dir } });
    taken.push([m.index!, m.index! + m[0].length]);
  }
  for (const m of text.matchAll(WEEKEND)) {
    out.push({ text: m[0], index: m.index!, components: { weekOffset: WEEK_WORDS[m[1]], weekday: 6 } });
    taken.push([m.index!, m.index! + m[0].length]);
  }
  for (const m of text.matchAll(BARE_WEEKEND)) {
    if (overlaps(m.index!, m[0].length)) continue;
    out.push({ text: m[0], index: m.index!, components: { weekday: 6, weekend: true } });
    taken.push([m.index!, m.index! + m[0].length]);
  }
  for (const m of text.matchAll(WITH_WEEK)) {
    if (overlaps(m.index!, m[0].length)) continue;
    out.push({
      text: m[0],
      index: m.index!,
      components: { weekOffset: WEEK_WORDS[m[1]], weekday: WEEKDAY[m[2]] },
    });
    taken.push([m.index!, m.index! + m[0].length]);
  }
  for (const m of text.matchAll(BARE)) {
    if (overlaps(m.index!, m[0].length)) continue;
    out.push({ text: m[0], index: m.index!, components: { weekday: WEEKDAY[m[1]] } });
    taken.push([m.index!, m.index! + m[0].length]);
  }
  for (const m of text.matchAll(WEEK_ONLY)) {
    if (overlaps(m.index!, m[0].length)) continue;
    const c: Fragment['components'] = { weekOffset: WEEK_WORDS[m[1]] };
    if (m[2]) c.sameDay = true;
    out.push({ text: m[0], index: m.index!, components: c });
  }
  return out;
};
