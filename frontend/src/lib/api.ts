// API utility functions for Crime Kickers Hub

const API_BASE = '/api';

async function fetchApi<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`);
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// Hero/Entity APIs
export async function getHeroes() {
  return fetchApi<any[]>('/heroes');
}

export async function getEntities() {
  return fetchApi<any[]>('/entities');
}

// Entity Admin APIs
export async function createEntity(data: { name: string; slug: string; type: string; description?: string; avatar_url?: string }) {
  const response = await fetch(`${API_BASE}/admin/entities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function updateEntity(id: string, data: { name?: string; slug?: string; type?: string; description?: string; avatar_url?: string }) {
  const response = await fetch(`${API_BASE}/admin/entities/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function deleteEntity(id: string) {
  const response = await fetch(`${API_BASE}/admin/entities/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// Story/Comic APIs
export async function getStories() {
  return fetchApi<any[]>('/comics');
}

export async function getStoryBySlug(slug: string) {
  return fetchApi<any>(`/comics/${slug}`);
}

// Media APIs
export async function getMediaAssets() {
  return fetchApi<any[]>('/media-assets');
}

// Admin Media APIs
export async function listMedia() {
  return fetchApi<any[]>('/admin/media');
}

export async function uploadMedia(file: File, promptVersionId?: string) {
  const formData = new FormData();
  formData.append('file', file);
  if (promptVersionId) {
    formData.append('prompt_version_id', promptVersionId);
  }
  
  const response = await fetch(`${API_BASE}/admin/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    throw new Error(`Upload Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// Prompt Version APIs (for dropdown)
export async function listPromptVersions() {
  return fetchApi<any[]>('/admin/prompts');
}

// Recent prompt versions for linking
export async function listRecentPromptVersions() {
  return fetchApi<any[]>('/admin/prompts/recent');
}

// Admin Story APIs
export async function listStoriesAdmin() {
  return fetchApi<any[]>('/admin/stories');
}

export async function getStory(id: string) {
  return fetchApi<any>(`/admin/stories/${id}`);
}

export async function updateStory(id: string, itemIds: string[]) {
  const response = await fetch(`${API_BASE}/admin/stories/${id}/items`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item_ids: itemIds }),
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function addStoryItem(storyId: string, mediaAssetId: string, sortOrder: number) {
  const response = await fetch(`${API_BASE}/admin/stories/${storyId}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ media_asset_id: parseInt(mediaAssetId), sort_order: sortOrder }),
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function deleteStoryItem(storyId: string, itemId: string) {
  const response = await fetch(`${API_BASE}/admin/stories/${storyId}/items/${itemId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function createStory(data: { title: string; slug?: string }) {
  const response = await fetch(`${API_BASE}/admin/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// YouTube helpers
export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function extractYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export function isYouTubeUrl(url: string): boolean {
  return extractYouTubeId(url) !== null;
}

// Prompt Studio APIs
export async function getPromptTypes() {
  return fetchApi<any[]>('/admin/prompts/types');
}

export async function createPromptType(data: { slug: string; description: string; template_text: string }) {
  const response = await fetch(`${API_BASE}/admin/prompts/types`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function updatePromptType(id: string, data: { slug?: string; description?: string; template_text?: string }) {
  const response = await fetch(`${API_BASE}/admin/prompts/types/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function deletePromptType(id: string) {
  const response = await fetch(`${API_BASE}/admin/prompts/types/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function getPromptVersions() {
  return fetchApi<any[]>('/admin/prompts');
}

export async function composePrompt(input: { entity_ids: number[]; type_slug: string; extra_params_json?: string }) {
  const response = await fetch(`${API_BASE}/admin/prompts/compose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function savePrompt(input: { entity_id: number; type_id: number; prompt_text: string; technical_params_json?: string }) {
  const response = await fetch(`${API_BASE}/admin/prompts/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function getPromptDiff(from: number, to: number) {
  return fetchApi<{ diff: string }>(`/admin/prompts/diff?from=${from}&to=${to}`);
}

// Matrix API
export async function getMatrixData() {
  return fetchApi<{
    entities: any[];
    types: any[];
    versions: Record<string, { id: number; entity_id: number; type_id: number; version_number: number; prompt_text: string; created_at: string }>;
  }>('/admin/matrix');
}
