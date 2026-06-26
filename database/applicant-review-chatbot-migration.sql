-- Applicant review workflow fields for employers.
-- Run this in Supabase SQL Editor before using the new review tools.

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS employer_notes TEXT,
  ADD COLUMN IF NOT EXISTS employer_rating INTEGER CHECK (employer_rating BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS next_step TEXT,
  ADD COLUMN IF NOT EXISTS interview_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS candidate_message TEXT,
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE applications
  ADD CONSTRAINT applications_status_check CHECK (
    status IN (
      'pending',
      'reviewed',
      'under_review',
      'shortlisted',
      'interview_scheduled',
      'interviewed',
      'accepted',
      'rejected',
      'withdrawn',
      'hired'
    )
  );

CREATE INDEX IF NOT EXISTS idx_applications_interview_at ON applications(interview_at);
