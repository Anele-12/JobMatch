// Skeleton loading component
export function Skeleton({ className = '', lines = 1, height = 'h-4' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`skeleton rounded ${height} ${i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'}`} />
      ))}
    </div>
  );
}

// Job card skeleton
export function JobCardSkeleton() {
  return (
    <div className="card space-y-4">
      <div className="flex items-start gap-3">
        <div className="skeleton w-12 h-12 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-5 w-2/3 rounded" />
          <div className="skeleton h-4 w-1/2 rounded" />
        </div>
      </div>
      <div className="skeleton h-3 w-full rounded" />
      <div className="skeleton h-3 w-4/5 rounded" />
      <div className="flex gap-2">
        {[1,2,3].map(i => <div key={i} className="skeleton h-6 w-16 rounded-full" />)}
      </div>
    </div>
  );
}

// Match percentage ring
export function MatchRing({ percentage, size = 56 }) {
  const r = (size - 8) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (percentage / 100) * circumference;
  const color = percentage >= 70 ? '#10b981' : percentage >= 40 ? '#C9A84C' : '#ef4444';

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#252538" strokeWidth="4" />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold" style={{ color }}>{percentage}%</span>
      </div>
    </div>
  );
}

// Status badge
export function StatusBadge({ status }) {
  const map = {
    pending: { cls: 'badge-gray', label: 'Pending' },
    reviewed: { cls: 'badge-blue', label: 'Under Review' },
    under_review: { cls: 'badge-blue', label: 'Under Review' },
    shortlisted: { cls: 'badge-gold', label: 'Shortlisted' },
    interview_scheduled: { cls: 'badge-blue', label: 'Interview Scheduled' },
    interviewed: { cls: 'badge-blue', label: 'Interviewed' },
    accepted: { cls: 'badge-green', label: 'Accepted' },
    rejected: { cls: 'badge-red', label: 'Rejected' },
    withdrawn: { cls: 'badge-gray', label: 'Withdrawn' },
    hired: { cls: 'badge-green', label: 'Accepted' },
  };
  const { cls, label } = map[status] || map.pending;
  return <span className={cls}>{label}</span>;
}

// Empty state
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center mb-4">
        <Icon size={28} className="text-dark-400" />
      </div>
      <h3 className="text-lg font-display font-semibold text-dark-200 mb-2">{title}</h3>
      <p className="text-dark-400 text-sm max-w-xs mb-6">{description}</p>
      {action}
    </div>
  );
}

// Skill tag component
export function SkillTag({ skill, onRemove, variant = 'default' }) {
  const name = typeof skill === 'string' ? skill : skill.skill_name;
  const isAi = typeof skill === 'object' && skill.source === 'ai';
  
  return (
    <span className={isAi || variant === 'ai' ? 'skill-tag-ai' : 'skill-tag'}>
      {isAi && <span className="text-gold-500 text-xs">✨</span>}
      {name}
      {onRemove && (
        <button
          onClick={() => onRemove(name)}
          className="ml-0.5 opacity-60 hover:opacity-100 text-xs leading-none"
        >
          ×
        </button>
      )}
    </span>
  );
}

export function FieldError({ error }) {
  if (!error) return null;
  return <p className="text-red-400 text-xs mt-1">{error}</p>;
}

// Loading spinner
export function Spinner({ size = 20, className = '' }) {
  return (
    <svg
      className={`animate-spin text-gold-500 ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
