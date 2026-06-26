import { z } from 'zod';

export const createProfileSchema = z.object({
  id: z.string().min(1, 'User id is required'),
  email: z.string().email('Valid email is required'),
  full_name: z.string().min(1, 'Full name is required').max(120),
  role: z.enum(['candidate', 'employer']),
  company_name: z.string().max(120).optional().nullable(),
  headline: z.string().max(200).optional().nullable(),
  bio: z.string().max(2000).optional().nullable(),
  location: z.string().max(120).optional().nullable(),
  education: z.array(z.string().max(200)).optional().nullable(),
  profile_image_path: z.string().max(500).optional().nullable(),
  cv_file_path: z.string().max(500).optional().nullable(),
  cv_file_name: z.string().max(255).optional().nullable(),
  experience_years: z.coerce.number().int().min(0).max(50).optional(),
  profile_completion: z.coerce.number().int().min(0).max(100).optional(),
  profile_completed: z.boolean().optional(),
});

export const upsertProfileSchema = createProfileSchema.extend({
  role: z.enum(['candidate', 'employer']).optional(),
});

export const updateProfileSchema = createProfileSchema.partial().extend({
  id: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

export const addSkillsSchema = z.object({
  candidate_id: z.string().min(1, 'candidate_id is required'),
  skills: z.array(z.string().min(1).max(80)).min(1, 'At least one skill is required'),
  source: z.enum(['manual', 'ai']).optional(),
});

export const replaceSkillsSchema = z.object({
  candidate_id: z.string().min(1, 'candidate_id is required'),
  skills: z.array(z.string().min(1).max(80)),
  source: z.enum(['manual', 'ai']).optional(),
});

export const postJobSchema = z.object({
  employer_id: z.string().min(1, 'employer_id is required'),
  title: z.string().min(1, 'Job title is required').max(200),
  company: z.string().min(1, 'Company is required').max(120),
  description: z.string().max(10000).optional().nullable(),
  location: z.string().max(120).optional().nullable(),
  salary: z.string().max(120).optional().nullable(),
  skills_required: z.array(z.string().max(80)).optional(),
  experience_required: z.coerce.number().int().min(0).max(50).optional().nullable(),
  job_type: z.enum(['full_time', 'part_time', 'contract', 'freelance']).optional(),
});

export const applicationCheckSchema = z.object({
  candidate_id: z.string().min(1, 'candidate_id is required'),
  job_id: z.coerce.number().int().positive('job_id is required'),
  candidate_skills: z.array(z.string().min(1).max(80)).optional(),
  candidate_experience: z.coerce.number().int().min(0).max(50).optional(),
});

export const submitApplicationSchema = z.object({
  job_id: z.coerce.number().int().positive('job_id is required'),
  candidate_id: z.string().min(1, 'candidate_id is required'),
  cover_letter: z.string().max(5000).optional().nullable(),
  ai_screening: z.object({
    match_percentage: z.number().optional(),
    matching_skills: z.array(z.string()).optional(),
    related_skills: z.array(z.string()).optional(),
    missing_skills: z.array(z.string()).optional(),
    matching_education: z.array(z.string()).optional(),
    missing_education: z.array(z.string()).optional(),
    score_breakdown: z.record(z.string(), z.number()).optional(),
    experience_feedback: z.string().optional(),
    recommendation: z.string().optional(),
    summary: z.string().optional(),
    qualifies: z.boolean().optional(),
  }).optional().nullable(),
});

export const applicationStatusValues = [
  'pending',
  'under_review',
  'shortlisted',
  'interview_scheduled',
  'interviewed',
  'accepted',
  'rejected',
  'withdrawn',
];

export const saveJobSchema = z.object({
  candidate_id: z.string().min(1, 'candidate_id is required'),
  job_id: z.coerce.number().int().positive('job_id is required'),
});

export const saveExternalJobSchema = z.object({
  candidate_id: z.string().min(1, 'candidate_id is required'),
  job: z.object({
    id: z.string().min(1, 'external job id is required'),
    title: z.string().min(1, 'title is required').max(300),
    description: z.string().max(10000).optional().nullable(),
    redirect_url: z.string().max(1000).optional().nullable(),
    company: z.object({
      display_name: z.string().max(200).optional().nullable(),
    }).optional().nullable(),
    location: z.object({
      display_name: z.string().max(200).optional().nullable(),
    }).optional().nullable(),
    salary_min: z.coerce.number().optional().nullable(),
    salary_max: z.coerce.number().optional().nullable(),
    created: z.string().optional().nullable(),
  }),
});

export const updateApplicationStatusSchema = z.object({
  status: z.enum(applicationStatusValues),
});

export const updateApplicationReviewSchema = z.object({
  status: z.enum(applicationStatusValues).optional(),
  employer_notes: z.string().max(5000).optional().nullable(),
  employer_rating: z.coerce.number().int().min(0).max(5).optional().nullable(),
  next_step: z.string().max(500).optional().nullable(),
  interview_at: z.string().datetime().optional().nullable().or(z.literal('')),
  candidate_message: z.string().max(5000).optional().nullable(),
});

export const chatAssistantSchema = z.object({
  role: z.enum(['candidate', 'employer']),
  message: z.string().min(1, 'Message is required').max(2000),
  context: z.object({
    name: z.string().max(120).optional().nullable(),
    company_name: z.string().max(120).optional().nullable(),
    headline: z.string().max(200).optional().nullable(),
    skills: z.array(z.string().max(80)).optional(),
    current_page: z.string().max(120).optional(),
  }).optional(),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(2000),
  })).max(8).optional(),
});

export const toggleJobFilledSchema = z.object({
  is_filled: z.boolean(),
  employer_id: z.string().min(1).optional(),
});
