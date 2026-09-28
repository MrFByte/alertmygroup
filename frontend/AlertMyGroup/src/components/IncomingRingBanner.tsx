interface Props {
  senderName: string;
  channelName?: string;
  onAccept: () => void;
  onDismiss: () => void;
}

export default function IncomingRingBanner({ senderName, channelName, onAccept, onDismiss }: Props) {
  return (
    <div
      className="nm-flat rounded-2xl p-4 flex items-center gap-3"
      style={{ borderLeft: '3px solid var(--nm-accent)' }}
    >
      {/* Pulsing bell */}
      <div className="relative flex-shrink-0">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--nm-bg)', boxShadow: '0 0 0 2px var(--nm-accent)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-nm-accent">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-nm font-semibold text-sm truncate">
          {senderName} is ringing!
        </p>
        {channelName && (
          <p className="text-nm-muted text-xs truncate">{channelName}</p>
        )}
      </div>

      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={onAccept}
          className="nm-btn-success px-3 py-2 rounded-xl text-xs font-bold text-nm-success focus:outline-none"
        >
          I'm Up!
        </button>
        <button
          onClick={onDismiss}
          className="nm-btn-danger px-3 py-2 rounded-xl text-xs font-bold text-nm-danger focus:outline-none"
        >
          Off
        </button>
      </div>
    </div>
  );
}
