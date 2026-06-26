import express from 'express';
import multer from 'multer';
import supabase from '../lib/supabase.js';
import { validate } from '../middleware/validate.js';
import {
  upsertProfileSchema,
  addSkillsSchema,
  replaceSkillsSchema,
} from '../schemas/index.js';
import { calculateProfileCompletion, withSignedProfileAssets } from '../lib/profileUtils.js';

const router = express.Router();
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, and WebP images are allowed'));
  },
});

async function uploadProfileImage(path, buffer, contentType) {
  const uploadOptions = {
    contentType,
    upsert: true,
  };

  let result = await supabase.storage
    .from('profile-images')
    .upload(path, buffer, uploadOptions);

  const message = `${result.error?.message || ''}`.toLowerCase();
  if (result.error && (message.includes('bucket not found') || message.includes('not found'))) {
    const createResult = await supabase.storage.createBucket('profile-images', {
      public: true,
      fileSizeLimit: 4 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    });

    if (createResult.error) return createResult;

    result = await supabase.storage
      .from('profile-images')
      .upload(path, buffer, uploadOptions);
  }

  return result;
}

const OPTIONAL_PROFILE_COLUMNS = [
  'education',
  'profile_image_path',
  'profile_image_url',
  'cv_file_path',
  'cv_file_url',
  'cv_file_name',
  'cv_uploaded_at',
  'profile_completion',
];

function isMissingProfileColumn(error) {
  const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return (
    error?.code === 'PGRST204' ||
    error?.code === '42703' ||
    (message.includes('column') && OPTIONAL_PROFILE_COLUMNS.some(column => message.includes(column)))
  );
}

