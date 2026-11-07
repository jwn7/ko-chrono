Follow-ups to the review comments on #685. Thanks for the pointers.

- **Embedded index tests**: added two cases where the date sits mid-sentence (`"회의는 내일 오후 3시에 시작합니다"` → `index === 4`, `"다음 미팅은 모레 10시로 잡혔어요"` → `index === 7`). The parser already handled this; the tests just pin it.
- **Bare hour meridiem**: `3시` / `12시` with no AM/PM word now get `imply("meridiem", …)` (AM for 1–11, PM for 12), matching the other locales. `15시` (24-hour) keeps `assign`. Tests check `isCertain("meridiem")` is `false` for the implied case.
- **`점심`** (lunchtime) added to the time-of-day words in `KOTimeExpressionParser`, so `점심 12시` and `점심 1시` (→ 13:00) parse.

`npm test`: 162 suites, 769 tests pass.
