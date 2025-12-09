import { describe, it, expect } from 'vitest';
import {
  calculateDailyCheckboxPoints,
  calculateWeeklyCheckboxPoints,
  calculateTotalPoints,
  CheckboxDefinition,
  DailyLog,
} from './pointsCalculation';

const defaultCheckboxes: CheckboxDefinition[] = [
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
    name: 'protein_goal_met',
    label: 'I have reached my goal of 100 grams of protein',
    points: 1,
    type: 'daily',
    weekly_threshold: null,
    display_order: 3,
    is_active: true,
  },
  {
    id: 4,
    name: 'no_cheat_foods',
    label: 'I have not cheated today',
    points: 1,
    type: 'daily',
    weekly_threshold: null,
    display_order: 4,
    is_active: true,
  },
  {
    id: 5,
    name: 'gym_session',
    label: 'I went to the gym',
    points: 3,
    type: 'weekly',
    weekly_threshold: 3,
    display_order: 5,
    is_active: true,
  },
];

describe('calculateDailyCheckboxPoints', () => {
  it('should return 0 for no checkboxes checked', () => {
    const states = {
      logged_food: false,
      within_calorie_limit: false,
      protein_goal_met: false,
      no_cheat_foods: false,
    };
    expect(calculateDailyCheckboxPoints(states, defaultCheckboxes)).toBe(0);
  });

  it('should return 1 for one checkbox checked', () => {
    const states = {
      logged_food: true,
      within_calorie_limit: false,
      protein_goal_met: false,
      no_cheat_foods: false,
    };
    expect(calculateDailyCheckboxPoints(states, defaultCheckboxes)).toBe(1);
  });

  it('should return 4 for all daily checkboxes checked', () => {
    const states = {
      logged_food: true,
      within_calorie_limit: true,
      protein_goal_met: true,
      no_cheat_foods: true,
    };
    expect(calculateDailyCheckboxPoints(states, defaultCheckboxes)).toBe(4);
  });

  it('should ignore weekly checkboxes', () => {
    const states = {
      logged_food: true,
      gym_session: true, // This is a weekly checkbox
    };
    expect(calculateDailyCheckboxPoints(states, defaultCheckboxes)).toBe(1);
  });

  it('should ignore inactive checkboxes', () => {
    const checkboxes = [
      ...defaultCheckboxes,
      {
        id: 6,
        name: 'bonus',
        label: 'Bonus',
        points: 10,
        type: 'daily' as const,
        weekly_threshold: null,
        display_order: 6,
        is_active: false, // Inactive
      },
    ];
    const states = {
      logged_food: true,
      bonus: true,
    };
    expect(calculateDailyCheckboxPoints(states, checkboxes)).toBe(1);
  });

  it('should use custom point values', () => {
    const customCheckboxes: CheckboxDefinition[] = [
      {
        id: 1,
        name: 'task1',
        label: 'Task 1',
        points: 5,
        type: 'daily',
        weekly_threshold: null,
        display_order: 1,
        is_active: true,
      },
      {
        id: 2,
        name: 'task2',
        label: 'Task 2',
        points: 3,
        type: 'daily',
        weekly_threshold: null,
        display_order: 2,
        is_active: true,
      },
    ];
    const states = {
      task1: true,
      task2: true,
    };
    expect(calculateDailyCheckboxPoints(states, customCheckboxes)).toBe(8);
  });
});

