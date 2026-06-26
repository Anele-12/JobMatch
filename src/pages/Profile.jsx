import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/clerk-react';
import {
  User, Building2, MapPin, Clock, Pencil, X, Save,
  AlertTriangle, Trash2, Mail, Camera, Upload, GraduationCap, FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useProfile } from '../hooks/useProfile';
import { useAppStore } from '../store/appStore';
import SkillInput from '../components/ui/SkillInput';
import Navbar from '../components/layout/Navbar';
import { Spinner, FieldError } from '../components/ui/index';
import { profileSchema, getFieldErrors } from '../lib/validation';

function Field({ label, value, children, editing }) {
  if (editing) {
    return (
      <div>
        <label className="label">{label}</label>
        {children}
      </div>
    );
  }
  return (
    <div>
      <p className="text-xs text-dark-500 mb-1">{label}</p>
      <p className="text-dark-100 text-sm">{value || '—'}</p>
    </div>
  );
}

export default function Profile() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const { profile, skills, saveProfile, fetchProfile, loading, profileFetched } = useProfile();
  const { clearProfile } = useAppStore();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState('');
  const [profileImagePreview, setProfileImagePreview] = useState('');
  const [form, setForm] = useState({
    full_name: '',
    headline: '',
    bio: '',
    location: '',
    experience_years: '',
    company_name: '',
    education: '',
  });
  const [editSkills, setEditSkills] = useState([]);

  const isCandidate = profile?.role === 'candidate';
  const profileImageSrc = profileImagePreview || profile?.profile_image_url;

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        headline: profile.headline || '',
        bio: profile.bio || '',
        location: profile.location || '',
        experience_years: profile.experience_years?.toString() || '',
        company_name: profile.company_name || '',
        education: Array.isArray(profile.education) ? profile.education.join('\n') : '',
      });
      setEditSkills(skills.map(s => (typeof s === 'string' ? s : s.skill_name)));
    }
  }, [profile, skills]);

  useEffect(() => () => {
    if (profileImagePreview) URL.revokeObjectURL(profileImagePreview);
  }, [profileImagePreview]);

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    const fieldErrors = getFieldErrors(profileSchema, form);
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    setSaving(true);
    try {
      await saveProfile({
        full_name: form.full_name.trim(),
        role: profile.role,
        headline: form.headline,
        bio: form.bio,
        location: form.location,
        education: form.education.split('\n').map(item => item.trim()).filter(Boolean),
        experience_years: form.experience_years ? parseInt(form.experience_years, 10) : 0,
        company_name: form.company_name,
        profile_completed: true,
      });

      if (isCandidate) {
        const result = await api.put('/api/profile/skills/replace', {
          candidate_id: user.id,
          skills: editSkills,
        });
        useAppStore.getState().setSkills(result.skills);
      }

      await fetchProfile(true);
      setEditing(false);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete !== 'DELETE') {
      toast.error('Type DELETE to confirm');
      return;
    }

    setDeleting(true);
    try {
      await api.delete(`/api/profile/${user.id}`);
      clearProfile();

      try {
        await user.delete();
      } catch {
        await signOut();
      }

      toast.success('Account deleted');
      navigate('/');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (!profileFetched || loading) {
    return (
      <div className="min-h-screen bg-dark-gradient flex items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  if (!profile?.profile_completed) {
    navigate('/profile-setup', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-dark-gradient">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="section-title">My Profile</h1>
            <p className="text-dark-400 text-sm mt-1 flex items-center gap-1.5">
              <Mail size={12} />
              {profile.email}
            </p>
          </div>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="btn-secondary text-sm">
              <Pencil size={14} />
              Edit Profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditing(false);
                  setForm({
                    full_name: profile.full_name || '',
                    headline: profile.headline || '',
                    bio: profile.bio || '',
                  location: profile.location || '',
                  experience_years: profile.experience_years?.toString() || '',
                  company_name: profile.company_name || '',
                  education: Array.isArray(profile.education) ? profile.education.join('\n') : '',
                });
                  setEditSkills(skills.map(s => (typeof s === 'string' ? s : s.skill_name)));
                }}
                className="btn-ghost text-sm"
              >
                <X size={14} />
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
                {saving ? <Spinner size={14} /> : <Save size={14} />}
                Save
              </button>
            </div>
          )}
        </div>

        <div className="card space-y-6">
          {isCandidate && (
            <div className="bg-dark-700/50 rounded-xl p-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-dark-200 font-medium">Profile completion</span>
                <span className="text-gold-400">{profile.profile_completion || 0}%</span>
              </div>
              <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                <div className="h-full bg-gold-gradient" style={{ width: `${profile.profile_completion || 0}%` }} />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pb-4 border-b border-dark-700">
            {isCandidate && profileImageSrc ? (
              <img
                src={profileImageSrc}
                alt={profile.full_name || 'Profile'}
                className="w-14 h-14 rounded-xl object-cover border border-dark-600"
              />
            ) : (
              <div className="w-12 h-12 bg-gold-500/15 rounded-xl flex items-center justify-center">
                {isCandidate
                  ? <User size={20} className="text-gold-400" />
                  : <Building2 size={20} className="text-gold-400" />}
              </div>
            )}
            <div>
              <h2 className="font-semibold text-dark-100">
                {isCandidate ? 'Candidate Profile' : 'Employer Profile'}
              </h2>
              <span className="badge badge-gold text-xs capitalize">{profile.role}</span>
            </div>
          </div>

          {editing && isCandidate && (
            <label className="btn-secondary w-full justify-center text-sm cursor-pointer">
              <Camera size={16} />
              Upload Profile Picture
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={async e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (profileImagePreview) URL.revokeObjectURL(profileImagePreview);
                  setProfileImagePreview(URL.createObjectURL(file));
                  const formData = new FormData();
                  formData.append('photo', file);
                  setSaving(true);
                  try {
                    const result = await api.post(`/api/profile/${user.id}/photo`, formData, {
                      headers: { 'Content-Type': 'multipart/form-data' },
                    });
                    useAppStore.getState().setProfile({
                      ...profile,
                      ...result.profile,
                    });
                    toast.success('Profile picture updated');
                  } catch (err) {
                    setProfileImagePreview('');
                    toast.error(err.message);
                  } finally {
                    setSaving(false);
                  }
                }}
              />
            </label>
          )}

          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Full Name" value={form.full_name} editing={editing}>
              <input
                type="text"
                value={form.full_name}
                onChange={e => update('full_name', e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                className="input-field"
              />
              <FieldError error={errors.full_name} />
            </Field>

            {!isCandidate && (
              <Field label="Company Name" value={form.company_name} editing={editing}>
                <input
                  type="text"
                  value={form.company_name}
                  onChange={e => update('company_name', e.target.value)}
                  className="input-field"
                />
              </Field>
            )}

            <Field label="Headline" value={form.headline} editing={editing}>
              <input
                type="text"
                value={form.headline}
                onChange={e => update('headline', e.target.value)}
                className="input-field"
              />
            </Field>

            <Field label="Location" value={form.location} editing={editing}>
              <div className="relative">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                <input
                  type="text"
                  value={form.location}
                  onChange={e => update('location', e.target.value)}
                  className="input-field pl-9"
                />
              </div>
            </Field>

            {isCandidate && (
              <Field
                label="Years of Experience"
                value={form.experience_years ? `${form.experience_years} years` : '—'}
                editing={editing}
              >
                <div className="relative">
                  <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                  <input
                    type="number"
                    value={form.experience_years}
                    onChange={e => update('experience_years', e.target.value)}
                    className="input-field pl-9"
                    min={0}
                    max={50}
                  />
                </div>
              </Field>
            )}

          </div>

          <Field label="Bio" value={form.bio} editing={editing}>
            <textarea
              value={form.bio}
              onChange={e => update('bio', e.target.value)}
              rows={4}
              className="input-field resize-none"
            />
          </Field>

          {isCandidate && (
            <>
              <Field label="Education" value={form.education} editing={editing}>
                <div className="relative">
                  <GraduationCap size={14} className="absolute left-3 top-3 text-dark-500" />
                  <textarea
                    value={form.education}
                    onChange={e => update('education', e.target.value)}
                    rows={3}
                    className="input-field resize-none pl-9"
                    placeholder="One degree, certificate, or qualification per line"
                  />
                </div>
              </Field>

              <div>
                <p className="text-xs text-dark-500 mb-2">Skills</p>
                {editing ? (
                  <SkillInput skills={editSkills} onChange={setEditSkills} />
                ) : editSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {editSkills.map(skill => (
                      <span key={skill} className="skill-tag text-xs">{skill}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-dark-400 text-sm">No skills added yet</p>
                )}
              </div>

              <div>
                <p className="text-xs text-dark-500 mb-2">CV / Resume</p>
                {profile.cv_file_url ? (
                  <a
                    href={profile.cv_file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary text-sm inline-flex"
                  >
                    <FileText size={14} />
                    {profile.cv_file_name || 'View CV'}
                  </a>
                ) : (
                  <button onClick={() => navigate('/cv-upload')} className="btn-secondary text-sm">
                    <Upload size={14} />
                    Upload CV
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Danger Zone */}
        <div className="card border-red-500/20 mt-8 space-y-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle size={18} />
            <h3 className="font-semibold">Danger Zone</h3>
          </div>
          <p className="text-dark-400 text-sm">
            Permanently delete your account and all associated data including
            {isCandidate ? ' applications and skills' : ' job postings and applicant data'}.
            This action cannot be undone.
          </p>
          <div>
            <label className="label text-red-400/80">
              Type <span className="font-mono font-bold">DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={confirmDelete}
              onChange={e => setConfirmDelete(e.target.value)}
              className="input-field border-red-500/20 focus:border-red-500/40"
              placeholder="DELETE"
            />
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting || confirmDelete !== 'DELETE'}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {deleting ? <Spinner size={14} /> : <Trash2 size={14} />}
            Delete Account Permanently
          </button>
        </div>
      </div>

    </div>
  );
}
