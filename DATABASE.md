# Database Setup Guide

## Quick Start (New Database)

### 1. Create a Neon Database

1. Go to https://neon.tech/
2. Sign up or log in (free tier available)
3. Click **"New Project"**
4. Copy the connection string shown

### 2. Configure Environment

Edit `.env.local` and add your connection string:

```env
POSTGRES_URL=postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### 3. Run Migrations

```bash
npm run db:migrate
```

You should see:

```
🚀 Starting database migrations...
📋 Setting up migrations tracking table...
✓ Migrations tracking table ready

📁 Found 2 migration file(s):

⏳ Running 2 pending migration(s)...

▶️  V001: initial schema
   ✓ Completed in 245ms

▶️  V002: checkbox definitions
   ✓ Completed in 123ms

✅ All migrations completed successfully!
```

### 4. Start the App

```bash
npm run dev
```

Visit http://localhost:3000 and sign up!

## Migration System

We use a **Liquibase-style migration system** where:

- ✅ SQL files are version-controlled (source of truth)
- ✅ Migrations run automatically in order
- ✅ Safe to run multiple times (idempotent)
- ✅ Tracks what's been applied

### Adding Migrations

See [`migrations/README.md`](./migrations/README.md) for detailed instructions.

**Quick example:**

1. Create `migrations/V003__your_feature.sql`
2. Write your SQL
3. Run `npm run db:migrate`
4. Commit to git

## Environment Variables

Required in `.env.local`:

```env
# Database (Required)
POSTGRES_URL=postgresql://...

# NextAuth (Required)
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
```

## Database Schema

The database includes:

- **users** - User accounts and authentication
- **sessions** - User sessions
- **accounts** - OAuth provider accounts
- **daily_logs** - User daily habit logs (JSONB checkbox states)
- **challenge_groups** - Habit tracking groups
- **group_memberships** - User-group relationships
- **group_invitations** - Pending group invites
- **checkbox_definitions** - Configurable habit checkboxes
- **schema_migrations** - Migration tracking table

## Default Checkboxes

After migration, you'll have 5 default checkboxes:

1. **Logged food** (daily, 1pt)
2. **Within calorie limit** (daily, 1pt)
3. **Protein goal met** (daily, 1pt)
4. **No cheat foods** (daily, 1pt)
5. **Gym session** (weekly, 3pts when 3+ sessions/week)

Customize these at `/app/settings/checkboxes`

## Troubleshooting

### No POSTGRES_URL

```
❌ POSTGRES_URL environment variable not found
```

**Fix:** Add your Neon connection string to `.env.local`

### Connection failed

```
Error: getaddrinfo ENOTFOUND ep-xxx...
```

**Fix:** Check your connection string is correct and internet connection is working

### Migration failed

```
✗ Failed: relation "users" already exists
```

**Fix:** The migration runner handles this gracefully. If you see errors about existing tables, that's normal for re-runs.

## Production Deployment

When deploying to Vercel/other platforms:

1. Add `POSTGRES_URL` to platform environment variables
2. Migrations run automatically on first deploy
3. Subsequent deploys only run new migrations

## Learn More

- [Migration System Details](./migrations/README.md)
- [Neon Documentation](https://neon.tech/docs)
- [NextAuth.js](https://next-auth.js.org/)
