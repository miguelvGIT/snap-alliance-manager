import { uuid, type Line } from '../domain/model';
import { type Word, parseScore } from './rows';
const center = (w: Word) => (w.bbox.y0 + w.bbox.y1) / 2;
export function wordRows(words: Word[]): Word[][] {
  const rows: Word[][] = [];
  for (const word of words.filter((w) => w.text.trim()).sort((a, b) => center(a) - center(b))) {
    const row = rows.find(
      (r) =>
        Math.abs(center(r[0]) - center(word)) <= Math.max(5, (r[0].bbox.y1 - r[0].bbox.y0) * 0.6),
    );
    if (row) row.push(word);
    else rows.push([word]);
  }
  return rows.map((row) => row.sort((a, b) => a.bbox.x0 - b.bbox.x0));
}
const median = (values: number[]) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
// Infer column boundaries from aligned score triplets, not a particular screenshot's pixels.
export function columnEdges(words: Word[], width: number, columns: number): number[] {
  const centers: number[][] = Array.from({ length: columns }, () => []);
  for (const row of wordRows(words)) {
    const tail = row.slice(-columns);
    if (
      row.length <= columns ||
      tail.some((w) => !/^[\dOolI][\d,.OolI]*$/.test(w.text)) ||
      tail[0].bbox.x0 < width * 0.32
    )
      continue;
    if (tail.some((w, i) => i && w.bbox.x0 - tail[i - 1].bbox.x1 < width * 0.025)) continue;
    tail.forEach((word, i) => centers[i].push((word.bbox.x0 + word.bbox.x1) / 2));
  }
  if (!centers[0].length)
    return columns === 3
      ? [0, 0.49, 0.65, 0.84, 1].map((x) => Math.round(x * width))
      : [0, Math.round(width * 0.7), width];
  const positions = centers.map(median);
  const first =
    columns > 1 ? positions[0] - (positions[1] - positions[0]) * 0.46 : positions[0] - width * 0.18;
  return [
    0,
    Math.max(width * 0.3, first),
    ...positions.slice(1).map((p, i) => (p + positions[i]) / 2),
    width,
  ].map(Math.round);
}
export function columnProposals(
  names: Word[],
  scores: Word[][],
  observationId: string,
  height: number,
): { line: Line; top: number; bottom: number; values: (number | null)[] }[] {
  const numeric = scores.map(wordRows);
  const lines: { line: Line; top: number; bottom: number; values: (number | null)[] }[] = [];
  for (const words of wordRows(names)) {
    const name = words
      .map((w) => w.text)
      .join(' ')
      .replace(/^[\u2605\u2606\u2726\u22c6*~|\s]+/u, '')
      .trim();
    if (!/[\p{L}\p{N}]/u.test(name)) continue;
    const y = median(words.map(center));
    const h = median(words.map((w) => w.bbox.y1 - w.bbox.y0));
    const matches = numeric.map(
      (rows) =>
        rows
          .filter(
            (row) =>
              Math.abs(median(row.map(center)) - y) <=
              Math.max(h, median(row.map((w) => w.bbox.y1 - w.bbox.y0))) * 0.65,
          )
          .sort((a, b) => Math.abs(center(a[0]) - y) - Math.abs(center(b[0]) - y))[0],
    );
    if (matches.filter(Boolean).length < Math.min(2, scores.length)) continue;
    const raw = matches.map((row) => row?.map((w) => w.text).join('') ?? '');
    const values = raw.map(parseScore);
    const total = values.at(-1) ?? null;
    const cut = words.some((w) => w.bbox.y0 <= 1 || w.bbox.y1 >= height - 1);
    if (cut) continue;
    const inconsistent =
      values.length === 3 && values.every((v) => v !== null) && values[0]! + values[1]! !== total;
    const all = [...words, ...matches.flatMap((row) => row ?? [])];
    lines.push({
      line: {
        id: uuid(),
        name,
        points: inconsistent ? null : total,
        rawPoints: inconsistent
          ? 'Total differs from Cube + Bounty: ' + raw.join(' | ')
          : raw.at(-1),
        observationId,
        ocrConfidence: Math.max(0, Math.min(100, ...all.map((w) => w.confidence))),
        playerId: null,
        state: 'pending',
      },
      top: Math.min(...words.map((w) => w.bbox.y0)),
      bottom: Math.max(...words.map((w) => w.bbox.y1)),
      values,
    });
  }
  return lines;
}
