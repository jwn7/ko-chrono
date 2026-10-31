import { describe, it, expect } from 'vitest';
import { parse, parseAll } from '../src/index.js';

// 기준: 2026-10-30 (금) 14:00
const ref = new Date(2026, 9, 30, 14, 0);
const p = (s: string) => parse(s, { referenceDate: ref });
const d = (y: number, m: number, day: number, h = 0, min = 0) => new Date(y, m - 1, day, h, min);

describe('상대 일', () => {
  it('오늘/내일/모레/글피', () => {
    expect(p('오늘')!.date).toEqual(d(2026, 10, 30));
    expect(p('내일')!.date).toEqual(d(2026, 10, 31));
    expect(p('모레')!.date).toEqual(d(2026, 11, 1));
    expect(p('글피')!.date).toEqual(d(2026, 11, 2));
  });
  it('어제/그저께', () => {
    expect(p('어제')!.date).toEqual(d(2026, 10, 29));
    expect(p('그저께')!.date).toEqual(d(2026, 10, 28));
  });
  it('내일 오후 3시', () => {
    const r = p('내일 오후 3시에 치과');
    expect(r!.date).toEqual(d(2026, 10, 31, 15));
    expect(r!.text).toBe('내일 오후 3시');
    expect(r!.hasTime).toBe(true);
  });
});

describe('N단위 뒤/전', () => {
  it('3일 뒤', () => expect(p('3일 뒤')!.date).toEqual(d(2026, 11, 2)));
  it('2주 후', () => expect(p('2주 후')!.date).toEqual(d(2026, 11, 13)));
  it('한 달 전', () => expect(p('한 달 전')!.date).toEqual(d(2026, 9, 1)));
  it('세 시간 뒤', () => expect(p('세 시간 뒤')!.date).toEqual(d(2026, 10, 30, 17)));
  it('30분 후', () => expect(p('30분 후')!.date).toEqual(d(2026, 10, 30, 14, 30)));
  it('열흘 뒤', () => expect(p('열흘 뒤')!.date).toEqual(d(2026, 11, 9)));
  it('10분 뒤', () => expect(p('10분 뒤')!.date).toEqual(d(2026, 10, 30, 14, 10)));
  it('한 시간 반 뒤', () => {
    const r = p('한 시간 반 뒤에 출발');
    expect(r!.date).toEqual(d(2026, 10, 30, 15, 30));
    expect(r!.text).toBe('한 시간 반 뒤');
  });
  it('1시간 30분 후', () => expect(p('1시간 30분 후')!.date).toEqual(d(2026, 10, 30, 15, 30)));
  it('2시간반 전', () => expect(p('2시간반 전')!.date).toEqual(d(2026, 10, 30, 11, 30)));
});

describe('요일', () => {
  // 2026-10-30은 금요일. 월요일 시작 주 기준.
  it('다음주 화요일', () => expect(p('다음주 화요일')!.date).toEqual(d(2026, 11, 3)));
  it('이번주 일요일', () => expect(p('이번주 일요일')!.date).toEqual(d(2026, 11, 1)));
  it('다다음주 월요일', () => expect(p('다다음주 월요일')!.date).toEqual(d(2026, 11, 9)));
  it('지난주 수요일', () => expect(p('지난주 수요일')!.date).toEqual(d(2026, 10, 21)));
  it('요일 단독 → 오늘 포함 가장 가까운 미래', () => {
    expect(p('금요일')!.date).toEqual(d(2026, 10, 30));
    expect(p('월요일')!.date).toEqual(d(2026, 11, 2));
  });
  it('다음주 (요일 없음) → 그 주 월요일', () => {
    expect(p('다음주')!.date).toEqual(d(2026, 11, 2));
  });
  it('다음주 화요일 오후 3시', () => {
    expect(p('다음주 화요일 오후 3시')!.date).toEqual(d(2026, 11, 3, 15));
  });
});

describe('주말', () => {
  // 주말 = 그 주의 토요일
  it('이번 주말', () => {
    const r = p('이번 주말');
    expect(r!.date).toEqual(d(2026, 10, 31));
    expect(r!.text).toBe('이번 주말');
  });
  it('다음 주말', () => expect(p('다음 주말')!.date).toEqual(d(2026, 11, 7)));
  it('다음주말 저녁', () => expect(p('다음주말 저녁')!.date).toEqual(d(2026, 11, 7, 19)));
  it('지난 주말', () => expect(p('지난 주말')!.date).toEqual(d(2026, 10, 24)));
  it('이번 주말까지', () => expect(p('이번 주말까지')!.end).toEqual(d(2026, 10, 31, 23, 59)));
  // 규칙 11: 단독 "주말"은 다가오는 토요일 (오늘이 토/일이면 오늘)
  it('주말에 보자', () => {
    const r = p('주말에 보자');
    expect(r!.date).toEqual(d(2026, 10, 31));
    expect(r!.text).toBe('주말');
  });
  it('평일에만 가능 (잡지 않음)', () => expect(p('평일에만 가능')).toBeNull());
});

