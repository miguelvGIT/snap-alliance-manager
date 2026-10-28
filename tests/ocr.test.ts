import { describe, it, expect } from 'vitest';
import { imageRows, imageCollection, type Word, type ImageInput } from '../src/ocr/rows';
import { fixture } from './fixtures';
import { saveCollection, ensureWeek } from '../src/domain/actions';
import { exportBackup, readBackup } from '../src/domain/transfer';
const word = (text: string, x: number, y = 30, confidence = 95): Word => ({
  text,
  confidence,
  bbox: { x0: x, x1: x + text.length * 10, y0: y, y1: y + 20 },
});
const row = (name: string, total: string, y = 30) => [
  word(name, 20, y),
  word('100', 400, y),
  word('200', 600, y),
  word(total, 800, y),
];
describe('AC55 AC90: local image proposals', () => {
  it('reconstructs columns emitted as separate blocks and reads total, including zero', () => {
    const words = [...row('Ana', '2,700'), ...row('Bruno', '0', 90)].reverse();
    expect(imageRows(words, 'image-1').map((l) => [l.name, l.points, l.playerId, l.state])).toEqual(
      [
        ['Ana', 2700, null, 'pending'],
        ['Bruno', 0, null, 'pending'],
      ],
    );
  });
  it('retains numeric name suffixes and supports cropped name/total screenshots', () => {
    expect(
      imageRows(
        [word('Player', 20), word('42', 100), word('0', 400), word('20', 600), word('20', 800)],
        'i',
      )[0],
    ).toMatchObject({ name: 'Player 42', points: 20 });
    expect(imageRows([word('Ana', 20), word('3.000', 800)], 'i', 1)[0].points).toBe(3000);
  });
  it('does not interpret negatives, fractions or missing columns as zero', () => {
    for (const invalid of ['-5', '2.7', '+5', '2,7OO'])
      expect(imageRows(row('Ana', invalid), 'i')[0].points).toBeNull();
    expect(imageRows([word('Ana', 20), word('2700', 800)], 'i')[0]).toMatchObject({ points: null });
  });
  it('keeps confidence and source per row without deduplicating names or adding totals', () => {
    const a = imageRows(row('Ana', '2700'), 'a');
    const b = imageRows(
      row('Ana', '2900').map((w) => ({ ...w, confidence: 60 })),
      'b',
    );
    expect([...a, ...b]).toHaveLength(2);
    expect(b[0]).toMatchObject({
      observationId: 'b',
      ocrConfidence: 60,
      points: 2900,
      state: 'pending',
    });
  });
  it('preserves unknown upload times and automatic frame times through backup and rejects conflicting overlaps', () => {
    const images = [
      { id: 'a', name: 'pasted.png', source: 'clipboard', observedAt: null, timeSource: 'unknown' },
      {
        id: 'b',
        name: 'frame.png',
        source: 'screen',
        observedAt: '2026-10-27T18:58:00.000Z',
        timeSource: 'automatic',
      },
    ] as ImageInput[];
    const collection = imageCollection(images, [
      ...imageRows(row('Ana', '2700'), 'a'),
      ...imageRows(row('Ana', '2900'), 'b'),
    ]);
    expect(collection.complete).toBe(false);
    let data = ensureWeek(fixture(), '2026-10-27T18:58:00Z');
    const weekId = '2026-10-20T19:00:00.000Z';
    const playerId = data.players.find((p) => p.name === 'Ana')!.id;
    collection.lines.forEach((l) => {
      l.playerId = playerId;
      l.state = 'confirmed';
    });
    expect(() =>
      saveCollection(data, weekId, collection, { reason: 'Image review', allowReplacement: true }),
    ).toThrow('Choose the total');
    expect(collection.lines).toHaveLength(1);
    expect(collection.lines[0].sourceRows).toHaveLength(2);
    collection.lines[0].points = 2900;
    collection.lines[0].pointsConflict = false;
    data = saveCollection(data, weekId, collection, {
      reason: 'Image review',
      allowReplacement: true,
    });
    const restored = readBackup(exportBackup(data)).dataset;
    expect(restored.weeks.find((w) => w.id === weekId)!.collections.at(-1)!.observations).toEqual(
      collection.observations,
    );
    expect(restored.weeks.find((w) => w.id === weekId)!.results[playerId].points).toBe(2900);
    expect(
      restored.weeks.find((w) => w.id === weekId)!.collections.at(-1)!.lines[0].sourceRows,
    ).toHaveLength(2);
  });
});
