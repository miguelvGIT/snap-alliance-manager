import { uuid, type Collection, type Line } from '../domain/model';
export type Word = {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
};
export type Observation = NonNullable<Collection['observations']>[number];
export type ImageInput = Observation & { file: File; url: string };
export function mergeImageLines(lines: Line[]): Line[] {
  const groups = new Map<string, Line[]>();
  for (const line of lines) {
    const key =
      line.observationId && line.state !== 'excluded'
        ? line.name.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en')
        : line.id;
    groups.set(key, [...(groups.get(key) ?? []), line]);
  }
  return [...groups.values()].map((group) => {
    if (group.length === 1) return group[0];
    if (new Set(group.map((l) => l.playerId).filter(Boolean)).size > 1)
      throw new Error(
        'Repeated names are assigned to different players. Review their assignments before combining them.',
      );
    const originals = group.flatMap(
      (line) =>
        line.sourceRows ?? [
          {
            id: line.id,
            observationId: line.observationId!,
            name: line.name,
            points: line.points,
            rawPoints: line.rawPoints,
            ocrConfidence: line.ocrConfidence,
          },
        ],
    );
    const values = [...new Set(group.map((l) => l.points).filter((v): v is number => v !== null))];
    const conflict = values.length > 1 || group.some((l) => l.pointsConflict);
    return {
      ...group[0],
      name: group[0].name.trim().replace(/\s+/g, ' '),
      points: conflict ? null : (values[0] ?? null),
      pointsConflict: conflict,
      sourceRows: originals,
      state: 'pending' as const,
      playerId: null,
    };
  });
}
export const parseScore = (raw: string): number | null => {
  const text = raw.trim();
  if (!/^(?:\d+|\d{1,3}(?:[ ,.\u00a0]\d{3})+)$/.test(text)) return null;
  const value = Number(text.replace(/[ ,.\u00a0]/g, ''));
  return Number.isSafeInteger(value) ? value : null;
};

// Coordinates reconstruct rows even when OCR emits each table column as a separate block.
export function imageRows(
  words: Word[],
  observationId: string,
  columns = 3,
  fromRight = 0,
): Line[] {
  const rows: Word[][] = [];
  for (const word of words
    .filter((w) => w.text.trim())
    .sort((a, b) => (a.bbox.y0 + a.bbox.y1) / 2 - (b.bbox.y0 + b.bbox.y1) / 2)) {
    const center = (word.bbox.y0 + word.bbox.y1) / 2;
    const row = rows.find(
      (row) =>
        Math.abs(center - (row[0].bbox.y0 + row[0].bbox.y1) / 2) <=
        Math.max(5, (row[0].bbox.y1 - row[0].bbox.y0) * 0.6),
    );
    if (row) row.push(word);
    else rows.push([word]);
  }
  const output: Line[] = [];
  for (const row of rows) {
    const sorted = row.sort((a, b) => a.bbox.x0 - b.bbox.x0);
    const cells: { text: string; words: Word[] }[] = [];
    for (const word of sorted) {
      const last = cells.at(-1),
        previous = last?.words.at(-1);
      const close =
        previous &&
        word.bbox.x0 - previous.bbox.x1 < Math.max(6, (word.bbox.y1 - word.bbox.y0) * 0.6);
      if (last && close && /^\d{1,3}$/.test(last.text) && /^\d{3}$/.test(word.text)) {
        last.text += ' ' + word.text;
        last.words.push(word);
      } else cells.push({ text: word.text.trim(), words: [word] });
    }
    let numericStart = cells.length;
    while (numericStart > 0 && /^[+\-\d][\d,.\u00a0\s]*$/.test(cells[numericStart - 1].text))
      numericStart--;
    // Keep common OCR substitutions visible for correction; never convert O/I/l into digits.
    const tail = cells.slice(-columns);
    const ambiguousTail =
      cells.length > columns && tail.every((c) => /^[+\-\dOolI][\d,.\u00a0\sOolI]*$/.test(c.text));
    if (numericStart === cells.length && !ambiguousTail) continue;
    const numeric = ambiguousTail ? tail : cells.slice(numericStart);
    const used = Math.min(columns, numeric.length);
    const nameCells = cells.slice(0, cells.length - used);
    const name = nameCells
      .map((c) => c.text)
      .join(' ')
      .trim();
    if (!/[\p{L}\p{N}]/u.test(name)) continue;
    const cell = numeric.at(-1 - fromRight);
    const raw = cell?.text ?? '';
    const confidence = Math.max(
      0,
      Math.min(
        100,
        Math.min(
          ...[...nameCells.flatMap((c) => c.words), ...(cell?.words ?? [])].map(
            (w) => w.confidence,
          ),
        ),
      ),
    );
    output.push({
      id: uuid(),
      name,
      points: numeric.length < columns ? null : parseScore(raw),
      rawPoints:
        numeric.length < columns
          ? 'Check missing score columns: ' + numeric.map((c) => c.text).join(' | ')
          : raw,
      observationId,
      ocrConfidence: confidence,
      playerId: null,
      state: 'pending',
    });
  }
  return output;
}

export function imageCollection(images: ImageInput[], rows: Line[]): Collection {
  const known = images
    .map((i) => i.observedAt)
    .filter((v): v is string => v !== null)
    .sort();
  return {
    id: uuid(),
    createdAt: new Date().toISOString(),
    observedAt: known[0] ?? null,
    timeSource: images.some((i) => i.timeSource === 'manual')
      ? 'manual'
      : known.length
        ? 'automatic'
        : 'unknown',
    complete: false,
    lines: mergeImageLines(
      rows.map((row) => ({
        ...row,
        sourceRows:
          row.sourceRows ??
          (row.observationId
            ? [
                {
                  id: row.id,
                  observationId: row.observationId,
                  name: row.name,
                  points: row.points,
                  rawPoints: row.rawPoints,
                  ocrConfidence: row.ocrConfidence,
                },
              ]
            : undefined),
      })),
    ),
    observations: images.map(({ id, name, source, observedAt, timeSource }) => ({
      id,
      name,
      source,
      observedAt,
      timeSource,
      rowsFound: rows.filter((row) => row.observationId === id).length,
    })),
  };
}
