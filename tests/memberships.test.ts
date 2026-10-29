import { expect, it } from 'vitest';
import { recordDeparture, recordRejoining, ensureWeek } from '../src/domain/actions';
import { expectedPlayers, metrics } from '../src/domain/metrics';
import { exportBackup, readBackup } from '../src/domain/transfer';
import { fixture } from './fixtures';
const left = '2026-10-28T12:00:00.000Z';
const returned = '2026-10-29T12:00:00.000Z';

it('AC96: departure requires a reason and a valid date without changing the original', () => {
  const data = fixture(),
    id = data.players[0].id;
  for (const reason of ['', '   '])
    expect(() => recordDeparture(data, id, left, reason)).toThrow('reason for leaving');
  expect(() => recordDeparture(data, id, 'invalid', 'Agreed departure')).toThrow('valid departure');
  expect(() => recordDeparture(data, id, '2026-08-01T00:00:00Z', 'Agreed departure')).toThrow(
    'before the joining',
  );
  expect(data.players[0].memberships[0].leftAt).toBeNull();
  expect(data.revisions).toEqual([]);
});
it('AC25 AC96: departure preserves identity, historical scores and metrics and ends future participation', () => {
  const data = fixture(),
    id = data.players[0].id;
  const next = recordDeparture(data, id, left, '  Agreed departure  ');
  expect(next.players[0]).toMatchObject({
    id,
    social: 'ana.discord',
    memberships: [{ leftAt: left, departureReason: 'Agreed departure' }],
  });
  expect(next.weeks).toEqual(data.weeks);
  expect(metrics(next, next.players[0], Date.parse(returned))).toEqual(
    metrics(data, data.players[0], Date.parse(returned)),
  );
  const future = ensureWeek(next, '2026-11-03T19:00:00Z').weeks.at(-1)!;
  expect(expectedPlayers(next, future).some((p) => p.id === id)).toBe(false);
  const revision = next.revisions.at(-1)!;
  expect(JSON.parse(revision.before).memberships[0].leftAt).toBeNull();
  expect(JSON.parse(revision.after).memberships[0].departureReason).toBe('Agreed departure');
});
it('AC25 AC96: rejoining retains each departure reason under the same player ID', () => {
  const original = fixture(),
    id = original.players[0].id;
  let data = recordRejoining(recordDeparture(original, id, left, 'First departure'), id, returned);
  expect(data.players[0].memberships).toHaveLength(2);
  expect(data.players[0].memberships[0].departureReason).toBe('First departure');
  expect(data.players[0].memberships[1]).toMatchObject({ joinedAt: returned, leftAt: null });
  expect(data.players[0].memberships[1].departureReason).toBeUndefined();
  data = recordDeparture(data, id, '2026-10-30T12:00:00Z', 'Second departure');
  expect(data.players[0].memberships.map((m) => m.departureReason)).toEqual([
    'First departure',
    'Second departure',
  ]);
  expect(data.players.map((p) => p.id)).toEqual(original.players.map((p) => p.id));
  expect(data.weeks).toEqual(original.weeks);
});
it('AC96: repeated or overlapping membership changes are rejected', () => {
  const data = fixture(),
    id = data.players[0].id;
  expect(() => recordRejoining(data, id, returned)).toThrow('already in the active roster');
  const departed = recordDeparture(data, id, left, 'Agreed departure');
  expect(() => recordDeparture(departed, id, left, 'Duplicate')).toThrow(
    'no longer in the active roster',
  );
  expect(() => recordRejoining(departed, id, '2026-10-27T12:00:00Z')).toThrow(
    'before the last departure',
  );
  expect(() => recordDeparture(data, 'missing', left, 'Absent')).toThrow(
    'no longer in the active roster',
  );
});
it('AC35 AC96: backups retain departure reasons and accept legacy departures without inventing one', () => {
  const legacy = fixture();
  legacy.players[0].memberships[0].leftAt = left;
  expect(readBackup(exportBackup(legacy)).dataset).toEqual(legacy);
  expect(
    readBackup(exportBackup(legacy)).dataset.players[0].memberships[0].departureReason,
  ).toBeUndefined();
  const original = fixture();
  const data = recordDeparture(original, original.players[0].id, left, 'Agreed departure');
  expect(readBackup(exportBackup(data)).dataset).toEqual(data);
});
