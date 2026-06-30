// API utility functions for Crime Kickers Hub
/* eslint-disable @typescript-eslint/no-explicit-any */

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
export async function createEntity(data: { name: string; slug: string; type: string; description?: string; base_prompt?: string; avatar_url?: string; avatar_thumbnail_url?: string }) {
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

export async function updateEntity(id: string, data: { name?: string; slug?: string; type?: string; description?: string; base_prompt?: string; avatar_url?: string; avatar_thumbnail_url?: string }) {
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

// Entity Types APIs
export async function getEntityTypes() {
  return fetchApi<any[]>('/entity-types');
}

export async function createEntityType(data: { slug: string; name: string; description?: string }) {
  const response = await fetch(`${API_BASE}/admin/entity-types`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function updateEntityType(id: number, data: { slug?: string; name?: string; description?: string }) {
  const response = await fetch(`${API_BASE}/admin/entity-types/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function deleteEntityType(id: number) {
  const response = await fetch(`${API_BASE}/admin/entity-types/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// Video APIs
export interface Video {
  id: number;
  title: string;
  youtube_id: string;
  description: string;
  mins: string;
  tag: string;
  color: string;
  tags: string[];
  sort_order: number;
  published: boolean;
}

export type VideoInput = Omit<Video, 'id'>;

export async function getVideos() {
  return fetchApi<Video[]>('/videos');
}

export async function getVideosAdmin() {
  return fetchApi<Video[]>('/admin/videos');
}

export async function createVideo(data: VideoInput) {
  const response = await fetch(`${API_BASE}/admin/videos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function updateVideo(id: number, data: VideoInput) {
  const response = await fetch(`${API_BASE}/admin/videos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function deleteVideo(id: number) {
  const response = await fetch(`${API_BASE}/admin/videos/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// Game APIs
export interface Game {
  id: number;
  title: string;
  url: string;
  description: string;
  thumbnail_url: string;
  tag: string;
  color: string;
  sort_order: number;
  published: boolean;
}

export type GameInput = Omit<Game, 'id'>;

export async function getGames() {
  return fetchApi<Game[]>('/games');
}

export async function getGamesAdmin() {
  return fetchApi<Game[]>('/admin/games');
}

export async function createGame(data: GameInput) {
  const response = await fetch(`${API_BASE}/admin/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function updateGame(id: number, data: GameInput) {
  const response = await fetch(`${API_BASE}/admin/games/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function deleteGame(id: number) {
  const response = await fetch(`${API_BASE}/admin/games/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// Merch APIs
export interface Merch {
  id: number;
  title: string;
  description: string;
  image_url: string;
  thumbnail_url: string;
  tag: string;
  color: string;
  sort_order: number;
  published: boolean;
  want_count: number;
}

export type MerchInput = Omit<Merch, 'id' | 'want_count'>;

export async function getMerch() {
  return fetchApi<Merch[]>('/merch');
}

export async function getMerchAdmin() {
  return fetchApi<Merch[]>('/admin/merch');
}

export async function createMerch(data: MerchInput) {
  const response = await fetch(`${API_BASE}/admin/merch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function updateMerch(id: number, data: MerchInput) {
  const response = await fetch(`${API_BASE}/admin/merch/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function deleteMerch(id: number) {
  const response = await fetch(`${API_BASE}/admin/merch/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function wantMerch(id: number): Promise<{ want_count: number }> {
  const response = await fetch(`${API_BASE}/merch/${id}/want`, {
    method: 'POST',
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

export async function deleteMedia(id: number) {
  const response = await fetch(`${API_BASE}/admin/media/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

import { resizeImage } from './image-utils';

export async function uploadMedia(file: File, promptVersionId?: string) {
  // 1. Generate thumbnail
  const thumbnailBlob = await resizeImage(file, 256, 256);
  const thumbnailFile = new File([thumbnailBlob], file.name.replace(/(\.[\w\d_-]+)$/i, '_thumb$1'), {
    type: thumbnailBlob.type,
  });

  // 2. Get presigned URLs for BOTH files
  const [mainPresigned, thumbPresigned] = await Promise.all([
    fetch(`${API_BASE}/admin/upload/presigned`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, contentType: file.type }),
    }).then(r => r.json()),
    fetch(`${API_BASE}/admin/upload/presigned`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: thumbnailFile.name, contentType: thumbnailFile.type }),
    }).then(r => r.json()),
  ]);

  // 3. Upload BOTH to R2 in parallel
  await Promise.all([
    fetch(mainPresigned.uploadURL, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    }).then(r => { if (!r.ok) throw new Error(`Main upload failed: ${r.status}`) }),
    fetch(thumbPresigned.uploadURL, {
      method: 'PUT',
      headers: { 'Content-Type': thumbnailFile.type },
      body: thumbnailBlob,
    }).then(r => { if (!r.ok) throw new Error(`Thumbnail upload failed: ${r.status}`) })
  ]);

  // 4. Register asset with BOTH URLs
  const registerResponse = await fetch(`${API_BASE}/admin/assets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'image',
      r2Key: mainPresigned.key,
      url: mainPresigned.publicURL,
      thumbnail_url: thumbPresigned.publicURL, // Pass thumbnail URL
      promptVersionId: promptVersionId ? parseInt(promptVersionId) : undefined,
    }),
  });

  if (!registerResponse.ok) {
    throw new Error(`Failed to register asset: ${registerResponse.status}`);
  }

  // Combine the response with our thumbnail URL so the UI can use it immediately
  const result = await registerResponse.json();
  return { ...result, thumbnail_url: thumbPresigned.publicURL };
}

export async function uploadAudio(file: File): Promise<{ url: string }> {
  // Some audio files report an empty MIME type. The presigned URL is signed against
  // a specific Content-Type, so the value we sign with must match the value we PUT
  // with, otherwise the R2 presigned PUT fails. Compute it once and reuse it.
  const contentType = file.type || 'application/octet-stream';

  // 1. Get a presigned URL for the audio file
  const presignedResponse = await fetch(`${API_BASE}/admin/upload/presigned`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, contentType }),
  });
  if (!presignedResponse.ok) {
    throw new Error(`Failed to get presigned URL: ${presignedResponse.status}`);
  }
  const presigned = await presignedResponse.json();

  // 2. Upload the raw file to R2
  const uploadResponse = await fetch(presigned.uploadURL, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });
  if (!uploadResponse.ok) {
    throw new Error(`Audio upload failed: ${uploadResponse.status}`);
  }

  // 3. Return the public URL (audio is stored directly on the story, not as a media_asset)
  return { url: presigned.publicURL };
}

export async function createTextSlide(data: { title: string; description?: string; text_content: string; entity_id?: number }) {
  const response = await fetch(`${API_BASE}/admin/media/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function updateTextSlide(id: number, data: { title?: string; description?: string; text_content?: string; entity_id?: number | null }) {
  const response = await fetch(`${API_BASE}/admin/media/text/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
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

export async function updateStory(id: string, itemIds: number[]) {
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

// Note: audio_url and motto are `string` (not `string | null`) on purpose. The backend
// treats a JSON `null` / omitted field as "preserve current value"; only an empty string
// `''` clears it. Passing `null` would be a no-op, so the type forbids it to match behavior.
export async function updateStoryMetadata(id: string, data: { title?: string; slug?: string; coverImageUrl?: string; published?: boolean; audio_url?: string; motto?: string }) {
  const response = await fetch(`${API_BASE}/admin/stories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
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

export async function deleteStory(id: string) {
  const response = await fetch(`${API_BASE}/admin/stories/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `API Error: ${response.status} ${response.statusText}`);
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

export async function listPromptHistory() {
  return fetchApi<any[]>('/admin/prompts/history');
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

// Dashboard API
export async function getDashboardActivity() {
  return fetchApi<any[]>('/admin/dashboard/activity');
}

