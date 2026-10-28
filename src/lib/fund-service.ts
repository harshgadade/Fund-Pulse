import { getDb, initDb } from './db';
import { InValue } from '@libsql/client';
import {
  FundCycle,
  Member,
  Contribution,
  Loan,
  LoanRepayment,
  FundExpense,
  MatrixRow,
  SettlementRow,
  DashboardStats,
} from './types';
import { getMonthInfoList, getCurrentCycleMonthIndex, MONTH_NAMES } from './cycle-utils';

export async function getActiveCycle(): Promise<FundCycle> {
  await initDb();
  const db = getDb();
  const res = await db.execute('SELECT * FROM cycles WHERE is_active = 1 LIMIT 1');
  if (res.rows.length === 0) {
    throw new Error('No active cycle found');
  }
  return res.rows[0] as unknown as FundCycle;
}

export async function getAllCycles(): Promise<FundCycle[]> {
  await initDb();
  const db = getDb();
  const res = await db.execute('SELECT * FROM cycles ORDER BY start_year DESC');
  return res.rows as unknown as FundCycle[];
}

export async function createCycle(data: {
  name: string;
  start_year: number;
  monthly_amount: number;
  default_interest_rate: number;
  notes?: string;
  set_as_active?: boolean;
}): Promise<FundCycle> {
  await initDb();
  const db = getDb();
  const id = `cycle-${data.start_year}-${(data.start_year + 1).toString().slice(2)}`;
  const now = new Date().toISOString();

  if (data.set_as_active) {
    await db.execute('UPDATE cycles SET is_active = 0');
  }

  await db.execute({
    sql: `INSERT INTO cycles (id, name, start_year, monthly_amount, default_interest_rate, is_active, notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      data.name,
      data.start_year,
      data.monthly_amount,
      data.default_interest_rate,
      data.set_as_active ? 1 : 0,
      data.notes || '',
      now,
    ],
  });

  const res = await db.execute({
    sql: 'SELECT * FROM cycles WHERE id = ?',
    args: [id],
  });
  return res.rows[0] as unknown as FundCycle;
}

export async function setActiveCycle(id: string): Promise<void> {
  await initDb();
  const db = getDb();
  await db.execute('UPDATE cycles SET is_active = 0');
  await db.execute({
    sql: 'UPDATE cycles SET is_active = 1 WHERE id = ?',
    args: [id],
  });
}

// ---------------- Members ---------------- //

export async function getMembers(filter?: { status?: string; member_type?: string }): Promise<Member[]> {
  await initDb();
  const db = getDb();
  let sql = 'SELECT * FROM members';
  const conditions: string[] = [];
  const args: InValue[] = [];
  if (filter?.status) {
    conditions.push('status = ?');
    args.push(filter.status);
  }
  if (filter?.member_type) {
    conditions.push('member_type = ?');
    args.push(filter.member_type);
  }
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY name ASC';
  const res = await db.execute({ sql, args });
  return res.rows as unknown as Member[];
}

export async function getMemberById(id: string): Promise<Member | null> {
  await initDb();
  const db = getDb();
  const res = await db.execute({
    sql: 'SELECT * FROM members WHERE id = ?',
    args: [id],
  });
  if (res.rows.length === 0) return null;
  return res.rows[0] as unknown as Member;
}

export async function createMember(data: {
  name: string;
  phone?: string;
  email?: string;
  shares?: number;
  member_type?: 'REGULAR' | 'EXTERNAL';
  joined_month_index?: number;
  notes?: string;
}): Promise<Member> {
  await initDb();
  const db = getDb();
  const id = 'mem-' + Math.random().toString(36).substring(2, 9);
  const now = new Date().toISOString();
  const member_type = data.member_type === 'EXTERNAL' ? 'EXTERNAL' : 'REGULAR';
  const isExternal = member_type === 'EXTERNAL';
  const shares = isExternal ? 0 : (data.shares && data.shares > 0 ? Number(data.shares) : 1.0);
  const joined_month = data.joined_month_index ?? 0;

  await db.execute({
    sql: `INSERT INTO members (id, name, phone, email, shares, member_type, joined_month_index, status, notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`,
    args: [
      id,
      data.name.trim(),
      data.phone?.trim() || '',
      data.email?.trim() || null,
      shares,
      member_type,
      joined_month,
      data.notes?.trim() || null,
      now,
    ],
  });

  // Only initialize monthly savings dues for regular fund members
  if (!isExternal) {
    const activeCycle = await getActiveCycle();
    const months = getMonthInfoList(activeCycle.start_year);

    for (let m = 0; m < 12; m++) {
      const cid = `c-${activeCycle.id}-${id}-${m}`;
      const year = months[m].year;
      const isExcused = m < joined_month;
      const due = isExcused ? 0 : shares * activeCycle.monthly_amount;
      const status = isExcused ? 'EXCUSED' : 'PENDING';

      await db.execute({
        sql: `INSERT OR IGNORE INTO contributions 
              (id, cycle_id, member_id, month_index, year, amount_due, amount_paid, status, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        args: [cid, activeCycle.id, id, m, year, due, status, now],
      });
    }
  }

  const res = await db.execute({
    sql: 'SELECT * FROM members WHERE id = ?',
    args: [id],
  });
  return res.rows[0] as unknown as Member;
}

