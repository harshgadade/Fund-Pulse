'use client';

import React, { useState, useEffect } from 'react';
import {
  Receipt,
  PlusCircle,
  TrendingDown,
  TrendingUp,
  Trash2,
  Calendar,
  Tag,
  AlertCircle,
  Check,
  X,
  FileText,
} from 'lucide-react';
import { FundExpense, FundCycle } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/cycle-utils';

interface ExpensesTabProps {
  expenses: FundExpense[];
  cycle: FundCycle | null;
  onAddExpense: (data: {
    category: string;
    type: 'EXPENSE' | 'INCOME';
    amount: number;
    date: string;
    description: string;
  }) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
}

const CATEGORIES = [
  'Stationery & Printing',
  'Register / Passbooks',
  'Meeting / Refreshments',
  'Bank Charges & SMS',
  'Audit & Admin',
  'Penalty / Late Fee Income',
  'New Member Admission Fee',
  'Interest on Bank Savings',
  'Other Expense',
  'Other Income',
];

export default function ExpensesTab({
  expenses,
  cycle,
  onAddExpense,
  onDeleteExpense,
}: ExpensesTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'EXPENSE' | 'INCOME'>('ALL');

  // Form State
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isModalOpen && !date) {
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [isModalOpen, date]);

  // Computations
  const totalExpenses = expenses
    .filter((e) => e.type === 'EXPENSE')
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const totalIncome = expenses
    .filter((e) => e.type === 'INCOME')
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const netBalance = totalIncome - totalExpenses;

  const filteredExpenses = expenses.filter((e) => {
    if (filterType === 'ALL') return true;
    return e.type === filterType;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (!description.trim()) {
      alert('Please enter a description');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddExpense({
        category,
        type,
        amount: Number(amount),
        date,
        description: description.trim(),
      });
      setIsModalOpen(false);
      setAmount('');
      setDescription('');
    } catch (err) {
      alert('Failed to add entry: ' + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, desc: string) => {
    if (!confirm(`Are you sure you want to delete "${desc}"?`)) return;
    try {
      await onDeleteExpense(id);
    } catch (err) {
      alert('Failed to delete: ' + (err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Expenses
            </p>
            <p className="text-xl font-bold text-rose-600 mt-0.5">
              {formatCurrency(totalExpenses)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Deducted from year-end profit</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Misc Income
            </p>
            <p className="text-xl font-bold text-emerald-600 mt-0.5">
              {formatCurrency(totalIncome)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Penalties, fees, or bank interest</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Net Expense / Impact
            </p>
            <p
              className={`text-xl font-bold mt-0.5 ${
                netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {netBalance >= 0 ? '+' : ''}
              {formatCurrency(netBalance)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Net effect on profit pool</p>
          </div>
        </div>
      </div>

      {/* Action / Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(['ALL', 'EXPENSE', 'INCOME'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  filterType === t
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t === 'ALL' ? 'All Entries' : t === 'EXPENSE' ? 'Expenses Only' : 'Income Only'}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-400">({filteredExpenses.length} records)</span>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Expense / Income</span>
        </button>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-slate-900">Expense & Other Income Ledger</h3>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
              {cycle?.name || 'Current Cycle'}
            </span>
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-slate-700">No records found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Track operational costs like passbook printing, stationery, refreshments, or late fee penalties.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Add Record
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredExpenses.map((e) => {
                  const isExp = e.type === 'EXPENSE';
                  return (
                    <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {formatDate(e.date)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            isExp
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isExp ? (
                            <TrendingDown className="w-3 h-3 text-rose-500" />
                          ) : (
                            <TrendingUp className="w-3 h-3 text-emerald-500" />
                          )}
                          {e.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {e.category}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {e.description}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-bold text-sm ${
                          isExp ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {isExp ? '-' : '+'}
                        {formatCurrency(e.amount)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDelete(e.id, e.description)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Add Expense or Income</h3>
                  <p className="text-xs text-slate-300">Affects year-end profit distribution</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Type Toggle */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Transaction Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('EXPENSE')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                      type === 'EXPENSE'
                        ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Expense (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('INCOME')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                      type === 'INCOME'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Income (+)
                  </button>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Remarks *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Register notebook and receipt pads"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {isSubmitting ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
