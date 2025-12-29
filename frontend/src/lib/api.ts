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
