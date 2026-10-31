// 테스트에서 쓰는 node:fs 함수 하나만 선언한다. devDependencies를 typescript·vitest로 유지하려고
// @types/node를 넣지 않는다 (CLAUDE.md).
declare module 'node:fs' {
  export function readFileSync(path: URL | string, encoding: 'utf8'): string;
}