async function upsertProfilePayload(payload) {
  let nextPayload = { ...payload };

  for (let attempt = 0; attempt < OPTIONAL_PROFILE_COLUMNS.length + 1; attempt += 1) {
    const result = await supabase
      .from('profiles')
      .upsert(nextPayload, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (!result.error || !isMissingProfileColumn(result.error)) {
      return result;
    }

    const message = `${result.error.message || ''} ${result.error.details || ''}`.toLowerCase();
    const missingColumn = OPTIONAL_PROFILE_COLUMNS.find(column => message.includes(column));
    if (!missingColumn || !(missingColumn in nextPayload)) return result;

    nextPayload = { ...nextPayload };
    delete nextPayload[missingColumn];
  }

  return {
    data: null,
    error: new Error('Could not save profile with the available database columns'),
  };
}

async function updateProfilePayload(userId, payload) {
  let nextPayload = { ...payload };

  for (let attempt = 0; attempt < OPTIONAL_PROFILE_COLUMNS.length + 1; attempt += 1) {
    const result = await supabase
      .from('profiles')
      .update(nextPayload)
      .eq('id', userId)
      .select()
      .maybeSingle();

    if (!result.error || !isMissingProfileColumn(result.error)) {
      return result;
    }

    const message = `${result.error.message || ''} ${result.error.details || ''}`.toLowerCase();
    const missingColumn = OPTIONAL_PROFILE_COLUMNS.find(column => message.includes(column));
    if (!missingColumn || !(missingColumn in nextPayload)) return result;

    nextPayload = { ...nextPayload };
    delete nextPayload[missingColumn];
  }

  return {
    data: null,
    error: new Error('Could not update profile with the available database columns'),
  };
}

async function saveProfileImage(userId, imageUrl, imagePath, profileCompletion) {
  const attempts = [
    { profile_image_path: imagePath, profile_image_url: imageUrl, profile_completion: profileCompletion },
    { profile_image_url: imageUrl, profile_completion: profileCompletion },
    { profile_image_url: imageUrl },
  ];

  let lastResult = { data: null, error: null };
  for (const payload of attempts) {
    lastResult = await updateProfilePayload(userId, payload);
    if (!lastResult.error && lastResult.data) return lastResult;
  }

  return lastResult;
}

// POST /api/profile/skills - Add/update skills
router.post('/skills/update', validate(addSkillsSchema), async (req, res) => {
  try {
    const { candidate_id, skills, source = 'manual' } = req.body;

    const skillRecords = skills.map(skill => ({
      candidate_id,
      skill_name: skill.trim(),
      source,
    }));

    const { error } = await supabase
      .from('candidate_skills')
      .upsert(skillRecords, { onConflict: 'candidate_id,skill_name', ignoreDuplicates: true });

    if (error) return res.status(500).json({ error: error.message });

    const { data: updatedSkills } = await supabase
      .from('candidate_skills')
      .select('skill_name, source')
      .eq('candidate_id', candidate_id);

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', candidate_id)
      .maybeSingle();

    if (profile) {
      await supabase
        .from('profiles')
        .update({ profile_completion: calculateProfileCompletion(profile, updatedSkills || []) })
        .eq('id', candidate_id);
    }

    res.json({ success: true, skills: updatedSkills || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/profile/skills/replace - Replace all candidate skills
router.put('/skills/replace', validate(replaceSkillsSchema), async (req, res) => {
  try {
    const { candidate_id, skills, source = 'manual' } = req.body;

    const { error: deleteError } = await supabase
      .from('candidate_skills')
      .delete()
      .eq('candidate_id', candidate_id);

    if (deleteError) return res.status(500).json({ error: deleteError.message });

    if (skills?.length) {
      const skillRecords = skills.map(skill => ({
        candidate_id,
        skill_name: skill.trim(),
        source,
      }));

      const { error: insertError } = await supabase
        .from('candidate_skills')
        .insert(skillRecords);

      if (insertError) return res.status(500).json({ error: insertError.message });
    }

    const { data: updatedSkills } = await supabase
      .from('candidate_skills')
      .select('skill_name, source')
      .eq('candidate_id', candidate_id);

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', candidate_id)
      .maybeSingle();

    if (profile) {
      await supabase
        .from('profiles')
        .update({ profile_completion: calculateProfileCompletion(profile, updatedSkills || []) })
        .eq('id', candidate_id);
    }

    res.json({ success: true, skills: updatedSkills || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/profile - Create or update profile
router.post('/', validate(upsertProfileSchema), async (req, res) => {
  try {
    const {
      id, email, full_name, role, company_name,
      headline, bio, location, education,
      profile_image_path, cv_file_path, cv_file_name, experience_years,
      profile_completed
    } = req.body;

    const { data: existingProfile, error: existingError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (existingError) return res.status(500).json({ error: existingError.message });

    const resolvedRole = role || existingProfile?.role;
    if (!resolvedRole) {
      return res.status(400).json({
        error: 'Validation failed',
        fields: { role: ['Role is required'] },
      });
    }

    const { data: skills } = await supabase
      .from('candidate_skills')
      .select('skill_name, source')
      .eq('candidate_id', id);

    const profilePayload = {
      id, email, full_name, role: resolvedRole, company_name,
      headline, bio, location,
      education: education || [],
      profile_image_path: profile_image_path || existingProfile?.profile_image_path || null,
      profile_image_url: existingProfile?.profile_image_url || null,
      cv_file_path: cv_file_path || existingProfile?.cv_file_path || null,
      cv_file_url: existingProfile?.cv_file_url || null,
      cv_file_name: cv_file_name || existingProfile?.cv_file_name || null,
      cv_uploaded_at: existingProfile?.cv_uploaded_at || null,
      experience_years: experience_years ? parseInt(experience_years) : 0,
      profile_completed: profile_completed || false,
    };

    profilePayload.profile_completion = calculateProfileCompletion(profilePayload, skills || []);

    const { data, error } = await upsertProfilePayload(profilePayload);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ success: true, profile: await withSignedProfileAssets(data) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/profile/:user_id
router.get('/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user_id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: error.message });
    }

    if (!profile) {
      return res.json({ exists: false, skills: [] });
    }

    const { data: skills } = await supabase
      .from('candidate_skills')
      .select('skill_name, source')
      .eq('candidate_id', user_id);

    const profile_completion = calculateProfileCompletion(profile, skills || []);
    if (profile.profile_completion !== profile_completion) {
      await supabase
        .from('profiles')
        .update({ profile_completion })
        .eq('id', user_id);
    }

    const signedProfile = await withSignedProfileAssets({ ...profile, profile_completion });
    res.json({ ...signedProfile, exists: true, skills: skills || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/profile/:user_id/photo - Upload profile picture
router.post('/:user_id/photo', imageUpload.single('photo'), async (req, res) => {
  try {
    const { user_id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });

    const extension = req.file.mimetype.split('/')[1].replace('jpeg', 'jpg');
    const path = `${user_id}/profile-${Date.now()}.${extension}`;

    const { error: uploadError } = await uploadProfileImage(path, req.file.buffer, req.file.mimetype);

    if (uploadError) return res.status(500).json({ error: uploadError.message });

    const { data: publicData } = supabase.storage
      .from('profile-images')
      .getPublicUrl(path);
    const profileImageUrl = publicData?.publicUrl || null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user_id)
      .maybeSingle();

    const { data: skills } = await supabase
      .from('candidate_skills')
      .select('skill_name, source')
      .eq('candidate_id', user_id);

    const nextProfile = {
      ...(profile || {}),
      profile_image_path: path,
      profile_image_url: profileImageUrl,
    };

    const profile_completion = calculateProfileCompletion(nextProfile, skills || []);
    const { data, error } = await saveProfileImage(user_id, profileImageUrl, path, profile_completion);

    if (error) return res.status(500).json({ error: error.message });

    const responseProfile = data || {
      ...(profile || {}),
      id: user_id,
      profile_image_path: path,
      profile_image_url: profileImageUrl,
      profile_completion,
    };

    res.json({
      success: true,
      profile: await withSignedProfileAssets({
        ...responseProfile,
        profile_image_path: responseProfile.profile_image_path || path,
        profile_image_url: responseProfile.profile_image_url || profileImageUrl,
      }),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/profile/:user_id - Permanently delete account and associated data
router.delete('/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user_id)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (profile.role === 'employer') {
      const { data: employerJobs } = await supabase
        .from('jobs')
        .select('id')
        .eq('employer_id', user_id)
        .eq('source', 'manual');

      const jobIds = (employerJobs || []).map(j => j.id);
      if (jobIds.length) {
        await supabase.from('jobs').delete().in('id', jobIds);
      }
    }

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user_id);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ success: true, message: 'Account and associated data deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
