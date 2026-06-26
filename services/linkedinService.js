import axios from 'axios';
import { env } from '../lib/env.js';
import { extractSkillsFromCV } from './groqService.js';

function normalizeLinkedInUrl(input) {
  const withProtocol = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  const parsed = new URL(withProtocol);

  if (!/(^|\.)linkedin\.com$/i.test(parsed.hostname)) {
    throw new Error('Please enter a linkedin.com profile URL');
  }

  parsed.protocol = 'https:';
  parsed.hash = '';
  parsed.search = '';

  return parsed.toString();
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractFromHtml(html) {
  const text = stripHtml(html);
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
  const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i);

  let full_name = '';
  let headline = '';
  let location = '';

  if (ogTitle?.[1]) {
    const parts = ogTitle[1].split('|')[0].split(' - ');
    full_name = parts[0]?.trim() || '';
    headline = parts[1]?.trim() || ogDesc?.[1]?.trim() || '';
  } else if (titleMatch?.[1]) {
    full_name = titleMatch[1].replace(/\s*\|\s*LinkedIn.*$/i, '').trim();
  }

  const locationMatch = text.match(/(?:Location|Lives in|Based in)[:\s]+([A-Za-z0-9\s,.\-]+)/i);
  if (locationMatch) location = locationMatch[1].trim().slice(0, 120);

  const skillPatterns = text.match(/\b(?:JavaScript|TypeScript|Python|React|Node\.js|SQL|AWS|Java|CSS|HTML|Docker|Kubernetes|Agile|Leadership|Management|Marketing|Sales|Design|Figma|Excel|Data Analysis|Machine Learning|AI|Git|REST|API|MongoDB|PostgreSQL|Vue|Angular|Go|Rust|C\+\+|C#|PHP|Ruby|Swift|Kotlin|Flutter|DevOps|CI\/CD|Scrum|Product Management|Communication|Problem Solving)\b/gi);

  const skills = [...new Set((skillPatterns || []).map(s => s.trim()))].slice(0, 20);

  return {
    full_name,
    headline,
    location,
    bio: ogDesc?.[1]?.trim() || '',
    skills,
    raw_text: text.slice(0, 8000),
  };
}

function normalizeSkills(skills) {
  if (!Array.isArray(skills)) return [];

  return [...new Set(skills
    .map(skill => {
      if (typeof skill === 'string') return skill;
      return skill?.name || skill?.skill_name || skill?.title || '';
    })
    .map(skill => skill.trim())
    .filter(Boolean))]
    .slice(0, 20);
}

function mapProxycurlProfile(profile) {
  const location = [
    profile.city,
    profile.state,
    profile.country_full_name || profile.country,
  ].filter(Boolean).join(', ');

  return {
    full_name: profile.full_name || '',
    headline: profile.headline || profile.occupation || '',
    location: location.slice(0, 120),
    bio: (profile.summary || profile.description || '').slice(0, 2000),
    skills: normalizeSkills(profile.skills),
    experience_years: 0,
    source: 'proxycurl',
  };
}

async function fetchWithProfileApi(url) {
  if (!env.LINKEDIN_PROFILE_API_KEY) return null;

  const normalizedUrl = normalizeLinkedInUrl(url);
  const response = await axios.get('https://nubela.co/proxycurl/api/v2/linkedin', {
    params: {
      url: normalizedUrl,
      skills: 'include',
      use_cache: 'if-present',
    },
    headers: {
      Authorization: `Bearer ${env.LINKEDIN_PROFILE_API_KEY}`,
    },
    timeout: 20000,
    validateStatus: status => status < 500,
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error('LinkedIn profile API key was rejected. Check PROXYCURL_API_KEY or LINKEDIN_PROFILE_API_KEY in backend/.env.');
  }

  if (response.status === 404) {
    throw new Error('The LinkedIn profile API could not find that public profile.');
  }

  if (response.status >= 400) {
    throw new Error(response.data?.description || response.data?.message || 'LinkedIn profile API request failed.');
  }

  return mapProxycurlProfile(response.data || {});
}

async function fetchLinkedInHtml(url) {
  const normalizedUrl = normalizeLinkedInUrl(url);

  const response = await axios.get(normalizedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      Referer: 'https://www.google.com/',
    },
    timeout: 15000,
    maxRedirects: 5,
    validateStatus: status => status < 500,
  });

  return {
    status: response.status,
    finalUrl: response.request?.res?.responseUrl || normalizedUrl,
    html: typeof response.data === 'string' ? response.data : '',
  };
}

function isLinkedInBlocked({ status, finalUrl, html }) {
  const lowerHtml = html.toLowerCase();
  const lowerUrl = finalUrl.toLowerCase();

  return (
    status === 401 ||
    status === 403 ||
    status === 429 ||
    status === 999 ||
    lowerUrl.includes('/authwall') ||
    lowerUrl.includes('/login') ||
    lowerHtml.includes('authwall') ||
    lowerHtml.includes('join linkedin') ||
    lowerHtml.includes('sign in to view') ||
    lowerHtml.includes('login to linkedin') ||
    html.length < 500
  );
}

export async function importLinkedInProfile({ url, profile_text }) {
  if (profile_text) {
    const aiResult = await extractSkillsFromCV(profile_text);
    const lines = profile_text.split('\n').map(l => l.trim()).filter(Boolean);
    return {
      full_name: lines[0]?.slice(0, 120) || '',
      headline: lines[1]?.slice(0, 200) || '',
      location: '',
      bio: profile_text.slice(0, 2000),
      skills: aiResult.skills || [],
      experience_years: aiResult.experience_years || 0,
      source: 'text_paste',
    };
  }

  try {
    const apiProfile = await fetchWithProfileApi(url);
    if (apiProfile) return apiProfile;

    const fetched = await fetchLinkedInHtml(url);

    if (isLinkedInBlocked(fetched)) {
      return {
        needs_fallback: true,
        reason: 'linkedin_blocked',
        message: 'LinkedIn URL import needs a profile API key. Add PROXYCURL_API_KEY to backend/.env, then restart the backend.',
      };
    }

    const { html } = fetched;
    const extracted = extractFromHtml(html);

    if (!extracted.full_name && extracted.skills.length === 0) {
      const aiResult = await extractSkillsFromCV(extracted.raw_text);
      return {
        full_name: extracted.full_name,
        headline: extracted.headline,
        location: extracted.location,
        bio: extracted.bio,
        skills: aiResult.skills || extracted.skills,
        experience_years: aiResult.experience_years || 0,
        source: 'scrape_partial',
      };
    }

    return {
      ...extracted,
      experience_years: 0,
      source: 'scrape',
    };
  } catch (err) {
    return {
      needs_fallback: true,
      reason: 'fetch_failed',
      message: err.message || 'Could not fetch LinkedIn profile. Please paste your profile text instead.',
    };
  }
}
