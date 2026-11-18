import type { Fragment, Parser, Recurrence } from '../types.js';
import { parseKoreanNumber } from '../util/number.js';

type Recur = NonNullable<Fragment['components']['recur']>;

const WEEKDAY: Record<string, number> = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };
const NTH: Record<string, number> = { 첫째: 1, 첫: 1, 둘째: 2, 셋째: 3, 넷째: 4, 마지막: -1 };
const SETS: Record<string, number[]> = { 평일: [1, 2, 3, 4, 5], 주중: [1, 2, 3, 4, 5], 주말: [6, 0] };

// 요일 목록 "월수금", "화, 목", "월요일이랑 수요일", "월~금". 목록이 끝난 뒤에는 다른 한글이 붙으면 안 된다
// ("매주 일요일 일정"의 "일"을 요일로 잡지 않게). 조사·마다는 허용
const ITEM = '[월화수목금토일](?:요일|욜)?(?:\\s*~\\s*[월화수목금토일](?:요일|욜)?)?';
const LIST = `${ITEM}(?:\\s*(?:,|·|/|이랑|랑|하고|과|와)?\\s*${ITEM})*`;
const LIST_END = '(?:(?![가-힣])|(?=마다|에|엔|은|는|도))';

// "매달 첫째 주 월요일", "매월 마지막 주 금요일"
const MONTHLY_NTH = /(?:매달|매월|매\s*달)\s*(첫째|첫|둘째|셋째|넷째|마지막)\s*주\s*([월화수목금토일])(?:요일|욜)/g;
// 주기 말. 간격 숫자를 그룹 하나로 잡는다 (없으면 1, "격주"는 2)
// "매주", "격주", "일주일마다", "2주마다", "두 주에 한 번"
const WEEK_EVERY = '매주|매\\s*주|격주|(?:일|한)\\s*주일?\\s*마다|(\\d{1,2}|두|세|네)\\s*주일?\\s*(?:마다|에\\s*한\\s*번)';
// "매달", "매월", "달마다", "한 달마다", "2개월마다", "두 달에 한 번"
const MONTH_EVERY =
  '매달|매월|매\\s*달|다달이|(?<![가-힣])달\\s*마다|(\\d{1,2}|한|두|세|네|다섯|여섯)\\s*(?:개월|달)\\s*(?:마다|에\\s*한\\s*번)';
// "매년", "해마다", "2년마다"
const YEAR_EVERY = '매년|매해|해마다|(\\d{1,2}|한|두|세)\\s*년\\s*마다';
// 주기 말만 쓸 때 뒤에 올 수 있는 것: 한글이 아닌 것, 끝, 조사 ("격주로", "매주에는"). "매달려"는 막는다
const EVERY_END = '(?=[^가-힣]|$|(?:로|으로|에|엔|은|는|도)(?![가-힣])|에는)';

