import Groq from 'groq-sdk';
import { env } from '../lib/env.js';

const GROQ_MODEL = 'llama-3.1-8b-instant';
const groq = new Groq({ apiKey: env.GROQ_API_KEY });

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

function uniqueStrings(values) {
  return [...new Set((values || [])
    .map(value => String(value || '').trim())
    .filter(Boolean))];
}

function tokenize(text) {
  return uniqueStrings(String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2)
    .map(normalizeSkill));
}

function hasRelatedTerm(candidateTokens, skill) {
  const normalizedSkill = normalizeSkill(skill);
  if (!normalizedSkill) return false;
  return candidateTokens.some(token =>
    token &&
    normalizedSkill !== token &&
    (normalizedSkill.includes(token) || token.includes(normalizedSkill))
  );
}

function calculateEducationScore(candidateEducation = [], jobEducationRequired = []) {
  const cleanJobEducation = uniqueStrings(jobEducationRequired);
  if (cleanJobEducation.length === 0) {
    return { education_score: 100, matching_education: [], missing_education: [] };
  }

  const candidateText = uniqueStrings(candidateEducation).join(' ').toLowerCase();
  const matching_education = [];
  const missing_education = [];

  for (const requirement of cleanJobEducation) {
    const requirementTokens = tokenize(requirement);
    const matched = requirementTokens.length > 0 && requirementTokens.some(token => candidateText.includes(token));
    if (matched) matching_education.push(requirement);
    else missing_education.push(requirement);
  }

  return {
    education_score: Math.round((matching_education.length / cleanJobEducation.length) * 100),
    matching_education,
    missing_education,
  };
}

export function calculateScreeningScore({
  candidateSkills,
  candidateExperience = 0,
  candidateHeadline = '',
  candidateBio = '',
  candidateEducation = [],
  jobSkills,
  jobExperienceRequired = 0,
  jobTitle = '',
  jobDescription = '',
  jobEducationRequired = [],
}) {
  const cleanCandidateSkills = uniqueStrings(candidateSkills);
  const cleanJobSkills = uniqueStrings(jobSkills);
  const candidateMap = new Map(cleanCandidateSkills.map(skill => [normalizeSkill(skill), skill]));
  const candidateTokens = tokenize([
    ...cleanCandidateSkills,
    candidateHeadline,
    candidateBio,
  ].join(' '));
  const requiredExperience = Number(jobExperienceRequired) || 0;
  const experienceYears = Number(candidateExperience) || 0;

  const matching_skills = [];
  const related_skills = [];
  const missing_skills = [];

  for (const jobSkill of cleanJobSkills) {
    const normalizedJobSkill = normalizeSkill(jobSkill);
    if (normalizedJobSkill && candidateMap.has(normalizedJobSkill)) {
      matching_skills.push(jobSkill);
    } else if (hasRelatedTerm(candidateTokens, jobSkill)) {
      related_skills.push(jobSkill);
    } else {
      missing_skills.push(jobSkill);
    }
  }

  const skillScore = cleanJobSkills.length > 0
    ? Math.round(((matching_skills.length + (related_skills.length * 0.5)) / cleanJobSkills.length) * 100)
    : 0;

  const experienceScore = requiredExperience > 0
    ? Math.min(100, Math.round((experienceYears / requiredExperience) * 100))
    : 100;

  const { education_score, matching_education, missing_education } = calculateEducationScore(
    candidateEducation,
    jobEducationRequired
  );

  const jobTokens = tokenize(`${jobTitle} ${jobDescription}`);
  const relevanceMatches = candidateTokens.filter(token => jobTokens.includes(token));
  const relevanceScore = jobTokens.length > 0
    ? Math.min(100, Math.round((relevanceMatches.length / Math.min(jobTokens.length, 12)) * 100))
    : 0;

  const hasJobRequirements = cleanJobSkills.length > 0 || requiredExperience > 0 || jobEducationRequired.length > 0;
  const weights = hasJobRequirements
    ? { skills: 0.65, experience: 0.2, education: 0.1, relevance: 0.05 }
    : { skills: 0, experience: 0, education: 0, relevance: 1 };

  const match_percentage = Math.round(
    (skillScore * weights.skills) +
    (experienceScore * weights.experience) +
    (education_score * weights.education) +
    (relevanceScore * weights.relevance)
  );

  const qualifies = match_percentage >= 65 && (cleanJobSkills.length === 0 || missing_skills.length <= cleanJobSkills.length / 2);

  return {
    qualifies,
    match_percentage: Math.max(0, Math.min(100, match_percentage)),
    matching_skills,
    related_skills,
    missing_skills,
    matching_education,
    missing_education,
    score_breakdown: {
      skills: skillScore,
      experience: experienceScore,
      education: education_score,
      relevance: relevanceScore,
    },
    experience_feedback: requiredExperience > 0
      ? `You have ${experienceYears} year${experienceYears === 1 ? '' : 's'} of experience; this role asks for ${requiredExperience}+ year${requiredExperience === 1 ? '' : 's'}.`
      : `You have ${experienceYears} year${experienceYears === 1 ? '' : 's'} of experience; this role has no minimum experience listed.`,
  };
}

