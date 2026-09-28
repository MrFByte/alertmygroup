// A short two-tone ringtone loop, built with WebAudio so no audio file is needed.
// Browsers may block it from actually making sound until a user gesture unlocks
// audio (e.g. opening the page from a notification tap) — that's an expected
// platform limitation, not a bug; the visual ripple carries the "ringing" cue
// either way.
export function playRingtone(): () => void {
  const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return () => {};

  const ctx = new AudioContextClass();
  let stopped = false;
  let timeoutId: number | null = null;

  const beep = (freq: number, duration: number, startAt: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.25, startAt + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.02);
  };

  const scheduleCycle = () => {
    if (stopped) return;
    const now = ctx.currentTime + 0.05;
    beep(880, 0.15, now);
    beep(880, 0.15, now + 0.25);
    timeoutId = window.setTimeout(scheduleCycle, 1500);
  };

  ctx.resume().catch(() => {}).finally(scheduleCycle);

  return () => {
    stopped = true;
    if (timeoutId !== null) clearTimeout(timeoutId);
    ctx.close().catch(() => {});
  };
}