describe('calculateWeeklyCheckboxPoints', () => {
  const weekStart = new Date('2024-12-09'); // Monday
  const weekEnd = new Date('2024-12-15'); // Sunday

  it('should return 0 points when threshold not met (2 out of 3)', () => {
    const logs: DailyLog[] = [
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

    const points = calculateWeeklyCheckboxPoints(
      logs,
      defaultCheckboxes,
      weekStart,
      weekEnd
    );

    expect(points.gym_session).toBe(0);
  });

  it('should return 3 points when threshold met (exactly 3 out of 3)', () => {
    const logs: DailyLog[] = [
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

    const points = calculateWeeklyCheckboxPoints(
      logs,
      defaultCheckboxes,
      weekStart,
      weekEnd
    );

    expect(points.gym_session).toBe(3);
  });

  it('should return 3 points when threshold exceeded (5 out of 3)', () => {
    const logs: DailyLog[] = [
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
      {
        user_id: 1,
        log_date: '2024-12-12',
        checkbox_states: { gym_session: true },
        is_completed: true,
      },
      {
        user_id: 1,
        log_date: '2024-12-13',
        checkbox_states: { gym_session: true },
        is_completed: true,
      },
    ];

    const points = calculateWeeklyCheckboxPoints(
      logs,
      defaultCheckboxes,
      weekStart,
      weekEnd
    );

    expect(points.gym_session).toBe(3);
  });

  it('should only count logs within the week range', () => {
    const logs: DailyLog[] = [
      // Previous week
      {
        user_id: 1,
        log_date: '2024-12-08',
        checkbox_states: { gym_session: true },
        is_completed: true,
      },
      // Current week
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
      // Next week
      {
        user_id: 1,
        log_date: '2024-12-16',
        checkbox_states: { gym_session: true },
        is_completed: true,
      },
    ];

    const points = calculateWeeklyCheckboxPoints(
      logs,
      defaultCheckboxes,
      weekStart,
      weekEnd
    );

    // Only 2 in current week, should be 0
    expect(points.gym_session).toBe(0);
  });

  it('should handle multiple weekly checkboxes', () => {
    const checkboxes: CheckboxDefinition[] = [
      ...defaultCheckboxes,
      {
        id: 6,
        name: 'meditation',
        label: 'I meditated',
        points: 2,
        type: 'weekly',
        weekly_threshold: 5,
        display_order: 6,
        is_active: true,
      },
    ];

    const logs: DailyLog[] = [
      {
        user_id: 1,
        log_date: '2024-12-09',
        checkbox_states: { gym_session: true, meditation: true },
        is_completed: true,
      },
      {
        user_id: 1,
        log_date: '2024-12-10',
        checkbox_states: { gym_session: true, meditation: true },
        is_completed: true,
      },
      {
        user_id: 1,
        log_date: '2024-12-11',
        checkbox_states: { gym_session: true, meditation: true },
        is_completed: true,
      },
      {
        user_id: 1,
        log_date: '2024-12-12',
        checkbox_states: { meditation: true },
        is_completed: true,
      },
      {
        user_id: 1,
        log_date: '2024-12-13',
        checkbox_states: { meditation: true },
        is_completed: true,
      },
    ];

    const points = calculateWeeklyCheckboxPoints(
      logs,
      checkboxes,
      weekStart,
      weekEnd
    );

    expect(points.gym_session).toBe(3); // 3 sessions, threshold met
    expect(points.meditation).toBe(2); // 5 sessions, threshold met
  });
});

describe('calculateTotalPoints', () => {
  it('should calculate total points for single completed day with daily checkboxes only', () => {
    const logs: DailyLog[] = [
      {
        user_id: 1,
        log_date: '2024-12-09',
        checkbox_states: {
          logged_food: true,
          within_calorie_limit: true,
          protein_goal_met: false,
          no_cheat_foods: true,
        },
        is_completed: true,
      },
    ];

    const result = calculateTotalPoints(logs, defaultCheckboxes);

    expect(result.dailyPoints).toBe(3);
    expect(result.weeklyPoints).toBe(0);
    expect(result.totalPoints).toBe(3);
  });

  it('should ignore incomplete logs', () => {
    const logs: DailyLog[] = [
      {
        user_id: 1,
        log_date: '2024-12-09',
        checkbox_states: {
          logged_food: true,
          within_calorie_limit: true,
        },
        is_completed: false, // Not completed
      },
    ];

    const result = calculateTotalPoints(logs, defaultCheckboxes);

    expect(result.dailyPoints).toBe(0);
    expect(result.totalPoints).toBe(0);
  });

  it('should calculate weekly points when threshold met', () => {
    const logs: DailyLog[] = [
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

    const result = calculateTotalPoints(logs, defaultCheckboxes);

    expect(result.dailyPoints).toBe(3); // 3 days * 1 point
    expect(result.weeklyPoints).toBe(3); // 1 week with 3+ gym sessions
    expect(result.totalPoints).toBe(6);
    expect(result.weeklyBreakdown.gym_session).toBe(1); // 1 week earned
  });

  it('should calculate points across multiple weeks', () => {
    const logs: DailyLog[] = [
      // Week 1: Dec 9-15 (3 gym sessions)
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
      // Week 2: Dec 16-22 (2 gym sessions - threshold not met)
      {
        user_id: 1,
        log_date: '2024-12-16',
        checkbox_states: { logged_food: true, gym_session: true },
        is_completed: true,
      },
      {
        user_id: 1,
        log_date: '2024-12-17',
        checkbox_states: { logged_food: true, gym_session: true },
        is_completed: true,
      },
      // Week 3: Dec 23-29 (4 gym sessions)
      {
        user_id: 1,
        log_date: '2024-12-23',
        checkbox_states: { logged_food: true, gym_session: true },
        is_completed: true,
      },
      {
        user_id: 1,
        log_date: '2024-12-24',
        checkbox_states: { logged_food: true, gym_session: true },
        is_completed: true,
      },
      {
        user_id: 1,
        log_date: '2024-12-25',
        checkbox_states: { logged_food: true, gym_session: true },
        is_completed: true,
      },
      {
        user_id: 1,
        log_date: '2024-12-26',
        checkbox_states: { logged_food: true, gym_session: true },
        is_completed: true,
      },
    ];

    const result = calculateTotalPoints(logs, defaultCheckboxes);

    expect(result.dailyPoints).toBe(9); // 9 days * 1 point
    expect(result.weeklyPoints).toBe(6); // 2 weeks with 3+ gym sessions * 3 points
    expect(result.totalPoints).toBe(15);
    expect(result.weeklyBreakdown.gym_session).toBe(2); // 2 weeks earned
  });

  it('should filter by start date', () => {
    const logs: DailyLog[] = [
      {
        user_id: 1,
        log_date: '2024-12-01',
        checkbox_states: { logged_food: true },
        is_completed: true,
      },
      {
        user_id: 1,
        log_date: '2024-12-10',
        checkbox_states: { logged_food: true },
        is_completed: true,
      },
    ];

    const startDate = new Date('2024-12-05');
    const result = calculateTotalPoints(logs, defaultCheckboxes, startDate);

    expect(result.dailyPoints).toBe(1); // Only Dec 10 counts
    expect(result.totalPoints).toBe(1);
  });

  it('should handle edge case: exactly at threshold for multiple weeks', () => {
    const logs: DailyLog[] = [
      // Week 1: exactly 3 gym sessions
      {
        user_id: 1,
        log_date: '2024-12-09',
        checkbox_states: { gym_session: true },
        is_completed: true,
      },
      {
        user_id: 1,
        log_date: '2024-12-11',
        checkbox_states: { gym_session: true },
        is_completed: true,
      },
      {
        user_id: 1,
        log_date: '2024-12-13',
        checkbox_states: { gym_session: true },
        is_completed: true,
      },
      // Week 2: exactly 3 gym sessions
      {
        user_id: 1,
        log_date: '2024-12-16',
        checkbox_states: { gym_session: true },
        is_completed: true,
      },
      {
        user_id: 1,
        log_date: '2024-12-18',
        checkbox_states: { gym_session: true },
        is_completed: true,
      },
      {
        user_id: 1,
        log_date: '2024-12-20',
        checkbox_states: { gym_session: true },
        is_completed: true,
      },
    ];

    const result = calculateTotalPoints(logs, defaultCheckboxes);

    expect(result.weeklyPoints).toBe(6); // 2 weeks * 3 points
    expect(result.weeklyBreakdown.gym_session).toBe(2);
  });
});
