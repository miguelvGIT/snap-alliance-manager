import { newDataset, uuid, type Dataset, type Player } from '../src/domain/model';
import { weekBounds } from '../src/domain/weeks';
export const clock = Date.parse('2026-10-27T19:01:00Z');
export function fixture(): Dataset {
  const data = newDataset('Test alliance');
  data.preferences = { locale: 'pt-PT', timeZone: 'Europe/Lisbon', leadMinutes: 30 };
  const names = ['Ana', 'Bruno', 'Carla', 'Duarte', 'Eva'];
  data.players = names.map((name, index): Player => ({
    id: uuid(),
    name,
    social: index === 0 ? 'ana.discord' : '',
    aliases: [],
    memberships: [
      {
        id: uuid(),
        joinedAt: name === 'Bruno' ? '2026-10-01T12:00:00.000Z' : '2026-09-01T12:00:00.000Z',
        leftAt: null,
      },
    ],
  }));
  const values: (number | null)[][] = [
    [4000, 2000, 3000, 1000],
    [400, 2800, 0, 2700],
    [null, 2700, 2600, 2900],
    [1000, 2000, 2700, 3000],
    [null, null, null, null],
  ];
  data.weeks = [
    '2026-09-29T19:00:00.000Z',
    '2026-10-06T19:00:00.000Z',
    '2026-10-13T19:00:00.000Z',
    '2026-10-20T19:00:00.000Z',
  ].map((start, index) => ({
    ...weekBounds(start),
    minimum: 2700,
    goal: 80000,
    status: 'validated',
    incomplete: index === 0,
    results: Object.fromEntries(
      data.players.map((p, j) => [
        p.id,
        { points: values[j][index], observedName: p.name, collectionId: null },
      ]),
    ),
    collections: [],
    exemptions:
      index === 3
        ? {
            [data.players[0].id]: {
              kind: 'manual',
              reason: 'Holiday',
              createdAt: '2026-10-27T18:00:00.000Z',
            },
          }
        : {},
  }));
  return data;
}
