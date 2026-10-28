import { describe, it, expect } from 'vitest';
import { columnEdges, columnProposals } from '../src/ocr/columns';
import { mergeImageLines, imageRows, type Word } from '../src/ocr/rows';
const w = (text: string, x: number, y = 30): Word => ({
  text,
  confidence: 95,
  bbox: { x0: x, y0: y, x1: x + text.length * 10, y1: y + 20 },
});
const scoreRow = (name: string, total: string) =>
  imageRows([w(name, 20), w('0', 400), w(total, 600), w(total, 800)], crypto.randomUUID())[0];
describe('AC55 AC90: column reconstruction and duplicate observations', () => {
  it('infers score regions from coordinates instead of assuming a screenshot size', () => {
    const edges = columnEdges(
      [w('Alpha', 20), w('10', 400), w('100', 600), w('110', 800)],
      1000,
      3,
    );
    expect(edges).toHaveLength(5);
    expect(edges[1]).toBeGreaterThan(300);
    expect(edges[1]).toBeLessThan(400);
    expect(edges[4]).toBe(1000);
  });
  it('keeps zero, rejects inconsistent totals and ignores unrelated UI and cut-off rows', () => {
    const names = [
      w('Alpha', 20, 30),
      w('Beta', 20, 90),
      w('Gamma', 20, 150),
      w('UI', 20, 230),
      w('Clipped', 20, 0),
    ];
    const cube = [w('0', 400, 30), w('10', 400, 90), w('10', 400, 150), w('0', 400, 0)];
    const bounty = [w('0', 600, 30), w('200', 600, 90), w('200', 600, 150), w('0', 600, 0)];
    const total = [
      w('0', 800, 30),
      w('210', 800, 90),
      w('910', 800, 150),
      w('9', 800, 230),
      w('0', 800, 0),
    ];
    expect(
      columnProposals(names, [cube, bounty, total], 'image', 300).map((p) => [
        p.line.name,
        p.line.points,
      ]),
    ).toEqual([
      ['Alpha', 0],
      ['Beta', 210],
      ['Gamma', null],
    ]);
  });
  it('retains an unreadable total as missing instead of deriving a score from other columns', () => {
    expect(
      columnProposals([w('Alpha', 20)], [[w('10', 400)], [w('200', 600)], []], 'image', 300)[0].line
        .points,
    ).toBeNull();
  });
  it('shows one name for overlapping images, preserving both originals without adding points', () => {
    const rows = mergeImageLines([scoreRow('Alpha', '2700'), scoreRow('Alpha', '2700')]);
    expect(rows).toHaveLength(1);
    expect(rows[0].points).toBe(2700);
    expect(rows[0].sourceRows).toHaveLength(2);
    expect(rows[0].playerId).toBeNull();
  });
  it('requires a choice for different totals and never merges similar names', () => {
    const rows = mergeImageLines([
      scoreRow('Alpha', '2700'),
      scoreRow(' alpha ', '2900'),
      scoreRow('Alphaa', '2700'),
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      points: null,
      pointsConflict: true,
      state: 'pending',
      playerId: null,
    });
    expect(rows[0].sourceRows!.map((s) => s.points)).toEqual([2700, 2900]);
  });
  it('uses a complete observation when its overlap is unreadable, including real zero', () => {
    const incomplete = { ...scoreRow('Alpha', '0'), points: null };
    expect(mergeImageLines([incomplete, scoreRow('Alpha', '0')])[0]).toMatchObject({
      points: 0,
      pointsConflict: false,
    });
  });
});
