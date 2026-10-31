import type { Fragment, Parser } from '../types.js';
import { parseKoreanNumber } from '../util/number.js';

// "오후 3시", "3시 반", "오전 10시 30분", "새벽 2시", "저녁 7시", "낮 12시", "15시", "7시30", "3시 정각"
const CLOCK =
  /(오전|오후|새벽|아침|저녁|밤|낮|정오)?\s*(\d{1,2}|한|두|세|네|다섯|여섯|일곱|여덟|아홉|열|열한|열두)\s*시(?!간)\s*(?:(반)|(\d{1,2})\s*분|(\d{2})(?![\d가-힣])|정각)?/g;
// "5시 10분 전" → 4:50
const BEFORE =
  /(오전|오후|새벽|아침|저녁|밤|낮)?\s*(\d{1,2}|한|두|세|네|다섯|여섯|일곱|여덟|아홉|열|열한|열두)\s*시\s*(\d{1,2})\s*분\s*전(?=[\s,에까]|$)/g;
// "오전 중으로", "오후 중에" → 그 시간대의 끝(12시/18시)까지
const HALF_DAY = /(오전|오후)\s*중(?!순)(?:으로|에는|에)?/g;
// "3pm", "9 AM", "12pm"
const AMPM = /(?<![\d:])(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?(?![a-z])/gi;
// "3~5시", "오후 3~5시" → "오후 3" + "5시" 두 조각 (index.ts가 "~"로 구간을 합친다)
const SHORT_RANGE =
  /(오전|오후|새벽|아침|저녁|밤|낮)?\s*(\d{1,2}|한|두|세|네|다섯|여섯|일곱|여덟|아홉|열|열한|열두)\s*~\s*((\d{1,2}|한|두|세|네|다섯|여섯|일곱|여덟|아홉|열|열한|열두)\s*시)/g;
// "15:30", "3:00", "오후 3:30"
const COLON = /(?:(오전|오후|새벽|아침|저녁|밤|낮)\s*)?(?<!\d)(\d{1,2}):(\d{2})(?!\d)/g;
// 단독 시간 단어. "낮"은 "낮다"와 겹쳐서 뒤에 공백/조사가 올 때만
const WORD = /(정오|자정|점심|아침|저녁|밤(?!새|낮)|퇴근|낮(?=[\s에,]|$))(?!\s*\d)/g;
// "내일 오후", "오전에" → 9시/15시 (규칙 25). 뒤에 조사·공백·끝만 허용하고,
// "오전반", "오후 반차", "오전오후"처럼 다른 낱말이 붙으면 잡지 않는다
const HALF_WORD = /(?<![가-힣])(오전|오후)(?=(?:에는|에|엔|은|는|도|쯤|께)?(?:[\s,.!?~]|$))(?!\s*(?:반|오전|오후|\d))/g;
const WORD_HOUR: Record<string, number> = {
  정오: 12, 자정: 0, 점심: 12, 아침: 8, 저녁: 19, 밤: 21, 퇴근: 18, 낮: 12, 오전: 9, 오후: 15,
};
// "내일 이 시간", "다음 주 이 시간" → 기준 시각의 시:분. "같이 시간 내자"는 잡지 않는다
const SAME_TIME = /(?<![가-힣])이\s*시간(?!대|\s*(?:뒤|후|전|동안|이내|안에))/g;

function applyMeridiem(prefix: string | undefined, hour: number): number {
  if (hour === 24) return 0;
  switch (prefix) {
    case '밤':
      // 밤 12시 = 자정, 밤 1~5시 = 새벽
      return hour === 12 ? 0 : hour <= 5 ? hour : hour < 12 ? hour + 12 : hour;
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

  for (const m of text.matchAll(SHORT_RANGE)) {
    const a = parseKoreanNumber(m[2]), b = parseKoreanNumber(m[4]);
    if (a == null || b == null || a > 24 || b > 24) continue;
    const bIndex = m.index! + m[0].length - m[3].length;
    if (!take(m.index!, m[0].length)) continue;
    const startText = m[0].slice(0, m[0].indexOf('~')).trimEnd();
    const start: Fragment['components'] = { hour: applyMeridiem(m[1], a), minute: 0 };
    if (m[1]) start.meridiem = true;
    out.push({ text: startText, index: m.index!, components: start });
    out.push({ text: m[3], index: bIndex, components: { hour: b === 24 ? 0 : b, minute: 0 } });
  }
  for (const m of text.matchAll(BEFORE)) {
    const raw = parseKoreanNumber(m[2]);
    if (raw == null || raw > 24 || +m[3] > 59) continue;
    if (!take(m.index!, m[0].length)) continue;
    const total = applyMeridiem(m[1], raw) * 60 - +m[3];
    const c: Fragment['components'] = { hour: Math.floor(total / 60), minute: total % 60 };
    if (m[1]) c.meridiem = true;
    out.push({ text: m[0], index: m.index!, components: c });
  }
  for (const m of text.matchAll(HALF_DAY)) {
    if (!take(m.index!, m[0].length)) continue;
    const hour = m[1] === '오전' ? 12 : 18;
    out.push({ text: m[0], index: m.index!, components: { hour, minute: 0, meridiem: true, isEnd: true } });
  }
  for (const m of text.matchAll(AMPM)) {
    const raw = +m[1];
    if (raw < 1 || raw > 12) continue;
    if (!take(m.index!, m[0].length)) continue;
    const hour = applyMeridiem(m[3].toLowerCase() === 'p' ? '오후' : '오전', raw);
    out.push({ text: m[0], index: m.index!, components: { hour, minute: m[2] ? +m[2] : 0, meridiem: true } });
  }
  for (const m of text.matchAll(CLOCK)) {
    const raw = parseKoreanNumber(m[2]);
    if (raw == null || raw > 24) continue;
    if (!take(m.index!, m[0].length)) continue;
    const hour = applyMeridiem(m[1], raw);
    let minute = 0;
    if (m[3]) minute = 30;
    else if (m[4] ?? m[5]) minute = +(m[4] ?? m[5]);
    if (minute > 59) continue;
    const c: Fragment['components'] = { hour, minute };
    if (m[1]) c.meridiem = true;
    if (raw === 24 || (m[1] === '밤' && raw === 12)) c.midnight = true;
    out.push({ text: m[0], index: m.index!, components: c });
  }
  for (const m of text.matchAll(COLON)) {
    const raw = +m[2], minute = +m[3];
    if (raw > 23 || minute > 59) continue;
    if (!take(m.index!, m[0].length)) continue;
    const hour = applyMeridiem(m[1], raw);
    out.push({ text: m[0], index: m.index!, components: { hour, minute, meridiem: true } });
  }
  for (const m of text.matchAll(SAME_TIME)) {
    if (!take(m.index!, m[0].length)) continue;
    out.push({ text: m[0], index: m.index!, components: { sameTime: true } });
  }
  for (const m of text.matchAll(HALF_WORD)) {
    if (!take(m.index!, m[0].length)) continue;
    out.push({ text: m[0], index: m.index!, components: { hour: WORD_HOUR[m[1]], minute: 0, meridiem: true, approximate: true } });
  }
  for (const m of text.matchAll(WORD)) {
    if (!take(m.index!, m[0].length)) continue;
    const c: Fragment['components'] = { hour: WORD_HOUR[m[1]], minute: 0, meridiem: true };
    if (m[1] === '자정') c.midnight = true;
    // 정오·자정은 정확한 시각, 나머지(아침·저녁·밤·점심·낮·퇴근)는 관례
    else if (m[1] !== '정오') c.approximate = true;
    out.push({ text: m[0], index: m.index!, components: c });
  }
  return out;
};
