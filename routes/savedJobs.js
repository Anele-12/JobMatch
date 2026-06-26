import express from 'express';
import supabase from '../lib/supabase.js';
import { validate } from '../middleware/validate.js';
import { saveExternalJobSchema, saveJobSchema } from '../schemas/index.js';

const router = express.Router();

function formatSalary(min, max) {
  const salaryMin = Number(min);
  const salaryMax = Number(max);

  if (Number.isFinite(salaryMin) && Number.isFinite(salaryMax) && (salaryMin > 0 || salaryMax > 0)) {
    return `R${salaryMin.toLocaleString()} - R${salaryMax.toLocaleString()}`;
  }
  if (Number.isFinite(salaryMin) && salaryMin > 0) return `From R${salaryMin.toLocaleString()}`;
  if (Number.isFinite(salaryMax) && salaryMax > 0) return `Up to R${salaryMax.toLocaleString()}`;
  return 'Not specified';
}

function parseDate(value) {
  const parsed = new Date(value || Date.now());
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function toAdzunaJobRow(job) {
  return {
    title: job.title,
    company: job.company?.display_name || 'Unknown Company',
    description: job.description || 'No description available.',
    location: job.location?.display_name || 'South Africa',
    salary: formatSalary(job.salary_min, job.salary_max),
    skills_required: [],
    source: 'external',
    external_id: `adzuna_${job.id}`,
    is_active: true,
    external_url: job.redirect_url || null,
    logo_url: null,
    created_at: parseDate(job.created),
  };
}

// GET /api/saved-jobs/:candidate_id
router.get('/:candidate_id', async (req, res) => {
  try {
    const { candidate_id } = req.params;

    const { data, error } = await supabase
      .from('saved_jobs')
      .select(`
        job_id,
        saved_at,
        jobs (*)
      `)
      .eq('candidate_id', candidate_id)
      .order('saved_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const jobs = (data || [])
      .map(row => row.jobs)
      .filter(Boolean);

    const jobIds = (data || []).map(row => row.job_id);

    res.json({ jobs, job_ids: jobIds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/saved-jobs - Save a job
router.post('/', validate(saveJobSchema), async (req, res) => {
  try {
    const { candidate_id, job_id } = req.body;

    const { data, error } = await supabase
      .from('saved_jobs')
      .upsert({ candidate_id, job_id }, { onConflict: 'candidate_id,job_id' })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({ success: true, saved: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/saved-jobs/external - Save a live Adzuna job by first caching it locally
router.post('/external', validate(saveExternalJobSchema), async (req, res) => {
  try {
    const { candidate_id, job } = req.body;
    const row = toAdzunaJobRow(job);

    const { data: localJob, error: jobError } = await supabase
      .from('jobs')
      .upsert(row, {
        onConflict: 'external_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (jobError) return res.status(500).json({ error: jobError.message });

    const { data: saved, error: savedError } = await supabase
      .from('saved_jobs')
      .upsert(
        { candidate_id, job_id: localJob.id },
        { onConflict: 'candidate_id,job_id' },
      )
      .select()
      .single();

    if (savedError) return res.status(500).json({ error: savedError.message });

    res.status(201).json({ success: true, saved, job: localJob });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/saved-jobs/:candidate_id/:job_id
router.delete('/:candidate_id/:job_id', async (req, res) => {
  try {
    const { candidate_id, job_id } = req.params;

    const { error } = await supabase
      .from('saved_jobs')
      .delete()
      .eq('candidate_id', candidate_id)
      .eq('job_id', parseInt(job_id, 10));

    if (error) return res.status(500).json({ error: error.message });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
