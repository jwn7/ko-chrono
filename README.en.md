<div align="center">

# ko-chrono

**Find dates and times in Korean sentences and turn them into `Date`**

[![npm](https://img.shields.io/npm/v/ko-chrono?color=0969da)](https://www.npmjs.com/package/ko-chrono)
[![CI](https://github.com/jwn7/ko-chrono/actions/workflows/ci.yml/badge.svg)](https://github.com/jwn7/ko-chrono/actions/workflows/ci.yml)
[![dependencies](https://img.shields.io/badge/dependencies-0-1a7f37)](./package.json)
[![license](https://img.shields.io/npm/l/ko-chrono)](./LICENSE)

<a href="https://jwn7.github.io/ko-chrono/"><img alt="Playground demo: the date part of a Korean sentence is highlighted, and recurrences, ambiguous times, deadlines and holidays are shown as cards" src="./docs/demo.gif" width="720"></a>

**[▶ Try it in your browser](https://jwn7.github.io/ko-chrono/)** · [한국어](./README.md)

</div>

<br>

`ko-chrono` is a natural-language date parser for **Korean**, in the spirit of [chrono-node](https://github.com/wanasit/chrono) (which supports English, Japanese, Chinese and others, but not Korean).
It finds expressions like "다음주 화요일 오후 3시" (next Tuesday 3 PM) inside a sentence and resolves them against a reference date.

```bash
npm install ko-chrono
```

Zero runtime dependencies. ESM and CommonJS, browser and Node.

## Examples

> All results below use the reference time **2026-10-30 (Fri) 14:00**.

### Find a meeting time in a chat message

Surrounding words are skipped. `text` and `index` tell you where the date was, so you can highlight it.

```ts
import { parse } from 'ko-chrono';

const r = parse('그럼 다음주 수요일 저녁 7시에 강남에서 볼까?'); // "Then shall we meet in Gangnam next Wed at 7 PM?"

r.date;   // 2026-11-04 19:00
r.text;   // '다음주 수요일 저녁 7시'
r.index;  // 3
```

### Quick-add for a to-do app

`parseEvent` splits a line into a **title** and a **time**. Deadlines ("\~까지", "by …") go into `end`.

```ts
import { parseEvent } from 'ko-chrono';

parseEvent('다음주 금요일까지 보고서 제출');        // "Submit the report by next Friday"
// { title: '보고서 제출', end: 2026-11-06 23:59, hasTime: false, ... }

parseEvent('내일 오후 3시에 강남역에서 친구 만나기'); // "Meet a friend at Gangnam station tomorrow 3 PM"
// { title: '강남역에서 친구 만나기', date: 2026-10-31 15:00, hasTime: true }
```

### Recurring events → calendar

Recurrences come out as an [RFC 5545 RRULE](https://icalendar.org/iCalendar-RFC-5545/3-8-5-3-recurrence-rule.html), and `toICS` builds a calendar file you can import into Google, Apple or Outlook Calendar.

```ts
import { parse, parseEvent, toICS } from 'ko-chrono';

parse('매주 월수금 오전 7시 운동')?.recurrence?.rrule;     // every Mon/Wed/Fri 7 AM → 'FREQ=WEEKLY;BYDAY=MO,WE,FR'
parse('매달 마지막 주 금요일 회식')?.recurrence?.rrule;    // last Friday of every month → 'FREQ=MONTHLY;BYDAY=-1FR'
parse('다음달까지 매주 월요일 9시')?.recurrence?.rrule;    // every Monday 9 AM until next month
// → 'FREQ=WEEKLY;BYDAY=MO;UNTIL=20261130T235900'

toICS(parseEvent('다음달까지 매주 월요일 9시 팀 회의'), { timezone: 'Asia/Seoul' });
// BEGIN:VCALENDAR … SUMMARY:팀 회의 … DTSTART;TZID=Asia/Seoul:20261102T090000 …
```

### Tell me when it's ambiguous

When a sentence can be read more than one way (e.g. "3시" with no AM/PM), you get the default reading plus the alternatives, so you can ask the user or hand only those sentences to an LLM.

```ts
const r = parse('3시에 보자'); // "See you at 3"

r.date;       // today 15:00 (1–6 o'clock without AM/PM is read as PM)
r.ambiguity;  // { reason: 'meridiem', alternatives: [tomorrow 03:00] }
```

### On a server

Servers usually run in UTC, so "오후 3시" (3 PM) would be 3 PM UTC. Pass `timezone`.

```ts
parse('내일 오후 3시', { timezone: 'Asia/Seoul' }); // 3 PM in Seoul, whatever the server's timezone
```

## What it understands

| Kind | Examples |
|---|---|
| Relative days | 오늘 (today) · 내일 (tomorrow) · 모레 · 글피 · 어제 · 그저께 · 낼 |
| N later / ago | 3일 뒤 · 2주 전 · 한 시간 반 뒤 · 30분 내로 |
| Weeks & weekdays | 다음주 화요일 · 담주 월욜 (slang) · 지난 금요일 · 이번 주말 · 11월 첫째 주 월요일 |
| Dates | 11월 5일 · 2026-11-05 · 11/5 · 26.11.5 · 11/3(화) |
| Months & years | 이번달 말 · 다음달 중순 · 내년 초 · 연말 · 내년 이맘때 |
| Times | 오후 3시 · 3시 반 · 15:30 · 3pm · 정오 · 자정 · 점심 · 퇴근 |
| Deadlines & ranges | \~까지 · \~안에 · 이번 주 안에 · A부터 B까지 · 3\~5시 · 오늘부터 3일간 |
| Holidays | 크리스마스 · 설 연휴 · 추석 전날 · 부처님 오신 날 · 음력 3월 3일 (lunar) |
| Business words | 금일 · 익일 · 차주 · 익월 초 · 금월 말까지 |
| Recurrence | 매일 · 매주 월수금 · 격주 · 매달 15일 · 매달 마지막 주 금요일 · 다음달까지 · 총 8회 |

It is deliberately conservative: when in doubt it returns `null` rather than a wrong date ("3일 연속" = "3 days in a row", "주 5일 근무" = "5 days a week", "내가 낼게" = "I'll pay" are not dates).
Every rule is listed in the [Korean README](./README.md#이런-문장을-읽습니다) and [SPEC.md](./SPEC.md).

## API

| Function | Returns |
|---|---|
| `parse(text, options?)` | The first `ParseResult`, or `null` |
| `parseAll(text, options?)` | Every `ParseResult` in the sentence |
| `parseDate(text, options?)` | Shorthand for `parse(...)?.date` |
| `parseEvent(text, options?)` | `{ title, date, end?, hasTime, recurrence? }` |
| `toICS(result, options?)` | An `.ics` string (`title`, `timezone`, `durationMinutes`) |

| `ParseResult` | |
|---|---|
| `date` | The resolved time. Start of a range; the reference time for a deadline |
| `end` | End of a range or the deadline |
| `text` / `index` | The matched part of the sentence and its position |
| `hasTime` | Whether a time of day was given. If `false`, `date` is at `defaultHour` |
| `recurrence` | `{ freq, interval, byWeekday, …, until?, count?, rrule }` |
| `ambiguity` | `{ reason: 'meridiem' \| 'next-weekday' \| 'approximate-time', alternatives }` |

| Option | Default | |
|---|---|---|
| `referenceDate` | `new Date()` | What "tomorrow" and "next week" are relative to |
| `timezone` | runtime | IANA name such as `'Asia/Seoul'` |
| `weekStart` | `'monday'` | First day of the week (`'sunday'` also works) |
| `defaultHour` | `0` | Hour used for dates without a time |

## Contributing

The most useful contribution is **real sentences**. If a sentence isn't recognised or is read wrong, please [open an issue](https://github.com/jwn7/ko-chrono/issues/new?template=sentence.yml) (Korean or English is fine).

## License

[MIT](./LICENSE)
