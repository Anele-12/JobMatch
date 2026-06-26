-- Profile picture and candidate media fields.
-- Run this in Supabase SQL Editor so uploaded profile pictures persist after refresh.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
  ADD COLUMN IF NOT EXISTS profile_image_path TEXT,
  ADD COLUMN IF NOT EXISTS cv_file_url TEXT,
  ADD COLUMN IF NOT EXISTS cv_file_path TEXT,
  ADD COLUMN IF NOT EXISTS cv_file_name TEXT,
  ADD COLUMN IF NOT EXISTS cv_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS profile_completion INTEGER DEFAULT 0;
