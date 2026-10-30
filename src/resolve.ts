import type { Components, Fragment, ParseOptions, ParseResult, WeekStart } from './types.js';

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
];

/** 날짜 정보 없이 시각만 있는 조각인지 ("5시까지", "17:00") */
export function isTimeOnly(c: Components): boolean {
  return (
    c.hour !== undefined &&
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
  return dayConflict || both(timeKeys) || dateVsRel;
}

export function resolve(group: Fragment[], opts: Required<ParseOptions>): ParseResult | null {
  const c = merge(group.map((f) => f.components));
  const ref = opts.referenceDate;
  let d = new Date(ref);
  d.setSeconds(0, 0);
  let dateSet = false;
  const hasTime = c.hour !== undefined || c.hourOffset !== undefined || c.minuteOffset !== undefined;

  // 1. 절대 날짜
  const hasYear = c.year !== undefined || c.yearOffset !== undefined;
  if (hasYear || c.month !== undefined || c.day !== undefined) {
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
    const last = lastDayOfMonth(y, m0);
    let day = 1 + ((target - new Date(y, m0, 1).getDay() + 7) % 7);
    if (c.nthWeek > 0) day += (c.nthWeek - 1) * 7;
    else while (day + 7 <= last) day += 7;
    // "11월 다섯째 주 토요일"처럼 없는 날짜는 null
    if (day > last) return null;
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
    // 규칙 20: 오전/오후 없는 1~6시는 오후 ("3시에 보자" → 15시). 7~11시는 그대로.
    const hour = !c.meridiem && c.hour >= 1 && c.hour <= 6 ? c.hour + 12 : c.hour;
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

  const first = group[0];
  const last = group[group.length - 1];
  // text는 parseAll()에서 원문 slice로 채운다. _end는 그때 쓰는 내부 값.
  const result: ParseResult = { date: d, text: '', index: first.index, hasTime };
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

  if (c.isEnd) {
    // "~까지", "~이내": 시작은 기준 시각, 끝은 해당 시점(시간 없으면 그날 23:59)
    let end = new Date(d);
    if (!hasTime) {
      // "이번 주 안에", "이번달 안에", "올해 안에" → 그 기간의 마지막 날
      if (c.weekOffset !== undefined && c.weekday === undefined) end.setDate(end.getDate() + 6);
      else if (c.monthOffset !== undefined && c.monthPart === undefined && c.day === undefined)
        end = new Date(end.getFullYear(), end.getMonth(), lastDayOfMonth(end.getFullYear(), end.getMonth()));
      else if ((c.year !== undefined || c.yearOffset !== undefined) && c.month === undefined)
        end = new Date(end.getFullYear(), 11, 31);
      end.setHours(23, 59, 0, 0);
    }
    result.end = end;
    result.date = new Date(ref);
  }
  return result;
}

function partDay(y: number, m0: number, part: NonNullable<Components['monthPart']>): number {
  if (part === 'start') return 1;
  if (part === 'middle') return 15;
  return lastDayOfMonth(y, m0);
}