describe('지난 달 → 내년 (규칙 13)', () => {
  it('2월 말', () => expect(p('2월 말')!.date).toEqual(d(2027, 2, 28)));
  it('3월', () => expect(p('3월에 이사')!.date).toEqual(d(2027, 3, 1)));
  it('9월 말', () => expect(p('9월 말')!.date).toEqual(d(2027, 9, 30)));
  // 이번 달은 아직 안 끝났으므로 올해
  it('10월', () => expect(p('10월')!.date).toEqual(d(2026, 10, 1)));
  it('10월 초', () => expect(p('10월 초')!.date).toEqual(d(2026, 10, 1)));
  it('12월', () => expect(p('12월')!.date).toEqual(d(2026, 12, 1)));
});

describe('지난/다음 X요일', () => {
  // "지난 금요일" = 오늘을 제외한 가장 가까운 과거의 금요일
  it('지난 금요일 (오늘이 금요일)', () => expect(p('지난 금요일')!.date).toEqual(d(2026, 10, 23)));
  it('지난 금요일 (토요일 기준 → 어제)', () =>
    expect(parse('지난 금요일', { referenceDate: new Date(2026, 9, 31, 10) })!.date).toEqual(d(2026, 10, 30)));
  it('저번 수욜', () => expect(p('저번 수욜')!.date).toEqual(d(2026, 10, 28)));
  // "다음 금요일" = 오늘을 제외한 가장 가까운 미래의 금요일
  it('다음 금요일 (오늘이 금요일 → 일주일 뒤)', () => expect(p('다음 금요일')!.date).toEqual(d(2026, 11, 6)));
  it('다음 월요일', () => expect(p('다음 월요일')!.date).toEqual(d(2026, 11, 2)));
});

describe('괄호 요일 / 요일 범위', () => {
  it('11/3(화) 14:00', () => {
    const r = p('11/3(화) 14:00 킥오프');
    expect(r!.date).toEqual(d(2026, 11, 3, 14));
    expect(r!.text).toBe('11/3(화) 14:00');
  });
  it('11/3(수) (요일 불일치 → null)', () => expect(p('11/3(수)')).toBeNull());
  it('월~금', () => {
    const r = p('월~금 출근');
    expect(r!.date).toEqual(d(2026, 11, 2));
    expect(r!.end).toEqual(d(2026, 11, 6, 23, 59));
  });
  it('화~목요일', () => expect(p('화~목요일')!.end).toEqual(d(2026, 11, 5, 23, 59)));
});

describe('시각 단어 추가', () => {
  it('오전 중으로', () => {
    const r = p('오전 중으로 보내드릴게요');
    expect(r!.end).toEqual(d(2026, 10, 31, 12));
    expect(r!.text).toBe('오전 중으로');
  });
  it('내일 오후 중에', () => expect(p('내일 오후 중에')!.end).toEqual(d(2026, 10, 31, 18)));
  it('퇴근 전까지', () => expect(p('퇴근 전까지')!.end).toEqual(d(2026, 10, 30, 18)));
  it('퇴근 후에 보자', () => expect(p('퇴근 후에 보자')!.date).toEqual(d(2026, 10, 30, 18)));
  it('토요일 낮에', () => expect(p('토요일 낮에')!.date).toEqual(d(2026, 10, 31, 12)));
  it('온도가 낮다 (잡지 않음)', () => expect(p('온도가 낮다')).toBeNull());
  it('5시 10분 전', () => expect(p('5시 10분 전에 모이자')!.date).toEqual(d(2026, 10, 30, 16, 50)));
  it('30분 내로', () => expect(p('30분 내로')!.end).toEqual(d(2026, 10, 30, 14, 30)));
});

describe('고유어 일수 / 년 / 이맘때', () => {
  it('이틀 뒤', () => expect(p('이틀 뒤')!.date).toEqual(d(2026, 11, 1)));
  it('사흘 전', () => expect(p('사흘 전')!.date).toEqual(d(2026, 10, 27)));
  it('닷새 후', () => expect(p('닷새 후')!.date).toEqual(d(2026, 11, 4)));
  it('1년 뒤', () => expect(p('1년 뒤')!.date).toEqual(d(2027, 10, 30)));
  it('2년 전', () => expect(p('2년 전')!.date).toEqual(d(2024, 10, 30)));
  it('1년 뒤 (2월 29일 기준 → 2월 28일)', () =>
    expect(parse('1년 뒤', { referenceDate: new Date(2028, 1, 29, 10) })!.date).toEqual(d(2029, 2, 28)));
  it('내년 이맘때', () => expect(p('내년 이맘때')!.date).toEqual(d(2027, 10, 30)));
  it('다음달 이맘때', () => expect(p('다음달 이맘때')!.date).toEqual(d(2026, 11, 30)));
  it('다음주 이맘때', () => expect(p('다음주 이맘때')!.date).toEqual(d(2026, 11, 6)));
  it('연말 / 연초 / 월초 / 월말', () => {
    expect(p('연말')!.date).toEqual(d(2026, 12, 31));
    expect(p('연초')!.date).toEqual(d(2027, 1, 1));
    expect(p('월초')!.date).toEqual(d(2026, 10, 1));
    expect(p('월말')!.date).toEqual(d(2026, 10, 31));
  });
  it('5일장 (잡지 않음)', () => expect(p('5일장')).toBeNull());
  it('3일째 (잡지 않음)', () => expect(p('3일째 연속')).toBeNull());
});

