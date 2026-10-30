import type { Fragment, Parser } from '../types.js';

const WEEKDAY: Record<string, number> = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };
const WEEK_WORDS: Record<string, number> = {
  지지난: -2, 저저번: -2, 지난: -1, 저번: -1, 이번: 0, 다음: 1, 다다음: 2, 담: 1,
};

// "이번 주말", "다음주말", "지난 주말" → 그 주의 토요일
const WEEKEND = /(지지난|저저번|지난|저번|이번|다다음|다음|담)\s*주말/g;
// "주말에 보자" ("이번 주말"은 위 WEEKEND가 먼저 잡는다)
const BARE_WEEKEND = /(?<![가-힣])주말/g;
// "다음주 화요일", "이번 주 금", "다다음주 월요일", "담주 수요일"
const WITH_WEEK = /(지지난|저저번|지난|저번|이번|다다음|다음|담)\s*주\s*(월|화|수|목|금|토|일)(요일)?/g;
// "화요일" 단독 (요일 글자만은 오탐이 많아 '요일'까지 요구)
const BARE = /(?<![가-힣])(월|화|수|목|금|토|일)요일/g;
// "다음주", "이번주" 단독 (요일 없음) → 그 주의 시작 요일
const WEEK_ONLY = /(지지난|저저번|지난|저번|이번|다다음|다음|담)\s*주(?!\s*(월|화|수|목|금|토|일))/g;

/** 요일 관련 표현 */
export const weekday: Parser = (text) => {
  const out: Fragment[] = [];
  const taken: Array<[number, number]> = [];
  const overlaps = (i: number, len: number) => taken.some(([s, e]) => i < e && i + len > s);

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
    out.push({ text: m[0], index: m.index!, components: { weekOffset: WEEK_WORDS[m[1]] } });
  }
  return out;
};
