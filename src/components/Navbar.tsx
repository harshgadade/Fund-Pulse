'use client';

import React from 'react';
import {
  Wallet,
  Calendar,
  Users,
  CreditCard,
  Receipt,
  Award,
  Settings,
  Sparkles,
  Printer,
  PlusCircle,
} from 'lucide-react';
import { FundCycle } from '@/lib/types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeCycle: FundCycle | null;
  cycles: FundCycle[];
  onCycleChange: (id: string) => void;
  onOpenAddMember: () => void;
  onOpenNewLoan: () => void;
  onSeedDemo: () => void;
  isSeeding: boolean;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  activeCycle,
  cycles,
  onCycleChange,
  onOpenAddMember,
  onOpenNewLoan,
  onSeedDemo,
  isSeeding,
}: NavbarProps) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Wallet },
    { id: 'matrix', label: '12-Month Matrix', icon: Calendar },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'loans', label: 'Loans & Interest', icon: CreditCard },
    { id: 'expenses', label: 'Expenses & Income', icon: Receipt },
    { id: 'settlement', label: 'Year-End Payout', icon: Award },
    { id: 'settings', label: 'Settings & Backup', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs print:hidden">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Cycle */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">FundPulse</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Savings & Loan
                </span>
              </div>
              <p className="text-xs text-slate-500">12-Month May-April Fund Manager</p>
            </div>

            {/* Cycle Selector */}
            <div className="ml-4 pl-4 border-l border-slate-200 hidden sm:flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Cycle:</span>
              <select
                value={activeCycle?.id || ''}
                onChange={(e) => onCycleChange(e.target.value)}
                className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg px-2.5 py-1.5 border border-slate-300 transition-colors focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.start_year}-{c.start_year + 1})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onSeedDemo}
              disabled={isSeeding}
              title="Populate or reload original 19 fund members data"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              {isSeeding ? 'Loading Members...' : 'Load 19 Members'}
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              onClick={onOpenNewLoan}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Loan</span>
            </button>

            <button
              onClick={onOpenAddMember}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Member</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto space-x-1 border-t border-slate-100 py-1.5 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