describe('A부터 N일간 (규칙 21)', () => {
  const range = (s: string) => {
    const r = p(s);
    return [r!.date, r!.end];
  };
  it('오늘부터 3일간', () => {
    const r = p('오늘부터 3일간 휴가');
    expect([r!.date, r!.end]).toEqual([d(2026, 10, 30), d(2026, 11, 1, 23, 59)]);
    expect(r!.text).toBe('오늘부터 3일간');
  });
  it('내일부터 2주간', () => expect(range('내일부터 2주간')).toEqual([d(2026, 10, 31), d(2026, 11, 13, 23, 59)]));
  it('11월 1일부터 한 달간', () => expect(range('11월 1일부터 한 달간')).toEqual([d(2026, 11, 1), d(2026, 11, 30, 23, 59)]));
  it('내일부터 3박 4일', () => expect(range('내일부터 3박 4일')).toEqual([d(2026, 10, 31), d(2026, 11, 3, 23, 59)]));
  it('3시부터 2시간 동안', () => expect(range('3시부터 2시간 동안')).toEqual([d(2026, 10, 30, 15), d(2026, 10, 30, 17)]));
  it('내일 오전 10시부터 90분간', () =>
    expect(range('내일 오전 10시부터 90분간')).toEqual([d(2026, 10, 31, 10), d(2026, 10, 31, 11, 30)]));
});

describe('N째 주 (규칙 22)', () => {
  // 2026-10: 월 5,12,19,26 / 금 2,9,16,23,30. 2026-11: 월 2,9,16,23,30 / 토 7,14,21,28
  it('11월 첫째 주 월요일', () => expect(p('11월 첫째 주 월요일')!.date).toEqual(d(2026, 11, 2)));
  it('11월 첫째 주 일요일', () => expect(p('11월 첫째 주 일요일')!.date).toEqual(d(2026, 11, 1)));
  it('첫째 주 월요일 (이번 달)', () => expect(p('첫째 주 월요일')!.date).toEqual(d(2026, 10, 5)));
  it('11월 둘째주', () => expect(p('11월 둘째주')!.date).toEqual(d(2026, 11, 9)));
  it('둘째 주 일정 (요일 아님)', () => expect(p('둘째 주 일정')!.date).toEqual(d(2026, 10, 12)));
  it('마지막 주 금요일', () => expect(p('마지막 주 금요일')!.date).toEqual(d(2026, 10, 30)));
  it('다음 달 마지막 주 토요일', () => expect(p('다음 달 마지막 주 토요일')!.date).toEqual(d(2026, 11, 28)));
  it('11월 다섯째 주 월요일', () => expect(p('11월 다섯째 주 월요일')!.date).toEqual(d(2026, 11, 30)));
  it('11월 다섯째 주 토요일 (없음 → null)', () => expect(p('11월 다섯째 주 토요일')).toBeNull());
  it('11월 둘째 주 수요일 오후 3시', () => expect(p('11월 둘째 주 수요일 오후 3시')!.date).toEqual(d(2026, 11, 11, 15)));
  it('2월 첫째 주 (지난 달 → 내년)', () => expect(p('2월 첫째 주')!.date).toEqual(d(2027, 2, 1)));
});

describe('오탐 방지', () => {
  it('2시간짜리 영화', () => expect(p('2시간짜리 영화')).toBeNull());
  it('12시간 근무', () => expect(p('12시간 근무')).toBeNull());
  it('24시간 편의점', () => expect(p('24시간 편의점')).toBeNull());
  it('한 시간짜리', () => expect(p('한 시간짜리')).toBeNull());
  it('3일 연속', () => expect(p('3일 연속')).toBeNull());
  it('1월생', () => expect(p('1월생')).toBeNull());
  it('12월생이야', () => expect(p('12월생이야')).toBeNull());
  it('밤새 작업했어', () => expect(p('밤새 작업했어')).toBeNull());
  it('주말농장', () => expect(p('주말농장')).toBeNull());
  it('연말정산', () => expect(p('연말정산 서류')).toBeNull());
  it('주말에 (정상)', () => expect(p('주말에')!.date).toEqual(d(2026, 10, 31)));
  it('3시간 뒤 (정상)', () => expect(p('3시간 뒤')!.date).toEqual(d(2026, 10, 30, 17)));
});

describe('내내', () => {
  it('이번 주 내내', () => {
    const r = p('이번 주 내내 비 온대');
    expect(r!.date).toEqual(d(2026, 10, 26));
    expect(r!.end).toEqual(d(2026, 11, 1, 23, 59));
    expect(r!.text).toBe('이번 주 내내');
  });
  it('다음 달 내내', () => {
    const r = p('다음 달 내내');
    expect([r!.date, r!.end]).toEqual([d(2026, 11, 1), d(2026, 11, 30, 23, 59)]);
  });
  it('내년 내내', () => expect(p('내년 내내')!.end).toEqual(d(2027, 12, 31, 23, 59)));
  it('내일 내내', () => expect(p('내일 내내')!.end).toEqual(d(2026, 10, 31, 23, 59)));
});

