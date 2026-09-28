import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import Header from '../components/Header';
import { api } from '../api/client';
import type { Ring, Theme } from '../types';
import type { useLocalChannels } from '../hooks/useLocalChannels';

type LocalChannels = ReturnType<typeof useLocalChannels>;

interface Props {
  ringId: string;
  theme: Theme;
  onToggleTheme: () => void;
  localChannels: LocalChannels;
}

type Status = 'ringing' | 'accepted' | 'dismissed';

export default function RingPage({ ringId, theme, onToggleTheme, localChannels }: Props) {
  const [, navigate] = useLocation();
  const [ring] = useState<Ring | null>(null);
  const [status, setStatus] = useState<Status>('ringing');
  const [loading, setLoading] = useState(true);
  const [ackedNames] = useState<string[]>([]);

  const local = ring ? localChannels.get(ring.channelCode) : null;

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getChannel('__ring__', '').catch(() => null);
        void data; // channel load might fail without member context — that's okay
      } catch {}
      setLoading(false);
    }
    load();
    // Minimal: just mark as loaded after a beat
    setTimeout(() => setLoading(false), 600);
  }, [ringId]);

  const handleAccept = async () => {
    setStatus('accepted');
    if (!local) return;
    try {
      await api.ackRing(ringId, local.memberId);
    } catch {}
    // Navigate back after a moment
    setTimeout(() => {
      if (ring) navigate(`/c/${ring.channelCode}`);
      else navigate('/');
    }, 1800);
  };

  const handleDismiss = () => {
    setStatus('dismissed');
    setTimeout(() => navigate('/'), 800);
  };

  const isSender = ring ? local?.memberId === ring.senderId : false;

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--nm-bg)' }}>
      <Header theme={theme} onToggleTheme={onToggleTheme} onBack={() => navigate('/')} />

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8 relative overflow-hidden">

        {/* Ripple rings */}
        {status === 'ringing' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className={`absolute rounded-full ${i === 1 ? 'ring-ripple' : i === 2 ? 'ring-ripple-2' : 'ring-ripple-3'}`}
                style={{
                  width: 240,
                  height: 240,
                  background: 'var(--nm-accent-glow)',
                }}
              />
            ))}
          </div>
        )}

        <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-sm">
          {/* Central bell */}
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-36 h-36 rounded-full nm-flat-lg flex items-center justify-center"
              style={
                status === 'accepted'
                  ? { boxShadow: '0 0 0 4px var(--nm-success), 10px 10px 20px var(--nm-sd), -10px -10px 20px var(--nm-sl)' }
                  : status === 'dismissed'
                  ? { opacity: 0.5 }
                  : {}
              }
            >
              {status === 'accepted' ? (
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-nm-success">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : status === 'dismissed' ? (
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-nm-muted">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              ) : (
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-nm-accent">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              )}
            </div>

            <div className="text-center space-y-1">
              {status === 'accepted' && (
                <>
                  <p className="text-2xl font-bold text-nm-success">You're up!</p>
                  <p className="text-nm-muted text-sm">Heading back to channel…</p>
                </>
              )}
              {status === 'dismissed' && (
                <>
                  <p className="text-xl font-bold text-nm-muted">Dismissed</p>
                  <p className="text-nm-muted text-sm">Ring silenced</p>
                </>
              )}
              {status === 'ringing' && (
                <>
                  {loading ? (
                    <p className="text-nm-muted text-base">Loading ring…</p>
                  ) : ring ? (
                    <>
                      <p className="text-nm font-bold text-xl">{ring.senderName} is ringing!</p>
                      <p className="text-nm-muted text-sm">Channel · {ring.channelCode}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-nm font-bold text-xl">Incoming ring!</p>
                      <p className="text-nm-muted text-sm">Someone needs you</p>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Action buttons */}
          {status === 'ringing' && (
            <div className="flex gap-4 w-full">
              <button
                onClick={handleAccept}
                className="flex-1 nm-btn-success rounded-2xl py-4 flex flex-col items-center gap-1 focus:outline-none"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-nm-success">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span className="font-bold text-nm-success text-sm">I'm Up!</span>
              </button>
              <button
                onClick={handleDismiss}
                className="flex-1 nm-btn-danger rounded-2xl py-4 flex flex-col items-center gap-1 focus:outline-none"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-nm-danger">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <line x1="20" y1="20" x2="4" y2="4" strokeWidth="2"/>
                </svg>
                <span className="font-bold text-nm-danger text-sm">Turn Off</span>
              </button>
            </div>
          )}

          {/* Who's up already */}
          {ackedNames.length > 0 && (
            <div className="nm-pressed rounded-2xl p-3 w-full text-center">
              <p className="text-nm-muted text-xs">Already up: {ackedNames.join(', ')}</p>
            </div>
          )}

          {isSender && status === 'ringing' && (
            <div className="nm-pressed rounded-2xl p-3 w-full text-center">
              <p className="text-nm-muted text-sm">You sent this ring</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
