import { Pool } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function runMigration() {
  if (!process.env.POSTGRES_URL) {
    console.error('❌ POSTGRES_URL environment variable not found');
    console.error('Make sure .env.local exists with POSTGRES_URL');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

  console.log('Starting V2 migration...\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'schema-v2.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`[${i + 1}/${statements.length}] Executing: ${statement.substring(0, 100)}...`);

      try {
        await pool.query(statement);
        console.log('✓ Success\n');
      } catch (error: any) {
        // Ignore "already exists" errors
        if (error.message.includes('already exists') || error.message.includes('duplicate key')) {
          console.log('⚠ Already exists (skipping)\n');
        } else {
          console.error('✗ Error:', error.message);
          throw error;
        }
      }
    }

    // Verify the migration
    console.log('\nVerifying migration...');

    const checkboxCount = await pool.query('SELECT COUNT(*) FROM checkbox_definitions');
    console.log(`✓ checkbox_definitions table exists with ${checkboxCount.rows[0].count} rows`);

    const hasCheckboxStates = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'daily_logs' AND column_name = 'checkbox_states'`
    );
    console.log(`✓ daily_logs.checkbox_states column exists: ${hasCheckboxStates.rows.length > 0}`);

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
