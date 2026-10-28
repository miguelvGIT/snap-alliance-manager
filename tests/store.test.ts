import 'fake-indexeddb/auto';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import {
  db,
  saveDataset,
  readDataset,
  replaceDataset,
  readLocal,
  writeLocal,
} from '../src/data/store';
import { fixture } from './fixtures';
import { renamePlayer } from '../src/domain/actions';
beforeEach(async () => {
  await db.entries.clear();
  await db.operations.clear();
  await db.conflicts.clear();
});
describe('Persistência e conservação', () => {
  it('AC37: quota de armazenamento aborta a gravação inteira e mantém a versão anterior', async () => {
    const original = fixture();
    await saveDataset(original, null);
    const put = vi
      .spyOn(db.entries, 'put')
      .mockRejectedValueOnce(new DOMException('Out of storage', 'QuotaExceededError'));
    await expect(
      saveDataset(renamePlayer(original, original.players[0].id, 'Unsaved'), original),
    ).rejects.toThrow();
    put.mockRestore();
    expect(await readDataset()).toEqual(original);
    expect(await db.operations.count()).toBe(0);
  });
  it('AC38: um formato incompatível é preservado e só uma importação confirmada o substitui', async () => {
    const unknown = { formatVersion: 99, original: 'preservar' };
    await writeLocal('dataset', unknown);
    await expect(readDataset()).rejects.toThrow();
    await expect(saveDataset(fixture(), null)).rejects.toThrow(/already exists/);
    expect(await readLocal('dataset')).toEqual(unknown);
    const imported = fixture();
    await replaceDataset(imported);
    expect(await readDataset()).toEqual(imported);
    expect(await readLocal('previous-dataset')).toEqual(unknown);
  });
  it('AC01 AC58 AC64: grava e reabre dados locais sem conta ou serviço', async () => {
    const d = fixture();
    await saveDataset(d, null);
    expect(await readDataset()).toEqual(d);
    expect(await db.operations.count()).toBe(0);
  });
  it('AC36 AC72: substituição é atómica e não ativa sincronização', async () => {
    const original = fixture();
    await saveDataset(original, null);
    await writeLocal('sync', { spaceId: 'private', token: 'secret' });
    const imported = fixture();
    await replaceDataset(imported);
    expect(await readDataset()).toEqual(imported);
    expect(await readLocal('previous-dataset')).toEqual(original);
    expect(await readLocal('sync')).toBeUndefined();
  });
  it('AC32 AC73: alterações encadeiam revisões num outbox local ordenado', async () => {
    const d = fixture();
    await saveDataset(d, null);
    await writeLocal('sync', { spaceId: 'private', deviceId: 'd', token: 'secret', cursor: 0 });
    const one = renamePlayer(d, d.players[0].id, 'FirstName');
    await saveDataset(one, d);
    const two = renamePlayer(one, d.players[0].id, 'SecondName');
    await saveDataset(two, one);
    const ops = (await db.operations.toArray()).sort((a, b) => a.order! - b.order!);
    expect(ops).toHaveLength(2);
    expect(ops[1].base).toBe(ops[0].id);
    expect(ops[1].order).toBeGreaterThan(ops[0].order!);
  });
  it('AC37: uma escrita de outra janela não é apagada por uma cópia desatualizada', async () => {
    const d = fixture();
    await saveDataset(d, null);
    const first = renamePlayer(d, d.players[0].id, 'FirstName');
    await saveDataset(first, d);
    await expect(saveDataset(renamePlayer(d, d.players[0].id, 'SecondName'), d)).rejects.toThrow(
      /another window/,
    );
    expect((await readDataset())?.players[0].name).toBe('FirstName');
  });
});
