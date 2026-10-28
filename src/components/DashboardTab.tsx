'use client';

import React from 'react';
import {
  Wallet,
  TrendingUp,
  CreditCard,
  PiggyBank,
  Users,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { DashboardStats } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/cycle-utils';

interface DashboardTabProps {
  stats: DashboardStats | null;
  onNavigateToTab: (tab: string) => void;
  onQuickPayMember: (memberId: string) => void;
  onOpenAddMember: () => void;
  onOpenNewLoan: () => void;
}

export default function DashboardTab({
  stats,
  onNavigateToTab,
  onOpenAddMember,
  onOpenNewLoan,
}: DashboardTabProps) {
  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Loading fund statistics...</p>
        </div>
      </div>
    );
  }

  const {
    active_cycle,
    total_members,
    total_shares,
    total_savings_collected,
    total_savings_due,
    savings_collection_rate,
    total_loans_disbursed,
    total_loan_principal_outstanding,
    total_loan_interest_earned,
    total_expenses,
    net_cash_balance,
    current_month_name,
    current_month_due,
    current_month_collected,
    recent_activities,
  } = stats;

  const currentMonthPct =
    current_month_due > 0 ? Math.min(100, Math.round((current_month_collected / current_month_due) * 100)) : 0;

  return (
    <div className="space-y-6">
      {/* Welcome & Cycle Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {active_cycle?.name || 'FY 2026-27'}
              </span>
              <span className="text-xs text-slate-300">May 2026 – April 2027</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Fund Overview & Performance</h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Tracking monthly member savings, interest-bearing internal loans, and year-end dividend profit pool.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigateToTab('matrix')}
              className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm transition-colors flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Open 12-Month Matrix
            </button>
            <button
              onClick={() => onNavigateToTab('settlement')}
              className="px-4 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl transition-colors flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              View Year-End Dividends
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Cash Balance */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Available Cash Pool</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(net_cash_balance)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Cash in hand ready for disbursement or payouts</p>
          </div>
        </div>

        {/* Total Savings Collected */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Savings Collected</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <PiggyBank className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(total_savings_collected)}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-1.5 rounded-full"
                  style={{ width: `${Math.min(100, savings_collection_rate)}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-blue-700 whitespace-nowrap">
                {savings_collection_rate}%
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">of {formatCurrency(total_savings_due)} due so far</p>
          </div>
        </div>

        {/* Active Loan Principal Outstanding */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Loans Out</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(total_loan_principal_outstanding)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {formatCurrency(total_loans_disbursed)} total disbursed to members
            </p>
          </div>
        </div>

        {/* Interest Earned (Fund Profit) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Loan Interest Income</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-600 tracking-tight">
              +{formatCurrency(total_loan_interest_earned)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Net profit accumulated for member year-end dividend</p>
          </div>
        </div>
      </div>

      {/* 2-Column: Current Month Spotlight + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Month Collection Spotlight (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-lg">
                  Current Month Spotlight: {current_month_name}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                  Active Month
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Monthly collection progress for all {total_members} fund members ({total_shares} total shares)
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab('matrix')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
            >
              View Grid <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Progress Card */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-600">Monthly Target Progress</span>
              <span className="text-sm font-bold text-slate-900">
                {formatCurrency(current_month_collected)} / {formatCurrency(current_month_due)} ({currentMonthPct}%)
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${currentMonthPct}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              <div className="p-2 bg-white rounded-lg border border-slate-200/60">
                <span className="text-[11px] text-slate-500 block">Total Due</span>
                <span className="text-xs font-bold text-slate-800">{formatCurrency(current_month_due)}</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200/60">
                <span className="text-[11px] text-emerald-600 block">Collected</span>
                <span className="text-xs font-bold text-emerald-700">{formatCurrency(current_month_collected)}</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200/60">
                <span className="text-[11px] text-amber-600 block">Pending</span>
                <span className="text-xs font-bold text-amber-700">
                  {formatCurrency(Math.max(0, current_month_due - current_month_collected))}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Help and Actions */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Users className="w-4 h-4 text-slate-400" />
              <span>{total_members} active members • ₹{active_cycle?.monthly_amount || 1000}/share per month</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenNewLoan}
                className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
              >
                + Issue Loan
              </button>
              <button
                onClick={onOpenAddMember}
                className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
              >
                + Add Member
              </button>
            </div>
          </div>
        </div>

        {/* Recent Transactions & Activities (1 col) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-lg">Recent Activity</h3>
            <span className="text-xs text-slate-400">Live log</span>
          </div>

          {recent_activities.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">
              No recent activity recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {recent_activities.map((act) => {
                const isContrib = act.type === 'CONTRIBUTION';
                const isLoan = act.type === 'LOAN_DISBURSED';
                const isRepay = act.type === 'LOAN_REPAID';

                return (
                  <div
                    key={act.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/70 hover:bg-slate-50 border border-slate-100 transition-colors"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isContrib
                          ? 'bg-emerald-100 text-emerald-700'
                          : isLoan
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {isContrib && <ArrowDownLeft className="w-4 h-4" />}
                      {isLoan && <ArrowUpRight className="w-4 h-4" />}
                      {isRepay && <CheckCircle2 className="w-4 h-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-900 truncate">{act.title}</p>
                        <span className="text-xs font-bold text-slate-800 ml-2 whitespace-nowrap">
                          {isLoan ? '-' : '+'}
                          {formatCurrency(act.amount)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{act.description}</p>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">{formatDate(act.date)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
