// 할 일 앱의 "빠른 입력": 한 줄을 제목과 마감일로 나눈다.
//
//   npm run build
//   node examples/quick-add.mjs "다음주 금요일까지 보고서 제출"
//   node examples/quick-add.mjs            # 예시 문장들
//
// 실제 프로젝트에서는 '../dist/index.js' 대신 'ko-chrono'에서 import 한다.

import { parseEvent } from '../dist/index.js';

const TZ = 'Asia/Seoul';

/** "다음주 금요일까지 보고서 제출" → { title: '보고서 제출', due, start?, repeat? } */
export function quickAdd(line, referenceDate = new Date()) {
  const e = parseEvent(line, { referenceDate, timezone: TZ });
  if (!e.date) return { title: e.title };
  // 마감("~까지")이면 date가 기준 시각이라 시작일로 쓰지 않는다
  const isDeadline = e.end && e.date.getTime() === referenceDate.getTime();
  const task = isDeadline ? { title: e.title, due: e.end } : { title: e.title, start: e.date, ...(e.end && { due: e.end }), allDay: !e.hasTime };
  return e.recurrence ? { ...task, repeat: e.recurrence.rrule } : task;
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
      '매주 월수금 오전 7시 헬스',
      '우유 사기',
    ];

for (const line of lines) {
  const t = quickAdd(line);
  const when = [t.start && `시작 ${show(t.start)}`, t.due && `마감 ${show(t.due)}`].filter(Boolean).join(' · ');
  const repeat = t.repeat ? `  반복 ${t.repeat}` : '';
  console.log(`${line}\n  → "${t.title}"  ${when || '(날짜 없음)'}${t.allDay ? ' [종일]' : ''}${repeat}\n`);
}