/**
 * Extract skills from CV text using Groq AI
 */
export async function extractSkillsFromCV(cvText) {
  const prompt = `Analyze this CV and extract all technical and professional skills. Return ONLY a JSON object, no markdown, no explanation.

CV TEXT:
${cvText.substring(0, 8000)}

Return exactly this JSON structure:
{
  "skills": ["skill1", "skill2", "skill3"],
  "experience_years": 0,
  "job_titles": ["title1"],
  "education": ["degree1"]
}

Rules:
- skills: array of specific skills (programming languages, tools, frameworks, soft skills, certifications)
- experience_years: estimated total years of work experience (integer)
- job_titles: previous job titles
- education: degrees/certifications found`;

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: GROQ_MODEL,
    temperature: 0.1,
    max_tokens: 1000,
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  
  try {
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return { skills: [], experience_years: 0, job_titles: [], education: [] };
  }
}

/**
 * AI-powered application screening: compare candidate vs job requirements
 */
export async function screenApplication({
  candidateSkills,
  candidateExperience,
  candidateHeadline,
  candidateBio,
  candidateEducation,
  jobSkills,
  jobTitle,
  jobDescription,
  jobExperienceRequired,
  jobEducationRequired,
}) {
  const score = calculateScreeningScore({
    candidateSkills,
    candidateExperience,
    candidateHeadline,
    candidateBio,
    candidateEducation,
    jobSkills,
    jobTitle,
    jobDescription,
    jobExperienceRequired,
    jobEducationRequired,
  });

  const prompt = `You are an expert HR recruiter. Write concise feedback for a candidate based on this fixed screening result. Do not change the score, matching skills, missing skills, or qualification result.

JOB TITLE: ${jobTitle}
JOB REQUIRED SKILLS: ${jobSkills.join(', ')}
JOB EXPERIENCE REQUIRED: ${jobExperienceRequired || 'Not specified'} years
JOB DESCRIPTION: ${(jobDescription || '').substring(0, 500)}

CANDIDATE SKILLS: ${candidateSkills.join(', ')}
CANDIDATE EXPERIENCE: ${candidateExperience || 0} years
FIXED MATCH PERCENTAGE: ${score.match_percentage}
FIXED QUALIFIES: ${score.qualifies}
FIXED MATCHING SKILLS: ${score.matching_skills.join(', ') || 'None'}
FIXED RELATED SKILLS: ${score.related_skills.join(', ') || 'None'}
FIXED MISSING SKILLS: ${score.missing_skills.join(', ') || 'None'}
FIXED SCORE BREAKDOWN: skills ${score.score_breakdown.skills}, experience ${score.score_breakdown.experience}, education ${score.score_breakdown.education}, relevance ${score.score_breakdown.relevance}

Return ONLY a JSON object with this exact structure, no markdown:
{
  "experience_feedback": "You have 3 years of experience which meets the 2+ years requirement.",
  "recommendation": "You're a strong match! Consider highlighting your React projects.",
  "summary": "Your profile matches 75% of the requirements for this ${jobTitle} role."
}

Rules:
- Be specific and encouraging in feedback
- If the fixed qualification result is false, do not say the candidate qualifies
- If the fixed match percentage is 0, do not call it a strong or qualifying match`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: GROQ_MODEL,
      temperature: 0.2,
      max_tokens: 500,
    });

    const raw = completion.choices[0]?.message?.content || '{}';
  
    const clean = raw.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);
    return {
      qualifies: score.qualifies,
      match_percentage: score.match_percentage,
      matching_skills: score.matching_skills,
      related_skills: score.related_skills,
      missing_skills: score.missing_skills,
      matching_education: score.matching_education,
      missing_education: score.missing_education,
      score_breakdown: score.score_breakdown,
      missing_certifications: result.missing_certifications ?? [],
      experience_feedback: result.experience_feedback || score.experience_feedback,
      recommendation: result.recommendation ?? '',
      summary: result.summary || `Your profile matches ${score.match_percentage}% of the requirements for this ${jobTitle} role.`,
    };
  } catch {
    return {
      qualifies: score.qualifies,
      match_percentage: score.match_percentage,
      matching_skills: score.matching_skills,
      related_skills: score.related_skills,
      missing_skills: score.missing_skills,
      matching_education: score.matching_education,
      missing_education: score.missing_education,
      score_breakdown: score.score_breakdown,
      missing_certifications: [],
      experience_feedback: score.experience_feedback,
      recommendation: score.qualifies
        ? 'Highlight your matching skills in your application.'
        : 'Focus your cover letter on transferable experience and consider strengthening the missing skills.',
      summary: `Your profile matches ${score.match_percentage}% of the requirements for this ${jobTitle} role.`,
    };
  }
}