describe('기간 표현은 날짜가 아니다', () => {
  it('5일간 (잡지 않음)', () => expect(p('5일간 여행')).toBeNull());
  it('3박 4일 (잡지 않음)', () => expect(p('3박 4일')).toBeNull());
  it('3일 동안 (잡지 않음)', () => expect(p('3일 동안')).toBeNull());
  it('월요일부터 금요일까지', () => {
    const r = p('월요일부터 금요일까지');
    expect(r!.date).toEqual(d(2026, 11, 2));
    expect(r!.end).toEqual(d(2026, 11, 6, 23, 59));
  });
});

describe('구어체', () => {
  it('담주 월욜', () => expect(p('담주 월욜')!.date).toEqual(d(2026, 11, 2)));
  it('화욜', () => expect(p('화욜')!.date).toEqual(d(2026, 11, 3)));
  it('낼 오후 2시', () => expect(p('낼 오후 2시')!.date).toEqual(d(2026, 10, 31, 14)));
  it('낼 봐', () => expect(p('낼 봐')!.date).toEqual(d(2026, 10, 31)));
  it('내가 낼게 (잡지 않음)', () => expect(p('내가 낼게')).toBeNull());
  it('밥값은 내가 낼 거야 (잡지 않음)', () => expect(p('밥값은 내가 낼 거야')).toBeNull());
  it('내일모레', () => expect(p('내일모레 시간 돼?')!.date).toEqual(d(2026, 11, 1)));
  it('낼모레', () => expect(p('낼모레')!.date).toEqual(d(2026, 11, 1)));
});

describe('날짜 + 요일', () => {
  it('11월 5일 목요일 오후 4시', () => {
    const r = p('11월 5일 목요일 오후 4시');
    expect(r!.date).toEqual(d(2026, 11, 5, 16));
    expect(r!.text).toBe('11월 5일 목요일 오후 4시');
  });
  it('11월 5일 수요일 (요일 불일치 → null)', () => expect(p('11월 5일 수요일')).toBeNull());
});

describe('기간 마감', () => {
  it('이번 주 안에', () => expect(p('이번 주 안에')!.end).toEqual(d(2026, 11, 1, 23, 59)));
  it('다음주 중으로', () => expect(p('다음주 중으로')!.end).toEqual(d(2026, 11, 8, 23, 59)));
  it('이번달 안에', () => expect(p('이번달 안에')!.end).toEqual(d(2026, 10, 31, 23, 59)));
  it('올해 안에', () => expect(p('올해 안에')!.end).toEqual(d(2026, 12, 31, 23, 59)));
  it('다음주 월요일까지 (요일은 그대로)', () => expect(p('다음주 월요일까지')!.end).toEqual(d(2026, 11, 2, 23, 59)));
});

describe('날짜 + 상대 시간은 따로 (규칙 15)', () => {
  const all = (s: string) => parseAll(s, { referenceDate: ref });
  it('내일 30분 후', () => {
    const r = all('내일 30분 후');
    expect(r).toHaveLength(2);
    expect(r[0].date).toEqual(d(2026, 10, 31));
    expect(r[1].date).toEqual(d(2026, 10, 30, 14, 30));
  });
  it('이번 주말 한 시간 반 뒤', () => {
    const r = all('이번 주말 한 시간 반 뒤');
    expect(r).toHaveLength(2);
    expect(r[0].date).toEqual(d(2026, 10, 31));
  });
  // 일 단위 상대 이동은 시각과 묶인다
  it('3일 뒤 오후 3시', () => {
    const r = all('3일 뒤 오후 3시');
    expect(r).toHaveLength(1);
    expect(r[0].date).toEqual(d(2026, 11, 2, 15));
  });
});

describe('날짜가 명시된 지난 시각 (규칙 14)', () => {
  it('오늘 아침', () => expect(p('오늘 아침')!.date).toEqual(d(2026, 10, 30, 8)));
  it('금요일 아침', () => expect(p('금요일 아침')!.date).toEqual(d(2026, 10, 30, 8)));
  it('오늘 오전 10시', () => expect(p('오늘 오전 10시')!.date).toEqual(d(2026, 10, 30, 10)));
});

describe('절대 날짜', () => {
  it('11월 5일', () => expect(p('11월 5일')!.date).toEqual(d(2026, 11, 5)));
  it('2027년 1월 2일', () => expect(p('2027년 1월 2일')!.date).toEqual(d(2027, 1, 2)));
  it('11/5 10시 반', () => expect(p('11/5 10시 반')!.date).toEqual(d(2026, 11, 5, 10, 30)));
  it('2026-12-25', () => expect(p('2026-12-25')!.date).toEqual(d(2026, 12, 25)));
  it('지난 월일은 내년으로', () => expect(p('3월 1일')!.date).toEqual(d(2027, 3, 1)));
  it('5일 (일 단독, 이번달)', () => expect(p('5일에 보자')!.date).toEqual(d(2026, 10, 5)));
});

