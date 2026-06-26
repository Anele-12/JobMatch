import { useState } from 'react';

function normalizeSkill(skill) {
  const normalized = String(skill || '')
    .toLowerCase()
    .replace(/\bnode\.?js\b/g, 'nodejs')
    .replace(/\breact\.?js\b/g, 'react')
    .replace(/\bvue\.?js\b/g, 'vue')
    .replace(/\bpostgresql\b/g, 'postgres')
    .replace(/\bjavascript\b/g, 'js')
    .replace(/\btypescript\b/g, 'ts')
    .replace(/\bc\+\+\b/g, 'cpp')
    .replace(/\bc#\b/g, 'csharp')
    .replace(/[^a-z0-9]+/g, '')
    .trim();

  if (normalized === 'node') return 'nodejs';
  if (normalized === 'postgresql') return 'postgres';
  return normalized;
}

export function buildMatchBreakdown(candidateSkills, job, candidateExperience = 0) {
  const jobSkills = job?.skills_required || [];
  const candidateSet = new Set((candidateSkills || []).map(normalizeSkill));
  const matching = jobSkills.filter(s => candidateSet.has(normalizeSkill(s)));
  const missing = jobSkills.filter(s => !candidateSet.has(normalizeSkill(s)));
  const total = jobSkills.length;
  const skillScore = total && candidateSkills?.length
    ? Math.round((matching.length / total) * 100)
    : 0;

  const required = job?.experience_required || 0;
  const experienceScore = required > 0
    ? Math.min(100, Math.round((candidateExperience / required) * 100))
    : 100;
  const hasSkillRequirements = total > 0;
  const hasRequirements = hasSkillRequirements || required > 0;
  const percentage = hasSkillRequirements && matching.length === 0
    ? 0
    : hasRequirements
      ? Math.round((skillScore * 0.75) + (experienceScore * 0.25))
      : 0;
  const experienceLine = required > 0
    ? `You have ${candidateExperience} yrs; role asks ${required}+ yrs`
    : `You have ${candidateExperience} yrs of experience`;

  let recommendation = 'Add more skills to improve your match.';
  if (hasSkillRequirements && matching.length === 0) recommendation = 'No required skills match yet - add relevant skills before applying.';
  else if (percentage >= 70) recommendation = 'Strong match - highlight your matching skills in your application.';
  else if (percentage >= 40) recommendation = 'Decent overlap - consider upskilling on missing areas.';
  else if (matching.length > 0) recommendation = 'Partial fit - focus on transferable skills in your cover letter.';

  return {
    percentage,
    matchingCount: matching.length,
    totalSkills: total,
    experienceLine,
    recommendation,
    matching,
    missing,
  };
}

export default function MatchTooltip({ children, breakdown }) {
  const [show, setShow] = useState(false);

  if (!breakdown || breakdown.totalSkills === 0) return children;

  return (
    <div
      className="relative flex-shrink-0"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute z-50 right-0 top-full mt-2 w-64 p-3 rounded-xl bg-dark-800 border border-gold-500/25 shadow-card text-left animate-fade-in pointer-events-none">
          <p className="text-xs font-semibold text-gold-400 mb-2">Match Breakdown</p>
          <p className="text-xs text-dark-200 mb-1.5">
            Skills: <span className="text-dark-50 font-medium">{breakdown.matchingCount}/{breakdown.totalSkills}</span> matched
          </p>
          <p className="text-xs text-dark-300 mb-1.5">{breakdown.experienceLine}</p>
          <p className="text-xs text-dark-400 leading-relaxed">{breakdown.recommendation}</p>
        </div>
      )}
    </div>
  );
}
