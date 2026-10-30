import type { Fragment, Parser } from '../types.js';
import { parseKoreanNumber } from '../util/number.js';

// "오후 3시", "3시 반", "오전 10시 30분", "새벽 2시", "저녁 7시", "낮 12시", "15시"
const CLOCK =
  /(오전|오후|새벽|아침|저녁|밤|낮|정오)?\s*(\d{1,2}|한|두|세|네|다섯|여섯|일곱|여덟|아홉|열|열한|열두)\s*시\s*(반|(\d{1,2})\s*분)?/g;
// "15:30", "3:00"
const COLON = /(?<!\d)(\d{1,2}):(\d{2})(?!\d)/g;
// 단독 시간 단어
const WORD = /(정오|자정|점심|아침|저녁|밤)(?!\s*\d)/g;
const WORD_HOUR: Record<string, number> = { 정오: 12, 자정: 0, 점심: 12, 아침: 8, 저녁: 19, 밤: 21 };

function applyMeridiem(prefix: string | undefined, hour: number): number {
  if (hour === 24) return 0;
  switch (prefix) {
    case '밤':
      // 밤 12시 = 자정
      return hour === 12 ? 0 : hour < 12 ? hour + 12 : hour;
    case '오후':
    case '저녁':
    case '낮':
      return hour < 12 ? hour + 12 : hour;
    case '오전':
    case '새벽':
    case '아침':
      return hour === 12 ? 0 : hour;
    case '정오':
      return 12;
    default:
      return hour;
  }
}

/** 시각 표현 */
export const time: Parser = (text) => {
  const out: Fragment[] = [];
  const taken: Array<[number, number]> = [];
  const take = (i: number, len: number) => {
    if (taken.some(([s, e]) => i < e && i + len > s)) return false;
    taken.push([i, i + len]);
    return true;
  };

  for (const m of text.matchAll(CLOCK)) {
    const raw = parseKoreanNumber(m[2]);
    if (raw == null || raw > 24) continue;
    if (!take(m.index!, m[0].length)) continue;
    const hour = applyMeridiem(m[1], raw);
    let minute = 0;
    if (m[3] === '반') minute = 30;
    else if (m[4]) minute = +m[4];
    const c: Fragment['components'] = { hour, minute };
    if (raw === 24 || (m[1] === '밤' && raw === 12)) c.midnight = true;
    out.push({ text: m[0], index: m.index!, components: c });
  }
  for (const m of text.matchAll(COLON)) {
    if (!take(m.index!, m[0].length)) continue;
    const hour = +m[1], minute = +m[2];
    if (hour > 23 || minute > 59) continue;
    out.push({ text: m[0], index: m.index!, components: { hour, minute } });
  }
  for (const m of text.matchAll(WORD)) {
    if (!take(m.index!, m[0].length)) continue;
    const c: Fragment['components'] = { hour: WORD_HOUR[m[1]], minute: 0 };
    if (m[1] === '자정') c.midnight = true;
    out.push({ text: m[0], index: m.index!, components: c });
  }
  return out;
};
