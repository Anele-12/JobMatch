import { useState } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Star, Sparkles, TrendingUp, FileText } from 'lucide-react';
import { MatchRing, Spinner } from '../ui/index';

export default function AIScreeningModal({
  screening,
  job,
  loading,
  submitting,
  onProceed,
  onCancel,
}) {
  const [step, setStep] = useState('screening');
  const [coverLetter, setCoverLetter] = useState('');

  if (!screening && !loading) return null;

  const qualifies = Boolean(screening?.qualifies && screening?.match_percentage >= 60);

  const handleProceed = () => {
    if (step === 'screening') {
      setStep('cover');
      return;
    }
    onProceed(coverLetter);
  };

  const handleCancel = () => {
    setStep('screening');
    setCoverLetter('');
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-dark-800 border border-dark-600 rounded-2xl shadow-card animate-slide-up overflow-hidden">
        <div className="p-6 border-b border-dark-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gold-500/15 rounded-xl flex items-center justify-center">
              {step === 'cover' ? <FileText size={20} className="text-gold-400" /> : <Sparkles size={20} className="text-gold-400" />}
            </div>
            <div>
              <h2 className="font-display font-semibold text-dark-50 text-lg">
                {step === 'cover' ? 'Cover Letter' : 'AI Screening'}
              </h2>
              <p className="text-dark-400 text-xs">
                {step === 'cover' ? 'Optional — personalize your application' : 'Analyzing your profile vs. job requirements'}
              </p>
            </div>
          </div>
          <button onClick={handleCancel} className="text-dark-400 hover:text-dark-100 p-1.5 rounded-lg hover:bg-dark-700">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center py-10 gap-4">
              <Spinner size={40} />
              <div className="text-center">
                <p className="text-dark-200 font-medium">Analyzing your application...</p>
                <p className="text-dark-400 text-sm mt-1">Comparing skills against job requirements</p>
              </div>
            </div>
          ) : step === 'cover' ? (
            <div className="space-y-4">
              <p className="text-sm text-dark-300">
                Applying to <span className="text-gold-400 font-medium">{job?.title}</span> at {job?.company}
              </p>
              <textarea
                value={coverLetter}
                onChange={e => setCoverLetter(e.target.value)}
                rows={8}
                className="input-field resize-none"
                placeholder="Write a short cover letter explaining why you're a great fit for this role... (optional)"
                maxLength={5000}
              />
              <p className="text-xs text-dark-500 text-right">{coverLetter.length}/5000</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className={`rounded-xl p-5 flex items-center gap-5 ${
                qualifies
                  ? 'bg-emerald-500/10 border border-emerald-500/20'
                  : 'bg-red-500/10 border border-red-500/20'
              }`}>
                <MatchRing percentage={screening.match_percentage} size={72} />
                <div className="flex-1">
                  {qualifies ? (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle size={18} className="text-emerald-400" />
                        <span className="font-semibold text-emerald-300">You Qualify!</span>
                      </div>
                      <p className="text-sm text-dark-300">{screening.summary}</p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle size={18} className="text-amber-400" />
                        <span className="font-semibold text-amber-300">Partial Match</span>
                      </div>
                      <p className="text-sm text-dark-300">{screening.summary}</p>
                    </>
                  )}
                </div>
              </div>

              {screening.matching_skills?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-dark-200 mb-2 flex items-center gap-1.5">
                    <CheckCircle size={14} className="text-emerald-400" />
                    Matching Skills ({screening.matching_skills.length})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {screening.matching_skills.map(skill => (
                      <span key={skill} className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs px-2.5 py-1 rounded-full">
                        ✓ {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {screening.missing_skills?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-dark-200 mb-2 flex items-center gap-1.5">
                    <XCircle size={14} className="text-red-400" />
                    Missing Skills ({screening.missing_skills.length})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {screening.missing_skills.map(skill => (
                      <span key={skill} className="inline-flex items-center gap-1 bg-red-500/10 border border-red-500/20 text-red-300 text-xs px-2.5 py-1 rounded-full">
                        ✗ {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {screening.related_skills?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-dark-200 mb-2 flex items-center gap-1.5">
                    <Star size={14} className="text-gold-400" />
                    Related Skills ({screening.related_skills.length})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {screening.related_skills.map(skill => (
                      <span key={skill} className="inline-flex items-center gap-1 bg-gold-500/10 border border-gold-500/20 text-gold-300 text-xs px-2.5 py-1 rounded-full">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {screening.score_breakdown && (
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(screening.score_breakdown).map(([label, value]) => (
                    <div key={label} className="bg-dark-700/50 rounded-lg p-3">
                      <p className="text-xs text-dark-400 capitalize">{label}</p>
                      <p className="text-sm text-dark-100 font-semibold">{value}%</p>
                    </div>
                  ))}
                </div>
              )}

              {screening.experience_feedback && (
                <div className="bg-dark-700/50 rounded-lg p-3 flex gap-2.5">
                  <TrendingUp size={15} className="text-gold-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-dark-300">Experience</p>
                    <p className="text-sm text-dark-200">{screening.experience_feedback}</p>
                  </div>
                </div>
              )}

              {screening.recommendation && (
                <div className="bg-gold-500/5 border border-gold-500/15 rounded-lg p-3 flex gap-2.5">
                  <Star size={15} className="text-gold-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gold-400">AI Recommendation</p>
                    <p className="text-sm text-dark-200">{screening.recommendation}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {!loading && (
          <div className="p-6 pt-0 flex gap-3">
            <button onClick={handleCancel} className="btn-secondary flex-1 justify-center" disabled={submitting}>
              Cancel
            </button>
            {step === 'screening' ? (
              <button onClick={handleProceed} className="btn-primary flex-1 justify-center">
                Continue
              </button>
            ) : (
              <button onClick={handleProceed} disabled={submitting} className="btn-primary flex-1 justify-center">
                {submitting ? <Spinner size={16} /> : 'Submit Application'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
