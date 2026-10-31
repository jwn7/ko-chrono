export type WeekStart = 'monday' | 'sunday';

export interface ParseOptions {
  /** 기준 시각. 기본값: new Date() */
  referenceDate?: Date;
  /** 주의 시작 요일. "이번주/다음주" 계산 기준. 기본값: 'monday' */
  weekStart?: WeekStart;
  /** 시간이 명시되지 않았을 때 넣을 시(hour). 기본값: 0 (00:00) */
  defaultHour?: number;
  /**
   * "오후 3시"를 어느 시간대의 3시로 볼지. IANA 이름 ('Asia/Seoul', 'UTC', 'America/New_York').
   * 기본값: 실행 환경의 시간대. 서버(UTC)에서 한국 사용자 문장을 처리할 땐 'Asia/Seoul'을 넘긴다.
   * 없는 이름이면 RangeError.
   */
  timezone?: string;
}

/** resolve()가 쓰는 옵션. timezone은 parseAll()이 앞뒤에서 처리하므로 빠진다. */
export type ResolveOptions = Required<Omit<ParseOptions, 'timezone'>>;

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
  /** "지난 금요일"(오늘 제외 과거) / "다음 금요일"(오늘 제외 미래) */
  weekdayDir?: 'past' | 'next';
  /** "1년 뒤", "내년 이맘때": 연/월/주 이동 시 기준일의 날짜를 유지 */
  sameDay?: boolean;
  /** "내일 이 시간": 기준 시각의 시:분을 쓴다 */
  sameTime?: boolean;
  /** "매주 월요일", "매달 15일": 반복 규칙 (rrule은 resolve가 만든다) */
  recur?: Omit<Recurrence, 'rrule'>;
  /** 연 단위 이동 (내년=+1). 지정되면 "지난 월일 → 내년" 규칙을 적용하지 않는다 */
  yearOffset?: number;
  /** 월 단위 이동 (다음달=+1) */
  monthOffset?: number;
  /** 월 안의 위치: 초(1일)/중순(15일)/말(마지막날) */
  monthPart?: 'start' | 'middle' | 'end';
  /** 오전/오후 등이 명시됨 (15:30 같은 24시간 표기 포함). 시 범위의 끝을 맞출 때 쓴다 */
  meridiem?: boolean;
  /** "자정", "24시", "밤 12시": 날짜가 있으면 그 날의 끝(다음날 00:00) */
  midnight?: boolean;
  /** 시/분 단위 상대 이동 */
  hourOffset?: number;
  minuteOffset?: number;
  /** "3일간", "2주 동안", "3박 4일": 앞의 날짜부터 이어지는 기간. 날짜 없이 단독이면 null */
  durationDays?: number;
  durationMonths?: number;
  durationMinutes?: number;
  /** "N째 주": 1~5, 마지막은 -1. weekday가 있으면 그 달의 N번째 그 요일, 없으면 N번째 주 시작일 */
  nthWeek?: number;
  /** "이번 주 내내": 그 기간 전체. date는 시작, end는 기간의 끝 */
  whole?: boolean;
  /** 이 조각이 "~까지" 종료점인지 */
  isEnd?: boolean;
  /** 이 조각이 "~부터" 시작점인지 */
  isStart?: boolean;
}

export type Frequency = 'MINUTELY' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

/** 반복 일정. 필드 이름과 값은 RFC 5545 RRULE을 따른다 */
export interface Recurrence {
  freq: Frequency;
  /** 몇 번째마다 (격주 = 2) */
  interval: number;
  /** 요일들. 0=일 … 6=토 */
  byWeekday?: number[];
  /** 매달 N번째 요일 ("마지막 주 금요일" = -1). byWeekday와 함께 쓴다 */
  byWeekdayNth?: number;
  /** 매달 며칠 (말일 = -1) */
  byMonthDay?: number;
  /** 매년 몇 월 */
  byMonth?: number;
  /** 'FREQ=WEEKLY;BYDAY=MO,WE,FR'. date를 DTSTART로 함께 쓰면 캘린더에 그대로 넣을 수 있다 */
  rrule: string;
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
  /** 반복 일정이면 그 규칙. date는 기준 시각 이후 첫 발생 */
  recurrence?: Recurrence;
}

export type Parser = (text: string) => Fragment[];
