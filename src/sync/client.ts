import {
  db,
  readLocal,
  writeLocal,
  readDataset,
  entityKeys,
  canonical,
  type SyncCredentials,
  type Operation,
  type Conflict,
} from '../data/store';
import { datasetSchema, nowISO, type Dataset } from '../domain/model';
import { dataEntity, putEntity } from '../domain/actions';
import { api } from './http';
export { api } from './http';
import { httpTransport, type SyncTransport, type SyncSnapshot } from './transport';
export type { SyncSnapshot } from './transport';
export class SyncEngine {
  private busy = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private interval: ReturnType<typeof setInterval> | undefined;
  private failures = 0;
  private lastFocus = 0;
  constructor(
    private update: (data: Dataset | null, status: string) => void,
    private transport: SyncTransport = httpTransport,
  ) {}
  start() {
    this.interval = setInterval(() => {
      if (document.visibilityState === 'visible') void this.run();
    }, 60000);
    document.addEventListener('visibilitychange', this.focus);
    window.addEventListener('focus', this.focus);
    this.focus();
  }
  stop() {
    clearInterval(this.interval);
    clearTimeout(this.timer);
    document.removeEventListener('visibilitychange', this.focus);
    window.removeEventListener('focus', this.focus);
  }
  private focus = () => {
    if (document.visibilityState === 'visible' && Date.now() - this.lastFocus >= 30000) {
      this.lastFocus = Date.now();
      void this.run();
    }
  };
  edited() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      void this.run();
    }, 5000);
  }
  async run(manual = false) {
    if (this.busy || document.visibilityState !== 'visible' || (this.failures >= 3 && !manual))
      return;
    const credentials = await readLocal<SyncCredentials>('sync');
    if (!credentials) return;
    if (manual) this.failures = 0;
    this.busy = true;
    try {
      const work = async () => {
        const pending = (await db.operations.toArray()).sort(
          (a, b) => (a.order ?? 0) - (b.order ?? 0),
        );
        const lastCheck = (await readLocal<number>('last-sync-check')) ?? 0;
        if (!manual && !pending.length && Date.now() - lastCheck < 30000) return;
        await writeLocal('last-sync-check', Date.now());
        let reply = await this.transport.exchange(credentials, {
          cursor: credentials.cursor,
          operations: pending.slice(0, 10),
        });
        while (reply.more) {
          const cursor = reply.cursor;
          const page = await this.transport.exchange(credentials, { cursor, operations: [] });
          if (page.cursor <= cursor) throw new Error('Sync did not advance. Try again.');
          reply = {
            changes: [...reply.changes, ...page.changes],
            heads: { ...reply.heads, ...page.heads },
            cursor: page.cursor,
            more: page.more,
          };
        }
        const remoteVersions = new Map<string, unknown>();
        const sent = new Set(pending.slice(0, 10).map((op) => op.id));
        for (const item of reply.changes)
          if (item.conflict && sent.has(item.operation.id)) {
            const canonical = reply.changes.find(
              (c) => c.operation.id === reply.heads[item.operation.key],
            );
            remoteVersions.set(
              item.operation.id,
              canonical?.operation.value ??
                (await this.transport.entity(credentials, item.operation.key)),
            );
          }
        await db.transaction('rw', db.entries, db.operations, db.conflicts, async () => {
          const active = await readLocal<SyncCredentials>('sync');
          if (active?.spaceId !== credentials.spaceId || active.token !== credentials.token) return;
          let data = await readDataset();
          if (!data) return;
          const heads = (await readLocal<Record<string, string>>('heads')) ?? {};
          const pendingNow = await db.operations.toArray();
          const sentIds = new Set(pending.slice(0, 10).map((op) => op.id));
          const remainingKeys = new Set(
            pendingNow.filter((op) => !sentIds.has(op.id)).map((op) => op.key),
          );
          const changedKeys = new Set(reply.changes.map((item) => item.operation.key));
          for (const item of reply.changes) {
            const op = item.operation;
            if (item.conflict && sentIds.has(op.id)) {
              const remote = remoteVersions.get(op.id);
              await db.conflicts.put({
                id: op.id,
                key: op.key,
                local: op,
                remote,
                remoteHead: reply.heads[op.key],
              });
            }
            for (const revision of op.revisions)
              if (!data.revisions.some((r) => r.id === revision.id)) data.revisions.push(revision);
            const conflicted = await db.conflicts.where('key').equals(op.key).count();
            if (!conflicted && !remainingKeys.has(op.key) && reply.heads[op.key] === op.id)
              putEntity(data, op.key, op.value);
          }
          for (const key of changedKeys) if (!remainingKeys.has(key)) heads[key] = reply.heads[key];
          await db.operations.bulkDelete(pending.slice(0, 10).map((op) => op.id));
          data = { ...data, updatedAt: nowISO() };
          datasetSchema.parse(data);
          credentials.cursor = reply.cursor;
          await writeLocal('sync', credentials);
          await writeLocal('heads', heads);
          await writeLocal('dataset', data);
          await writeLocal('last-sync', nowISO());
        });
        if ((await readLocal<SyncCredentials>('sync'))?.spaceId !== credentials.spaceId) return;
        this.failures = 0;
        this.update(
          await readDataset(),
          (await db.conflicts.count()) ? 'Conflict to review' : 'Synced',
        );
        if (reply.more || (await db.operations.count()) > 0)
          this.timer = setTimeout(() => {
            void this.run(true);
          }, 1000);
      };
      if (navigator.locks)
        await navigator.locks.request('snap-alliance-sync', { ifAvailable: true }, async (lock) => {
          if (lock) await work();
        });
      else await work();
    } catch (error) {
      this.failures++;
      this.update(
        null,
        this.failures >= 3
          ? 'Sync paused. Try again.'
          : 'Changes saved on this device. Retrying soon.',
      );
      if (this.failures < 3)
        this.timer = setTimeout(
          () => {
            void this.run();
          },
          this.failures === 1 ? 15000 : 60000,
        );
    } finally {
      this.busy = false;
    }
  }
}
export async function enableSync(dataset: Dataset) {
  const result = await api<SyncCredentials & { heads: Record<string, string> }>('/spaces', {
    dataset,
  });
  await db.transaction('rw', db.entries, db.operations, async () => {
    const latest = await readDataset();
    if (!latest || latest.id !== dataset.id)
      throw new Error('Local data changed while connecting. Your current history has been kept.');
    await writeLocal('sync', result);
    const heads = { ...result.heads };
    await db.operations.clear();
    for (const key of entityKeys(latest))
      if (canonical(dataEntity(latest, key)) !== canonical(dataEntity(dataset, key))) {
        const order = ((await readLocal<number>('operation-order')) ?? 0) + 1;
        await writeLocal('operation-order', order);
        const op: Operation = {
          id: crypto.randomUUID(),
          key,
          base: heads[key] ?? null,
          value: dataEntity(latest, key),
          revisions: latest.revisions.filter(
            (r) => r.entity === key && !dataset.revisions.some((old) => old.id === r.id),
          ),
          at: nowISO(),
          order,
        };
        await db.operations.put(op);
        heads[key] = op.id;
      }
    await writeLocal('heads', heads);
  });
  return result;
}
export async function joinSnapshot(credentials: SyncCredentials) {
  const snapshot = await httpTransport.snapshot(credentials);
  datasetSchema.parse(snapshot.dataset);
  await db.transaction('rw', db.entries, db.operations, db.conflicts, async () => {
    const previous = await readDataset();
    if (previous) await writeLocal('previous-dataset', previous);
    await writeLocal('dataset', snapshot.dataset);
    await writeLocal('heads', snapshot.heads);
    await writeLocal('sync', { ...credentials, cursor: snapshot.cursor });
    await db.operations.clear();
    await db.conflicts.clear();
  });
  return snapshot.dataset;
}
export async function resolveConflict(conflict: Conflict, useLocal: boolean) {
  const data = await readDataset();
  if (!data) return;
  const value = useLocal ? conflict.local.value : conflict.remote;
  const order = ((await readLocal<number>('operation-order')) ?? 0) + 1;
  const op: Operation = {
    ...conflict.local,
    id: crypto.randomUUID(),
    base: conflict.remoteHead,
    value,
    at: nowISO(),
    order,
  };
  putEntity(data, conflict.key, value);
  data.updatedAt = nowISO();
  await db.transaction('rw', db.entries, db.operations, db.conflicts, async () => {
    const heads = (await readLocal<Record<string, string>>('heads')) ?? {};
    heads[op.key] = op.id;
    await writeLocal('operation-order', order);
    await db.operations.put(op);
    await writeLocal('heads', heads);
    await writeLocal('dataset', datasetSchema.parse(data));
    await db.conflicts.delete(conflict.id);
  });
  return data;
}
