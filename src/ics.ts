import type { ParseResult } from './types.js';
import type { ParsedEvent } from './event.js';
import { toRRule } from './parsers/recurrence.js';
import { toWallClock } from './util/timezone.js';

export interface ICSOptions {
  /** 일정 제목. 기본값: parseEvent 결과면 그 title, parse 결과면 문장에서 찾은 부분 */
  title?: string;
  /**
   * 시각을 이 시간대의 벽시계로 쓴다 (`DTSTART;TZID=Asia/Seoul:…`). 서머타임이 있는 곳의 반복 일정은 이걸 넘겨야
   * 시각이 유지된다. 없으면 UTC로 쓴다. 종일 일정의 날짜도 이 시간대 기준.
   */
  timezone?: string;
  /** 시각은 있는데 끝이 없을 때 일정 길이(분). 기본값: 60 */
  durationMinutes?: number;
  /** VEVENT의 UID. 기본값: 무작위 */
  uid?: string;
  /** DTSTAMP. 기본값: new Date() */
  now?: Date;
}

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const hms = (d: Date) => `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
const utc = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T` +
  `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

/** TEXT 값 이스케이프 (RFC 5545 3.3.11) */
const escapeText = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, '\\n');

/** 75바이트가 넘는 줄은 CRLF + 공백으로 접는다 (RFC 5545 3.1). UTF-8 글자 중간에서는 끊지 않는다 */
function fold(line: string): string {
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const cp = ch.codePointAt(0)!;
    const len = cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
    // 이어지는 줄은 앞의 공백 1바이트를 뺀 74바이트까지
    if (bytes + len > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = '';
      bytes = 0;
    }
    cur += ch;
    bytes += len;
  }
  out.push(cur);
  return out.join('\r\n ');
}

/**
 * parse / parseEvent 결과를 iCalendar(.ics) 문자열로 바꾼다. 날짜가 없으면 null.
 * Google·Apple·Outlook 캘린더에서 그대로 가져올 수 있다.
 *
 * - 시각이 있으면 DTSTART/DTEND (끝이 없으면 durationMinutes 뒤)
 * - 시각이 없으면 종일 일정 (`VALUE=DATE`, DTEND는 마지막 날의 다음날)
 * - 반복이면 RRULE. UNTIL은 DTSTART 형식에 맞춰 UTC 또는 날짜로 다시 쓴다
 *
 * @example
 * const ics = toICS(parseEvent('다음주 월요일 9시 팀 회의'), { timezone: 'Asia/Seoul' });
 * // BEGIN:VCALENDAR … SUMMARY:팀 회의 … DTSTART;TZID=Asia/Seoul:20261102T090000 …
 */
export function toICS(input: ParseResult | ParsedEvent, options: ICSOptions = {}): string | null {
  if (!input.date) return null;
  const tz = options.timezone;
  const wall = (d: Date) => (tz ? toWallClock(d, tz) : d);
  const title = options.title ?? ('title' in input ? input.title : input.text);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ko-chrono//KO',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${options.uid ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}@ko-chrono`}`,
    `DTSTAMP:${utc(options.now ?? new Date())}`,
    `SUMMARY:${escapeText(title)}`,
  ];

  if (input.hasTime) {
    const end = input.end ?? new Date(input.date.getTime() + (options.durationMinutes ?? 60) * 60_000);
    const at = (name: string, d: Date) => (tz ? `${name};TZID=${tz}:${ymd(wall(d))}T${hms(wall(d))}` : `${name}:${utc(d)}`);
    lines.push(at('DTSTART', input.date), at('DTEND', end));
  } else {
    const first = wall(input.date);
    const last = input.end ? wall(input.end) : first;
    const after = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
    lines.push(`DTSTART;VALUE=DATE:${ymd(first)}`, `DTEND;VALUE=DATE:${ymd(after)}`);
  }

  const r = input.recurrence;
  if (r) {
    // recurrence.rrule의 UNTIL은 벽시계(floating) 형식이라, 시각이 있는 일정이면 UTC로 바꿔 쓴다
    const rrule = r.until && input.hasTime ? toRRule({ ...r, until: undefined }) + `;UNTIL=${utc(r.until)}` : r.rrule;
    lines.push(`RRULE:${rrule}`);
  }

  lines.push('END:VEVENT', 'END:VCALENDAR', '');
  return lines.map(fold).join('\r\n');
}
