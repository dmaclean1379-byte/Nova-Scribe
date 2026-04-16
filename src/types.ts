export type LLMProvider = 'gemini' | 'openrouter' | 'nvidia' | 'local' | 'custom';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey?: string;
  baseUrl?: string;
  model: string;
}

export interface StoryBibleEntry {
  id: string;
  type: 'character' | 'place' | 'object' | 'lore' | 'outline';
  name: string;
  description: string;
  tags: string[];
}

export interface StoryState {
  id: string;
  title: string;
  content: string;
  bible: StoryBibleEntry[];
  lastModified: number;
  isDirty?: boolean;
  syncStatus?: 'synced' | 'unsynced' | 'syncing';
}

export type ThemeMode = 'light' | 'dark' | 'sepia';

export interface ThemeConfig {
  mode: ThemeMode;
  primaryColor: string;
}

export interface BrainstormIdea {
  id: string;
  text: string;
}
