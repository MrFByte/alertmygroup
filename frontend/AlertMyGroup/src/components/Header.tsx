import ThemeToggle from './ThemeToggle';
import type { Theme } from '../types';

interface Props {
  theme: Theme;
  onToggleTheme: () => void;
  onBack?: () => void;
  title?: string;
}

export default function Header({ theme, onToggleTheme, onBack, title }: Props) {
  return (
    <header
      className="flex items-center justify-between px-4 pb-3 sticky top-0 z-10 bg-nm"
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
    >
      <div className="flex items-center gap-3 min-w-0">
        {onBack ? (
          <button
            onClick={onBack}
            aria-label="Go back"
            className="nm-btn w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 focus:outline-none"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-nm-accent">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-xl nm-flat-sm flex items-center justify-center"
              style={{ background: 'var(--nm-bg)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-nm-accent" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            <span className="font-bold text-nm text-base tracking-tight">AlertMyGroup</span>
          </div>
        )}
        {title && onBack && (
          <span className="font-semibold text-nm text-base truncate">{title}</span>
        )}
      </div>
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
    </header>
  );
}
