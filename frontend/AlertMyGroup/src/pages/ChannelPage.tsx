import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import Header from '../components/Header';
import MemberCard from '../components/MemberCard';
import IncomingRingBanner from '../components/IncomingRingBanner';
import { api } from '../api/client';
import { setupPush } from '../push';
import type { Channel, Theme } from '../types';
import type { useLocalChannels } from '../hooks/useLocalChannels';

type LocalChannels = ReturnType<typeof useLocalChannels>;

const HOLD_THRESHOLD_MS = 350;
const MAX_RECORD_MS = 20_000;

function pickRecorderMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
  if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
  return '';
}

interface Props {
  code: string;
  theme: Theme;
  onToggleTheme: () => void;
  localChannels: LocalChannels;
}

export default function ChannelPage({ code, theme, onToggleTheme, localChannels }: Props) {
  const [, navigate] = useLocation();
  const local = localChannels.get(code);

  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [ringing, setRinging] = useState(false);
  const [ringSuccess, setRingSuccess] = useState(false);
  const [dismissedRingId, setDismissedRingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [pushNotice, setPushNotice] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const holdTimerRef = useRef<number | null>(null);
  const maxDurationTimerRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Redirect to join if not a member
  useEffect(() => {
    if (!local) {
      navigate(`/c/${code}`, { replace: true });
    }
  }, [local, code, navigate]);

  // Ask for push permission right after landing here (fresh join/create, or
  // a later visit if it was never granted). Calling this when permission is
  // already granted/denied is a no-op re: prompting, so it's safe to re-run.
  useEffect(() => {
    if (!local) return;
    setupPush(local.memberId).then(result => {
      if (result.status === 'unsupported') {
        setPushNotice("This browser doesn't support push notifications — AlertMyGroup still works while the app is open.");
      } else if (result.status === 'denied') {
        setPushNotice("Notifications are blocked, so you won't get alerts when the app is closed. Enable them in your browser settings for background alerts.");
      } else if (result.status === 'error') {
        setPushNotice("Couldn't set up push notifications — AlertMyGroup still works while the app is open.");
      }
    });
  }, [local]);

  const fetchChannel = useCallback(async () => {
    if (!local) return;
    try {
      const data = await api.getChannel(code, local.memberId);
      setChannel(data);
    } catch {
      setError('Could not load channel. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [code, local]);

  useEffect(() => {
    fetchChannel();
    const id = setInterval(fetchChannel, 10_000);
    return () => clearInterval(id);
  }, [fetchChannel]);

  const doSendRing = useCallback(async (audio?: Blob) => {
    if (!local) return;
    setRinging(true);
    setRingSuccess(false);
    try {
      await api.sendRing(code, local.memberId, audio);
      setRingSuccess(true);
      setTimeout(() => setRingSuccess(false), 3000);
    } catch {
      setError('Failed to send ring');
    } finally {
      setRinging(false);
    }
  }, [code, local]);

  const handleRing = useCallback(() => {
    doSendRing();
  }, [doSendRing]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickRecorderMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setIsRecording(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || 'audio/webm' });
        chunksRef.current = [];
        doSendRing(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      maxDurationTimerRef.current = window.setTimeout(() => {
        mediaRecorderRef.current?.stop();
      }, MAX_RECORD_MS);
    } catch {
      setError('Microphone access is needed to record a voice note.');
    }
  }, [doSendRing]);

  const stopRecording = useCallback(() => {
    if (maxDurationTimerRef.current !== null) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  }, []);

  // Quick tap = ring now; press and hold = record a voice note, sent on release.
  const handleRingPointerDown = () => {
    if (ringing || loading || isRecording) return;
    holdTimerRef.current = window.setTimeout(() => {
      holdTimerRef.current = null;
      startRecording();
    }, HOLD_THRESHOLD_MS);
  };

  const handleRingPointerUp = () => {
    if (holdTimerRef.current !== null) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
      handleRing();
      return;
    }
    if (isRecording) stopRecording();
  };

  const handleRingPointerCancel = () => {
    if (holdTimerRef.current !== null) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
      return;
    }
    if (isRecording) stopRecording();
  };

  const handleRingKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleRing();
    }
  };

  // Stop mic/timers if the page unmounts mid-recording
  useEffect(() => {
    return () => {
      if (holdTimerRef.current !== null) clearTimeout(holdTimerRef.current);
      if (maxDurationTimerRef.current !== null) clearTimeout(maxDurationTimerRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const handleAck = async () => {
    if (!local || !channel?.latestRing) return;
    try {
      await api.ackRing(channel.latestRing._id, local.memberId);
      navigate(`/r/${channel.latestRing._id}`);
    } catch {
      navigate(`/r/${channel.latestRing._id}`);
    }
  };

  const handleDismiss = () => {
    if (channel?.latestRing) setDismissedRingId(channel.latestRing._id);
  };

  const handleToggleMute = async () => {
    if (!local || !channel) return;
    const me = channel.members.find(m => m.id === local.memberId);
    if (!me) return;
    try {
      await api.setMute(!me.muted, local.memberId);
      await fetchChannel();
    } catch {
      setError('Failed to update mute');
    }
  };

  const handleCopyInvite = async () => {
    const url = `${location.origin}/c/${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (!local) return null;

  const me = channel?.members.find(m => m.id === local.memberId);
  const isMuted = me?.muted ?? false;

  const activeRing = channel?.latestRing;
  const showRingBanner =
    activeRing &&
    activeRing._id !== dismissedRingId &&
    activeRing.senderId !== local.memberId &&
    !activeRing.acks.some(a => a.memberId === local.memberId);

  return (
    <div className="min-h-dvh flex flex-col">
      <Header
        theme={theme}
        onToggleTheme={onToggleTheme}
        onBack={() => navigate('/')}
        title={channel?.name ?? code}
      />

      {/* Incoming ring banner */}
      {showRingBanner && activeRing && (
        <div className="px-4 pt-2">
          <IncomingRingBanner
            senderName={activeRing.senderName}
            channelName={channel?.name}
            onAccept={handleAck}
            onDismiss={handleDismiss}
          />
        </div>
      )}

      <main className="flex-1 flex flex-col items-center px-4 py-6 max-w-lg mx-auto w-full space-y-6">
        {error && (
          <div className="nm-flat rounded-2xl p-3 w-full text-center">
            <p className="text-nm-danger text-sm">{error}</p>
            <button onClick={() => setError('')} className="text-nm-muted text-xs mt-1 underline focus:outline-none">Dismiss</button>
          </div>
        )}

        {pushNotice && (
          <div className="nm-flat rounded-2xl p-3 w-full text-center">
            <p className="text-nm-muted text-sm">{pushNotice}</p>
            <button onClick={() => setPushNotice('')} className="text-nm-muted text-xs mt-1 underline focus:outline-none">Dismiss</button>
          </div>
        )}

        {/* Big ring button */}
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="relative flex items-center justify-center">
            {/* Ripple behind */}
            {(ringing || isRecording) && (
              <>
                <div className="absolute rounded-full ring-ripple" style={{ width: 180, height: 180, background: isRecording ? 'var(--nm-danger-glow)' : 'var(--nm-accent-glow)' }} />
                <div className="absolute rounded-full ring-ripple-2" style={{ width: 180, height: 180, background: isRecording ? 'var(--nm-danger-glow)' : 'var(--nm-accent-glow)' }} />
              </>
            )}
            <button
              onPointerDown={handleRingPointerDown}
              onPointerUp={handleRingPointerUp}
              onPointerLeave={handleRingPointerCancel}
              onPointerCancel={handleRingPointerCancel}
              onKeyDown={handleRingKeyDown}
              disabled={ringing || loading}
              aria-label="Ring everyone. Press and hold to record a voice note."
              style={isRecording ? { boxShadow: '0 0 0 4px var(--nm-danger), 14px 14px 28px var(--nm-sd), -14px -14px 28px var(--nm-sl)' } : undefined}
              className={[
                'nm-ring-btn w-44 h-44 rounded-full flex flex-col items-center justify-center gap-2 focus:outline-none select-none touch-none',
                !ringing && !loading && !isRecording ? 'nm-ring-btn-pulse' : '',
              ].join(' ')}
            >
              {isRecording ? (
                <span className="w-4 h-4 rounded-full recording-dot" style={{ background: 'var(--nm-danger)' }} />
              ) : (
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: ringing ? 'var(--nm-success)' : 'var(--nm-accent)' }}
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              )}
              <span className="font-bold text-lg" style={{ color: isRecording ? 'var(--nm-danger)' : ringing ? 'var(--nm-success)' : 'var(--nm-accent)' }}>
                {isRecording ? 'Recording…' : ringing ? 'Ringing…' : ringSuccess ? 'Sent!' : 'RING'}
              </span>
              <span className="text-nm-muted text-xs text-center px-4">
                {isRecording ? 'Release to send' : ringing ? 'Alerting everyone' : 'Tap to alert · hold to record'}
              </span>
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="nm-pressed rounded-2xl p-3 grid grid-cols-2 gap-3 w-full">
          <button
            onClick={handleToggleMute}
            className={[
              'nm-btn rounded-xl py-3 flex flex-col items-center gap-1.5 focus:outline-none',
              isMuted ? 'text-nm-danger' : 'text-nm-muted',
            ].join(' ')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isMuted ? (
                <>
                  <line x1="23" y1="9" x2="17" y2="15"/>
                  <line x1="17" y1="9" x2="23" y2="15"/>
                  <path d="M2 9.5v5a.5.5 0 0 0 .5.5H6l5 5V4L6 9H2.5a.5.5 0 0 0-.5.5z"/>
                </>
              ) : (
                <>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                </>
              )}
            </svg>
            <span className="text-xs font-medium">{isMuted ? 'Unmute Me' : 'Mute Me'}</span>
          </button>

          <button
            onClick={handleCopyInvite}
            className="nm-btn rounded-xl py-3 flex flex-col items-center gap-1.5 text-nm-muted focus:outline-none"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {copied ? (
                <polyline points="20 6 9 17 4 12"/>
              ) : (
                <>
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </>
              )}
            </svg>
            <span className="text-xs font-medium">{copied ? 'Copied!' : 'Invite Link'}</span>
          </button>
        </div>

        {/* Members */}
        {loading ? (
          <div className="w-full space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="nm-flat-sm rounded-2xl p-3 h-16 animate-pulse" />
            ))}
          </div>
        ) : channel?.members.length ? (
          <div className="w-full space-y-3">
            <h2 className="text-nm-muted text-xs font-semibold uppercase tracking-wider px-1">
              Members · {channel.members.length}
            </h2>
            <div className="space-y-2">
              {channel.members.map(m => (
                <MemberCard
                  key={m.id}
                  member={m}
                  isCurrentUser={m.id === local.memberId}
                  hasAcked={activeRing?.acks.some(a => a.memberId === m.id)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {/* Channel code */}
        <div className="nm-pressed rounded-2xl p-3 w-full flex items-center justify-between">
          <span className="text-nm-muted text-xs">Channel code</span>
          <span className="font-mono font-bold text-nm-accent text-sm tracking-widest">{code}</span>
        </div>
      </main>
    </div>
  );
}
