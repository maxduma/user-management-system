import type { Clock } from '../../src/common/clock';

/** Manually controlled clock. Each call to `now()` returns a fresh Date. */
export class FakeClock implements Clock {
  private current: number;

  constructor(start = new Date('2025-01-01T10:00:00.000Z')) {
    this.current = start.getTime();
  }

  now(): Date {
    return new Date(this.current);
  }

  advance(ms: number): void {
    this.current += ms;
  }
}