describe('요일/날짜 + 시각 단어', () => {
  it('토요일 아침', () => {
    const r = p('토요일 아침');
    expect(r!.date).toEqual(d(2026, 10, 31, 8));
    expect(r!.text).toBe('토요일 아침');
    expect(r!.hasTime).toBe(true);
  });
  it('내일 저녁', () => {
    const r = p('내일 저녁');
    expect(r!.date).toEqual(d(2026, 10, 31, 19));
    expect(r!.text).toBe('내일 저녁');
  });
  it('다음주 화요일 점심', () => expect(p('다음주 화요일 점심')!.date).toEqual(d(2026, 11, 3, 12)));
  it('모레 밤에 전화할게', () => {
    const r = p('모레 밤에 전화할게');
    expect(r!.date).toEqual(d(2026, 11, 1, 21));
    expect(r!.text).toBe('모레 밤');
  });
});

describe('엣지 케이스', () => {
  // 연말/월말 넘어감
  it('62일 뒤', () => expect(p('62일 뒤')!.date).toEqual(d(2026, 12, 31)));
  it('63일 뒤', () => expect(p('63일 뒤')!.date).toEqual(d(2027, 1, 1)));
  it('다다음달 말', () => expect(p('다다음달 말')!.date).toEqual(d(2026, 12, 31)));
  // 윤년
  it('2028년 2월 29일', () => expect(p('2028년 2월 29일')!.date).toEqual(d(2028, 2, 29)));
  it('2028-02-29', () => expect(p('2028-02-29')!.date).toEqual(d(2028, 2, 29)));
  // 없는 날짜는 다음 달로 넘기지 않고 null
  it('2027년 2월 29일 (윤년 아님)', () => expect(p('2027년 2월 29일')).toBeNull());
  it('2027-02-29', () => expect(p('2027-02-29')).toBeNull());
  it('11월 31일', () => expect(p('11월 31일')).toBeNull());
  it('11/31', () => expect(p('11/31')).toBeNull());
  it('다음달 31일', () => expect(p('다음달 31일')).toBeNull());
  // 24시 / 밤 12시
  it('24시', () => expect(p('24시')!.date).toEqual(d(2026, 10, 31, 0)));
  it('25시', () => expect(p('25시')).toBeNull());
  it('밤 12시', () => expect(p('밤 12시')!.date).toEqual(d(2026, 10, 31, 0)));
  it('오전 12시', () => expect(p('오전 12시')!.date).toEqual(d(2026, 10, 31, 0)));
  // 연도 단독
  it('2027년', () => {
    const r = p('2027년에 출시');
    expect(r!.date).toEqual(d(2027, 1, 1));
    expect(r!.text).toBe('2027년');
  });
  it('3000년 (범위 밖, 잡지 않음)', () => expect(p('3000년')).toBeNull());
});

describe('띄어쓰기 변형', () => {
  it('다음주화요일', () => expect(p('다음주화요일')!.date).toEqual(d(2026, 11, 3)));
  it('오후3시', () => expect(p('오후3시')!.date).toEqual(d(2026, 10, 30, 15)));
  it('11월5일', () => expect(p('11월5일')!.date).toEqual(d(2026, 11, 5)));
  it('다음 주 화요일', () => expect(p('다음 주 화요일')!.date).toEqual(d(2026, 11, 3)));
  it('내일오후3시반에봐', () => {
    const r = p('내일오후3시반에봐');
    expect(r!.date).toEqual(d(2026, 10, 31, 15, 30));
    expect(r!.text).toBe('내일오후3시반');
  });
  it('3일뒤', () => expect(p('3일뒤')!.date).toEqual(d(2026, 11, 2)));
  it('다음달말', () => expect(p('다음달말')!.date).toEqual(d(2026, 11, 30)));
  it('이번주말까지', () => expect(p('이번주말까지')!.end).toEqual(d(2026, 10, 31, 23, 59)));
  it('2027년1월2일', () => expect(p('2027년1월2일')!.date).toEqual(d(2027, 1, 2)));
});

describe('조사 변형', () => {
  it('내일은', () => expect(p('내일은 안 돼')!.date).toEqual(d(2026, 10, 31)));
  it('모레까지는', () => expect(p('모레까지는 끝낼게')!.end).toEqual(d(2026, 11, 1, 23, 59)));
  it('3시쯤', () => {
    const r = p('오후 3시쯤 갈게');
    expect(r!.date).toEqual(d(2026, 10, 30, 15));
    expect(r!.text).toBe('오후 3시');
  });
  it('3시경', () => expect(p('오후 3시경')!.date).toEqual(d(2026, 10, 30, 15)));
  // 날짜와 시각 사이에 조사가 끼어도 하나로 묶는다
  it('내일은 오후 3시에', () => {
    const r = parseAll('내일은 오후 3시에 시간 돼', { referenceDate: ref });
    expect(r).toHaveLength(1);
    expect(r[0].date).toEqual(d(2026, 10, 31, 15));
  });
  it('토요일쯤 저녁에', () => expect(p('토요일쯤 저녁에')!.date).toEqual(d(2026, 10, 31, 19)));
  it('다음주 화요일이나 오후 3시', () => {
    // "이나"는 묶지 않는다 (다른 선택지일 수 있음)
    expect(parseAll('다음주 화요일이나 오후 3시', { referenceDate: ref })).toHaveLength(2);
  });
  it('모레도 오후 2시', () => expect(p('모레도 오후 2시 괜찮아')!.date).toEqual(d(2026, 11, 1, 14)));
});

