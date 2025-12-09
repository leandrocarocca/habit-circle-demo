# Migration Guide: V2 Dynamic Checkbox System

## Overview

This migration introduces a flexible checkbox configuration system that allows you to:
- Configure checkboxes through a UI (no code changes needed)
- Add/remove/modify checkboxes without database schema changes
- Support both daily and weekly checkbox types
- Calculate points dynamically from checkbox states

## Key Changes

### 1. New Database Schema
- **`checkbox_definitions` table**: Stores checkbox configurations
- **`daily_logs.checkbox_states`**: JSONB column for flexible checkbox storage
- **Points calculation**: Now dynamic (not stored in database)

### 2. New API Endpoints

#### V2 Endpoints (New System)
- `GET /api/logs-v2` - Get daily log with calculated points
- `POST /api/logs-v2` - Save daily log with checkbox states
- `GET /api/stats-v2` - Get user stats with dynamic points calculation
- `GET /api/checkboxes` - List all active checkboxes
- `POST /api/checkboxes` - Create new checkbox
- `PUT /api/checkboxes/[id]` - Update checkbox
- `DELETE /api/checkboxes/[id]` - Deactivate checkbox

#### Legacy Endpoints (Still Available)
- `/api/logs` - Old system (uses boolean columns)
- `/api/stats` - Old system (recalculates points each time)

### 3. New Pages
- `/app/settings/checkboxes` - Manage checkbox configurations

## Migration Steps

### Step 1: Run Database Migration

```sql
-- Apply schema-v2.sql
psql $POSTGRES_URL -f schema-v2.sql
```

This will:
1. Create `checkbox_definitions` table
2. Add `checkbox_states` JSONB column to `daily_logs`
3. Migrate existing boolean data to JSONB format
4. Insert default checkbox definitions

### Step 2: Verify Migration

```bash
# Run tests
npm test

# All 38 tests should pass
```

### Step 3: Test Checkbox Configuration

1. Start the dev server: `npm run dev`
2. Navigate to `/app/settings/checkboxes`
3. You should see 5 default checkboxes:
   - Logged food (daily, 1 point)
   - Within calorie limit (daily, 1 point)
   - Protein goal met (daily, 1 point)
   - No cheat foods (daily, 1 point)
   - Gym session (weekly, 3 points, threshold: 3/week)

### Step 4: Test V2 APIs

#### Test Logging
```bash
# Save a log with checkbox states
curl -X POST http://localhost:3000/api/logs-v2 \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2024-12-09",
    "checkbox_states": {
      "logged_food": true,
      "within_calorie_limit": true,
      "gym_session": true
    },
    "is_completed": true
  }'

# Response includes calculated points:
{
  "log_date": "2024-12-09",
  "checkbox_states": {...},
  "is_completed": true,
  "calculated_points": {
    "daily": 2,
    "weekly": 0,  // Need 3 gym sessions
    "total": 2
  }
}
```

#### Test Stats
```bash
curl http://localhost:3000/api/stats-v2

# Response:
{
  "total_points": 150,
  "daily_points": 120,
  "weekly_points": 30,
  "checkbox_stats": {
    "logged_food": { "total": 45, "current_streak": 5 },
    "gym_session": { "weeks_earned": 10, "total_sessions": 35 }
  }
}
```

## How Points Are Calculated

### Daily Checkboxes
- Points awarded immediately when checkbox is checked
- Total daily points = sum of all checked daily checkboxes on completed days

### Weekly Checkboxes
- Points awarded when weekly threshold is met
- Example: Gym (3 points, threshold: 3 times/week)
  - Mon, Tue, Wed checked → 3 points for the entire week
  - Mon, Tue checked → 0 points
  - All 7 days checked → still only 3 points (no bonus for exceeding threshold)

### Total Points Formula
```
Total Points = (Sum of all daily checkbox points from completed logs) +
               (Sum of weekly checkbox points for qualifying weeks)
```

## Testing Scenarios

### Scenario 1: Daily Checkboxes Only
```
Day 1: logged_food ✓, within_calorie_limit ✓ → 2 points
Day 2: logged_food ✓ → 1 point
Total: 3 points
```

### Scenario 2: Weekly Checkbox (Below Threshold)
```
Week 1:
  Mon: gym ✓
  Tue: gym ✓
  Wed: (no gym)
Result: 0 weekly points (only 2 sessions, need 3)
```

### Scenario 3: Weekly Checkbox (Threshold Met)
```
Week 1:
  Mon: gym ✓, logged_food ✓
  Tue: gym ✓, logged_food ✓
  Wed: gym ✓, logged_food ✓
Result:
  - Daily points: 3 (1 per day)
  - Weekly points: 3 (threshold met)
  - Total: 6 points
```

### Scenario 4: Multiple Weeks
```
Week 1: 3 gym sessions → 3 weekly points
Week 2: 2 gym sessions → 0 weekly points
Week 3: 4 gym sessions → 3 weekly points
Total weekly points: 6
```

## Adding Custom Checkboxes

### Via UI (Recommended)
1. Go to `/app/settings/checkboxes`
2. Click "Add Checkbox"
3. Fill in:
   - **Name**: Unique identifier (e.g., `meditation`)
   - **Label**: Display text (e.g., "I meditated for 10 minutes")
   - **Type**: Daily or Weekly
   - **Points**: Point value (e.g., 2)
   - **Weekly Threshold**: If weekly, how many times per week (e.g., 5)
   - **Display Order**: Order in the logging UI

### Via API
```bash
curl -X POST http://localhost:3000/api/checkboxes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "meditation",
    "label": "I meditated for 10 minutes",
    "type": "weekly",
    "points": 2,
    "weekly_threshold": 5,
    "display_order": 6
  }'
```

## Rollback Plan

If you need to rollback to the old system:

1. Frontend can continue using `/api/logs` and `/api/stats` (old endpoints)
2. The JSONB migration is backward compatible (old boolean columns still exist)
3. To fully rollback:
   ```sql
   DROP TABLE checkbox_definitions;
   ALTER TABLE daily_logs DROP COLUMN checkbox_states;
   ```

## Advantages of New System

1. **Flexibility**: Add/remove checkboxes without code changes
2. **No Sync Issues**: Points calculated dynamically, always accurate
3. **Testable**: 38 comprehensive tests ensure correctness
4. **Extensible**: Easy to add new checkbox types in the future
5. **User-Friendly**: Configure checkboxes through UI instead of database

## Performance Considerations

- Points are calculated on-demand (not stored)
- For large datasets, consider caching or materialized views
- JSONB is indexed with GIN for fast queries
- Weekly calculations are optimized to process each week once

## Next Steps

1. Run the migration
2. Test the V2 APIs thoroughly
3. Update frontend to use `/api/logs-v2` and `/api/stats-v2`
4. Remove old API endpoints once migration is complete
5. Add more custom checkboxes as needed through the UI

## Support

If you encounter issues:
1. Check console logs for error messages
2. Verify database migration ran successfully
3. Run `npm test` to ensure all tests pass
4. Check that `checkbox_definitions` table has default data
