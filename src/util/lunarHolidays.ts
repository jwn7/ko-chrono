// 음력 → 양력 변환표. 런타임 의존성 없이 음력을 다루려면 표가 필요하다.
//
// 출처: 한국천문연구원 천문우주지식정보 "월별 양음력 대조" (astro.kasi.re.kr/life/post/calendarData)
//       2025~2028년 페이지에서 음력 초하루(1일)가 되는 양력 날짜를 옮겼다.
//       설날·부처님 오신 날·추석 12개가 관공서 공휴일 목록과 일치하는지 tests/lunar.test.ts에서 확인한다.
// KASI는 2~3년 앞까지만 공식 자료를 낸다 (2026-10 기준 2028년까지).
// 새 연도가 공개되면 그 해의 초하루 목록을 추가하고, 직전 해 마지막 달의 길이가 확정되는지 확인할 것.
// 표에 없는 날짜는 추측하지 않고 null (규칙 10). 한국 음력은 한국 표준시 기준이라 중국과 하루 다를 수 있다.

export type LunarHoliday = 'seollal' | 'chuseok' | 'buddha';

/** [음력 월, 윤달 여부, 양력 연, 월, 일] — 그 음력 달 초하루의 양력 날짜. 연속된 달 순서대로 */
type MonthStart = [number, boolean, number, number, number];

const MONTH_STARTS: Record<number, MonthStart[]> = {
  2025: [
    [1, false, 2025, 1, 29], [2, false, 2025, 2, 28], [3, false, 2025, 3, 29], [4, false, 2025, 4, 28],
    [5, false, 2025, 5, 27], [6, false, 2025, 6, 25], [6, true, 2025, 7, 25], [7, false, 2025, 8, 23],
    [8, false, 2025, 9, 22], [9, false, 2025, 10, 21], [10, false, 2025, 11, 20], [11, false, 2025, 12, 20],
    [12, false, 2026, 1, 19],
  ],
  2026: [
    [1, false, 2026, 2, 17], [2, false, 2026, 3, 19], [3, false, 2026, 4, 17], [4, false, 2026, 5, 17],
    [5, false, 2026, 6, 15], [6, false, 2026, 7, 14], [7, false, 2026, 8, 13], [8, false, 2026, 9, 11],
    [9, false, 2026, 10, 11], [10, false, 2026, 11, 9], [11, false, 2026, 12, 9], [12, false, 2027, 1, 8],
  ],
  2027: [
    [1, false, 2027, 2, 7], [2, false, 2027, 3, 8], [3, false, 2027, 4, 7], [4, false, 2027, 5, 6],
    [5, false, 2027, 6, 5], [6, false, 2027, 7, 4], [7, false, 2027, 8, 2], [8, false, 2027, 9, 1],
    [9, false, 2027, 9, 30], [10, false, 2027, 10, 29], [11, false, 2027, 11, 28], [12, false, 2027, 12, 28],
  ],
  2028: [
    [1, false, 2028, 1, 27], [2, false, 2028, 2, 25], [3, false, 2028, 3, 26], [4, false, 2028, 4, 25],
    [5, false, 2028, 5, 24], [5, true, 2028, 6, 23], [6, false, 2028, 7, 22], [7, false, 2028, 8, 20],
    [8, false, 2028, 9, 19], [9, false, 2028, 10, 18], [10, false, 2028, 11, 16], [11, false, 2028, 12, 16],
    [12, false, 2029, 1, 15],
  ],
};

export const LUNAR_YEARS = Object.keys(MONTH_STARTS).map(Number);

const DAY = 86_400_000;
const solar = (s: MonthStart) => new Date(s[2], s[3] - 1, s[4]);

/** 그 음력 달의 다음 달 초하루 (모르면 null) */
function nextStart(year: number, index: number): Date | null {
  const months = MONTH_STARTS[year];
  if (index + 1 < months.length) return solar(months[index + 1]);
  const next = MONTH_STARTS[year + 1];
  return next ? solar(next[0]) : null;
}

/**
 * 음력 → 양력. 그 달에 없는 날(29일인 달의 30일)이나 표에 없는 날짜는 null.
 * 마지막 달처럼 길이를 모르면 29일까지만 받는다.
 */
export function lunarToSolar(year: number, month: number, day: number, leap = false): Date | null {
  const months = MONTH_STARTS[year];
  if (!months || day < 1 || day > 30) return null;
  const index = months.findIndex(([m, l]) => m === month && l === leap);
  if (index < 0) return null;
  const start = solar(months[index]);
  const next = nextStart(year, index);
  const length = next ? Math.round((next.getTime() - start.getTime()) / DAY) : 29;
  if (day > length) return null;
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + day - 1);
}

/** 설날(1/1)·부처님 오신 날(4/8)·추석(8/15)의 양력 날짜 */
export function lunarHoliday(year: number, which: LunarHoliday): Date | null {
  if (which === 'seollal') return lunarToSolar(year, 1, 1);
  if (which === 'buddha') return lunarToSolar(year, 4, 8);
  return lunarToSolar(year, 8, 15);
}

/** 각 음력 달의 길이 (검증용). 모르면 null */
export function monthLengths(year: number): (number | null)[] {
  return MONTH_STARTS[year].map((s, i) => {
    const next = nextStart(year, i);
    return next ? Math.round((next.getTime() - solar(s).getTime()) / DAY) : null;
  });
}