describe('한글 월일', () => {
  it('십일월 오일', () => {
    const r = p('십일월 오일에 봐');
    expect(r!.date).toEqual(d(2026, 11, 5));
    expect(r!.text).toBe('십일월 오일');
  });
  it('유월 이십오일', () => expect(p('유월 이십오일')!.date).toEqual(d(2027, 6, 25)));
  it('시월 삼십일일', () => expect(p('시월 삼십일일')!.date).toEqual(d(2026, 10, 31)));
  it('십이월 이십오일', () => expect(p('십이월 이십오일')!.date).toEqual(d(2026, 12, 25)));
  // 오탐 방지: 월 없이 "오일"만 있으면 잡지 않는다
  it('오일 교환 (잡지 않음)', () => expect(p('오일 교환')).toBeNull());
});

describe('연도 상대', () => {
  it('올해 말', () => expect(p('올해 말')!.date).toEqual(d(2026, 12, 31)));
  it('내년 초', () => expect(p('내년 초')!.date).toEqual(d(2027, 1, 1)));
  it('작년', () => {
    const r = p('작년에 갔던 곳');
    expect(r!.date).toEqual(d(2025, 1, 1));
    expect(r!.text).toBe('작년');
  });
  it('재작년', () => expect(p('재작년')!.date).toEqual(d(2024, 1, 1)));
  it('내후년', () => expect(p('내후년')!.date).toEqual(d(2028, 1, 1)));
  // 연도가 정해졌으므로 "지난 월일 → 내년" 규칙을 적용하지 않는다
  it('올해 3월 1일', () => expect(p('올해 3월 1일')!.date).toEqual(d(2026, 3, 1)));
  it('내년 3월 1일', () => expect(p('내년 3월 1일')!.date).toEqual(d(2027, 3, 1)));
  it('작년 12월', () => expect(p('작년 12월')!.date).toEqual(d(2025, 12, 1)));
  it('올해 말까지', () => expect(p('올해 말까지')!.end).toEqual(d(2026, 12, 31, 23, 59)));
});

describe('두 자리 연도', () => {
  // 00~69 → 20xx, 70~99 → 19xx
  it('26년 12월 1일', () => {
    const r = p('26년 12월 1일');
    expect(r!.date).toEqual(d(2026, 12, 1));
    expect(r!.text).toBe('26년 12월 1일');
  });
  // 연도가 없었다면 "지난 월일 → 내년" 규칙으로 2027년이 됐을 날짜
  it('25년 3월 1일', () => expect(p('25년 3월 1일')!.date).toEqual(d(2025, 3, 1)));
  it('99년 1월 1일', () => expect(p('99년 1월 1일')!.date).toEqual(d(1999, 1, 1)));
  it('27.1.2', () => {
    const r = p('27.1.2');
    expect(r!.date).toEqual(d(2027, 1, 2));
    expect(r!.text).toBe('27.1.2');
  });
  it('25-03-01', () => expect(p('25-03-01')!.date).toEqual(d(2025, 3, 1)));
  it('70.5.6', () => expect(p('70.5.6')!.date).toEqual(d(1970, 5, 6)));
  it('26.13.1 (없는 월은 무시)', () => expect(p('26.13.1')).toBeNull());
});

describe('월', () => {
  it('이번달 말', () => expect(p('이번달 말')!.date).toEqual(d(2026, 10, 31)));
  it('다음달 초', () => expect(p('다음달 초')!.date).toEqual(d(2026, 11, 1)));
  it('다음 달 중순', () => expect(p('다음 달 중순')!.date).toEqual(d(2026, 11, 15)));
  it('12월 말', () => expect(p('12월 말')!.date).toEqual(d(2026, 12, 31)));
});

