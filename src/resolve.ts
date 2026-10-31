import type { Ambiguity, Components, Fragment, ParseResult, ResolveOptions, WeekStart } from './types.js';
import { toRRule } from './parsers/recurrence.js';
import { lunarHoliday, lunarToSolar } from './util/lunarHolidays.js';

function startOfWeek(d: Date, weekStart: WeekStart): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  const dow = r.getDay(); // 0=일
  const diff = weekStart === 'monday' ? (dow + 6) % 7 : dow;
  r.setDate(r.getDate() - diff);
  return r;
}

function lastDayOfMonth(y: number, m0: number): number {
  return new Date(y, m0 + 1, 0).getDate();
}

/** 그 달의 N번째 요일이 며칠인지. nth = -1이면 마지막. 없으면 null ("다섯째 주 토요일") */
function nthWeekdayOfMonth(y: number, m0: number, weekday: number, nth: number): number | null {
  const last = lastDayOfMonth(y, m0);
  let day = 1 + ((weekday - new Date(y, m0, 1).getDay() + 7) % 7);
  if (nth > 0) day += (nth - 1) * 7;
  else while (day + 7 <= last) day += 7;
  return day > last ? null : day;
}

/** 규칙 20: 오전/오후 없는 1~6시는 오후 ("3시에 보자" → 15시). 7~11시는 그대로 */
function clockHour(c: Components): number {
  const h = c.hour!;
  return !c.meridiem && h >= 1 && h <= 6 ? h + 12 : h;
}

/** 기준일의 "일"을 유지하되 그 달에 없으면 말일로 (2월 29일 + 1년 → 2월 28일) */
function sameDayIn(y: number, m0: number, day: number): Date {
  return new Date(y, m0, Math.min(day, lastDayOfMonth(y, m0)));
}

// 조각 사이에 와도 같은 표현으로 묶는 것: "내일 오후", "내일은 오후", "토요일쯤 저녁", "모레도 2시"
// "이나/아니면/랑"은 다른 선택지일 수 있어 묶지 않는다.
const JOINER = /^(?:\s|,|에|의|엔|은|는|도|쯤|경|께|부터)*$/;

/**
 * 인접한 조각(fragment)을 하나로 합친다.
 * 예: "다음주 화요일" + "오후 3시" → 하나의 결과.
 * 인접 기준: 사이에 공백/쉼표/조사(에,의,엔,은,는,도)/어림말(쯤,경,께)만 있을 때.
 */
export function groupFragments(fragments: Fragment[], text: string): Fragment[][] {
  const sorted = [...fragments].sort((a, b) => a.index - b.index);
  const groups: Fragment[][] = [];
  for (const f of sorted) {
    const g = groups[groups.length - 1];
    if (g) {
      const last = g[g.length - 1];
      const between = text.slice(last.index + last.text.length, f.index);
      const conflict = hasConflict(merge(g.map((x) => x.components)), f.components);
      if (JOINER.test(between) && !conflict) {
        g.push(f);
        continue;
      }
    }
    groups.push([f]);
  }
  return groups;
}

export function merge(list: Components[]): Components {
  return Object.assign({}, ...list);
}

const DATE_KEYS: (keyof Components)[] = [
  'year', 'yearOffset', 'month', 'day', 'dayOffset', 'weekOffset', 'weekday', 'monthOffset', 'monthPart',
  'lunar', 'lunarDate',
];

/** 날짜 정보 없이 시각만 있는 조각인지 ("5시까지", "17:00") */
export function isTimeOnly(c: Components): boolean {
  return (
    c.hour !== undefined &&
    c.recur === undefined &&
    c.hourOffset === undefined &&
    c.minuteOffset === undefined &&
    !DATE_KEYS.some((k) => c[k] !== undefined)
  );
}

/** 날짜 정보가 요일뿐인 조각인지 ("금요일까지") */
export function isWeekdayOnly(c: Components): boolean {
  return c.weekday !== undefined && DATE_KEYS.every((k) => k === 'weekday' || c[k] === undefined);
}

