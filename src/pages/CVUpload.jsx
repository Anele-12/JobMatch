import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Upload, FileText, CheckCircle, Sparkles, ArrowRight, SkipForward, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAppStore } from '../store/appStore';
import Navbar from '../components/layout/Navbar';
import { Spinner, SkillTag } from '../components/ui/index';

export default function CVUpload() {
  const { user } = useUser();
  const { setSkills, setProfile } = useAppStore();
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const onDrop = useCallback((accepted) => {
    if (accepted.length > 0) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handleUpload = async () => {
    if (!file || !user?.id) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('cv', file);
    formData.append('candidate_id', user.id);

    try {
      const response = await api.post('/api/cv/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setResult(response);
      if (response.all_skills) setSkills(response.all_skills);
      if (response.profile) setProfile(response.profile);
      toast.success(response.message || 'CV analyzed successfully!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-gradient">
      <Navbar />

      <div className="max-w-xl mx-auto px-4 py-12">
        <button
          onClick={() => navigate('/profile-setup')}
          className="flex items-center gap-1.5 text-dark-400 hover:text-dark-100 text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Profile Setup
        </button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold text-dark-50 mb-2">Upload Your CV</h1>
          <p className="text-dark-400">Our AI will extract your skills automatically</p>
        </div>

        {!result ? (
          <div className="card space-y-6">
            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
                isDragActive
                  ? 'border-gold-400 bg-gold-500/10'
                  : file
                  ? 'border-emerald-400 bg-emerald-500/5'
                  : 'border-dark-500 hover:border-gold-500/50 hover:bg-dark-700/50'
              }`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-3">
                {file ? (
                  <>
                    <FileText size={40} className="text-emerald-400" />
                    <div>
                      <p className="font-medium text-dark-100">{file.name}</p>
                      <p className="text-dark-400 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <p className="text-emerald-400 text-sm">✓ Ready to analyze</p>
                  </>
                ) : (
                  <>
                    <Upload size={40} className="text-dark-400" />
                    <div>
                      <p className="font-medium text-dark-200">
                        {isDragActive ? 'Drop your CV here' : 'Drag & drop your CV'}
                      </p>
                      <p className="text-dark-400 text-sm mt-1">or click to browse · PDF only · Max 10MB</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* What AI extracts */}
            <div className="bg-dark-700/50 rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium text-dark-200 flex items-center gap-2">
                <Sparkles size={14} className="text-gold-400" />
                What AI will extract:
              </p>
              {['Technical & soft skills', 'Years of experience', 'Job titles & roles', 'Education & certifications'].map(item => (
                <div key={item} className="flex items-center gap-2 text-sm text-dark-400">
                  <CheckCircle size={12} className="text-emerald-400" />
                  {item}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-ghost flex-1 justify-center"
              >
                <SkipForward size={15} />
                Skip for now
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="btn-primary flex-1 justify-center"
              >
                {uploading ? (
                  <>
                    <Spinner size={16} />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Analyze CV
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Results */
          <div className="card space-y-6 animate-slide-up">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-emerald-400" />
              </div>
              <h2 className="text-xl font-display font-bold text-dark-50 mb-1">CV Analyzed!</h2>
              <p className="text-dark-400 text-sm">{result.message}</p>
            </div>

            {/* Extracted skills */}
            {result.extracted?.skills?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-dark-300 mb-3 flex items-center gap-2">
                  <Sparkles size={14} className="text-gold-400" />
                  AI-Extracted Skills ({result.extracted.skills.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.extracted.skills.map(skill => (
                    <span key={skill} className="skill-tag-ai text-xs">{skill}</span>
                  ))}
                </div>
              </div>
            )}

            {result.extracted?.experience_years > 0 && (
              <div className="bg-dark-700/50 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-400" />
                <span className="text-sm text-dark-300">
                  Detected {result.extracted.experience_years} years of experience
                </span>
              </div>
            )}

            <button
              onClick={() => navigate('/dashboard')}
              className="btn-primary w-full justify-center"
            >
              Browse Jobs
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
