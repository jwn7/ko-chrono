Follow-up to #563. This is the first, small PR for Korean support:

- Casual dates: 오늘 (today), 내일 (tomorrow), 모레 (day after tomorrow), 어제 (yesterday), ...
- Weekdays: 금요일 (Friday), and weekdays in relative weeks: 다음주 월요일 (Monday next week),
  지난주 수요일 (Wednesday last week). Korean weeks start on Monday, so these are computed per calendar week
  rather than with the nearest-weekday modifier.
- Standard dates: 2012년 8월 15일 (Aug 15, 2012)
- Time expressions: 오후 3시 (3 PM), 오전 10시 30분 (10:30 AM), 3시 반 (half past 3), native numbers (세 시 = 3 o'clock)
- Refiners for date+time (내일 오후 3시) and ranges (11월 1일부터 11월 3일, 월요일~금요일)

Every test has an English explanation of the Korean text, including negative cases
(e.g. "월급" = monthly salary is not Monday, "다음주 일 많아" = lots of work next week is not next Sunday).
A bare weekday character ("다음주 월" = Mon next week) is only accepted before a time, a particle, punctuation,
or the end of text, because every weekday character is also a common word (일 = work, 목 = throat, 화 = anger).

Following the other locales, a bare hour without 오전/오후 (AM/PM) is kept as written (3시 = 3:00).
`ko` is listed under partial support in the README.

Relative expressions (3일 뒤 = in 3 days), months (다음달), and holidays can follow in separate PRs.

### Testing

- `npm test`: 162 suites, 763 tests pass
- `prettier --check` passes on the new files

The parsers are adapted from [ko-chrono](https://github.com/jwn7/ko-chrono), a standalone Korean date parser I maintain.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
