-- Run in Supabase SQL Editor if your jobs table already exists
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_filled BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_jobs_filled ON jobs(is_filled);
