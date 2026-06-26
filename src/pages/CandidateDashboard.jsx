import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Search, RefreshCw, Briefcase, Globe, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useProfile } from '../hooks/useProfile';
import JobCard from '../components/ui/JobCard';
import AIScreeningModal from '../components/modals/AIScreeningModal';
import SkillInput from '../components/ui/SkillInput';
import { JobCardSkeleton, EmptyState } from '../components/ui/index';
import { buildMatchBreakdown } from '../components/ui/MatchTooltip';
import Navbar from '../components/layout/Navbar';

const DEFAULT_FILTERS = {
  salary: '',
  experience_level: 'any',
  job_type: 'all',
  filterSkills: [],
};

export default function CandidateDashboard() {
  const { user } = useUser();
  const navigate = useNavigate();
  const { profile, skillNames } = useProfile();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedJobs, setAppliedJobs] = useState(new Set());
  const [savedJobs, setSavedJobs] = useState(new Set());
  const [bookmarkingId, setBookmarkingId] = useState(null);
  const [applyingId, setApplyingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [screeningJob, setScreeningJob] = useState(null);
  const [screening, setScreening] = useState(null);
  const [screeningLoading, setScreeningLoading] = useState(false);

  const buildQuery = useCallback((params = {}) => {
    const q = new URLSearchParams({ limit: '60' });
    const s = params.search ?? search;
    const src = params.source ?? sourceFilter;
    const f = params.filters ?? filters;

    if (s) q.set('search', s);
    if (src && src !== 'all') q.set('source', src);
    if (f.salary) q.set('salary', f.salary);
    if (f.experience_level && f.experience_level !== 'any') q.set('experience_level', f.experience_level);
    if (f.job_type && f.job_type !== 'all') q.set('job_type', f.job_type);
    if (f.filterSkills?.length) q.set('filter_skills', f.filterSkills.join(','));
    return q.toString();
  }, [search, sourceFilter, filters]);

  const fetchJobs = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const data = await api.get(`/api/jobs?${buildQuery(params)}`);
      setJobs(data.jobs || []);
    } catch {
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  const fetchApplied = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await api.get(`/api/applications/candidate/${user.id}`);
      setAppliedJobs(new Set(data.applications?.map(a => a.job_id)));
    } catch {}
  }, [user?.id]);

  const fetchSaved = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await api.get(`/api/saved-jobs/${user.id}`);
      setSavedJobs(new Set(data.job_ids || []));
    } catch {}
  }, [user?.id]);

  useEffect(() => {
    fetchJobs();
    fetchApplied();
    fetchSaved();
  }, [fetchJobs, fetchApplied, fetchSaved]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchJobs();
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearch('');
    setSourceFilter('all');
    fetchJobs({ search: '', source: 'all', filters: DEFAULT_FILTERS });
  };

  const handleRefreshExternal = async () => {
    setRefreshing(true);
    try {
      const result = await api.post('/api/jobs/refresh-external');
      toast.success(`Refreshed! ${result.count} jobs updated.`);
      fetchJobs();
    } catch {
      toast.error('Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  const handleBookmark = async (job) => {
    if (!user?.id) return;
    setBookmarkingId(job.id);
    try {
      if (savedJobs.has(job.id)) {
        await api.delete(`/api/saved-jobs/${user.id}/${job.id}`);
        setSavedJobs(prev => { const n = new Set(prev); n.delete(job.id); return n; });
        toast.success('Removed from saved');
      } else {
        await api.post('/api/saved-jobs', { candidate_id: user.id, job_id: job.id });
        setSavedJobs(prev => new Set([...prev, job.id]));
        toast.success('Job saved');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBookmarkingId(null);
    }
  };

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

  const externalCount = jobs.filter(j => j.source === 'external').length;
  const manualCount = jobs.filter(j => j.source === 'manual').length;

  return (
    <div className="min-h-screen bg-dark-gradient">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="section-title">
              {profile?.full_name ? `Welcome, ${profile.full_name.split(' ')[0]}` : 'Browse Jobs'}
            </h1>
            <p className="text-dark-400 text-sm mt-1">
              {externalCount > 0 && (
                <span className="flex items-center gap-1 inline-flex">
                  <Globe size={12} className="text-blue-400" />
                  {externalCount} live from RemoteOK · {manualCount} direct postings
                </span>
              )}
            </p>
          </div>
          <button onClick={handleRefreshExternal} disabled={refreshing} className="btn-secondary text-sm py-2">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh Jobs
          </button>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search jobs, companies, skills..."
              className="input-field pl-9"
            />
          </div>
          <select
            value={sourceFilter}
            onChange={e => { setSourceFilter(e.target.value); fetchJobs({ source: e.target.value }); }}
            className="input-field sm:w-40"
          >
            <option value="all">All Sources</option>
            <option value="external">RemoteOK</option>
            <option value="manual">Direct Posts</option>
          </select>
          <button type="submit" className="btn-primary sm:w-auto justify-center">Search</button>
        </form>

        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="flex items-center gap-2 text-sm text-dark-300 hover:text-gold-400 mb-4 transition-colors"
        >
          <Filter size={14} />
          {filtersOpen ? 'Hide Filters' : 'Show Filters'}
          {filtersOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {filtersOpen && (
          <div className="card mb-6 space-y-4 animate-fade-in">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="label">Salary Range</label>
                <input
                  type="text"
                  value={filters.salary}
                  onChange={e => setFilters(f => ({ ...f, salary: e.target.value }))}
                  className="input-field"
                  placeholder="e.g. 80000, $120k"
                />
              </div>
              <div>
                <label className="label">Experience Level</label>
                <select
                  value={filters.experience_level}
                  onChange={e => setFilters(f => ({ ...f, experience_level: e.target.value }))}
                  className="input-field"
                >
                  <option value="any">Any</option>
                  <option value="entry">Entry Level (0–1 yrs)</option>
                  <option value="junior">Junior (1–3 yrs)</option>
                  <option value="mid">Mid Level (3–5 yrs)</option>
                  <option value="senior">Senior (5+ yrs)</option>
                </select>
              </div>
              <div>
                <label className="label">Job Type</label>
                <select
                  value={filters.job_type}
                  onChange={e => setFilters(f => ({ ...f, job_type: e.target.value }))}
                  className="input-field"
                >
                  <option value="all">All</option>
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="freelance">Freelance</option>
                </select>
              </div>
              <div>
                <label className="label">Filter by Skills</label>
                <SkillInput
                  skills={filters.filterSkills}
                  onChange={skills => setFilters(f => ({ ...f, filterSkills: skills }))}
                  placeholder="Type skills to filter..."
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => fetchJobs()} className="btn-primary text-sm">Apply Filters</button>
              <button type="button" onClick={clearFilters} className="btn-secondary text-sm">Clear Filters</button>
            </div>
          </div>
        )}

        {!loading && skillNames.length === 0 && (
          <div className="card border-gold-500/20 bg-gold-500/5 mb-6 flex items-center gap-3">
            <div className="text-2xl">💡</div>
            <div>
              <p className="text-dark-200 text-sm font-medium">Add skills to see match scores</p>
              <p className="text-dark-400 text-xs">Go to your profile or upload your CV to get personalized match percentages.</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => <JobCardSkeleton key={i} />)}
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No jobs found"
            description="Try different search terms or adjust your filters."
            action={<button onClick={clearFilters} className="btn-secondary">Clear Filters</button>}
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
                isSaved={savedJobs.has(job.id)}
                onBookmark={handleBookmark}
                bookmarkLoading={bookmarkingId === job.id}
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
