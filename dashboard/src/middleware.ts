import { defineMiddleware } from 'astro:middleware';

const publicOrigin = new URL(
  process.env.DASHBOARD_ORIGIN || 'https://dash.tirtaruna.site',
).origin;
const protectedMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const onRequest = defineMiddleware(async ({ request }, next) => {
  if (!protectedMethods.has(request.method.toUpperCase())) return next();

  const origin = request.headers.get('origin');

  // Browsers attach Origin to these requests. Requests without an Origin are
  // retained for trusted server-to-server calls and health/deployment tools.
  if (origin && origin !== publicOrigin) {
    return new Response(
      JSON.stringify({ success: false, message: 'Origin request tidak diizinkan.' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  return next();
});
