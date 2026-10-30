const NATIVE: Record<string, number> = {
  한: 1, 하나: 1, 두: 2, 둘: 2, 세: 3, 셋: 3, 네: 4, 넷: 4,
  다섯: 5, 여섯: 6, 일곱: 7, 여덟: 8, 아홉: 9, 열: 10,
  열흘: 10, 보름: 15, 스무: 20, 스물: 20,
};

const SINO: Record<string, number> = {
  일: 1, 이: 2, 삼: 3, 사: 4, 오: 5, 육: 6, 칠: 7, 팔: 8, 구: 9, 십: 10,
};

/**
 * "3", "세", "열", "십이", "열두" → number. 실패 시 null.
 * v0.1: 1~99 범위만 다룬다.
 */
export function parseKoreanNumber(s: string): number | null {
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  if (s in NATIVE) return NATIVE[s];

  // 고유어 합성: 열두, 열다섯, 스무 ...
  for (const tens of ['스물', '스무', '열']) {
    if (s.startsWith(tens) && s.length > tens.length) {
      const rest = NATIVE[s.slice(tens.length)];
      if (rest != null) return NATIVE[tens] + rest;
    }
  }

  // 한자어: 십, 십이, 이십, 이십삼
  if (/^[일이삼사오육칠팔구십]+$/.test(s)) {
    const parts = s.split('십');
    if (parts.length === 1) return SINO[s] ?? null;
    const tens = parts[0] === '' ? 1 : SINO[parts[0]];
    const ones = parts[1] === '' ? 0 : SINO[parts[1]];
    if (tens == null || ones == null) return null;
    return tens * 10 + ones;
  }
  return null;
}
