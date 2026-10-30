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
    expect(p('내일 세 시')!.date).toEqual(d(2026, 10, 31, 3));
    expect(p('내일 오후 두시 반')!.date).toEqual(d(2026, 10, 31, 14, 30));
  });
  it('15:30', () => expect(p('내일 15:30')!.date).toEqual(d(2026, 10, 31, 15, 30)));
  it('오후 12시 (24시가 아니라 정오)', () => expect(p('내일 오후 12시')!.date).toEqual(d(2026, 10, 31, 12)));
  it('오후 12시 30분', () => expect(p('내일 오후 12시 30분')!.date).toEqual(d(2026, 10, 31, 12, 30)));
  it('점심/정오/자정', () => {
    expect(p('모레 점심')!.date).toEqual(d(2026, 11, 1, 12));
    expect(p('내일 자정')!.date).toEqual(d(2026, 10, 31, 0));
  });
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
    expect(rs[1].date).toEqual(d(2026, 11, 1, 2));
  });
  it('없으면 null', () => {
    expect(p('안녕하세요')).toBeNull();
    expect(p('일단 해보자')).toBeNull();
  });
});
