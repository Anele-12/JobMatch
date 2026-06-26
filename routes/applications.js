import express from 'express';
import supabase from '../lib/supabase.js';
import { screenApplication } from '../services/groqService.js';
import { validate } from '../middleware/validate.js';
import { withSignedProfileAssets } from '../lib/profileUtils.js';
import {
  applicationCheckSchema,
  submitApplicationSchema,
  updateApplicationReviewSchema,
  updateApplicationStatusSchema,
} from '../schemas/index.js';

const router = express.Router();

const REVIEW_FIELDS = [
  'employer_notes',
  'employer_rating',
  'next_step',
  'interview_at',
  'candidate_message',
];

const LEGACY_STATUS_MAP = {
  under_review: 'reviewed',
  accepted: 'hired',
  interview_scheduled: 'reviewed',
  interviewed: 'reviewed',
  withdrawn: 'reviewed',
};

function normalizeApplicationReview(app) {
  if (!app) return app;
  const fallback = app.ai_feedback?.employer_review || {};
  const workflowStatus = fallback.status || app.ai_feedback?.workflow_status;

  return {
    ...app,
    status: workflowStatus || (app.status === 'reviewed'
      ? 'under_review'
      : app.status === 'hired'
        ? 'accepted'
        : app.status),
    employer_notes: app.employer_notes ?? fallback.employer_notes ?? '',
    employer_rating: app.employer_rating ?? fallback.employer_rating ?? null,
    next_step: app.next_step ?? fallback.next_step ?? '',
    interview_at: app.interview_at ?? fallback.interview_at ?? null,
    candidate_message: app.candidate_message ?? fallback.candidate_message ?? '',
  };
}

function isMissingReviewColumn(error) {
  const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return (
    error?.code === 'PGRST204' ||
    error?.code === '42703' ||
    (message.includes('column') && REVIEW_FIELDS.some(field => message.includes(field)))
  );
}

function isStatusConstraintError(error) {
  const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return (
    error?.code === '23514' ||
    (message.includes('applications_status_check') || message.includes('violates check constraint'))
  );
}

async function saveWorkflowStatusFallback(id, requestedStatus) {
  const currentRes = await supabase
    .from('applications')
    .select('id, ai_feedback')
    .eq('id', id)
    .single();

  if (currentRes.error) return { data: null, error: currentRes.error };

  const aiFeedback = currentRes.data.ai_feedback && typeof currentRes.data.ai_feedback === 'object'
    ? currentRes.data.ai_feedback
    : {};
  const employerReview = aiFeedback.employer_review && typeof aiFeedback.employer_review === 'object'
    ? aiFeedback.employer_review
    : {};

  return supabase
    .from('applications')
    .update({
      status: LEGACY_STATUS_MAP[requestedStatus] || requestedStatus,
      ai_feedback: {
        ...aiFeedback,
        workflow_status: requestedStatus,
        employer_review: {
          ...employerReview,
          status: requestedStatus,
        },
      },
    })
    .eq('id', id)
    .select()
    .single();
}

