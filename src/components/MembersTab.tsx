'use client';

import React, { useState } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Phone,
  Mail,
  Trash2,
  Edit2,
  FileText,
  DollarSign,
  Percent,
  CreditCard,
} from 'lucide-react';
import { Member, MatrixRow, Loan } from '@/lib/types';
import { formatCurrency } from '@/lib/cycle-utils';

interface MembersTabProps {
  members: Member[];
  matrixRows: MatrixRow[];
  loans?: Loan[];
  onOpenAddMember: (initialType?: 'REGULAR' | 'EXTERNAL') => void;
  onViewPassbook: (member: Member) => void;
  onDeleteMember: (id: string, name: string) => void;
  onUpdateMember: (id: string, data: Partial<Member>) => void;
  onOpenNewLoanForMember?: (member: Member) => void;
}

export default function MembersTab({
  members,
  matrixRows,
  loans = [],
  onOpenAddMember,
  onViewPassbook,
  onDeleteMember,
  onUpdateMember,
  onOpenNewLoanForMember,
}: MembersTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'REGULAR' | 'EXTERNAL'>('ALL');

  // Compute stats per regular member from matrixRows
  const memberStatsMap = new Map<string, { totalPaid: number; totalDue: number; pending: number }>();
  matrixRows.forEach((r) => {
    memberStatsMap.set(r.member.id, {
      totalPaid: r.total_paid,
      totalDue: r.total_due,
      pending: r.pending_amount,
    });
  });

  // Compute loan stats per member
  const memberLoanStatsMap = new Map<
    string,
    { activePrincipal: number; totalDisbursed: number; interestPaid: number; loanCount: number }
  >();
  loans.forEach((l) => {
    const existing = memberLoanStatsMap.get(l.member_id) || {
      activePrincipal: 0,
      totalDisbursed: 0,
      interestPaid: 0,
      loanCount: 0,
    };
    existing.totalDisbursed += l.principal_amount || 0;
    if (l.status === 'ACTIVE') {
      existing.activePrincipal += l.outstanding_principal ?? l.principal_amount ?? 0;
    }
    existing.interestPaid += l.total_interest_paid || 0;
    existing.loanCount += 1;
    memberLoanStatsMap.set(l.member_id, existing);
  });

  const regularCount = members.filter((m) => m.member_type !== 'EXTERNAL').length;
  const externalCount = members.filter((m) => m.member_type === 'EXTERNAL').length;

  const filtered = members.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.phone ? m.phone.toLowerCase().includes(searchTerm.toLowerCase()) : false);
    if (!matchSearch) return false;

    if (statusFilter !== 'ALL' && m.status !== statusFilter) return false;

    if (typeFilter === 'REGULAR' && m.member_type === 'EXTERNAL') return false;
    if (typeFilter === 'EXTERNAL' && m.member_type !== 'EXTERNAL') return false;

    return true;
  });

  return (
    <div className="space-y-4">
      {/* Top Header & Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Member Category Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                typeFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({members.length})
            </button>
            <button
              onClick={() => setTypeFilter('REGULAR')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                typeFilter === 'REGULAR'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3 h-3 text-emerald-600" />
              <span>Fund Members ({regularCount})</span>
            </button>
            <button
              onClick={() => setTypeFilter('EXTERNAL')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                typeFilter === 'EXTERNAL'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Percent className="w-3 h-3 text-indigo-600" />
              <span>Outside Borrowers ({externalCount})</span>
            </button>
          </div>

          {/* Status Filter */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-2 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === 'ACTIVE'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Status
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
          <button
            onClick={() => onOpenAddMember('EXTERNAL')}
            className="flex-1 sm:flex-initial px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
            title="Add outside non-fund member who takes loans at 5%"
          >
            <Percent className="w-4 h-4 text-indigo-600" />
            <span>+ Add Outside Borrower</span>
          </button>

          <button
            onClick={() => onOpenAddMember('REGULAR')}
            className="flex-1 sm:flex-initial px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
            title="Enroll regular shareholder into fund cycle"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add Fund Member</span>
          </button>
        </div>
      </div>

      {/* Member Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200">
            No profiles found matching your search.
          </div>
        ) : (
          filtered.map((member) => {
            const isExternal = member.member_type === 'EXTERNAL';
            const stats = memberStatsMap.get(member.id) || { totalPaid: 0, totalDue: 0, pending: 0 };
            const loanStats = memberLoanStatsMap.get(member.id) || {
              activePrincipal: 0,
              totalDisbursed: 0,
              interestPaid: 0,
              loanCount: 0,
            };

            return (
              <div
                key={member.id}
                className={`bg-white rounded-2xl p-5 border shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                  isExternal ? 'border-indigo-200/90 bg-gradient-to-b from-indigo-50/20 to-white' : 'border-slate-200/80'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-slate-900 text-sm">{member.name}</h4>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className={member.phone ? '' : 'text-slate-400 italic'}>
                          {member.phone || 'No phone added'}
                        </span>
                      </div>
                    </div>

                    {/* Member Type / Shares Badge */}
                    {isExternal ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0 flex items-center gap-1">
                        <Percent className="w-3 h-3 text-indigo-500" />
                        <span>Outside (5% Loan)</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        {member.shares} Share(s)
                      </span>
                    )}
                  </div>

                  {member.email && (
                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-1 truncate">
                      <Mail className="w-3.5 h-3.5" />
                      <span className="truncate">{member.email}</span>
                    </div>
                  )}

                  {member.notes && (
                    <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg mt-3 border border-slate-100 italic">
                      &quot;{member.notes}&quot;
                    </p>
                  )}

                  {/* Financial Status Chips */}
                  {isExternal ? (
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                      <div className="p-2 bg-indigo-50/50 rounded-xl border border-indigo-100">
                        <span className="text-[10px] text-indigo-600 block">Active Loan Due</span>
                        <span className="text-xs font-bold text-indigo-700">
                          {formatCurrency(loanStats.activePrincipal)}
                        </span>
                      </div>
                      <div className="p-2 bg-emerald-50/50 rounded-xl border border-emerald-100">
                        <span className="text-[10px] text-emerald-600 block">Interest Paid (5%)</span>
                        <span className="text-xs font-bold text-emerald-700">
                          {formatCurrency(loanStats.interestPaid)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                      <div className="p-2 bg-emerald-50/50 rounded-xl border border-emerald-100">
                        <span className="text-[10px] text-emerald-600 block">Savings Paid</span>
                        <span className="text-xs font-bold text-emerald-700">
                          {formatCurrency(stats.totalPaid)}
                        </span>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/60">
                        <span className="text-[10px] text-slate-500 block">Pending Dues</span>
                        <span
                          className={`text-xs font-bold ${
                            stats.pending > 0 ? 'text-rose-600' : 'text-slate-500'
                          }`}
                        >
                          {stats.pending > 0 ? formatCurrency(stats.pending) : 'None'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between gap-1.5 mt-4 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => onViewPassbook(member)}
                    className="flex-1 py-1.5 px-2.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Passbook</span>
                  </button>

                  {onOpenNewLoanForMember && (
                    <button
                      onClick={() => onOpenNewLoanForMember(member)}
                      title={isExternal ? 'Disburse 5% loan to this borrower' : 'Disburse loan'}
                      className="py-1.5 px-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Loan</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      const newPhone = prompt('Update phone number for ' + member.name, member.phone);
                      if (newPhone !== null) {
                        onUpdateMember(member.id, { phone: newPhone.trim() });
                      }
                    }}
                    title="Edit Phone"
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onDeleteMember(member.id, member.name)}
                    title={isExternal ? 'Remove External Borrower' : 'Remove Member'}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
