export interface FundCycle {
  id: string;
  name: string; // e.g. "FY 2026-2027"
  start_year: number; // e.g. 2026
  monthly_amount: number; // default contribution per share e.g. 1000
  default_interest_rate: number; // default monthly loan interest % e.g. 3.0
  is_active: number; // 1 or 0
  notes?: string;
  created_at: string;
}

export interface Member {
  id: string;
  name: string;
  phone: string;
  email?: string;
  shares: number; // number of shares (default 1 for regular, 0 for external)
  member_type?: 'REGULAR' | 'EXTERNAL'; // REGULAR = fund member, EXTERNAL = outside loan borrower
  joined_month_index: number; // 0 for May, 1 for June, etc.
  status: 'ACTIVE' | 'INACTIVE';
  notes?: string;
  created_at: string;
}

export interface Contribution {
  id: string;
  cycle_id: string;
  member_id: string;
  month_index: number; // 0=May, 1=Jun, ..., 11=Apr
  year: number; // 2026 or 2027
  amount_due: number;
  amount_paid: number;
  status: 'PAID' | 'PENDING' | 'PARTIAL' | 'EXCUSED';
  paid_date?: string;
  payment_method?: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Other';
  reference_no?: string;
  notes?: string;
  updated_at: string;
}

export interface Loan {
  id: string;
  cycle_id: string;
  member_id: string;
  loan_no: string;
  principal_amount: number;
  interest_rate_pct: number; // monthly percentage e.g. 3.0%
  disbursement_date: string;
  disbursement_method: string;
  repayment_terms?: string;
  status: 'ACTIVE' | 'CLOSED' | 'DEFAULTED';
  notes?: string;
  created_at: string;
  // Computed fields
  member_name?: string;
  member_type?: 'REGULAR' | 'EXTERNAL';
  total_principal_repaid?: number;
  total_interest_paid?: number;
  outstanding_principal?: number;
}

export interface LoanRepayment {
  id: string;
  loan_id: string;
  payment_date: string;
  principal_paid: number;
  interest_paid: number;
  total_paid: number;
  payment_method: string;
  reference_no?: string;
  notes?: string;
  created_at: string;
}

export interface FundExpense {
  id: string;
  cycle_id: string;
  category: string;
  type: 'EXPENSE' | 'INCOME';
  amount: number;
  date: string;
  description: string;
  created_at: string;
}

export interface MonthInfo {
  month_index: number; // 0 to 11
  name: string; // "May", "June", ...
  short_name: string; // "May", "Jun", ...
  year: number;
  calendar_month: number; // 1 to 12 (5 for May, ..., 4 for April)
}

export interface MatrixRow {
  member: Member;
  months: {
    [month_index: number]: Contribution;
  };
  total_due: number;
  total_paid: number;
  pending_amount: number;
  all_paid: boolean;
}

export interface SettlementRow {
  member: Member;
  total_savings_paid: number;
  shares: number;
  dividend_share: number;
  outstanding_loan_principal: number;
  outstanding_loan_interest: number;
  total_deductions: number;
  net_payout: number;
}

export interface DashboardStats {
  active_cycle: FundCycle | null;
  total_members: number;
  total_external_borrowers?: number;
  total_shares: number;
  total_savings_collected: number;
  total_savings_due: number;
  savings_collection_rate: number;
  total_loans_disbursed: number;
  total_loan_principal_outstanding: number;
  total_loan_interest_earned: number;
  total_other_income: number;
  total_expenses: number;
  net_cash_balance: number;
  current_month_index: number;
  current_month_name: string;
  current_month_due: number;
  current_month_collected: number;
  recent_activities: Array<{
    id: string;
    type: 'CONTRIBUTION' | 'LOAN_DISBURSED' | 'LOAN_REPAID' | 'EXPENSE';
    title: string;
    description: string;
    amount: number;
    date: string;
  }>;
}