/** 날짜 정보가 "N일"뿐인 조각인지 ("3일까지") */
export function isDayOnly(c: Components): boolean {
  return c.day !== undefined && DATE_KEYS.every((k) => k === 'day' || c[k] === undefined);
}

/**
 * 시 범위의 끝을 시작에 맞춘다 (규칙 16).
 * 끝을 시작과 같은 날에 놓고, 시작보다 이르면 오전/오후를 이어받거나(+12h) 다음날로 넘긴다.
 * "오후 3~5시" → 17시, "오후 11시부터 1시까지" → 다음날 1시, "오후 3시부터 오전 1시까지" → 다음날 1시
 */
export function alignEnd(start: Date, end: Components): Date {
  const hour = end.hour!;
  const r = new Date(start);
  r.setHours(hour, end.minute ?? 0, 0, 0);
  if (r <= start) {
    if (!end.meridiem && hour < 12 && hour + 12 > start.getHours()) r.setHours(hour + 12);
    else r.setDate(r.getDate() + 1);
  }
  return r;
}

/** 같은 종류의 정보가 두 번 나오면 다른 날짜 표현으로 본다 (예: "3일 5일"). */
function hasConflict(a: Components, b: Components): boolean {
  const dayKeys: (keyof Components)[] = ['day', 'dayOffset', 'weekday', 'monthPart'];
  const timeKeys: (keyof Components)[] = ['hour'];
  const both = (keys: (keyof Components)[]) =>
    keys.some((k) => a[k] !== undefined) && keys.some((k) => b[k] !== undefined);
  // 규칙 15: "내일" + "30분 후"는 서로 다른 표현
  const dateKeys = DATE_KEYS;
  const relKeys: (keyof Components)[] = ['hourOffset', 'minuteOffset'];
  const has = (x: Components, keys: (keyof Components)[]) => keys.some((k) => x[k] !== undefined);
  const dateVsRel = (has(a, dateKeys) && has(b, relKeys)) || (has(a, relKeys) && has(b, dateKeys));
  // "11월 5일 목요일": 날짜 뒤의 요일은 덧붙이는 말이라 충돌이 아니다
  const weekdayNote = (x: Components, y: Components) =>
    x.day !== undefined && y.weekday !== undefined && !y.weekend &&
    y.weekOffset === undefined && y.day === undefined && y.dayOffset === undefined && y.monthPart === undefined;
  const dayConflict = both(dayKeys) && !weekdayNote(a, b) && !weekdayNote(b, a);
  // 규칙 34: "다음주부터 매주 월요일"의 날짜는 반복의 시작·끝이라 따로 해석한 뒤 parseAll이 묶는다
  const recurVsDate = (a.recur !== undefined && has(b, dateKeys)) || (b.recur !== undefined && has(a, dateKeys));
  return dayConflict || both(timeKeys) || dateVsRel || recurVsDate;
}

