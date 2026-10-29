import Dexie, { type Table } from 'dexie';
import { datasetSchema, type Dataset, uuid, nowISO } from '../domain/model';
import { dataEntity } from '../domain/actions';
export type Operation = {
  id: string;
  key: string;
  base: string | null;
  value: unknown;
  revisions: Dataset['revisions'];
  at: string;
  order?: number;
};
export type SyncCredentials = {
  spaceId: string;
  deviceId: string;
  token: string;
  recoveryKey?: string;
  cursor: number;
};
export type Conflict = {
  id: string;
  key: string;
  local: Operation;
  remote: unknown;
  remoteHead: string;
};
class LocalDatabase extends Dexie {
  entries!: Table<{ key: string; value: unknown }, string>;
  operations!: Table<Operation, string>;
  conflicts!: Table<Conflict, string>;
  constructor(name = 'snap-alliance') {
    super(name);
    this.version(1).stores({ entries: 'key', operations: 'id,key', conflicts: 'id,key' });
  }
}
export const db = new LocalDatabase();
export const readLocal = async <T>(key: string) =>
  (await db.entries.get(key))?.value as T | undefined;
export const writeLocal = async (key: string, value: unknown) => {
  await db.entries.put({ key, value });
};
export const readDataset = async () => {
  const data = await readLocal<Dataset>('dataset');
  return data ? datasetSchema.parse(data) : null;
};
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object')
    return (
      '{' +
      Object.keys(value)
        .sort()
        .map(
          (key) => JSON.stringify(key) + ':' + canonical((value as Record<string, unknown>)[key]),
        )
        .join(',') +
      '}'
    );
  return JSON.stringify(value);
}
export const entityKeys = (d: Dataset) => [
  'alliance',
  'preferences',
  ...d.players.map((p) => 'player/' + p.id),
  ...d.weeks.map((w) => 'week/' + w.id),
];
export async function saveDataset(data: Dataset, previous: Dataset | null) {
  datasetSchema.parse(data);
  await db.transaction('rw', db.entries, db.operations, async () => {
    const stored = await readLocal<Dataset>('dataset');
    if (!previous && stored)
      throw new Error(
        'Data already exists on this device. Reopen the app or confirm a backup import.',
      );
    if (previous && (!stored || canonical(stored) !== canonical(previous)))
      throw new Error(
        'Data changed in another window. Export your pending changes and reopen the app before continuing.',
      );
    if (previous && previous.alliance.id !== data.alliance.id)
      throw new Error(
        'Use Change alliance or a confirmed backup import to replace the active alliance.',
      );
    const credentials = await readLocal<SyncCredentials>('sync');
    const heads = (await readLocal<Record<string, string>>('heads')) ?? {};
    if (credentials)
      for (const key of entityKeys(data)) {
        const value = dataEntity(data, key);
        if (!previous || canonical(value) !== canonical(dataEntity(previous, key))) {
          const order = ((await readLocal<number>('operation-order')) ?? 0) + 1;
          await writeLocal('operation-order', order);
          const op: Operation = {
            id: uuid(),
            key,
            base: heads[key] ?? null,
            value,
            revisions: data.revisions.filter(
              (r) => r.entity === key && !previous?.revisions.some((old) => old.id === r.id),
            ),
            at: nowISO(),
            order,
          };
          await db.operations.put(op);
          heads[key] = op.id;
        }
      }
    await writeLocal('heads', heads);
    await writeLocal('dataset', data);
  });
}
export async function replaceDataset(data: Dataset) {
  datasetSchema.parse(data);
  await db.transaction('rw', db.entries, db.operations, db.conflicts, async () => {
    const prior = await readLocal<Dataset>('dataset');
    if (prior) await writeLocal('previous-dataset', prior);
    await db.entries.delete('sync');
    await db.entries.delete('heads');
    await db.entries.delete('sync-pause');
    await db.operations.clear();
    await db.conflicts.clear();
    await writeLocal('dataset', data);
    await writeLocal('last-import', nowISO());
  });
}
export async function disableSync() {
  await db.transaction('rw', db.entries, db.operations, async () => {
    await db.entries.delete('sync');
    await db.entries.delete('heads');
    await db.operations.clear();
  });
}
