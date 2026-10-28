'use client';

import React from 'react';
import {
  Award,
  DollarSign,
  TrendingUp,
  Printer,
  Receipt,
  PiggyBank,
  Users,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import { SettlementRow, FundCycle } from '@/lib/types';
import { formatCurrency } from '@/lib/cycle-utils';

interface SettlementTabProps {
  settlementData: {
    cycle: FundCycle;
    totalSavingsPool: number;
    totalInterestIncome: number;
    totalOtherIncome: number;
    totalExpenses: number;
    netProfitPool: number;
    totalShares: number;
    profitPerShare: number;
    settlements: SettlementRow[];
  } | null;
  onRefresh: () => void;
}

export default function SettlementTab({ settlementData }: SettlementTabProps) {
  if (!settlementData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Calculating year-end settlement...</p>
        </div>
      </div>
    );
  }

  const {
    cycle,
    totalSavingsPool,
    totalInterestIncome,
    totalOtherIncome,
    totalExpenses,
    netProfitPool,
    totalShares,
    profitPerShare,
    settlements,
  } = settlementData;

  const totalPayoutAllMembers = settlements.reduce((acc, s) => acc + s.net_payout, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-emerald-950 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 text-amber-200 text-xs font-semibold backdrop-blur-xs">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              12-Month May-April Payout Dividend Ledger
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Year-End Payout & Profit Distribution ({cycle.start_year}–{cycle.start_year + 1})
            </h2>
            <p className="text-xs text-amber-100/90 max-w-2xl">
              At the conclusion of the 12th month (April), all member savings are returned along with equal shares of interest earned and fund profits, deducting any outstanding loan dues.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-900 bg-white hover:bg-amber-50 rounded-xl shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4 text-slate-700" />
              <span>Print Settlement Sheet</span>
            </button>
          </div>
        </div>
      </div>

      {/* Financial Formula & Pool Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Savings Pool */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Savings Pool
            </span>
            <PiggyBank className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{formatCurrency(totalSavingsPool)}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Principal deposited by {settlements.length} members
          </p>
        </div>

        {/* Net Interest & Profit */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Distributable Profit
            </span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600">{formatCurrency(netProfitPool)}</p>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 flex-wrap">
            <span>Interest: {formatCurrency(totalInterestIncome)}</span>
            {totalExpenses > 0 && <span>• Exp: -{formatCurrency(totalExpenses)}</span>}
          </div>
        </div>

        {/* Total Shares */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Fund Shares
            </span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{totalShares}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Across {settlements.length} active participating members
          </p>
        </div>

        {/* Dividend Per Share */}
        <div className="bg-gradient-to-br from-indigo-50 to-emerald-50 rounded-2xl p-5 border border-indigo-200/80 shadow-xs">
          <div className="flex items-center justify-between text-indigo-900 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              Dividend / Share
            </span>
            <Award className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-indigo-700">
            {formatCurrency(profitPerShare)}
          </p>
          <p className="text-[11px] text-indigo-900/80 mt-1 font-medium">
            Profit earned per unit share
          </p>
        </div>
      </div>

      {/* Explanatory Banner */}
      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/80 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 space-y-1">
          <p className="font-bold">How Year-End Settlement Works:</p>
          <p className="text-amber-800">
            <strong>Net Member Payout</strong> = (Member Savings Deposited) + (Shares held × Dividend per share) − (Unpaid Loan Principal & Interest). If a member has an active loan, the remaining debt is automatically netted off from their payout.
          </p>
        </div>
      </div>

      {/* Member Payout Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-slate-900">Member Payout Breakdown</h3>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
              {settlements.length} Members
            </span>
          </div>
          <div className="text-xs font-semibold text-slate-700">
            Total Fund Disbursal: <span className="font-bold text-emerald-600">{formatCurrency(totalPayoutAllMembers)}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4 text-center">Shares</th>
                <th className="py-3 px-4 text-right">Savings Paid</th>
                <th className="py-3 px-4 text-right">Dividend Share</th>
                <th className="py-3 px-4 text-right">Gross Total</th>
                <th className="py-3 px-4 text-right">Loan Deductions</th>
                <th className="py-3 px-4 text-right bg-emerald-50/50 text-emerald-900 font-bold">
                  Net Payout
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {settlements.map((s) => {
                const grossTotal = s.total_savings_paid + s.dividend_share;
                return (
                  <tr key={s.member.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{s.member.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{s.member.phone}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-700">
                        {s.shares}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900">
                      {formatCurrency(s.total_savings_paid)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                      +{formatCurrency(s.dividend_share)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-800">
                      {formatCurrency(grossTotal)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {s.total_deductions > 0 ? (
                        <span className="font-semibold text-rose-600">
                          -{formatCurrency(s.total_deductions)}
                        </span>
                      ) : (
                        <span className="text-slate-400">₹0</span>
                      )}
                      {s.outstanding_loan_principal > 0 && (
                        <span className="block text-[10px] text-slate-400">
                          Loan: {formatCurrency(s.outstanding_loan_principal)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right bg-emerald-50/30">
                      <span className="text-sm font-extrabold text-emerald-700">
                        {formatCurrency(s.net_payout)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-100/80 font-bold text-slate-900 border-t border-slate-200">
              <tr>
                <td className="py-3 px-4">Total</td>
                <td className="py-3 px-4 text-center">{totalShares}</td>
                <td className="py-3 px-4 text-right">{formatCurrency(totalSavingsPool)}</td>
                <td className="py-3 px-4 text-right text-emerald-700">
                  +{formatCurrency(netProfitPool)}
                </td>
                <td className="py-3 px-4 text-right">
                  {formatCurrency(totalSavingsPool + netProfitPool)}
                </td>
                <td className="py-3 px-4 text-right text-rose-700">
                  -{formatCurrency(settlements.reduce((a, b) => a + b.total_deductions, 0))}
                </td>
                <td className="py-3 px-4 text-right bg-emerald-100/70 text-emerald-900 text-sm">
                  {formatCurrency(totalPayoutAllMembers)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
