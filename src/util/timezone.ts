// IANA 시간대 변환. 런타임 의존성 없이 Intl만 쓴다.
//
// resolve.ts는 Date의 로컬 getter/setter로 계산한다. timezone 옵션이 있으면
// 기준 시각을 그 시간대의 벽시계 시각(로컬 필드가 같은 Date)으로 바꿔 계산하고,
// 결과의 벽시계 시각을 다시 실제 시점으로 되돌린다.

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    // 없는 시간대면 여기서 RangeError
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formatters.set(timeZone, f);
  }
  return f;
}

/** 시점 t에서 그 시간대의 벽시계 필드 */
function fieldsAt(t: number, timeZone: string): [number, number, number, number, number, number] {
  const parts: Record<string, number> = {};
  for (const p of formatter(timeZone).formatToParts(new Date(t))) {
    if (p.type !== 'literal') parts[p.type] = +p.value;
  }
  return [parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second];
}

/** 시점 t에서 그 시간대의 UTC 오프셋(ms). 서울 = +9h */
function offsetAt(t: number, timeZone: string): number {
  const [y, m0, d, h, mi, s] = fieldsAt(t, timeZone);
  return Date.UTC(y, m0, d, h, mi, s) - (t - (t % 1000));
}

/** 실제 시점 → 그 시간대의 벽시계 시각을 로컬 필드로 갖는 Date */
export function toWallClock(instant: Date, timeZone: string): Date {
  const [y, m0, d, h, mi, s] = fieldsAt(instant.getTime(), timeZone);
  return new Date(y, m0, d, h, mi, s, instant.getMilliseconds());
}

/** 로컬 필드를 그 시간대의 벽시계 시각으로 보고 → 실제 시점 */
export function fromWallClock(wall: Date, timeZone: string): Date {
  const asUtc = Date.UTC(
    wall.getFullYear(), wall.getMonth(), wall.getDate(),
    wall.getHours(), wall.getMinutes(), wall.getSeconds(), wall.getMilliseconds(),
  );
  // 오프셋은 시점에 따라 달라지므로(서머타임) 한 번 더 맞춘다
  const first = offsetAt(asUtc, timeZone);
  const second = offsetAt(asUtc - first, timeZone);
  return new Date(asUtc - second);
}
