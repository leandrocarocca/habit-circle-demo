#!/usr/bin/env tsx
import { Pool } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

interface Migration {
  version: string;
  description: string;
  filename: string;
  sql: string;
}

async function runMigrations() {
  if (!process.env.POSTGRES_URL) {
    console.error('❌ POSTGRES_URL environment variable not found');
    console.error('Add it to .env.local with your Neon database connection string');
    console.error('');
    console.error('Example:');
    console.error('POSTGRES_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

  try {
    console.log('🚀 Starting database migrations...\n');

    // Step 1: Create migrations tracking table if it doesn't exist
    console.log('📋 Setting up migrations tracking table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(50) PRIMARY KEY,
        description TEXT,
        installed_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        execution_time INTEGER,
        success BOOLEAN DEFAULT TRUE
      )
    `);
    console.log('✓ Migrations tracking table ready\n');

    // Step 2: Read all migration files from migrations/ directory
    const migrationsDir = path.join(process.cwd(), 'migrations');

    if (!fs.existsSync(migrationsDir)) {
      console.log('⚠️  No migrations directory found. Creating one...');
      fs.mkdirSync(migrationsDir);
      console.log('✓ Created migrations/ directory');
      console.log('\nℹ️  Add migration files like: V001__description.sql');
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.match(/^V\d+__.+\.sql$/))
      .sort();

    if (files.length === 0) {
      console.log('⚠️  No migration files found in migrations/');
      console.log('\nℹ️  Create files like: V001__initial_schema.sql');
      return;
    }

    console.log(`📁 Found ${files.length} migration file(s):\n`);

    // Step 3: Parse migration files
    const migrations: Migration[] = files.map(filename => {
      const match = filename.match(/^V(\d+)__(.+)\.sql$/);
      if (!match) {
        throw new Error(`Invalid migration filename: ${filename}`);
      }

      const version = match[1];
      const description = match[2].replace(/_/g, ' ');
      const filepath = path.join(migrationsDir, filename);
      const sql = fs.readFileSync(filepath, 'utf-8');

      return { version, description, filename, sql };
    });

    // Step 4: Check which migrations have already been run
    const appliedResult = await pool.query(
      'SELECT version FROM schema_migrations ORDER BY version'
    );
    const appliedVersions = new Set(appliedResult.rows.map(r => r.version));

    // Step 5: Run pending migrations
    const pendingMigrations = migrations.filter(m => !appliedVersions.has(m.version));

    if (pendingMigrations.length === 0) {
      console.log('✅ Database is up to date! No pending migrations.\n');

      // Show applied migrations
      if (appliedVersions.size > 0) {
        console.log('Applied migrations:');
        for (const migration of migrations) {
          if (appliedVersions.has(migration.version)) {
            console.log(`  ✓ V${migration.version}: ${migration.description}`);
          }
        }
      }
      return;
    }

    console.log(`⏳ Running ${pendingMigrations.length} pending migration(s)...\n`);

    for (const migration of pendingMigrations) {
      console.log(`▶️  V${migration.version}: ${migration.description}`);
      const startTime = Date.now();

      try {
        // Run the migration SQL
        await pool.query(migration.sql);

        // Record successful migration
        const executionTime = Date.now() - startTime;
        await pool.query(
          `INSERT INTO schema_migrations (version, description, execution_time, success)
           VALUES ($1, $2, $3, true)`,
          [migration.version, migration.description, executionTime]
        );

        console.log(`   ✓ Completed in ${executionTime}ms\n`);
      } catch (error: any) {
        console.error(`   ✗ Failed: ${error.message}\n`);

        // Record failed migration
        await pool.query(
          `INSERT INTO schema_migrations (version, description, success)
           VALUES ($1, $2, false)
           ON CONFLICT (version) DO UPDATE SET success = false`,
          [migration.version, migration.description]
        );

        throw new Error(`Migration V${migration.version} failed: ${error.message}`);
      }
    }

    console.log('✅ All migrations completed successfully!\n');

    // Show summary
    const allApplied = await pool.query(
      'SELECT version, description, installed_on FROM schema_migrations ORDER BY version'
    );

    console.log('Database migration history:');
    for (const row of allApplied.rows) {
      const date = new Date(row.installed_on).toLocaleString();
      console.log(`  V${row.version}: ${row.description} (${date})`);
    }

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations
runMigrations();
