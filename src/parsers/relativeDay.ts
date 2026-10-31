import type { Fragment, Parser } from '../types.js';

const WORDS: Record<string, number> = {
  그저께: -2,
  // 업무용 한자어 (규칙 33)
  금일: 0,
  명일: 1,
  익일: 1,
  작일: -1,
  내일모레: 2,
  낼모레: 2,
  낼: 1,
  그제: -2,
  어제: -1,
  오늘: 0,
  내일: 1,
  모레: 2,
  글피: 3,
};

// "금일", "익일 배송", "작일" (업무용 한자어). "내일모레"는 "내일"+"모레"가 아니라 모레. "낼"은 "내가 낼게"(내다)와 겹쳐서 뒤에 시각·약속 표현이 올 때만
const RE =
  /(그저께|그제|어제|오늘|내일모레|낼모레|내일|모레|글피|(?<![가-힣])(?:금일|명일|익일|작일)|(?<![가-힣])낼(?=\s*(?:오전|오후|아침|점심|저녁|밤|새벽|낮|\d|봐|보자|만나|까지)))/g;

/** 오늘/내일/모레/글피/어제/그저께 */
export const relativeDay: Parser = (text) => {
  const out: Fragment[] = [];
  for (const m of text.matchAll(RE)) {
    out.push({ text: m[0], index: m.index!, components: { dayOffset: WORDS[m[1]] } });
  }
  return out;
};
