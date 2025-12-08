import { describe, it, expect } from 'vitest';
import {
  getWeekRange,
  calculateGymBonus,
  calculateDailyPoints,
  calculateTotalPoints,
} from './weekUtils';

describe('getWeekRange', () => {
  it('should calculate Monday-Sunday range for a Tuesday', () => {
    // Tuesday, Dec 10, 2024
    const date = new Date('2024-12-10');
    const { weekStart, weekEnd } = getWeekRange(date);

    // Should start on Monday, Dec 9, 2024
    expect(weekStart.getDay()).toBe(1); // Monday
    expect(weekStart.getDate()).toBe(9);
    expect(weekStart.getMonth()).toBe(11); // December (0-indexed)
    expect(weekStart.getFullYear()).toBe(2024);

    // Should end on Sunday, Dec 15, 2024
    expect(weekEnd.getDay()).toBe(0); // Sunday
    expect(weekEnd.getDate()).toBe(15);
    expect(weekEnd.getMonth()).toBe(11); // December
    expect(weekEnd.getFullYear()).toBe(2024);
  });

  it('should calculate Monday-Sunday range for a Monday', () => {
    // Monday, Dec 9, 2024
    const date = new Date('2024-12-09');
    const { weekStart, weekEnd } = getWeekRange(date);

    // Should start on same Monday
    expect(weekStart.getDay()).toBe(1);
    expect(weekStart.getDate()).toBe(9);

    // Should end on Sunday, Dec 15, 2024
    expect(weekEnd.getDay()).toBe(0);
    expect(weekEnd.getDate()).toBe(15);
  });

  it('should calculate Monday-Sunday range for a Sunday', () => {
    // Sunday, Dec 8, 2024
    const date = new Date('2024-12-08');
    const { weekStart, weekEnd } = getWeekRange(date);

    // Should start on Monday, Dec 2, 2024 (previous Monday)
    expect(weekStart.getDay()).toBe(1);
    expect(weekStart.getDate()).toBe(2);

    // Should end on same Sunday, Dec 8, 2024
    expect(weekEnd.getDay()).toBe(0);
    expect(weekEnd.getDate()).toBe(8);
  });
});

describe('calculateGymBonus', () => {
  it('should return 0 for 0 sessions', () => {
    expect(calculateGymBonus(0)).toBe(0);
  });

  it('should return 0 for 1 session', () => {
    expect(calculateGymBonus(1)).toBe(0);
  });

  it('should return 0 for 2 sessions', () => {
    expect(calculateGymBonus(2)).toBe(0);
  });

  it('should return 3 for exactly 3 sessions', () => {
    expect(calculateGymBonus(3)).toBe(3);
  });

  it('should return 3 for 4 sessions', () => {
    expect(calculateGymBonus(4)).toBe(3);
  });

  it('should return 3 for 7 sessions', () => {
    expect(calculateGymBonus(7)).toBe(3);
  });
});

describe('calculateDailyPoints', () => {
  it('should return 0 for no checkboxes', () => {
    expect(calculateDailyPoints({})).toBe(0);
  });

  it('should return 1 for one checkbox', () => {
    expect(calculateDailyPoints({ logged_food: true })).toBe(1);
  });

  it('should return 2 for two checkboxes', () => {
    expect(
      calculateDailyPoints({
        logged_food: true,
        within_calorie_limit: true,
      })
    ).toBe(2);
  });

  it('should return 4 for all checkboxes', () => {
    expect(
      calculateDailyPoints({
        logged_food: true,
        within_calorie_limit: true,
        protein_goal_met: true,
        no_cheat_foods: true,
      })
    ).toBe(4);
  });

  it('should ignore false values', () => {
    expect(
      calculateDailyPoints({
        logged_food: true,
        within_calorie_limit: false,
        protein_goal_met: true,
        no_cheat_foods: false,
      })
    ).toBe(2);
  });
});

describe('calculateTotalPoints', () => {
  it('should add daily points and gym bonus', () => {
    expect(calculateTotalPoints(4, 3)).toBe(7);
  });

  it('should work with 0 gym bonus', () => {
    expect(calculateTotalPoints(2, 0)).toBe(2);
  });

  it('should work with 0 daily points', () => {
    expect(calculateTotalPoints(0, 3)).toBe(3);
  });

  it('should work with both 0', () => {
    expect(calculateTotalPoints(0, 0)).toBe(0);
  });
});

describe('Integration: Gym Points Scenarios', () => {
  it('2 gym sessions should give 0 bonus points', () => {
    const gymBonus = calculateGymBonus(2);
    expect(gymBonus).toBe(0);

    // If user has 2 gym sessions and no other checkboxes
    const totalPoints = calculateTotalPoints(0, gymBonus);
    expect(totalPoints).toBe(0);
  });

  it('3 gym sessions should give 3 bonus points', () => {
    const gymBonus = calculateGymBonus(3);
    expect(gymBonus).toBe(3);

    // If user has 3 gym sessions and no other checkboxes
    const totalPoints = calculateTotalPoints(0, gymBonus);
    expect(totalPoints).toBe(3);
  });

  it('3 gym sessions + 4 daily checkboxes should give 7 points', () => {
    const gymBonus = calculateGymBonus(3);
    const dailyPoints = calculateDailyPoints({
      logged_food: true,
      within_calorie_limit: true,
      protein_goal_met: true,
      no_cheat_foods: true,
    });
    const totalPoints = calculateTotalPoints(dailyPoints, gymBonus);
    expect(totalPoints).toBe(7);
  });
});
