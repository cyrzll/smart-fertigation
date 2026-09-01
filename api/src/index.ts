import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import dotenv from 'dotenv';
import { initDb } from './db.js';

import dashboardRouter from './routes/dashboard.js';
import profilesRouter from './routes/profiles.js';
import valvesRouter from './routes/valves.js';
import schedulesRouter from './routes/schedules.js';
import growthPhasesRouter from './routes/growthPhases.js';
import demoRouter from './routes/demo.js';
import espRouter from './routes/esp.js';
import plantingsRouter from './routes/plantings.js';
import authRouter from './routes/auth.js';
import waRouter from './routes/wa.js';
import firmwareRouter from './routes/firmware.js';
import { initWaBot, closeWaBot } from './services/waBot.js';
import { initWebSocketServer } from './services/wsServer.js';

dotenv.config();

const app = new Hono();

// Enable CORS for frontend dashboard
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Initialize DB tables
initDb();

// Initialize WhatsApp Bot Service
initWaBot();

// Fast & graceful process exit handling for SIGINT (Ctrl+C) and SIGTERM
const handleExit = async (signal: string) => {
  console.log(`Received ${signal}, shutting down API server...`);
  
  // Set a hard timeout fallback (800ms) so Ctrl+C never hangs if Puppeteer delays shutdown
  const forceTimer = setTimeout(() => {
    process.exit(0);
  }, 800);
  if (forceTimer.unref) forceTimer.unref();

  try {
    await closeWaBot();
  } catch (_) {}
  
  process.exit(0);
};

process.on('SIGINT', () => handleExit('SIGINT'));
process.on('SIGTERM', () => handleExit('SIGTERM'));

// Mount Routes
app.route('/api/auth', authRouter);
app.route('/api/dashboard', dashboardRouter);
app.route('/api/profiles', profilesRouter);
app.route('/api/valves', valvesRouter);
app.route('/api/schedules', schedulesRouter);
app.route('/api/growth-phases', growthPhasesRouter);
app.route('/api/demo', demoRouter);
app.route('/api/plantings', plantingsRouter);
app.route('/api/wa', waRouter);
app.route('/api/firmware', firmwareRouter);
app.route('/api', espRouter);

app.get('/', (c) => {
  return c.text('Smart Fertigation API Hono Backend Running!');
});

const port = parseInt(process.env.PORT || '3000', 10);
console.log(`Server is running on port ${port}`);

const server = serve({
  fetch: app.fetch,
  port,
});

initWebSocketServer(server as any);
