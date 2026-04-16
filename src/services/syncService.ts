import { StoryState } from '../types';
import { storage } from '../lib/storage';

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'error';

class SyncService {
  private syncInterval: number | null = null;
  private status: SyncStatus = 'offline';
  private onStatusChange: ((status: SyncStatus) => void) | null = null;

  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch('/api/health');
      return response.ok;
    } catch {
      return false;
    }
  }

  async sync(stories: StoryState[]): Promise<StoryState[] | null> {
    if (this.status === 'syncing') return null;
    
    this.setStatus('syncing');
    
    try {
      // Filter for dirty stories that need pushing
      const dirtyStories = stories.filter(s => s.isDirty);
      
      // Even if none are dirty, we pull from server to get remote changes
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stories: dirtyStories })
      });

      if (!response.ok) throw new Error('Sync failed');

      const data = await response.json();
      const serverStories = data.stories as StoryState[];
      
      this.setStatus('online');
      
      // Mark local stories as clean
      return serverStories.map(s => ({ ...s, isDirty: false, syncStatus: 'synced' }));
    } catch (err) {
      console.error('Sync error:', err);
      this.setStatus('error');
      // After a failure, we'll try again next interval
      setTimeout(() => this.checkAndSetOffline(), 5000);
      return null;
    }
  }

  private async checkAndSetOffline() {
    const isOnline = await this.checkConnection();
    this.setStatus(isOnline ? 'online' : 'offline');
  }

  private setStatus(newStatus: SyncStatus) {
    this.status = newStatus;
    if (this.onStatusChange) this.onStatusChange(newStatus);
  }

  startAutoSync(getStories: () => StoryState[], onSyncComplete: (stories: StoryState[]) => void) {
    if (this.syncInterval) return;

    // Check status immediately
    this.checkAndSetOffline();

    this.syncInterval = window.setInterval(async () => {
      const isOnline = await this.checkConnection();
      
      if (isOnline) {
        const stories = getStories();
        const syncedStories = await this.sync(stories);
        if (syncedStories) {
          onSyncComplete(syncedStories);
        }
      } else {
        this.setStatus('offline');
      }
    }, 30000); // 30 seconds
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  subscribe(callback: (status: SyncStatus) => void) {
    this.onStatusChange = callback;
    callback(this.status);
  }
}

export const syncService = new SyncService();
