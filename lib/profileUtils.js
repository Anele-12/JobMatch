import supabase from './supabase.js';

export const APPLICATION_STATUSES = [
  'pending',
  'under_review',
  'shortlisted',
  'interview_scheduled',
  'interviewed',
  'accepted',
  'rejected',
  'withdrawn',
];

export function calculateProfileCompletion(profile = {}, skills = []) {
  const checks = [
    Boolean(profile.profile_image_path || profile.profile_image_url),
    Boolean(profile.bio),
    (skills || []).length > 0,
    Number(profile.experience_years) > 0 || Boolean(profile.experience),
    Array.isArray(profile.education) ? profile.education.length > 0 : Boolean(profile.education),
    Boolean(profile.cv_file_path || profile.cv_file_url),
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export async function createSignedUrl(bucket, path, expiresIn = 60 * 60) {
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) return null;
  return data?.signedUrl || null;
}

async function findLatestProfileImageUrl(profileId) {
  if (!profileId) return null;

  const { data: files, error } = await supabase.storage
    .from('profile-images')
    .list(profileId, {
      limit: 20,
      sortBy: { column: 'created_at', order: 'desc' },
    });

  if (error || !files?.length) return null;

  const image = files.find(file =>
    file.name && /\.(jpe?g|png|webp)$/i.test(file.name)
  );
  if (!image) return null;

  const path = `${profileId}/${image.name}`;
  const signedUrl = await createSignedUrl('profile-images', path);
  if (signedUrl) return signedUrl;

  const { data } = supabase.storage
    .from('profile-images')
    .getPublicUrl(path);
  return data?.publicUrl || null;
}

export async function withSignedProfileAssets(profile) {
  if (!profile) return profile;

  const [profile_image_url, cv_file_url] = await Promise.all([
    createSignedUrl('profile-images', profile.profile_image_path),
    createSignedUrl('candidate-documents', profile.cv_file_path),
  ]);
  const fallbackProfileImageUrl = profile_image_url || profile.profile_image_url
    ? null
    : await findLatestProfileImageUrl(profile.id);

  return {
    ...profile,
    profile_image_url: profile_image_url || profile.profile_image_url || fallbackProfileImageUrl || null,
    cv_file_url: cv_file_url || profile.cv_file_url || null,
  };
}
