import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Briefcase, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import SkillInput from '../components/ui/SkillInput';
import Navbar from '../components/layout/Navbar';
import { Spinner, FieldError } from '../components/ui/index';
import { useProfile } from '../hooks/useProfile';
import { postJobSchema, getFieldErrors } from '../lib/validation';

export default function PostJob() {
  const { user } = useUser();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [skills, setSkills] = useState([]);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    title: '',
    company: profile?.company_name || '',
    description: '',
    location: '',
    salary: '',
    experience_required: '',
    job_type: 'full_time',
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fieldErrors = getFieldErrors(postJobSchema, form);
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      await api.post('/api/jobs', {
        employer_id: user.id,
        ...form,
        experience_required: form.experience_required ? parseInt(form.experience_required) : null,
        skills_required: skills.map(s => typeof s === 'string' ? s : s.skill_name),
      });

      toast.success('Job posted successfully!');
      navigate('/employer/dashboard');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-gradient">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="btn-ghost mb-6 text-sm"
        >
          <ArrowLeft size={15} />
          Back
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 bg-gold-500/15 rounded-xl flex items-center justify-center">
            <Briefcase size={20} className="text-gold-400" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-dark-50">Post a Job</h1>
            <p className="text-dark-400 text-sm">Fill in the details to attract the right candidates</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Job Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => update('title', e.target.value)}
                className="input-field"
                placeholder="e.g. Senior React Developer"
              />
              <FieldError error={errors.title} />
            </div>
            <div>
              <label className="label">Company Name *</label>
              <input
                type="text"
                value={form.company}
                onChange={e => update('company', e.target.value)}
                className="input-field"
                placeholder="Your company name"
              />
              <FieldError error={errors.company} />
            </div>
          </div>

          <div>
            <label className="label">Job Description</label>
            <textarea
              value={form.description}
              onChange={e => update('description', e.target.value)}
              rows={6}
              className="input-field resize-none"
              placeholder="Describe the role, responsibilities, and what you're looking for..."
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Job Type</label>
              <select
                value={form.job_type}
                onChange={e => update('job_type', e.target.value)}
                className="input-field"
              >
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="freelance">Freelance</option>
              </select>
            </div>
            <div>
              <label className="label">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={e => update('location', e.target.value)}
                className="input-field"
                placeholder="e.g. Remote, New York"
              />
            </div>
            <div>
              <label className="label">Salary Range</label>
              <input
                type="text"
                value={form.salary}
                onChange={e => update('salary', e.target.value)}
                className="input-field"
                placeholder="e.g. $80k - $120k"
              />
            </div>
            <div>
              <label className="label">Min. Experience (yrs)</label>
              <input
                type="number"
                value={form.experience_required}
                onChange={e => update('experience_required', e.target.value)}
                className="input-field"
                placeholder="e.g. 3"
                min={0}
              />
            </div>
          </div>

          <div>
            <label className="label">Required Skills</label>
            <SkillInput
              skills={skills}
              onChange={setSkills}
              placeholder="e.g. React, TypeScript, Node.js..."
            />
            <p className="text-xs text-dark-500 mt-1">
              These skills are used by AI to screen and rank applicants
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-secondary flex-1 justify-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 justify-center"
            >
              {loading ? <Spinner size={16} /> : 'Post Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
