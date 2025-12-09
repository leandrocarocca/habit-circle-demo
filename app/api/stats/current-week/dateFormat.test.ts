import { describe, it, expect } from 'vitest';
import { formatDateLocal } from '../../../../lib/weekUtils';

/**
 * These tests verify that date formatting and comparison works correctly
 * with the format that PostgreSQL returns for DATE columns
 */
describe('Date Format Compatibility', () => {
  it('should format dates consistently for comparison', () => {
    const date1 = new Date('2024-12-09');
    const date2 = new Date('2024-12-09T00:00:00');

    const formatted1 = formatDateLocal(date1);
    const formatted2 = formatDateLocal(date2);

    // Both should produce the same string
    expect(formatted1).toBe(formatted2);
    expect(formatted1).toBe('2024-12-09');
  });

  it('should handle Date objects with different times but same day', () => {
    const morning = new Date('2024-12-09T08:30:00');
    const evening = new Date('2024-12-09T18:45:00');

    const formatted1 = formatDateLocal(morning);
    const formatted2 = formatDateLocal(evening);

    expect(formatted1).toBe(formatted2);
    expect(formatted1).toBe('2024-12-09');
  });

  it('should match PostgreSQL DATE format (YYYY-MM-DD)', () => {
    // PostgreSQL DATE columns return strings in 'YYYY-MM-DD' format
    const postgresDate = '2024-12-09';
    const jsDate = new Date('2024-12-09');

    const formatted = formatDateLocal(jsDate);

    expect(formatted).toBe(postgresDate);
  });

  it('should correctly compare dates from different months', () => {
    const nov30 = new Date('2024-11-30');
    const dec1 = new Date('2024-12-01');

    const formatted1 = formatDateLocal(nov30);
    const formatted2 = formatDateLocal(dec1);

    expect(formatted1).toBe('2024-11-30');
    expect(formatted2).toBe('2024-12-01');
    expect(formatted1).not.toBe(formatted2);
  });

  it('should handle dates across year boundaries', () => {
    const dec31 = new Date('2024-12-31');
    const jan1 = new Date('2025-01-01');

    const formatted1 = formatDateLocal(dec31);
    const formatted2 = formatDateLocal(jan1);

    expect(formatted1).toBe('2024-12-31');
    expect(formatted2).toBe('2025-01-01');
  });

  it('should preserve leading zeros in month and day', () => {
    const date = new Date('2024-01-05');

    const formatted = formatDateLocal(date);

    expect(formatted).toBe('2024-01-05');
    expect(formatted.length).toBe(10); // YYYY-MM-DD
  });

  describe('Week Day Mapping', () => {
    it('should correctly map Monday to first day of week', () => {
      // December 9, 2024 is a Monday
      const monday = new Date('2024-12-09');
      expect(monday.getDay()).toBe(1); // 1 = Monday
    });

    it('should correctly map Sunday to last day of week', () => {
      // December 15, 2024 is a Sunday
      const sunday = new Date('2024-12-15');
      expect(sunday.getDay()).toBe(0); // 0 = Sunday
    });
  });

  describe('Database Log Comparison', () => {
    it('should find log when database returns string date', () => {
      // Simulate what PostgreSQL returns as string
      const logs = [
        { log_date: '2024-12-09', is_completed: true },
        { log_date: '2024-12-11', is_completed: true },
      ];

      const searchDate = new Date('2024-12-09');
      const searchDateStr = formatDateLocal(searchDate);

      const found = logs.find(l => l.log_date === searchDateStr);

      expect(found).toBeDefined();
      expect(found?.log_date).toBe('2024-12-09');
    });

    it('should find log when database returns Date object', () => {
      // Simulate what PostgreSQL might return as Date object
      const logs = [
        { log_date: new Date('2024-12-09'), is_completed: true },
        { log_date: new Date('2024-12-11'), is_completed: true },
      ];

      const searchDate = new Date('2024-12-09');
      const searchDateStr = formatDateLocal(searchDate);

      // Need to handle Date object from database
      const found = logs.find(l => {
        const logDate = l.log_date instanceof Date
          ? formatDateLocal(l.log_date)
          : l.log_date;
        return logDate === searchDateStr;
      });

      expect(found).toBeDefined();
      expect(found?.log_date).toBeInstanceOf(Date);
    });

    it('should not find log when date does not match', () => {
      const logs = [
        { log_date: '2024-12-09', is_completed: true },
      ];

      const searchDate = new Date('2024-12-10');
      const searchDateStr = formatDateLocal(searchDate);

      const found = logs.find(l => l.log_date === searchDateStr);

      expect(found).toBeUndefined();
    });

    it('should handle week range correctly', () => {
      const logs = [
        { log_date: '2024-12-08', is_completed: true }, // Sunday (previous week)
        { log_date: '2024-12-09', is_completed: true }, // Monday
        { log_date: '2024-12-11', is_completed: true }, // Wednesday
        { log_date: '2024-12-15', is_completed: true }, // Sunday
        { log_date: '2024-12-16', is_completed: true }, // Monday (next week)
      ];

      // Week is Monday Dec 9 to Sunday Dec 15
      const weekLogs = logs.filter(
        l => l.log_date >= '2024-12-09' && l.log_date <= '2024-12-15'
      );

      expect(weekLogs.length).toBe(3);
      expect(weekLogs.map(l => l.log_date)).toEqual([
        '2024-12-09',
        '2024-12-11',
        '2024-12-15',
      ]);
    });
  });
});
