import 'fake-indexeddb/auto';
import { beforeEach, it, expect, vi } from 'vitest';
import { db, saveDataset, readDataset, readLocal, writeLocal } from '../src/data/store';
import {
  transitionAlliance,
  listAllianceArchives,
  deleteAllianceArchive,
} from '../src/data/alliances';
import { fixture } from './fixtures';
import { newDataset } from '../src/domain/model';
import { renamePlayer } from '../src/domain/actions';
const fresh = (name = 'Second alliance', disposition: 'archive' | 'delete' = 'archive') => ({
  kind: 'new' as const,
  name,
  minimum: 3000,
  goal: 80000,
  disposition,
});
beforeEach(async () => {
  vi.restoreAllMocks();
  await db.entries.clear();
  await db.operations.clear();
  await db.conflicts.clear();
});
it('AC91 AC92: archives the full alliance while starting with new IDs and no mixed records', async () => {
  const first = fixture();
  await saveDataset(first, null);
  const next = await transitionAlliance(first, fresh());
  const archives = await listAllianceArchives();
  expect(archives).toHaveLength(1);
  expect(archives[0].dataset).toEqual(first);
  expect(next.alliance.id).not.toBe(first.alliance.id);
  expect(next.id).not.toBe(first.id);
  expect(next.alliance.name).toBe('Second alliance');
  expect(next.alliance.minimum).toBe(3000);
  expect(next.players).toEqual([]);
  expect(next.weeks).toEqual([]);
  expect(next.revisions).toEqual([]);
  expect(next.preferences).toEqual(first.preferences);
  expect(await readDataset()).toEqual(next);
});
it('AC91 AC93: deleting clears old recovery/sync data but preserves other archives and device reminders', async () => {
  const a = fixture();
  await saveDataset(a, null);
  const b = await transitionAlliance(a, fresh());
  const bCopy = {
    kind: 'snap-alliance-archive',
    formatVersion: 1,
    id: b.alliance.id,
    archivedAt: new Date().toISOString(),
    dataset: b,
  };
  await writeLocal('alliance-archive/' + b.alliance.id, bCopy);
  await writeLocal('previous-dataset', b);
  await writeLocal('sync', { token: 'fictional-device-secret' });
  await writeLocal('heads', { alliance: 'old' });
  await writeLocal('reminder', { id: 'device-only', token: 'private' });
  await writeLocal('reminder-command', { kind: 'disable' });
  await db.operations.put({
    id: 'old',
    key: 'alliance',
    base: null,
    value: b,
    revisions: [],
    at: new Date().toISOString(),
  });
  await db.conflicts.put({
    id: 'old',
    key: 'alliance',
    local: {
      id: 'old',
      key: 'alliance',
      base: null,
      value: b,
      revisions: [],
      at: new Date().toISOString(),
    },
    remote: b,
    remoteHead: 'old',
  });
  const c = await transitionAlliance(b, fresh('Third alliance', 'delete'));
  expect((await listAllianceArchives()).map((r) => r.dataset.alliance.id)).toEqual([a.alliance.id]);
  expect(await readLocal('previous-dataset')).toBeUndefined();
  expect(await readLocal('sync')).toBeUndefined();
  expect(await readLocal('heads')).toBeUndefined();
  expect(await db.operations.count()).toBe(0);
  expect(await db.conflicts.count()).toBe(0);
  expect(await readLocal('reminder')).toEqual({ id: 'device-only', token: 'private' });
  expect(await readLocal('reminder-command')).toEqual({ kind: 'disable' });
  expect(await readDataset()).toEqual(c);
  expect(JSON.stringify(await listAllianceArchives())).not.toContain('fictional-device-secret');
});
it('AC92: restores exact identities, history and reasons while applying the current-alliance choice', async () => {
  const a = fixture();
  await saveDataset(a, null);
  const b = await transitionAlliance(a, fresh());
  const [archivedA] = await listAllianceArchives();
  const restored = await transitionAlliance(b, {
    kind: 'restore',
    archiveId: archivedA.id,
    expectedArchive: archivedA,
    disposition: 'archive',
  });
  expect(restored).toEqual(a);
  const [archivedB] = await listAllianceArchives();
  expect(archivedB.dataset).toEqual(b);
  expect(
    await transitionAlliance(a, {
      kind: 'restore',
      archiveId: archivedB.id,
      expectedArchive: archivedB,
      disposition: 'delete',
    }),
  ).toEqual(b);
  expect(await listAllianceArchives()).toEqual([]);
});
it('AC93: stale tabs cannot archive, delete, or resurrect the previous active alliance', async () => {
  const a = fixture();
  await saveDataset(a, null);
  const b = await transitionAlliance(a, fresh());
  await expect(transitionAlliance(a, fresh('Stale', 'delete'))).rejects.toThrow('another tab');
  await expect(saveDataset(renamePlayer(a, a.players[0].id, 'StaleName'), a)).rejects.toThrow(
    'another window',
  );
  expect(await readDataset()).toEqual(b);
  expect((await listAllianceArchives())[0].dataset).toEqual(a);
});
it('AC93: storage failures roll back an archive and preserve the active dataset', async () => {
  const a = fixture();
  await saveDataset(a, null);
  await writeLocal('previous-dataset', a);
  const fail = vi
    .spyOn(db.entries, 'bulkDelete')
    .mockRejectedValueOnce(new DOMException('Storage failed', 'QuotaExceededError'));
  try {
    await expect(transitionAlliance(a, fresh())).rejects.toThrow();
  } finally {
    fail.mockRestore();
  }
  expect(await readDataset()).toEqual(a);
  expect(await listAllianceArchives()).toEqual([]);
  expect(await readLocal('previous-dataset')).toEqual(a);
});
it('AC92 AC93: deleting an archive does not touch the active alliance or other copies', async () => {
  const a = fixture();
  await saveDataset(a, null);
  const b = await transitionAlliance(a, fresh());
  const c = await transitionAlliance(b, fresh('Third'));
  const archives = await listAllianceArchives();
  const target = archives.find((r) => r.id === a.alliance.id)!;
  await writeLocal('previous-dataset', a);
  await deleteAllianceArchive(target);
  expect(await readDataset()).toEqual(c);
  expect((await listAllianceArchives()).map((r) => r.id)).toEqual([b.alliance.id]);
  expect(await readLocal('previous-dataset')).toBeUndefined();
});
it('AC93: changed archive confirmations and invalid targets cannot replace active data', async () => {
  const a = fixture();
  await saveDataset(a, null);
  const b = await transitionAlliance(a, fresh());
  const [archive] = await listAllianceArchives();
  const updated = { ...archive, archivedAt: '2026-10-29T16:00:00.000Z' };
  await writeLocal('alliance-archive/' + archive.id, updated);
  await expect(
    transitionAlliance(b, {
      kind: 'restore',
      archiveId: archive.id,
      expectedArchive: archive,
      disposition: 'delete',
    }),
  ).rejects.toThrow('archive changed');
  await expect(deleteAllianceArchive(archive)).rejects.toThrow('changed');
  await expect(transitionAlliance(b, fresh('', 'delete'))).rejects.toThrow();
  expect(await readDataset()).toEqual(b);
  expect(await listAllianceArchives()).toEqual([updated]);
});
it('AC93: ordinary saves cannot bypass the confirmed alliance-change operation', async () => {
  const a = fixture();
  await saveDataset(a, null);
  await expect(saveDataset(newDataset('Other'), a)).rejects.toThrow('Change alliance');
  expect(await readDataset()).toEqual(a);
});
it('AC92 AC93: archiving keeps an existing recovery copy until that alliance is explicitly deleted', async () => {
  const a = fixture();
  await saveDataset(a, null);
  const previous = renamePlayer(a, a.players[0].id, 'PreviousName');
  await writeLocal('previous-dataset', previous);
  await transitionAlliance(a, fresh());
  expect(await readLocal('previous-dataset')).toEqual(previous);
  await deleteAllianceArchive((await listAllianceArchives())[0]);
  expect(await readLocal('previous-dataset')).toBeUndefined();
  expect((await readDataset())?.alliance.name).toBe('Second alliance');
});
