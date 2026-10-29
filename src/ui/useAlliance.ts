import { useEffect, useRef, useState } from 'react';
import { type Dataset } from '../domain/model';
import { db, readDataset, saveDataset } from '../data/store';
import { SyncEngine } from '../sync/client';
import { SYNC_PREVIEW } from '../features';
import { reminderQueue } from '../reminders/client';
import { transitionAlliance, type AllianceTransition } from '../data/alliances';
export function useAlliance() {
  const [data, setData] = useState<Dataset | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [syncStatus, setSyncStatus] = useState('Saved on this device');
  const [storageFailure, setStorageFailure] = useState(false);
  const unsaved = useRef(false);
  const current = useRef<Dataset | null>(null);
  const channel = useRef<BroadcastChannel | null>(null);
  const engine = useRef<SyncEngine | null>(null);
  const scopeVersion = useRef(0);
  const update = (next: Dataset | null) => {
    current.current = next;
    setData(next);
  };
  useEffect(() => {
    let mounted = true;
    const initialScope = scopeVersion.current;
    readDataset()
      .then((value) => {
        if (mounted && scopeVersion.current === initialScope) update(value);
      })
      .catch(() => {
        setStorageFailure(true);
        setError('Could not read the stored data. Your original data has been kept.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    const sync = SYNC_PREVIEW
      ? new SyncEngine((next, status) => {
          if (unsaved.current) return;
          if (next) update(next);
          setSyncStatus(status);
        })
      : null;
    engine.current = sync;
    sync?.start();
    const broadcast = new BroadcastChannel('alliance-data');
    channel.current = broadcast;
    reminderQueue.start(() => {
      if (!mounted) return;
      const version = scopeVersion.current;
      if (!unsaved.current)
        void readDataset()
          .then((next) => {
            if (mounted && version === scopeVersion.current && !unsaved.current) update(next);
          })
          .catch(() => {});
      broadcast.postMessage('changed');
    });
    broadcast.onmessage = (event) => {
      if (event.data?.type === 'alliance-switched') {
        scopeVersion.current++;
        unsaved.current = false;
        engine.current?.stop();
        setError('');
        setSyncStatus('Saved on this device');
      }
      const version = scopeVersion.current;
      if (!unsaved.current)
        readDataset()
          .then((next) => {
            if (mounted && version === scopeVersion.current && !unsaved.current) update(next);
          })
          .catch(() => {});
    };
    const protect = (event: BeforeUnloadEvent) => {
      if (unsaved.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', protect);
    return () => {
      mounted = false;
      sync?.stop();
      reminderQueue.stop();
      broadcast.close();
      window.removeEventListener('beforeunload', protect);
    };
  }, []);
  async function commit(next: Dataset, options?: { publishAfterSave?: boolean }) {
    const previous = current.current;
    if (previous && next.alliance.id !== previous.alliance.id)
      throw new Error('The active alliance changed. Reopen this screen before saving.');
    if (!options?.publishAfterSave) update(next);
    try {
      await saveDataset(next, previous);
      if (options?.publishAfterSave) update(next);
      unsaved.current = false;
      setError('');
      setSyncStatus('Saved on this device');
      channel.current?.postMessage('changed');
      engine.current?.edited();
    } catch (e) {
      if (options?.publishAfterSave) {
        setError(
          'Could not save these changes. Your current form remains open; retry when storage is available.',
        );
        throw e;
      }
      unsaved.current = true;
      engine.current?.stop();
      setSyncStatus('Unsaved changes · export a copy');
      setError((e as Error).message + ' Your changes remain in this window; export a copy.');
      throw e;
    }
    return next;
  }
  async function reload() {
    update(await readDataset());
    if (unsaved.current) {
      unsaved.current = false;
      engine.current?.start();
    }
    setStorageFailure(false);
    setError('');
    channel.current?.postMessage('changed');
  }
  async function switchAlliance(expected: Dataset, request: AllianceTransition) {
    scopeVersion.current++;
    engine.current?.stop();
    try {
      const next = await transitionAlliance(expected, request);
      unsaved.current = false;
      update(next);
      setError('');
      setSyncStatus('Saved on this device');
      channel.current?.postMessage({ type: 'alliance-switched' });
      return next;
    } catch (error) {
      if (SYNC_PREVIEW) engine.current?.start();
      throw error;
    }
  }
  return {
    data,
    loading,
    error,
    setError,
    commit,
    reload,
    syncStatus,
    engine,
    db,
    storageFailure,
    switchAlliance,
  };
}
export type Commit = (data: Dataset, options?: { publishAfterSave?: boolean }) => Promise<Dataset>;
export type SwitchAlliance = (expected: Dataset, request: AllianceTransition) => Promise<Dataset>;
