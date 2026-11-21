/**
 * 날짜 표현 뒤의 말이 과거형인지 본다 (규칙 37).
 * 한국어는 서술어가 끝에 오므로, 표현 뒤부터 문장 끝(또는 다음 날짜 표현)까지를 한 절로 보고
 * 그 절이 과거형 어미로 끝날 때만 과거로 친다. 애매하면 과거가 아니다 (규칙 10).
 */

// 문장 끝: "만나자. 어제는 미안했어"의 "."
const SENTENCE_END = /[.!?\n…]/;
// 일정을 정하는 말: "3시로 예약했어", "월요일로 잡았어", "3시에 미팅 잡혔어". 정한 것은 과거지만 그 시각은 앞으로 올 일
const SCHEDULING = /^\s*(?:으로|로)(?![가-힣])|예약|잡았|잡혔|정했|정해졌|확정|바꿨|바꾸었|미뤘|미루었|옮겼|당겼|변경|연기|맞췄|설정/;
// 약속·전달·잊음·의도·아쉬움: "만나기로 했어", "온다고 했어", "회의 깜빡했어", "3시 알았어", "자려고 했는데", "냈어야 했는데"
const NOT_PAST = /기로\s*(?:했|하였|됐|되었|약속)|(?:다|라|자|냐|래|재|대)고\s*(?:했|그랬|말했|들었|전했|물었)|깜빡|까먹|잊|알았|려고\s*했|어야\s*(?:했|됐|되)/;
// 과거형 어미 (ㅆ받침 글자 뒤): "했어", "갔습니다", "봤는데 ㅠㅠ", "만났어?"
const PAST_ENDING =
  /([가-힣])(?:어|어요|어여|어용|엉|다|습니다|슴다|음|지|지요|죠|네|네요|는데|는데요|거든|거든요|잖아|잖아요|더라|더라고|더라구|던데|나|냐|니|구나|군|군요|대|대요)[^가-힣]*$/;
// 앞에서 문장이 한 번 끝났다는 표시 (청유·명령·의지·존대): "3시에 봐 저번엔 늦었잖아"의 "봐"
const EARLIER_END = /(?:(?<!혼)자|봐|줘|해|요|죠|니다|시다)$/;
// "갈게", "볼래", "할까"
const INTENT_TAIL = /(?:게|래|까)$/;

const JONG_SSANG_SIOT = 20; // ㅆ
const JONG_RIEUL = 8; // ㄹ

/** 한글 음절의 받침 번호 (없으면 0) */
function jong(ch: string): number {
  return (ch.charCodeAt(0) - 0xac00) % 28;
}

/**
 * @param tail 날짜 표현 바로 뒤부터 다음 날짜 표현 앞까지의 원문
 */
export function isPastClause(tail: string): boolean {
  const stop = SENTENCE_END.exec(tail);
  // "만났어?"처럼 문장 부호가 절의 끝이면 거기까지, 아니면 전체
  const clause = stop ? tail.slice(0, stop.index) : tail;
  if (SCHEDULING.test(clause) || NOT_PAST.test(clause)) return false;

  const m = PAST_ENDING.exec(clause);
  if (!m) return false;
  const stem = m[1];
  // "있어"(현재), "하겠어"(미래), "재밌어"는 ㅆ받침이지만 과거가 아니다. "온댔어/하랬어/가쟀어"는 남의 말
  if (jong(stem) !== JONG_SSANG_SIOT || '있겠밌댔랬쟀'.includes(stem)) return false;

  // 마지막 서술어 앞의 어절에서 문장이 이미 끝났으면 뒤의 과거형은 다른 문장이다
  // 마지막 조각은 그 서술어의 앞부분이라 뺀다 ("회의했어"의 "회의")
  const words = clause.slice(0, m.index).split(/\s+/).slice(0, -1);
  for (const w of words) {
    if (EARLIER_END.test(w)) return false;
    if (w.length >= 2 && INTENT_TAIL.test(w) && jong(w[w.length - 2]) === JONG_RIEUL) return false;
  }
  return true;
}
