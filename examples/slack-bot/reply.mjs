// 메시지 한 줄 → 봇 답장. Slack 없이도 테스트할 수 있게 순수 함수로 분리했다.
import { parseAll } from 'ko-chrono';

// 봇은 보통 UTC 서버에서 돈다. 한국 사용자의 "오후 3시"는 서울 시간의 3시다.
const TZ = 'Asia/Seoul';

const unix = (d) => Math.floor(d.getTime() / 1000);
const plain = (d) =>
  d.toLocaleString('ko-KR', { timeZone: TZ, month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' });
// Slack 날짜 포맷: 받는 사람마다 자기 시간대로 보인다. "|" 뒤는 지원 안 되는 클라이언트용
const slackDate = (d, withTime) =>
  `<!date^${unix(d)}^{date_short_pretty}${withTime ? ' {time}' : ''}|${plain(d)}>`;

/** 날짜 표현이 있으면 답장 문자열, 없으면 null */
export function replyFor(text, now = new Date()) {
  const results = parseAll(text, { referenceDate: now, timezone: TZ });
  if (results.length === 0) return null;
  const lines = results.map((r) => {
    const isDeadline = r.end && r.date.getTime() === now.getTime();
    if (isDeadline) return `• "${r.text}" → 마감 ${slackDate(r.end, true)}`;
    if (r.end) return `• "${r.text}" → ${slackDate(r.date, r.hasTime)} ~ ${slackDate(r.end, true)}`;
    return `• "${r.text}" → ${slackDate(r.date, r.hasTime)}`;
  });
  return `:calendar: 이렇게 이해했어요\n${lines.join('\n')}`;
}
