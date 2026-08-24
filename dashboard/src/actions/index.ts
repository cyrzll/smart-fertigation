import { defineAction } from 'astro:actions';

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || process.env.API_URL || 'http://localhost:3001';

async function forwardRequest(path: string, options: RequestInit = {}) {
  const url = `${INTERNAL_API_URL}${path.startsWith('/') ? path : `/${path}`}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    return await res.json();
  } catch (err: any) {
    console.error(`[Server Action Error] ${options.method || 'GET'} ${url}:`, err.message);
    return {
      success: false,
      message: `Gagal terhubung ke backend server (${err.message})`,
      error: err.message,
    };
  }
}

export const server = {
  // ===========================================================================
  // AUTH & USER MANAGEMENT SERVER ACTIONS
  // ===========================================================================
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

  getUsers: defineAction({
    handler: async () => {
      return await forwardRequest('/api/auth/users');
    },
  }),

  createUser: defineAction({
    handler: async (data: any) => {
      return await forwardRequest('/api/auth/users', {
        method: 'POST',
        body: JSON.stringify(data),
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

  deleteUser: defineAction({
    handler: async ({ userId }: { userId: string | number }) => {
      return await forwardRequest(`/api/auth/users/${userId}`, {
        method: 'DELETE',
      });
    },
  }),

  // ===========================================================================
  // DASHBOARD DATA SERVER ACTION
  // ===========================================================================
  getDashboard: defineAction({
    handler: async () => {
      return await forwardRequest('/api/dashboard');
    },
  }),

  // ===========================================================================
  // DEVICE MANAGEMENT SERVER ACTIONS
  // ===========================================================================
  getDevices: defineAction({
    handler: async ({ userId }: { userId: string | number }) => {
      return await forwardRequest(`/api/auth/users/${userId}/devices`);
    },
  }),

  requestVerifyDevice: defineAction({
    handler: async ({ userId, data }: { userId: string | number; data: any }) => {
      return await forwardRequest(`/api/auth/users/${userId}/devices/request-verify`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  }),

  confirmVerifyDevice: defineAction({
    handler: async ({ userId, data }: { userId: string | number; data: any }) => {
      return await forwardRequest(`/api/auth/users/${userId}/devices/confirm-verify`, {
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

  controlDeviceLed: defineAction({
    handler: async ({ userId, deviceId, data }: { userId: string | number; deviceId: string | number; data: any }) => {
      return await forwardRequest(`/api/auth/users/${userId}/devices/${deviceId}/led-control`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  }),

  // ===========================================================================
  // USER WHATSAPP NUMBER SERVER ACTIONS
  // ===========================================================================
  getWaNumbers: defineAction({
    handler: async ({ userId }: { userId: string | number }) => {
      return await forwardRequest(`/api/auth/users/${userId}/wa-numbers`);
    },
  }),

  addWaNumber: defineAction({
    handler: async ({ userId, data }: { userId: string | number; data: any }) => {
      return await forwardRequest(`/api/auth/users/${userId}/wa-numbers`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  }),

  verifyWaNumber: defineAction({
    handler: async ({ userId, numId, data }: { userId: string | number; numId: string | number; data: any }) => {
      return await forwardRequest(`/api/auth/users/${userId}/wa-numbers/${numId}/verify`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  }),

  deleteWaNumber: defineAction({
    handler: async ({ userId, numId }: { userId: string | number; numId: string | number }) => {
      return await forwardRequest(`/api/auth/users/${userId}/wa-numbers/${numId}`, {
        method: 'DELETE',
      });
    },
  }),

  // ===========================================================================
  // FERTIGATION SCHEDULES SERVER ACTIONS
  // ===========================================================================
  getSchedules: defineAction({
    handler: async ({ profileId }: { profileId?: number } = {}) => {
      const qs = profileId ? `?profile_id=${profileId}` : '';
      return await forwardRequest(`/api/schedules${qs}`);
    },
  }),

  addSchedule: defineAction({
    handler: async (data: any) => {
      return await forwardRequest('/api/schedules', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  }),

  updateSchedule: defineAction({
    handler: async ({ id, data }: { id: string | number; data: any }) => {
      return await forwardRequest(`/api/schedules/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
  }),

  toggleSchedule: defineAction({
    handler: async ({ id }: { id: string | number }) => {
      return await forwardRequest(`/api/schedules/${id}/toggle`, {
        method: 'PATCH',
      });
    },
  }),

  deleteSchedule: defineAction({
    handler: async ({ id }: { id: string | number }) => {
      return await forwardRequest(`/api/schedules/${id}`, {
        method: 'DELETE',
      });
    },
  }),

  // ===========================================================================
  // VALVES MANAGEMENT SERVER ACTIONS
  // ===========================================================================
  getValves: defineAction({
    handler: async () => {
      return await forwardRequest('/api/valves');
    },
  }),

  addValve: defineAction({
    handler: async (data: any) => {
      return await forwardRequest('/api/valves', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  }),

  updateValve: defineAction({
    handler: async ({ id, data }: { id: string | number; data: any }) => {
      return await forwardRequest(`/api/valves/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
  }),

  toggleValve: defineAction({
    handler: async ({ id }: { id: string | number }) => {
      return await forwardRequest(`/api/valves/${id}/toggle`, {
        method: 'PATCH',
      });
    },
  }),

  deleteValve: defineAction({
    handler: async ({ id }: { id: string | number }) => {
      return await forwardRequest(`/api/valves/${id}`, {
        method: 'DELETE',
      });
    },
  }),

  // ===========================================================================
  // FERTIGATION PROFILES SERVER ACTIONS
  // ===========================================================================
  getProfiles: defineAction({
    handler: async () => {
      return await forwardRequest('/api/profiles');
    },
  }),

  addProfile: defineAction({
    handler: async (data: any) => {
      return await forwardRequest('/api/profiles', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  }),

  updateProfileItem: defineAction({
    handler: async ({ id, data }: { id: string | number; data: any }) => {
      return await forwardRequest(`/api/profiles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
  }),

  deleteProfileItem: defineAction({
    handler: async ({ id }: { id: string | number }) => {
      return await forwardRequest(`/api/profiles/${id}`, {
        method: 'DELETE',
      });
    },
  }),

  // ===========================================================================
  // GROWTH PHASES SERVER ACTIONS
  // ===========================================================================
  getGrowthPhases: defineAction({
    handler: async () => {
      return await forwardRequest('/api/growth-phases');
    },
  }),

  addGrowthPhase: defineAction({
    handler: async (data: any) => {
      return await forwardRequest('/api/growth-phases', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  }),

  updateGrowthPhase: defineAction({
    handler: async ({ id, data }: { id: string | number; data: any }) => {
      return await forwardRequest(`/api/growth-phases/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
  }),

  deleteGrowthPhase: defineAction({
    handler: async ({ id }: { id: string | number }) => {
      return await forwardRequest(`/api/growth-phases/${id}`, {
        method: 'DELETE',
      });
    },
  }),

  // ===========================================================================
  // PLANTINGS SERVER ACTIONS
  // ===========================================================================
  getPlantings: defineAction({
    handler: async () => {
      return await forwardRequest('/api/plantings');
    },
  }),

  addPlanting: defineAction({
    handler: async (data: any) => {
      return await forwardRequest('/api/plantings', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  }),

  updatePlanting: defineAction({
    handler: async ({ id, data }: { id: string | number; data: any }) => {
      return await forwardRequest(`/api/plantings/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
  }),

  deletePlanting: defineAction({
    handler: async ({ id }: { id: string | number }) => {
      return await forwardRequest(`/api/plantings/${id}`, {
        method: 'DELETE',
      });
    },
  }),

  // ===========================================================================
  // WHATSAPP BOT SERVER ACTIONS
  // ===========================================================================
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

  // ===========================================================================
  // DEMO SIMULATOR SERVER ACTIONS
  // ===========================================================================
  getDemo: defineAction({
    handler: async () => {
      return await forwardRequest('/api/demo');
    },
  }),

  triggerDemoAlert: defineAction({
    handler: async (data: any) => {
      return await forwardRequest('/api/demo/alert', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  }),

  triggerDemoValve: defineAction({
    handler: async (data: any) => {
      return await forwardRequest('/api/demo/valve', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  }),

  triggerDemoSchedule: defineAction({
    handler: async (data: any) => {
      return await forwardRequest('/api/demo/schedule', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  }),
};
