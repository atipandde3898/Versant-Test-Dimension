import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/db';
import { Candidate, TestCode } from '../../types';
import { ShieldCheck, ArrowRight, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

interface CandidateWelcomeProps {
  onSuccess: (candidate: Candidate) => void;
  initialCode?: string;
}

export const CandidateWelcome: React.FC<CandidateWelcomeProps> = ({ onSuccess, initialCode = '' }) => {
  const [fullName, setFullName] = useState('');
  const [testCode, setTestCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableCodes, setAvailableCodes] = useState<TestCode[]>([]);

  useEffect(() => {
    // Check url params or preloaded codes
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code');
    if (codeParam) {
      setTestCode(codeParam.toUpperCase());
    }

    dbService.getTestCodes().then((codes) => {
      const unused = codes.filter((c) => !c.used);
      setAvailableCodes(unused);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = fullName.trim();
    const cleanCode = testCode.trim().toUpperCase();

    if (!cleanName) {
      setError('Please enter your full legal name.');
      return;
    }
    if (!cleanCode) {
      setError('Please enter your 8-character test code.');
      return;
    }

    setLoading(true);

    try {
      // Validate code
      const validation = await dbService.validateTestCode(cleanCode);
      if (!validation.valid || !validation.codeRecord) {
        setError(validation.message || 'Invalid test code.');
        setLoading(false);
        return;
      }

      // Check if this candidate already has an in-progress record with this code
      const candidates = await dbService.getCandidates();
      const existing = candidates.find(
        (c) => c.test_code === cleanCode && (c.status === 'in_progress' || c.status === 'not_started')
      );

      if (existing) {
        onSuccess(existing);
        return;
      }

      // Create new candidate
      const newCandidate: Candidate = {
        id: 'cand_' + Math.random().toString(36).substring(2, 10),
        full_name: cleanName,
        test_code: cleanCode,
        status: 'in_progress',
        warning_count: 0,
        started_at: new Date().toISOString(),
        current_question_index: 0,
      };

      await dbService.createCandidate(newCandidate);
      await dbService.markCodeUsed(cleanCode, newCandidate.id);

      onSuccess(newCandidate);
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (code: string, name?: string) => {
    setTestCode(code);
    if (name) {
      setFullName(name);
    } else if (!fullName) {
      setFullName('Alex Morgan');
    }
    setError(null);
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 text-white">
        {/* Header Icon & Brand */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Candidate Sign-In</h1>
          <p className="text-sm text-slate-400 mt-1">
            Dimension Education Spoken English Verbal Communication Test
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Full Legal Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Test Code <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={testCode}
              onChange={(e) => setTestCode(e.target.value.toUpperCase())}
              placeholder="e.g. DE-START1"
              maxLength={16}
              className="w-full px-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white font-mono tracking-wider placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors uppercase"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2 text-sm">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Validating Credentials...
              </span>
            ) : (
              <>
                <span>Continue to Instructions</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Test Code Pills for fast testing */}
        {availableCodes.length > 0 && (
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-medium">Quick Test: Click an available code below:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableCodes.slice(0, 3).map((code) => (
                <button
                  key={code.id}
                  type="button"
                  onClick={() => handleQuickFill(code.code, code.candidate_name)}
                  className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-blue-900/40 text-blue-300 border border-slate-700 hover:border-blue-500/50 rounded-lg font-mono transition-all flex items-center gap-1"
                >
                  <span>{code.code}</span>
                  {code.candidate_name && <span className="text-slate-400 font-sans">({code.candidate_name})</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 text-center">
          <p className="text-xs text-slate-500">
            Dimension Education • Powered by Secure Assessment Proctoring
          </p>
        </div>
      </div>
    </div>
  );
};
