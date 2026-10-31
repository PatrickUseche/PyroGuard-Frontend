import { formatFullDate, formatRelativeTime } from './date-format.util';

describe('date formatting utilities', () => {
  it('should format relative timestamps in Spanish', () => {
    const now = Date.parse('2026-10-30T12:00:00Z');

    expect(formatRelativeTime('2026-10-30T11:59:55Z', now)).toContain('5');
    expect(formatRelativeTime(null, now)).toBe('Sin comunicación registrada');
  });

  it('should format full dates and handle invalid values', () => {
    expect(formatFullDate('2026-10-30T12:00:00Z')).not.toBe('Fecha desconocida');
    expect(formatFullDate('not-a-date')).toBe('Fecha desconocida');
  });
});
