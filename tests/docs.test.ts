import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// GitHub 마크다운에서 "~까지 ... 3~5시"처럼 한 문단에 물결표가 둘 있으면 그 사이가 취소선이 된다.
// 날짜 범위를 다루는 프로젝트라 문서에 ~가 많다. 코드 밖의 ~는 \~ 로 써야 한다.
const DOCS = ['README.md', 'SPEC.md', 'bench/RESULTS.md'];

function unescapedTildes(md: string): string[] {
  const found: string[] = [];
  let inCode = false;
  for (const line of md.split('\n')) {
    if (/^[>\s]*```/.test(line)) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    const outsideCode = line.split('`').filter((_, i) => i % 2 === 0).join('');
    if (/(^|[^\\])~/.test(outsideCode)) found.push(line.trim());
  }
  return found;
}

describe('문서 렌더링', () => {
  for (const file of DOCS) {
    it(`${file}: 코드 밖 물결표는 \\~ 로 (취소선 방지)`, () => {
      expect(unescapedTildes(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'))).toEqual([]);
    });
  }
});
