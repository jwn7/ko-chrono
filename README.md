<div align="center">

# ko-chrono

**한국어 문장 속 날짜·시간을 `Date`로**

[![npm](https://img.shields.io/npm/v/ko-chrono?color=0969da)](https://www.npmjs.com/package/ko-chrono)
[![CI](https://github.com/jwn7/ko-chrono/actions/workflows/ci.yml/badge.svg)](https://github.com/jwn7/ko-chrono/actions/workflows/ci.yml)
[![dependencies](https://img.shields.io/badge/dependencies-0-1a7f37)](./package.json)
[![license](https://img.shields.io/npm/l/ko-chrono)](./LICENSE)

<a href="https://jwn7.github.io/ko-chrono/"><img alt="playground 데모: 문장을 입력하면 날짜 부분이 형광펜으로 표시되고, 반복 일정·모호한 시각·마감·명절 연휴가 카드로 나온다" src="./docs/demo.gif" width="720"></a>

**[▶ 브라우저에서 바로 해 보기](https://jwn7.github.io/ko-chrono/)**

</div>

<br>

`ko-chrono`는 "다음주 화요일 오후 3시" 같은 한국어 표현을 찾아 `Date`로 바꿔 주는 JavaScript 라이브러리입니다.
[chrono-node](https://github.com/wanasit/chrono)에 없는 한국어를 채우려고 만들었습니다. [es-hangul](https://github.com/toss/es-hangul)이 **글자**를 다룬다면, ko-chrono는 **문장 속 시간**을 다룹니다.

```bash
npm install ko-chrono
```

런타임 의존성은 없고, ESM·CommonJS·브라우저·Node 어디서나 씁니다.

## 사용 예시

> 아래 결과는 모두 기준 시각 **2026-10-30 (금) 14:00** 기준입니다.

### 채팅에서 약속 시각 찾기

앞뒤 말은 건너뛰고 날짜 부분만 찾습니다. `text`와 `index`로 메시지 안에서 강조 표시를 할 수 있습니다.

```ts
import { parse } from 'ko-chrono';

const r = parse('그럼 다음주 수요일 저녁 7시에 강남에서 볼까?');

r.date;   // 2026-11-04 19:00
r.text;   // '다음주 수요일 저녁 7시'
r.index;  // 3
```

### 할 일 앱 빠른 입력

`parseEvent`는 한 줄을 **제목**과 **시점**으로 나눕니다. 마감 표현은 `end`에 들어갑니다.

```ts
import { parseEvent } from 'ko-chrono';

parseEvent('다음주 금요일까지 보고서 제출');
// { title: '보고서 제출', end: 2026-11-06 23:59, hasTime: false, ... }

parseEvent('내일 오후 3시에 강남역에서 친구 만나기');
// { title: '강남역에서 친구 만나기', date: 2026-10-31 15:00, hasTime: true }
```

### 반복 일정을 캘린더로

반복 표현은 [RRULE](https://icalendar.org/iCalendar-RFC-5545/3-8-5-3-recurrence-rule.html)로 나와서 Google·Apple 캘린더에 그대로 넣을 수 있습니다.

```ts
parse('매주 월수금 오전 7시 운동')?.recurrence?.rrule;  // 'FREQ=WEEKLY;BYDAY=MO,WE,FR'
parse('매달 마지막 주 금요일 회식')?.recurrence?.rrule; // 'FREQ=MONTHLY;BYDAY=-1FR'
```

### 애매하면 알려 주기

"3시"처럼 해석이 갈리는 문장은 기본 해석과 함께 다른 후보를 줍니다. 사용자에게 되묻거나, 이런 문장만 LLM에 넘길 때 씁니다.

```ts
const r = parse('3시에 보자');

r.date;       // 오늘 15:00
r.ambiguity;  // { reason: 'meridiem', alternatives: [내일 03:00] }
```

### 서버에서 쓸 때

서버는 보통 UTC로 돌아서 "오후 3시"가 한국 시간과 어긋납니다. `timezone`을 넘기세요.

```ts
parse('내일 오후 3시', { timezone: 'Asia/Seoul' });  // 서버 시간대와 상관없이 서울 오후 3시
```

## 이런 문장을 읽습니다

| 입력 | 결과 |
|---|---|
| **이번 주 안에** 보내주세요 | 마감 `11-01 23:59` |
| **오늘부터 3일간** 휴가 | `10-30` \~ `11-01 23:59` |
| **담주 월욜 점심** ㄱ? | `11-02 12:00` |
| **11월 첫째 주 월요일**에 시작 | `11-02` |
| **차주 중으로** 회신 부탁드립니다 | 마감 `11-08 23:59` |
| **설 연휴**에 내려가 | `2027-02-06` \~ `02-08` |
| 내가 낼게 | `null` (날짜가 아님) |

<details>
<summary><b>지원하는 표현 전체</b></summary>

<br>

| 분류 | 예 |
|---|---|
| 상대 날짜 | 오늘 · 내일 · 모레 · 글피 · 어제 · 그저께 · 내일모레 · 낼 |
| N 뒤/전 | 3일 뒤 · 이틀 후 · 2주 전 · 한 달 뒤 · 1년 뒤 · 한 시간 반 뒤 · 30분 내로 |
| 주·요일 | 다음주 화요일 · 담주 월욜 · 지난 금요일 · 이번 주말 · 다다음주 |
| N째 주 | 11월 첫째 주 월요일 · 둘째 주 · 마지막 주 금요일 |
| 날짜 | 11월 5일 · 2026-11-05 · 11/5 · 26.11.5 · 11/3(화) · 십일월 오일 · 2027년 |
| 월·연 | 이번달 말 · 다음달 중순 · 올해 말 · 내년 초 · 연말 · 월초 · 내년 이맘때 |
| 시각 | 오후 3시 · 3시 반 · 15:30 · 3pm · 정오 · 자정 · 점심 · 퇴근 · 5시 10분 전 |
| 마감 | \~까지 · \~안에 · \~중으로 · 이번 주 안에 · 오전 중으로 · 퇴근 전까지 |
| 구간 | A부터 B까지 · 3\~5시 · 월\~금 · 오늘부터 3일간 · 3박 4일 · 이번 주 내내 |
| 공휴일·명절 | 크리스마스 · 빼빼로데이 · 광복절 전날 · 설날 · 설 연휴 · 추석 전날 · 부처님 오신 날 |
| 음력 | 음력 3월 3일 · 음력 윤5월 1일 · 2028년 음력 9월 9일 |
| 업무용 한자어 | 금일 · 명일 · 익일 · 작일 · 금주 · 차주 · 전주 수요일 · 익월 초 · 금월 말까지 · 익년 |
| 반복 | 매일 · 매주 월수금 · 매주 월\~금 · 격주 · 평일마다 · 매달 15일 · 매월 말일 · 매달 마지막 주 금요일 · 매년 3월 1일 · 2시간마다 |
| 문장 | 띄어쓰기 생략 · 조사(은·는·도) · 어림말(쯤·경·께) · 여러 개 추출 |

입력별 결과는 [SPEC.md](./SPEC.md)에 모두 있습니다.

</details>

<details>
<summary><b>애매한 표현은 이렇게 정했습니다</b></summary>

<br>

같은 문장은 언제나 같은 답을 냅니다.

**요일과 주**
- "다음주 월요일" = 기준일이 속한 주의 다음 주 월요일 (금요일에 말하면 3일 뒤)
- "월요일" 단독 = 오늘 포함 가장 가까운 미래의 월요일
- "지난 금요일" = 오늘 제외 가장 가까운 과거, "다음 금요일" = 오늘 제외 가장 가까운 미래
- "이번 주말" = 그 주의 토요일. "주말" 단독 = 다가오는 토요일 (토·일이면 오늘)
- "11월 첫째 주 월요일" = 11월의 첫 번째 월요일

**시각**
- 오전/오후가 없는 1\~6시는 오후 ("3시에 보자" → 15:00). 7\~11시는 그대로
- 시각만 있으면 오늘, 이미 지났으면 내일. 날짜를 말했으면 지났어도 그대로 ("오늘 아침" → 오늘 08:00)
- "오후 12시" = 정오. "내일 자정" · "내일 24시" · "내일 밤 12시" = 내일이 끝나는 시점 (모레 00:00)
- 시 범위의 끝은 시작의 오전·오후를 이어받음: "오후 3\~5시" → 15\~17시

**날짜**
- 월일만 있고 이미 지났으면 내년. "올해 3월 1일"처럼 연도를 말하면 그대로
- "3월", "2월 말"도 그 달이 다 지났으면 내년
- 두 자리 연도: 00\~69 → 20xx, 70\~99 → 19xx
- "내년 이맘때", "1년 뒤"는 오늘의 월·일 유지 (2/29 + 1년 → 2/28)

**구간·마감**
- "\~까지", "\~안에" → `date`는 기준 시각, `end`는 마감 (시각이 없으면 23:59)
- "이번 주 안에", "이번달 안에"는 그 기간의 마지막 날. "이번 주 내내"는 시작\~끝 구간
- "오늘부터 3일간" → `end`는 3일째 되는 날 23:59

**명절**
- 설날·추석·부처님 오신 날과 음력 날짜는 [한국천문연구원](https://astro.kasi.re.kr/life/post/calendarData) 자료가 있는 연도(현재 2025\~2028)만. 그 밖은 추측하지 않고 `null`
- "설 연휴", "추석 연휴" = 전날부터 다음날까지 3일

**잡지 않는 것**
- 없는 날짜 (2월 30일), 날짜와 요일이 안 맞는 경우 ("11월 5일 수요일")
- 기간만 있는 표현 ("3일간", "3박 4일"), 날짜가 아닌 말 ("3일 연속", "1월생", "내가 낼게")
- 한자어가 다른 뜻일 때: "금주 결심"(禁酒), "전주 여행"(도시), "차주에게 연락"(車主)
- "내일 30분 후"처럼 날짜와 상대 시간이 섞이면 두 개의 결과로 나눔

</details>

## API

| 함수 | 반환 |
|---|---|
| `parse(text, options?)` | 첫 번째 표현의 `ParseResult`, 없으면 `null` |
| `parseAll(text, options?)` | 모든 표현의 `ParseResult[]` |
| `parseDate(text, options?)` | `parse(...)?.date` 단축형 |
| `parseEvent(text, options?)` | `{ title, date, end?, hasTime, recurrence? }` |

<details>
<summary><b><code>ParseResult</code>와 옵션</b></summary>

<br>

| `ParseResult` | |
|---|---|
| `date` | 찾은 시점. 구간이면 시작, 마감이면 기준 시각 |
| `end` | 구간의 끝 또는 마감. 없으면 `undefined` |
| `text` | 문장에서 찾은 부분 |
| `index` | 문장 안에서의 위치 |
| `hasTime` | 시각까지 말했는지. `false`면 `date`는 그날 `defaultHour`시 |
| `recurrence` | 반복 일정이면 `{ freq, interval, byWeekday, …, rrule }` |
| `ambiguity` | 해석이 갈리면 `{ reason, alternatives }` |

| `ambiguity.reason` | 언제 |
|---|---|
| `meridiem` | 오전/오후 없는 1\~12시 ("3시", "내일 7시") |
| `next-weekday` | "다음 토요일"이 이번 주일 수도, 다음 주일 수도 |
| `approximate-time` | "저녁"(19시)처럼 관례로 정한 시각 |

| 옵션 | 기본값 | 설명 |
|---|---|---|
| `referenceDate` | `new Date()` | "내일", "다음주"의 기준 시각 |
| `timezone` | 실행 환경 | 어느 시간대의 시각으로 볼지 (`'Asia/Seoul'` 같은 IANA 이름) |
| `weekStart` | `'monday'` | 한 주의 시작 (`'sunday'` 가능) |
| `defaultHour` | `0` | 시각 없는 날짜에 넣을 시 |

</details>

## 예제

- [할 일 빠른 입력](./examples/quick-add.mjs) — `node examples/quick-add.mjs "다음주 금요일까지 보고서 제출"`
- [Slack 봇](./examples/slack-bot) — 채널 메시지에서 날짜를 찾아 스레드로 알려 줌
- [Playground](https://jwn7.github.io/ko-chrono/) — 브라우저에서 직접 입력. 로컬은 `npm run playground`

## LLM에 물어보면 되지 않나요?

됩니다. 다만 규칙으로 풀리는 날짜라면 이쪽이 빠르고, 공짜이고, 매번 같은 답을 냅니다.
메신저 문장 112개로 비교해 보니 ko-chrono는 문장당 **0.017ms**, Gemini Flash-Lite(무료 티어)는 **987ms**였습니다 ([자세히](./bench/RESULTS.md)).

평소엔 ko-chrono로 처리하고, `null`이 나오거나 `ambiguity`가 있는 문장만 LLM에 보내는 조합을 권합니다.

## 기여

가장 큰 도움은 **실제로 쓰이는 문장**입니다. 인식이 안 되거나 다르게 읽히는 문장을 [이슈로 제보](https://github.com/jwn7/ko-chrono/issues/new?template=sentence.yml)해 주세요.

```bash
npm install
npm test
```

## 라이선스

[MIT](./LICENSE)
