import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: join(__dirname, '../.env') });

function loadAppSettings() {
  try {
    return JSON.parse(readFileSync(join(__dirname, '../appsettings.json'), 'utf8'));
  } catch {
    return {};
  }
}

const appsettings = loadAppSettings();

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value || value.startsWith('your_')) {
    console.error(`\n❌ Missing or placeholder value for ${name} in backend/.env`);
    console.error(`   See README.md for setup instructions.\n`);
    process.exit(1);
  }
  return value;
}

const supabaseKey =
  process.env.SUPABASE_SERVICE_KEY?.trim() ||
  process.env.SUPABASE_SECRET_KEY?.trim();

if (!supabaseKey || supabaseKey.startsWith('your_')) {
  console.error('\n❌ Missing Supabase secret key in backend/.env');
  console.error('   Set SUPABASE_SERVICE_KEY to your secret key (sb_secret_...) or');
  console.error('   legacy service_role JWT from Supabase → Settings → API.\n');
  process.exit(1);
}

export const env = {
  SUPABASE_URL: requireEnv('SUPABASE_URL'),
  SUPABASE_SERVICE_KEY: supabaseKey,
  GROQ_API_KEY: requireEnv('GROQ_API_KEY'),
  PORT: process.env.PORT || '5000',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  SENTRY_DSN_BACKEND: process.env.SENTRY_DSN_BACKEND || '',
  ADZUNA_APP_ID: appsettings.Adzuna?.AppId?.trim() || process.env.ADZUNA_APP_ID?.trim() || '',
  ADZUNA_APP_KEY: appsettings.Adzuna?.AppKey?.trim() || process.env.ADZUNA_APP_KEY?.trim() || '',
  LINKEDIN_PROFILE_API_KEY:
    process.env.LINKEDIN_PROFILE_API_KEY?.trim() ||
    process.env.PROXYCURL_API_KEY?.trim() ||
    '',
};

if (!env.SUPABASE_URL.match(/^https?:\/\//i)) {
  console.error('\n❌ SUPABASE_URL must be a valid HTTP/HTTPS URL (e.g. https://xxxx.supabase.co)\n');
  process.exit(1);
}

if (env.SUPABASE_SERVICE_KEY.startsWith('sb_publishable_')) {
  console.error('\n❌ SUPABASE_SERVICE_KEY is a publishable key (client-side only).');
  console.error('   Database writes will fail due to Row Level Security.');
  console.error('   In Supabase → Settings → API, copy the Secret key (sb_secret_...)');
  console.error('   or legacy service_role key into SUPABASE_SERVICE_KEY.\n');
  process.exit(1);
}