export function resolve(group: Fragment[], opts: ResolveOptions): ParseResult | null {
  const c = merge(group.map((f) => f.components));
  const ref = opts.referenceDate;
  // "내일 이 시간" → 기준 시각의 시:분. "다음 주 이 시간"은 7일 뒤 (그 주 월요일이 아니라)
  if (c.sameTime && c.hour === undefined) {
    c.hour = ref.getHours();
    c.minute = ref.getMinutes();
    c.meridiem = true;
    if (c.weekOffset !== undefined && c.weekday === undefined) c.sameDay = true;
  }
  if (c.recur) return resolveRecurrence(group, c, opts);
  let d = new Date(ref);
  d.setSeconds(0, 0);
  let dateSet = false;
  const hasTime = c.hour !== undefined || c.hourOffset !== undefined || c.minuteOffset !== undefined;

  // 0. 음력 명절·음력 날짜 (규칙 29, 32): 연도를 말했으면 그 음력 해, 아니면 (연휴까지) 지나지 않은 가장 가까운 것.
  //    음력 12월은 양력으로 다음 해 1월이라 작년 음력부터 본다. 표에 없는 날짜는 null
  const hasYear = c.year !== undefined || c.yearOffset !== undefined;
  const isLunar = c.lunar !== undefined || c.lunarDate !== undefined;
  if (isLunar) {
    const said = c.year ?? (c.yearOffset !== undefined ? ref.getFullYear() + c.yearOffset : undefined);
    const tail = (c.dayOffset ?? 0) + (c.durationDays ? c.durationDays - 1 : 0);
    const y0 = ref.getFullYear();
    const years = said !== undefined ? [said] : [y0 - 1, y0, y0 + 1, y0 + 2];
    const solarOf = (y: number) =>
      c.lunar ? lunarHoliday(y, c.lunar) : lunarToSolar(y, c.lunarDate!.month, c.lunarDate!.day, c.lunarDate!.leap);
    let found: Date | null = null;
    for (const y of years) {
      const s = solarOf(y);
      if (!s) continue; // 그 해에 없는 날 ("음력 2월 30일", 윤달)
      const lastMoment = new Date(s.getFullYear(), s.getMonth(), s.getDate() + tail, 23, 59);
      if (said !== undefined || lastMoment >= ref) {
        found = s;
        break;
      }
    }
    if (!found) return null;
    d = found;
    dateSet = true;
  }

  // 1. 절대 날짜
  if (!isLunar && (hasYear || c.month !== undefined || c.day !== undefined)) {
    let y = c.year ?? ref.getFullYear() + (c.yearOffset ?? 0);
    // "작년", "내년"처럼 연도만 있으면 1월 1일. "내년 이맘때", "1년 뒤"는 오늘 날짜 유지
    const m0 = c.month !== undefined ? c.month - 1 : hasYear && !c.sameDay ? 0 : ref.getMonth();
    // 연도 미지정 + 이미 지났으면 내년으로.
    // 월일("3월 1일")은 그 날이, 월("3월", "2월 말")은 그 달이 통째로 지났을 때.
    if (!hasYear && c.month !== undefined) {
      const lastDay = c.day ?? lastDayOfMonth(y, m0);
      if (new Date(y, m0, lastDay, 23, 59) < ref) y += 1;
    }
    let day = c.day ?? (c.month !== undefined || (hasYear && !c.sameDay) ? 1 : ref.getDate());
    if (c.monthPart) day = partDay(y, m0, c.monthPart);
    if (c.sameDay) day = Math.min(day, lastDayOfMonth(y, m0));
    // 2월 30일, 11월 31일처럼 없는 날짜는 다음 달로 넘기지 않고 버린다
    if (day > lastDayOfMonth(y, m0)) return null;
    d = new Date(y, m0, day);
    dateSet = true;
  }

  // 2. 상대 월
  if (c.monthOffset !== undefined) {
    const y = ref.getFullYear();
    const m0 = ref.getMonth() + c.monthOffset;
    const day = c.monthPart ? partDay(y, m0, c.monthPart) : c.day ?? 1;
    if (day > lastDayOfMonth(y, m0)) return null;
    // "다음달 이맘때" → 오늘 날짜 유지
    d = c.sameDay ? sameDayIn(y, m0, ref.getDate()) : new Date(y, m0, day);
    dateSet = true;
  }

  // 3. N째 주 (규칙 22): 달은 1·2단계에서 정해진 달, 없으면 기준 달
  if (c.nthWeek !== undefined) {
    const y = dateSet ? d.getFullYear() : ref.getFullYear();
    const m0 = dateSet ? d.getMonth() : ref.getMonth();
    const target = c.weekday ?? (opts.weekStart === 'monday' ? 1 : 0);
    const day = nthWeekdayOfMonth(y, m0, target, c.nthWeek);
    // "11월 다섯째 주 토요일"처럼 없는 날짜는 null
    if (day === null) return null;
    d = new Date(y, m0, day);
    dateSet = true;
  } else if (c.weekday !== undefined && c.weekOffset === undefined && c.day !== undefined) {
    // 4. 주 + 요일. "11월 5일 목요일": 날짜가 우선. 요일이 안 맞으면 어느 쪽이 맞는지 모르므로 null
    if (d.getDay() !== c.weekday) return null;
  } else if (c.weekOffset !== undefined || c.weekday !== undefined) {
    if (c.weekOffset !== undefined && c.sameDay) {
      // "다음주 이맘때" → 7일 뒤
      d = new Date(ref);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + c.weekOffset * 7);
    } else if (c.weekOffset !== undefined) {
      const sow = startOfWeek(ref, opts.weekStart);
      sow.setDate(sow.getDate() + c.weekOffset * 7);
      if (c.weekday !== undefined) {
        const offsetInWeek = opts.weekStart === 'monday' ? (c.weekday + 6) % 7 : c.weekday;
        sow.setDate(sow.getDate() + offsetInWeek);
      }
      d = sow;
    } else {
      // 요일 단독: 오늘 포함, 가장 가까운 미래의 그 요일
      const today = new Date(ref);
      today.setHours(0, 0, 0, 0);
      const dow = today.getDay();
      // "주말" 단독인데 오늘이 일요일이면 오늘
      let diff = c.weekend && dow === 0 ? 0 : (c.weekday! - dow + 7) % 7;
      // "다음 금요일"은 오늘 제외 미래, "지난 금요일"은 오늘 제외 과거
      if (c.weekdayDir === 'next' && diff === 0) diff = 7;
      if (c.weekdayDir === 'past') diff = diff === 0 ? -7 : diff - 7;
      today.setDate(today.getDate() + diff);
      d = today;
    }
    dateSet = true;
  }

  // 5. 일 단위 상대 이동
  if (c.dayOffset !== undefined) {
    if (!dateSet) {
      d = new Date(ref);
      d.setHours(0, 0, 0, 0);
    }
    d.setDate(d.getDate() + c.dayOffset);
    dateSet = true;
  }

  // 6. 시각
  if (c.hour !== undefined) {
    const hour = clockHour(c);
    if (!dateSet) {
      d = new Date(ref);
      // 시간만 있고 날짜가 없으면: 오늘, 이미 지났으면 내일
      d.setHours(hour, c.minute ?? 0, 0, 0);
      if (d < ref) d.setDate(d.getDate() + 1);
    } else {
      d.setHours(hour, c.minute ?? 0, 0, 0);
      // "내일 자정" = 내일이 끝나는 시점
      if (c.midnight) d.setDate(d.getDate() + 1);
    }
  } else if (c.hourOffset !== undefined || c.minuteOffset !== undefined) {
    d = new Date(ref);
    d.setSeconds(0, 0);
    if (c.hourOffset) d.setHours(d.getHours() + c.hourOffset);
    if (c.minuteOffset) d.setMinutes(d.getMinutes() + c.minuteOffset);
  } else if (dateSet) {
    d.setHours(opts.defaultHour, 0, 0, 0);
  } else {
    return null;
  }

  // 안전장치: 어떤 경로로든 계산이 깨진 날짜는 내보내지 않는다
  if (Number.isNaN(d.getTime())) return null;
  const ambiguity = ambiguityOf(c, d, dateSet, opts);

  const first = group[0];
  const last = group[group.length - 1];
  // text는 parseAll()에서 원문 slice로 채운다. _end는 그때 쓰는 내부 값.
  const result: ParseResult = { date: d, text: '', index: first.index, hasTime };
  if (ambiguity) result.ambiguity = ambiguity;
  (result as ParseResult & { _end: number })._end = last.index + last.text.length;

  // "오늘부터 3일간", "3시부터 2시간 동안": 시작일을 포함한 기간의 끝
  if (c.durationDays !== undefined || c.durationMonths !== undefined || c.durationMinutes !== undefined) {
    if (!dateSet && !hasTime) return null;
    const end = new Date(d);
    if (c.durationMinutes !== undefined) {
      end.setMinutes(end.getMinutes() + c.durationMinutes);
    } else {
      if (c.durationMonths !== undefined) end.setMonth(end.getMonth() + c.durationMonths);
      if (c.durationDays !== undefined) end.setDate(end.getDate() + c.durationDays);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 0, 0);
    }
    result.end = end;
    return result;
  }

  if (c.isEnd || c.whole) {
    // "~까지", "~이내": 시작은 기준 시각, 끝은 해당 시점(시간 없으면 그날 23:59)
    // "~내내": 시작은 그 기간의 시작, 끝은 기간의 끝
    result.end = hasTime ? new Date(d) : periodEnd(d, c);
    // "이번 주말 내내" → 토요일부터 일요일까지
    if (c.whole && c.weekend && !hasTime && result.end.getDay() === 6) result.end.setDate(result.end.getDate() + 1);
    // 규칙 30: "어제까지"처럼 이미 지난 마감은 구간이 아니라 그 시점 (date = end)
    if (c.isEnd) result.date = result.end < ref ? new Date(result.end) : new Date(ref);
  }
  return result;
}

