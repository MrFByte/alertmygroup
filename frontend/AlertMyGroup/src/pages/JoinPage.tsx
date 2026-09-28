import { useState } from 'react';
import { useLocation } from 'wouter';
import Header from '../components/Header';
import NeumorphicButton from '../components/NeumorphicButton';
import { ApiError } from '../api/client';
import type { Theme } from '../types';
import type { useLocalChannels } from '../hooks/useLocalChannels';

type LocalChannels = ReturnType<typeof useLocalChannels>;

interface Props {
  code: string;
  theme: Theme;
  onToggleTheme: () => void;
  localChannels: LocalChannels;
  onJoin: (code: string, password: string, displayName: string) => Promise<void>;
}

export default function JoinPage({ code, theme, onToggleTheme, localChannels, onJoin }: Props) {
  const [, navigate] = useLocation();
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const existing = localChannels.get(code);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      await onJoin(code, password, displayName.trim());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Wrong password — ask whoever invited you to confirm it.');
      } else if (err instanceof ApiError && err.status === 404) {
        setError('Channel not found — double-check the code.');
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  // If already a member, go straight to channel
  if (existing) {
    navigate(`/c/${code}`, { replace: true });
    return null;
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <Header theme={theme} onToggleTheme={onToggleTheme} onBack={() => navigate('/')} />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-sm mx-auto w-full">
        <div className="w-full space-y-6">
          {/* Icon */}
          <div className="text-center">
            <div className="w-20 h-20 rounded-3xl nm-flat mx-auto mb-4 flex items-center justify-center">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-nm-accent">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/>
                <line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-nm">Join Channel</h1>
            <p className="text-nm-muted text-sm mt-1">
              Code: <span className="font-mono font-bold text-nm-accent">{code}</span>
            </p>
          </div>

          {/* Form */}
          <div className="nm-flat rounded-3xl p-5 space-y-4">
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-nm-muted text-xs font-semibold uppercase tracking-wide">
                  Your name
                </label>
                <input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="How should we call you?"
                  maxLength={30}
                  autoFocus
                  className="nm-input w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
                />
                <p className="text-nm-muted text-xs">
                  Using the same name again logs you back in as yourself.
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-nm-muted text-xs font-semibold uppercase tracking-wide">
                  Channel password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Ask whoever invited you"
                  maxLength={100}
                  className="nm-input w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
                />
              </div>
              {error && <p className="text-nm-danger text-xs">{error}</p>}
              <NeumorphicButton
                type="submit"
                variant="accent"
                fullWidth
                disabled={!displayName.trim() || !password || loading}
              >
                {loading ? 'Joining…' : 'Join Channel'}
              </NeumorphicButton>
            </form>
          </div>

          <p className="text-center text-nm-muted text-xs">
            By joining you agree to receive alerts from this group.
          </p>
        </div>
      </main>
    </div>
  );
}
