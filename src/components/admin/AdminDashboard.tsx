import React, { useState, useEffect, useMemo } from 'react';
import { Candidate, Question, Score } from '../../types';
import { dbService } from '../../services/db';
import {
  createBulkCandidatesZip,
  downloadCandidatesReportCsv,
} from '../../services/zipExport';
import {
  Users,
  Search,
  Filter,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Key,
  HelpCircle,
  LogOut,
  ChevronRight,
  ShieldAlert,
  FileSpreadsheet,
  Archive,
  RefreshCw,
} from 'lucide-react';

interface AdminDashboardProps {
  onSelectCandidate: (candidate: Candidate) => void;
  onLogout: () => void;
  onNavigateToCodes: () => void;
  onNavigateToQuestions: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onSelectCandidate,
  onLogout,
  onNavigateToCodes,
  onNavigateToQuestions,
}) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [allScores, setAllScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Export progress
  const [zipProgress, setZipProgress] = useState<{ active: boolean; percent: number; text: string }>({
    active: false,
    percent: 0,
    text: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [cands, qs] = await Promise.all([
        dbService.getCandidates(),
        dbService.getQuestions(),
      ]);
      setCandidates(cands);
      setQuestions(qs);

      // Fetch all scores for reporting
      const scoresPromises = cands.map((c) => dbService.getScoresForCandidate(c.id));
      const scoresResults = await Promise.all(scoresPromises);
      setAllScores(scoresResults.flat());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const matchesSearch =
        c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.test_code.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'submitted' && c.status === 'submitted') ||
        (statusFilter === 'auto_submitted' && c.status === 'auto_submitted') ||
        (statusFilter === 'in_progress' && c.status === 'in_progress');

      return matchesSearch && matchesStatus;
    });
  }, [candidates, searchQuery, statusFilter]);

  // Overall Stats
  const totalCandidates = candidates.length;
  const submittedCount = candidates.filter((c) => c.status === 'submitted').length;
  const autoSubmittedCount = candidates.filter((c) => c.status === 'auto_submitted').length;
  const scoredCandidates = candidates.filter((c) => c.total_score != null);
  const avgScore = scoredCandidates.length
    ? Math.round(
        scoredCandidates.reduce((acc, curr) => acc + (curr.total_score || 0), 0) / scoredCandidates.length
      )
    : 0;

  // Toggle select all
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredCandidates.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Download filtered candidates report CSV
  const handleDownloadCsv = () => {
    downloadCandidatesReportCsv(filteredCandidates, allScores, questions);
  };

  // Bulk download ZIP for selected candidates
  const handleDownloadSelectedZip = async () => {
    const selectedCandidates = candidates.filter((c) => selectedIds.includes(c.id));
    if (!selectedCandidates.length) return;

    setZipProgress({ active: true, percent: 10, text: 'Preparing archive...' });

    try {
      const zipBlob = await createBulkCandidatesZip(
        selectedCandidates,
        questions,
        async (candidateId) => {
          const [responses, scores] = await Promise.all([
            dbService.getResponsesForCandidate(candidateId),
            dbService.getScoresForCandidate(candidateId),
          ]);
          return { responses, scores };
        },
        (percent, text) => {
          setZipProgress({ active: true, percent, text });
        }
      );

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Dimension_Education_Recordings_Bulk_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      console.error('Failed to create bulk zip:', err);
    } finally {
      setZipProgress({ active: false, percent: 0, text: '' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Bar with Navigation Tabs & Logout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Examiner Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Review audio recordings, grade communication rubric scores, and generate test reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onNavigateToCodes}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium rounded-xl border border-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Key className="w-4 h-4 text-blue-400" />
            <span>Test Codes</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToQuestions}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium rounded-xl border border-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-blue-400" />
            <span>Questions Manager</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="px-3.5 py-2 bg-slate-800 hover:bg-rose-900/30 text-rose-300 text-xs sm:text-sm font-medium rounded-xl border border-slate-700 hover:border-rose-500/50 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Progress modal for bulk zip build */}
      {zipProgress.active && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-700 rounded-2xl p-6 text-white space-y-4 text-center">
            <Archive className="w-10 h-10 text-blue-400 mx-auto animate-bounce" />
            <h3 className="text-lg font-bold">Building Recordings Archive</h3>
            <p className="text-xs text-slate-300">{zipProgress.text}</p>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
              <div
                className="bg-blue-600 h-full transition-all duration-200"
                style={{ width: `${zipProgress.percent}%` }}
              />
            </div>
            <p className="text-xs text-slate-400">{zipProgress.percent}% complete</p>
          </div>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Total Candidates</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white">{totalCandidates}</div>
          <p className="text-[11px] text-slate-500 mt-1">Enrolled assessment sessions</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Completed Tests</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-400">{submittedCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Normal submissions</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Proctor Auto-Submits</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-400">{autoSubmittedCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Reached 2 warnings</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Average Score</span>
            <span className="text-xs text-blue-400 font-bold">100%</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white">
            {avgScore > 0 ? `${avgScore}%` : 'Pending'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Across graded candidates</p>
        </div>
      </div>

      {/* Action / Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by candidate name or test code..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="auto_submitted">Auto-Submitted</option>
              <option value="in_progress">In Progress</option>
            </select>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleDownloadSelectedZip}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Download Selected ZIP ({selectedIds.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Download Report (CSV)</span>
          </button>

          <button
            type="button"
            onClick={loadData}
            title="Refresh candidates"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Candidates Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm text-slate-300">
            <thead>
              <tr className="bg-slate-800/80 border-b border-slate-700 text-slate-400 uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      filteredCandidates.length > 0 &&
                      selectedIds.length === filteredCandidates.length
                    }
                    onChange={handleSelectAll}
                    className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="py-3 px-4">Candidate Name</th>
                <th className="py-3 px-4">Test Code</th>
                <th className="py-3 px-4">Started / Submitted</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Warnings</th>
                <th className="py-3 px-4 text-center">Total Score</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
                      Loading candidates...
                    </span>
                  </td>
                </tr>
              ) : filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No candidates found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((c) => {
                  const isSelected = selectedIds.includes(c.id);
                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-800/50 transition-colors ${
                        isSelected ? 'bg-blue-900/10' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(c.id)}
                          className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                        />
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-white">
                        <div>{c.full_name}</div>
                        {c.email && <div className="text-[11px] text-slate-500 font-normal">{c.email}</div>}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-medium text-blue-300">
                        {c.test_code}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        <div>{new Date(c.started_at).toLocaleDateString()}</div>
                        <div className="text-[11px] text-slate-500">
                          {new Date(c.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {c.status === 'submitted' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            Submitted
                          </span>
                        )}
                        {c.status === 'auto_submitted' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            <AlertTriangle className="w-3 h-3" />
                            Auto-Submitted
                          </span>
                        )}
                        {c.status === 'in_progress' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30">
                            <Clock className="w-3 h-3" />
                            In Progress
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                            c.warning_count >= 2
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : c.warning_count === 1
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {c.warning_count} / 2
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {c.total_score != null ? (
                          <span className="font-bold text-sm text-white">
                            {c.total_score}%
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Ungraded</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onSelectCandidate(c)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>Review &amp; Score</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
