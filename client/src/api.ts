import type { University, Program, Institute } from './types';
import { UNIVERSITIES, PROGRAMS } from './data';
import { apiUrl } from './config';

const BASE = '/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(apiUrl(`${BASE}${path}`));
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(apiUrl(`${BASE}${path}`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}

function filterUniversities(params?: Record<string, string>) {
  let list = [...UNIVERSITIES];
  if (params?.type) list = list.filter(u => u.type === params.type);
  if (params?.q) {
    const q = params.q.toLowerCase();
    list = list.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.abbr.toLowerCase().includes(q) ||
      u.description.toLowerCase().includes(q)
    );
  }
  list.sort((a, b) => (a.qs_ranking ?? 9999) - (b.qs_ranking ?? 9999) || a.name.localeCompare(b.name));
  const limit = params?.limit ? parseInt(params.limit) : 50;
  return list.slice(0, limit);
}

export const api = {
  universities: {
    list: async (params?: Record<string, string>) => {
      try {
        const qs = params ? '?' + new URLSearchParams(params).toString() : '';
        return await get<{ data: University[]; total: number }>(`/universities${qs}`);
      } catch (err) {
        if (!import.meta.env.DEV) throw err;
        const data = filterUniversities(params);
        return { data, total: UNIVERSITIES.length };
      }
    },
    get: async (id: number) => {
      try {
        return await get<University & { programs: Program[] }>(`/universities/${id}`);
      } catch (err) {
        if (!import.meta.env.DEV) throw err;
        const uni = UNIVERSITIES.find(u => u.id === id);
        if (!uni) throw new Error('Not found');
        const programs = PROGRAMS.filter(p => p.university_id === id);
        return { ...uni, programs };
      }
    },
  },
  institutes: {
    list: async (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return await get<{ data: Institute[]; total: number }>(`/institutes${qs}`);
    },
  },
  programs: {
    list: async (params?: Record<string, string>) => {
      try {
        const qs = params ? '?' + new URLSearchParams(params).toString() : '';
        return await get<{ data: Program[]; fields: string[] }>(`/programs${qs}`);
      } catch (err) {
        if (!import.meta.env.DEV) throw err;
        let data = [...PROGRAMS];
        if (params?.field) data = data.filter(p => p.field === params.field);
        if (params?.level) data = data.filter(p => p.level === params.level);
        if (params?.university_id) data = data.filter(p => p.university_id === parseInt(params.university_id));
        if (params?.q) {
          const q = params.q.toLowerCase();
          data = data.filter(p => p.name.toLowerCase().includes(q));
        }
        const fields = [...new Set(PROGRAMS.map(p => p.field))].sort();
        return { data, fields };
      }
    },
  },
  leads: {
    submit: async (phone: string, name?: string, source?: string) => {
      try {
        return await post<{ ok: boolean; existing: boolean }>('/leads', { phone, name, source });
      } catch (err) {
        if (!import.meta.env.DEV) throw err;
        return { ok: true, existing: false };
      }
    },
  },
};
