
export interface ScenePrompt {
  id: string;
  timestamp: string;
  visual_prompt: string;
  audio_prompt: string;
  negative_prompt: string;
  transition?: 'cut' | 'fade' | 'glitch' | 'zoom';
}

export interface Storyboard {
  character_seed_description: string;
  global_style: string;
  scenes: ScenePrompt[];
}

export interface ProductData {
  name: string;
  description: string;
  usp: string;
  url: string;
  imageUrl?: string;
  category?: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  SCRAPING = 'SCRAPING',
  STORYBOARDING = 'STORYBOARDING',
  GENERATING_VIDEO = 'GENERATING_VIDEO',
  EDITING = 'EDITING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export type VideoModel = 'veo-3.1-fast' | 'veo-3.1-high' | 'kling-v1.5' | 'luma-dream-machine';
export type ReasoningModel = 'gemini-3-pro' | 'gemini-3-flash';

export interface ApiKeys {
  gemini: string;
  veo: string;
  kling: string;
  luma?: string;
}

export interface VideoProject {
  id: string;
  aspectRatio: '9:16' | '16:9' | '1:1';
  resolution: '720p' | '1080p';
  fps: number;
}