export async function updateMember(
  id: string,
  data: Partial<Omit<Member, 'id' | 'created_at'>>
): Promise<Member> {
  await initDb();
  const db = getDb();
  const existing = await getMemberById(id);
  if (!existing) throw new Error('Member not found');

  const fields: string[] = [];
  const args: InValue[] = [];

  if (data.name !== undefined) {
    fields.push('name = ?');
    args.push(data.name.trim());
  }
  if (data.phone !== undefined) {
    fields.push('phone = ?');
    args.push(data.phone.trim());
  }
  if (data.email !== undefined) {
    fields.push('email = ?');
    args.push(data.email?.trim() || null);
  }
  if (data.shares !== undefined) {
    fields.push('shares = ?');
    args.push(Number(data.shares));
  }
  if (data.member_type !== undefined) {
    fields.push('member_type = ?');
    args.push(data.member_type);
  }
  if (data.status !== undefined) {
    fields.push('status = ?');
    args.push(data.status);
  }
  if (data.notes !== undefined) {
    fields.push('notes = ?');
    args.push(data.notes?.trim() || null);
  }

  if (fields.length > 0) {
    args.push(id);
    await db.execute({
      sql: `UPDATE members SET ${fields.join(', ')} WHERE id = ?`,
      args,
    });
  }

  // If shares updated, update pending contributions for active cycle
  if (data.shares !== undefined && data.shares !== existing.shares && existing.member_type !== 'EXTERNAL') {
    const activeCycle = await getActiveCycle();
    const newShare = Number(data.shares);
    const newMonthlyDue = newShare * activeCycle.monthly_amount;

    await db.execute({
      sql: `UPDATE contributions 
            SET amount_due = ? 
            WHERE cycle_id = ? AND member_id = ? AND status = 'PENDING'`,
      args: [newMonthlyDue, activeCycle.id, id],
    });
  }

  return (await getMemberById(id))!;
}

export async function deleteMember(id: string): Promise<void> {
  await initDb();
  const db = getDb();

  // Check if member has active loans
  const loansRes = await db.execute({
    sql: "SELECT COUNT(*) as count FROM loans WHERE member_id = ? AND status = 'ACTIVE'",
    args: [id],
  });
  const activeLoans = Number(loansRes.rows[0]?.count || 0);
  if (activeLoans > 0) {
    throw new Error('Cannot remove member/borrower with active unpaid loans. Please settle or delete the loan first.');
  }

  const allLoansRes = await db.execute({
    sql: 'SELECT id FROM loans WHERE member_id = ?',
    args: [id],
  });
  for (const l of allLoansRes.rows) {
    await db.execute({ sql: 'DELETE FROM loan_repayments WHERE loan_id = ?', args: [l.id] });
  }
  await db.execute({ sql: 'DELETE FROM loans WHERE member_id = ?', args: [id] });
  await db.execute({ sql: 'DELETE FROM contributions WHERE member_id = ?', args: [id] });
  await db.execute({ sql: 'DELETE FROM members WHERE id = ?', args: [id] });
}

// ---------------- Matrix & Contributions ---------------- //