export async function generateAssistantReply({ role, message, context = {}, history = [] }) {
  const audience = role === 'employer'
    ? 'an employer using JobMatch AI to manage jobs, compare applicants, plan interviews, and write candidate messages'
    : 'a candidate using JobMatch AI to find roles, improve applications, understand match scores, and prepare for interviews';

  const contextLines = [
    context.name ? `Name: ${context.name}` : '',
    context.company_name ? `Company: ${context.company_name}` : '',
    context.headline ? `Headline: ${context.headline}` : '',
    context.skills?.length ? `Skills: ${context.skills.join(', ')}` : '',
    context.current_page ? `Current page: ${context.current_page}` : '',
  ].filter(Boolean).join('\n');

  const messages = [
    {
      role: 'system',
      content: `You are the JobMatch AI assistant for ${audience}. Be concise, practical, and warm. Format replies for a small chat window: use short paragraphs, at most 4 bullets or numbered steps, and include blank lines between sections. Do not use markdown tables. Do not invent application decisions, private user data, salaries, or legal advice. If asked to write a message, provide a polished draft the user can edit.`,
    },
    ...(contextLines ? [{ role: 'system', content: `Available user context:\n${contextLines}` }] : []),
    ...history.slice(-6).map(item => ({
      role: item.role,
      content: item.content,
    })),
    { role: 'user', content: message },
  ];

  try {
    const completion = await groq.chat.completions.create({
      messages,
      model: GROQ_MODEL,
      temperature: 0.4,
      max_tokens: 650,
    });

    return completion.choices[0]?.message?.content?.trim() || 'I could not generate a reply right now. Try asking again in a moment.';
  } catch (err) {
    console.error('[Groq/chat]', err);
    return role === 'employer'
      ? 'I am having trouble reaching the assistant. In the meantime, review the match score, skills, notes, and next step fields to decide whether to move this applicant forward.'
      : 'I am having trouble reaching the assistant. In the meantime, compare the role requirements with your profile skills and tailor your cover letter to the strongest matches.';
  }
}

export default groq;
