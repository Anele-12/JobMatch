import axios from 'axios';
import supabase from '../lib/supabase.js';
import adzunaService from './adzunaService.js';

const REMOTEOK_URL = 'https://remoteok.com/api';

function parseJobDate(date) {
  if (date == null || date === '') return new Date().toISOString();

  if (typeof date === 'string' && /[T\-:]/.test(date)) {
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  }

  const timestamp = Number(date);
  if (!Number.isFinite(timestamp)) return new Date().toISOString();

  const parsed = new Date(timestamp < 1e12 ? timestamp * 1000 : timestamp);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function formatSalary(job) {
  const min = Number(job.salary_min);
  const max = Number(job.salary_max);
  if (Number.isFinite(min) && Number.isFinite(max)) {
    return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
  }
  return job.salary || 'Not specified';
}

/**
 * Transform RemoteOK job format to our schema
 */
function transformRemoteOKJob(job) {
  if (!job || !job.id || !job.position) return null;
  
  // Extract skills from tags
  const skills = [];
  if (job.tags && Array.isArray(job.tags)) {
    skills.push(...job.tags.slice(0, 10).map(t => t.toString()));
  }

  return {
    title: job.position || 'Unknown Position',
    company: job.company || 'Unknown Company',
    description: job.description ? 
      job.description.replace(/<[^>]*>/g, '').substring(0, 2000) : 
      'No description available.',
    location: job.location || 'Remote',
    salary: formatSalary(job),
    skills_required: skills,
    source: 'external',
    external_id: `remoteok_${job.id}`,
    is_active: true,
    external_url: job.url || `https://remoteok.com/remote-jobs/${job.id}`,
    logo_url: job.company_logo || null,
    created_at: parseJobDate(job.date),
  };
}

/**
 * Fetch jobs from RemoteOK and upsert into database
 */
export async function fetchAndCacheExternalJobs() {
  console.log('[ExternalJobs] Fetching from RemoteOK...');
  
  try {
    const response = await axios.get(REMOTEOK_URL, {
      headers: {
        'User-Agent': 'JobMatch AI - Job Aggregator',
        'Accept': 'application/json',
      },
      timeout: 15000,
    });

    const data = response.data;
    
    // RemoteOK returns array, first item is metadata - skip it
    const jobs = Array.isArray(data) ? data.slice(1) : [];
    
    if (jobs.length === 0) {
      console.log('[ExternalJobs] No jobs returned from RemoteOK');
      return { success: false, count: 0, error: 'No jobs returned' };
    }

    const transformed = jobs
      .map(transformRemoteOKJob)
      .filter(Boolean)
      .slice(0, 100); // Store up to 100 jobs

    // Upsert jobs by external_id to avoid duplicates
    let successCount = 0;
    const batchSize = 20;
    
    for (let i = 0; i < transformed.length; i += batchSize) {
      const batch = transformed.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('jobs')
        .upsert(batch, { 
          onConflict: 'external_id',
          ignoreDuplicates: false 
        });
      
      if (!error) successCount += batch.length;
      else console.error('[ExternalJobs] Batch upsert error:', error.message);
    }

    // Update cache record
    await supabase
      .from('external_job_cache')
      .insert({ job_data: { count: successCount, source: 'remoteok' } });

    let adzunaCount = 0;
    try {
      const adzunaResult = await adzunaService.fetchAndCacheJobs();
      adzunaCount = adzunaResult.count || 0;
    } catch (adzunaErr) {
      console.error('[ExternalJobs] Adzuna fetch failed:', adzunaErr.message);
    }

    console.log(`[ExternalJobs] Successfully cached ${successCount} RemoteOK jobs and ${adzunaCount} Adzuna jobs`);
    return { success: true, count: successCount + adzunaCount, remoteokCount: successCount, adzunaCount };

  } catch (err) {
    console.error('[ExternalJobs] Fetch failed:', err.message);
    return { success: false, count: 0, error: err.message };
  }
}

/**
 * Get the last time external jobs were fetched
 */
export async function getLastFetchTime() {
  const { data } = await supabase
    .from('external_job_cache')
    .select('fetched_at')
    .order('fetched_at', { ascending: false })
    .limit(1);
  
  return data?.[0]?.fetched_at || null;
}

/**
 * Check if jobs need refreshing (older than 6 hours)
 */
export async function shouldRefreshJobs() {
  const lastFetch = await getLastFetchTime();
  if (!lastFetch) return true;
  
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  return new Date(lastFetch) < sixHoursAgo;
}
