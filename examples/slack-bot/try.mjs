// Slack 없이 봇 답장을 확인한다. 서버처럼 UTC로 돌려 보려면:
//   TZ=UTC node try.mjs            (PowerShell: $env:TZ='UTC'; node try.mjs)
import { replyFor } from './reply.mjs';

const messages = [
  '내일 오후 3시에 회의실 B에서 봬요',
  '이번 주 안에 리뷰 부탁드립니다',
  '다음주 화요일 아니면 수요일 오후 2시 어때요?',
  '오늘 점심 뭐 먹지',
];

console.log(`(이 프로세스의 시간대: ${Intl.DateTimeFormat().resolvedOptions().timeZone})\n`);
for (const m of messages) console.log(`> ${m}\n${replyFor(m) ?? '(날짜 없음 → 답장 안 함)'}\n`);
