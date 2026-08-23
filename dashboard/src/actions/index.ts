import { defineAction } from 'astro:actions';

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || process.env.API_URL || 'http://localhost:3001';

async function forwardRequest(path: string, options: RequestInit = {}) {
  const url = `${INTERNAL_API_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  return await res.json();
}

export const server = {
  // Auth Actions
  login: defineAction({
    handler: async (input: { identifier?: string; email?: string; username?: string; password?: string }) => {
      return await forwardRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
  }),

  register: defineAction({
    handler: async (input: { name: string; username?: string; email: string; phone?: string; password?: string }) => {
      return await forwardRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
  }),

  updateProfile: defineAction({
    handler: async ({ userId, data }: { userId: string | number; data: any }) => {
      return await forwardRequest(`/api/auth/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
  }),

  // Dashboard & IoT Actions
  getDashboard: defineAction({
    handler: async () => {
      return await forwardRequest('/api/dashboard');
    },
  }),

  // Device Management Actions
  getDevices: defineAction({
    handler: async ({ userId }: { userId: string | number }) => {
      return await forwardRequest(`/api/auth/users/${userId}/devices`);
    },
  }),

  addDevice: defineAction({
    handler: async ({ userId, data }: { userId: string | number; data: any }) => {
      return await forwardRequest(`/api/auth/users/${userId}/devices`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  }),

  updateDevice: defineAction({
    handler: async ({ userId, deviceId, data }: { userId: string | number; deviceId: string | number; data: any }) => {
      return await forwardRequest(`/api/auth/users/${userId}/devices/${deviceId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
  }),

  deleteDevice: defineAction({
    handler: async ({ userId, deviceId }: { userId: string | number; deviceId: string | number }) => {
      return await forwardRequest(`/api/auth/users/${userId}/devices/${deviceId}`, {
        method: 'DELETE',
      });
    },
  }),

  // WhatsApp Bot Actions
  getWaStatus: defineAction({
    handler: async () => {
      return await forwardRequest('/api/wa/status');
    },
  }),

  sendWaMessage: defineAction({
    handler: async (input: { phone: string; message: string }) => {
      return await forwardRequest('/api/wa/send', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
  }),

  restartWaBot: defineAction({
    handler: async () => {
      return await forwardRequest('/api/wa/restart', {
        method: 'POST',
      });
    },
  }),
};
