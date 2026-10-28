'use client';

import React, { useState, useEffect } from 'react';
import { X, CreditCard, Check, Calculator, AlertCircle, UserPlus, Percent, Users } from 'lucide-react';
import { Member, FundCycle } from '@/lib/types';
import { formatCurrency } from '@/lib/cycle-utils';

interface NewLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  cycle: FundCycle | null;
  initialMemberId?: string;
  onAddMember?: (data: {
    name: string;
    phone: string;
    member_type?: 'REGULAR' | 'EXTERNAL';
    notes?: string;
  }) => Promise<Member>;
  onIssueLoan: (data: {
    member_id: string;
    principal_amount: number;
    interest_rate_pct: number;
    disbursement_date: string;
    disbursement_method: string;
    repayment_terms?: string;
    notes?: string;
  }) => Promise<void>;
}

export default function NewLoanModal({
  isOpen,
  onClose,
  members,
  cycle,
  initialMemberId,
  onAddMember,
  onIssueLoan,
}: NewLoanModalProps) {
  const [isNewExternalMode, setIsNewExternalMode] = useState(false);
  const [newExternalName, setNewExternalName] = useState('');
  const [newExternalPhone, setNewExternalPhone] = useState('');

  const [memberId, setMemberId] = useState(initialMemberId || members[0]?.id || '');
  const [principalAmount, setPrincipalAmount] = useState<number>(20000);
  const [interestRatePct, setInterestRatePct] = useState<number>(3.0);
  const [disbursementDate, setDisbursementDate] = useState<string>('');
  const [disbursementMethod, setDisbursementMethod] = useState<string>('UPI');
  const [repaymentTerms, setRepaymentTerms] = useState<string>('Monthly interest, principal due at year-end');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const regularMembers = members.filter((m) => m.member_type !== 'EXTERNAL');
  const externalMembers = members.filter((m) => m.member_type === 'EXTERNAL');

  const selectedMember = members.find((m) => m.id === memberId);
  const isSelectedExternal = isNewExternalMode || selectedMember?.member_type === 'EXTERNAL';

  // Handler for selecting member
  const handleSelectMember = (id: string) => {
    setMemberId(id);
    const m = members.find((item) => item.id === id);
    if (m?.member_type === 'EXTERNAL') {
      setInterestRatePct(5.0);
    } else {
      setInterestRatePct(cycle?.default_interest_rate ?? 3.0);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setDisbursementDate(new Date().toISOString().split('T')[0]);
      setIsNewExternalMode(false);
      setNewExternalName('');
      setNewExternalPhone('');

      const targetId = initialMemberId || members[0]?.id || '';
      setMemberId(targetId);

      const targetMember = members.find((m) => m.id === targetId);
      if (targetMember?.member_type === 'EXTERNAL') {
        setInterestRatePct(5.0);
      } else {
        setInterestRatePct(cycle?.default_interest_rate ?? 3.0);
      }
    }
  }, [isOpen, initialMemberId, members, cycle]);

  if (!isOpen) return null;

  // Monthly expected interest
  const monthlyExpectedInterest = Math.round((principalAmount * interestRatePct) / 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (principalAmount <= 0) {
      alert('Please enter a valid loan principal amount');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalMemberId = memberId;

      // If creating an outside borrower inline
      if (isNewExternalMode) {
        if (!newExternalName.trim()) {
          alert('Please enter the external borrower name');
          setIsSubmitting(false);
          return;
        }
        if (!onAddMember) {
          throw new Error('Member creation handler missing');
        }
        const created = await onAddMember({
          name: newExternalName.trim(),
          phone: newExternalPhone.trim(),
          member_type: 'EXTERNAL',
          notes: 'Outside non-fund borrower (5% loan)',
        });
        finalMemberId = created.id;
      }

      if (!finalMemberId) {
        alert('Please select a member or enter borrower name');
        setIsSubmitting(false);
        return;
      }

      await onIssueLoan({
        member_id: finalMemberId,
        principal_amount: Number(principalAmount),
        interest_rate_pct: Number(interestRatePct),
        disbursement_date: disbursementDate,
        disbursement_method: disbursementMethod,
        repayment_terms: repaymentTerms,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      alert('Error disbursing loan: ' + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full my-6 overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div
          className={`text-white p-5 flex items-center justify-between transition-colors ${
            isSelectedExternal
              ? 'bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950'
              : 'bg-gradient-to-r from-slate-900 to-indigo-950'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isSelectedExternal ? 'bg-purple-500/20 text-purple-300' : 'bg-indigo-500/20 text-indigo-400'
              }`}
            >
              {isSelectedExternal ? <Percent className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">
                  {isSelectedExternal ? 'Issue External Loan (5%)' : 'Issue Member Loan'}
                </h3>
                {isSelectedExternal && (
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-purple-500/30 text-purple-200 font-semibold border border-purple-400/40">
                    Outside Borrower
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                {isSelectedExternal
                  ? 'Disburse loan to non-member borrower @ 5% interest/month'
                  : 'Disburse internal fund loan to regular member @ 3% interest/month'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {/* Borrower Mode Switch */}
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-700">Borrower Type</span>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setIsNewExternalMode(false);
                  if (members.length > 0) handleSelectMember(members[0].id);
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  !isNewExternalMode ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Existing ({members.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsNewExternalMode(true);
                  setInterestRatePct(5.0);
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                  isNewExternalMode
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Percent className="w-3 h-3" />
                <span>+ New Outside Borrower</span>
              </button>
            </div>
          </div>

          {/* New External Borrower Inline Fields */}
          {isNewExternalMode ? (
            <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-purple-600" />
                  Outside Borrower Registration
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-200/70 text-purple-800 font-semibold">
                  5% Standard Rate
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-purple-900 mb-1">
                    Borrower Full Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Patel"
                    value={newExternalName}
                    onChange={(e) => setNewExternalName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    required={isNewExternalMode}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-purple-900 mb-1">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={newExternalPhone}
                    onChange={(e) => setNewExternalPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>
              <p className="text-[10px] text-purple-700">
                Will be registered as an external borrower with 0 fund shares. Loan interest will be credited to fund profit!
              </p>
            </div>
          ) : (
            /* Existing Member Selection */
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Borrower *
              </label>
              <select
                value={memberId}
                onChange={(e) => handleSelectMember(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                required={!isNewExternalMode}
              >
                <option value="" disabled>
                  -- Choose Borrower --
                </option>

                {externalMembers.length > 0 && (
                  <optgroup label=" Outside Non-Fund Borrowers (5% Loan)">
                    {externalMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.phone ? `(${m.phone})` : ''} — Outside Borrower (5%)
                      </option>
                    ))}
                  </optgroup>
                )}

                <optgroup label=" Regular Fund Members (3% Loan)">
                  {regularMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.phone ? `(${m.phone})` : ''} — {m.shares} share(s) (3%)
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          )}

          {/* Principal & Rate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Loan Principal (₹) *
              </label>
              <input
                type="number"
                min="1000"
                step="500"
                value={principalAmount}
                onChange={(e) => setPrincipalAmount(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Interest Rate (% / mo) *
                </label>
                {isSelectedExternal && (
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                    5% Outside
                  </span>
                )}
              </div>
              <input
                type="number"
                min="0"
                step="0.1"
                value={interestRatePct}
                onChange={(e) => setInterestRatePct(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Live Interest Calculator Box */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
              isSelectedExternal
                ? 'bg-purple-50/70 border-purple-200'
                : 'bg-indigo-50/70 border-indigo-200/80'
            }`}
          >
            <div className="flex items-center gap-2">
              <Calculator className={`w-4 h-4 ${isSelectedExternal ? 'text-purple-600' : 'text-indigo-600'}`} />
              <div>
                <span className={`text-[11px] font-semibold block ${isSelectedExternal ? 'text-purple-950' : 'text-indigo-900'}`}>
                  Monthly Expected Interest ({interestRatePct}%)
                </span>
                <span className={`text-[10px] ${isSelectedExternal ? 'text-purple-700' : 'text-indigo-600'}`}>
                  {interestRatePct}% per month on {formatCurrency(principalAmount)}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-sm font-extrabold ${isSelectedExternal ? 'text-purple-800' : 'text-indigo-700'}`}>
                {formatCurrency(monthlyExpectedInterest)}
              </span>
              <span className={`text-[10px] block ${isSelectedExternal ? 'text-purple-500' : 'text-indigo-500'}`}>
                / month profit
              </span>
            </div>
          </div>

          {/* Date & Mode */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Disbursement Date *
              </label>
              <input
                type="date"
                value={disbursementDate}
                onChange={(e) => setDisbursementDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Disbursement Method
              </label>
              <select
                value={disbursementMethod}
                onChange={(e) => setDisbursementMethod(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
              >
                <option value="UPI">UPI (GPay / PhonePe)</option>
                <option value="Cash">Cash in Hand</option>
                <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Repayment Terms
            </label>
            <input
              type="text"
              value={repaymentTerms}
              onChange={(e) => setRepaymentTerms(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes / Guarantor Details
            </label>
            <input
              type="text"
              placeholder={isSelectedExternal ? 'e.g. Outside loan, guarantor contact, purpose' : 'e.g. Loan purpose or guarantor'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 ${
                isSelectedExternal
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              <Check className="w-4 h-4" />
              {isSubmitting
                ? 'Disbursing...'
                : isSelectedExternal
                ? `Disburse 5% Loan (${formatCurrency(principalAmount)})`
                : 'Disburse Loan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
