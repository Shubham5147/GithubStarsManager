import { backend } from './backendAdapter';
import { useAppStore } from '../store/useAppStore';

function authHeaders(): Record<string, string> {
  const secret = useAppStore.getState().backendApiSecret || '';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (secret) headers.Authorization = `Bearer ${secret}`;
  return headers;
}

export interface InboxItem {
  id: string;
  caption: string | null;
  local_thumb_path: string | null;
  local_video_path: string | null;
  link_id: number | null;
  repo_full_name: string | null;
  link_status: string | null;
  confidence: number | null;
  extraction_source: string | null;
  evidence: string | null;
}

export interface PaperItem {
  id: string;
  title: string;
  abstract: string;
  authors: string[];
  published_at: string | null;
  source: string;
  source_url: string;
  pdf_url: string | null;
  topics: string[];
  paperswithcode_url: string | null;
  code_repos: Array<{ url: string; is_official?: boolean }>;
}

async function apiGet<T>(path: string): Promise<T> {
  if (!backend.isAvailable || !backend.backendUrl) {
    throw new Error('Backend not connected');
  }
  const res = await fetch(`${backend.backendUrl}${path}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

async function apiPost(path: string, body?: unknown): Promise<void> {
  if (!backend.isAvailable || !backend.backendUrl) {
    throw new Error('Backend not connected');
  }
  const res = await fetch(`${backend.backendUrl}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function fetchInbox(): Promise<InboxItem[]> {
  const data = await apiGet<{ items: InboxItem[] }>('/inbox');
  return data.items;
}

export async function confirmLink(linkId: number): Promise<void> {
  await apiPost(`/links/${linkId}/confirm`);
}

export async function rejectLink(linkId: number): Promise<void> {
  await apiPost(`/links/${linkId}/reject`);
}

export async function fetchPapers(topic?: string): Promise<PaperItem[]> {
  const q = topic ? `?topic=${encodeURIComponent(topic)}` : '';
  const data = await apiGet<{ items: PaperItem[] }>(`/papers${q}`);
  return data.items;
}

export async function addPaper(payload: {
  id: string;
  title: string;
  abstract?: string;
  source_url?: string;
}): Promise<void> {
  await apiPost('/papers/add', payload);
}

export async function fetchReadmeImages(
  fullName: string,
): Promise<Array<{ image_url: string; sort_order: number }>> {
  const [owner, repo] = fullName.split('/');
  const data = await apiGet<{ images: Array<{ image_url: string; sort_order: number }> }>(
    `/repos/${owner}/${repo}/images`,
  );
  return data.images;
}

export async function searchBrain(query: string): Promise<
  Array<{ entity_type: string; entity_id: string; title: string; snippet: string }>
> {
  const data = await apiGet<{ results: Array<{ entity_type: string; entity_id: string; title: string; snippet: string }> }>(
    `/search?q=${encodeURIComponent(query)}`,
  );
  return data.results;
}
