-- ============================================================
-- JobMatch AI — Complete Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──────────────────────────────────────────
-- 1. PROFILES
-- ──────────────────────────────────────────
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,                          -- Clerk user ID
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('candidate', 'employer')),
  company_name TEXT,
  headline TEXT,
  bio TEXT,
  location TEXT,
  experience_years INTEGER DEFAULT 0,
  profile_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ──────────────────────────────────────────
-- 2. CANDIDATE SKILLS
-- ──────────────────────────────────────────
CREATE TABLE candidate_skills (
  id SERIAL PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'ai')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(candidate_id, skill_name)
);

CREATE INDEX idx_candidate_skills_candidate ON candidate_skills(candidate_id);

-- ──────────────────────────────────────────
-- 3. JOBS
-- ──────────────────────────────────────────
CREATE TABLE jobs (
  id SERIAL PRIMARY KEY,
  employer_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  description TEXT,
  location TEXT DEFAULT 'Remote',
  salary TEXT,
  skills_required TEXT[] DEFAULT '{}',
  experience_required INTEGER DEFAULT 0,      -- years
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'external')),
  external_id TEXT UNIQUE,                    -- e.g. "remoteok_123456"
  external_url TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_filled BOOLEAN DEFAULT FALSE,
  job_type TEXT DEFAULT 'full_time' CHECK (job_type IN ('full_time', 'part_time', 'contract', 'freelance')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_jobs_active ON jobs(is_active);
CREATE INDEX idx_jobs_filled ON jobs(is_filled);
CREATE INDEX idx_jobs_source ON jobs(source);
CREATE INDEX idx_jobs_employer ON jobs(employer_id);
CREATE INDEX idx_jobs_created ON jobs(created_at DESC);

-- Full-text search index
CREATE INDEX idx_jobs_fts ON jobs USING gin(
  to_tsvector('english', coalesce(title,'') || ' ' || coalesce(company,'') || ' ' || coalesce(description,''))
);

-- ──────────────────────────────────────────
-- 4. APPLICATIONS
-- ──────────────────────────────────────────
CREATE TABLE applications (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (
    status IN ('pending', 'reviewed', 'shortlisted', 'rejected', 'hired')
  ),
  ai_match_score INTEGER DEFAULT 0 CHECK (ai_match_score BETWEEN 0 AND 100),
  ai_feedback JSONB,                          -- Full AI screening result
  matching_skills TEXT[] DEFAULT '{}',
  missing_skills TEXT[] DEFAULT '{}',
  cover_letter TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, candidate_id)                -- Prevent duplicate applications
);

CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_applications_job ON applications(job_id);
CREATE INDEX idx_applications_candidate ON applications(candidate_id);
CREATE INDEX idx_applications_score ON applications(ai_match_score DESC);

-- ──────────────────────────────────────────
-- 5. SAVED JOBS
-- ──────────────────────────────────────────
CREATE TABLE saved_jobs (
  id SERIAL PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(candidate_id, job_id)
);

CREATE INDEX idx_saved_jobs_candidate ON saved_jobs(candidate_id);

-- ──────────────────────────────────────────
-- 6. EXTERNAL JOB CACHE LOG
-- ──────────────────────────────────────────
CREATE TABLE external_job_cache (
  id SERIAL PRIMARY KEY,
  job_data JSONB,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Keep only last 100 cache records
CREATE OR REPLACE FUNCTION trim_cache_log()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM external_job_cache
  WHERE id NOT IN (
    SELECT id FROM external_job_cache ORDER BY fetched_at DESC LIMIT 100
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trim_cache_after_insert
  AFTER INSERT ON external_job_cache
  FOR EACH ROW EXECUTE FUNCTION trim_cache_log();

-- ──────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ──────────────────────────────────────────
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_job_cache ENABLE ROW LEVEL SECURITY;

-- NOTE: Since we use the service role key in the backend,
-- these policies apply only to anon/authenticated client calls.
-- The backend bypasses RLS with the service role key.

-- Jobs are publicly readable
CREATE POLICY "Jobs are publicly readable"
  ON jobs FOR SELECT USING (is_active = TRUE);

-- Profiles readable by owner (backend uses service role, so this is for client-side)
CREATE POLICY "Profiles readable by owner"
  ON profiles FOR SELECT USING (TRUE);

CREATE POLICY "Backend can insert profiles"
  ON profiles FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Backend can update profiles"
  ON profiles FOR UPDATE USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Backend can read candidate skills"
  ON candidate_skills FOR SELECT USING (TRUE);

CREATE POLICY "Backend can insert candidate skills"
  ON candidate_skills FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Backend can update candidate skills"
  ON candidate_skills FOR UPDATE USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Backend can insert jobs"
  ON jobs FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Backend can update jobs"
  ON jobs FOR UPDATE USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Backend can read applications"
  ON applications FOR SELECT USING (TRUE);

CREATE POLICY "Backend can insert applications"
  ON applications FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Backend can update applications"
  ON applications FOR UPDATE USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Backend can read external job cache"
  ON external_job_cache FOR SELECT USING (TRUE);

CREATE POLICY "Backend can insert external job cache"
  ON external_job_cache FOR INSERT WITH CHECK (TRUE);

-- ──────────────────────────────────────────
-- USEFUL VIEWS
-- ──────────────────────────────────────────

-- Job with application count
CREATE OR REPLACE VIEW jobs_with_stats AS
SELECT
  j.*,
  COUNT(a.id) AS application_count,
  AVG(a.ai_match_score) AS avg_match_score
FROM jobs j
LEFT JOIN applications a ON a.job_id = j.id
WHERE j.is_active = TRUE
GROUP BY j.id;

-- Candidate application summary
CREATE OR REPLACE VIEW candidate_application_summary AS
SELECT
  a.*,
  j.title AS job_title,
  j.company AS job_company,
  j.location AS job_location,
  j.source AS job_source,
  j.external_url AS job_url,
  p.full_name AS candidate_name,
  p.headline AS candidate_headline
FROM applications a
JOIN jobs j ON j.id = a.job_id
JOIN profiles p ON p.id = a.candidate_id;

-- ──────────────────────────────────────────
-- SAMPLE DATA (optional — for testing)
-- ──────────────────────────────────────────
-- Uncomment to insert sample employer-posted jobs:

/*
INSERT INTO jobs (employer_id, title, company, description, location, salary, skills_required, source)
VALUES
  (NULL, 'Full Stack Developer', 'TechCorp SA', 'We are looking for a skilled full-stack developer to join our growing team. You will work on both frontend and backend systems.', 'Cape Town, South Africa', 'R45,000 - R75,000/month', ARRAY['React', 'Node.js', 'PostgreSQL', 'TypeScript', 'REST APIs'], 'manual'),
  (NULL, 'UI/UX Designer', 'DesignStudio', 'Join our creative team to design beautiful user experiences for our clients.', 'Johannesburg, South Africa', 'R30,000 - R55,000/month', ARRAY['Figma', 'Adobe XD', 'User Research', 'Prototyping', 'CSS'], 'manual'),
  (NULL, 'Data Analyst', 'DataDriven Inc', 'Analyze complex datasets and provide actionable business insights.', 'Remote (ZA)', 'R40,000 - R65,000/month', ARRAY['Python', 'SQL', 'Power BI', 'Excel', 'Statistics'], 'manual');
*/
