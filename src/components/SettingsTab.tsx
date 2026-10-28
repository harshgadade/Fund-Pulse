'use client';

import React, { useState } from 'react';
import {
  Settings,
  Calendar,
  Database,
  Download,
  Upload,
  Sparkles,
  Check,
  PlusCircle,
  AlertTriangle,
  RefreshCw,
  Info,
} from 'lucide-react';
import { FundCycle } from '@/lib/types';
import { formatCurrency } from '@/lib/cycle-utils';

interface SettingsTabProps {
  cycles: FundCycle[];
  activeCycle: FundCycle | null;
  onCycleChange: (id: string) => void;
  onCreateCycle: (data: {
    name: string;
    start_year: number;
    monthly_amount: number;
    default_interest_rate: number;
    notes?: string;
  }) => Promise<void>;
  onSeedDemo: () => Promise<void>;
  isSeeding: boolean;
  onRefresh: () => void;
}

export default function SettingsTab({
  cycles,
  activeCycle,
  onCycleChange,
  onCreateCycle,
  onSeedDemo,
  isSeeding,
  onRefresh,
}: SettingsTabProps) {
  // New cycle form
  const [showNewCycleModal, setShowNewCycleModal] = useState(false);
  const [newCycleName, setNewCycleName] = useState('FY 2027-2028');
  const [newStartYear, setNewStartYear] = useState(2027);
  const [newMonthlyAmount, setNewMonthlyAmount] = useState(1000);
  const [newInterestRate, setNewInterestRate] = useState(3.0);
  const [newNotes, setNewNotes] = useState('');
  const [isSubmittingCycle, setIsSubmittingCycle] = useState(false);

  // Backup / Restore
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleDownloadBackup = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/backup');
      if (!res.ok) throw new Error('Backup failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fund_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Failed to download backup: ' + (err as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      !confirm(
        'Warning: Restoring backup data will REPLACE current database records. Are you sure you wish to continue?'
      )
    ) {
      e.target.value = '';
      return;
    }

    setIsImporting(true);
    setImportStatus('Restoring database from backup file...');
    try {
      const text = await file.text();
      const json = JSON.parse(text);

      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Restore failed');

      alert('Database restored successfully!');
      onRefresh();
    } catch (err) {
      alert('Restore failed: ' + (err as Error).message);
    } finally {
      setIsImporting(false);
      setImportStatus(null);
      e.target.value = '';
    }
  };

  const handleCreateCycleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCycleName.trim() || !newStartYear || !newMonthlyAmount) {
      alert('Please fill out all required fields');
      return;
    }

    setIsSubmittingCycle(true);
    try {
      await onCreateCycle({
        name: newCycleName.trim(),
        start_year: Number(newStartYear),
        monthly_amount: Number(newMonthlyAmount),
        default_interest_rate: Number(newInterestRate),
        notes: newNotes.trim() || undefined,
      });
      setShowNewCycleModal(false);
    } catch (err) {
      alert('Failed to create cycle: ' + (err as Error).message);
    } finally {
      setIsSubmittingCycle(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Fund Settings & Backup</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage 12-month fiscal fund cycles, export JSON backups, and populate test records.
        </p>
      </div>

      {/* Cycle Configuration */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Fund Cycles (May to April)</h3>
              <p className="text-xs text-slate-500">Each cycle operates for exactly 12 months</p>
            </div>
          </div>
          <button
            onClick={() => setShowNewCycleModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            New Cycle
          </button>
        </div>

        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
          {cycles.map((c) => {
            const isActive = activeCycle?.id === c.id;
            return (
              <div
                key={c.id}
                className={`p-4 flex items-center justify-between transition-colors ${
                  isActive ? 'bg-emerald-50/50' : 'hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{c.name}</span>
                    {isActive && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    12 Months: May {c.start_year} – April {c.start_year + 1} •{' '}
                    {formatCurrency(c.monthly_amount)}/share monthly • {c.default_interest_rate}% loan interest
                  </p>
                </div>

                {!isActive && (
                  <button
                    onClick={() => onCycleChange(c.id)}
                    className="px-3 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors"
                  >
                    Switch to this Cycle
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Backup and Restore */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">Database Backup & Recovery</h3>
            <p className="text-xs text-slate-500">Export or restore all members, contributions, and loans</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Export */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between space-y-3">
            <div>
              <p className="text-xs font-bold text-slate-800">Download Data Backup</p>
              <p className="text-xs text-slate-500 mt-1">
                Saves a full JSON dump of all cycles, member records, payment matrix, and loan entries.
              </p>
            </div>
            <button
              onClick={handleDownloadBackup}
              disabled={isExporting}
              className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              {isExporting ? 'Generating Backup...' : 'Export JSON Backup'}
            </button>
          </div>

          {/* Import */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between space-y-3">
            <div>
              <p className="text-xs font-bold text-slate-800">Restore from JSON</p>
              <p className="text-xs text-slate-500 mt-1">
                Upload a previously saved JSON backup file to overwrite and restore database state.
              </p>
            </div>
            <label className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg shadow-2xs transition-colors cursor-pointer text-center">
              <Upload className="w-3.5 h-3.5 text-indigo-600" />
              {isImporting ? 'Restoring...' : 'Upload & Restore File'}
              <input
                type="file"
                accept=".json"
                onChange={handleRestoreFile}
                disabled={isImporting}
                className="hidden"
              />
            </label>
          </div>
        </div>
        {importStatus && <p className="text-xs text-indigo-600 font-medium">{importStatus}</p>}
      </div>

      {/* Demo Seed Reset */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Fund Members Seeder</h3>
              <p className="text-xs text-slate-500">Reset or initialize with the 19 original members & shares</p>
            </div>
          </div>
          <button
            onClick={onSeedDemo}
            disabled={isSeeding}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isSeeding ? 'Seeding Data...' : 'Reset to 19 Members'}
          </button>
        </div>
      </div>

      {/* Modal to Create New Cycle */}
      {showNewCycleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Create New Fund Cycle</h3>
                <p className="text-xs text-slate-300">12-Month Period (May to April)</p>
              </div>
              <button
                onClick={() => setShowNewCycleModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCycleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cycle Name *
                </label>
                <input
                  type="text"
                  value={newCycleName}
                  onChange={(e) => setNewCycleName(e.target.value)}
                  placeholder="e.g. FY 2027-2028"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Year (May) *
                  </label>
                  <input
                    type="number"
                    min="2020"
                    max="2040"
                    value={newStartYear}
                    onChange={(e) => setNewStartYear(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-slate-400">Ends in March {newStartYear + 1}</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monthly Amt / Share (₹) *
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={newMonthlyAmount}
                    onChange={(e) => setNewMonthlyAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Default Loan Interest Rate (% / Month) *
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.1"
                  value={newInterestRate}
                  onChange={(e) => setNewInterestRate(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Next annual fund series"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewCycleModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCycle}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {isSubmittingCycle ? 'Creating...' : 'Create Cycle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
