import type { Channel, Ring } from '../types';

const BASE = '/api';

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
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `Error ${res.status}`);
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

  sendRing: (code: string, memberId: string) =>
    request<Ring>(`/channels/${code}/rings`, { method: 'POST' }, memberId),

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
