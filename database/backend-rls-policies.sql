-- Run this in Supabase SQL Editor if profile/job writes fail with RLS errors.
-- The backend should use the secret key (sb_secret_...) which bypasses RLS.
-- These policies are a fallback for service-role-style access via the API.

-- Profiles
CREATE POLICY "Backend can insert profiles"
  ON profiles FOR INSERT WITH CHECK (true);

CREATE POLICY "Backend can update profiles"
  ON profiles FOR UPDATE USING (true) WITH CHECK (true);

-- Candidate skills
CREATE POLICY "Backend can read candidate skills"
  ON candidate_skills FOR SELECT USING (true);

CREATE POLICY "Backend can insert candidate skills"
  ON candidate_skills FOR INSERT WITH CHECK (true);

CREATE POLICY "Backend can update candidate skills"
  ON candidate_skills FOR UPDATE USING (true) WITH CHECK (true);

-- Jobs (writes for employers + external job sync)
CREATE POLICY "Backend can insert jobs"
  ON jobs FOR INSERT WITH CHECK (true);

CREATE POLICY "Backend can update jobs"
  ON jobs FOR UPDATE USING (true) WITH CHECK (true);

-- Applications
CREATE POLICY "Backend can read applications"
  ON applications FOR SELECT USING (true);

CREATE POLICY "Backend can insert applications"
  ON applications FOR INSERT WITH CHECK (true);

CREATE POLICY "Backend can update applications"
  ON applications FOR UPDATE USING (true) WITH CHECK (true);

-- External job cache
CREATE POLICY "Backend can read external job cache"
  ON external_job_cache FOR SELECT USING (true);

CREATE POLICY "Backend can insert external job cache"
  ON external_job_cache FOR INSERT WITH CHECK (true);
