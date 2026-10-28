'use client';

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Download,
  Printer,
  ChevronRight,
  Sparkles,
  Check,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { MatrixRow, MonthInfo, FundCycle, Contribution, Member } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/cycle-utils';

interface MonthlyMatrixTabProps {
  cycle: FundCycle | null;
  months: MonthInfo[];
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
  onSelectCell: (row: MatrixRow, monthIndex: number) => void;
  onBulkMarkPaid: (monthIndex: number, memberIds: string[]) => void;
  onRefresh: () => void;
  onViewMemberPassbook: (member: Member) => void;
}

export default function MonthlyMatrixTab({
  cycle,
  months,
  rows,
  totalsByMonth,
  grandTotal,
  onSelectCell,
  onBulkMarkPaid,
  onRefresh,
  onViewMemberPassbook,
}: MonthlyMatrixTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const [selectedMonthForBulk, setSelectedMonthForBulk] = useState<number>(0);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchSearch =
        r.member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.member.phone.includes(searchTerm);

      if (!matchSearch) return false;

      if (statusFilter === 'PENDING') {
        return r.pending_amount > 0;
      }
      if (statusFilter === 'PAID') {
        return r.all_paid;
      }
      return true;
    });
  }, [rows, searchTerm, statusFilter]);

  // CSV export handler
  const handleExportCSV = () => {
    const headers = [
      'Member Name',
      'Phone',
      'Shares',
      ...months.map((m) => `${m.short_name} ${m.year}`),
      'Total Paid',
      'Total Due',
      'Pending Balance',
    ];

    const csvRows = [headers.join(',')];

    filteredRows.forEach((r) => {
      const row = [
        `"${r.member.name}"`,
        `"${r.member.phone}"`,
        r.member.shares,
        ...months.map((m) => {
          const c = r.months[m.month_index];
          if (!c) return '0';
          return c.status === 'PAID' ? c.amount_paid : `"${c.status} (${c.amount_paid}/${c.amount_due})"`;
        }),
        r.total_paid,
        r.total_due,
        r.pending_amount,
      ];
      csvRows.push(row.join(','));
    });

    // Add totals row
    const totalsRow = [
      '"TOTAL"',
      '""',
      '""',
      ...months.map((m) => totalsByMonth[m.month_index]?.collected || 0),
      grandTotal.collected,
      grandTotal.due,
      grandTotal.pending,
    ];
    csvRows.push(totalsRow.join(','));

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Fund_Matrix_${cycle?.name || '2026-27'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkAction = async () => {
    // Find all active members who have not paid for selectedMonthForBulk
    const pendingMemberIds: string[] = [];
    rows.forEach((r) => {
      const c = r.months[selectedMonthForBulk];
      if (c && c.status === 'PENDING' && c.amount_due > 0) {
        pendingMemberIds.push(r.member.id);
      }
    });

    if (pendingMemberIds.length === 0) {
      alert(`All members have already paid for ${months[selectedMonthForBulk]?.name}!`);
      return;
    }

    if (
      confirm(
        `Mark ${pendingMemberIds.length} members as PAID for ${months[selectedMonthForBulk]?.name}?`
      )
    ) {
      setIsBulkProcessing(true);
      await onBulkMarkPaid(selectedMonthForBulk, pendingMemberIds);
      setIsBulkProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search member name / phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({rows.length})
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              Pending Dues
            </button>
            <button
              onClick={() => setStatusFilter('PAID')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === 'PAID'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              All Paid
            </button>
          </div>
        </div>

        {/* Bulk Action & Export */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Quick Bulk Pay Month */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
            <span className="text-xs text-slate-500">Bulk Pay:</span>
            <select
              value={selectedMonthForBulk}
              onChange={(e) => setSelectedMonthForBulk(Number(e.target.value))}
              className="text-xs font-semibold bg-transparent text-slate-800 focus:outline-none"
            >
              {months.map((m) => (
                <option key={m.month_index} value={m.month_index}>
                  {m.short_name}
                </option>
              ))}
            </select>
            <button
              onClick={handleBulkAction}
              disabled={isBulkProcessing}
              className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              {isBulkProcessing ? 'Saving...' : 'Mark All Paid'}
            </button>
          </div>

          {/* Export to CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Print */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Print Grid</span>
          </button>
        </div>
      </div>

      {/* Main Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4 sticky left-0 bg-slate-50 z-10 w-48 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                  Member Details
                </th>
                <th className="py-3 px-2 text-center w-14">Shares</th>
                {months.map((m) => (
                  <th
                    key={m.month_index}
                    className="py-3 px-2 text-center min-w-[76px] whitespace-nowrap"
                  >
                    <div>{m.short_name}</div>
                    <div className="text-[10px] font-normal text-slate-400">'{String(m.year).slice(2)}</div>
                  </th>
                ))}
                <th className="py-3 px-3 text-right bg-slate-100/50 min-w-[85px]">Total Paid</th>
                <th className="py-3 px-3 text-right bg-slate-100/50 min-w-[85px]">Balance Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={16} className="text-center py-10 text-slate-400">
                    No members match your criteria.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  return (
                    <tr
                      key={row.member.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Member Info (Sticky Column) */}
                      <td className="py-3 px-4 sticky left-0 bg-white group-hover:bg-slate-50/70 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => onViewMemberPassbook(row.member)}
                            className="text-left font-semibold text-slate-900 hover:text-emerald-600 hover:underline flex items-center gap-1 truncate"
                            title="Click to view Passbook"
                          >
                            <span className="truncate">{row.member.name}</span>
                            <ChevronRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">{row.member.phone}</div>
                      </td>

                      {/* Shares */}
                      <td className="py-3 px-2 text-center font-medium text-slate-600">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[11px]">
                          {row.member.shares}
                        </span>
                      </td>

                      {/* 12 Months Cells */}
                      {months.map((m) => {
                        const c = row.months[m.month_index];
                        if (!c) return <td key={m.month_index} className="p-2 text-center">-</td>;

                        const isPaid = c.status === 'PAID';
                        const isPartial = c.status === 'PARTIAL';
                        const isExcused = c.status === 'EXCUSED';

                        return (
                          <td
                            key={m.month_index}
                            className="py-2 px-1 text-center"
                          >
                            <button
                              onClick={() => onSelectCell(row, m.month_index)}
                              title={
                                isPaid
                                  ? `Paid: ₹${c.amount_paid} on ${formatDate(c.paid_date)} via ${c.payment_method}`
                                  : isPartial
                                  ? `Partial: ₹${c.amount_paid} of ₹${c.amount_due}`
                                  : isExcused
                                  ? 'Joined in later month'
                                  : `Pending: ₹${c.amount_due}`
                              }
                              className={`w-full py-1.5 px-1 rounded-lg text-xs font-semibold transition-all transform active:scale-95 flex flex-col items-center justify-center ${
                                isPaid
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80 shadow-xs'
                                  : isPartial
                                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-300'
                                  : isExcused
                                  ? 'bg-slate-100 text-slate-400 cursor-default'
                                  : 'bg-rose-50/50 text-rose-600 hover:bg-rose-100 border border-rose-200/70'
                              }`}
                            >
                              {isPaid ? (
                                <span className="flex items-center gap-0.5">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                  <span>₹{c.amount_paid}</span>
                                </span>
                              ) : isPartial ? (
                                <span>₹{c.amount_paid}</span>
                              ) : isExcused ? (
                                <span className="text-[10px]">Excused</span>
                              ) : (
                                <span className="text-[11px] font-medium">₹{c.amount_due}</span>
                              )}
                            </button>
                          </td>
                        );
                      })}

                      {/* Total Paid */}
                      <td className="py-3 px-3 text-right font-bold text-emerald-700 bg-slate-50/40">
                        {formatCurrency(row.total_paid)}
                      </td>

                      {/* Balance Due */}
                      <td
                        className={`py-3 px-3 text-right font-bold bg-slate-50/40 ${
                          row.pending_amount > 0 ? 'text-rose-600' : 'text-slate-400'
                        }`}
                      >
                        {row.pending_amount > 0 ? formatCurrency(row.pending_amount) : 'Cleared'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Matrix Footer (Monthly Totals & Grand Totals) */}
            <tfoot>
              <tr className="bg-slate-100/80 border-t-2 border-slate-300 font-bold text-slate-800">
                <td className="py-3 px-4 sticky left-0 bg-slate-100 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                  <div>Monthly Collected</div>
                  <div className="text-[10px] font-normal text-slate-500">Target Due vs Actual</div>
                </td>
                <td className="py-3 px-2 text-center text-slate-500">-</td>

                {months.map((m) => {
                  const mData = totalsByMonth[m.month_index];
                  return (
                    <td key={m.month_index} className="py-2.5 px-1 text-center">
                      <div className="text-xs text-emerald-700">
                        {formatCurrency(mData?.collected || 0)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        of {formatCurrency(mData?.due || 0)}
                      </div>
                    </td>
                  );
                })}

                <td className="py-3 px-3 text-right text-emerald-700 font-extrabold">
                  {formatCurrency(grandTotal.collected)}
                </td>
                <td className="py-3 px-3 text-right text-rose-600 font-extrabold">
                  {formatCurrency(grandTotal.pending)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Legend & Instructions */}
      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span className="font-medium text-slate-700">Status Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 inline-block" />
            <span>Paid</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 inline-block" />
            <span>Partial</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-50 border border-rose-200 inline-block" />
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-200 inline-block" />
            <span>Excused</span>
          </div>
        </div>
        <div>
          💡 Tip: <span className="font-medium">Click any monthly cell</span> to record payment, date, receipt, or notes.
        </div>
      </div>
    </div>
  );
}
