import { describe, it, expect } from 'vitest';
import { parseAll, parseEvent } from '../src/index.js';

// 무작위 문장으로 "절대 죽지 않기"를 확인한다. 기대값이 아니라 항상 지켜야 하는 성질(불변식)만 본다.
// 시드가 고정이라 실패하면 같은 문장으로 다시 재현된다.

const ref = new Date(2026, 9, 30, 14, 0);

// mulberry32: 작은 결정적 난수
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PIECES = [
  // 날짜·시간 조각
  '내일', '모레', '어제', '오늘', '다음주', '지난주', '이번 주', '담주', '월요일', '금욜', '월', '수', '주말', '평일',
  '오전', '오후', '새벽', '저녁', '밤', '정오', '자정', '3시', '12시', '24시', '25시', '0시', '세 시', '열두시', '반',
  '15:30', '99:99', '3pm', '11월', '13월', '31일', '0일', '2월 30일', '11/5', '26.11.5', '2027-02-29', '2028년',
  '3일', '이틀', '2주', '한 달', '1년', '30분', '한 시간 반', '뒤', '후', '전', '이내', '까지', '부터', '~', '간', '동안',
  '매주', '매달', '격주', '매일', '마다', '첫째 주', '마지막 주', '이맘때', '이 시간', '크리스마스', '설날', '추석', '설 연휴',
  '전날', '다음날', '말', '초', '중순', '연말', '내년', '작년', '쯤', '경',
  // 조사·잡음
  '에', '은', '는', '도', '이나', '아니면', ',', '.', '?', '!', ' ', '  ', '(', ')', '(화)', '/', '-', ':',
  '회의', '치과', '보고서', '설명', '설거지', '내가 낼게', '3명', '1월생', '오일', 'ㅋㅋ', '😀', 'abc', '123456', '',
];

function sentence(next: () => number): string {
  const n = 1 + Math.floor(next() * 8);
  let s = '';
  for (let i = 0; i < n; i++) s += PIECES[Math.floor(next() * PIECES.length)] + (next() < 0.6 ? ' ' : '');
  return s;
}

const valid = (d: Date) => d instanceof Date && !Number.isNaN(d.getTime());

describe('무작위 문장 불변식', () => {
  const next = rng(20261030);
  const inputs = Array.from({ length: 3000 }, () => sentence(next));

  it('3000개 문장에서 에러 없이, 결과는 항상 일관된다', () => {
    const bad: string[] = [];
    for (const text of inputs) {
      try {
        for (const r of parseAll(text, { referenceDate: ref })) {
          if (!valid(r.date)) bad.push(`Invalid date: ${JSON.stringify(text)}`);
          if (r.end && !valid(r.end)) bad.push(`Invalid end: ${JSON.stringify(text)}`);
          if (r.ambiguity?.alternatives.some((a) => !valid(a))) bad.push(`Invalid alternative: ${JSON.stringify(text)}`);
          if (r.end && r.end < r.date) bad.push(`end < date: ${JSON.stringify(text)} → ${r.date.toISOString()} ~ ${r.end.toISOString()}`);
          if (text.slice(r.index, r.index + r.text.length) !== r.text)
            bad.push(`text/index 불일치: ${JSON.stringify(text)} index=${r.index} text=${JSON.stringify(r.text)}`);
          if (r.text !== r.text.trim() || r.text === '') bad.push(`text 공백/빈값: ${JSON.stringify(text)}`);
        }
        const e = parseEvent(text, { referenceDate: ref });
        if (e.date && !valid(e.date)) bad.push(`parseEvent invalid: ${JSON.stringify(text)}`);
      } catch (err) {
        bad.push(`throw: ${JSON.stringify(text)} → ${(err as Error).message}`);
      }
    }
    expect(bad.slice(0, 20)).toEqual([]);
  });

  it('timezone 옵션에서도 에러가 없다', () => {
    for (const text of inputs.slice(0, 500)) {
      for (const r of parseAll(text, { referenceDate: ref, timezone: 'America/New_York' })) {
        expect(valid(r.date)).toBe(true);
      }
    }
  });
});
