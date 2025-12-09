import { describe, it, expect } from 'vitest';
import { getWeekRange } from '../../../../lib/weekUtils';
import {
  calculateDailyCheckboxPoints,
  calculateWeeklyCheckboxPoints,
  CheckboxDefinition,
  DailyLog,
} from '../../../../lib/pointsCalculation';

// Test the core logic used in the current week API endpoint
describe('Current Week Stats Logic', () => {
  const checkboxDefinitions: CheckboxDefinition[] = [
    {
      id: 1,
      name: 'logged_food',
      label: 'I have logged my food today',
      points: 1,
      type: 'daily',
      weekly_threshold: null,
      display_order: 1,
      is_active: true,
    },
    {
      id: 2,
      name: 'within_calorie_limit',
      label: 'I have not gone over my calorie-limit',
      points: 1,
      type: 'daily',
      weekly_threshold: null,
      display_order: 2,
      is_active: true,
    },
    {
      id: 3,
      name: 'gym_session',
      label: 'I went to the gym for at least 45 minutes',
      points: 3,
      type: 'weekly',
      weekly_threshold: 3,
      display_order: 5,
      is_active: true,
    },
  ];

  describe('Week Range Calculation', () => {
    it('should calculate correct week range for a Monday', () => {
      // 2024-12-09 is a Monday
      const date = new Date('2024-12-09');
      const { weekStart, weekEnd } = getWeekRange(date);

      // Should start on same Monday
      expect(weekStart.getDay()).toBe(1); // Monday
      expect(weekStart.getDate()).toBe(9);
      expect(weekStart.getMonth()).toBe(11); // December (0-indexed)
      expect(weekStart.getFullYear()).toBe(2024);

      // Should end on Sunday, Dec 15, 2024
      expect(weekEnd.getDay()).toBe(0); // Sunday
      expect(weekEnd.getDate()).toBe(15);
      expect(weekEnd.getMonth()).toBe(11);
      expect(weekEnd.getFullYear()).toBe(2024);
    });

    it('should calculate correct week range for a Wednesday', () => {
      // 2024-12-11 is a Wednesday
      const date = new Date('2024-12-11');
      const { weekStart, weekEnd } = getWeekRange(date);

      // Should start on Monday, Dec 9, 2024
      expect(weekStart.getDay()).toBe(1); // Monday
      expect(weekStart.getDate()).toBe(9);

      // Should end on Sunday, Dec 15, 2024
      expect(weekEnd.getDay()).toBe(0); // Sunday
      expect(weekEnd.getDate()).toBe(15);
    });

    it('should calculate correct week range for a Sunday', () => {
      // 2024-12-15 is a Sunday
      const date = new Date('2024-12-15');
      const { weekStart, weekEnd } = getWeekRange(date);

      // Should start on Monday, Dec 9, 2024
      expect(weekStart.getDay()).toBe(1); // Monday
      expect(weekStart.getDate()).toBe(9);

      // Should end on same Sunday
      expect(weekEnd.getDay()).toBe(0); // Sunday
      expect(weekEnd.getDate()).toBe(15);
    });
  });

  describe('Current Week Points Calculation', () => {
    it('should calculate daily points for current week', () => {
      const weekLogs: DailyLog[] = [
        {
          user_id: 1,
          log_date: '2024-12-09',
          checkbox_states: { logged_food: true, within_calorie_limit: true },
          is_completed: true,
        },
        {
          user_id: 1,
          log_date: '2024-12-10',
          checkbox_states: { logged_food: true, within_calorie_limit: false },
          is_completed: true,
        },
        {
          user_id: 1,
          log_date: '2024-12-11',
          checkbox_states: { logged_food: false, within_calorie_limit: true },
          is_completed: true,
        },
      ];

      let totalDailyPoints = 0;
      weekLogs.forEach((log) => {
        if (log.is_completed) {
          totalDailyPoints += calculateDailyCheckboxPoints(
            log.checkbox_states,
            checkboxDefinitions
          );
        }
      });

      // Day 1: 2 points (both checked)
      // Day 2: 1 point (logged_food only)
      // Day 3: 1 point (within_calorie_limit only)
      // Total: 4 points
      expect(totalDailyPoints).toBe(4);
    });

    it('should calculate weekly points when threshold is met', () => {
      const { weekStart, weekEnd } = getWeekRange('2024-12-09');

      const weekLogs: DailyLog[] = [
        {
          user_id: 1,
          log_date: '2024-12-09',
          checkbox_states: { gym_session: true },
          is_completed: true,
        },
        {
          user_id: 1,
          log_date: '2024-12-10',
          checkbox_states: { gym_session: true },
          is_completed: true,
        },
        {
          user_id: 1,
          log_date: '2024-12-11',
          checkbox_states: { gym_session: true },
          is_completed: true,
        },
      ];

      const weeklyPointsMap = calculateWeeklyCheckboxPoints(
        weekLogs,
        checkboxDefinitions,
        weekStart,
        weekEnd
      );

      // 3 gym sessions meets the threshold of 3
      expect(weeklyPointsMap.gym_session).toBe(3);
    });

    it('should not award weekly points when threshold is not met', () => {
      const { weekStart, weekEnd } = getWeekRange('2024-12-09');

      const weekLogs: DailyLog[] = [
        {
          user_id: 1,
          log_date: '2024-12-09',
          checkbox_states: { gym_session: true },
          is_completed: true,
        },
        {
          user_id: 1,
          log_date: '2024-12-10',
          checkbox_states: { gym_session: true },
          is_completed: true,
        },
      ];

      const weeklyPointsMap = calculateWeeklyCheckboxPoints(
        weekLogs,
        checkboxDefinitions,
        weekStart,
        weekEnd
      );

      // 2 gym sessions doesn't meet the threshold of 3
      expect(weeklyPointsMap.gym_session).toBe(0);
    });

    it('should calculate checkbox completion stats correctly', () => {
      const weekLogs: DailyLog[] = [
        {
          user_id: 1,
          log_date: '2024-12-09',
          checkbox_states: { logged_food: true },
          is_completed: true,
        },
        {
          user_id: 1,
          log_date: '2024-12-10',
          checkbox_states: { logged_food: true },
          is_completed: true,
        },
        {
          user_id: 1,
          log_date: '2024-12-11',
          checkbox_states: { logged_food: false },
          is_completed: true,
        },
      ];

      const loggedFoodCount = weekLogs.filter(
        (log) => log.checkbox_states.logged_food === true && log.is_completed
      ).length;

      expect(loggedFoodCount).toBe(2);
    });

    it('should count days logged correctly', () => {
      const weekLogs: DailyLog[] = [
        {
          user_id: 1,
          log_date: '2024-12-09',
          checkbox_states: { logged_food: true },
          is_completed: true,
        },
        {
          user_id: 1,
          log_date: '2024-12-10',
          checkbox_states: { logged_food: true },
          is_completed: false,
        },
        {
          user_id: 1,
          log_date: '2024-12-11',
          checkbox_states: { logged_food: true },
          is_completed: true,
        },
      ];

      const daysLogged = weekLogs.filter(log => log.is_completed).length;

      expect(daysLogged).toBe(2);
    });

    it('should handle empty week logs', () => {
      const weekLogs: DailyLog[] = [];

      let totalDailyPoints = 0;
      weekLogs.forEach((log) => {
        if (log.is_completed) {
          totalDailyPoints += calculateDailyCheckboxPoints(
            log.checkbox_states,
            checkboxDefinitions
          );
        }
      });

      expect(totalDailyPoints).toBe(0);
    });

    it('should calculate combined daily and weekly points', () => {
      const { weekStart, weekEnd } = getWeekRange('2024-12-09');

      const weekLogs: DailyLog[] = [
        {
          user_id: 1,
          log_date: '2024-12-09',
          checkbox_states: { logged_food: true, gym_session: true },
          is_completed: true,
        },
        {
          user_id: 1,
          log_date: '2024-12-10',
          checkbox_states: { logged_food: true, gym_session: true },
          is_completed: true,
        },
        {
          user_id: 1,
          log_date: '2024-12-11',
          checkbox_states: { logged_food: true, gym_session: true },
          is_completed: true,
        },
      ];

      // Calculate daily points
      let totalDailyPoints = 0;
      weekLogs.forEach((log) => {
        if (log.is_completed) {
          totalDailyPoints += calculateDailyCheckboxPoints(
            log.checkbox_states,
            checkboxDefinitions
          );
        }
      });

      // Calculate weekly points
      const weeklyPointsMap = calculateWeeklyCheckboxPoints(
        weekLogs,
        checkboxDefinitions,
        weekStart,
        weekEnd
      );
      const totalWeeklyPoints = Object.values(weeklyPointsMap).reduce(
        (sum, pts) => sum + pts,
        0
      );

      // Daily: 3 days × 1 point (logged_food) = 3 points
      // Weekly: 3 gym sessions meets threshold = 3 points
      // Total: 6 points
      expect(totalDailyPoints).toBe(3);
      expect(totalWeeklyPoints).toBe(3);
      expect(totalDailyPoints + totalWeeklyPoints).toBe(6);
    });
  });
});
