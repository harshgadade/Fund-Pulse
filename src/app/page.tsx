'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import DashboardTab from '@/components/DashboardTab';
import MonthlyMatrixTab from '@/components/MonthlyMatrixTab';
import MembersTab from '@/components/MembersTab';
import LoansTab from '@/components/LoansTab';
import ExpensesTab from '@/components/ExpensesTab';
import SettlementTab from '@/components/SettlementTab';
import SettingsTab from '@/components/SettingsTab';

import PaymentModal from '@/components/PaymentModal';
import MemberPassbookModal from '@/components/MemberPassbookModal';
import NewMemberModal from '@/components/NewMemberModal';
import NewLoanModal from '@/components/NewLoanModal';
import LoanRepaymentModal from '@/components/LoanRepaymentModal';

import {
  FundCycle,
  Member,
  MonthInfo,
  MatrixRow,
  Contribution,
  Loan,
  FundExpense,
  SettlementRow,
  DashboardStats,
} from '@/lib/types';

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeCycle, setActiveCycle] = useState<FundCycle | null>(null);
  const [cycles, setCycles] = useState<FundCycle[]>([]);

  // Data states
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [matrixData, setMatrixData] = useState<{
    cycle: FundCycle;
    months: MonthInfo[];
    rows: MatrixRow[];
    totalsByMonth: { [month_index: number]: { due: number; collected: number; pending: number } };
    grandTotal: { due: number; collected: number; pending: number };
  } | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [expenses, setExpenses] = useState<FundExpense[]>([]);
  const [settlementData, setSettlementData] = useState<{
    cycle: FundCycle;
    totalSavingsPool: number;
    totalInterestIncome: number;
    totalOtherIncome: number;
    totalExpenses: number;
    netProfitPool: number;
    totalShares: number;
    profitPerShare: number;
    settlements: SettlementRow[];
  } | null>(null);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  // Modals state
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [addMemberType, setAddMemberType] = useState<'REGULAR' | 'EXTERNAL'>('REGULAR');
  const [isNewLoanOpen, setIsNewLoanOpen] = useState(false);
  const [loanInitialMemberId, setLoanInitialMemberId] = useState<string | undefined>(undefined);
  const [passbookMember, setPassbookMember] = useState<Member | null>(null);
  const [repayLoan, setRepayLoan] = useState<Loan | null>(null);
  const [paymentModalState, setPaymentModalState] = useState<{
    isOpen: boolean;
    member: Member | null;
    month: MonthInfo | null;
    contribution: Contribution | null;
  }>({
    isOpen: false,
    member: null,
    month: null,
    contribution: null,
  });

  // Fetch cycles
  const loadCycles = async () => {
    try {
      const res = await fetch('/api/cycles');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setCycles(data.data);
          const active = data.data.find((c: FundCycle) => c.is_active === 1) || data.data[0];
          setActiveCycle(active);
          return active?.id;
        }
      }
    } catch (err) {
      console.error('Error fetching cycles:', err);
    }
    return undefined;
  };

  // Fetch all fund data
  const loadFundData = useCallback(async (cycleId?: string) => {
    try {
      const cycleParam = cycleId ? `?cycle_id=${cycleId}` : '';

      const fetchJson = async (url: string) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return null;
          return await res.json();
        } catch (e) {
          console.error(`Error fetching ${url}:`, e);
          return null;
        }
      };

      const [statsJson, matrixJson, membersJson, loansJson, expensesJson, settleJson] =
        await Promise.all([
          fetchJson('/api/dashboard'),
          fetchJson(`/api/contributions${cycleParam}`),
          fetchJson('/api/members'),
          fetchJson(`/api/loans${cycleParam}`),
          fetchJson(`/api/expenses${cycleParam}`),
          fetchJson(`/api/settlement${cycleParam}`),
        ]);

      if (statsJson?.success) setStats(statsJson.data);
      if (matrixJson?.success) setMatrixData(matrixJson.data);
      if (membersJson?.success) setMembers(membersJson.data);
      if (loansJson?.success) setLoans(loansJson.data);
      if (expensesJson?.success) setExpenses(expensesJson.data);
      if (settleJson?.success) setSettlementData(settleJson.data);
    } catch (err) {
      console.error('Failed to load fund data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const activeId = await loadCycles();
      await loadFundData(activeId);
    };
    init();
  }, [loadFundData]);

  // Cycle Change Handler
  const handleCycleChange = async (newCycleId: string) => {
    const cycle = cycles.find((c) => c.id === newCycleId);
    if (cycle) {
      setActiveCycle(cycle);
      setIsLoading(true);
      try {
        await fetch('/api/cycles', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: newCycleId }),
        });
      } catch (e) {
        console.error('Failed to set active cycle:', e);
      }
      await loadFundData(newCycleId);
    }
  };

  // Create Cycle Handler
  const handleCreateCycle = async (data: {
    name: string;
    start_year: number;
    monthly_amount: number;
    default_interest_rate: number;
    notes?: string;
  }) => {
    const res = await fetch('/api/cycles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!resData.success) throw new Error(resData.error || 'Failed to create cycle');
    await loadCycles();
    if (resData.data?.id) {
      await handleCycleChange(resData.data.id);
    }
  };

  // Seed Demo Handler
  const handleSeedDemo = async () => {
    if (
      !confirm(
        'This will populate sample 2026-27 records with 10 members, monthly savings matrix, and active internal loans. Proceed?'
      )
    ) {
      return;
    }
    setIsSeeding(true);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Seeding failed');
      alert('Demo fund data loaded successfully!');
      const activeId = await loadCycles();
      await loadFundData(activeId);
    } catch (err) {
      alert('Error seeding demo data: ' + (err as Error).message);
    } finally {
      setIsSeeding(false);
    }
  };

  // Add Member Handler (Regular or External Borrower)
  const handleAddMember = async (memberData: {
    name: string;
    phone: string;
    email?: string;
    shares?: number;
    member_type?: 'REGULAR' | 'EXTERNAL';
    joined_month_index?: number;
    notes?: string;
  }): Promise<Member> => {
    const res = await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memberData),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to add member/borrower');
    await loadFundData(activeCycle?.id);
    return data.data as Member;
  };

  // Update Member Handler
  const handleUpdateMember = async (id: string, updateData: Partial<Member>) => {
    try {
      const res = await fetch('/api/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updateData }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to update member');
      await loadFundData(activeCycle?.id);
    } catch (err) {
      alert('Error updating member: ' + (err as Error).message);
    }
  };

  // Delete Member Handler
  const handleDeleteMember = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove member "${name}"?`)) return;
    try {
      const res = await fetch(`/api/members?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete member');
      await loadFundData(activeCycle?.id);
    } catch (err) {
      alert('Error deleting member: ' + (err as Error).message);
    }
  };

  // Issue Loan Handler
  const handleIssueLoan = async (loanData: {
    member_id: string;
    principal_amount: number;
    interest_rate_pct: number;
    disbursement_date: string;
    disbursement_method: string;
    repayment_terms?: string;
    notes?: string;
  }) => {
    const res = await fetch('/api/loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loanData),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to issue loan');
    await loadFundData(activeCycle?.id);
  };

  // Record Repayment Handler
  const handleRecordRepayment = async (repayData: {
    loan_id: string;
    payment_date: string;
    principal_paid: number;
    interest_paid: number;
    payment_method: string;
    reference_no?: string;
    notes?: string;
  }) => {
    const res = await fetch(`/api/loans/${repayData.loan_id}/repayments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(repayData),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to record repayment');
    await loadFundData(activeCycle?.id);
  };

  // Delete Repayment Handler
  const handleDeleteRepayment = async (loanId: string, repaymentId: string) => {
    const res = await fetch(`/api/loans/${loanId}/repayments?repaymentId=${repaymentId}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to delete payment entry');
    await loadFundData(activeCycle?.id);
  };

  // Delete Loan Handler
  const handleDeleteLoan = async (loanId: string) => {
    const res = await fetch(`/api/loans?loan_id=${loanId}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to delete loan');
    await loadFundData(activeCycle?.id);
  };

  // Save Contribution Payment Handler
  const handleSavePayment = async (data: {
    id: string;
    amount_paid: number;
    status: 'PAID' | 'PENDING' | 'PARTIAL' | 'EXCUSED';
    paid_date?: string;
    payment_method?: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Other';
    reference_no?: string;
    notes?: string;
  }) => {
    const res = await fetch('/api/contributions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const resJson = await res.json();
    if (!resJson.success) throw new Error(resJson.error || 'Failed to update contribution');
    await loadFundData(activeCycle?.id);
  };

  // Bulk Mark Paid Handler
  const handleBulkMarkPaid = async (monthIndex: number, memberIds: string[]) => {
    if (!activeCycle) return;
    try {
      const res = await fetch('/api/contributions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycle_id: activeCycle.id,
          month_index: monthIndex,
          member_ids: memberIds,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Bulk update failed');
      await loadFundData(activeCycle.id);
    } catch (err) {
      alert('Error updating contributions: ' + (err as Error).message);
    }
  };

  // Add Expense Handler
  const handleAddExpense = async (expData: {
    category: string;
    type: 'EXPENSE' | 'INCOME';
    amount: number;
    date: string;
    description: string;
  }) => {
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expData),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to add expense');
    await loadFundData(activeCycle?.id);
  };

  // Delete Expense Handler
  const handleDeleteExpense = async (id: string) => {
    const res = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to delete expense');
    await loadFundData(activeCycle?.id);
  };

  // Quick Pay from Dashboard / Matrix
  const handleSelectMatrixCell = (row: MatrixRow, monthIndex: number) => {
    const month = matrixData?.months.find((m) => m.month_index === monthIndex) || null;
    const contrib = row.months[monthIndex] || null;
    setPaymentModalState({
      isOpen: true,
      member: row.member,
      month,
      contribution: contrib,
    });
  };

  // Member passbook contributions helper
  const passbookContributions: Contribution[] = React.useMemo(() => {
    if (!passbookMember || !matrixData) return [];
    const row = matrixData.rows.find((r) => r.member.id === passbookMember.id);
    if (!row) return [];
    return Object.values(row.months);
  }, [passbookMember, matrixData]);

  // Loans for selected passbook member
  const passbookLoans: Loan[] = React.useMemo(() => {
    if (!passbookMember) return [];
    return loans.filter((l) => l.member_id === passbookMember.id);
  }, [passbookMember, loans]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeCycle={activeCycle}
        cycles={cycles}
        onCycleChange={handleCycleChange}
        onOpenAddMember={() => { setAddMemberType('REGULAR'); setIsAddMemberOpen(true); }}
        onOpenNewLoan={() => { setLoanInitialMemberId(undefined); setIsNewLoanOpen(true); }}
        onSeedDemo={handleSeedDemo}
        isSeeding={isSeeding}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        {isLoading && !stats ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-slate-500">Loading FundPulse manager...</p>
          </div>
        ) : !stats ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-center">
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold">!</div>
            <p className="text-sm font-medium text-slate-700">Unable to load fund data</p>
            <button
              onClick={() => {
                setIsLoading(true);
                loadFundData(activeCycle?.id);
              }}
              className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl shadow-sm hover:bg-emerald-700"
            >
              Tap to Retry
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardTab
                stats={stats}
                onNavigateToTab={(t) => setActiveTab(t)}
                onQuickPayMember={(memberId) => {
                  const row = matrixData?.rows.find((r) => r.member.id === memberId);
                  const currMonth = stats?.current_month_index ?? 0;
                  if (row) {
                    handleSelectMatrixCell(row, currMonth);
                  } else {
                    setActiveTab('matrix');
                  }
                }}
                onOpenAddMember={() => setIsAddMemberOpen(true)}
                onOpenNewLoan={() => setIsNewLoanOpen(true)}
              />
            )}

            {activeTab === 'matrix' && matrixData && (
              <MonthlyMatrixTab
                cycle={matrixData.cycle}
                months={matrixData.months}
                rows={matrixData.rows}
                totalsByMonth={matrixData.totalsByMonth}
                grandTotal={matrixData.grandTotal}
                onSelectCell={handleSelectMatrixCell}
                onBulkMarkPaid={handleBulkMarkPaid}
                onRefresh={() => loadFundData(activeCycle?.id)}
                onViewMemberPassbook={(mem) => setPassbookMember(mem)}
              />
            )}

            {activeTab === 'members' && (
              <MembersTab
                members={members}
                matrixRows={matrixData?.rows || []}
                loans={loans}
                onOpenAddMember={(type) => {
                  setAddMemberType(type || 'REGULAR');
                  setIsAddMemberOpen(true);
                }}
                onViewPassbook={(mem) => setPassbookMember(mem)}
                onDeleteMember={handleDeleteMember}
                onUpdateMember={handleUpdateMember}
                onOpenNewLoanForMember={(mem) => {
                  setLoanInitialMemberId(mem.id);
                  setIsNewLoanOpen(true);
                }}
              />
            )}

            {activeTab === 'loans' && (
              <LoansTab
                loans={loans}
                members={members}
                cycle={activeCycle}
                onOpenNewLoan={() => {
                  setLoanInitialMemberId(undefined);
                  setIsNewLoanOpen(true);
                }}
                onOpenRepayModal={(loan) => setRepayLoan(loan)}
                onDeleteRepayment={handleDeleteRepayment}
                onDeleteLoan={handleDeleteLoan}
                onRefresh={() => loadFundData(activeCycle?.id)}
              />
            )}

            {activeTab === 'expenses' && (
              <ExpensesTab
                expenses={expenses}
                cycle={activeCycle}
                onAddExpense={handleAddExpense}
                onDeleteExpense={handleDeleteExpense}
              />
            )}

            {activeTab === 'settlement' && (
              <SettlementTab
                settlementData={settlementData}
                onRefresh={() => loadFundData(activeCycle?.id)}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsTab
                cycles={cycles}
                activeCycle={activeCycle}
                onCycleChange={handleCycleChange}
                onCreateCycle={handleCreateCycle}
                onSeedDemo={handleSeedDemo}
                isSeeding={isSeeding}
                onRefresh={() => loadFundData(activeCycle?.id)}
              />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <NewMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        months={matrixData?.months || []}
        initialType={addMemberType}
        onAddMember={handleAddMember}
      />

      <NewLoanModal
        isOpen={isNewLoanOpen}
        onClose={() => {
          setIsNewLoanOpen(false);
          setLoanInitialMemberId(undefined);
        }}
        members={members.filter((m) => m.status === 'ACTIVE')}
        cycle={activeCycle}
        initialMemberId={loanInitialMemberId}
        onAddMember={handleAddMember}
        onIssueLoan={handleIssueLoan}
      />

      <LoanRepaymentModal
        isOpen={!!repayLoan}
        onClose={() => setRepayLoan(null)}
        loan={repayLoan}
        onRecordRepayment={handleRecordRepayment}
        onDeleteRepayment={handleDeleteRepayment}
        onRefresh={() => loadFundData(activeCycle?.id)}
      />

      <PaymentModal
        isOpen={paymentModalState.isOpen}
        onClose={() =>
          setPaymentModalState({ isOpen: false, member: null, month: null, contribution: null })
        }
        member={paymentModalState.member}
        month={paymentModalState.month}
        contribution={paymentModalState.contribution}
        onSave={handleSavePayment}
      />

      <MemberPassbookModal
        isOpen={!!passbookMember}
        onClose={() => setPassbookMember(null)}
        member={passbookMember}
        cycle={activeCycle}
        months={matrixData?.months || []}
        contributions={passbookContributions}
        loans={passbookLoans}
      />
    </div>
  );
}
