import {
  datasetSchema,
  uuid,
  nowISO,
  type Dataset,
  type Player,
  type Week,
  type Collection,
} from './model';
import { weekBounds } from './weeks';
import { expectedPlayers, partialEntry } from './metrics';
export function change(
  data: Dataset,
  entity: string,
  reason: string,
  edit: (draft: Dataset) => void,
): Dataset {
  const draft = structuredClone(data);
  edit(draft);
  draft.updatedAt = nowISO();
  draft.revisions.push({
    id: uuid(),
    entity,
    at: draft.updatedAt,
    reason,
    before: JSON.stringify(dataEntity(data, entity)),
    after: JSON.stringify(dataEntity(draft, entity)),
  });
  return datasetSchema.parse(draft);
}
export function dataEntity(data: Dataset, key: string): unknown {
  const [kind, ...tail] = key.split('/');
  const id = tail.join('/');
  if (kind === 'player') return data.players.find((p) => p.id === id) ?? null;
  if (kind === 'week') return data.weeks.find((w) => w.id === id) ?? null;
  if (kind === 'alliance') return data.alliance;
  if (kind === 'preferences') return data.preferences;
  return null;
}
export function putEntity(data: Dataset, key: string, value: unknown) {
  const [kind, ...tail] = key.split('/');
  const id = tail.join('/');
  if (kind === 'player') {
    const index = data.players.findIndex((p) => p.id === id);
    if (index < 0) data.players.push(value as Player);
    else data.players[index] = value as Player;
  } else if (kind === 'week') {
    const index = data.weeks.findIndex((w) => w.id === id);
    if (index < 0) data.weeks.push(value as Week);
    else data.weeks[index] = value as Week;
  } else if (kind === 'alliance') data.alliance = value as Dataset['alliance'];
  else if (kind === 'preferences') data.preferences = value as Dataset['preferences'];
  else throw new Error('Unknown change type.');
}
export function addPlayer(
  data: Dataset,
  name: string,
  social: string,
  joinedAt: string,
  id: string = uuid(),
) {
  return change(data, 'player/' + id, 'Player added', (draft) => {
    draft.players.push({
      id,
      name: name.trim(),
      social,
      aliases: [],
      memberships: [{ id: uuid(), joinedAt, leftAt: null }],
    });
  });
}
export function renamePlayer(data: Dataset, id: string, name: string, social?: string) {
  return change(data, 'player/' + id, 'Name or contact updated manually', (draft) => {
    const player = draft.players.find((p) => p.id === id)!;
    if (name.trim() !== player.name) {
      player.aliases.push({ name: player.name, changedAt: nowISO() });
      player.name = name.trim();
    }
    if (social !== undefined) player.social = social;
  });
}
export function ensureWeek(data: Dataset, at: string): Dataset {
  const bounds = weekBounds(at);
  if (data.weeks.some((w) => w.id === bounds.id)) return data;
  return change(data, 'week/' + bounds.id, 'Week added', (draft) => {
    draft.weeks.push({
      ...bounds,
      minimum: draft.alliance.minimum,
      goal: draft.alliance.goal,
      status: 'draft',
      incomplete: false,
      results: {},
      exemptions: {},
      collections: [],
    });
  });
}
export function parseRows(text: string) {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((raw) => {
      const columns = raw.split(/\t|;/);
      let name: string, score: string;
      if (columns.length >= 2) {
        name = columns[0].trim();
        score = columns[columns.length - 1].trim();
      } else {
        const match = raw.match(/^(.*?)\s+(-?[\d .,_]+)$/);
        name = (match?.[1] ?? raw).trim();
        score = match?.[2] ?? '';
      }
      const cleaned = score.replace(/[ .,_\u00a0]/g, '');
      const valid = /^\d+$/.test(score) || /^\d{1,3}(?:[ .,_\u00a0]\d{3})+$/.test(score);
      const parsed = valid ? Number(cleaned) : null;
      return {
        id: uuid(),
        name,
        points: parsed !== null && Number.isSafeInteger(parsed) ? parsed : null,
        rawPoints: score,
        playerId: null,
        state: 'pending' as const,
      };
    });
}
export function makeCollection(
  text: string,
  observedAt: string | null,
  complete: boolean,
): Collection {
  return {
    id: uuid(),
    observedAt,
    timeSource: observedAt ? 'manual' : 'unknown',
    createdAt: nowISO(),
    complete,
    lines: parseRows(text),
  };
}
export function nameReview(data: Dataset, week: Week, collection: Collection) {
  const times = collection.observations?.map((o) => o.observedAt) ?? [collection.observedAt];
  const expected = [
    ...new Map(
      times.flatMap((time) => expectedPlayers(data, week, time)).map((p) => [p.id, p]),
    ).values(),
  ];
  const confirmed = new Set(
    collection.lines.filter((line) => line.state === 'confirmed').map((line) => line.playerId),
  );
  const names = new Set(collection.lines.map((line) => line.name));
  return {
    missing: expected.filter((p) => !names.has(p.name) && !confirmed.has(p.id)),
    unknown: collection.lines.filter(
      (line) => line.state === 'pending' && !data.players.some((p) => p.name === line.name),
    ),
    candidates: (name: string) =>
      data.players.filter((p) => p.name === name || p.aliases.some((alias) => alias.name === name)),
  };
}
export function saveCollection(
  data: Dataset,
  weekId: string,
  collection: Collection,
  options: { reason?: string; allowReplacement?: boolean } = {},
) {
  return change(
    data,
    'week/' + weekId,
    options.reason?.trim() || 'Collection reviewed manually',
    (draft) => {
      const week = draft.weeks.find((w) => w.id === weekId)!;
      const seen = new Map<string, number | null>();
      if (collection.lines.some((line) => line.state === 'confirmed' && line.pointsConflict))
        throw new Error(
          'Choose the total for each name with different scores in the images before assigning it.',
        );
      for (const line of collection.lines)
        if (line.state === 'confirmed' && line.playerId) {
          if (seen.has(line.playerId) && seen.get(line.playerId) !== line.points)
            throw new Error(
              'Two rows have different points for the same player. Exclude the row that should not be assessed.',
            );
          seen.set(line.playerId, line.points);
        }
      if (week.status === 'validated' && !options.reason?.trim())
        throw new Error('Enter a reason for revising this validated week.');
      const index = week.collections.findIndex((c) => c.id === collection.id);
      if (index < 0) week.collections.push(collection);
      else week.collections[index] = collection;
      for (const [playerId, result] of Object.entries(week.results))
        if (result.collectionId === collection.id) delete week.results[playerId];
      for (const line of collection.lines)
        if (line.state === 'confirmed' && line.playerId) {
          const existing = week.results[line.playerId];
          if (
            existing &&
            existing.collectionId !== collection.id &&
            existing.points !== line.points &&
            !options.allowReplacement
          )
            throw new Error(
              'Different points are already saved for this player. Review the values and confirm their replacement.',
            );
          week.results[line.playerId] = {
            points: line.points,
            observedName: line.name,
            collectionId: collection.id,
          };
        }
      week.status = 'draft';
    },
  );
}
export function validateWeek(data: Dataset, weekId: string, allowIncomplete: boolean) {
  return change(
    data,
    'week/' + weekId,
    'Week validated' + (allowIncomplete ? ' as incomplete' : ''),
    (draft) => {
      const week = draft.weeks.find((w) => w.id === weekId)!;
      if (week.collections.some((c) => c.lines.some((line) => line.state === 'pending')))
        throw new Error('Resolve or explicitly exclude pending rows before validating.');
      const missing = expectedPlayers(draft, week).some((p) => week.results[p.id]?.points == null);
      const incomplete =
        missing ||
        week.collections.some(
          (c) => !c.complete || c.lines.some((line) => line.state === 'excluded'),
        );
      if (incomplete && !allowIncomplete)
        throw new Error('Some data is missing. Confirm validation as an incomplete week.');
      week.incomplete = incomplete;
      week.status = 'validated';
      for (const player of draft.players)
        if (partialEntry(player, week) && week.exemptions[player.id]?.kind !== 'manual') {
          week.exemptions[player.id] = {
            kind: 'partial-entry',
            reason: 'Joined during the week',
            createdAt: nowISO(),
          };
        }
    },
  );
}
export function exempt(data: Dataset, weekId: string, playerId: string, reason: string | null) {
  if (reason !== null && !reason.trim()) throw new Error('Enter the reason for the exemption.');
  return change(
    data,
    'week/' + weekId,
    reason === null ? 'Exemption removed' : reason!,
    (draft) => {
      const week = draft.weeks.find((w) => w.id === weekId)!;
      if (reason === null) delete week.exemptions[playerId];
      else
        week.exemptions[playerId] = { kind: 'manual', reason: reason.trim(), createdAt: nowISO() };
    },
  );
}
