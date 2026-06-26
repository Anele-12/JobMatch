import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Bookmark, Briefcase, CalendarDays, ExternalLink, MapPin, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import Navbar from '../components/layout/Navbar';
import { EmptyState, Spinner } from '../components/ui/index';

function formatSalary(min, max) {
  const salaryMin = Number(min);
  const salaryMax = Number(max);

  if (Number.isFinite(salaryMin) && Number.isFinite(salaryMax) && (salaryMin > 0 || salaryMax > 0)) {
    return `R${salaryMin.toLocaleString()} - R${salaryMax.toLocaleString()}`;
  }
  if (Number.isFinite(salaryMin) && salaryMin > 0) return `From R${salaryMin.toLocaleString()}`;
  if (Number.isFinite(salaryMax) && salaryMax > 0) return `Up to R${salaryMax.toLocaleString()}`;
  return 'Salary not specified';
}

function formatDate(value) {
  if (!value) return 'Date not available';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? 'Date not available'
    : parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function previewDescription(value) {
  const text = String(value || 'No description available.').replace(/<[^>]*>/g, '').trim();
  return text.length > 200 ? `${text.slice(0, 200)}...` : text;
}

export default function Jobs() {
  const { user } = useUser();
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [page, setPage] = useState(1);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [savedAdzunaJobs, setSavedAdzunaJobs] = useState({});
  const [savingId, setSavingId] = useState(null);

  const searchJobs = async (nextPage = 1) => {
    setLoading(true);
    setSearched(true);
    setError('');
    try {
      const params = new URLSearchParams({
        source: 'adzuna',
        page: String(nextPage),
      });
      if (keyword.trim()) params.set('keyword', keyword.trim());
      if (location.trim()) params.set('location', location.trim());

      const data = await api.get(`/api/jobs?${params.toString()}`);
      setJobs(data.jobs || []);
      setPage(nextPage);
    } catch (err) {
      console.error(err);
      const message = err.message || 'Failed to load jobs';
      setError(message);
      toast.error(message);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchJobs(1);
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setSavedAdzunaJobs({});
      return;
    }

    api.get(`/api/saved-jobs/${user.id}`)
      .then(data => {
        const saved = {};
        (data.jobs || []).forEach(job => {
          if (job.external_id?.startsWith('adzuna_')) {
            saved[job.external_id.replace('adzuna_', '')] = job.id;
          }
        });
        setSavedAdzunaJobs(saved);
      })
      .catch(() => {});
  }, [user?.id]);

  const handleSubmit = (event) => {
    event.preventDefault();
    searchJobs(1);
  };

  const handleBookmark = async (job) => {
    if (!user?.id) {
      toast.error('Please sign in to save jobs');
      return;
    }

    setSavingId(job.id);
    try {
      const localJobId = savedAdzunaJobs[job.id];

      if (localJobId) {
        await api.delete(`/api/saved-jobs/${user.id}/${localJobId}`);
        setSavedAdzunaJobs(prev => {
          const next = { ...prev };
          delete next[job.id];
          return next;
        });
        toast.success('Removed from saved jobs');
      } else {
        const data = await api.post('/api/saved-jobs/external', {
          candidate_id: user.id,
          job,
        });
        setSavedAdzunaJobs(prev => ({ ...prev, [job.id]: data.job.id }));
        toast.success('Job saved');
      }
    } catch (err) {
      toast.error(err.message || 'Could not save job');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-dark-gradient">
      <Navbar />

      <main className="page-container">
        <div className="mb-8">
          <h1 className="section-title">Jobs</h1>
          <p className="text-dark-400 text-sm mt-1">Search live South African listings from Adzuna.</p>
        </div>

        <form onSubmit={handleSubmit} className="card mb-8">
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div>
              <label className="label" htmlFor="job-keyword">Job title</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                <input
                  id="job-keyword"
                  type="text"
                  value={keyword}
                  onChange={event => setKeyword(event.target.value)}
                  className="input-field pl-9"
                  placeholder="Software engineer"
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="job-location">City</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                <input
                  id="job-location"
                  type="text"
                  value={location}
                  onChange={event => setLocation(event.target.value)}
                  className="input-field pl-9"
                  placeholder="Cape Town"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary justify-center md:min-w-32">
              {loading ? <Spinner size={16} /> : <Search size={16} />}
              Search
            </button>
          </div>
        </form>

        {error && (
          <div className="card border-red-500/20 bg-red-500/5 mb-6">
            <p className="text-sm font-medium text-red-300">Could not load Adzuna jobs</p>
            <p className="text-sm text-dark-300 mt-1">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size={32} />
          </div>
        ) : searched && jobs.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No jobs found"
            description="Try a broader job title or another South African city."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {jobs.map(job => (
              <article key={job.id} className="card flex flex-col gap-4 relative">
                <button
                  type="button"
                  onClick={() => handleBookmark(job)}
                  disabled={savingId === job.id}
                  className="absolute top-4 right-4 p-2 rounded-lg bg-dark-700 border border-dark-600 hover:border-gold-500/40 transition-colors disabled:opacity-50"
                  aria-label={savedAdzunaJobs[job.id] ? 'Remove saved job' : 'Save job'}
                >
                  {savingId === job.id ? (
                    <Spinner size={15} />
                  ) : (
                    <Bookmark
                      size={16}
                      className={savedAdzunaJobs[job.id] ? 'text-gold-400 fill-gold-400' : 'text-dark-400 hover:text-gold-400'}
                    />
                  )}
                </button>

                <div>
                  <h2 className="font-display text-lg font-semibold text-dark-50 line-clamp-2 pr-10">{job.title}</h2>
                  <p className="text-sm text-dark-300 mt-1">{job.company?.display_name || 'Unknown Company'}</p>
                </div>

                <div className="space-y-2 text-sm text-dark-400">
                  <p className="flex items-center gap-2">
                    <MapPin size={14} className="text-gold-400" />
                    {job.location?.display_name || 'South Africa'}
                  </p>
                  <p>{formatSalary(job.salary_min, job.salary_max)}</p>
                  <p className="flex items-center gap-2">
                    <CalendarDays size={14} className="text-gold-400" />
                    {formatDate(job.created)}
                  </p>
                </div>

                <p className="text-sm text-dark-300 leading-6 flex-1">{previewDescription(job.description)}</p>

                <a
                  href={job.redirect_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary justify-center text-sm py-2"
                >
                  <ExternalLink size={15} />
                  Apply Now
                </a>
              </article>
            ))}
          </div>
        )}

        {jobs.length > 0 && (
          <div className="mt-8 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => searchJobs(page - 1)}
              disabled={loading || page <= 1}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="badge-gray px-4 py-3">Page {page}</span>
            <button
              type="button"
              onClick={() => searchJobs(page + 1)}
              disabled={loading}
              className="btn-secondary text-sm"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
