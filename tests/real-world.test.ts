import { describe, it, expect } from 'vitest';
import { parse } from '../src/index.js';
import { cases, REF } from './cases/messenger.js';

// 'YYYY-MM-DDTHH:mm' → 로컬 Date
const local = (s: string) => {
  const [y, m, d, h, min] = s.split(/[-T:]/).map(Number);
  return new Date(y, m - 1, d, h, min);
};
const ref = local(REF);

describe('메신저 문장', () => {
  for (const { text, date, end } of cases) {
    it(text, () => {
      const r = parse(text, { referenceDate: ref });
      if (date === null) return expect(r).toBeNull();
      expect(r?.date).toEqual(local(date));
      if (end) expect(r?.end).toEqual(local(end));
    });
  }
});