// "매달 15일", "매월 말일", "매달 말", "매달 초", "2개월마다 1일", "달마다 14일"
const MONTHLY_DAY = new RegExp(`(?:${MONTH_EVERY})\\s*(?:(\\d{1,2})\\s*일|(말일|마지막\\s*날|말)|(초))`, 'g');
// "매년 3월 1일", "해마다 12월 25일", "2년마다 3월 1일"
const YEARLY = new RegExp(`(?:${YEAR_EVERY})\\s*(\\d{1,2})\\s*월\\s*(\\d{1,2})\\s*일`, 'g');
// "매주 평일", "평일마다", "주말마다", "평일 매일"
const WEEKDAY_SET = /매주\s*(평일|주중|주말)|(?<![가-힣])(평일|주중|주말)\s*(?:마다|매일)/g;
// "매주 월요일", "매주 월수금", "격주 금요일", "2주마다 수요일", "2주에 한 번 화요일", "일주일마다 월요일"
const WEEKLY = new RegExp(`(${WEEK_EVERY})\\s*(${LIST})${LIST_END}(?:\\s*마다)?`, 'g');
// "매주 14일", "일주일마다 3일": 매주와 며칠은 같이 올 수 없다 (resolve가 null을 낸다). "3일 동안", "3일 뒤"는 제외
const WEEKLY_DAY = new RegExp(
  `(?<![가-힣])(?:${WEEK_EVERY})\\s*(\\d{1,2})\\s*일(?!\\s*(?:마다|간|동안|뒤|후|전|째|만에))`,
  'g',
);
// 주기 말만 ("매주", "격주로", "2개월마다", "매년"). 요일·날짜는 첫 발생일(DTSTART)을 따른다
const WEEK_ONLY = new RegExp(`(?<![가-힣])(?:${WEEK_EVERY})${EVERY_END}`, 'g');
const MONTH_ONLY = new RegExp(`(?<![가-힣])(?:${MONTH_EVERY})${EVERY_END}`, 'g');
const YEAR_ONLY = new RegExp(`(?<![가-힣])(?:${YEAR_EVERY})${EVERY_END}`, 'g');
// "3일마다", "14일마다", "이틀마다" = N일 간격 ("3일"이라는 날짜가 아님)
const DAYS_INTERVAL = /(?<![가-힣\d])(?:(\d{1,3})\s*일|(이틀|사흘))\s*마다/g;
// "월요일마다", "화요일이랑 목요일마다"
const DAYS_EVERY = /(?<![가-힣])([월화수목금토일](?:요일|욜)(?:\s*(?:,|·|이랑|랑|하고|과|와)?\s*[월화수목금토일](?:요일|욜))*)\s*마다/g;
// "매일", "날마다", "매일매일"
const DAILY = /(?<![가-힣])(?:매일매일|매일|날마다)/g;
// "2시간마다", "30분마다", "매시간"
const HOURLY = /(?<![가-힣\d])(?:(\d{1,2}|한|두|세|네|다섯|여섯)\s*시간\s*마다|매\s*시간)/g;
const MINUTELY = /(?<!\d)(\d{1,3})\s*분\s*마다/g;

/** "월수금", "화, 목요일", "월~금" → 요일 번호들. "요일" 안의 "일"은 일요일이 아니다 */
function weekdaysOf(list: string): number[] {
  const out: number[] = [];
  const plain = list.replace(/요일|욜/g, '');
  // "월~금" → 월화수목금 (월요일부터 센다, "금~일"은 금토일)
  for (const m of plain.matchAll(/([월화수목금토일])\s*~\s*([월화수목금토일])|([월화수목금토일])/g)) {
    if (m[3]) {
      out.push(WEEKDAY[m[3]]);
      continue;
    }
    const from = (WEEKDAY[m[1]] + 6) % 7, to = (WEEKDAY[m[2]] + 6) % 7;
    for (let i = from; i !== (to + 1) % 7; i = (i + 1) % 7) out.push((i + 1) % 7);
  }
  return [...new Set(out)];
}

/** 주기 말의 간격. 숫자 그룹이 없으면 1, "격주"는 2. 0이거나 못 읽으면 null */
function intervalOf(word: string, num: string | undefined): number | null {
  if (word.startsWith('격주')) return 2;
  if (!num) return 1;
  return parseKoreanNumber(num) || null;
}