/** 날짜 표현이 가리키는 기간의 마지막 시각. "이번 주" → 일요일, "이번달" → 말일, "올해" → 12/31, 그 외는 그날 23:59 */
function periodEnd(d: Date, c: Components): Date {
  let end = new Date(d);
  if (c.weekOffset !== undefined && c.weekday === undefined) end.setDate(end.getDate() + 6);
  else if (c.monthOffset !== undefined && c.monthPart === undefined && c.day === undefined)
    end = new Date(end.getFullYear(), end.getMonth(), lastDayOfMonth(end.getFullYear(), end.getMonth()));
  else if ((c.year !== undefined || c.yearOffset !== undefined) && c.month === undefined && !c.sameDay)
    end = new Date(end.getFullYear(), 11, 31);
  end.setHours(23, 59, 0, 0);
  return end;
}

/**
 * 반복 일정 (규칙 27): date = 기준 시각 이후 첫 발생.
 * 시각이 있으면 지난 시각은 건너뛰고, 날짜만 있으면 오늘도 포함한다.
 * "매달 31일"은 31일이 없는 달을 건너뛴다 (RRULE과 같은 동작).
 */
function resolveRecurrence(group: Fragment[], c: Components, opts: ResolveOptions): ParseResult | null {
  const r = c.recur!;
  const ref = opts.referenceDate;
  const hasTime = c.hour !== undefined;
  const today = new Date(ref);
  today.setHours(0, 0, 0, 0);
  const at = (day: Date) => {
    const x = new Date(day);
    x.setHours(hasTime ? clockHour(c) : opts.defaultHour, hasTime ? c.minute ?? 0 : 0, 0, 0);
    return x;
  };
  const ok = (x: Date) => (hasTime ? x >= ref : x >= today);

  let d: Date | null = null;
  if (r.freq === 'MINUTELY' || r.freq === 'HOURLY') {
    d = new Date(ref);
    d.setSeconds(0, 0);
    d.setMinutes(d.getMinutes() + r.interval * (r.freq === 'HOURLY' ? 60 : 1));
  } else if (r.freq === 'DAILY') {
    d = at(today);
    if (!ok(d)) d.setDate(d.getDate() + 1);
  } else if (r.freq === 'WEEKLY') {
    for (let i = 0; i < 14 && !d; i++) {
      const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      if (r.byWeekday?.includes(day.getDay()) && ok(at(day))) d = at(day);
    }
  } else if (r.freq === 'MONTHLY') {
    for (let k = 0; k < 24 && !d; k++) {
      const y = today.getFullYear(), m0 = today.getMonth() + k;
      const dom = r.byWeekdayNth !== undefined
        ? nthWeekdayOfMonth(y, m0, r.byWeekday![0], r.byWeekdayNth)
        : r.byMonthDay === -1 ? lastDayOfMonth(y, m0) : r.byMonthDay!;
      if (dom === null || dom > lastDayOfMonth(y, m0)) continue;
      const x = at(new Date(y, m0, dom));
      if (ok(x)) d = x;
    }
  } else {
    // YEARLY: 2월 29일은 다음 윤년까지
    for (let k = 0; k < 9 && !d; k++) {
      const y = today.getFullYear() + k, m0 = r.byMonth! - 1;
      if (r.byMonthDay! > lastDayOfMonth(y, m0)) continue;
      const x = at(new Date(y, m0, r.byMonthDay!));
      if (ok(x)) d = x;
    }
  }
  if (!d) return null;

  // 규칙 34: "10주 동안 매주 월요일" → 오늘(또는 "A부터"의 A)부터 그 기간의 마지막 날 23:59까지
  const rule = { ...r };
  if (c.durationDays !== undefined || c.durationMonths !== undefined) {
    // N달 뒤 같은 날의 전날까지. 그 달에 없는 날이면 말일로 맞춘다 (11/30 + 3달 → 2/28의 전날)
    const until = sameDayIn(today.getFullYear(), today.getMonth() + (c.durationMonths ?? 0), today.getDate());
    until.setDate(until.getDate() + (c.durationDays ?? 0) - 1);
    until.setHours(23, 59, 0, 0);
    if (until < d) return null;
    rule.until = until;
  }

  const last = group[group.length - 1];
  const timed = hasTime || r.freq === 'HOURLY' || r.freq === 'MINUTELY';
  const result: ParseResult = {
    date: d,
    text: '',
    index: group[0].index,
    hasTime: timed,
    recurrence: { ...rule, rrule: toRRule(rule, !timed) },
  };
  (result as ParseResult & { _end: number })._end = last.index + last.text.length;
  return result;
}

