import { useState, useEffect } from 'react';
import { syncService, SyncStatus } from '../services/syncService';

export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>('offline');

  useEffect(() => {
    syncService.subscribe((newStatus) => {
      setStatus(newStatus);
    });
  }, []);

  return status;
}
