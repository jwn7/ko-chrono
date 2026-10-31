// 채널 메시지에서 날짜를 찾아 스레드로 알려주는 Slack 봇 (Socket Mode라 공개 URL 불필요)
//
//   cd examples/slack-bot && npm install
//   SLACK_BOT_TOKEN=xoxb-... SLACK_APP_TOKEN=xapp-... node app.mjs
//
// Slack 앱 설정: Socket Mode 켜기, Bot Token Scopes에 channels:history·chat:write,
// Event Subscriptions에 message.channels 추가 후 봇을 채널에 초대.
import bolt from '@slack/bolt';
import { replyFor } from './reply.mjs';

const app = new bolt.App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

app.message(async ({ message, say }) => {
  // 수정·삭제 이벤트나 다른 봇 메시지는 무시
  if (message.subtype || !('text' in message) || !message.text) return;
  const reply = replyFor(message.text);
  if (reply) await say({ text: reply, thread_ts: message.ts });
});

await app.start();
console.log('ko-chrono 봇 실행 중');
