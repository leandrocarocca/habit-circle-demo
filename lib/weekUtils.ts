/**
 * Format a date to YYYY-MM-DD in local timezone
 */
export function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate the Monday-Sunday week range for a given date
 */
export function getWeekRange(date: Date | string): { weekStart: Date; weekEnd: Date } {
  const logDate = new Date(date);
  const dayOfWeek = logDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

  const weekStart = new Date(logDate);
  // Adjust to Monday as start of week
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  weekStart.setDate(logDate.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

/**
 * Calculate gym bonus points based on session count
 */
export function calculateGymBonus(gymSessionCount: number): number {
  return gymSessionCount >= 3 ? 3 : 0;
}

/**
 * Calculate daily points from checkboxes
 */
export function calculateDailyPoints(log: {
  logged_food?: boolean;
  within_calorie_limit?: boolean;
  protein_goal_met?: boolean;
  no_cheat_foods?: boolean;
}): number {
  return [
    log.logged_food,
    log.within_calorie_limit,
    log.protein_goal_met,
    log.no_cheat_foods,
  ].filter(Boolean).length;
}

/**
 * Calculate total points (daily + gym bonus)
 */
export function calculateTotalPoints(
  dailyPoints: number,
  gymBonus: number
): number {
  return dailyPoints + gymBonus;
}
