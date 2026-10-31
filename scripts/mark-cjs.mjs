// dist/cjs 아래 .js는 CommonJS다. 루트 package.json이 "type": "module"이라
// 이 표시가 없으면 Node가 dist/cjs/*.js를 ESM으로 읽어 require가 깨진다.
import { writeFileSync } from 'node:fs';

writeFileSync(new URL('../dist/cjs/package.json', import.meta.url), '{ "type": "commonjs" }\n');