/** 반복 일정. 날짜는 계산하지 않고 규칙만 뽑는다 (첫 발생일은 resolve가 계산) */
export const recurrence: Parser = (text) => {
  const out: Fragment[] = [];
  const taken: Array<[number, number]> = [];
  const push = (m: RegExpMatchArray, recur: Recur) => {
    const s = m.index!, e = s + m[0].length;
    if (taken.some(([a, b]) => s < b && e > a)) return;
    taken.push([s, e]);
    out.push({ text: m[0], index: s, components: { recur } });
  };

  for (const m of text.matchAll(MONTHLY_NTH)) {
    push(m, { freq: 'MONTHLY', interval: 1, byWeekday: [WEEKDAY[m[2]]], byWeekdayNth: NTH[m[1]] });
  }
  for (const m of text.matchAll(MONTHLY_DAY)) {
    const n = intervalOf(m[0], m[1]);
    const day = m[2] ? +m[2] : m[3] ? -1 : 1;
    if (!n || day === 0 || day > 31) continue;
    push(m, { freq: 'MONTHLY', interval: n, byMonthDay: day });
  }
  for (const m of text.matchAll(YEARLY)) {
    const n = intervalOf(m[0], m[1]);
    const month = +m[2], day = +m[3];
    if (!n || month < 1 || month > 12 || day < 1 || day > 31) continue;
    push(m, { freq: 'YEARLY', interval: n, byMonth: month, byMonthDay: day });
  }
  for (const m of text.matchAll(WEEKDAY_SET)) {
    push(m, { freq: 'WEEKLY', interval: 1, byWeekday: SETS[m[1] ?? m[2]] });
  }
  for (const m of text.matchAll(WEEKLY)) {
    const n = intervalOf(m[1], m[2]);
    if (!n) continue;
    push(m, { freq: 'WEEKLY', interval: n, byWeekday: weekdaysOf(m[3]) });
  }
  // "매주 14일"은 며칠(day)을 같이 실어 보내 resolve가 null을 내게 한다.
  // 여기서 안 잡으면 "14일"만 남아 하루짜리 날짜가 된다
  for (const m of text.matchAll(WEEKLY_DAY)) {
    const n = intervalOf(m[0], m[1]);
    const s = m.index!, e = s + m[0].length;
    if (!n || taken.some(([a, b]) => s < b && e > a)) continue;
    taken.push([s, e]);
    out.push({ text: m[0], index: s, components: { recur: { freq: 'WEEKLY', interval: n }, day: +m[2] } });
  }
  for (const m of text.matchAll(DAYS_EVERY)) {
    push(m, { freq: 'WEEKLY', interval: 1, byWeekday: weekdaysOf(m[1]) });
  }
  for (const m of text.matchAll(DAILY)) {
    push(m, { freq: 'DAILY', interval: 1 });
  }
  for (const m of text.matchAll(DAYS_INTERVAL)) {
    const n = m[1] ? +m[1] : m[2] === '이틀' ? 2 : 3;
    if (n > 0) push(m, { freq: 'DAILY', interval: n });
  }
  for (const m of text.matchAll(HOURLY)) {
    const n = m[1] ? parseKoreanNumber(m[1]) : 1;
    if (!n) continue;
    push(m, { freq: 'HOURLY', interval: n });
  }
  for (const m of text.matchAll(MINUTELY)) {
    if (+m[1] === 0) continue;
    push(m, { freq: 'MINUTELY', interval: +m[1] });
  }
  // 주기 말만 있는 것은 마지막에: 위에서 요일·날짜와 함께 잡힌 것이 우선
  const only: Array<[RegExp, Recur['freq']]> = [[WEEK_ONLY, 'WEEKLY'], [MONTH_ONLY, 'MONTHLY'], [YEAR_ONLY, 'YEARLY']];
  for (const [re, freq] of only) {
    for (const m of text.matchAll(re)) {
      const n = intervalOf(m[0], m[1]);
      if (n) push(m, { freq, interval: n });
    }
  }
  return out;
};

const CODE = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * RFC 5545 RRULE 문자열. 요일은 월요일부터.
 * UNTIL은 벽시계 시각 그대로 쓴다 (DTSTART가 TZID 또는 floating time일 때의 형식).
 * dateOnly면 DTSTART가 DATE이므로 UNTIL도 날짜만.
 */
export function toRRule(r: Omit<Recurrence, 'rrule'>, dateOnly = false): string {
  const parts = [`FREQ=${r.freq}`];
  if (r.interval > 1) parts.push(`INTERVAL=${r.interval}`);
  if (r.byMonth !== undefined) parts.push(`BYMONTH=${r.byMonth}`);
  if (r.byMonthDay !== undefined) parts.push(`BYMONTHDAY=${r.byMonthDay}`);
  if (r.byWeekday?.length) {
    const days = [...r.byWeekday].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => CODE[d]);
    parts.push(`BYDAY=${days.map((c) => (r.byWeekdayNth ? `${r.byWeekdayNth}${c}` : c)).join(',')}`);
  }
  if (r.until) {
    const u = r.until;
    const date = `${u.getFullYear()}${pad(u.getMonth() + 1)}${pad(u.getDate())}`;
    parts.push(`UNTIL=${dateOnly ? date : `${date}T${pad(u.getHours())}${pad(u.getMinutes())}${pad(u.getSeconds())}`}`);
  } else if (r.count) {
    parts.push(`COUNT=${r.count}`);
  }
  return parts.join(';');
}
