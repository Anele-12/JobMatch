import { MapPin, DollarSign, Clock, ExternalLink, Globe, Bookmark } from 'lucide-react';
import { MatchRing, Spinner } from './index';
import MatchTooltip from './MatchTooltip';

export default function JobCard({
  job,
  matchPercentage,
  matchBreakdown,
  onApply,
  applied,
  isSaved,
  onBookmark,
  bookmarkLoading,
  applyLoading,
}) {
  const isExternal = job.source === 'external';
  const externalSource = job.external_id?.startsWith('adzuna_') ? 'Adzuna' : 'RemoteOK';
  const isFilled = job.is_filled === true;

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="card-hover group animate-fade-in relative">
      {onBookmark && (
        <button
          onClick={(e) => { e.stopPropagation(); onBookmark(job); }}
          disabled={bookmarkLoading}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-dark-800/80 border border-dark-600 hover:border-gold-500/40 transition-colors disabled:opacity-50"
          aria-label={isSaved ? 'Remove bookmark' : 'Save job'}
        >
          {bookmarkLoading ? (
            <Spinner size={14} />
          ) : (
            <Bookmark
              size={16}
              className={isSaved ? 'text-gold-400 fill-gold-400' : 'text-dark-400 hover:text-gold-400'}
            />
          )}
        </button>
      )}

      <div className="flex items-start gap-3 mb-4 pr-8">
        <div className="w-12 h-12 rounded-xl bg-dark-700 border border-dark-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {job.logo_url ? (
            <img src={job.logo_url} alt={job.company} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
          ) : (
            <span className="text-xl font-bold text-dark-400">
              {(job.company || 'J')[0].toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-display font-semibold text-dark-50 group-hover:text-gold-300 transition-colors line-clamp-1">
                {job.title}
              </h3>
              <p className="text-dark-400 text-sm">{job.company}</p>
            </div>
            {matchPercentage !== undefined && (
              <MatchTooltip breakdown={matchBreakdown}>
                <MatchRing percentage={matchPercentage} size={44} />
              </MatchTooltip>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-4 text-sm text-dark-400">
        {job.location && (
          <span className="flex items-center gap-1">
            <MapPin size={12} />
            {job.location}
          </span>
        )}
        {job.salary && job.salary !== 'Not specified' && (
          <span className="flex items-center gap-1">
            <DollarSign size={12} />
            {job.salary}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {timeAgo(job.created_at)}
        </span>
      </div>

      {job.description && (
        <p className="text-dark-400 text-sm line-clamp-2 mb-4">
          {job.description.replace(/<[^>]*>/g, '')}
        </p>
      )}

      {job.skills_required?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {job.skills_required.slice(0, 5).map((skill, i) => (
            <span key={i} className="badge badge-gray text-xs">{skill}</span>
          ))}
          {job.skills_required.length > 5 && (
            <span className="badge badge-gray text-xs">+{job.skills_required.length - 5}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-dark-700">
        <div className="flex items-center gap-2 flex-wrap">
          {isFilled && (
            <span className="badge badge-red text-xs">Position Filled</span>
          )}
          {isExternal ? (
            <span className="badge badge-blue text-xs flex items-center gap-1">
              <Globe size={10} />
              Live from {externalSource}
            </span>
          ) : (
            <span className="badge badge-gold text-xs">Direct Hire</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isExternal && job.external_url && (
            <a
              href={job.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost text-xs py-1.5 px-3"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={12} />
              View
            </a>
          )}
          {isFilled ? (
            <span className="text-xs text-dark-500 px-3 py-1.5">No longer accepting applications</span>
          ) : applied ? (
            <span className="badge-green text-xs px-3 py-1.5">Applied ✓</span>
          ) : (
            <button
              onClick={() => onApply?.(job)}
              disabled={applyLoading || !onApply}
              className="btn-primary text-xs py-1.5 px-4 disabled:opacity-50"
            >
              {applyLoading ? <Spinner size={14} /> : 'Apply'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
