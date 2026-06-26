import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Bookmark } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useProfile } from '../hooks/useProfile';
import JobCard from '../components/ui/JobCard';
import AIScreeningModal from '../components/modals/AIScreeningModal';
import { JobCardSkeleton, EmptyState } from '../components/ui/index';
import Navbar from '../components/layout/Navbar';
import { buildMatchBreakdown } from '../components/ui/MatchTooltip';

export default function SavedJobs() {
  const { user } = useUser();
  const navigate = useNavigate();
  const { skillNames, profile } = useProfile();
  const [jobs, setJobs] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());
  const [appliedJobs, setAppliedJobs] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [bookmarkingId, setBookmarkingId] = useState(null);
  const [applyingId, setApplyingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [screeningJob, setScreeningJob] = useState(null);
  const [screening, setScreening] = useState(null);
  const [screeningLoading, setScreeningLoading] = useState(false);

  const fetchSaved = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await api.get(`/api/saved-jobs/${user.id}`);
      setJobs(data.jobs || []);
      setSavedIds(new Set(data.job_ids || []));
    } catch {
      toast.error('Failed to load saved jobs');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  useEffect(() => {
    if (!user?.id) return;
    api.get(`/api/applications/candidate/${user.id}`)
      .then(data => setAppliedJobs(new Set((data.applications || []).map(a => a.job_id))))
      .catch(() => {});
  }, [user?.id]);

  const handleApply = async (job) => {
    if (!user?.id) {
      toast.error('Please sign in to apply');
      return;
    }
    if (!profile?.profile_completed) {
      toast.error('Please complete your profile before applying');
      navigate('/profile-setup');
      return;
    }
    if (job.is_filled) {
      toast.error('This position has been filled');
      return;
    }

    setApplyingId(job.id);
    setScreeningJob(job);
    setScreening(null);
    setScreeningLoading(true);

    try {
      const data = await api.post('/api/applications/check', {
        candidate_id: user.id,
        job_id: job.id,
      });
      setScreening(data.screening);
    } catch (err) {
      toast.error(err.message);
      setScreeningJob(null);
    } finally {
      setScreeningLoading(false);
      setApplyingId(null);
    }
  };

  const handleProceedApply = async (coverLetter) => {
    if (!screeningJob || !user?.id) return;

    setSubmitting(true);
    try {
      await api.post('/api/applications', {
        job_id: screeningJob.id,
        candidate_id: user.id,
        ai_screening: screening,
        cover_letter: coverLetter || null,
      });
      setAppliedJobs(prev => new Set([...prev, screeningJob.id]));
      toast.success(`Applied to ${screeningJob.title}!`);
    } catch (err) {
      if (err.message.includes('Already applied')) {
        toast.error('You already applied to this job');
        setAppliedJobs(prev => new Set([...prev, screeningJob.id]));
      } else {
        toast.error(err.message);
      }
    } finally {
      setSubmitting(false);
      setScreeningJob(null);
      setScreening(null);
    }
  };

  const handleBookmark = async (job) => {
    if (!user?.id) return;
    setBookmarkingId(job.id);
    try {
      await api.delete(`/api/saved-jobs/${user.id}/${job.id}`);
      setSavedIds(prev => { const n = new Set(prev); n.delete(job.id); return n; });
      setJobs(prev => prev.filter(j => j.id !== job.id));
      toast.success('Removed from saved jobs');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBookmarkingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-dark-gradient">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="section-title">Saved Jobs</h1>
          <p className="text-dark-400 text-sm mt-1">{jobs.length} bookmarked positions</p>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <JobCardSkeleton key={i} />)}
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title="No saved jobs yet"
            description="Bookmark jobs from the dashboard to find them here later."
            action={<Link to="/dashboard" className="btn-primary">Browse Jobs</Link>}
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                matchPercentage={skillNames.length > 0 ? buildMatchBreakdown(skillNames, job, profile?.experience_years || 0).percentage : undefined}
                matchBreakdown={buildMatchBreakdown(skillNames, job, profile?.experience_years || 0)}
                onApply={handleApply}
                applied={appliedJobs.has(job.id)}
                isSaved={savedIds.has(job.id)}
                bookmarkLoading={bookmarkingId === job.id}
                onBookmark={handleBookmark}
                applyLoading={applyingId === job.id}
              />
            ))}
          </div>
        )}
      </div>

      {screeningJob && (
        <AIScreeningModal
          screening={screening}
          job={screeningJob}
          loading={screeningLoading}
          submitting={submitting}
          onProceed={handleProceedApply}
          onCancel={() => { setScreeningJob(null); setScreening(null); }}
        />
      )}
    </div>
  );
}
