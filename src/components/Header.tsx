import React from 'react';
import { Volume2, ShieldCheck, UserCheck, ShieldAlert } from 'lucide-react';

interface HeaderProps {
  currentView: 'candidate' | 'admin';
  onNavigate: (view: 'candidate' | 'admin') => void;
  candidateName?: string;
  inTestMode?: boolean;
  warningsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  candidateName,
  inTestMode = false,
  warningsCount = 0,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white shadow-md select-none sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-inner font-bold text-lg tracking-wider">
            DE
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white">Dimension Education</span>
              <span className="hidden sm:inline-block text-xs uppercase font-semibold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
                Verbal Test
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Versant-Style Spoken English Assessment</p>
          </div>
        </div>

        {/* Center Test State Status if candidate is in live test */}
        {inTestMode ? (
          <div className="flex items-center gap-3 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-medium truncate max-w-[120px] sm:max-w-[180px]">{candidateName}</span>
            </div>
            <div className="h-4 w-px bg-slate-700" />
            <div className="flex items-center gap-1 text-xs">
              <ShieldAlert className={`w-3.5 h-3.5 ${warningsCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
              <span className={warningsCount > 0 ? 'text-amber-300 font-semibold' : 'text-slate-400'}>
                Warnings: {warningsCount}/2
              </span>
            </div>
          </div>
        ) : (
          /* View switch (Candidate test vs Admin portal) */
          <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              type="button"
              onClick={() => onNavigate('candidate')}
              className={`px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                currentView === 'candidate'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              Candidate View
            </button>
            <button
              type="button"
              onClick={() => onNavigate('admin')}
              className={`px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                currentView === 'admin'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Portal</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
