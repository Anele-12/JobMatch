import express from 'express';
import supabase from '../lib/supabase.js';
import { fetchAndCacheExternalJobs, shouldRefreshJobs } from '../services/externalJobsService.js';
import adzunaService from '../services/adzunaService.js';
import { validate } from '../middleware/validate.js';
import { postJobSchema, toggleJobFilledSchema } from '../schemas/index.js';

const router = express.Router();

const EXPERIENCE_RANGES = {
  entry: { min: 0, max: 1 },
  junior: { min: 1, max: 3 },
  mid: { min: 3, max: 5 },
  senior: { min: 5, max: 50 },
};

const JOB_TYPE_MAP = {
  full_time: 'full_time',
  part_time: 'part_time',
  contract: 'contract',
  freelance: 'freelance',
};

// GET /api/jobs - Get all jobs with optional search/filter
router.get('/', async (req, res) => {
  try {
    const {
      search, keyword, location, source, limit = 50, offset = 0,
      salary, experience_level, job_type, filter_skills, page = 1,
    } = req.query;

    if (source === 'adzuna' || keyword !== undefined) {
      try {
        const result = await adzunaService.searchJobs({
          keyword: keyword || search || '',
          location: location || '',
          page,
        });
        return res.json({ jobs: result.results, total: result.count });
      } catch (err) {
        console.error('[Jobs/Adzuna]', err);
        return res.status(502).json({ error: 'Failed to load jobs from Adzuna' });
      }
    }

    if (source !== 'manual' && await shouldRefreshJobs()) {
      fetchAndCacheExternalJobs().catch(console.error);
    }

    let query = supabase
      .from('jobs')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`title.ilike.%${search}%,company.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (location) {
      query = query.ilike('location', `%${location}%`);
    }

    if (source === 'remoteok') {
      query = query.eq('source', 'external').ilike('external_id', 'remoteok_%');
    } else if (source && source !== 'all') {
      query = query.eq('source', source);
    }

    if (salary) {
      query = query.ilike('salary', `%${salary}%`);
    }

    if (job_type && job_type !== 'all' && JOB_TYPE_MAP[job_type]) {
      query = query.eq('job_type', JOB_TYPE_MAP[job_type]);
    }

    if (experience_level && EXPERIENCE_RANGES[experience_level]) {
      const { min, max } = EXPERIENCE_RANGES[experience_level];
      query = query.gte('experience_required', min).lte('experience_required', max);
    }

    const skillList = filter_skills
      ? filter_skills.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    if (skillList.length) {
      query = query.overlaps('skills_required', skillList);
    }

    const { data, error } = await query;

    if (error) return res.status(500).json({ error: error.message });

    const start = parseInt(offset, 10);
    const end = start + parseInt(limit, 10);
    const jobs = (data || []).slice(start, end);

    res.json({ jobs, total: data?.length || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs/refresh-external - Manually trigger external job fetch
router.post('/refresh-external', async (req, res) => {
  try {
    const result = await fetchAndCacheExternalJobs();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/employer/:employer_id
router.get('/employer/:employer_id', async (req, res) => {
  try {
    const { employer_id } = req.params;

    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        applications(count)
      `)
      .eq('employer_id', employer_id)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    res.json({ jobs: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return res.status(404).json({ error: 'Job not found' });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs - Create job (employer)
router.post('/', validate(postJobSchema), async (req, res) => {
  try {
    const {
      employer_id, title, company, description,
      location, salary, skills_required, experience_required, job_type,
    } = req.body;

    const { data, error } = await supabase
      .from('jobs')
      .insert({
        employer_id,
        title,
        company,
        description,
        location,
        salary,
        skills_required: skills_required || [],
        experience_required: experience_required || 0,
        job_type: job_type || 'full_time',
        source: 'manual',
        is_active: true,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({ success: true, job: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/jobs/:id/filled - Mark job as filled or reopen
router.put('/:id/filled', validate(toggleJobFilledSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { is_filled, employer_id } = req.body;

    const { data: existing, error: fetchError } = await supabase
      .from('jobs')
      .select('id, employer_id, source')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (existing.source !== 'manual') {
      return res.status(400).json({ error: 'Only manual job postings can be marked as filled' });
    }

    if (employer_id && existing.employer_id !== employer_id) {
      return res.status(403).json({ error: 'Not authorized to update this job' });
    }

    const { data, error } = await supabase
      .from('jobs')
      .update({ is_filled })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json({ success: true, job: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/jobs/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    delete updates.id;
    delete updates.employer_id;
    delete updates.source;

    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json({ success: true, job: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/jobs/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('jobs')
      .update({ is_active: false })
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
