import { describe, it, expect } from 'vitest';
import { parse, parseEvent, toICS } from '../src/index.js';

// 실행 환경 시간대와 상관없이 같은 결과가 나오도록 서울 시간대로 고정한다
const ref = new Date(Date.UTC(2026, 9, 30, 5)); // 2026-10-30 (금) 14:00 서울
const opts = { referenceDate: ref, timezone: 'Asia/Seoul' };
const fixed = { uid: 'test@ko-chrono', now: ref, timezone: 'Asia/Seoul' };
const lines = (ics: string | null) => ics!.split('\r\n');
const event = (ics: string | null) => {
  const ls = lines(ics);
  return ls.slice(ls.indexOf('BEGIN:VEVENT') + 1, ls.indexOf('END:VEVENT'));
};

describe('toICS', () => {
  it('다음달까지 매주 월요일 9시 팀 회의', () => {
    const ics = toICS(parseEvent('다음달까지 매주 월요일 9시 팀 회의', opts), fixed);
    expect(ics).toBe(
      [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//ko-chrono//KO',
        'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        'UID:test@ko-chrono',
        'DTSTAMP:20261030T050000Z',
        'SUMMARY:팀 회의',
        'DTSTART;TZID=Asia/Seoul:20261102T090000',
        'DTEND;TZID=Asia/Seoul:20261102T100000',
        // TZID가 있는 DTSTART와 함께 쓰는 UNTIL은 UTC여야 한다 (RFC 5545 3.3.10)
        'RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20261130T145900Z',
        'END:VEVENT',
        'END:VCALENDAR',
        '',
      ].join('\r\n'),
    );
  });
  it('내일 오후 3시부터 5시까지 회의 (끝이 있으면 DTEND)', () =>
    expect(event(toICS(parseEvent('내일 오후 3시부터 5시까지 회의', opts), fixed))).toEqual(
      expect.arrayContaining(['DTSTART;TZID=Asia/Seoul:20261031T150000', 'DTEND;TZID=Asia/Seoul:20261031T170000']),
    ));
  it('timezone이 없으면 UTC로', () => {
    const ev = event(toICS(parseEvent('내일 오후 3시 치과', opts), { uid: 'u', now: ref }));
    expect(ev).toContain('DTSTART:20261031T060000Z');
    expect(ev).toContain('DTEND:20261031T070000Z');
  });
  it('durationMinutes', () =>
    expect(event(toICS(parseEvent('내일 오후 3시 치과', opts), { ...fixed, durationMinutes: 30 }))).toContain(
      'DTEND;TZID=Asia/Seoul:20261031T153000',
    ));
  it('크리스마스에 파티 (시각이 없으면 종일)', () => {
    const ev = event(toICS(parseEvent('크리스마스에 파티', opts), fixed));
    expect(ev).toContain('SUMMARY:파티');
    expect(ev).toContain('DTSTART;VALUE=DATE:20261225');
    expect(ev).toContain('DTEND;VALUE=DATE:20261226');
  });
  it('11월 16일부터 20일까지 출장 (종일 구간은 끝 다음날이 DTEND)', () => {
    const ev = event(toICS(parseEvent('11월 16일부터 20일까지 출장', opts), fixed));
    expect(ev).toContain('DTSTART;VALUE=DATE:20261116');
    expect(ev).toContain('DTEND;VALUE=DATE:20261121');
  });
  it('11월 1일부터 12월 31일까지 매주 토요일 (종일 반복은 UNTIL도 날짜)', () =>
    expect(event(toICS(parseEvent('11월 1일부터 12월 31일까지 매주 토요일 봉사', opts), fixed))).toEqual(
      expect.arrayContaining(['DTSTART;VALUE=DATE:20261107', 'RRULE:FREQ=WEEKLY;BYDAY=SA;UNTIL=20261231']),
    ));
  it('매주 수요일 오후 2시, 총 8회 (COUNT는 그대로)', () =>
    expect(event(toICS(parse('매주 수요일 오후 2시, 총 8회', opts)!, { ...fixed, title: '영어 회화' }))).toEqual(
      expect.arrayContaining(['SUMMARY:영어 회화', 'RRULE:FREQ=WEEKLY;BYDAY=WE;COUNT=8']),
    ));
  it('제목의 쉼표·세미콜론·역슬래시·줄바꿈은 이스케이프', () =>
    expect(event(toICS(parse('내일 3시', opts)!, { ...fixed, title: 'A, B; C\\D\nE' }))).toContain(
      'SUMMARY:A\\, B\\; C\\\\D\\nE',
    ));
  it('75바이트가 넘는 줄은 접는다 (한글 글자 중간에서 끊지 않음)', () => {
    const ls = event(toICS(parse('내일 3시', opts)!, { ...fixed, title: '가'.repeat(40) }));
    const i = ls.findIndex((l) => l.startsWith('SUMMARY:'));
    const enc = new TextEncoder();
    expect(enc.encode(ls[i]).length).toBeLessThanOrEqual(75);
    expect(ls[i + 1].startsWith(' ')).toBe(true);
    expect(ls[i].slice(8) + ls[i + 1].slice(1) + (ls[i + 2]?.startsWith(' ') ? ls[i + 2].slice(1) : '')).toBe('가'.repeat(40));
  });
  it('날짜가 없으면 null', () => expect(toICS(parseEvent('우유 사기', opts))).toBeNull());
  it('제목이 없으면 문장에서 찾은 부분', () =>
    expect(event(toICS(parse('내일 3시', opts)!, fixed))).toContain('SUMMARY:내일 3시'));
});
