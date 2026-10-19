import React, { useState, useEffect } from 'react';
import { Monitor, AlertTriangle, X } from 'lucide-react';

export const MobileWarningBanner: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || '';
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isNarrowScreen = window.innerWidth < 768;
      setIsMobile(isMobileUA || isNarrowScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isMobile || dismissed) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-200 px-4 py-3 text-xs sm:text-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Monitor className="w-5 h-5 text-amber-400 shrink-0" />
          <p>
            <span className="font-semibold text-amber-300">Important for candidates:</span> Spoken English testing
            requires a laptop or desktop computer with Google Chrome and a working microphone. Mobile devices may not
            support fullscreen proctoring or high-quality audio recording.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-amber-400 hover:text-amber-200 p-1"
          title="Dismiss advisory"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
