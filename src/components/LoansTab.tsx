'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  PlusCircle,
  Search,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react';
import { Loan, LoanRepayment, Member, FundCycle } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/cycle-utils';

interface LoansTabProps {
  loans: Loan[];
  members: Member[];
  cycle: FundCycle | null;
  onOpenNewLoan: () => void;
  onOpenRepayModal: (loan: Loan) => void;
  onDeleteRepayment?: (loanId: string, repaymentId: string) => Promise<void>;
  onDeleteLoan?: (loanId: string) => Promise<void>;
  onRefresh: () => void;
}

export default function LoansTab({
  loans,
  cycle,
  onOpenNewLoan,
  onOpenRepayModal,
  onDeleteRepayment,
  onDeleteLoan,
  onRefresh,
}: LoansTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CLOSED'>('ALL');
  const [borrowerTypeFilter, setBorrowerTypeFilter] = useState<'ALL' | 'REGULAR' | 'EXTERNAL'>('ALL');
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);
  const [loanRepayments, setLoanRepayments] = useState<{ [loanId: string]: LoanRepayment[] }>({});
  const [loadingRepayments, setLoadingRepayments] = useState<{ [loanId: string]: boolean }>({});

  // Summary Metrics
  const totalDisbursed = loans.reduce((acc, l) => acc + Number(l.principal_amount || 0), 0);
  const totalOutstanding = loans.reduce(
    (acc, l) => acc + Number(l.outstanding_principal ?? l.principal_amount ?? 0),
    0
  );
  const totalInterestEarned = loans.reduce(
    (acc, l) => acc + Number(l.total_interest_paid || 0),
    0
  );
  const activeLoansCount = loans.filter((l) => l.status === 'ACTIVE').length;

  const filteredLoans = loans.filter((l) => {
    const matchesSearch =
      (l.member_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.loan_no || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || l.status === statusFilter;
    const isExt = l.member_type === 'EXTERNAL';
    const matchesBorrowerType =
      borrowerTypeFilter === 'ALL' ||
      (borrowerTypeFilter === 'EXTERNAL' ? isExt : !isExt);
    return matchesSearch && matchesStatus && matchesBorrowerType;
  });

  const toggleExpandLoan = async (loanId: string) => {
    if (expandedLoanId === loanId) {
      setExpandedLoanId(null);
      return;
    }
    setExpandedLoanId(loanId);

    if (!loanRepayments[loanId]) {
      setLoadingRepayments((prev) => ({ ...prev, [loanId]: true }));
      try {
        const res = await fetch(`/api/loans/${loanId}/repayments`);
        const json = await res.json();
        if (json.success) {
          setLoanRepayments((prev) => ({ ...prev, [loanId]: json.data }));
        }
      } catch (err) {
        console.error('Failed to load repayments', err);
      } finally {
        setLoadingRepayments((prev) => ({ ...prev, [loanId]: false }));
      }
    }
  };

  const handleDeleteRepayment = async (loanId: string, rep: LoanRepayment) => {
    const confirmText = `Delete this payment entry?\n\n- Date: ${formatDate(rep.payment_date)}\n- Interest Paid: ${formatCurrency(rep.interest_paid)}\n- Principal Paid: ${formatCurrency(rep.principal_paid)}\n- Total: ${formatCurrency(rep.total_paid)}`;
    if (!window.confirm(confirmText)) return;

    try {
      if (onDeleteRepayment) {
        await onDeleteRepayment(loanId, rep.id);
      } else {
        const res = await fetch(`/api/loans/${loanId}/repayments?repaymentId=${rep.id}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to delete');
      }
      setLoanRepayments((prev) => ({
        ...prev,
        [loanId]: (prev[loanId] || []).filter((r) => r.id !== rep.id),
      }));
      onRefresh();
    } catch (err) {
      alert('Error deleting repayment: ' + (err as Error).message);
    }
  };

  const handleDeleteLoan = async (loan: Loan) => {
    if (
      !window.confirm(
        `Are you sure you want to delete Loan ${loan.loan_no} for ${loan.member_name} (${formatCurrency(
          loan.principal_amount
        )})? This will also remove all its repayment entries.`
      )
    ) {
      return;
    }
    try {
      if (onDeleteLoan) {
        await onDeleteLoan(loan.id);
      } else {
        const res = await fetch(`/api/loans?loan_id=${loan.id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to delete loan');
      }
      onRefresh();
    } catch (err) {
      alert('Error deleting loan: ' + (err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Disbursed
            </p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">
              {formatCurrency(totalDisbursed)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Across {loans.length} loans</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Principal Balance
            </p>
            <p className="text-xl font-bold text-amber-600 mt-0.5">
              {formatCurrency(totalOutstanding)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">{activeLoansCount} active loans</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Interest Earned
            </p>
            <p className="text-xl font-bold text-emerald-600 mt-0.5">
              {formatCurrency(totalInterestEarned)}
            </p>
            <p className="text-[11px] text-emerald-700 mt-0.5 font-medium">Added to dividend pool</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Default Loan Rate
            </p>
            <p className="text-xl font-bold text-indigo-700 mt-0.5">
              {cycle?.default_interest_rate ?? 3.0}% / mo
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Simple monthly interest</p>
          </div>
        </div>
      </div>

      {/* Action Bar & Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search member or loan #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(['ALL', 'ACTIVE', 'CLOSED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  statusFilter === st
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'ALL' ? 'All Loans' : st}
              </button>
            ))}
          </div>

          {/* Borrower Category Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setBorrowerTypeFilter('ALL')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                borrowerTypeFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Borrowers
            </button>
            <button
              onClick={() => setBorrowerTypeFilter('REGULAR')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                borrowerTypeFilter === 'REGULAR'
                  ? 'bg-white text-emerald-800 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Members (3%)
            </button>
            <button
              onClick={() => setBorrowerTypeFilter('EXTERNAL')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                borrowerTypeFilter === 'EXTERNAL'
                  ? 'bg-white text-purple-800 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Outside (5%)
            </button>
          </div>
        </div>

        <button
          onClick={onOpenNewLoan}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Disburse New Loan</span>
        </button>
      </div>

      {/* Loans Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-slate-900">Internal Loans Register</h3>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
              {filteredLoans.length}
            </span>
          </div>
          <span className="text-xs text-slate-500">
            Click row to view repayments history & log repayments
          </span>
        </div>

        {filteredLoans.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-slate-700">No loans found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Members can borrow funds from accumulated savings with interest. Click &quot;Disburse New Loan&quot; to issue the first loan.
            </p>
            <button
              onClick={onOpenNewLoan}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Disburse Loan
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Loan #</th>
                  <th className="py-3 px-4">Borrower</th>
                  <th className="py-3 px-4">Disbursed Date</th>
                  <th className="py-3 px-4 text-right">Principal</th>
                  <th className="py-3 px-4 text-center">Rate</th>
                  <th className="py-3 px-4 text-right">Interest Paid</th>
                  <th className="py-3 px-4 text-right">Principal Balance</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredLoans.map((loan) => {
                  const isExpanded = expandedLoanId === loan.id;
                  const balance = loan.outstanding_principal ?? loan.principal_amount;
                  const isClosed = loan.status === 'CLOSED';

                  return (
                    <React.Fragment key={loan.id}>
                      <tr
                        className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${
                          isExpanded ? 'bg-indigo-50/30' : ''
                        }`}
                        onClick={() => toggleExpandLoan(loan.id)}
                      >
                        <td className="py-3.5 px-4 font-mono font-semibold text-indigo-700 flex items-center gap-1.5">
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-indigo-500" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          {loan.loan_no}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{loan.member_name || 'Member'}</span>
                            {loan.member_type === 'EXTERNAL' ? (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700 font-semibold border border-purple-200">
                                Outside (5%)
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
                                Member
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {formatDate(loan.disbursement_date)}
                          <span className="block text-[10px] text-slate-400">
                            {loan.disbursement_method}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                          {formatCurrency(loan.principal_amount)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-700">
                            {loan.interest_rate_pct}% / mo
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">
                            {formatCurrency(Math.round((loan.principal_amount * loan.interest_rate_pct) / 100))}/mo
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-emerald-600">
                          {formatCurrency(loan.total_interest_paid || 0)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span
                            className={`font-bold ${
                              balance > 0 ? 'text-amber-600' : 'text-slate-400'
                            }`}
                          >
                            {formatCurrency(balance)}
                          </span>
                          {loan.total_principal_repaid ? (
                            <span className="block text-[10px] text-slate-400">
                              Repaid: {formatCurrency(loan.total_principal_repaid)}
                            </span>
                          ) : null}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              isClosed
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {isClosed ? (
                              <CheckCircle2 className="w-3 h-3 text-slate-500" />
                            ) : (
                              <Clock className="w-3 h-3 text-emerald-600" />
                            )}
                            {loan.status}
                          </span>
                        </td>
                        <td
                          className="py-3.5 px-4 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            {!isClosed ? (
                              <button
                                onClick={() => onOpenRepayModal(loan)}
                                className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors inline-flex items-center gap-1"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                Pay / Repay
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium">Fully Paid</span>
                            )}
                            <button
                              onClick={() => handleDeleteLoan(loan)}
                              title="Delete this loan"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Repayment History Accordion */}
                      {isExpanded && (
                        <tr className="bg-slate-50/60 border-t border-b border-indigo-100">
                          <td colSpan={9} className="p-4 sm:p-5">
                            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-indigo-600" />
                                  <h4 className="font-bold text-xs text-slate-800">
                                    Repayment History for {loan.loan_no} ({loan.member_name})
                                  </h4>
                                </div>
                                {!isClosed && (
                                  <button
                                    onClick={() => onOpenRepayModal(loan)}
                                    className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                                  >
                                    + Add Payment
                                  </button>
                                )}
                              </div>

                              {loadingRepayments[loan.id] ? (
                                <p className="text-xs text-slate-400 py-3 text-center">
                                  Loading payments...
                                </p>
                              ) : !loanRepayments[loan.id] ||
                                loanRepayments[loan.id].length === 0 ? (
                                <p className="text-xs text-slate-400 py-2 text-center italic">
                                  No repayments recorded yet.
                                </p>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-semibold">
                                      <tr>
                                        <th className="py-2 px-3">Date</th>
                                        <th className="py-2 px-3">Method / Ref</th>
                                        <th className="py-2 px-3 text-right">Interest Paid</th>
                                        <th className="py-2 px-3 text-right">Principal Paid</th>
                                        <th className="py-2 px-3 text-right">Total Paid</th>
                                        <th className="py-2 px-3">Notes</th>
                                        <th className="py-2 px-3 text-right">Action</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {loanRepayments[loan.id].map((rep) => (
                                        <tr key={rep.id} className="hover:bg-slate-50">
                                          <td className="py-2 px-3 font-medium text-slate-700">
                                            {formatDate(rep.payment_date)}
                                          </td>
                                          <td className="py-2 px-3 text-slate-500">
                                            {rep.payment_method}
                                            {rep.reference_no ? (
                                              <span className="block text-[10px] text-slate-400 font-mono">
                                                {rep.reference_no}
                                              </span>
                                            ) : null}
                                          </td>
                                          <td className="py-2 px-3 text-right font-semibold text-emerald-600">
                                            {formatCurrency(rep.interest_paid)}
                                          </td>
                                          <td className="py-2 px-3 text-right font-semibold text-indigo-600">
                                            {formatCurrency(rep.principal_paid)}
                                          </td>
                                          <td className="py-2 px-3 text-right font-bold text-slate-900">
                                            {formatCurrency(rep.total_paid)}
                                          </td>
                                          <td className="py-2 px-3 text-slate-400 text-[11px]">
                                            {rep.notes || '—'}
                                          </td>
                                          <td className="py-2 px-3 text-right">
                                            <button
                                              onClick={() => handleDeleteRepayment(loan.id, rep)}
                                              title="Delete this payment entry"
                                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors inline-flex items-center gap-1 text-[11px] font-medium"
                                            >
                                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                              <span className="text-rose-600">Delete</span>
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
