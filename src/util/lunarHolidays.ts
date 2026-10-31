// 음력 명절의 양력 날짜. 런타임 의존성 없이 음력 변환을 하려면 표가 필요하다.
//
// 출처: 한국천문연구원 천문우주지식정보 "월별 양음력 대조" (astro.kasi.re.kr/life/post/calendarData)
//       2025년은 관공서 공휴일 목록. 2026년 부처님 오신 날·추석은 공휴일 목록으로 교차 확인.
// KASI는 2~3년 앞까지만 공식 자료를 낸다 (2026-10 기준 2028년까지). 새 연도가 공개되면 한 줄 추가할 것.
// 표에 없는 연도는 추측하지 않고 null (규칙 10). 한국 설날은 한국 표준시 기준이라 중국 춘절과 하루 다를 수 있다.

export type LunarHoliday = 'seollal' | 'chuseok' | 'buddha';

/** 연도 → [월, 일] (양력) */
export const LUNAR_HOLIDAYS: Record<number, Record<LunarHoliday, [number, number]>> = {
  2025: { seollal: [1, 29], buddha: [5, 5], chuseok: [10, 6] },
  2026: { seollal: [2, 17], buddha: [5, 24], chuseok: [9, 25] },
  2027: { seollal: [2, 7], buddha: [5, 13], chuseok: [9, 15] },
  2028: { seollal: [1, 27], buddha: [5, 2], chuseok: [10, 3] },
};
