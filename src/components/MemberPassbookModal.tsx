'use client';

import React from 'react';
import { X, Printer, Phone, Mail, Award, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { Member, Contribution, Loan, MonthInfo, FundCycle } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/cycle-utils';

interface MemberPassbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  cycle: FundCycle | null;
  months: MonthInfo[];
  contributions: Contribution[];
  loans: Loan[];
}

export default function MemberPassbookModal({
  isOpen,
  onClose,
  member,
  cycle,
  months,
  contributions,
  loans,
}: MemberPassbookModalProps) {
  if (!isOpen || !member) return null;

  // Filter contributions for this member and sort by month_index
  const memberContribs = months.map((m) => {
    const c = contributions.find(
      (item) => item.member_id === member.id && item.month_index === m.month_index
    );
    return { month: m, contrib: c };
  });

  const totalDue = memberContribs.reduce((sum, item) => sum + (item.contrib?.amount_due || 0), 0);
  const totalPaid = memberContribs.reduce((sum, item) => sum + (item.contrib?.amount_paid || 0), 0);
  const totalPending = Math.max(0, totalDue - totalPaid);

  const memberLoans = loans.filter((l) => l.member_id === member.id);
  const totalLoanPrincipal = memberLoans.reduce((sum, l) => sum + l.principal_amount, 0);
  const totalLoanOutstanding = memberLoans.reduce(
    (sum, l) => sum + (l.status === 'ACTIVE' ? l.outstanding_principal || 0 : 0),
    0
  );
  const totalInterestPaid = memberLoans.reduce((sum, l) => sum + (l.total_interest_paid || 0), 0);
  const isExternal = member.member_type === 'EXTERNAL';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 overflow-hidden border border-slate-200">
        {/* Passbook Header */}
        <div
          className={`text-white p-6 relative ${
            isExternal
              ? 'bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950'
              : 'bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                    isExternal
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {isExternal ? 'Outside Borrower Statement' : 'Member Statement / Passbook'}
                </span>
                <span className="text-xs text-slate-300">{cycle?.name || 'FY 2026-27'}</span>
              </div>
              <h2 className="text-xl font-bold mt-1 text-white">{member.name}</h2>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 mt-2">
                {member.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {member.phone}
                  </span>
                )}
                {member.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {member.email}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded bg-white/10 text-white font-medium">
                  {isExternal ? 'Non-Fund Borrower (5% Rate)' : `${member.shares} Share(s)`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Print Member Passbook"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Financial Summary Bar */}
          {isExternal ? (
            <div className="grid grid-cols-3 gap-2 mt-5 p-3 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10 text-center">
              <div>
                <span className="text-[11px] text-slate-300 block">Total Principal Taken</span>
                <span className="text-base font-bold text-indigo-300">{formatCurrency(totalLoanPrincipal)}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-300 block">Interest Paid (5%)</span>
                <span className="text-base font-bold text-emerald-400">{formatCurrency(totalInterestPaid)}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-300 block">Outstanding Balance</span>
                <span className="text-base font-bold text-amber-300">{formatCurrency(totalLoanOutstanding)}</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 mt-5 p-3 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10 text-center">
              <div>
                <span className="text-[11px] text-slate-300 block">Total Contributed</span>
                <span className="text-base font-bold text-emerald-400">{formatCurrency(totalPaid)}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-300 block">Pending Dues</span>
                <span className={`text-base font-bold ${totalPending > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
                  {formatCurrency(totalPending)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-300 block">Active Loan Balance</span>
                <span className="text-base font-bold text-amber-300">{formatCurrency(totalLoanOutstanding)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {isExternal ? (
            <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-950 flex items-center justify-between">
              <div>
                <span className="font-bold block">Non-Fund External Borrower</span>
                <span className="text-[11px] text-purple-700">
                  Does not contribute monthly fund savings. Loans are issued at 5% monthly interest.
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-purple-200 text-purple-900 font-semibold text-[11px]">
                5% Monthly Rate
              </span>
            </div>
          ) : (
            /* Monthly Savings Timeline */
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
                <span>12-Month Savings Record (May to April)</span>
                <span className="text-xs font-normal text-slate-500">
                  ₹{cycle?.monthly_amount ? cycle.monthly_amount * member.shares : 1000}/mo
                </span>
              </h3>

            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Month</th>
                    <th className="py-2.5 px-3 text-right">Scheduled Due</th>
                    <th className="py-2.5 px-3 text-right">Paid Amount</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3">Paid Date / Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {memberContribs.map(({ month, contrib }) => {
                    const isPaid = contrib?.status === 'PAID';
                    const isPartial = contrib?.status === 'PARTIAL';
                    const isExcused = contrib?.status === 'EXCUSED';

                    return (
                      <tr key={month.month_index} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-medium text-slate-800">
                          {month.name} {month.year}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-500">
                          {formatCurrency(contrib?.amount_due || 0)}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-900">
                          {formatCurrency(contrib?.amount_paid || 0)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full font-medium text-[10px] ${
                              isPaid
                                ? 'bg-emerald-100 text-emerald-800'
                                : isPartial
                                ? 'bg-amber-100 text-amber-800'
                                : isExcused
                                ? 'bg-slate-100 text-slate-500'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {contrib?.status || 'PENDING'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-500">
                          {contrib?.paid_date ? (
                            <span>
                              {formatDate(contrib.paid_date)} via {contrib.payment_method || 'Cash'}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {/* Member Loan Ledger */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              Internal Loans & Repayments Ledger
            </h3>

            {memberLoans.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-center text-xs text-slate-400">
                No loans taken by this member in this cycle.
              </div>
            ) : (
              <div className="space-y-3">
                {memberLoans.map((loan) => (
                  <div
                    key={loan.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{loan.loan_no}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            loan.status === 'ACTIVE'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {loan.status}
                        </span>
                      </div>
                      <span className="font-semibold text-slate-600">
                        Disbursed: {formatDate(loan.disbursement_date)}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-200 text-center">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Principal</span>
                        <span className="font-bold text-slate-800">
                          {formatCurrency(loan.principal_amount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Monthly Rate</span>
                        <span className="font-bold text-slate-800">{loan.interest_rate_pct}% / mo</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Interest Paid</span>
                        <span className="font-bold text-emerald-700">
                          {formatCurrency(loan.total_interest_paid || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Outstanding</span>
                        <span className="font-bold text-rose-600">
                          {formatCurrency(loan.outstanding_principal || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Passbook Statement • FundPulse Official Records
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-colors"
          >
            Close Passbook
          </button>
        </div>
      </div>
    </div>
  );
}
