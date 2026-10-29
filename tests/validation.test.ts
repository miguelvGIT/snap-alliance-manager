import { it, expect } from 'vitest';
import { newDataset } from '../src/domain/model';
import {
  ensureWeek,
  addPlayer,
  validateWeek,
  saveCollection,
  makeCollection,
} from '../src/domain/actions';
const at = '2026-10-20T19:00:00.000Z';
it('AC27 AC85: empty weeks cannot be validated, including the incomplete option', () => {
  const data = ensureWeek(newDataset('Fictional'), at);
  for (const incomplete of [false, true])
    expect(() => validateWeek(data, at, incomplete)).toThrow('at least one recorded score');
  expect(data.weeks[0].status).toBe('draft');
});
it('AC14 AC27: a recorded zero can be validated and is never treated as an empty week', () => {
  const data = ensureWeek(addPlayer(newDataset('Fictional'), 'Alpha', '', at), at);
  const c = makeCollection('Alpha;0', null, true);
  c.lines[0].playerId = data.players[0].id;
  c.lines[0].state = 'confirmed';
  const next = validateWeek(saveCollection(data, at, c), at, false);
  expect(next.weeks[0].status).toBe('validated');
  expect(next.weeks[0].results[data.players[0].id].points).toBe(0);
});
it('AC07 AC85: a failed validation of an unsaved review does not validate an older empty week', () => {
  const data = ensureWeek(newDataset('Fictional'), at),
    c = makeCollection('Unknown;3100', null, true);
  expect(() => validateWeek(saveCollection(data, at, c), at, true)).toThrow('pending');
  expect(data.players).toHaveLength(0);
  expect(data.weeks[0].collections).toHaveLength(0);
  expect(data.weeks[0].status).toBe('draft');
});
it('AC19 AC94: revising a validated week allows an empty note and preserves the previous values', () => {
  let data = ensureWeek(addPlayer(newDataset('Fictional'), 'Alpha', '', at), at);
  const c = makeCollection('Alpha;1000', null, true);
  c.lines[0].playerId = data.players[0].id;
  c.lines[0].state = 'confirmed';
  data = validateWeek(saveCollection(data, at, c), at, false);
  const revised = structuredClone(c);
  revised.lines[0].points = 3100;
  const next = saveCollection(data, at, revised);
  expect(next.weeks[0].status).toBe('draft');
  expect(data.weeks[0].status).toBe('validated');
  const revision = next.revisions.at(-1)!;
  expect(revision.reason).toBe('Collection reviewed manually');
  expect(JSON.parse(revision.before).results[data.players[0].id].points).toBe(1000);
  expect(JSON.parse(revision.after).results[data.players[0].id].points).toBe(3100);
  expect(validateWeek(next, at, false).weeks[0].status).toBe('validated');
});
