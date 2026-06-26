import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { User, Building2, MapPin, Clock, ChevronRight, ArrowLeft, GraduationCap, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useProfile } from '../hooks/useProfile';
import { useAppStore } from '../store/appStore';
import SkillInput from '../components/ui/SkillInput';
import Navbar from '../components/layout/Navbar';
import { Spinner, FieldError } from '../components/ui/index';
import { profileSchema, getFieldErrors } from '../lib/validation';

export default function ProfileSetup() {
  const { user } = useUser();
  const { saveProfile, saveSkills } = useProfile();
  const { selectedRole } = useAppStore();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [skills, setSkills] = useState([]);
  const [errors, setErrors] = useState({});
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState('');

  const [form, setForm] = useState({
    full_name: user?.fullName || '',
    headline: '',
    bio: '',
    location: '',
    experience_years: '',
    company_name: '',
    education: '',
  });

  const role = selectedRole || 'candidate';
  const isCandidate = role === 'candidate';

  useEffect(() => () => {
    if (profileImagePreview) URL.revokeObjectURL(profileImagePreview);
  }, [profileImagePreview]);

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    const fieldErrors = getFieldErrors(profileSchema, form);
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      await saveProfile({
        full_name: form.full_name.trim(),
        role,
        headline: form.headline,
        bio: form.bio,
        location: form.location,
        education: form.education.split('\n').map(item => item.trim()).filter(Boolean),
        experience_years: form.experience_years ? parseInt(form.experience_years) : 0,
        company_name: form.company_name,
        profile_completed: true,
      });

      if (isCandidate && profileImageFile) {
        const imageData = new FormData();
        imageData.append('photo', profileImageFile);
        const result = await api.post(`/api/profile/${user.id}/photo`, imageData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        useAppStore.getState().setProfile(result.profile);
      }

      if (isCandidate && skills.length > 0) {
        await saveSkills(skills.map(s => typeof s === 'string' ? s : s.skill_name));
      }

      toast.success('Profile created successfully!');

      if (isCandidate) navigate('/cv-upload');
      else navigate('/employer/dashboard');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-gradient">
      <Navbar />

      <div className="max-w-xl mx-auto px-4 py-12">
        <button
          onClick={() => (step > 1 ? setStep(1) : navigate('/role-select'))}
          className="flex items-center gap-1.5 text-dark-400 hover:text-dark-100 text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          {step > 1 ? 'Back to details' : 'Back'}
        </button>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-display font-bold text-dark-50">Set Up Your Profile</h1>
            <span className="text-dark-400 text-sm">Step {step} of {isCandidate ? 2 : 1}</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill bg-gold-gradient"
              style={{ width: `${(step / (isCandidate ? 2 : 1)) * 100}%` }}
            />
          </div>
        </div>

        <div className="card space-y-5">
          {step === 1 && (
            <>
              <div className="flex items-center gap-3 pb-4 border-b border-dark-700">
                {isCandidate && profileImagePreview ? (
                  <img
                    src={profileImagePreview}
                    alt="Profile preview"
                    className="w-10 h-10 rounded-xl object-cover border border-dark-600"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gold-500/15 rounded-xl flex items-center justify-center">
                    {isCandidate ? <User size={18} className="text-gold-400" /> : <Building2 size={18} className="text-gold-400" />}
                  </div>
                )}
                <div>
                  <h2 className="font-semibold text-dark-100">
                    {isCandidate ? 'Personal Information' : 'Company Information'}
                  </h2>
                  <p className="text-xs text-dark-400">Tell us about yourself</p>
                </div>
              </div>

              {isCandidate && (
                <label className="btn-secondary w-full justify-center text-sm cursor-pointer">
                  <Camera size={16} />
                  {profileImageFile ? 'Change Profile Picture' : 'Upload Profile Picture'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (profileImagePreview) URL.revokeObjectURL(profileImagePreview);
                      setProfileImageFile(file);
                      setProfileImagePreview(URL.createObjectURL(file));
                    }}
                  />
                </label>
              )}

              <div>
                <label className="label">Full Name *</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={e => update('full_name', e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                  className="input-field"
                  placeholder="Your full name (letters only)"
                />
                <FieldError error={errors.full_name} />
              </div>

              {!isCandidate && (
                <div>
                  <label className="label">Company Name *</label>
                  <input
                    type="text"
                    value={form.company_name}
                    onChange={e => update('company_name', e.target.value)}
                    className="input-field"
                    placeholder="Your company name"
                  />
                </div>
              )}

              <div>
                <label className="label">Professional Headline</label>
                <input
                  type="text"
                  value={form.headline}
                  onChange={e => update('headline', e.target.value)}
                  className="input-field"
                  placeholder={isCandidate ? 'e.g. Senior React Developer' : 'e.g. Growing SaaS startup seeking top talent'}
                />
              </div>

              <div>
                <label className="label">Bio</label>
                <textarea
                  value={form.bio}
                  onChange={e => update('bio', e.target.value)}
                  rows={3}
                  className="input-field resize-none"
                  placeholder="Brief description about yourself or your company..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label flex items-center gap-1"><MapPin size={12} />Location</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={e => update('location', e.target.value)}
                    className="input-field"
                    placeholder="City, Country"
                  />
                </div>

                {isCandidate && (
                  <div>
                    <label className="label flex items-center gap-1"><Clock size={12} />Experience</label>
                    <input
                      type="number"
                      value={form.experience_years}
                      onChange={e => update('experience_years', e.target.value)}
                      className="input-field"
                      placeholder="Years"
                      min={0}
                      max={50}
                    />
                  </div>
                )}
              </div>

              {isCandidate && (
                <>
                  <div>
                    <label className="label flex items-center gap-1"><GraduationCap size={12} />Education</label>
                    <textarea
                      value={form.education}
                      onChange={e => update('education', e.target.value)}
                      rows={3}
                      className="input-field resize-none"
                      placeholder="One degree, certificate, or qualification per line"
                    />
                  </div>
                </>
              )}

              <button
                onClick={() => isCandidate ? setStep(2) : handleSubmit()}
                disabled={loading || !form.full_name.trim()}
                className="btn-primary w-full justify-center"
              >
                {loading ? <Spinner size={16} /> : (isCandidate ? <>Next <ChevronRight size={16} /></> : 'Create Profile')}
              </button>
            </>
          )}

          {step === 2 && isCandidate && (
            <>
              <div className="flex items-center gap-3 pb-4 border-b border-dark-700">
                <div className="w-10 h-10 bg-gold-500/15 rounded-xl flex items-center justify-center">
                  <ChevronRight size={18} className="text-gold-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-dark-100">Your Skills</h2>
                  <p className="text-xs text-dark-400">Add skills you have (AI will also extract more from your CV)</p>
                </div>
              </div>

              <div>
                <label className="label">Skills *</label>
                <SkillInput
                  skills={skills}
                  onChange={setSkills}
                  placeholder="e.g. React, Python, SQL..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="btn-secondary flex-1 justify-center"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="btn-primary flex-1 justify-center"
                >
                  {loading ? <Spinner size={16} /> : 'Create Profile'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  );
}
