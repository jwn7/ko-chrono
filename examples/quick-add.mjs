// 할 일 앱의 "빠른 입력": 한 줄을 제목과 마감일로 나눈다.
//
//   npm run build
//   node examples/quick-add.mjs "다음주 금요일까지 보고서 제출"
//   node examples/quick-add.mjs            # 예시 문장들
//
// 실제 프로젝트에서는 '../dist/index.js' 대신 'ko-chrono'에서 import 한다.

import { parse } from '../dist/index.js';

const TZ = 'Asia/Seoul';

/** "다음주 금요일까지 보고서 제출" → { title: '보고서 제출', due, start? } */
export function quickAdd(line, referenceDate = new Date()) {
  const r = parse(line, { referenceDate, timezone: TZ });
  if (!r) return { title: line.trim() };
  // 날짜 부분을 빼고, 그 자리에 남는 조사(에, 에는, 까지는…)를 정리한다
  const title = (line.slice(0, r.index) + line.slice(r.index + r.text.length))
    .replace(/^\s*(?:에는|에|은|는|까지는|까지)\s+/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const isDeadline = r.end && r.date.getTime() === referenceDate.getTime();
  return isDeadline
    ? { title, due: r.end }
    : { title, start: r.date, ...(r.end && { due: r.end }), allDay: !r.hasTime };
}

const show = (d) =>
  d.toLocaleString('ko-KR', { timeZone: TZ, month: 'short', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' });

const lines = process.argv.length > 2
  ? [process.argv.slice(2).join(' ')]
  : [
      '다음주 금요일까지 보고서 제출',
      '내일 오후 3시 치과',
      '모레 저녁 7시 강남역 저녁 약속',
      '11월 첫째 주 월요일 분기 회고',
      '오늘부터 3일간 휴가',
      '우유 사기',
    ];

for (const line of lines) {
  const t = quickAdd(line);
  const when = [t.start && `시작 ${show(t.start)}`, t.due && `마감 ${show(t.due)}`].filter(Boolean).join(' · ');
  console.log(`${line}\n  → "${t.title}"  ${when || '(날짜 없음)'}${t.allDay ? ' [종일]' : ''}\n`);
}
