import { useState } from 'react';
import { useLocation } from 'wouter';
import Header from '../components/Header';
import NeumorphicButton from '../components/NeumorphicButton';
import type { Theme } from '../types';
import type { useLocalChannels } from '../hooks/useLocalChannels';

type LocalChannels = ReturnType<typeof useLocalChannels>;

interface Props {
  theme: Theme;
  onToggleTheme: () => void;
  localChannels: LocalChannels;
  onCreateChannel: (channelName: string, password: string, displayName: string) => Promise<void>;
}

type Tab = 'create' | 'join';

const MIN_PASSWORD_LENGTH = 4;

export default function HomePage({ theme, onToggleTheme, localChannels, onCreateChannel }: Props) {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>('create');

  // Create form
  const [channelName, setChannelName] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Join form
  const [joinCode, setJoinCode] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim() || !displayName.trim() || password.length < MIN_PASSWORD_LENGTH) return;
    setLoading(true);
    setError('');
    try {
      await onCreateChannel(channelName.trim(), password, displayName.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    navigate(`/c/${code}`);
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <Header theme={theme} onToggleTheme={onToggleTheme} />

      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full space-y-6">
        {/* Hero */}
        <div className="text-center py-2">
          <div
            className="w-20 h-20 rounded-3xl nm-flat mx-auto mb-4 flex items-center justify-center"
          >
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-nm-accent">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-nm">AlertMyGroup</h1>
          <p className="text-nm-muted text-sm mt-1">One tap to wake everyone up</p>
        </div>

        {/* Tab selector */}
        <div className="nm-pressed rounded-2xl p-1 flex gap-1">
          {(['create', 'join'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              className={[
                'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 focus:outline-none',
                tab === t ? 'nm-flat text-nm-accent' : 'text-nm-muted',
              ].join(' ')}
            >
              {t === 'create' ? 'Create Channel' : 'Join Channel'}
            </button>
          ))}
        </div>

        {/* Form card */}
        <div className="nm-flat rounded-3xl p-5 space-y-4">
          {tab === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-nm-muted text-xs font-medium uppercase tracking-wide">
                  Channel name
                </label>
                <input
                  value={channelName}
                  onChange={e => setChannelName(e.target.value)}
                  placeholder="Morning Run, Gym Crew…"
                  maxLength={40}
                  className="nm-input w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-nm-muted text-xs font-medium uppercase tracking-wide">
                  Your name
                </label>
                <input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Alex"
                  maxLength={30}
                  className="nm-input w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-nm-muted text-xs font-medium uppercase tracking-wide">
                  Channel password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Share this with your group"
                  maxLength={100}
                  className="nm-input w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
                />
                <p className="text-nm-muted text-xs">
                  Anyone with the code and this password can join. At least {MIN_PASSWORD_LENGTH} characters.
                </p>
              </div>
              {error && <p className="text-nm-danger text-xs">{error}</p>}
              <NeumorphicButton
                type="submit"
                variant="accent"
                fullWidth
                disabled={!channelName.trim() || !displayName.trim() || password.length < MIN_PASSWORD_LENGTH || loading}
              >
                {loading ? 'Creating…' : 'Create Channel'}
              </NeumorphicButton>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-nm-muted text-xs font-medium uppercase tracking-wide">
                  Channel code
                </label>
                <input
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ABC123"
                  maxLength={10}
                  className="nm-input w-full rounded-xl px-4 py-3 text-sm font-mono tracking-widest focus:outline-none"
                />
              </div>
              <NeumorphicButton
                type="submit"
                variant="accent"
                fullWidth
                disabled={!joinCode.trim()}
              >
                Continue to Join
              </NeumorphicButton>
            </form>
          )}
        </div>

        {/* Saved channels */}
        {localChannels.channels.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-nm-muted text-xs font-semibold uppercase tracking-wider px-1">
              Your Channels
            </h2>
            <div className="space-y-3">
              {localChannels.channels.map(ch => (
                <div
                  key={ch.code}
                  className="nm-flat rounded-2xl p-4 flex items-center gap-3"
                >
                  <div className="nm-flat-sm w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-nm-accent">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-nm font-semibold text-sm truncate">{ch.channelName}</p>
                    <p className="text-nm-muted text-xs">{ch.name} · {ch.code}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/c/${ch.code}`)}
                      className="nm-btn px-3 py-2 rounded-xl text-xs font-semibold text-nm-accent focus:outline-none"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => localChannels.remove(ch.code)}
                      className="nm-btn w-8 h-8 rounded-xl flex items-center justify-center text-nm-muted focus:outline-none"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
