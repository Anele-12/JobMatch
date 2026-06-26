function stripHtml(value) {
  return String(value || '').replace(/<[^>]*>/g, '').trim();
}

function toNumberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toIsoOrNull(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function createCompany(company = {}) {
  return {
    display_name: company.display_name || 'Unknown Company',
  };
}

export function createLocation(location = {}) {
  return {
    display_name: location.display_name || 'South Africa',
  };
}

export function createJobResult(job = {}) {
  if (!job.id || !job.title) return null;

  return {
    id: String(job.id),
    title: stripHtml(job.title),
    description: stripHtml(job.description) || 'No description available.',
    redirect_url: job.redirect_url || '',
    company: createCompany(job.company),
    location: createLocation(job.location),
    salary_min: toNumberOrNull(job.salary_min),
    salary_max: toNumberOrNull(job.salary_max),
    created: toIsoOrNull(job.created),
  };
}

export function createAdzunaResponse(data = {}) {
  const results = Array.isArray(data.results)
    ? data.results.map(createJobResult).filter(Boolean)
    : [];

  return {
    count: Number.isFinite(Number(data.count)) ? Number(data.count) : results.length,
    mean: Number.isFinite(Number(data.mean)) ? Number(data.mean) : null,
    results,
  };
}
