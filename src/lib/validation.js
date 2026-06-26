import { z } from 'zod';

export const profileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(120),
  headline: z.string().max(200).optional(),
  bio: z.string().max(2000).optional(),
  location: z.string().max(120).optional(),
  education: z.string().max(2000).optional(),
  experience_years: z.string().optional(),
  company_name: z.string().max(120).optional(),
});

export const postJobSchema = z.object({
  title: z.string().min(1, 'Job title is required').max(200),
  company: z.string().min(1, 'Company is required').max(120),
  description: z.string().max(10000).optional(),
  location: z.string().max(120).optional(),
  salary: z.string().max(120).optional(),
  experience_required: z.string().optional(),
  job_type: z.string().optional(),
});

export function getFieldErrors(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) return {};
  const fields = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] || '_form';
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}