export async function getMatrixData(cycleId?: string): Promise<{
  cycle: FundCycle;
  months: ReturnType<typeof getMonthInfoList>;
  rows: MatrixRow[];
  totalsByMonth: {
    [month_index: number]: {
      due: number;
      collected: number;
      pending: number;
    };
  };
  grandTotal: {
    due: number;
    collected: number;
    pending: number;
  };
}> {
  await initDb();
  const db = getDb();
  const cycle = cycleId
    ? ((await db.execute({ sql: 'SELECT * FROM cycles WHERE id = ?', args: [cycleId] })).rows[0] as unknown as FundCycle)
    : await getActiveCycle();

  const members = (await db.execute({
    sql: "SELECT * FROM members WHERE member_type != 'EXTERNAL' OR member_type IS NULL ORDER BY name ASC",
    args: [],
  })).rows as unknown as Member[];

  const months = getMonthInfoList(cycle.start_year);

  // Fetch all contributions for this cycle
  const contribRes = await db.execute({
    sql: 'SELECT * FROM contributions WHERE cycle_id = ?',
    args: [cycle.id],
  });
  const contribRows = contribRes.rows as unknown as Contribution[];

  // Map by member_id + month_index
  const contribMap = new Map<string, Contribution>();
  contribRows.forEach((c) => {
    contribMap.set(`${c.member_id}-${c.month_index}`, c);
  });

  const now = new Date().toISOString();
  const rows: MatrixRow[] = [];

  const totalsByMonth: { [month_index: number]: { due: number; collected: number; pending: number } } = {};
  for (let m = 0; m < 12; m++) {
    totalsByMonth[m] = { due: 0, collected: 0, pending: 0 };
  }

  let grandDue = 0;
  let grandCollected = 0;

  for (const member of members) {
    const monthDict: { [month_index: number]: Contribution } = {};
    let memberDue = 0;
    let memberPaid = 0;

    for (let m = 0; m < 12; m++) {
      let c = contribMap.get(`${member.id}-${m}`);

      if (!c) {
        // Auto-create missing contribution record
        const cid = `c-${cycle.id}-${member.id}-${m}`;
        const year = months[m].year;
        const isExcused = m < member.joined_month_index;
        const due = isExcused ? 0 : member.shares * cycle.monthly_amount;
        const status = isExcused ? 'EXCUSED' : 'PENDING';

        await db.execute({
          sql: `INSERT OR IGNORE INTO contributions 
                (id, cycle_id, member_id, month_index, year, amount_due, amount_paid, status, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
          args: [cid, cycle.id, member.id, m, year, due, status, now],
        });

        c = {
          id: cid,
          cycle_id: cycle.id,
          member_id: member.id,
          month_index: m,
          year,
          amount_due: due,
          amount_paid: 0,
          status,
          updated_at: now,
        };
      }

      monthDict[m] = c;
      memberDue += c.amount_due;
      memberPaid += c.amount_paid;

      totalsByMonth[m].due += c.amount_due;
      totalsByMonth[m].collected += c.amount_paid;
      totalsByMonth[m].pending += Math.max(0, c.amount_due - c.amount_paid);
    }

    grandDue += memberDue;
    grandCollected += memberPaid;

    rows.push({
      member,
      months: monthDict,
      total_due: memberDue,
      total_paid: memberPaid,
      pending_amount: Math.max(0, memberDue - memberPaid),
      all_paid: memberPaid >= memberDue && memberDue > 0,
    });
  }

  return {
    cycle,
    months,
    rows,
    totalsByMonth,
    grandTotal: {
      due: grandDue,
      collected: grandCollected,
      pending: Math.max(0, grandDue - grandCollected),
    },
  };
}

export async function updateContribution(data: {
  id: string;
  amount_paid: number;
  status: 'PAID' | 'PENDING' | 'PARTIAL' | 'EXCUSED';
  paid_date?: string;
  payment_method?: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Other';
  reference_no?: string;
  notes?: string;
}): Promise<Contribution> {
  await initDb();
  const db = getDb();
  const now = new Date().toISOString();

  await db.execute({
    sql: `UPDATE contributions 
          SET amount_paid = ?, status = ?, paid_date = ?, payment_method = ?, reference_no = ?, notes = ?, updated_at = ?
          WHERE id = ?`,
    args: [
      data.amount_paid,
      data.status,
      data.paid_date || null,
      data.payment_method || 'Cash',
      data.reference_no || null,
      data.notes || null,
      now,
      data.id,
    ],
  });

  const res = await db.execute({
    sql: 'SELECT * FROM contributions WHERE id = ?',
    args: [data.id],
  });
  return res.rows[0] as unknown as Contribution;
}

export async function bulkMarkPaid(data: {
  cycle_id: string;
  month_index: number;
  member_ids: string[];
  paid_date?: string;
  payment_method?: 'Cash' | 'UPI' | 'Bank Transfer';
}): Promise<void> {
  await initDb();
  const db = getDb();
  const date = data.paid_date || new Date().toISOString().split('T')[0];
  const method = data.payment_method || 'Cash';
  const now = new Date().toISOString();

  for (const memberId of data.member_ids) {
    await db.execute({
      sql: `UPDATE contributions 
            SET amount_paid = amount_due, status = 'PAID', paid_date = ?, payment_method = ?, updated_at = ?
            WHERE cycle_id = ? AND member_id = ? AND month_index = ? AND status != 'EXCUSED'`,
      args: [date, method, now, data.cycle_id, memberId, data.month_index],
    });
  }
}

// ---------------- Loans & Repayments ---------------- //

export async function getLoans(cycleId?: string): Promise<Loan[]> {
  await initDb();
  const db = getDb();
  const cycle = cycleId ? { id: cycleId } : await getActiveCycle();

  const loansRes = await db.execute({
    sql: `SELECT l.*, m.name as member_name, m.member_type
          FROM loans l
          JOIN members m ON l.member_id = m.id
          WHERE l.cycle_id = ?
          ORDER BY l.disbursement_date DESC`,
    args: [cycle.id],
  });
  const loans = loansRes.rows as unknown as Loan[];

  // Compute repayments
  for (const loan of loans) {
    const repRes = await db.execute({
      sql: `SELECT 
              COALESCE(SUM(principal_paid), 0) as total_principal,
              COALESCE(SUM(interest_paid), 0) as total_interest
            FROM loan_repayments
            WHERE loan_id = ?`,
      args: [loan.id],
    });
    const totalPrincipal = Number(repRes.rows[0]?.total_principal || 0);
    const totalInterest = Number(repRes.rows[0]?.total_interest || 0);

    loan.total_principal_repaid = totalPrincipal;
    loan.total_interest_paid = totalInterest;
    loan.outstanding_principal = Math.max(0, loan.principal_amount - totalPrincipal);
  }

  return loans;
}

export async function createLoan(data: {
  cycle_id?: string;
  member_id: string;
  principal_amount: number;
  interest_rate_pct?: number;
  disbursement_date: string;
  disbursement_method?: string;
  repayment_terms?: string;
  notes?: string;
}): Promise<Loan> {
  await initDb();
  const db = getDb();
  const cycle = data.cycle_id ? { id: data.cycle_id, default_interest_rate: 3.0 } : await getActiveCycle();
  const id = 'loan-' + Math.random().toString(36).substring(2, 9);
  const now = new Date().toISOString();

  // Generate loan number like LN-101
  const countRes = await db.execute('SELECT COUNT(*) as count FROM loans');
  const count = Number(countRes.rows[0]?.count || 0) + 1;
  const loanNo = `LN-${100 + count}`;

  let rate: number;
  if (data.interest_rate_pct !== undefined && !isNaN(Number(data.interest_rate_pct))) {
    rate = Number(data.interest_rate_pct);
  } else {
    const memRes = await db.execute({
      sql: 'SELECT member_type FROM members WHERE id = ?',
      args: [data.member_id],
    });
    const isExt = memRes.rows[0]?.member_type === 'EXTERNAL';
    rate = isExt ? 5.0 : cycle.default_interest_rate;
  }

  await db.execute({
    sql: `INSERT INTO loans 
          (id, cycle_id, member_id, loan_no, principal_amount, interest_rate_pct, disbursement_date, disbursement_method, repayment_terms, status, notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`,
    args: [
      id,
      cycle.id,
      data.member_id,
      loanNo,
      Number(data.principal_amount),
      rate,
      data.disbursement_date,
      data.disbursement_method || 'Cash',
      data.repayment_terms || 'Monthly interest with principal settlement',
      data.notes || null,
      now,
    ],
  });

  const res = await db.execute({
    sql: `SELECT l.*, m.name as member_name, m.member_type
          FROM loans l
          JOIN members m ON l.member_id = m.id
          WHERE l.id = ?`,
    args: [id],
  });

  const created = res.rows[0] as unknown as Loan;
  created.total_principal_repaid = 0;
  created.total_interest_paid = 0;
  created.outstanding_principal = created.principal_amount;
  return created;
}

export async function getLoanRepayments(loanId: string): Promise<LoanRepayment[]> {
  await initDb();
  const db = getDb();
  const res = await db.execute({
    sql: 'SELECT * FROM loan_repayments WHERE loan_id = ? ORDER BY payment_date DESC',
    args: [loanId],
  });
  return res.rows as unknown as LoanRepayment[];
}

export async function recordLoanRepayment(data: {
  loan_id: string;
  payment_date: string;
  principal_paid: number;
  interest_paid: number;
  payment_method?: string;
  reference_no?: string;
  notes?: string;
}): Promise<LoanRepayment> {
  await initDb();
  const db = getDb();
  const id = 'rep-' + Math.random().toString(36).substring(2, 9);
  const now = new Date().toISOString();
  const principal = Number(data.principal_paid) || 0;
  const interest = Number(data.interest_paid) || 0;
  const total = principal + interest;

  await db.execute({
    sql: `INSERT INTO loan_repayments
          (id, loan_id, payment_date, principal_paid, interest_paid, total_paid, payment_method, reference_no, notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      data.loan_id,
      data.payment_date,
      principal,
      interest,
      total,
      data.payment_method || 'Cash',
      data.reference_no || null,
      data.notes || null,
      now,
    ],
  });

  // Check if principal is fully settled
  const loanRes = await db.execute({
    sql: 'SELECT * FROM loans WHERE id = ?',
    args: [data.loan_id],
  });
  const loan = loanRes.rows[0] as unknown as Loan;

  const repRes = await db.execute({
    sql: 'SELECT COALESCE(SUM(principal_paid), 0) as total_principal FROM loan_repayments WHERE loan_id = ?',
    args: [data.loan_id],
  });
  const totalPrincipalRepaid = Number(repRes.rows[0]?.total_principal || 0);

  if (totalPrincipalRepaid >= loan.principal_amount) {
    await db.execute({
      sql: "UPDATE loans SET status = 'CLOSED' WHERE id = ?",
      args: [data.loan_id],
    });
  }

  const res = await db.execute({
    sql: 'SELECT * FROM loan_repayments WHERE id = ?',
    args: [id],
  });
  return res.rows[0] as unknown as LoanRepayment;
}

export async function deleteLoanRepayment(repaymentId: string): Promise<{ success: boolean; loanId: string }> {
  await initDb();
  const db = getDb();

  const repRes = await db.execute({
    sql: 'SELECT * FROM loan_repayments WHERE id = ?',
    args: [repaymentId],
  });
  if (repRes.rows.length === 0) {
    throw new Error('Repayment entry not found');
  }
  const repayment = repRes.rows[0] as unknown as LoanRepayment;
  const loanId = repayment.loan_id;

  await db.execute({
    sql: 'DELETE FROM loan_repayments WHERE id = ?',
    args: [repaymentId],
  });

  // Re-check principal settlement; if loan was marked CLOSED but is no longer fully repaid, reopen it
  const loanRes = await db.execute({
    sql: 'SELECT * FROM loans WHERE id = ?',
    args: [loanId],
  });
  if (loanRes.rows.length > 0) {
    const loan = loanRes.rows[0] as unknown as Loan;
    const totalsRes = await db.execute({
      sql: 'SELECT COALESCE(SUM(principal_paid), 0) as total_principal FROM loan_repayments WHERE loan_id = ?',
      args: [loanId],
    });
    const totalPrincipalRepaid = Number(totalsRes.rows[0]?.total_principal || 0);

    if (totalPrincipalRepaid < loan.principal_amount && loan.status === 'CLOSED') {
      await db.execute({
        sql: "UPDATE loans SET status = 'ACTIVE' WHERE id = ?",
        args: [loanId],
      });
    }
  }

  return { success: true, loanId };
}

export async function deleteLoan(loanId: string): Promise<void> {
  await initDb();
  const db = getDb();
  await db.execute({
    sql: 'DELETE FROM loan_repayments WHERE loan_id = ?',
    args: [loanId],
  });
  await db.execute({
    sql: 'DELETE FROM loans WHERE id = ?',
    args: [loanId],
  });
}

// ---------------- Expenses & Other Income ---------------- //

export async function getExpenses(cycleId?: string): Promise<FundExpense[]> {
  await initDb();
  const db = getDb();
  const cycle = cycleId ? { id: cycleId } : await getActiveCycle();
  const res = await db.execute({
    sql: 'SELECT * FROM expenses WHERE cycle_id = ? ORDER BY date DESC',
    args: [cycle.id],
  });
  return res.rows as unknown as FundExpense[];
}

export async function createExpense(data: {
  cycle_id?: string;
  category: string;
  type: 'EXPENSE' | 'INCOME';
  amount: number;
  date: string;
  description: string;
}): Promise<FundExpense> {
  await initDb();
  const db = getDb();
  const cycle = data.cycle_id ? { id: data.cycle_id } : await getActiveCycle();
  const id = 'exp-' + Math.random().toString(36).substring(2, 9);
  const now = new Date().toISOString();

  await db.execute({
    sql: `INSERT INTO expenses (id, cycle_id, category, type, amount, date, description, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      cycle.id,
      data.category,
      data.type,
      Number(data.amount),
      data.date,
      data.description.trim(),
      now,
    ],
  });

  const res = await db.execute({
    sql: 'SELECT * FROM expenses WHERE id = ?',
    args: [id],
  });
  return res.rows[0] as unknown as FundExpense;
}

export async function deleteExpense(id: string): Promise<void> {
  await initDb();
  const db = getDb();
  await db.execute({ sql: 'DELETE FROM expenses WHERE id = ?', args: [id] });
}

// ---------------- Year-End Settlement & Dividend ---------------- //

export async function getSettlement(cycleId?: string): Promise<{
  cycle: FundCycle;
  totalSavingsPool: number;
  totalInterestIncome: number;
  totalOtherIncome: number;
  totalExpenses: number;
  netProfitPool: number;
  totalShares: number;
  profitPerShare: number;
  settlements: SettlementRow[];
}> {
  await initDb();
  const db = getDb();
  const cycle = cycleId
    ? ((await db.execute({ sql: 'SELECT * FROM cycles WHERE id = ?', args: [cycleId] })).rows[0] as unknown as FundCycle)
    : await getActiveCycle();

  const members = (await db.execute({
    sql: "SELECT * FROM members WHERE status = 'ACTIVE' AND (member_type != 'EXTERNAL' OR member_type IS NULL) ORDER BY name ASC",
    args: [],
  })).rows as unknown as Member[];

  // Total savings paid by everyone
  const savingsRes = await db.execute({
    sql: `SELECT member_id, COALESCE(SUM(amount_paid), 0) as total_savings
          FROM contributions
          WHERE cycle_id = ?
          GROUP BY member_id`,
    args: [cycle.id],
  });
  const memberSavingsMap = new Map<string, number>();
  let totalSavingsPool = 0;
  for (const row of savingsRes.rows) {
    const s = Number(row.total_savings || 0);
    memberSavingsMap.set(String(row.member_id), s);
    totalSavingsPool += s;
  }

  // Interest earned from loans
  const loanIntRes = await db.execute({
    sql: `SELECT COALESCE(SUM(r.interest_paid), 0) as total_interest
          FROM loan_repayments r
          JOIN loans l ON r.loan_id = l.id
          WHERE l.cycle_id = ?`,
    args: [cycle.id],
  });
  const totalInterestIncome = Number(loanIntRes.rows[0]?.total_interest || 0);

  // Other Income & Expenses
  const expRes = await db.execute({
    sql: `SELECT 
            COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as income,
            COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as expense
          FROM expenses
          WHERE cycle_id = ?`,
    args: [cycle.id],
  });
  const totalOtherIncome = Number(expRes.rows[0]?.income || 0);
  const totalExpenses = Number(expRes.rows[0]?.expense || 0);

  // Net Profit Pool
  const netProfitPool = Math.max(0, totalInterestIncome + totalOtherIncome - totalExpenses);

  // Total shares
  const totalShares = members.reduce((sum, m) => sum + (m.shares || 1), 0);
  const profitPerShare = totalShares > 0 ? netProfitPool / totalShares : 0;

  // Active loans per member
  const allLoans = await getLoans(cycle.id);
  const memberLoanMap = new Map<string, number>();
  for (const l of allLoans) {
    if (l.status === 'ACTIVE' && (l.outstanding_principal || 0) > 0) {
      const current = memberLoanMap.get(l.member_id) || 0;
      memberLoanMap.set(l.member_id, current + (l.outstanding_principal || 0));
    }
  }

  const settlements: SettlementRow[] = members.map((member) => {
    const totalSavingsPaid = memberSavingsMap.get(member.id) || 0;
    const dividendShare = Math.round((member.shares || 1) * profitPerShare);
    const outstandingPrincipal = memberLoanMap.get(member.id) || 0;
    const totalDeductions = outstandingPrincipal;
    const netPayout = Math.max(0, totalSavingsPaid + dividendShare - totalDeductions);

    return {
      member,
      total_savings_paid: totalSavingsPaid,
      shares: member.shares || 1,
      dividend_share: dividendShare,
      outstanding_loan_principal: outstandingPrincipal,
      outstanding_loan_interest: 0,
      total_deductions: totalDeductions,
      net_payout: netPayout,
    };
  });

  return {
    cycle,
    totalSavingsPool,
    totalInterestIncome,
    totalOtherIncome,
    totalExpenses,
    netProfitPool,
    totalShares,
    profitPerShare,
    settlements,
  };
}

// ---------------- Dashboard Stats ---------------- //

export async function getDashboardStats(): Promise<DashboardStats> {
  await initDb();
  const db = getDb();
  const activeCycle = await getActiveCycle();

  const membersRes = await db.execute("SELECT * FROM members WHERE status = 'ACTIVE' AND (member_type != 'EXTERNAL' OR member_type IS NULL)");
  const members = membersRes.rows as unknown as Member[];
  const totalMembers = members.length;
  const totalShares = members.reduce((acc, m) => acc + (m.shares || 0), 0);

  const extRes = await db.execute("SELECT COUNT(*) as count FROM members WHERE status = 'ACTIVE' AND member_type = 'EXTERNAL'");
  const totalExternalBorrowers = Number(extRes.rows[0]?.count || 0);

  // Savings
  const contribRes = await db.execute({
    sql: `SELECT 
            COALESCE(SUM(amount_due), 0) as total_due,
            COALESCE(SUM(amount_paid), 0) as total_paid
          FROM contributions
          WHERE cycle_id = ?`,
    args: [activeCycle.id],
  });
  const totalSavingsDue = Number(contribRes.rows[0]?.total_due || 0);
  const totalSavingsCollected = Number(contribRes.rows[0]?.total_paid || 0);
  const savingsCollectionRate =
    totalSavingsDue > 0 ? Math.round((totalSavingsCollected / totalSavingsDue) * 100) : 0;

  // Loans
  const loans = await getLoans(activeCycle.id);
  const totalLoansDisbursed = loans.reduce((acc, l) => acc + l.principal_amount, 0);
  const totalLoanPrincipalOutstanding = loans
    .filter((l) => l.status === 'ACTIVE')
    .reduce((acc, l) => acc + (l.outstanding_principal || 0), 0);
  const totalLoanInterestEarned = loans.reduce((acc, l) => acc + (l.total_interest_paid || 0), 0);

  // Expenses & Other Income
  const expRes = await db.execute({
    sql: `SELECT 
            COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as income,
            COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as expense
          FROM expenses
          WHERE cycle_id = ?`,
    args: [activeCycle.id],
  });
  const totalOtherIncome = Number(expRes.rows[0]?.income || 0);
  const totalExpenses = Number(expRes.rows[0]?.expense || 0);

  // Net Cash Balance:
  // (Total Savings Collected + Total Loan Principal Repaid + Total Loan Interest Earned + Other Income)
  // - (Total Loans Disbursed + Expenses)
  const totalLoanPrincipalRepaid = loans.reduce((acc, l) => acc + (l.total_principal_repaid || 0), 0);
  const cashIn =
    totalSavingsCollected + totalLoanPrincipalRepaid + totalLoanInterestEarned + totalOtherIncome;
  const cashOut = totalLoansDisbursed + totalExpenses;
  const netCashBalance = cashIn - cashOut;

  // Current month tracking
  const currentMonthIndex = getCurrentCycleMonthIndex(activeCycle.start_year);
  const currentMonthName = MONTH_NAMES[currentMonthIndex];

  const currentMonthRes = await db.execute({
    sql: `SELECT 
            COALESCE(SUM(amount_due), 0) as m_due,
            COALESCE(SUM(amount_paid), 0) as m_paid
          FROM contributions
          WHERE cycle_id = ? AND month_index = ?`,
    args: [activeCycle.id, currentMonthIndex],
  });
  const currentMonthDue = Number(currentMonthRes.rows[0]?.m_due || 0);
  const currentMonthCollected = Number(currentMonthRes.rows[0]?.m_paid || 0);

  // Recent activities
  const recentActivities: DashboardStats['recent_activities'] = [];

  // Recent contributions
  const recentContribs = await db.execute({
    sql: `SELECT c.*, m.name as member_name
          FROM contributions c
          JOIN members m ON c.member_id = m.id
          WHERE c.cycle_id = ? AND c.status = 'PAID' AND c.paid_date IS NOT NULL
          ORDER BY c.updated_at DESC LIMIT 4`,
    args: [activeCycle.id],
  });
  for (const c of recentContribs.rows) {
    recentActivities.push({
      id: String(c.id),
      type: 'CONTRIBUTION',
      title: `${c.member_name} paid savings`,
      description: `${MONTH_NAMES[Number(c.month_index)]} contribution via ${c.payment_method || 'Cash'}`,
      amount: Number(c.amount_paid),
      date: String(c.paid_date || c.updated_at),
    });
  }

  // Recent loans
  const recentLoans = await db.execute({
    sql: `SELECT l.*, m.name as member_name
          FROM loans l
          JOIN members m ON l.member_id = m.id
          WHERE l.cycle_id = ?
          ORDER BY l.created_at DESC LIMIT 3`,
    args: [activeCycle.id],
  });
  for (const l of recentLoans.rows) {
    recentActivities.push({
      id: String(l.id),
      type: 'LOAN_DISBURSED',
      title: `Loan disbursed to ${l.member_name}`,
      description: `Loan ${l.loan_no} @ ${l.interest_rate_pct}% interest/mo`,
      amount: Number(l.principal_amount),
      date: String(l.disbursement_date),
    });
  }

  // Sort activities by date desc
  recentActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    active_cycle: activeCycle,
    total_members: totalMembers,
    total_external_borrowers: totalExternalBorrowers,
    total_shares: totalShares,
    total_savings_collected: totalSavingsCollected,
    total_savings_due: totalSavingsDue,
    savings_collection_rate: savingsCollectionRate,
    total_loans_disbursed: totalLoansDisbursed,
    total_loan_principal_outstanding: totalLoanPrincipalOutstanding,
    total_loan_interest_earned: totalLoanInterestEarned,
    total_other_income: totalOtherIncome,
    total_expenses: totalExpenses,
    net_cash_balance: netCashBalance,
    current_month_index: currentMonthIndex,
    current_month_name: currentMonthName,
    current_month_due: currentMonthDue,
    current_month_collected: currentMonthCollected,
    recent_activities: recentActivities.slice(0, 6),
  };
}

// ---------------- Sample Data Seeder ---------------- //

export async function seedSampleData(): Promise<void> {
  await initDb();
  const db = getDb();
  const cycle = await getActiveCycle();

  // Clear existing data for a fresh start
  await db.execute('DELETE FROM loan_repayments');
  await db.execute('DELETE FROM loans');
  await db.execute('DELETE FROM contributions');
  await db.execute('DELETE FROM expenses');
  await db.execute('DELETE FROM members');

  const sampleMembers = [
    { name: 'Jyoti', phone: '', shares: 4 },
    { name: 'Ravi', phone: '', shares: 2 },
    { name: 'Sughanda', phone: '', shares: 5 },
    { name: 'Shila Devkate', phone: '', shares: 5 },
    { name: 'Harsh', phone: '', shares: 10 },
    { name: 'Sunita', phone: '', shares: 2 },
    { name: 'Ghodke', phone: '', shares: 5 },
    { name: 'Sharma', phone: '', shares: 5 },
    { name: 'Chavan D2', phone: '', shares: 2 },
    { name: 'Dilip', phone: '', shares: 2 },
    { name: 'Manisha', phone: '', shares: 4 },
    { name: 'Manisha Pawar', phone: '', shares: 4 },
    { name: 'Trilochan', phone: '', shares: 2 },
    { name: 'Maruti', phone: '', shares: 1 },
    { name: 'Amrpali', phone: '', shares: 5 },
    { name: 'Sanjay Shelar', phone: '', shares: 7 },
    { name: 'Dighe', phone: '', shares: 3 },
    { name: 'Rohini Kambale', phone: '', shares: 5 },
    { name: 'Sudharshani', phone: '', shares: 2 },
  ];

  const createdMembers: Member[] = [];
  for (const m of sampleMembers) {
    const mem = await createMember(m);
    createdMembers.push(mem);
  }

  // Month 0 (April 2026) initial contributions paid by all members (indicated by ✅)
  for (const mem of createdMembers) {
    const due = mem.shares * cycle.monthly_amount;
    const paidDate = `${cycle.start_year}-04-10`;

    await db.execute({
      sql: `UPDATE contributions
            SET amount_paid = ?, status = 'PAID', paid_date = ?, payment_method = 'UPI'
            WHERE cycle_id = ? AND member_id = ? AND month_index = 0`,
      args: [due, paidDate, cycle.id, mem.id],
    });
  }
}

// ---------------- Full Data Export / Import ---------------- //

export async function exportAllData(): Promise<Record<string, unknown>> {
  await initDb();
  const db = getDb();
  const tables = ['cycles', 'members', 'contributions', 'loans', 'loan_repayments', 'expenses'];
  const data: Record<string, unknown[]> = {};

  for (const table of tables) {
    const res = await db.execute(`SELECT * FROM ${table}`);
    data[table] = res.rows;
  }

  return {
    version: '1.0',
    exported_at: new Date().toISOString(),
    data,
  };
}

export async function importAllData(payload: {
  data: Record<string, Record<string, unknown>[]>;
}): Promise<void> {
  await initDb();
  const db = getDb();

  const tables = ['loan_repayments', 'loans', 'contributions', 'expenses', 'members', 'cycles'];
  for (const t of tables) {
    await db.execute(`DELETE FROM ${t}`);
  }

  const importOrder = ['cycles', 'members', 'contributions', 'loans', 'loan_repayments', 'expenses'];

  for (const table of importOrder) {
    const rows = payload.data[table];
    if (!rows || !Array.isArray(rows)) continue;

    for (const row of rows) {
      const keys = Object.keys(row);
      const placeholders = keys.map(() => '?').join(', ');
      const values = keys.map((k) => row[k]);

      await db.execute({
        sql: `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
        args: values as InValue[],
      });
    }
  }
}
