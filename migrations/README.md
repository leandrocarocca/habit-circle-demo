# Database Migrations

This directory contains SQL migration files that serve as the **source of truth** for the database schema.

## How It Works

Similar to Liquibase/Flyway in Spring Boot projects:

1. **Migration files** are version-controlled SQL scripts
2. **Migration runner** executes pending migrations in order
3. **Tracking table** (`schema_migrations`) records what's been applied
4. **Idempotent** - safe to run multiple times

## Naming Convention

Migration files must follow this pattern:

```
V{version}__{description}.sql
```

**Examples:**
- `V001__initial_schema.sql`
- `V002__checkbox_definitions.sql`
- `V003__add_user_preferences.sql`

**Rules:**
- Version must be numeric (001, 002, 003, etc.)
- Use double underscore `__` between version and description
- Description uses underscores for spaces
- Must end with `.sql`

## Running Migrations

### First Time Setup

1. **Add your database URL to `.env.local`:**
   ```env
   POSTGRES_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb
   ```

2. **Run migrations:**
   ```bash
   npm run db:migrate
   ```

### Adding New Migrations

1. **Create a new file** with the next version number:
   ```bash
   # Example: V003__add_notifications.sql
   touch migrations/V003__add_notifications.sql
   ```

2. **Write your SQL:**
   ```sql
   -- V003: Add notifications
   -- Description: Create notifications table for user alerts

   CREATE TABLE notifications (
     id SERIAL PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(id),
     message TEXT NOT NULL,
     read BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   CREATE INDEX idx_notifications_user ON notifications(user_id);
   ```

3. **Run the migration:**
   ```bash
   npm run db:migrate
   ```

## Migration Runner Features

The migration runner (`scripts/migrate.ts`):

- ✅ **Tracks applied migrations** in `schema_migrations` table
- ✅ **Runs migrations in order** by version number
- ✅ **Records execution time** for performance monitoring
- ✅ **Handles failures** gracefully and logs errors
- ✅ **Shows migration history** after completion
- ✅ **Idempotent** - safe to run multiple times

## Best Practices

### ✅ DO:
- **Version control** all migration files
- **Test migrations** on a copy of production data
- **Use transactions** when possible
- **Make migrations reversible** when feasible
- **Add comments** explaining complex changes
- **Use `IF NOT EXISTS`** for safety

### ❌ DON'T:
- **Modify existing** migration files after they've been run
- **Delete** migration files
- **Skip version numbers**
- **Combine multiple** unrelated changes in one migration

## Example Workflow

### Scenario: Adding a new feature

1. **Create migration:**
   ```bash
   # V003__add_user_avatars.sql
   ```

2. **Write SQL:**
   ```sql
   -- V003: Add user avatars
   -- Description: Add avatar storage for user profiles

   ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
   CREATE INDEX IF NOT EXISTS idx_users_avatar ON users(avatar_url);
   ```

3. **Test locally:**
   ```bash
   npm run db:migrate
   ```

4. **Commit to git:**
   ```bash
   git add migrations/V003__add_user_avatars.sql
   git commit -m "Add user avatars migration"
   ```

5. **Deploy:**
   - On production, run `npm run db:migrate`
   - Migration runner will apply only V003 (V001, V002 already applied)

## Viewing Migration History

After running migrations, you'll see:

```
Database migration history:
  V001: initial schema (12/9/2024, 10:30:00 AM)
  V002: checkbox definitions (12/9/2024, 10:30:05 AM)
  V003: add user avatars (12/9/2024, 2:45:12 PM)
```

## Troubleshooting

### Migration fails midway

The `schema_migrations` table tracks failed migrations:

```sql
SELECT * FROM schema_migrations WHERE success = false;
```

**To fix:**
1. Review the error message
2. Fix the SQL in the migration file
3. Manually rollback any partial changes
4. Delete the failed entry: `DELETE FROM schema_migrations WHERE version = '003'`
5. Re-run: `npm run db:migrate`

### Need to rollback?

Migrations are **forward-only** by default. To rollback:

1. Create a new migration that reverses the changes
2. Example: If V003 added a column, V004 drops it

## Current Migrations

- **V001** - Initial schema (users, sessions, daily_logs, groups, etc.)
- **V002** - Checkbox definitions table for V2 system

## Questions?

See `scripts/migrate.ts` for the migration runner implementation.
