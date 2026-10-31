import type { Fragment, Parser } from '../types.js';

// 양력 고정 공휴일·기념일 → [월, 일]. 여러 단어는 띄어쓰기를 생략해도 된다
const FIXED: Record<string, [number, number]> = {
  '크리스마스 이브': [12, 24],
  크리스마스: [12, 25],
  성탄절: [12, 25],
  신정: [1, 1],
  '새해 첫날': [1, 1],
  삼일절: [3, 1],
  '근로자의 날': [5, 1],
  노동절: [5, 1],
  어린이날: [5, 5],
  어버이날: [5, 8],
  '스승의 날': [5, 15],
  현충일: [6, 6],
  제헌절: [7, 17],
  광복절: [8, 15],
  개천절: [10, 3],
  한글날: [10, 9],
  할로윈: [10, 31],
  핼러윈: [10, 31],
  빼빼로데이: [11, 11],
  발렌타인데이: [2, 14],
  밸런타인데이: [2, 14],
  화이트데이: [3, 14],
};

const SHIFT: Record<string, number> = { 전날: -1, 다음날: 1, 이튿날: 1, 당일: 0 };
const MODIFIER = '(?:\\s*(전날|다음\\s*날|이튿날|당일))?';

// "크리스마스", "광복절 전날", "스승의날"
const FIXED_RE = new RegExp(
  `(${Object.keys(FIXED).map((k) => k.replace(/ /g, '\\s*')).join('|')})${MODIFIER}`,
  'g',
);
// "설날", "구정", "설 연휴", "추석 전날", "한가위", "부처님 오신 날". "설"만은 "설명", "설거지"와 겹쳐서 뒤에 연휴·전날 등이 올 때만
const LUNAR_RE =
  /(설날|구정|설(?=\s*(?:연휴|전날|다음\s*날|당일))|추석|한가위|부처님\s*오신\s*날|석가\s*탄신일|석탄일|초파일)(?:\s*(연휴))?(?:\s*(전날|다음\s*날|이튿날|당일))?/g;

// "음력 3월 3일", "음력 윤5월 1일" (음력이라고 말한 경우만)
const LUNAR_DATE_RE = /음력\s*(윤\s*)?(\d{1,2})\s*월\s*(\d{1,2})\s*일/g;

const fixedKey = (name: string) => Object.keys(FIXED).find((k) => k.replace(/ /g, '') === name.replace(/\s/g, ''))!;
const shiftOf = (m: string | undefined) => (m ? SHIFT[m.replace(/\s/g, '')] : 0);

/** 공휴일·기념일·명절. 음력 명절의 양력 날짜는 resolve가 표에서 찾는다 */
export const holiday: Parser = (text) => {
  const out: Fragment[] = [];
  for (const m of text.matchAll(FIXED_RE)) {
    const [month, day] = FIXED[fixedKey(m[1])];
    const c: Fragment['components'] = { month, day };
    const shift = shiftOf(m[2]);
    if (shift) c.dayOffset = shift;
    out.push({ text: m[0], index: m.index!, components: c });
  }
  for (const m of text.matchAll(LUNAR_DATE_RE)) {
    const month = +m[2], day = +m[3];
    if (month < 1 || month > 12 || day < 1 || day > 30) continue;
    out.push({ text: m[0], index: m.index!, components: { lunarDate: { month, day, leap: !!m[1] } } });
  }
  for (const m of text.matchAll(LUNAR_RE)) {
    const name = m[1].replace(/\s/g, '');
    const lunar = name === '설날' || name === '구정' || name === '설' ? 'seollal'
      : name === '추석' || name === '한가위' ? 'chuseok' : 'buddha';
    const c: Fragment['components'] = { lunar };
    // "설 연휴", "추석 연휴" = 전날부터 다음날까지 3일 (부처님 오신 날은 연휴가 없다)
    if (m[2] && lunar !== 'buddha') Object.assign(c, { dayOffset: -1, durationDays: 3 });
    else {
      const shift = shiftOf(m[3]);
      if (shift) c.dayOffset = shift;
    }
    out.push({ text: m[0], index: m.index!, components: c });
  }
  return out;
};
