import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Users,
  Briefcase,
  Trash2,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  RotateCcw,
  Mail,
  MapPin,
  FileText,
  Download,
  GraduationCap,
  CalendarClock,
  Star,
  MessageSquare,
  ClipboardCheck,
  Scale,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useProfile } from '../hooks/useProfile';
import { StatusBadge, MatchRing, EmptyState, Skeleton, Spinner } from '../components/ui/index';
import Navbar from '../components/layout/Navbar';

const APPLICATION_STATUSES = [
  ['pending', 'Pending'],
  ['under_review', 'Under Review'],
  ['shortlisted', 'Shortlisted'],
  ['interview_scheduled', 'Interview Scheduled'],
  ['interviewed', 'Interviewed'],
  ['accepted', 'Accepted'],
  ['rejected', 'Rejected'],
  ['withdrawn', 'Withdrawn'],
];

function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function ApplicantCard({ app, job }) {
  const candidate = app.profiles;
  const feedback = app.ai_feedback;
  const skills = candidate?.skills || [];
  const hasDetails = Boolean(
    candidate?.email ||
    candidate?.location ||
    candidate?.experience_years ||
    candidate?.bio ||
    candidate?.cv_file_url ||
    candidate?.education?.length > 0 ||
    skills.length > 0 ||
    app.cover_letter ||
    feedback
  );
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(app.status);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [savingReview, setSavingReview] = useState(false);
  const [review, setReview] = useState({
    employer_notes: app.employer_notes || '',
    employer_rating: app.employer_rating || 0,
    next_step: app.next_step || '',
    interview_at: toDateTimeLocal(app.interview_at),
    candidate_message: app.candidate_message || '',
  });

  const updateStatus = async (newStatus) => {
    setUpdatingStatus(newStatus);
    try {
      const data = await api.put(`/api/applications/${app.id}/status`, { status: newStatus });
      setStatus(data.application?.status || newStatus);
      toast.success('Status updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const saveReview = async () => {
    setSavingReview(true);
    try {
      const payload = {
        ...review,
        employer_rating: Number(review.employer_rating) || null,
        interview_at: review.interview_at ? new Date(review.interview_at).toISOString() : null,
      };
      const data = await api.put(`/api/applications/${app.id}/review`, payload);
      setReview({
        employer_notes: data.application.employer_notes || '',
        employer_rating: data.application.employer_rating || 0,
        next_step: data.application.next_step || '',
        interview_at: toDateTimeLocal(data.application.interview_at),
        candidate_message: data.application.candidate_message || '',
      });
      toast.success('Applicant review saved');
    } catch (err) {
      toast.error(err.message || 'Failed to save review');
    } finally {
      setSavingReview(false);
    }
  };

  const emailSubject = encodeURIComponent(`Update on your application${job?.title ? ` for ${job.title}` : ''}`);
  const emailBody = encodeURIComponent(review.candidate_message || `Hi ${candidate?.full_name || 'there'},\n\nThanks for your application. We would like to share an update with you.\n\nBest,\n${job?.company || 'The hiring team'}`);

  return (
    <div className="bg-dark-700/50 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        {candidate?.profile_image_url ? (
          <img
            src={candidate.profile_image_url}
            alt={candidate?.full_name || 'Applicant'}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-dark-600"
          />
        ) : (
          <div className="w-10 h-10 bg-dark-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="font-bold text-dark-300 text-sm">
              {(candidate?.full_name || 'U')[0].toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-dark-100 text-sm">{candidate?.full_name || 'Unknown'}</p>
          <p className="text-dark-400 text-xs truncate">{candidate?.headline || candidate?.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {app.ai_match_score > 0 && <MatchRing percentage={app.ai_match_score} size={36} />}
          <StatusBadge status={status} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center justify-between">
        <p className="text-xs text-dark-500">{new Date(app.applied_at).toLocaleDateString()}</p>
        <div className="flex gap-1.5">
          {APPLICATION_STATUSES.map(([s, label]) => (
            <button
              key={s}
              onClick={() => updateStatus(s)}
              disabled={updatingStatus !== null}
              className={`text-xs px-2 py-1 rounded-lg border transition-colors disabled:opacity-50 ${
                status === s
                  ? 'bg-gold-500/20 border-gold-500/30 text-gold-300'
                  : 'border-dark-600 text-dark-400 hover:border-dark-500'
              }`}
            >
              {updatingStatus === s ? <Spinner size={12} /> : label}
            </button>
          ))}
        </div>
      </div>

      {hasDetails && (
        <button
          onClick={() => setOpen(!open)}
          className="text-xs text-gold-400 flex items-center gap-1"
        >
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {open ? 'Hide applicant details' : 'View applicant details'}
        </button>
      )}
      {open && (
        <div className="text-xs text-dark-300 bg-dark-800 rounded-lg p-3 space-y-4">
          <div className="grid sm:grid-cols-3 gap-2">
            {candidate?.email && (
              <a
                href={`mailto:${candidate.email}`}
                className="flex items-center gap-2 rounded-lg border border-dark-700 px-3 py-2 text-dark-200 hover:border-gold-500/30 hover:text-gold-300 transition-colors"
              >
                <Mail size={13} />
                <span className="truncate">{candidate.email}</span>
              </a>
            )}
            {candidate?.location && (
              <div className="flex items-center gap-2 rounded-lg border border-dark-700 px-3 py-2 text-dark-200">
                <MapPin size={13} />
                <span className="truncate">{candidate.location}</span>
              </div>
            )}
            {candidate?.experience_years !== null && candidate?.experience_years !== undefined && (
              <div className="flex items-center gap-2 rounded-lg border border-dark-700 px-3 py-2 text-dark-200">
                <Briefcase size={13} />
                <span>{candidate.experience_years} years experience</span>
              </div>
            )}
            {candidate?.cv_file_url && (
              <a
                href={candidate.cv_file_url}
                target="_blank"
                rel="noreferrer"
                download={candidate.cv_file_name || undefined}
                className="flex items-center gap-2 rounded-lg border border-dark-700 px-3 py-2 text-dark-200 hover:border-gold-500/30 hover:text-gold-300 transition-colors"
              >
                <Download size={13} />
                <span className="truncate">{candidate.cv_file_name || 'Download CV'}</span>
              </a>
            )}
            {candidate?.profile_completion !== null && candidate?.profile_completion !== undefined && (
              <div className="rounded-lg border border-dark-700 px-3 py-2 text-dark-200">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span>Profile</span>
                  <span className="text-gold-400">{candidate.profile_completion}%</span>
                </div>
                <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gold-gradient" style={{ width: `${candidate.profile_completion}%` }} />
                </div>
              </div>
            )}
          </div>

          {candidate?.bio && (
            <div>
              <p className="text-gold-400 font-medium mb-1">About</p>
              <p className="text-dark-200 leading-relaxed whitespace-pre-wrap">{candidate.bio}</p>
            </div>
          )}

          {skills.length > 0 && (
            <div>
              <p className="text-gold-400 font-medium mb-2">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {skills.map(skill => (
                  <span
                    key={`${skill.skill_name}-${skill.source}`}
                    className={`badge text-xs ${skill.source === 'ai' ? 'badge-gold' : 'badge-gray'}`}
                  >
                    {skill.skill_name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {candidate?.education?.length > 0 && (
            <div>
              <p className="text-gold-400 font-medium mb-2 flex items-center gap-1.5">
                <GraduationCap size={13} />
                Education
              </p>
              <div className="space-y-1">
                {candidate.education.map(item => (
                  <p key={item} className="text-dark-200">{item}</p>
                ))}
              </div>
            </div>
          )}

          {app.cover_letter && (
            <div>
              <p className="text-gold-400 font-medium mb-1 flex items-center gap-1.5">
                <FileText size={13} />
                Cover Letter
              </p>
              <p className="text-dark-200 whitespace-pre-wrap leading-relaxed">{app.cover_letter}</p>
            </div>
          )}

          {feedback && (
            <div className="space-y-2">
              <p className="text-gold-400 font-medium">AI Analysis</p>
              {feedback.matching_skills?.length > 0 && (
                <p>Has: {feedback.matching_skills.join(', ')}</p>
              )}
              {feedback.missing_skills?.length > 0 && (
                <p>Missing: {feedback.missing_skills.join(', ')}</p>
              )}
              {feedback.related_skills?.length > 0 && (
                <p>Related: {feedback.related_skills.join(', ')}</p>
              )}
              {feedback.experience_feedback && <p>{feedback.experience_feedback}</p>}
              {feedback.recommendation && <p>{feedback.recommendation}</p>}
              {feedback.summary && <p className="text-dark-400">{feedback.summary}</p>}
            </div>
          )}

          <div className="border-t border-dark-700 pt-4 space-y-3">
            <p className="text-gold-400 font-medium flex items-center gap-1.5">
              <ClipboardCheck size={13} />
              Employer Actions
            </p>

            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="label text-xs flex items-center gap-1.5">
                  <Star size={12} />
                  Rating
                </label>
                <select
                  value={review.employer_rating}
                  onChange={e => setReview(prev => ({ ...prev, employer_rating: e.target.value }))}
                  className="input-field py-2"
                >
                  <option value={0}>No rating</option>
                  <option value={1}>1 - Weak fit</option>
                  <option value={2}>2 - Possible</option>
                  <option value={3}>3 - Good</option>
                  <option value={4}>4 - Strong</option>
                  <option value={5}>5 - Excellent</option>
                </select>
              </div>
              <div>
                <label className="label text-xs flex items-center gap-1.5">
                  <CalendarClock size={12} />
                  Interview
                </label>
                <input
                  type="datetime-local"
                  value={review.interview_at}
                  onChange={e => setReview(prev => ({ ...prev, interview_at: e.target.value }))}
                  className="input-field py-2"
                />
              </div>
              <div>
                <label className="label text-xs">Next step</label>
                <input
                  type="text"
                  value={review.next_step}
                  onChange={e => setReview(prev => ({ ...prev, next_step: e.target.value }))}
                  className="input-field py-2"
                  placeholder="Call, panel interview, reference check..."
                />
              </div>
            </div>

            <div>
              <label className="label text-xs">Private notes</label>
              <textarea
                value={review.employer_notes}
                onChange={e => setReview(prev => ({ ...prev, employer_notes: e.target.value }))}
                className="input-field min-h-24"
                placeholder="Add screening notes, concerns, strengths, or internal follow-ups."
              />
            </div>

            <div>
              <label className="label text-xs flex items-center gap-1.5">
                <MessageSquare size={12} />
                Candidate message draft
              </label>
              <textarea
                value={review.candidate_message}
                onChange={e => setReview(prev => ({ ...prev, candidate_message: e.target.value }))}
                className="input-field min-h-24"
                placeholder="Write a message to invite, request more info, or share an update."
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveReview}
                disabled={savingReview}
                className="btn-primary text-xs py-2 px-3 disabled:opacity-50"
              >
                {savingReview ? <Spinner size={13} /> : <ClipboardCheck size={13} />}
                Save Review
              </button>
              {candidate?.email && (
                <a
                  href={`mailto:${candidate.email}?subject=${emailSubject}&body=${emailBody}`}
                  className="btn-secondary text-xs py-2 px-3"
                >
                  <Mail size={13} />
                  Email Candidate
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CompareApplicantsPanel({ applicants, selectedIds, onToggleSelected, onClose }) {
  const selectedApplicants = applicants
    .filter(app => selectedIds.size === 0 || selectedIds.has(app.id))
    .sort((a, b) => {
      const scoreDiff = (b.ai_match_score || 0) - (a.ai_match_score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (b.employer_rating || 0) - (a.employer_rating || 0);
    });

  const topApplicant = selectedApplicants[0];

  return (
    <div className="rounded-xl border border-gold-500/20 bg-dark-800 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-dark-100 flex items-center gap-2">
            <Scale size={15} className="text-gold-400" />
            Compare Applicants
          </p>
          <p className="text-xs text-dark-500 mt-1">
            {selectedIds.size > 0 ? `${selectedIds.size} selected` : `Comparing all ${applicants.length} applicants`}
          </p>
        </div>
        <button onClick={onClose} className="p-1.5 text-dark-400 hover:text-dark-100 hover:bg-dark-700 rounded-lg">
          <X size={15} />
        </button>
      </div>

      {topApplicant && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          Best current match: <span className="font-semibold">{topApplicant.profiles?.full_name || 'Unknown'}</span>
          <span className="text-emerald-300"> ({topApplicant.ai_match_score || 0}% match)</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {applicants.map(app => {
          const selected = selectedIds.has(app.id);
          return (
            <button
              key={app.id}
              onClick={() => onToggleSelected(app.id)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                selected
                  ? 'border-gold-500/40 bg-gold-500/15 text-gold-300'
                  : 'border-dark-600 text-dark-300 hover:border-dark-500'
              }`}
            >
              {app.profiles?.full_name || 'Unknown'}
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] text-left text-xs">
          <thead>
            <tr className="border-b border-dark-700 text-dark-400">
              <th className="py-2 pr-3 font-medium">Applicant</th>
              <th className="py-2 pr-3 font-medium">Match</th>
              <th className="py-2 pr-3 font-medium">Rating</th>
              <th className="py-2 pr-3 font-medium">Experience</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 pr-3 font-medium">Matching Skills</th>
              <th className="py-2 pr-3 font-medium">Missing Skills</th>
              <th className="py-2 pr-3 font-medium">Next Step</th>
            </tr>
          </thead>
          <tbody>
            {selectedApplicants.map(app => {
              const candidate = app.profiles || {};
              const feedback = app.ai_feedback || {};
              const matchingSkills = feedback.matching_skills || app.matching_skills || [];
              const missingSkills = feedback.missing_skills || app.missing_skills || [];

              return (
                <tr key={app.id} className="border-b border-dark-700/70 align-top">
                  <td className="py-3 pr-3">
                    <p className="font-medium text-dark-100">{candidate.full_name || 'Unknown'}</p>
                    <p className="text-dark-500">{candidate.headline || candidate.email || 'No headline'}</p>
                  </td>
                  <td className="py-3 pr-3 text-dark-100 font-semibold">{app.ai_match_score || 0}%</td>
                  <td className="py-3 pr-3 text-dark-300">{app.employer_rating ? `${app.employer_rating}/5` : '-'}</td>
                  <td className="py-3 pr-3 text-dark-300">
                    {candidate.experience_years !== null && candidate.experience_years !== undefined
                      ? `${candidate.experience_years} yrs`
                      : '-'}
                  </td>
                  <td className="py-3 pr-3"><StatusBadge status={app.status} /></td>
                  <td className="py-3 pr-3 text-emerald-300 max-w-44">
                    {matchingSkills.length ? matchingSkills.slice(0, 5).join(', ') : '-'}
                  </td>
                  <td className="py-3 pr-3 text-red-300 max-w-44">
                    {missingSkills.length ? missingSkills.slice(0, 5).join(', ') : '-'}
                  </td>
                  <td className="py-3 pr-3 text-dark-300 max-w-40">
                    {app.next_step || (app.interview_at ? `Interview ${new Date(app.interview_at).toLocaleDateString()}` : '-')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function JobRow({ job, onDelete, onToggleFilled, deleting }) {
  const [applicants, setApplicants] = useState([]);
  const [open, setOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [selectedCompareIds, setSelectedCompareIds] = useState(new Set());
  const [loadingApps, setLoadingApps] = useState(false);
  const [applicantError, setApplicantError] = useState('');
  const [toggling, setToggling] = useState(false);

  const loadApplicants = async () => {
    if (applicants.length === 0) {
      setLoadingApps(true);
      setApplicantError('');
      try {
        const data = await api.get(`/api/applications/job/${job.id}`);
        setApplicants(data.applications || []);
      } catch (err) {
        setApplicantError(err.message || 'Failed to load applicants');
        toast.error(err.message || 'Failed to load applicants');
      }
      setLoadingApps(false);
    }
  };

  const toggleApplicants = async () => {
    if (!open) {
      await loadApplicants();
    }
    setOpen(!open);
  };

  const toggleCompare = async () => {
    if (!compareOpen) {
      await loadApplicants();
      setOpen(true);
    }
    setCompareOpen(!compareOpen);
  };

  const toggleSelectedCompare = (appId) => {
    setSelectedCompareIds(prev => {
      const next = new Set(prev);
      if (next.has(appId)) next.delete(appId);
      else next.add(appId);
      return next;
    });
  };

  return (
    <div className="card space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-semibold text-dark-100">{job.title}</h3>
            {job.is_filled && (
              <span className="badge badge-red text-xs">Position Filled</span>
            )}
          </div>
          <p className="text-dark-400 text-sm">{job.location || 'Remote'} - {job.salary || 'Salary not set'}</p>
          {job.skills_required?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {job.skills_required.slice(0, 4).map(s => (
                <span key={s} className="badge badge-gray text-xs">{s}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {job.source === 'manual' && (
            <button
              disabled={toggling}
              onClick={async () => {
                setToggling(true);
                try {
                  await onToggleFilled(job.id, !job.is_filled);
                } finally {
                  setToggling(false);
                }
              }}
              className={`btn-secondary text-xs py-1.5 px-3 disabled:opacity-50 ${
                job.is_filled ? 'border-emerald-500/30 text-emerald-400' : ''
              }`}
            >
              {toggling ? (
                <Spinner size={12} />
              ) : job.is_filled ? (
                <RotateCcw size={12} />
              ) : (
                <CheckCircle size={12} />
              )}
              {toggling ? 'Updating...' : job.is_filled ? 'Reopen' : 'Mark Filled'}
            </button>
          )}
          <button
            onClick={toggleApplicants}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            <Users size={12} />
            Applicants
          </button>
          <button
            onClick={toggleCompare}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            <Scale size={12} />
            Compare
          </button>
          <button
            onClick={() => onDelete(job.id)}
            disabled={deleting}
            className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
          >
            {deleting ? <Spinner size={14} /> : <Trash2 size={14} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-dark-700 pt-4 space-y-3 animate-fade-in">
          {loadingApps ? (
            <Skeleton lines={2} />
          ) : applicantError ? (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
              {applicantError}
            </div>
          ) : applicants.length === 0 ? (
            <p className="text-dark-500 text-sm text-center py-4">No applicants yet</p>
          ) : (
            <>
              {compareOpen && (
                <CompareApplicantsPanel
                  applicants={applicants}
                  selectedIds={selectedCompareIds}
                  onToggleSelected={toggleSelectedCompare}
                  onClose={() => setCompareOpen(false)}
                />
              )}
              {applicants.map(app => <ApplicantCard key={app.id} app={app} job={job} />)}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function EmployerDashboard() {
  const { user } = useUser();
  const { profile } = useProfile();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    api.get(`/api/jobs/employer/${user.id}`)
      .then(data => setJobs(data.jobs || []))
      .catch(() => toast.error('Failed to load jobs'))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleDelete = async (jobId) => {
    if (!confirm('Delete this job posting?')) return;
    setDeletingId(jobId);
    try {
      await api.delete(`/api/jobs/${jobId}`);
      setJobs(prev => prev.filter(j => j.id !== jobId));
      toast.success('Job deleted');
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleFilled = async (jobId, isFilled) => {
    try {
      const result = await api.put(`/api/jobs/${jobId}/filled`, {
        is_filled: isFilled,
        employer_id: user.id,
      });
      setJobs(prev => prev.map(j => j.id === jobId ? result.job : j));
      toast.success(isFilled ? 'Position marked as filled' : 'Position reopened');
    } catch (err) {
      toast.error(err.message || 'Failed to update job');
    }
  };

  return (
    <div className="min-h-screen bg-dark-gradient">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="section-title">
              {profile?.company_name || 'Employer'} Dashboard
            </h1>
            <p className="text-dark-400 text-sm mt-1">{jobs.length} active job postings</p>
          </div>
          <Link to="/employer/post-job" className="btn-primary">
            <Plus size={16} />
            Post Job
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => <div key={i} className="card"><Skeleton lines={4} /></div>)}
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No jobs posted yet"
            description="Post your first job to start receiving applications."
            action={<Link to="/employer/post-job" className="btn-primary">Post First Job</Link>}
          />
        ) : (
          <div className="space-y-4">
            {jobs.map(job => (
              <JobRow
                key={job.id}
                job={job}
                onDelete={handleDelete}
                onToggleFilled={handleToggleFilled}
                deleting={deletingId === job.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
