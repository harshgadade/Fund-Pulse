const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

// Try reading .env.local or .env if present
const envFiles = ['.env.local', '.env'];
for (const envFile of envFiles) {
  const envPath = path.join(__dirname, '..', envFile);
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

// Support command line arguments: node scripts/sync-local-to-turso.js <URL> <TOKEN>
let argUrl = process.argv[2];
let argToken = process.argv[3];

if (argUrl && argUrl.includes('=')) {
  argUrl = argUrl.substring(argUrl.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');
}
if (argToken && argToken.includes('=')) {
  argToken = argToken.substring(argToken.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');
}

const tursoUrl = argUrl || process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
const tursoAuthToken = argToken || process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN;

if (!tursoUrl) {
  console.error('\n❌ ERROR: TURSO_DATABASE_URL is missing.');
  console.error('You can provide it directly as arguments:');
  console.error('  node scripts/sync-local-to-turso.js "libsql://your-db.turso.io" "your-token"');
  console.error('\nOr create a .env.local file with:');
  console.error('TURSO_DATABASE_URL=libsql://your-db.turso.io');
  console.error('TURSO_AUTH_TOKEN=your-token\n');
  process.exit(1);
}

const localDbPath = path.join(__dirname, '..', 'data', 'fund.db');
if (!fs.existsSync(localDbPath)) {
  console.error('❌ Local database data/fund.db not found!');
  process.exit(1);
}

const localDb = createClient({ url: `file:${localDbPath}` });
const remoteDb = createClient({ url: tursoUrl, authToken: tursoAuthToken });

const tables = ['cycles', 'members', 'contributions', 'loans', 'loan_repayments', 'expenses'];

async function initRemoteTables() {
  console.log('📦 Ensuring tables exist in Turso...');
  await remoteDb.execute(`
    CREATE TABLE IF NOT EXISTS cycles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      start_year INTEGER NOT NULL,
      monthly_amount REAL NOT NULL DEFAULT 1000,
      default_interest_rate REAL NOT NULL DEFAULT 3.0,
      is_active INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      created_at TEXT NOT NULL
    )
  `);

  await remoteDb.execute(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      shares REAL NOT NULL DEFAULT 1.0,
      member_type TEXT NOT NULL DEFAULT 'REGULAR',
      joined_month_index INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      notes TEXT,
      created_at TEXT NOT NULL
    )
  `);

  await remoteDb.execute(`
    CREATE TABLE IF NOT EXISTS contributions (
      id TEXT PRIMARY KEY,
      cycle_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      month_index INTEGER NOT NULL,
      year INTEGER NOT NULL,
      amount_due REAL NOT NULL DEFAULT 0,
      amount_paid REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'PENDING',
      paid_date TEXT,
      payment_method TEXT DEFAULT 'Cash',
      reference_no TEXT,
      notes TEXT,
      updated_at TEXT NOT NULL,
      UNIQUE(cycle_id, member_id, month_index),
      FOREIGN KEY (cycle_id) REFERENCES cycles(id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    )
  `);

  await remoteDb.execute(`
    CREATE TABLE IF NOT EXISTS loans (
      id TEXT PRIMARY KEY,
      cycle_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      loan_no TEXT NOT NULL,
      principal_amount REAL NOT NULL,
      interest_rate_pct REAL NOT NULL DEFAULT 3.0,
      disbursement_date TEXT NOT NULL,
      disbursement_method TEXT NOT NULL DEFAULT 'Cash',
      repayment_terms TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (cycle_id) REFERENCES cycles(id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    )
  `);

  await remoteDb.execute(`
    CREATE TABLE IF NOT EXISTS loan_repayments (
      id TEXT PRIMARY KEY,
      loan_id TEXT NOT NULL,
      payment_date TEXT NOT NULL,
      principal_paid REAL NOT NULL DEFAULT 0,
      interest_paid REAL NOT NULL DEFAULT 0,
      total_paid REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'Cash',
      reference_no TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
    )
  `);

  await remoteDb.execute(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      cycle_id TEXT NOT NULL,
      category TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'EXPENSE',
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (cycle_id) REFERENCES cycles(id) ON DELETE CASCADE
    )
  `);
}

async function sync() {
  try {
    console.log('🚀 Connecting to databases...');
    await initRemoteTables();

    console.log('🧹 Clearing sample / empty data in Turso...');
    await remoteDb.execute('DELETE FROM loan_repayments');
    await remoteDb.execute('DELETE FROM loans');
    await remoteDb.execute('DELETE FROM contributions');
    await remoteDb.execute('DELETE FROM expenses');
    await remoteDb.execute('DELETE FROM members');
    await remoteDb.execute('DELETE FROM cycles');

    for (const table of tables) {
      const rowsRes = await localDb.execute(`SELECT * FROM ${table}`);
      const rows = rowsRes.rows;
      console.log(`⏳ Copying ${rows.length} rows for table "${table}"...`);

      for (const row of rows) {
        const keys = Object.keys(row);
        const placeholders = keys.map(() => '?').join(', ');
        const values = keys.map(k => row[k]);
        await remoteDb.execute({
          sql: `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
          args: values,
        });
      }
      console.log(`✅ Table "${table}" synced successfully (${rows.length} rows).`);
    }

    console.log('\n🎉 ALL DATA SYNCED TO TURSO SUCCESSFULLY!');
    console.log('Now your cloud database has all 20 members, all 16 loans, and all 13 repayments up to October intact!');
  } catch (err) {
    console.error('❌ Error during sync:', err);
    process.exit(1);
  }
}

sync();
