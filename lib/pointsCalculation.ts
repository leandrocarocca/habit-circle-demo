import { getWeekRange } from './weekUtils';

export interface CheckboxDefinition {
  id: number;
  name: string;
  label: string;
  points: number;
  type: 'daily' | 'weekly';
  weekly_threshold: number | null;
  display_order: number;
  is_active: boolean;
}

export interface DailyLog {
  user_id: number;
  log_date: string;
  checkbox_states: Record<string, boolean>;
  is_completed: boolean;
}

/**
 * Calculate points for a single day based on daily checkboxes only
 */
export function calculateDailyCheckboxPoints(
  checkboxStates: Record<string, boolean>,
  checkboxDefinitions: CheckboxDefinition[]
): number {
  return checkboxDefinitions
    .filter((def) => def.type === 'daily' && def.is_active)
    .reduce((total, def) => {
      return total + (checkboxStates[def.name] ? def.points : 0);
    }, 0);
}

/**
 * Calculate weekly checkbox points for a specific week
 * Returns points for each weekly checkbox type
 */
export function calculateWeeklyCheckboxPoints(
  logs: DailyLog[],
  checkboxDefinitions: CheckboxDefinition[],
  weekStart: Date,
  weekEnd: Date
): Record<string, number> {
  const weeklyPoints: Record<string, number> = {};

  // Filter logs to only those in the week range
  const logsInWeek = logs.filter((log) => {
    const logDate = new Date(log.log_date);
    return logDate >= weekStart && logDate <= weekEnd;
  });

  // For each weekly checkbox definition
  checkboxDefinitions
    .filter((def) => def.type === 'weekly' && def.is_active)
    .forEach((def) => {
      // Count how many days this checkbox was checked in the week
      const checkedCount = logsInWeek.filter(
        (log) => log.checkbox_states[def.name] === true
      ).length;

      // Award points if threshold is met
      if (def.weekly_threshold && checkedCount >= def.weekly_threshold) {
        weeklyPoints[def.name] = def.points;
      } else {
        weeklyPoints[def.name] = 0;
      }
    });

  return weeklyPoints;
}

/**
 * Calculate total points for a user from a date range
 * Returns breakdown of daily and weekly points
 */
export function calculateTotalPoints(
  logs: DailyLog[],
  checkboxDefinitions: CheckboxDefinition[],
  startDate?: Date
): {
  totalPoints: number;
  dailyPoints: number;
  weeklyPoints: number;
  weeklyBreakdown: Record<string, number>;
} {
  // Filter logs by start date and completed status
  const filteredLogs = logs.filter((log) => {
    if (!log.is_completed) return false;
    if (startDate) {
      const logDate = new Date(log.log_date);
      return logDate >= startDate;
    }
    return true;
  });

  // Calculate daily points (sum of all daily checkbox points from completed logs)
  const dailyPoints = filteredLogs.reduce((total, log) => {
    return total + calculateDailyCheckboxPoints(log.checkbox_states, checkboxDefinitions);
  }, 0);

  // Group logs by week and calculate weekly points
  const weeklyPointsMap = new Map<string, number>();
  const processedWeeks = new Set<string>();

  filteredLogs.forEach((log) => {
    const { weekStart, weekEnd } = getWeekRange(log.log_date);
    const weekKey = weekStart.toISOString().split('T')[0];

    // Only process each week once
    if (!processedWeeks.has(weekKey)) {
      processedWeeks.add(weekKey);

      const weeklyPoints = calculateWeeklyCheckboxPoints(
        filteredLogs,
        checkboxDefinitions,
        weekStart,
        weekEnd
      );

      // Sum up weekly points for this week
      const weekTotal = Object.values(weeklyPoints).reduce((sum, pts) => sum + pts, 0);
      weeklyPointsMap.set(weekKey, weekTotal);
    }
  });

  // Calculate total weekly points (sum of all weeks)
  const weeklyPoints = Array.from(weeklyPointsMap.values()).reduce(
    (sum, pts) => sum + pts,
    0
  );

  // Create weekly breakdown by checkbox type (for stats)
  const weeklyBreakdown: Record<string, number> = {};
  checkboxDefinitions
    .filter((def) => def.type === 'weekly' && def.is_active)
    .forEach((def) => {
      // Count how many weeks this checkbox earned points
      let weeksEarned = 0;
      processedWeeks.forEach((weekKey) => {
        const weekStartDate = new Date(weekKey);
        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekEndDate.getDate() + 6);

        const weekLogs = filteredLogs.filter((log) => {
          const logDate = new Date(log.log_date);
          return logDate >= weekStartDate && logDate <= weekEndDate;
        });

        const checkedCount = weekLogs.filter(
          (log) => log.checkbox_states[def.name] === true
        ).length;

        if (def.weekly_threshold && checkedCount >= def.weekly_threshold) {
          weeksEarned++;
        }
      });

      weeklyBreakdown[def.name] = weeksEarned;
    });

  return {
    totalPoints: dailyPoints + weeklyPoints,
    dailyPoints,
    weeklyPoints,
    weeklyBreakdown,
  };
}