// POST /api/applications/check - AI screening before applying
router.post('/check', validate(applicationCheckSchema), async (req, res) => {
  try {
    const { candidate_id, job_id } = req.body;

    // Get candidate profile + skills
    const [profileRes, skillsRes, jobRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', candidate_id).single(),
      supabase.from('candidate_skills').select('skill_name').eq('candidate_id', candidate_id),
      supabase.from('jobs').select('*').eq('id', parseInt(job_id, 10)).single(),
    ]);

    if (profileRes.error?.code === 'PGRST116' || !profileRes.data) {
      return res.status(400).json({ error: 'Please complete your profile before applying' });
    }
    if (profileRes.error) {
      return res.status(500).json({ error: profileRes.error.message });
    }
    if (jobRes.error?.code === 'PGRST116' || !jobRes.data) {
      return res.status(404).json({ error: 'Job not found' });
    }
    if (jobRes.data.is_filled) {
      return res.status(400).json({ error: 'This position has been filled and is no longer accepting applications' });
    }
    if (jobRes.error) {
      return res.status(500).json({ error: jobRes.error.message });
    }

    const candidate = profileRes.data;
    const skills = (skillsRes.data || []).map(s => s.skill_name);
    const job = jobRes.data;

    // Run AI screening
    const screening = await screenApplication({
      candidateSkills: skills,
      candidateExperience: candidate.experience_years || 0,
      jobSkills: job.skills_required || [],
      jobTitle: job.title,
      jobDescription: job.description,
      jobExperienceRequired: job.experience_required,
      candidateHeadline: candidate.headline,
      candidateBio: candidate.bio,
      candidateEducation: candidate.education || [],
      jobEducationRequired: job.education_required || [],
    });

    res.json({ screening, candidate, job });
  } catch (err) {
    console.error('[Applications/check]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/applications - Submit application
router.post('/', validate(submitApplicationSchema), async (req, res) => {
  try {
    const { job_id, candidate_id, ai_screening, cover_letter } = req.body;

    // Check for duplicate application
    const { data: existing } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', job_id)
      .eq('candidate_id', candidate_id)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Already applied to this job' });
    }

    const { data: job } = await supabase
      .from('jobs')
      .select('is_filled')
      .eq('id', parseInt(job_id, 10))
      .single();

    if (job?.is_filled) {
      return res.status(400).json({ error: 'This position has been filled and is no longer accepting applications' });
    }

    const { data, error } = await supabase
      .from('applications')
      .insert({
        job_id: parseInt(job_id),
        candidate_id,
        status: 'pending',
        ai_match_score: ai_screening?.match_percentage || 0,
        ai_feedback: ai_screening || null,
        matching_skills: ai_screening?.matching_skills || [],
        missing_skills: ai_screening?.missing_skills || [],
        cover_letter: cover_letter || null,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({ success: true, application: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/applications/candidate/:candidate_id
router.get('/candidate/:candidate_id', async (req, res) => {
  try {
    const { candidate_id } = req.params;

    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        jobs(id, title, company, location, salary, source, external_url, logo_url)
      `)
      .eq('candidate_id', candidate_id)
      .order('applied_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    res.json({ applications: (data || []).map(normalizeApplicationReview) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/applications/job/:job_id - Employer gets applicants
router.get('/job/:job_id', async (req, res) => {
  try {
    const { job_id } = req.params;

    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        profiles(*)
      `)
      .eq('job_id', job_id)
      .order('ai_match_score', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const candidateIds = [...new Set((data || []).map(app => app.candidate_id).filter(Boolean))];
    const skillsByCandidate = {};

    if (candidateIds.length > 0) {
      const { data: skills, error: skillsError } = await supabase
        .from('candidate_skills')
        .select('candidate_id, skill_name, source')
        .in('candidate_id', candidateIds)
        .order('skill_name', { ascending: true });

      if (skillsError) return res.status(500).json({ error: skillsError.message });

      (skills || []).forEach(skill => {
        if (!skillsByCandidate[skill.candidate_id]) skillsByCandidate[skill.candidate_id] = [];
        skillsByCandidate[skill.candidate_id].push({
          skill_name: skill.skill_name,
          source: skill.source,
        });
      });
    }

    const applications = await Promise.all((data || []).map(async app => {
      const normalizedApp = normalizeApplicationReview(app);
      return {
      ...normalizedApp,
      profiles: normalizedApp.profiles
        ? {
            ...(await withSignedProfileAssets(normalizedApp.profiles)),
            skills: skillsByCandidate[normalizedApp.candidate_id] || [],
          }
        : normalizedApp.profiles,
      };
    }));

    res.json({ applications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/applications/:id/status
router.put('/:id/status', validate(updateApplicationStatusSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const { data, error } = await supabase
      .from('applications')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (!isStatusConstraintError(error)) {
        return res.status(500).json({ error: error.message });
      }

      const fallbackRes = await saveWorkflowStatusFallback(id, status);
      if (fallbackRes.error) return res.status(500).json({ error: fallbackRes.error.message });

      return res.json({
        success: true,
        application: normalizeApplicationReview(fallbackRes.data),
        storage: 'ai_feedback',
      });
    }

    res.json({ success: true, application: normalizeApplicationReview(data) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/applications/:id/review - Employer review notes and next steps
router.put('/:id/review', validate(updateApplicationReviewSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const review = {
      ...req.body,
      interview_at: req.body.interview_at || null,
    };

    Object.keys(review).forEach(key => {
      if (review[key] === undefined) delete review[key];
    });

    const { data, error } = await supabase
      .from('applications')
      .update(review)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (!isMissingReviewColumn(error)) {
        return res.status(500).json({ error: error.message });
      }

      const currentRes = await supabase
        .from('applications')
        .select('id, ai_feedback')
        .eq('id', id)
        .single();

      if (currentRes.error) return res.status(500).json({ error: currentRes.error.message });

      const aiFeedback = currentRes.data.ai_feedback && typeof currentRes.data.ai_feedback === 'object'
        ? currentRes.data.ai_feedback
        : {};

      const fallbackRes = await supabase
        .from('applications')
        .update({
          ai_feedback: {
            ...aiFeedback,
            employer_review: review,
          },
        })
        .eq('id', id)
        .select()
        .single();

      if (fallbackRes.error) return res.status(500).json({ error: fallbackRes.error.message });

      return res.json({
        success: true,
        application: normalizeApplicationReview(fallbackRes.data),
        storage: 'ai_feedback',
      });
    }

    res.json({ success: true, application: normalizeApplicationReview(data) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
