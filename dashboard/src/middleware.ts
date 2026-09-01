import { defineMiddleware } from 'astro:middleware';

const configuredOrigin = process.env.DASHBOARD_ORIGIN ? new URL(process.env.DASHBOARD_ORIGIN).origin : 'https://dash.tirtaruna.site';
const protectedMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const allowedOrigins = new Set([
  configuredOrigin,
  'https://dash.tirtaruna.site',
  'https://api.tirtaruna.site',
  'https://tirtaruna.site',
]);

export const onRequest = defineMiddleware(async ({ request }, next) => {
  if (!protectedMethods.has(request.method.toUpperCase())) return next();

  const origin = request.headers.get('origin');
  if (!origin) return next();

  try {
    const requestOrigin = new URL(request.url).origin;
    const originUrl = new URL(origin);

    // 1. Selalu izinkan same-origin requests (misal http://localhost:4321 -> http://localhost:4321)
    if (origin === requestOrigin) {
      return next();
    }

    // 2. Izinkan domain publik / produksi yang telah dikonfigurasi
    if (allowedOrigins.has(origin)) {
      return next();
    }

    // 3. Izinkan local development & IP jaringan lokal (localhost, 127.0.0.1, 192.168.x.x, dll)
    const hostname = originUrl.hostname;
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.') ||
      hostname.endsWith('.local')
    ) {
      return next();
    }
  } catch (_) {}

  return new Response(
    JSON.stringify({ success: false, message: 'Origin request tidak diizinkan.' }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    },
  );
});

