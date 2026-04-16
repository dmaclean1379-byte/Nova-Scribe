import { openDB, IDBPDatabase } from 'idb';
import { StoryState, LLMConfig, ThemeConfig } from '../types';

const DB_NAME = 'novascribe-db';
const STORE_NAME = 'stories';
const CONFIG_STORE = 'config';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(CONFIG_STORE)) {
          db.createObjectStore(CONFIG_STORE);
        }
      },
    });
  }
  return dbPromise;
}

export const storage = {
  // Stories
  async getAllStories(): Promise<StoryState[]> {
    const db = await getDB();
    return db.getAll(STORE_NAME);
  },

  async saveStory(story: StoryState): Promise<void> {
    const db = await getDB();
    await db.put(STORE_NAME, story);
  },

  async deleteStory(id: string): Promise<void> {
    const db = await getDB();
    await db.delete(STORE_NAME, id);
  },

  async saveAllStories(stories: StoryState[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    // Clear all and re-add for simplicity in this full-state sync app
    await tx.store.clear();
    for (const story of stories) {
      await tx.store.put(story);
    }
    await tx.done;
  },

  // Config/Settings
  async getConfig<T>(key: string): Promise<T | null> {
    const db = await getDB();
    return db.get(CONFIG_STORE, key);
  },

  async saveConfig(key: string, value: any): Promise<void> {
    const db = await getDB();
    await db.put(CONFIG_STORE, value, key);
  },

  // Migration from localStorage
  async migrateFromLocalStorage(): Promise<boolean> {
    const savedStories = localStorage.getItem('novascribe_stories');
    if (!savedStories) return false;

    try {
      const stories = JSON.parse(savedStories);
      if (Array.isArray(stories)) {
        await this.saveAllStories(stories);
        
        // Migrate configs too
        const llmConfig = localStorage.getItem('novascribe_llm_config');
        if (llmConfig) await this.saveConfig('llm_config', JSON.parse(llmConfig));

        const themeConfig = localStorage.getItem('novascribe_theme_config');
        if (themeConfig) await this.saveConfig('theme_config', JSON.parse(themeConfig));

        // Note: We don't clear localStorage immediately to be safe, 
        // but the app should prefer IndexedDB from now on.
        return true;
      }
    } catch (e) {
      console.error('Migration failed', e);
    }
    return false;
  }
};