describe('시각', () => {
  it('오전/오후', () => {
    expect(p('오전 10시 30분')!.date).toEqual(d(2026, 10, 31, 10, 30)); // 14:00 기준 지났으니 내일
    expect(p('오후 3시')!.date).toEqual(d(2026, 10, 30, 15));
    expect(p('저녁 7시')!.date).toEqual(d(2026, 10, 30, 19));
    expect(p('새벽 2시')!.date).toEqual(d(2026, 10, 31, 2));
    expect(p('낮 12시')!.date).toEqual(d(2026, 10, 31, 12));
  });
  it('고유어 시', () => {
    expect(p('내일 세 시')!.date).toEqual(d(2026, 10, 31, 15));
    expect(p('내일 오후 두시 반')!.date).toEqual(d(2026, 10, 31, 14, 30));
  });
  it('15:30', () => expect(p('내일 15:30')!.date).toEqual(d(2026, 10, 31, 15, 30)));
  it('오후 12시 (24시가 아니라 정오)', () => expect(p('내일 오후 12시')!.date).toEqual(d(2026, 10, 31, 12)));
  it('오후 12시 30분', () => expect(p('내일 오후 12시 30분')!.date).toEqual(d(2026, 10, 31, 12, 30)));
  it('오전/오후 없는 1~6시는 오후 (규칙 20)', () => {
    expect(p('3시에 보자')!.date).toEqual(d(2026, 10, 30, 15));
    expect(p('내일 2시 반')!.date).toEqual(d(2026, 10, 31, 14, 30));
    expect(p('6시')!.date).toEqual(d(2026, 10, 30, 18));
    expect(p('7시')!.date).toEqual(d(2026, 10, 31, 7)); // 7~11시는 그대로
    expect(p('12시')!.date).toEqual(d(2026, 10, 31, 12));
    expect(p('5시까지 보내줘')!.end).toEqual(d(2026, 10, 30, 17));
    expect(p('내일 3:30')!.date).toEqual(d(2026, 10, 31, 3, 30)); // 24시간 표기는 그대로
  });
  it('밤 1시 (새벽)', () => expect(p('밤 1시')!.date).toEqual(d(2026, 10, 31, 1)));
  it('밤 11시 반', () => expect(p('밤 11시 반')!.date).toEqual(d(2026, 10, 30, 23, 30)));
  it('오후 3:30', () => expect(p('오후 3:30')!.date).toEqual(d(2026, 10, 30, 15, 30)));
  it('오전 9:00', () => expect(p('내일 오전 9:00')!.date).toEqual(d(2026, 10, 31, 9)));
  it('7시30', () => expect(p('내일 7시30')!.date).toEqual(d(2026, 10, 31, 7, 30)));
  it('3시 정각', () => {
    const r = p('3시 정각에');
    expect(r!.date).toEqual(d(2026, 10, 30, 15));
    expect(r!.text).toBe('3시 정각');
  });
  it('3pm', () => expect(p('3pm')!.date).toEqual(d(2026, 10, 30, 15)));
  it('9 AM', () => expect(p('내일 9 AM')!.date).toEqual(d(2026, 10, 31, 9)));
  it('12pm', () => expect(p('내일 12pm')!.date).toEqual(d(2026, 10, 31, 12)));
  it('점심/정오/자정', () => {
    expect(p('모레 점심')!.date).toEqual(d(2026, 11, 1, 12));
    // 규칙 12: 날짜 + 자정 = 그 날의 끝 (다음날 00:00)
    expect(p('내일 자정')!.date).toEqual(d(2026, 11, 1, 0));
  });
  it('자정', () => expect(p('자정')!.date).toEqual(d(2026, 10, 31, 0)));
  it('오늘 자정', () => expect(p('오늘 자정')!.date).toEqual(d(2026, 10, 31, 0)));
  it('내일 24시', () => expect(p('내일 24시')!.date).toEqual(d(2026, 11, 1, 0)));
  it('내일 밤 12시', () => expect(p('내일 밤 12시')!.date).toEqual(d(2026, 11, 1, 0)));
  it('내일 자정까지', () => expect(p('내일 자정까지')!.end).toEqual(d(2026, 11, 1, 0)));
  it('내일 오전 12시', () => expect(p('내일 오전 12시')!.date).toEqual(d(2026, 10, 31, 0)));
});

describe('구간', () => {
  it('이번달 말까지', () => {
    const r = p('이번달 말까지 제출');
    expect(r!.date).toEqual(ref);
    expect(r!.end).toEqual(d(2026, 10, 31, 23, 59));
  });
  it('3일 이내', () => {
    expect(p('3일 이내')!.end).toEqual(d(2026, 11, 2, 23, 59));
  });
  it('11월 1일부터 11월 3일까지', () => {
    const r = p('11월 1일부터 11월 3일까지 휴가');
    expect(r!.date).toEqual(d(2026, 11, 1));
    expect(r!.end).toEqual(d(2026, 11, 3, 23, 59));
    expect(r!.text).toBe('11월 1일부터 11월 3일까지');
  });
});

