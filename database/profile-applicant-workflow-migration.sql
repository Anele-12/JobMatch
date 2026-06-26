-- JobMatch AI profile, applicant review, and matching workflow updates
-- Run this in Supabase SQL Editor.

-- Candidate profile enrichment
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS education TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_image_path TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cv_file_path TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cv_file_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cv_file_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cv_uploaded_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_completion INTEGER DEFAULT 0 CHECK (profile_completion BETWEEN 0 AND 100);

-- Optional employer-side requirements used by matching
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS education_required TEXT[] DEFAULT '{}';

-- Expanded applicant pipeline statuses
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE applications ADD CONSTRAINT applications_status_check CHECK (
  status IN (
    'pending',
    'under_review',
    'shortlisted',
    'interview_scheduled',
    'interviewed',
    'accepted',
    'rejected',
    'withdrawn'
  )
);

-- Preserve older data from the previous status names.
UPDATE applications SET status = 'under_review' WHERE status = 'reviewed';
UPDATE applications SET status = 'accepted' WHERE status = 'hired';

-- Private storage buckets used by the backend service role.
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('profile-images', 'profile-images', false),
  ('candidate-documents', 'candidate-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Service-role backend bypasses RLS. These policies are for authenticated clients if needed.
DROP POLICY IF EXISTS "Authenticated users can read signed profile images" ON storage.objects;
CREATE POLICY "Authenticated users can read signed profile images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can read signed candidate documents" ON storage.objects;
CREATE POLICY "Authenticated users can read signed candidate documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'candidate-documents' AND auth.role() = 'authenticated');
