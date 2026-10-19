import React, { useState, useEffect } from 'react';
import { TestCode } from '../../types';
import { dbService } from '../../services/db';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  ArrowLeft,
  Search,
  Filter,
  Sparkles,
  Link,
  ShieldCheck,
} from 'lucide-react';

interface TestCodesManagerProps {
  onBack: () => void;
}

export const TestCodesManager: React.FC<TestCodesManagerProps> = ({ onBack }) => {
  const [codes, setCodes] = useState<TestCode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [newCodeCustom, setNewCodeCustom] = useState<string>('');
  const [candidateNameInput, setCandidateNameInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Filter
  const [search, setSearch] = useState<string>('');
  const [filterUsed, setFilterUsed] = useState<string>('all');

  const loadCodes = async () => {
    setLoading(true);
    try {
      const list = await dbService.getTestCodes();
      setCodes(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCodes();
  }, []);

  // Helper to generate random 8-character code
  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = 'DE-';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCodeCustom(result);
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let codeToUse = newCodeCustom.trim().toUpperCase();
    if (!codeToUse) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      codeToUse = 'DE-';
      for (let i = 0; i < 6; i++) {
        codeToUse += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }

    try {
      await dbService.createTestCode(codeToUse, candidateNameInput);
      setNewCodeCustom('');
      setCandidateNameInput('');
      await loadCodes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create code');
    }
  };

  const handleDeleteCode = async (id: string) => {
    if (confirm('Are you sure you want to delete this unused test code?')) {
      await dbService.deleteTestCode(id);
      await loadCodes();
    }
  };

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyInviteLink = (id: string, code: string) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const inviteUrl = `${baseUrl}?code=${code}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const filteredCodes = codes.filter((c) => {
    const matchesSearch =
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      (c.candidate_name && c.candidate_name.toLowerCase().includes(search.toLowerCase()));

    const matchesFilter =
      filterUsed === 'all' ||
      (filterUsed === 'used' && c.used) ||
      (filterUsed === 'unused' && !c.used);

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Back */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-400 hover:text-white transition-colors cursor-pointer mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-2xl font-bold text-white tracking-tight">Test Codes Management</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Generate secure test access codes to distribute to candidates.
          </p>
        </div>
      </div>

      {/* Code Generation Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-blue-400" />
          <h2 className="text-base font-bold text-white">Generate New Test Code</h2>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateCode} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Custom Code (or Auto-Generate)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. DE-9K2M4P"
                value={newCodeCustom}
                onChange={(e) => setNewCodeCustom(e.target.value.toUpperCase())}
                maxLength={16}
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 uppercase"
              />
              <button
                type="button"
                onClick={generateRandomCode}
                className="absolute right-2 top-2 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20"
                title="Generate Random Code"
              >
                Auto
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Candidate Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Maya Lin"
              value={candidateNameInput}
              onChange={(e) => setCandidateNameInput(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Access Code</span>
            </button>
          </div>
        </form>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search test codes or candidate names..."
            className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterUsed}
            onChange={(e) => setFilterUsed(e.target.value)}
            className="bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Codes ({codes.length})</option>
            <option value="unused">Unused Only ({codes.filter((c) => !c.used).length})</option>
            <option value="used">Used Only ({codes.filter((c) => c.used).length})</option>
          </select>
        </div>
      </div>

      {/* Codes Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm text-slate-300">
            <thead>
              <tr className="bg-slate-800/80 border-b border-slate-700 text-slate-400 uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4">Test Code</th>
                <th className="py-3 px-4">Assigned Candidate</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date Created</th>
                <th className="py-3 px-4 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Loading test codes...
                  </td>
                </tr>
              ) : filteredCodes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No codes found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredCodes.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white text-sm">
                      <span className="bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-800/50 text-blue-300">
                        {item.code}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {item.candidate_name ? (
                        <span className="font-semibold text-slate-200">{item.candidate_name}</span>
                      ) : (
                        <span className="text-slate-500 italic">Unassigned (Open)</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {item.used ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30">
                          Used
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                          Active &amp; Ready
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleCopyCode(item.id, item.code)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors inline-flex items-center gap-1"
                        title="Copy code text"
                      >
                        {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedId === item.id ? 'Copied' : 'Copy'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyInviteLink(item.id, item.code)}
                        className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-medium rounded-lg border border-blue-500/30 transition-colors inline-flex items-center gap-1"
                        title="Copy direct invite URL"
                      >
                        {copiedLink === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link className="w-3.5 h-3.5" />}
                        <span>{copiedLink === item.id ? 'Link Copied' : 'Invite Link'}</span>
                      </button>

                      {!item.used && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCode(item.id)}
                          className="px-2 py-1 bg-slate-800 hover:bg-rose-900/30 text-rose-300 text-xs rounded-lg border border-slate-700 hover:border-rose-500/50 transition-colors inline-flex items-center"
                          title="Delete unused code"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
