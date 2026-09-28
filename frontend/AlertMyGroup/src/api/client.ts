import type { Channel, Ring } from '../types';

const BASE = '/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// FastAPI error bodies look like {"detail": "..."}; unwrap that instead of
// throwing the raw JSON text as the error message.
async function errorMessage(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  if (!text) return res.statusText || `Error ${res.status}`;
  try {
    const data = JSON.parse(text) as { detail?: unknown };
    if (typeof data.detail === 'string') return data.detail;
  } catch {
    // not JSON — fall back to the raw text below
  }
  return text;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  memberId?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (memberId) headers['x-member'] = memberId;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    throw new ApiError(await errorMessage(res), res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  createChannel: (name: string, password: string, displayName: string) =>
    request<{ code: string; memberId: string; name: string }>('/channels', {
      method: 'POST',
      body: JSON.stringify({ name, password, displayName }),
    }),

  joinChannel: (code: string, password: string, displayName: string) =>
    request<{ memberId: string; name: string }>(`/channels/${code}/join`, {
      method: 'POST',
      body: JSON.stringify({ password, displayName }),
    }),

  getChannel: (code: string, memberId: string) =>
    request<Channel>(`/channels/${code}`, {}, memberId),

  sendRing: (code: string, memberId: string, audio?: Blob) =>
    request<Ring>(
      `/channels/${code}/rings`,
      audio
        ? { method: 'POST', headers: { 'Content-Type': audio.type || 'application/octet-stream' }, body: audio }
        : { method: 'POST' },
      memberId,
    ),

  getRing: (ringId: string, memberId: string) =>
    request<Ring>(`/rings/${ringId}`, {}, memberId),

  getRingAudio: async (ringId: string, memberId: string): Promise<Blob> => {
    const res = await fetch(`${BASE}/rings/${ringId}/audio`, {
      headers: { 'x-member': memberId },
    });
    if (!res.ok) {
      throw new ApiError(await errorMessage(res), res.status);
    }
    return res.blob();
  },

  ackRing: (ringId: string, memberId: string) =>
    request<void>(`/rings/${ringId}/ack`, { method: 'POST' }, memberId),

  setMute: (muted: boolean, memberId: string) =>
    request<void>('/me', { method: 'PATCH', body: JSON.stringify({ muted }) }, memberId),

  saveSubscription: (sub: PushSubscriptionJSON, memberId: string) =>
    request<void>('/me/subscription', {
      method: 'PUT',
      body: JSON.stringify(sub),
    }, memberId),
};
