import React from 'react';
import { NavView } from '../types';

interface TopBarProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  onPrimaryAction: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentView,
  onNavigate,
  onPrimaryAction,
}) => {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-8 px-6 py-4 bg-white/95 dark:bg-[#0A092D]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#2E3856] transition-colors">
      {/* Zone 1: Single text element wordmark */}
      <button
        onClick={() => onNavigate('dashboard')}
        className="text-2xl font-extrabold tracking-tight text-[#4257B2] dark:text-white whitespace-nowrap shrink-0 cursor-pointer focus:outline-none"
      >
        NVM
      </button>

      {/* Zone 2: 4 concise single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-7 text-base font-semibold text-slate-600 dark:text-slate-300">
        <button
          onClick={() => onNavigate('dashboard')}
          className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
            currentView === 'dashboard'
              ? 'text-[#4257B2] dark:text-white border-[#4257B2] dark:border-indigo-400'
              : 'border-transparent hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Thư viện
        </button>
        <button
          onClick={() => onNavigate('pdf-ai')}
          className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
            currentView === 'pdf-ai'
              ? 'text-[#4257B2] dark:text-white border-[#4257B2] dark:border-indigo-400'
              : 'border-transparent hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Tạo từ PDF (AI)
        </button>
        <button
          onClick={() => onNavigate('create')}
          className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
            currentView === 'create'
              ? 'text-[#4257B2] dark:text-white border-[#4257B2] dark:border-indigo-400'
              : 'border-transparent hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Tạo thủ công
        </button>
        <button
          onClick={() => onNavigate('study')}
          className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
            currentView === 'study'
              ? 'text-[#4257B2] dark:text-white border-[#4257B2] dark:border-indigo-400'
              : 'border-transparent hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Chế độ học
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center shrink-0">
        <button
          onClick={onPrimaryAction}
          className="px-5 py-2.5 text-sm font-bold text-white bg-[#4257B2] hover:bg-[#344696] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
        >
          Tạo thẻ từ PDF
        </button>
      </div>
    </header>
  );
};
