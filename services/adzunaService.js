import axios from 'axios';
import { env } from '../lib/env.js';
import supabase from '../lib/supabase.js';
import { createAdzunaResponse } from '../models/adzunaModels.js';

const ADZUNA_BASE_URL = 'https://api.adzuna.com/v1/api/jobs/za/search';

function parseDate(value) {
  const parsed = new Date(value || Date.now());
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function formatSalary(min, max) {
  const salaryMin = Number(min);
  const salaryMax = Number(max);

  if (Number.isFinite(salaryMin) && Number.isFinite(salaryMax) && (salaryMin > 0 || salaryMax > 0)) {
    return `R${salaryMin.toLocaleString()} - R${salaryMax.toLocaleString()}`;
  }
  if (Number.isFinite(salaryMin) && salaryMin > 0) return `From R${salaryMin.toLocaleString()}`;
  if (Number.isFinite(salaryMax) && salaryMax > 0) return `Up to R${salaryMax.toLocaleString()}`;
  return 'Not specified';
}

function toJobRow(job) {
  return {
    title: job.title,
    company: job.company.display_name,
    description: job.description,
    location: job.location.display_name,
    salary: formatSalary(job.salary_min, job.salary_max),
    skills_required: [],
    source: 'external',
    external_id: `adzuna_${job.id}`,
    is_active: true,
    external_url: job.redirect_url,
    logo_url: null,
    created_at: parseDate(job.created),
  };
}

export class AdzunaService {
  constructor({ appId = env.ADZUNA_APP_ID, appKey = env.ADZUNA_APP_KEY } = {}) {
    this.appId = appId;
    this.appKey = appKey;
  }

  assertConfigured() {
    if (!this.appId || !this.appKey) {
      throw new Error('Adzuna API credentials are not configured');
    }
  }

  async searchJobs({ keyword = '', location = '', page = 1 } = {}) {
    this.assertConfigured();

    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const response = await axios.get(`${ADZUNA_BASE_URL}/${safePage}`, {
      params: {
        app_id: this.appId,
        app_key: this.appKey,
        what: keyword || undefined,
        where: location || undefined,
        results_per_page: 24,
        'content-type': 'application/json',
      },
      timeout: 15000,
    });

    return createAdzunaResponse(response.data);
  }

  async fetchAndCacheJobs({ keyword = '', location = '', page = 1 } = {}) {
    const adzunaResponse = await this.searchJobs({ keyword, location, page });
    const rows = adzunaResponse.results.map(toJobRow);

    if (rows.length === 0) {
      return { jobs: [], total: 0, count: 0 };
    }

    const { error } = await supabase
      .from('jobs')
      .upsert(rows, {
        onConflict: 'external_id',
        ignoreDuplicates: false,
      });

    if (error) throw new Error(error.message);

    const externalIds = rows.map(row => row.external_id);
    const { data: jobs, error: selectError } = await supabase
      .from('jobs')
      .select('*')
      .in('external_id', externalIds)
      .order('created_at', { ascending: false });

    if (selectError) throw new Error(selectError.message);

    await supabase
      .from('external_job_cache')
      .insert({ job_data: { count: rows.length, source: 'adzuna', keyword, location, page } });

    return {
      jobs: jobs || [],
      total: adzunaResponse.count,
      count: rows.length,
    };
  }
}

const adzunaService = new AdzunaService();
export default adzunaService;
