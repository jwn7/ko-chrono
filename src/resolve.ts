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

function merge(list: Components[]): Components {
  return Object.assign({}, ...list);
}

/** 같은 종류의 정보가 두 번 나오면 다른 날짜 표현으로 본다 (예: "3일 5일"). */
function hasConflict(a: Components, b: Components): boolean {
  const dayKeys: (keyof Components)[] = ['day', 'dayOffset', 'weekday', 'monthPart'];
  const timeKeys: (keyof Components)[] = ['hour'];
  const both = (keys: (keyof Components)[]) =>
    keys.some((k) => a[k] !== undefined) && keys.some((k) => b[k] !== undefined);
  return both(dayKeys) || both(timeKeys);
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
    const y = c.year ?? ref.getFullYear() + (c.yearOffset ?? 0);
    // "작년", "내년"처럼 연도만 있으면 1월 1일
    const m0 = c.month !== undefined ? c.month - 1 : hasYear ? 0 : ref.getMonth();
    let day = c.day ?? (c.month !== undefined || hasYear ? 1 : ref.getDate());
    if (c.monthPart) day = partDay(y, m0, c.monthPart);
    d = new Date(y, m0, day);
    // 연도 미지정 + 이미 지난 날짜 → 내년으로 (월일만 있을 때)
    if (!hasYear && c.month !== undefined && c.day !== undefined) {
      const cmp = new Date(y, m0, day, 23, 59);
      if (cmp < ref) d = new Date(y + 1, m0, day);
    }
    dateSet = true;
  }

  // 2. 상대 월
  if (c.monthOffset !== undefined) {
    const y = ref.getFullYear();
    const m0 = ref.getMonth() + c.monthOffset;
    const day = c.monthPart ? partDay(y, m0, c.monthPart) : c.day ?? 1;
    d = new Date(y, m0, day);
    dateSet = true;
  }

  // 3. 주 + 요일
  if (c.weekOffset !== undefined || c.weekday !== undefined) {
    if (c.weekOffset !== undefined) {
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
      const diff = (c.weekday! - today.getDay() + 7) % 7;
      today.setDate(today.getDate() + diff);
      d = today;
    }
    dateSet = true;
  }

  // 4. 일 단위 상대 이동
  if (c.dayOffset !== undefined) {
    if (!dateSet) {
      d = new Date(ref);
      d.setHours(0, 0, 0, 0);
    }
    d.setDate(d.getDate() + c.dayOffset);
    dateSet = true;
  }

  // 5. 시각
  if (c.hour !== undefined) {
    if (!dateSet) {
      d = new Date(ref);
      // 시간만 있고 날짜가 없으면: 오늘, 이미 지났으면 내일
      d.setHours(c.hour, c.minute ?? 0, 0, 0);
      if (d < ref) d.setDate(d.getDate() + 1);
    } else {
      d.setHours(c.hour, c.minute ?? 0, 0, 0);
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

  if (c.isEnd) {
    // "~까지", "~이내": 시작은 기준 시각, 끝은 해당 시점(시간 없으면 그날 23:59)
    const end = new Date(d);
    if (!hasTime) end.setHours(23, 59, 0, 0);
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
