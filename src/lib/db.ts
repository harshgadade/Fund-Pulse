import { createClient, Client } from '@libsql/client';
import path from 'path';
import fs from 'fs';

let clientInstance: Client | null = null;

export function getDb(): Client {
  if (!clientInstance) {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = path.join(dataDir, 'fund.db');
    clientInstance = createClient({
      url: `file:${dbPath}`,
    });
  }
  return clientInstance;
}

export async function initDb() {
  const db = getDb();

  // Create tables
  await db.execute(`
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

  await db.execute(`
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

  await db.execute(`
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

  await db.execute(`
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

  await db.execute(`
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

  await db.execute(`
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

  // Ensure member_type column exists for existing installations
  try {
    await db.execute("ALTER TABLE members ADD COLUMN member_type TEXT NOT NULL DEFAULT 'REGULAR'");
  } catch {
    // Column already exists
  }

  // Ensure an active cycle exists
  const activeCycle = await db.execute({
    sql: 'SELECT * FROM cycles WHERE is_active = 1 LIMIT 1',
    args: [],
  });

  if (activeCycle.rows.length === 0) {
    const id = 'cycle-2026-27';
    await db.execute({
      sql: `INSERT INTO cycles (id, name, start_year, monthly_amount, default_interest_rate, is_active, notes, created_at)
            VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      args: [
        id,
        'FY 2026-2027',
        2026,
        1000,
        3.0,
        'Standard 12-Month Fund Cycle (May 2026 - April 2027)',
        new Date().toISOString(),
      ],
    });
  }
}
