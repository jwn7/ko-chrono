import { describe, it, expect } from 'vitest';
import { LUNAR_YEARS, lunarHoliday, monthLengths } from '../src/util/lunarHolidays.js';

// KASI에서 옮긴 음력 표가 그럴듯한지 스스로 검증한다. 표를 고치거나 새 연도를 넣으면 여기서 걸러진다.
const iso = (d: Date | null) =>
  d && `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

describe('음력 표 검증', () => {
  it('모든 달은 29일이나 30일 (길이를 모르는 마지막 달 제외)', () => {
    for (const y of LUNAR_YEARS) {
      for (const len of monthLengths(y)) if (len !== null) expect([29, 30]).toContain(len);
    }
  });

  // 관공서 공휴일 목록과 교차 확인한 날짜
  const HOLIDAYS: Record<number, [string, string, string]> = {
    2025: ['2025-01-29', '2025-05-05', '2025-10-06'],
    2026: ['2026-02-17', '2026-05-24', '2026-09-25'],
    2027: ['2027-02-07', '2027-05-13', '2027-09-15'],
    2028: ['2028-01-27', '2028-05-02', '2028-10-03'],
  };
  for (const [y, [seollal, buddha, chuseok]] of Object.entries(HOLIDAYS)) {
    it(`${y}년 설날·부처님 오신 날·추석`, () => {
      expect([iso(lunarHoliday(+y, 'seollal')), iso(lunarHoliday(+y, 'buddha')), iso(lunarHoliday(+y, 'chuseok'))]).toEqual([
        seollal,
        buddha,
        chuseok,
      ]);
    });
  }
});
