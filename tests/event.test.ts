import { describe, it, expect } from 'vitest';
import { parseEvent } from '../src/index.js';

// 기준: 2026-10-30 (금) 14:00
const ref = new Date(2026, 9, 30, 14, 0);
const ev = (s: string) => parseEvent(s, { referenceDate: ref });
const d = (y: number, m: number, day: number, h = 0, min = 0) => new Date(y, m - 1, day, h, min);

// 규칙 28: 제목 = 날짜로 인식된 부분과 거기 붙은 조사를 뺀 나머지
describe('parseEvent: 제목 분리', () => {
  it('내일 오후 3시 치과', () => expect(ev('내일 오후 3시 치과')).toEqual({ title: '치과', date: d(2026, 10, 31, 15), hasTime: true }));
  it('치과 예약 내일 3시', () => expect(ev('치과 예약 내일 3시')).toMatchObject({ title: '치과 예약', date: d(2026, 10, 31, 15) }));
  it('다음주 금요일까지 보고서 제출', () =>
    expect(ev('다음주 금요일까지 보고서 제출')).toEqual({
      title: '보고서 제출',
      date: ref,
      end: d(2026, 11, 6, 23, 59),
      hasTime: false,
    }));
  it('내일 오후 3시에 강남역에서 친구 만나기', () =>
    expect(ev('내일 오후 3시에 강남역에서 친구 만나기').title).toBe('강남역에서 친구 만나기'));
  it('모레까지는 꼭 끝내기', () => expect(ev('모레까지는 꼭 끝내기').title).toBe('꼭 끝내기'));
  it('11월 1일부터 3일까지 제주도 여행', () =>
    expect(ev('11월 1일부터 3일까지 제주도 여행')).toEqual({
      title: '제주도 여행',
      date: d(2026, 11, 1),
      end: d(2026, 11, 3, 23, 59),
      hasTime: false,
    }));
  it('오늘부터 3일간 휴가', () => expect(ev('오늘부터 3일간 휴가').title).toBe('휴가'));
  it('매주 월요일 오전 9시 팀 회의', () => {
    const e = ev('매주 월요일 오전 9시 팀 회의');
    expect(e.title).toBe('팀 회의');
    expect(e.date).toEqual(d(2026, 11, 2, 9));
    expect(e.recurrence?.rrule).toBe('FREQ=WEEKLY;BYDAY=MO');
  });
  it('팀 회의, 매주 월요일', () => expect(ev('팀 회의, 매주 월요일').title).toBe('팀 회의'));
  it('우유 사기 (날짜 없음)', () => expect(ev('우유 사기')).toEqual({ title: '우유 사기', date: null, hasTime: false }));
  it('내일 (제목 없음)', () => expect(ev('내일')).toMatchObject({ title: '', date: d(2026, 10, 31) }));
  it('timezone 옵션도 전달된다', () => {
    const e = parseEvent('내일 오후 3시 치과', { referenceDate: new Date(Date.UTC(2026, 9, 30, 5)), timezone: 'Asia/Seoul' });
    expect(e.date).toEqual(new Date(Date.UTC(2026, 9, 31, 6)));
  });
});
