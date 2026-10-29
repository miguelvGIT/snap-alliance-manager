import { z } from 'zod';
import { datasetSchema, newDataset, nowISO, type Dataset } from '../domain/model';
import { canonical, db, readLocal, writeLocal } from './store';
export type Disposition = 'archive' | 'delete';
export type AllianceTransition =
  | { kind: 'new'; name: string; minimum: number; goal: number; disposition: Disposition }
  | {
      kind: 'restore';
      archiveId: string;
      expectedArchive: AllianceArchive;
      disposition: Disposition;
    };
export const archiveSchema = z
  .object({
    kind: z.literal('snap-alliance-archive'),
    formatVersion: z.literal(1),
    id: z.string().min(1),
    archivedAt: z.string().datetime(),
    dataset: datasetSchema,
  })
  .refine(
    (value) => value.id === value.dataset.alliance.id,
    'Archive identity does not match its alliance',
  );
export type AllianceArchive = z.infer<typeof archiveSchema>;
const prefix = 'alliance-archive/';
export async function listAllianceArchives(): Promise<AllianceArchive[]> {
  const records = await db.entries.where('key').startsWith(prefix).toArray();
  return records
    .map((record) => archiveSchema.parse(record.value))
    .sort((a, b) => b.archivedAt.localeCompare(a.archivedAt));
}
async function removePreviousCopy(allianceId: string) {
  const previous = await readLocal<Dataset>('previous-dataset');
  if (previous?.alliance?.id === allianceId) await db.entries.delete('previous-dataset');
}
// The archive and active-dataset change share one transaction: a quota failure never falls back to deletion.
export async function transitionAlliance(
  expected: Dataset,
  request: AllianceTransition,
): Promise<Dataset> {
  datasetSchema.parse(expected);
  if (request.disposition !== 'archive' && request.disposition !== 'delete')
    throw new Error('Choose whether to archive or delete the current alliance.');
  return db.transaction('rw', db.entries, db.operations, db.conflicts, async () => {
    const stored = await readLocal<Dataset>('dataset');
    if (!stored || canonical(stored) !== canonical(expected))
      throw new Error(
        'Saved data changed in another tab or some edits are unsaved. Export pending changes and reopen Settings before switching.',
      );
    let next: Dataset;
    if (request.kind === 'restore') {
      const raw = await readLocal(prefix + request.archiveId);
      if (!raw) throw new Error('This archive is no longer available. Refresh Settings.');
      if (
        request.expectedArchive.id !== request.archiveId ||
        canonical(raw) !== canonical(request.expectedArchive)
      )
        throw new Error(
          'This archive changed in another tab. Refresh Settings before restoring it.',
        );
      next = archiveSchema.parse(raw).dataset;
    } else {
      next = newDataset(request.name, request.minimum, request.goal);
      next.preferences = { ...expected.preferences };
    }
    if (next.alliance.id === stored.alliance.id)
      throw new Error('This alliance is already active.');
    if (request.disposition === 'archive')
      await writeLocal(
        prefix + stored.alliance.id,
        archiveSchema.parse({
          kind: 'snap-alliance-archive',
          formatVersion: 1,
          id: stored.alliance.id,
          archivedAt: nowISO(),
          dataset: stored,
        }),
      );
    else await db.entries.delete(prefix + stored.alliance.id);
    if (request.disposition === 'delete') await removePreviousCopy(stored.alliance.id);
    if (request.kind === 'restore') await db.entries.delete(prefix + request.archiveId);
    await db.entries.bulkDelete([
      'sync',
      'heads',
      'sync-pause',
      'operation-order',
      'last-sync',
      'last-sync-check',
      'last-import',
      'last-export',
    ]);
    await db.operations.clear();
    await db.conflicts.clear();
    await writeLocal('dataset', datasetSchema.parse(next));
    return next;
  });
}
export async function deleteAllianceArchive(expected: AllianceArchive) {
  await db.transaction('rw', db.entries, async () => {
    const key = prefix + expected.id,
      stored = await readLocal(key);
    if (!stored || canonical(stored) !== canonical(expected))
      throw new Error('This archive changed or was restored in another tab. Refresh Settings.');
    await db.entries.delete(key);
    const active = await readLocal<Dataset>('dataset');
    if (active?.alliance.id !== expected.id) await removePreviousCopy(expected.id);
  });
}
