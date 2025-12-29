// API Types for Crime Kickers Hub frontend
// These types correspond to the Go backend models

export interface Entity {
  id: number;
  slug: string;
  name: string;
  type: string;
  description: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

export interface MediaAsset {
  id: number;
  type: string; // "image" or "video"
  r2_key: string | null; // For images
  youtube_id: string | null; // For videos
  source_prompt_version_id: number | null;
  created_at: string | null;
  // Computed fields for frontend
  url?: string;
  thumbnail_url?: string;
}

export interface Story {
  id: number;
  title: string;
  slug: string;
  cover_image_url: string | null;
  published: boolean | null;
  created_at: string | null;
}

export interface StoryItem {
  id: number;
  story_id: number;
  media_asset_id: number;
  sort_order: number;
  // Expanded media asset
  media?: MediaAsset;
}

export interface StoryWithItems extends Story {
  items: StoryItem[];
}

export interface ComicCard {
  id: number;
  title: string;
  slug: string;
  cover_image_url: string | null;
  published: boolean | null;
}

export interface HeroCard extends Entity {
  // Additional computed fields for display
  stats?: HeroStats;
}

export interface HeroStats {
  power: number;
  speed: number;
  intelligence: number;
  durability: number;
}

export interface YouTubeEmbedData {
  videoId: string;
  embedUrl: string;
  thumbnailUrl: string;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Cinema/Video types
export interface VideoAsset extends MediaAsset {
  youtube_id: string;
  title?: string;
  description?: string;
}

export interface VideoGalleryItem {
  id: number;
  youtube_id: string;
  thumbnail_url: string;
  title: string;
  tags: string[];
}
