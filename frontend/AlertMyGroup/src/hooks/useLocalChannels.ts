import { useState } from 'react';
import type { LocalChannelData } from '../types';

const KEY = 'amg_channels';

function load(): LocalChannelData[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persist(list: LocalChannelData[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
}

export function useLocalChannels() {
  const [channels, setChannels] = useState<LocalChannelData[]>(load);

  const save = (data: LocalChannelData) =>
    setChannels(prev => {
      const idx = prev.findIndex(c => c.code === data.code);
      const next = idx >= 0
        ? prev.map((c, i) => (i === idx ? data : c))
        : [...prev, data];
      persist(next);
      return next;
    });

  const remove = (code: string) =>
    setChannels(prev => {
      const next = prev.filter(c => c.code !== code);
      persist(next);
      return next;
    });

  const get = (code: string) => channels.find(c => c.code === code);

  return { channels, save, remove, get };
}
