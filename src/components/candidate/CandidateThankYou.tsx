import React from 'react';
import { Candidate } from '../../types';
import { CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight, Home } from 'lucide-react';

interface CandidateThankYouProps {
  candidate: Candidate;
  onReset: () => void;
  onGoToAdmin: () => void;
}

export const CandidateThankYou: React.FC<CandidateThankYouProps> = ({
  candidate,
  onReset,
  onGoToAdmin,
}) => {
  const isAutoSubmitted = candidate.status === 'auto_submitted';

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-10 text-white text-center space-y-6">
        {isAutoSubmitted ? (
          <div className="w-16 h-16 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <AlertTriangle className="w-9 h-9" />
          </div>
        ) : (
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-9 h-9" />
          </div>
        )}

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {isAutoSubmitted ? 'Test Session Auto-Submitted' : 'Thank You! Test Submitted'}
          </h1>
          <p className="text-sm sm:text-base text-slate-300 mt-2 leading-relaxed">
            {isAutoSubmitted ? (
              <>
                Your test session was auto-submitted because <span className="text-amber-300 font-semibold">2 proctoring warnings</span> were reached. All responses recorded prior to submission have been saved.
              </>
            ) : (
              'Thank you. Your test has been submitted. Dimension Education will contact you with next steps.'
            )}
          </p>
        </div>

        {/* Candidate Session Card */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 text-left text-xs space-y-2">
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-400">Candidate Name:</span>
            <span className="font-semibold text-white">{candidate.full_name}</span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-400">Test Code:</span>
            <span className="font-mono text-blue-300 font-bold">{candidate.test_code}</span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-400">Submission Time:</span>
            <span>{candidate.submitted_at ? new Date(candidate.submitted_at).toLocaleTimeString() : 'Recorded'}</span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-400">Proctoring Warnings:</span>
            <span className={candidate.warning_count > 0 ? 'text-amber-400 font-semibold' : 'text-emerald-400'}>
              {candidate.warning_count} / 2
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-400">Evaluation Status:</span>
            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-medium">
              Awaiting Examiner Review
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={onGoToAdmin}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Open Admin Portal to Review &amp; Score</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onReset}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return to Candidate Home</span>
          </button>
        </div>

        <p className="text-xs text-slate-500">
          © Dimension Education • All audio recordings are retained securely for evaluation.
        </p>
      </div>
    </div>
  );
};