describe('시 범위 (규칙 16)', () => {
  const range = (s: string) => {
    const r = p(s);
    return [r!.date, r!.end];
  };
  it('3시부터 5시까지', () => expect(range('3시부터 5시까지')).toEqual([d(2026, 10, 30, 15), d(2026, 10, 30, 17)]));
  it('오후 3시부터 5시까지', () =>
    expect(range('오후 3시부터 5시까지')).toEqual([d(2026, 10, 30, 15), d(2026, 10, 30, 17)]));
  it('내일 오후 2시부터 4시 반까지', () =>
    expect(range('내일 오후 2시부터 4시 반까지')).toEqual([d(2026, 10, 31, 14), d(2026, 10, 31, 16, 30)]));
  it('내일 오전 9시부터 6시까지', () =>
    expect(range('내일 오전 9시부터 6시까지')).toEqual([d(2026, 10, 31, 9), d(2026, 10, 31, 18)]));
  it('오후 11시부터 1시까지', () =>
    expect(range('오후 11시부터 1시까지')).toEqual([d(2026, 10, 30, 23), d(2026, 10, 31, 1)]));
  it('오후 3시부터 오전 1시까지', () =>
    expect(range('오후 3시부터 오전 1시까지')).toEqual([d(2026, 10, 30, 15), d(2026, 10, 31, 1)]));
  it('3~5시', () => expect(range('3~5시')).toEqual([d(2026, 10, 30, 15), d(2026, 10, 30, 17)]));
  it('내일 오후 3~5시 회의', () => {
    const r = p('내일 오후 3~5시 회의');
    expect([r!.date, r!.end]).toEqual([d(2026, 10, 31, 15), d(2026, 10, 31, 17)]);
    expect(r!.text).toBe('내일 오후 3~5시');
  });
  it('오후 3시~5시', () => expect(range('오후 3시~5시')).toEqual([d(2026, 10, 30, 15), d(2026, 10, 30, 17)]));
  // 끝에 일만 있으면 시작의 연월을 이어받는다
  it('11월 1일부터 3일까지', () =>
    expect(range('11월 1일부터 3일까지')).toEqual([d(2026, 11, 1), d(2026, 11, 3, 23, 59)]));
  it('11월 1일~3일', () => expect(range('11월 1일~3일')).toEqual([d(2026, 11, 1), d(2026, 11, 3, 23, 59)]));
  it('11월 28일부터 2일까지', () =>
    expect(range('11월 28일부터 2일까지')).toEqual([d(2026, 11, 28), d(2026, 12, 2, 23, 59)]));
  it('11/1~11/3', () => expect(range('11/1~11/3')).toEqual([d(2026, 11, 1), d(2026, 11, 3, 23, 59)]));
  it('15:00~17:00', () => expect(range('15:00~17:00')).toEqual([d(2026, 10, 30, 15), d(2026, 10, 30, 17)]));
});

describe('timezone 옵션', () => {
  // 기준 시각 ref = 2026-10-30 05:00 UTC = 서울 14:00 = 뉴욕 01:00 (EDT, 11/1에 EST로 바뀜)
  // 결과는 기계 시간대와 무관한 실제 시점이어야 한다 (서버가 UTC여도 같은 답)
  const utc = (y: number, m: number, day: number, h = 0, min = 0) => new Date(Date.UTC(y, m - 1, day, h, min));
  // 파일 상단의 ref는 기계 로컬 14:00이라, 여기서는 기계와 무관한 실제 시점으로 고정한다
  const at = utc(2026, 10, 30, 5);
  const tz = (s: string, timezone: string) => parse(s, { referenceDate: at, timezone });

  it('오후 3시 (Asia/Seoul)', () => expect(tz('오후 3시', 'Asia/Seoul')!.date).toEqual(utc(2026, 10, 30, 6)));
  it('다음주 화요일 오후 3시 (Asia/Seoul)', () =>
    expect(tz('다음주 화요일 오후 3시', 'Asia/Seoul')!.date).toEqual(utc(2026, 11, 3, 6)));
  it('오후 3시 (UTC)', () => expect(tz('오후 3시', 'UTC')!.date).toEqual(utc(2026, 10, 30, 15)));
  it('내일 (UTC)', () => expect(tz('내일', 'UTC')!.date).toEqual(utc(2026, 10, 31)));
  it('오후 3시 (America/New_York)', () => expect(tz('오후 3시', 'America/New_York')!.date).toEqual(utc(2026, 10, 30, 19)));
  // 서머타임이 끝난 뒤(EST, UTC-5)의 날짜
  it('다음주 월요일 (America/New_York)', () =>
    expect(tz('다음주 월요일', 'America/New_York')!.date).toEqual(utc(2026, 11, 2, 5)));
  it('이번 주 안에 (America/New_York)', () => {
    const r = tz('이번 주 안에', 'America/New_York');
    expect(r!.date).toEqual(at);
    expect(r!.end).toEqual(utc(2026, 11, 2, 4, 59));
  });
  it('오늘부터 3일간 (Asia/Seoul)', () => {
    const r = tz('오늘부터 3일간', 'Asia/Seoul');
    expect([r!.date, r!.end]).toEqual([utc(2026, 10, 29, 15), utc(2026, 11, 1, 14, 59)]);
  });
  it('없는 시간대는 RangeError', () => expect(() => tz('내일', 'Mars/Olympus')).toThrow(RangeError));
});

describe('문장 속', () => {
  it('문장 중간', () => {
    const r = p('그럼 다음주 수요일 저녁 7시에 강남에서 볼까?');
    expect(r!.date).toEqual(d(2026, 11, 4, 19));
    expect(r!.text).toBe('다음주 수요일 저녁 7시');
    expect(r!.index).toBe(3);
  });
  it('여러 개', () => {
    const rs = parseAll('내일 10시 아니면 모레 2시', { referenceDate: ref });
    expect(rs).toHaveLength(2);
    expect(rs[0].date).toEqual(d(2026, 10, 31, 10));
    expect(rs[1].date).toEqual(d(2026, 11, 1, 14));
  });
  it('없으면 null', () => {
    expect(p('안녕하세요')).toBeNull();
    expect(p('일단 해보자')).toBeNull();
  });
});
