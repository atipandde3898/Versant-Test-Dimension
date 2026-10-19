import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-6 text-xs select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>© Dimension Education. All rights reserved.</p>
        <p className="text-slate-500">
          Secure Spoken English Proctoring System • Chrome on Desktop / Laptop Recommended
        </p>
      </div>
    </footer>
  );
};
