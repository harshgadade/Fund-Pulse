'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, DollarSign, Trash2, History } from 'lucide-react';
import { Loan, LoanRepayment } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/cycle-utils';

interface LoanRepaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
  onRecordRepayment: (data: {
    loan_id: string;
    payment_date: string;
    principal_paid: number;
    interest_paid: number;
    payment_method: string;
    reference_no?: string;
    notes?: string;
  }) => Promise<void>;
  onDeleteRepayment?: (loanId: string, repaymentId: string) => Promise<void>;
  onRefresh?: () => void;
}

export default function LoanRepaymentModal({
  isOpen,
  onClose,
  loan,
  onRecordRepayment,
  onDeleteRepayment,
  onRefresh,
}: LoanRepaymentModalProps) {
  const [principalPaid, setPrincipalPaid] = useState<number>(0);
  const [interestPaid, setInterestPaid] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('UPI');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [repaymentsList, setRepaymentsList] = useState<LoanRepayment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchRepayments = async (loanId: string) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/loans/${loanId}/repayments`);
      const json = await res.json();
      if (json.success) {
        setRepaymentsList(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch repayments', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen && loan) {
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setInterestPaid(
        Math.round(((loan.outstanding_principal || loan.principal_amount) * loan.interest_rate_pct) / 100)
      );
      setPrincipalPaid(0);
      setReferenceNo('');
      setNotes('');
      fetchRepayments(loan.id);
    }
  }, [isOpen, loan]);

  if (!isOpen || !loan) return null;

  const totalPaid = (Number(principalPaid) || 0) + (Number(interestPaid) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalPaid <= 0) {
      alert('Please enter principal or interest payment amount');
      return;
    }
    setIsSubmitting(true);
    try {
      await onRecordRepayment({
        loan_id: loan.id,
        payment_date: paymentDate,
        principal_paid: Number(principalPaid) || 0,
        interest_paid: Number(interestPaid) || 0,
        payment_method: paymentMethod,
        reference_no: referenceNo.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      alert('Error recording repayment: ' + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = async (rep: LoanRepayment) => {
    const confirmMsg = `Delete this entry?\n\n- Date: ${formatDate(rep.payment_date)}\n- Interest Paid: ${formatCurrency(rep.interest_paid)}\n- Principal Paid: ${formatCurrency(rep.principal_paid)}\n- Total: ${formatCurrency(rep.total_paid)}`;
    if (!window.confirm(confirmMsg)) return;

    try {
      if (onDeleteRepayment) {
        await onDeleteRepayment(loan.id, rep.id);
      } else {
        const res = await fetch(`/api/loans/${loan.id}/repayments?repaymentId=${rep.id}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to delete');
      }
      setRepaymentsList((prev) => prev.filter((r) => r.id !== rep.id));
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Error deleting payment entry: ' + (err as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full my-6 overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 flex items-center justify-between">
          <div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Loan: {loan.loan_no}
            </span>
            <h3 className="text-base font-bold mt-1">Record Loan Repayment</h3>
            <p className="text-xs text-slate-300">{loan.member_name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Outstanding Balance Banner */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 gap-2 text-center">
            <div>
              <span className="text-[10px] text-slate-500 block">Outstanding Principal</span>
              <span className="text-sm font-bold text-slate-900">
                {formatCurrency(loan.outstanding_principal || loan.principal_amount)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Interest Rate</span>
              <span className="text-sm font-bold text-indigo-700">
                {loan.interest_rate_pct}% / month
              </span>
            </div>
          </div>

          {/* Payment breakdown */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Interest Paid (₹)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={interestPaid}
                onChange={(e) => setInterestPaid(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400">Adds to Fund Profit</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Principal Paid (₹)
              </label>
              <input
                type="number"
                min="0"
                max={loan.outstanding_principal || loan.principal_amount}
                step="500"
                value={principalPaid}
                onChange={(e) => setPrincipalPaid(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400">Reduces loan balance</span>
            </div>
          </div>

          {/* Total Paid Display */}
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/80 flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-900">Total Payment Received:</span>
            <span className="text-base font-extrabold text-emerald-700">
              {formatCurrency(totalPaid)}
            </span>
          </div>

          {/* Date & Mode */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
              >
                <option value="UPI">UPI (GPay/PhonePe)</option>
                <option value="Cash">Cash in Hand</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reference No. / UTR
            </label>
            <input
              type="text"
              placeholder="e.g. UPI Ref: 3123849102"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Monthly interest received"
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
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : 'Record Payment'}
            </button>
          </div>

          {/* Past Payment Entries Section (Delete Wrong Entry) */}
          <div className="pt-4 border-t border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-indigo-600" />
                Previous Entries ({repaymentsList.length})
              </span>
              <span className="text-[11px] text-slate-400">Delete any wrongly added entry</span>
            </div>

            {loadingHistory ? (
              <p className="text-xs text-slate-400 text-center py-2">Loading previous entries...</p>
            ) : repaymentsList.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-2">No past payment entries found.</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {repaymentsList.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl flex items-center justify-between gap-2 text-xs transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 flex items-center gap-2">
                        <span>{formatDate(rep.payment_date)}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-600 font-medium">
                          {rep.payment_method}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 flex items-center gap-2.5 mt-0.5">
                        <span className="text-emerald-700 font-semibold">
                          Interest: {formatCurrency(rep.interest_paid)}
                        </span>
                        {rep.principal_paid > 0 && (
                          <span className="text-indigo-700 font-semibold">
                            Principal: {formatCurrency(rep.principal_paid)}
                          </span>
                        )}
                        <span className="text-slate-500">
                          Total: {formatCurrency(rep.total_paid)}
                        </span>
                      </div>
                      {rep.notes && (
                        <p className="text-[10px] text-slate-400 italic mt-0.5">&quot;{rep.notes}&quot;</p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(rep)}
                      title="Delete this wrong entry"
                      className="px-2 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-100/70 border border-rose-200 rounded-lg transition-colors flex items-center gap-1 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
