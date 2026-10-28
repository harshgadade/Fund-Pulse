'use client';

import React, { useState, useEffect } from 'react';
import { X, UserPlus, Check, Users, Percent, AlertCircle } from 'lucide-react';
import { MonthInfo } from '@/lib/types';

interface NewMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  months: MonthInfo[];
  initialType?: 'REGULAR' | 'EXTERNAL';
  onAddMember: (data: {
    name: string;
    phone: string;
    email?: string;
    shares?: number;
    member_type?: 'REGULAR' | 'EXTERNAL';
    joined_month_index?: number;
    notes?: string;
  }) => Promise<any>;
}

export default function NewMemberModal({
  isOpen,
  onClose,
  months,
  initialType = 'REGULAR',
  onAddMember,
}: NewMemberModalProps) {
  const [memberType, setMemberType] = useState<'REGULAR' | 'EXTERNAL'>(initialType);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [shares, setShares] = useState(1);
  const [joinedMonthIndex, setJoinedMonthIndex] = useState(0); // 0 = May
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMemberType(initialType);
    }
  }, [isOpen, initialType]);

  if (!isOpen) return null;

  const isExternal = memberType === 'EXTERNAL';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please provide a name');
      return;
    }
    setIsSubmitting(true);
    try {
      await onAddMember({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        shares: isExternal ? 0 : Number(shares),
        member_type: memberType,
        joined_month_index: isExternal ? 0 : Number(joinedMonthIndex),
        notes: notes.trim() || undefined,
      });
      // reset
      setName('');
      setPhone('');
      setEmail('');
      setShares(1);
      setJoinedMonthIndex(0);
      setNotes('');
      onClose();
    } catch (err) {
      alert('Error adding: ' + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full my-6 overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div
          className={`text-white p-5 flex items-center justify-between transition-colors ${
            isExternal
              ? 'bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950'
              : 'bg-gradient-to-r from-slate-900 to-slate-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isExternal ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {isExternal ? <Percent className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold">
                {isExternal ? 'Add External Borrower' : 'Add Fund Member'}
              </h3>
              <p className="text-xs text-slate-300">
                {isExternal
                  ? 'Non-fund borrower eligible for 5% loans'
                  : 'Enrolls a new member into the current fund cycle'}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Member Type Selection Segment */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Profile Type
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setMemberType('REGULAR')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  !isExternal
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Fund Member</span>
              </button>

              <button
                type="button"
                onClick={() => setMemberType('EXTERNAL')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  isExternal
                    ? 'bg-white text-indigo-900 shadow-xs ring-1 ring-indigo-200'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Percent className="w-3.5 h-3.5 text-indigo-600" />
                <span>External Borrower</span>
              </button>
            </div>
          </div>

          {/* External Notice */}
          {isExternal && (
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-indigo-900 leading-relaxed">
                <strong>Non-Fund Member:</strong> External borrowers do not pay monthly fund contributions and hold 0 shares. You can issue them loans at <strong>5% interest</strong>, and their repayments add directly to the fund profit pool!
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              placeholder={isExternal ? 'e.g. Ramesh Patel (Outside Borrower)' : 'e.g. Ramesh Kumar'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            />
          </div>

          <div className={`grid ${!isExternal ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {!isExternal && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Shares (Units) *
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={shares}
                  onChange={(e) => setShares(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address (Optional)
            </label>
            <input
              type="email"
              placeholder="e.g. ramesh@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {!isExternal && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Joined In Month
              </label>
              <select
                value={joinedMonthIndex}
                onChange={(e) => setJoinedMonthIndex(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {months.map((m) => (
                  <option key={m.month_index} value={m.month_index}>
                    {m.name} {m.year} {m.month_index === 0 ? '(Cycle Start)' : ''}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Months prior to this will be marked EXCUSED automatically.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes / Reference / Address (Optional)
            </label>
            <input
              type="text"
              placeholder={isExternal ? 'e.g. Outside business loan, guarantor name, address' : 'e.g. Nominee name, reference or address'}
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
                isExternal
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <Check className="w-4 h-4" />
              {isSubmitting
                ? 'Saving...'
                : isExternal
                ? 'Add External Borrower'
                : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
