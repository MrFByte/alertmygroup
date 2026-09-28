import type { Member } from '../types';

interface Props {
  member: Member;
  isCurrentUser?: boolean;
  hasAcked?: boolean;
}

function initials(name: string) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function MemberCard({ member, isCurrentUser, hasAcked }: Props) {
  return (
    <div className="nm-flat-sm rounded-2xl p-3 flex items-center gap-3">
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
        style={{
          background: 'var(--nm-bg)',
          boxShadow: '3px 3px 6px var(--nm-sd), -3px -3px 6px var(--nm-sl)',
          color: hasAcked ? 'var(--nm-success)' : 'var(--nm-accent)',
        }}
      >
        {initials(member.name)}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-nm font-medium text-sm truncate">
          {member.name}
          {isCurrentUser && (
            <span className="text-nm-muted font-normal ml-1">(you)</span>
          )}
        </p>
        <p className="text-xs mt-0.5" style={{ color: member.muted ? 'var(--nm-danger)' : 'var(--nm-muted)' }}>
          {member.muted ? 'Muted' : 'Active'}
        </p>
      </div>

      {hasAcked && (
        <span className="text-xs text-nm-success font-semibold flex-shrink-0">I'm Up!</span>
      )}
    </div>
  );
}