/** 규칙 31: 해석이 갈릴 수 있는 지점과 다른 후보 */
function ambiguityOf(c: Components, d: Date, dateSet: boolean, opts: ResolveOptions): Ambiguity | undefined {
  const ref = opts.referenceDate;
  // 오전/오후 없는 1~12시: 반대쪽 12시간이 후보 (날짜가 없으면 규칙 4대로 다음 발생)
  if (c.hour !== undefined && !c.meridiem && !c.midnight && c.hour >= 1 && c.hour <= 12) {
    const used = clockHour(c);
    const altHour = used === 12 ? 0 : used < 12 ? used + 12 : used - 12;
    const alt = new Date(dateSet ? d : ref);
    alt.setHours(altHour, c.minute ?? 0, 0, 0);
    if (!dateSet && alt < ref) alt.setDate(alt.getDate() + 1);
    return { reason: 'meridiem', alternatives: [alt] };
  }
  // "다음 토요일": 규칙 23(오늘 제외 가장 가까운)과 "다음 주 토요일"이 다르면 후보로
  if (c.weekdayDir === 'next' && c.weekday !== undefined) {
    const alt = startOfWeek(ref, opts.weekStart);
    alt.setDate(alt.getDate() + 7 + (opts.weekStart === 'monday' ? (c.weekday + 6) % 7 : c.weekday));
    alt.setHours(d.getHours(), d.getMinutes(), 0, 0);
    if (alt.getTime() !== d.getTime()) return { reason: 'next-weekday', alternatives: [alt] };
  }
  if (c.approximate) return { reason: 'approximate-time', alternatives: [] };
  return undefined;
}

function partDay(y: number, m0: number, part: NonNullable<Components['monthPart']>): number {
  if (part === 'start') return 1;
  if (part === 'middle') return 15;
  return lastDayOfMonth(y, m0);
}
