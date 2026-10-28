import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { db, saveDataset, writeLocal, readDataset, type Operation } from '../src/data/store';
import { SyncEngine } from '../src/sync/client';
import type { SyncTransport } from '../src/sync/transport';
import { fixture } from './fixtures';
import { renamePlayer } from '../src/domain/actions';
beforeEach(async () => {
  await db.entries.clear();
  await db.operations.clear();
  await db.conflicts.clear();
  vi.useFakeTimers({
    toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
  });
  vi.stubGlobal('document', {
    visibilityState: 'visible',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.stubGlobal('navigator', { language: 'pt-PT' });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
async function pending() {
  const d = fixture();
  await saveDataset(d, null);
  await writeLocal('sync', {
    spaceId: 'test-space',
    deviceId: 'test-device',
    token: 'not-a-production-secret',
    cursor: 0,
  });
  const next = renamePlayer(d, d.players[0].id, 'NewName');
  await saveDataset(next, d);
  return next;
}
function transport(): SyncTransport {
  return {
    exchange: vi.fn(
      async (_credentials: unknown, request: { cursor: number; operations: Operation[] }) => ({
        changes: request.operations.map((operation, index) => ({
          operation,
          conflict: false,
          seq: index + 1,
        })),
        heads: Object.fromEntries(
          request.operations.map((operation) => [operation.key, operation.id]),
        ),
        cursor: request.operations.length,
        more: false,
      }),
    ),
    entity: vi.fn(),
    snapshot: vi.fn(),
  };
}
describe('Orçamento de chamadas e falhas', () => {
  it('AC28 AC73: a multi-page catch-up keeps cross-entity references consistent', async () => {
    const data = fixture();
    await saveDataset(data, null);
    await writeLocal('sync', {
      spaceId: 'test-space',
      deviceId: 'test-device',
      token: 'local-test-token',
      cursor: 0,
    });
    const player = {
      ...structuredClone(data.players[0]),
      id: crypto.randomUUID(),
      name: 'New player',
    };
    const week = structuredClone(data.weeks[0]);
    week.results[player.id] = { points: 900, observedName: player.name, collectionId: null };
    const op = (key: string, value: unknown): Operation => ({
      id: crypto.randomUUID(),
      key,
      base: null,
      value,
      revisions: [],
      at: new Date().toISOString(),
    });
    const first = op('player/' + player.id, player),
      score = op('week/' + week.id, week),
      last = op(first.key, { ...player, name: 'Updated player' });
    const t = transport();
    vi.mocked(t.exchange)
      .mockResolvedValueOnce({
        changes: [
          { operation: first, conflict: false, seq: 1 },
          { operation: score, conflict: false, seq: 2 },
        ],
        heads: { [first.key]: last.id, [score.key]: score.id },
        cursor: 2,
        more: true,
      })
      .mockResolvedValueOnce({
        changes: [{ operation: last, conflict: false, seq: 3 }],
        heads: { [first.key]: last.id },
        cursor: 3,
        more: false,
      });
    const engine = new SyncEngine(() => {}, t);
    await engine.run(true);
    const saved = await readDataset();
    expect(saved?.players.find((p) => p.id === player.id)?.name).toBe('Updated player');
    expect(saved?.weeks[0].results[player.id].points).toBe(900);
    expect(t.exchange).toHaveBeenCalledTimes(2);
    engine.stop();
  });
  it('AC73 AC74: transportes são substituíveis e 30 eventos de edição geram um envio após pausa', async () => {
    await pending();
    const t = transport(),
      engine = new SyncEngine(() => {}, t);
    for (let i = 0; i < 30; i++) engine.edited();
    await vi.advanceTimersByTimeAsync(4999);
    expect(t.exchange).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await vi.waitFor(() => expect(t.exchange).toHaveBeenCalledTimes(1));
    await vi.waitFor(async () => expect(await db.operations.count()).toBe(0));
    expect((await readDataset())?.players[0].name).toBe('NewName');
    engine.stop();
  });
  it('AC64 AC69 AC74: sem sincronização ativa não há pedidos, e em segundo plano também não', async () => {
    const t = transport(),
      engine = new SyncEngine(() => {}, t);
    await engine.run();
    expect(t.exchange).not.toHaveBeenCalled();
    await pending();
    Object.assign(document, { visibilityState: 'hidden' });
    engine.start();
    engine.edited();
    await vi.advanceTimersByTimeAsync(180000);
    expect(t.exchange).not.toHaveBeenCalled();
    engine.stop();
  });
  it('AC30 AC75: quota preserva pendentes e limita as tentativas', async () => {
    const next = await pending(),
      t = transport();
    vi.mocked(t.exchange).mockRejectedValue(new Error('Quota'));
    const engine = new SyncEngine(() => {}, t);
    await engine.run();
    await vi.advanceTimersByTimeAsync(15000);
    await vi.waitFor(() => expect(t.exchange).toHaveBeenCalledTimes(2));
    await vi.advanceTimersByTimeAsync(60000);
    await vi.waitFor(() => expect(t.exchange).toHaveBeenCalledTimes(3));
    await vi.advanceTimersByTimeAsync(3600000);
    expect(t.exchange).toHaveBeenCalledTimes(3);
    expect(await db.operations.count()).toBe(1);
    expect(await readDataset()).toEqual(next);
    engine.stop();
  });
});
