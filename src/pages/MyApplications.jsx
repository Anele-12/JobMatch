import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { FileText, ExternalLink, ChevronDown, ChevronUp, CalendarClock, MessageSquare, ClipboardList } from 'lucide-react';
import api from '../lib/api';
import { StatusBadge, MatchRing, EmptyState, Skeleton } from '../components/ui/index';
import Navbar from '../components/layout/Navbar';
import { Link } from 'react-router-dom';

function ApplicationCard({ application }) {
  const [expanded, setExpanded] = useState(false);
  const job = application.jobs;
  const feedback = application.ai_feedback;

  return (
    <div className="card space-y-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-dark-700 flex items-center justify-center flex-shrink-0">
          <span className="text-lg font-bold text-dark-400">
            {(job?.company || 'J')[0]}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <h3 className="font-display font-semibold text-dark-100 line-clamp-1">{job?.title || 'Job'}</h3>
              <p className="text-dark-400 text-sm">{job?.company}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {application.ai_match_score > 0 && (
                <MatchRing percentage={application.ai_match_score} size={40} />
              )}
              <StatusBadge status={application.status} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-dark-500">
        <span>Applied {new Date(application.applied_at).toLocaleDateString()}</span>
        {job?.source === 'external' && job?.external_url && (
          <a href={job.external_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
            View original <ExternalLink size={11} />
          </a>
        )}
      </div>

      {(application.interview_at || application.next_step || application.candidate_message) && (
        <div className="rounded-lg border border-gold-500/20 bg-gold-500/5 p-3 space-y-2 text-sm">
          {application.interview_at && (
            <p className="flex items-center gap-2 text-gold-300">
              <CalendarClock size={14} />
              Interview: {new Date(application.interview_at).toLocaleString()}
            </p>
          )}
          {application.next_step && (
            <p className="flex items-center gap-2 text-dark-200">
              <ClipboardList size={14} className="text-gold-400" />
              Next step: {application.next_step}
            </p>
          )}
          {application.candidate_message && (
            <div className="flex gap-2 text-dark-200">
              <MessageSquare size={14} className="text-gold-400 mt-0.5 flex-shrink-0" />
              <p className="whitespace-pre-wrap leading-relaxed">{application.candidate_message}</p>
            </div>
          )}
        </div>
      )}

      {/* AI Feedback toggle */}
      {feedback && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-xs text-gold-400 hover:text-gold-300 font-medium"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            AI Screening Feedback
          </button>

          {expanded && (
            <div className="mt-3 space-y-3 animate-fade-in">
              {feedback.matching_skills?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-emerald-400 mb-1.5">✓ Matching Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {feedback.matching_skills.map(s => (
                      <span key={s} className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {feedback.missing_skills?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-red-400 mb-1.5">✗ Missing Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {feedback.missing_skills.map(s => (
                      <span key={s} className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {feedback.experience_feedback && (
                <p className="text-xs text-dark-300 bg-dark-700/50 rounded-lg p-2.5">
                  📊 {feedback.experience_feedback}
                </p>
              )}

              {feedback.recommendation && (
                <p className="text-xs text-gold-300 bg-gold-500/5 border border-gold-500/15 rounded-lg p-2.5">
                  💡 {feedback.recommendation}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MyApplications() {
  const { user } = useUser();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    api.get(`/api/applications/candidate/${user.id}`)
      .then(data => setApplications(data.applications || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  const grouped = {
    pending: applications.filter(a => a.status === 'pending'),
    under_review: applications.filter(a => a.status === 'under_review' || a.status === 'reviewed'),
    shortlisted: applications.filter(a => a.status === 'shortlisted'),
    interview: applications.filter(a => a.status === 'interview_scheduled' || a.status === 'interviewed'),
    accepted: applications.filter(a => a.status === 'accepted' || a.status === 'hired'),
    rejected: applications.filter(a => a.status === 'rejected'),
  };

  return (
    <div className="min-h-screen bg-dark-gradient">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="section-title">My Applications</h1>
          <p className="text-dark-400 text-sm mt-1">{applications.length} total applications</p>
        </div>

        {/* Stats */}
        {applications.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-8">
            {Object.entries(grouped).map(([status, apps]) => (
              apps.length > 0 && (
                <div key={status} className="card py-3 text-center">
                  <div className="text-2xl font-bold font-display text-dark-100">{apps.length}</div>
                  <div className="text-xs text-dark-400 capitalize">{status}</div>
                </div>
              )
            ))}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="card"><Skeleton lines={3} /></div>)}
          </div>
        ) : applications.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No applications yet"
            description="Start applying to jobs to track your progress here."
            action={<Link to="/dashboard" className="btn-primary">Browse Jobs</Link>}
          />
        ) : (
          <div className="space-y-4">
            {applications.map(app => (
              <ApplicationCard key={app.id} application={app} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
