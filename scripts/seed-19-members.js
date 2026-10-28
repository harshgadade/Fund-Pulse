const { createClient } = require('@libsql/client');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'fund.db');
const db = createClient({ url: `file:${dbPath}` });

const members = [
  { name: 'Jyoti', shares: 4 },
  { name: 'Ravi', shares: 2 },
  { name: 'Sughanda', shares: 5 },
  { name: 'Shila Devkate', shares: 5 },
  { name: 'Harsh', shares: 10 },
  { name: 'Sunita', shares: 2 },
  { name: 'Ghodke', shares: 5 },
  { name: 'Sharma', shares: 5 },
  { name: 'Chavan D2', shares: 2 },
  { name: 'Dilip', shares: 2 },
  { name: 'Manisha', shares: 4 },
  { name: 'Manisha Pawar', shares: 4 },
  { name: 'Trilochan', shares: 2 },
  { name: 'Maruti', shares: 1 },
  { name: 'Amrpali', shares: 5 },
  { name: 'Sanjay Shelar', shares: 7 },
  { name: 'Dighe', shares: 3 },
  { name: 'Rohini Kambale', shares: 5 },
  { name: 'Sudharshani', shares: 2 },
];

async function seed() {
  console.log('Clearing existing data...');
  await db.execute('UPDATE cycles SET default_interest_rate = 3.0');
  await db.execute('DELETE FROM loan_repayments');
  await db.execute('DELETE FROM loans');
  await db.execute('DELETE FROM contributions');
  await db.execute('DELETE FROM expenses');
  await db.execute('DELETE FROM members');

  const cycleRes = await db.execute('SELECT * FROM cycles WHERE is_active = 1 LIMIT 1');
  if (cycleRes.rows.length === 0) {
    console.error('No active cycle found!');
    process.exit(1);
  }
  const cycle = cycleRes.rows[0];
  const cycleId = cycle.id;
  const startYear = cycle.start_year;
  const monthlyAmount = cycle.monthly_amount;

  console.log(`Active Cycle: ${cycle.name} (${startYear}), Base amount: ₹${monthlyAmount}/share`);

  const now = new Date().toISOString();
  let totalShares = 0;

  for (let i = 0; i < members.length; i++) {
    const m = members[i];
    const memberId = 'mem-' + (i + 1).toString().padStart(3, '0') + '-' + Math.random().toString(36).substring(2, 6);
    totalShares += m.shares;

    await db.execute({
      sql: `INSERT INTO members (id, name, phone, email, shares, joined_month_index, status, notes, created_at)
            VALUES (?, ?, '', null, ?, 0, 'ACTIVE', null, ?)`,
      args: [memberId, m.name, m.shares, now],
    });

    // Create 12 months of contributions (Month 0 to Month 11)
    // Month 0 (April) is marked PAID as per user's list with checkmarks (✅)
    for (let monthIdx = 0; monthIdx < 12; monthIdx++) {
      const year = monthIdx < 9 ? startYear : startYear + 1;
      const cid = `c-${cycleId}-${memberId}-${monthIdx}`;
      const due = m.shares * monthlyAmount;

      if (monthIdx === 0) {
        // Month 0 is April - Paid!
        const paidDate = `${startYear}-04-10`;
        await db.execute({
          sql: `INSERT INTO contributions 
                (id, cycle_id, member_id, month_index, year, amount_due, amount_paid, status, paid_date, payment_method, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'PAID', ?, 'UPI', ?)`,
          args: [cid, cycleId, memberId, monthIdx, year, due, due, paidDate, now],
        });
      } else {
        // Subsequent months are PENDING
        await db.execute({
          sql: `INSERT INTO contributions 
                (id, cycle_id, member_id, month_index, year, amount_due, amount_paid, status, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, 0, 'PENDING', ?)`,
          args: [cid, cycleId, memberId, monthIdx, year, due, now],
        });
      }
    }

    console.log(`Added #${i + 1}: ${m.name} -> ${m.shares} shares (₹${m.shares * monthlyAmount}/mo), Month 0 PAID`);
  }

  console.log(`\nSuccessfully seeded ${members.length} members with a total of ${totalShares} shares!`);
  console.log(`Total Month 0 (April) collections: ₹${totalShares * monthlyAmount}`);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
