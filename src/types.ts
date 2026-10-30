export type WeekStart = 'monday' | 'sunday';

export interface ParseOptions {
  /** 기준 시각. 기본값: new Date() */
  referenceDate?: Date;
  /** 주의 시작 요일. "이번주/다음주" 계산 기준. 기본값: 'monday' */
  weekStart?: WeekStart;
  /** 시간이 명시되지 않았을 때 넣을 시(hour). 기본값: 0 (00:00) */
  defaultHour?: number;
}

/** 파서들이 추출하는 중간 결과. 날짜/시간 중 아는 것만 채운다. */
export interface Components {
  year?: number;
  month?: number; // 1-12
  day?: number;
  hour?: number; // 0-23
  minute?: number;
  /** 기준일로부터 일 단위 이동 (내일=+1) */
  dayOffset?: number;
  /** 기준 주로부터 주 단위 이동 (다음주=+1) */
  weekOffset?: number;
  /** 0=일 … 6=토 (JS getDay 규약) */
  weekday?: number;
  /** "주말" 단독: 오늘이 토/일이면 오늘, 아니면 다가오는 토요일 */
  weekend?: boolean;
  /** 연 단위 이동 (내년=+1). 지정되면 "지난 월일 → 내년" 규칙을 적용하지 않는다 */
  yearOffset?: number;
  /** 월 단위 이동 (다음달=+1) */
  monthOffset?: number;
  /** 월 안의 위치: 초(1일)/중순(15일)/말(마지막날) */
  monthPart?: 'start' | 'middle' | 'end';
  /** "자정", "24시", "밤 12시": 날짜가 있으면 그 날의 끝(다음날 00:00) */
  midnight?: boolean;
  /** 시/분 단위 상대 이동 */
  hourOffset?: number;
  minuteOffset?: number;
  /** 이 조각이 "~까지" 종료점인지 */
  isEnd?: boolean;
  /** 이 조각이 "~부터" 시작점인지 */
  isStart?: boolean;
}

export interface Fragment {
  text: string;
  index: number;
  components: Components;
}

export interface ParseResult {
  /** 해석된 시각 (구간이면 시작) */
  date: Date;
  /** 구간의 끝. "~까지", "A부터 B까지" 인 경우만 */
  end?: Date;
  /** 입력에서 날짜로 인식된 부분 */
  text: string;
  /** 입력 내 위치 */
  index: number;
  /** 시간이 명시되었는지 */
  hasTime: boolean;
}

export type Parser = (text: string) => Fragment[];
