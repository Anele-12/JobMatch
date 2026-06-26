import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export default supabase;
