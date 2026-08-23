import type { APIRoute } from 'astro';

export const prerender = false;

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || process.env.API_URL || 'http://localhost:3001';

export const ALL: APIRoute = async ({ request, params }) => {
  try {
    const url = new URL(request.url);
    const subpath = params.path ? `/${params.path}` : '';
    const targetUrl = `${INTERNAL_API_URL}/api${subpath}${url.search}`;

    const headers = new Headers(request.headers);
    headers.delete('host');

    const method = request.method.toUpperCase();
    const hasBody = method !== 'GET' && method !== 'HEAD';

    let body: any = null;
    if (hasBody) {
      body = await request.arrayBuffer();
    }

    const response = await fetch(targetUrl, {
      method,
      headers,
      body: hasBody ? body : undefined,
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('content-encoding');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (err: any) {
    console.error('Error in Astro server API proxy:', err);
    return new Response(
      JSON.stringify({ success: false, message: 'Gagal terhubung ke API backend server.', error: err.message }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
