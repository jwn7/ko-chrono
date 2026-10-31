# chrono-node 한국어 로케일 기여 준비

[chrono-node](https://github.com/wanasit/chrono)에는 2026-10 기준 한국어 로케일이 없습니다.
2024년 [이슈 #563](https://github.com/wanasit/chrono/issues/563)에서 메인테이너가 한국어 기여를 환영했지만 PR은 들어오지 않았습니다.
메인테이너 요청: 기존 테스트 관례를 따를 것, 한국어를 모르는 사람도 이해할 수 있는 테스트일 것, 작은 PR로 나눌 것.

`0001-add-korean-locale.patch`는 그 첫 PR 분량입니다 (chrono-node `d4fe7e3`, v2.10.3 기준).

| 파일 | 내용 |
|---|---|
| `KOCasualDateParser` | 오늘 · 내일 · 모레 · 내일모레 · 글피 · 어제 · 그저께 |
| `KOWeekdayParser` | 금요일 · 화욜 · 다음주 월요일 · 지난주 수요일 · 이번주 일요일 · 담주 월 |
| `KOStandardParser` | 2012년 8월 15일 · 8월 15일 · 8월15일 |
| `KOTimeExpressionParser` | 오후 3시 · 오전 10시 30분 · 3시 반 · 저녁 7시 · 밤 12시 · 세 시 · 열두시 반 |
| `KOMergeDateTimeRefiner` | 내일 오후 3시 · 내일은 오전 10시 |
| `KOMergeDateRangeRefiner` | 11월 1일부터 11월 3일 · 월요일\~금요일 |
| `test/ko/*` | 40여 개 사례, 전부 영어 설명 포함. 오탐 방지(내가 낼게, 오일 교환, 일정, 월급, 2시간) 포함 |

ko-chrono와 다른 점: chrono 관례를 따라 오전/오후 없는 "3시"는 3시로 둡니다 (ko-chrono는 15시로 추정).
반복 일정·명절·음력·parseEvent 같은 ko-chrono 고유 기능은 넣지 않았습니다.

## 확인한 것 / 못 한 것

- ✅ `npx jest test/ko` — 10개 묶음 전부 통과
- ⬜ 전체 테스트 (`npm test`), `npx prettier --check src test`, `npx eslint src test` — 직접 돌려야 함

## PR 올리는 순서

```bash
# 1. GitHub에서 wanasit/chrono를 fork한 다음
git clone https://github.com/<내 아이디>/chrono.git
cd chrono
git checkout -b korean-locale

# 2. 패치 적용 (ko-chrono 저장소 경로에 맞게)
git apply ../ko-chrono/contrib/chrono-ko/0001-add-korean-locale.patch

# 3. 확인
npm install
npm test
npx prettier --write src/locales/ko test/ko
npx eslint src/locales/ko test/ko

# 4. 커밋하고 push, GitHub에서 PR 열기
git add -A
git commit -m "Add Korean (ko) locale: casual dates, weekdays, standard dates, time expressions"
git push -u origin korean-locale
```

## PR 본문 초안

```
Add Korean (ko) locale

Follow-up to #563. This is the first, small PR for Korean support:

- Casual dates: 오늘 (today), 내일 (tomorrow), 모레 (day after tomorrow), 어제 (yesterday), ...
- Weekdays: 금요일 (Friday), and weekdays in relative weeks: 다음주 월요일 (Monday next week),
  지난주 수요일 (Wednesday last week). Korean weeks start on Monday, so these are computed per calendar week
  rather than with the nearest-weekday modifier.
- Standard dates: 2012년 8월 15일 (Aug 15, 2012)
- Time expressions: 오후 3시 (3 PM), 오전 10시 30분 (10:30 AM), 3시 반 (half past 3), native numbers (세 시 = 3 o'clock)
- Refiners for date+time (내일 오후 3시) and ranges (11월 1일부터 11월 3일, 월요일~금요일)

Every test has an English explanation of the Korean text, including negative cases
(e.g. "월급" = monthly salary is not Monday).

Relative expressions (3일 뒤 = in 3 days), months (다음달), and holidays can follow in separate PRs.
```
