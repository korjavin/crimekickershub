// API Types for Crime Kickers Hub frontend
// These types correspond to the Go backend models

export interface Entity {
  id: number;
  slug: string;
  name: string;
  type: string;
  description: string | null;
  base_prompt: string | null;
  avatar_url: string | null;
  avatar_thumbnail_url: string | null;
  created_at: string | null;
}

export interface EntityType {
  id: number;
  slug: string;
  name: string;
  description?: string;
}

export interface MediaAsset {
  id: number;
  type: string; // "image", "video", or "text"
  r2_key: string | null; // For images
  youtube_id: string | null; // For videos
  source_prompt_version_id: number | null;
  created_at: string | null;
  // Computed fields for frontend
  url?: string;
  thumbnail_url?: string;
  // Text slide fields
  title?: string;
  description?: string;
  text_content?: string;
  entity_id?: number | null;
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

// Public comic reader types (simplified from backend PublicStoryResponse)
export interface PublicStoryItem {
  type: 'image' | 'video' | 'text';
  url?: string;
  youtube_id?: string;
  text_content?: string;
  aspect_ratio?: string;
}

export interface PublicStory {
  title: string;
  items: PublicStoryItem[];
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

// Prompt Studio types
export interface PromptType {
  id: number;
  slug: string;
  description: string | null;
  template_text: string;
}

export interface PromptVersion {
  id: number;
  entity_id: number;
  type_id: number;
  version_number: number;
  prompt_text: string;
  technical_params_json: string | null;
  created_at: string | null;
  // Expanded fields
  entity?: Entity;
  type?: PromptType;
}

export interface ComposePromptInput {
  entity_ids: number[];
  type_slug: string;
  extra_params_json?: string;
}

export interface SavePromptInput {
  entity_id: number;
  type_id: number;
  prompt_text: string;
  technical_params_json?: string;
}
