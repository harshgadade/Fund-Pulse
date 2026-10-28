'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, CreditCard, Calendar, User, DollarSign, FileText } from 'lucide-react';
import { Contribution, Member, MonthInfo } from '@/lib/types';
import { formatCurrency } from '@/lib/cycle-utils';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  month: MonthInfo | null;
  contribution: Contribution | null;
  onSave: (data: {
    id: string;
    amount_paid: number;
    status: 'PAID' | 'PENDING' | 'PARTIAL' | 'EXCUSED';
    paid_date?: string;
    payment_method?: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Other';
    reference_no?: string;
    notes?: string;
  }) => Promise<void>;
}

export default function PaymentModal({
  isOpen,
  onClose,
  member,
  month,
  contribution,
  onSave,
}: PaymentModalProps) {
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [status, setStatus] = useState<'PAID' | 'PENDING' | 'PARTIAL' | 'EXCUSED'>('PAID');
  const [paidDate, setPaidDate] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<
    'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Other'
  >('UPI');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (contribution) {
      setAmountPaid(contribution.status === 'PAID' ? contribution.amount_paid : contribution.amount_due);
      setStatus(contribution.status === 'EXCUSED' ? 'EXCUSED' : contribution.status === 'PENDING' ? 'PAID' : contribution.status);
      setPaidDate(contribution.paid_date || new Date().toISOString().split('T')[0]);
      setPaymentMethod((contribution.payment_method as any) || 'UPI');
      setReferenceNo(contribution.reference_no || '');
      setNotes(contribution.notes || '');
    }
  }, [contribution]);

  if (!isOpen || !member || !month || !contribution) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave({
        id: contribution.id,
        amount_paid: Number(amountPaid),
        status,
        paid_date: status === 'PAID' || status === 'PARTIAL' ? paidDate : undefined,
        payment_method: paymentMethod,
        reference_no: referenceNo,
        notes,
      });
      onClose();
    } catch (err) {
      alert('Error updating payment: ' + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAmountChange = (val: number) => {
    setAmountPaid(val);
    if (val >= contribution.amount_due && contribution.amount_due > 0) {
      setStatus('PAID');
    } else if (val > 0) {
      setStatus('PARTIAL');
    } else {
      setStatus('PENDING');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {month.name} {month.year}
            </span>
            <h3 className="text-lg font-bold mt-1">Record Monthly Savings</h3>
            <p className="text-xs text-slate-300">{member.name} ({member.phone})</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Target Due summary */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500">Scheduled Due Amount</span>
              <p className="text-base font-bold text-slate-900">
                {formatCurrency(contribution.amount_due)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500">Member Shares</span>
              <p className="text-sm font-semibold text-slate-700">{member.shares} share(s)</p>
            </div>
          </div>

          {/* Amount Paid */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Amount Paid (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">₹</span>
              <input
                type="number"
                min="0"
                step="50"
                value={amountPaid}
                onChange={(e) => handleAmountChange(Number(e.target.value))}
                className="w-full pl-8 pr-3 py-2 text-sm font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Status
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['PAID', 'PARTIAL', 'PENDING', 'EXCUSED'] as const).map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => {
                    setStatus(s);
                    if (s === 'PAID') setAmountPaid(contribution.amount_due);
                    if (s === 'PENDING') setAmountPaid(0);
                  }}
                  className={`py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                    status === s
                      ? s === 'PAID'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : s === 'PARTIAL'
                        ? 'bg-amber-500 text-white border-amber-500'
                        : s === 'EXCUSED'
                        ? 'bg-slate-500 text-white border-slate-500'
                        : 'bg-rose-500 text-white border-rose-500'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {status !== 'PENDING' && status !== 'EXCUSED' && (
            <>
              {/* Payment Date & Mode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={paidDate}
                    onChange={(e) => setPaidDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                  >
                    <option value="UPI">UPI (GPay/PhonePe/Paytm)</option>
                    <option value="Cash">Cash in Hand</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Reference / UTR Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reference / UTR / Receipt No. (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref: 3123849102"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Admin Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Paid in cash at monthly meeting"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
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
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : 'Save Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
