# ko-chrono

[![npm](https://img.shields.io/npm/v/ko-chrono)](https://www.npmjs.com/package/ko-chrono) [![CI](https://github.com/jwn7/ko-chrono/actions/workflows/ci.yml/badge.svg)](https://github.com/jwn7/ko-chrono/actions/workflows/ci.yml)

한국어 자연어 날짜/시간 파서. 문장 속 "다음주 화요일 오후 3시"를 `Date`로 바꿉니다.

[chrono-node](https://github.com/wanasit/chrono)에 없는 한국어를 채웁니다.
[es-hangul](https://github.com/toss/es-hangul)이 글자를 다룬다면, ko-chrono는 문장 속 시간을 다룹니다.

```ts
import { parse, parseAll, parseDate } from 'ko-chrono';

// 기준: 2026-10-30 (금) 14:00
parseDate('다음주 화요일 오후 3시');     // 2026-11-03 15:00
parseDate('모레 점심');                  // 2026-11-01 12:00
parseDate('토요일 아침');                // 2026-10-31 08:00
parseDate('이번 주말');                  // 2026-10-31 (토)
parseDate('3일 뒤');                     // 2026-11-02
parseDate('한 시간 반 뒤');              // 2026-10-30 15:30
parseDate('다음달 중순');                // 2026-11-15
parseDate('내년 초');                    // 2027-01-01
parseDate('11/5 10시 반');               // 2026-11-05 10:30
parseDate('26년 12월 1일');              // 2026-12-01
parseDate('십일월 오일');                // 2026-11-05
parseDate('내일은 오후3시쯤');           // 2026-10-31 15:00
parseDate('11월 첫째 주 월요일');        // 2026-11-02
parseDate('지난 금요일');                // 2026-10-23
parseDate('11월 31일');                  // null — 없는 날짜는 넘기지 않음

parse('이번달 말까지 제출');
// { date: 지금, end: 2026-10-31 23:59, text: '이번달 말까지', hasTime: false }

parse('그럼 다음주 수요일 저녁 7시에 강남에서 볼까?');
// { date: 2026-11-04 19:00, text: '다음주 수요일 저녁 7시', index: 3, hasTime: true }

parse('오늘부터 3일간 휴가');
// { date: 2026-10-30, end: 2026-11-01 23:59, text: '오늘부터 3일간' }

parseAll('내일 10시 아니면 모레 2시');  // [10-31 10:00, 11-01 14:00]
```

- 런타임 의존성 0
- 브라우저 / Node 모두 동작
- 트리쉐이킹 가능한 ESM

## 설치

```bash
npm install ko-chrono
```

## API

### `parse(text, options?)`
첫 번째 날짜/시간 표현을 찾아 `ParseResult`를 돌려줍니다. 없으면 `null`.

### `parseAll(text, options?)`
모든 표현을 배열로.

### `parseDate(text, options?)`
`parse(...)?.date` 단축형.

### 옵션

| 옵션 | 기본값 | 설명 |
|---|---|---|
| `referenceDate` | `new Date()` | "내일", "다음주"의 기준 시각 |
| `weekStart` | `'monday'` | "이번주/다음주" 계산 기준 |
| `defaultHour` | `0` | 시간이 없는 날짜에 넣을 시 |
| `timezone` | 실행 환경 | "오후 3시"를 어느 시간대의 3시로 볼지 (IANA 이름) |

### 서버에서 쓸 때: `timezone`

Vercel, AWS Lambda 같은 서버는 보통 UTC로 돕니다. 그대로 쓰면 한국 사용자의 "오후 3시"가 UTC 오후 3시(한국 자정)가 됩니다.

```ts
parse('내일 오후 3시', { timezone: 'Asia/Seoul' });
// 서버 시간대와 상관없이 → 2026-11-01T06:00:00Z (서울 오후 3시)
```

브라우저에서는 사용자의 시간대가 기본값이라 보통 넘길 필요가 없습니다. 런타임 의존성 없이 내장 `Intl`로 계산합니다.

### 해석 규칙

- "다음주 월요일" = 기준일이 속한 주의 다음 주 월요일 (금요일에 말하면 3일 뒤)
- "월요일" 단독 = 오늘 포함 가장 가까운 미래의 월요일
- "이번 주말" = 그 주의 토요일. "주말" 단독 = 다가오는 토요일 (토·일이면 오늘)
- 시간만 있으면 오늘, 이미 지났으면 내일
- 오전/오후가 없는 1~6시는 오후 ("3시에 보자" → 15:00). 7~11시는 그대로
- 월일만 있고 이미 지났으면 내년 ("올해 3월 1일"처럼 연도를 말하면 그대로). "3월", "2월 말"도 그 달이 지났으면 내년
- 날짜를 말한 시각은 지났어도 그대로 ("오늘 아침" → 오늘 08:00)
- 두 자리 연도: 00~69 → 20xx, 70~99 → 19xx
- "오후 12시" = 정오. "내일 자정" / "내일 24시" / "내일 밤 12시" = 내일이 끝나는 시점(모레 00:00)
- 시 범위의 끝은 시작의 오전·오후를 이어받음: "오후 3~5시" → 15~17시
- "11월 5일 목요일"처럼 날짜와 요일이 안 맞으면 `null` ("11/3(화)" 괄호 표기도 같음)
- "지난 금요일" = 오늘 제외 가장 가까운 과거, "다음 금요일" = 오늘 제외 가장 가까운 미래
- "11월 첫째 주 월요일" = 11월의 첫 번째 월요일. 요일이 없으면 N번째 월요일
- "내년 이맘때", "1년 뒤"는 오늘의 월·일 유지
- "오늘부터 3일간" → `end`는 3일째 되는 날 23:59. "3일간" 단독은 날짜가 아니라서 `null`
- 없는 날짜(2월 30일, 11월 31일)는 다음 달로 넘기지 않고 `null`
- "~까지" / "~이내" → `end`에 종료 시점. "이번 주 안에", "이번달 안에"는 그 기간의 마지막 날. "이번 주 내내"는 시작~끝 구간
- "내일 30분 후"처럼 날짜와 상대 시간은 별개 결과

## 지원 표현

오늘·내일·모레·글피·어제·그저께 / N일·주·달·시간·분 뒤·전 / N시간 반 뒤 / 열흘·보름 / 이번주·다음주·다다음주·지난주 + 요일 / 이번·다음·지난 주말 / 요일 단독 / M월 D일 / 십일월 오일 / YYYY년 / YY년 / M/D / YYYY-MM-DD / YY.M.D / 올해·내년·작년 + 초·말 / 이번달·다음달 + 초·중순·말 / 오전·오후·새벽·아침·저녁·밤·낮 N시 (반·N분) / HH:MM / 정오·자정·점심 / ~까지·이내·안에·중으로 / A부터 B까지 / A~B / 3~5시 / 3pm / 월요일부터 금요일까지 / 월~금 / 지난·다음 X요일 / 11/3(화) / N째 주 X요일 / 마지막 주 / 이맘때 / N년 뒤 / 이틀·사흘 / 연말·연초·월초·월말 / 오전 중·퇴근 전까지 / A부터 N일간 / 3박 4일 / 이번 주 내내 / 월욜·낼·내일모레 / 띄어쓰기 생략 / 조사·어림말 (은·는·도·쯤·경·께)

전체 목록과 예시는 [SPEC.md](./SPEC.md).

## 예제

| 예제 | 내용 | 실행 |
|---|---|---|
| [quick-add](./examples/quick-add.mjs) | 할 일 빠른 입력: "다음주 금요일까지 보고서 제출" → 제목 "보고서 제출" + 마감 11/6 23:59 | `node examples/quick-add.mjs "..."` |
| [slack-bot](./examples/slack-bot) | 채널 메시지에서 날짜를 찾아 스레드로 알려주는 봇 (UTC 서버 + `timezone: 'Asia/Seoul'`) | `node examples/slack-bot/try.mjs` (Slack 없이) |
| [playground](./playground/index.html) | 브라우저에서 직접 입력 | `npm run playground` → `localhost:3000/playground` |

## LLM 대신 쓰는 이유

같은 메신저 문장 112개를 ko-chrono와 Claude에 넣고 비교하는 벤치마크가 [bench/](./bench/compare.ts)에 있습니다.

```bash
cd bench && npm install
npm run bench:local                      # ko-chrono만 (API 키 불필요)
ANTHROPIC_API_KEY=... npm run bench      # Claude와 비교 (요금 발생)
```

| | ko-chrono | LLM API |
|---|---|---|
| 지연 | 문장당 약 0.02ms | 문장당 수백 ms ~ 수 초 |
| 비용 | 0 | 토큰당 과금 |
| 같은 문장 → 같은 답 | 항상 | 보장 안 됨 |
| 오프라인 / 브라우저 | 됨 | 안 됨 |
| 처음 보는 표현 | 못 함 (`null`) | 대체로 함 |

규칙이 정해진 날짜 해석은 ko-chrono로, 그 밖의 자유로운 문장은 LLM으로 나누는 것을 권합니다.

## 로드맵

- [ ] 반복 일정 (매주 월요일 9시)
- [ ] 명절·공휴일 기준 표현
- [ ] chrono-node `ko` 로케일 기여

## 라이선스

MIT
