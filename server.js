import * as Sentry from '@sentry/node';
import { env } from './lib/env.js';

if (env.SENTRY_DSN_BACKEND) {
  Sentry.init({
    dsn: env.SENTRY_DSN_BACKEND,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  });
}

import express from 'express';
import cors from 'cors';
import cron from 'node-cron';

import profileRoutes from './routes/profile.js';
import jobRoutes from './routes/jobs.js';
import applicationRoutes from './routes/applications.js';
import cvRoutes from './routes/cv.js';
import savedJobsRoutes from './routes/savedJobs.js';
import chatRoutes from './routes/chat.js';
import { fetchAndCacheExternalJobs } from './services/externalJobsService.js';

const app = express();

const PORT = env.PORT;
const allowedOrigins = new Set([
  env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean));

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked request from ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/profile', profileRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/cv', cvRoutes);
app.use('/api/saved-jobs', savedJobsRoutes);
app.use('/api/chat', chatRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Cron: Refresh external jobs every 6 hours ───────────────────────────────
cron.schedule('0 */6 * * *', async () => {
  console.log('[Cron] Running scheduled external job refresh...');
  const result = await fetchAndCacheExternalJobs();
  console.log('[Cron] Result:', result);
});

// ─── Error Handler ───────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (env.SENTRY_DSN_BACKEND) {
    Sentry.captureException(err);
  }
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// ─── Start Server ────────────────────────────────────────────────────────────
const server = app.listen(PORT, async () => {
  console.log(`\n🚀 JobMatch AI Backend running on port ${PORT}`);
  console.log(`📡 Health: http://localhost:${PORT}/health\n`);

  console.log('[Startup] Fetching external jobs...');
  const result = await fetchAndCacheExternalJobs();
  console.log('[Startup] External jobs result:', result);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nPort ${PORT} is already in use. Stop the existing backend process or set PORT to another value in backend/.env.\n`);
    process.exit(1);
  }

  console.error(err);
  process.exit(1);
});

export default app;
