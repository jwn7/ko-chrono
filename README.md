# ko-chrono

한국어 자연어 날짜/시간 파서. 문장 속 "다음주 화요일 오후 3시"를 `Date`로 바꿉니다.

[chrono-node](https://github.com/wanasit/chrono)에 없는 한국어를 채웁니다.
[es-hangul](https://github.com/toss/es-hangul)이 글자를 다룬다면, ko-chrono는 문장 속 시간을 다룹니다.

```ts
import { parse, parseDate } from 'ko-chrono';

parseDate('다음주 화요일 오후 3시');   // 2026-11-03T15:00
parseDate('모레 점심');                // 2026-11-01T12:00
parseDate('3일 뒤');                   // 2026-11-02
parseDate('11/5 10시 반');             // 2026-11-05T10:30

parse('이번달 말까지 제출');
// { date: 지금, end: 2026-10-31T23:59, text: '이번달 말까지', hasTime: false }

parse('그럼 다음주 수요일 저녁 7시에 강남에서 볼까?');
// { date: 2026-11-04T19:00, text: '다음주 수요일 저녁 7시', index: 3, hasTime: true }
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

### 해석 규칙

- "다음주 월요일" = 기준일이 속한 주의 다음 주 월요일 (금요일에 말하면 3일 뒤)
- "월요일" 단독 = 오늘 포함 가장 가까운 미래의 월요일
- 시간만 있으면 오늘, 이미 지났으면 내일
- 월일만 있고 이미 지났으면 내년
- "~까지" / "~이내" → `end`에 종료 시점

## 지원 표현

오늘·내일·모레·글피·어제·그저께 / N일·주·달·시간·분 뒤·전 / 열흘·보름 / 이번주·다음주·다다음주·지난주 + 요일 / 요일 단독 / M월 D일 / YYYY년 / M/D / YYYY-MM-DD / 이번달·다음달 + 초·중순·말 / 오전·오후·새벽·아침·저녁·밤·낮 N시 (반·N분) / HH:MM / 정오·자정·점심 / ~까지·이내 / A부터 B까지

전체 목록과 예시는 [SPEC.md](./SPEC.md).

## 로드맵

- [ ] 반복 일정 (매주 월요일 9시)
- [ ] 명절·공휴일 기준 표현
- [ ] chrono-node `ko` 로케일 기여

## 라이선스

MIT
