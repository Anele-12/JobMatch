-- Run in Supabase SQL Editor

-- Saved jobs
CREATE TABLE IF NOT EXISTS saved_jobs (
  id SERIAL PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(candidate_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_jobs_candidate ON saved_jobs(candidate_id);

ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Backend can read saved jobs"
  ON saved_jobs FOR SELECT USING (TRUE);

CREATE POLICY "Backend can insert saved jobs"
  ON saved_jobs FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Backend can delete saved jobs"
  ON saved_jobs FOR DELETE USING (TRUE);

-- Cover letter on applications
ALTER TABLE applications ADD COLUMN IF NOT EXISTS cover_letter TEXT;

-- Job type for filtering
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_type TEXT DEFAULT 'full_time'
  CHECK (job_type IN ('full_time', 'part_time', 'contract', 'freelance'));
