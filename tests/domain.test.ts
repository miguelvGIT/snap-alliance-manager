import { describe, it, expect } from 'vitest';
import { fixture, clock } from './fixtures';
import { weekBounds, weekLabel } from '../src/domain/weeks';
import { metrics, partialEntry } from '../src/domain/metrics';
import {
  addPlayer,
  renamePlayer,
  change,
  makeCollection,
  nameReview,
  saveCollection,
  ensureWeek,
  exempt,
  validateWeek,
  parseRows,
} from '../src/domain/actions';
import { datasetSchema, newDataset, uuid } from '../src/domain/model';
import { exportBackup, readBackup, calendarFile } from '../src/domain/transfer';
describe('Semanas e indicadores', () => {
  it('AC16: o reset tem início incluído e fim excluído', () => {
    expect(weekBounds('2026-10-27T18:59:59Z').start).toBe('2026-10-20T19:00:00.000Z');
    expect(weekBounds('2026-10-27T19:00:00Z').start).toBe('2026-10-27T19:00:00.000Z');
  });
  it.each([
    ['Europe/Lisbon', '20/10/26 - 27/10/26'],
    ['Etc/GMT-2', '20/10/26 - 27/10/26'],
    ['Asia/Kolkata', '21/10/26 - 28/10/26'],
  ])('AC17 AC63: datas locais em %s', (timeZone, expected) =>
    expect(weekLabel(weekBounds('2026-10-21'), 'pt-PT', timeZone)).toBe(expected),
  );
  it('AC17 AC51: Lisboa muda a hora local sem mudar UTC', () => {
    const f = (date: string) =>
      new Intl.DateTimeFormat('pt-PT', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Lisbon',
      }).format(new Date(date));
    expect(f('2026-07-07T19:00:00Z')).toBe('20:00');
    expect(f('2026-10-27T19:00:00Z')).toBe('19:00');
  });
  it.each([
    ['Ana', 2500, 1, 4],
    ['Bruno', 5500 / 3, 1, 3],
    ['Carla', 8200 / 3, 1, 3],
    ['Duarte', 2175, 2, 4],
    ['Eva', null, 0, 0],
  ] as const)('AC12 AC14: referência de %s', (name, average, failures, evaluated) => {
    const d = fixture(),
      m = metrics(
        d,
        d.players.find((p) => p.name === name)!,
        clock,
      );
    expect(m.failures).toBe(failures);
    expect(m.evaluated).toBe(evaluated);
    if (average === null) expect(m.average).toBeNull();
    else expect(m.average).toBeCloseTo(average);
  });
  it.each([
    [2699, 1],
    [2700, 0],
    [2701, 0],
    [0, 1],
  ])('AC02: limite de pontos %i', (points, failures) => {
    const d = fixture(),
      p = d.players[3];
    d.weeks = [d.weeks[3]];
    d.weeks[0].results[p.id].points = points;
    expect(metrics(d, p, clock).failures).toBe(failures);
  });
  it('AC03: mínimo zero não penaliza e valores inválidos não passam validação', () => {
    const d = fixture();
    d.weeks.forEach((w) => (w.minimum = 0));
    expect(metrics(d, d.players[3], clock).failures).toBe(0);
    for (const bad of [-1, 2.5, NaN]) {
      const invalid = fixture();
      invalid.weeks[0].results[invalid.players[0].id].points = bad;
      expect(datasetSchema.safeParse(invalid).success).toBe(false);
    }
  });
  it('AC15: rascunho e semana corrente não contam', () => {
    const d = fixture(),
      p = d.players[3];
    d.weeks[0].status = 'draft';
    expect(metrics(d, p, clock).evaluated).toBe(3);
    expect(metrics(d, p, Date.parse('2026-10-27T18:59:59Z')).evaluated).toBe(2);
  });
  it('AC18: alterar o mínimo por defeito preserva os mínimos históricos', () => {
    const d = fixture();
    const next = change(d, 'alliance', 'Novo mínimo', (d) => {
      d.alliance.minimum = 3000;
    });
    expect(next.weeks.every((w) => w.minimum === 2700)).toBe(true);
    expect(ensureWeek(next, '2026-10-28').weeks.at(-1)?.minimum).toBe(3000);
  });
  it('AC20 AC21 AC66: dispensa com motivo mantém pontos, média e histórico', () => {
    const d = fixture(),
      p = d.players[0],
      w = d.weeks[3];
    const removed = exempt(d, w.id, p.id, null);
    expect(metrics(removed, p, clock).failures).toBe(2);
    const justified = exempt(removed, w.id, p.id, 'x');
    expect(metrics(justified, p, clock)).toEqual({ average: 2500, evaluated: 4, failures: 1 });
    expect(justified.weeks[3].results[p.id].points).toBe(1000);
    expect(justified.revisions.at(-1)?.reason).toBe('x');
    expect(() => exempt(d, w.id, p.id, ' ')).toThrow();
  });
  it('AC22 AC23: só entrada estritamente posterior dispensa a primeira semana', () => {
    const d = fixture(),
      p = d.players[1];
    expect(partialEntry(p, d.weeks[0])).toBe(true);
    p.memberships[0].joinedAt = d.weeks[0].start;
    expect(partialEntry(p, d.weeks[0])).toBe(false);
  });
  it('AC25 AC26: saída/reentrada preservam a identidade e não limitam o histórico a 30', () => {
    let d = fixture();
    const p = d.players[3];
    p.memberships[0].leftAt = d.weeks[1].end;
    expect(metrics(d, p, clock).evaluated).toBe(2);
    p.memberships.push({ id: uuid(), joinedAt: d.weeks[3].start, leftAt: null });
    expect(metrics(d, p, clock).evaluated).toBe(3);
    for (let i = 0; i < 31; i++) d = addPlayer(d, 'Player ' + i, '', d.weeks[0].start);
    expect(d.players).toHaveLength(36);
  });
});
describe('Identidade e recolhas', () => {
  it('AC04 AC06: confirmar nome mantém ID, contacto e dados antigos', () => {
    const d = fixture(),
      p = d.players[0];
    const renamed = renamePlayer(d, p.id, 'New name');
    const next = renamed.players[0];
    expect(next.id).toBe(p.id);
    expect(next.social).toBe('ana.discord');
    expect(next.aliases[0].name).toBe('Ana');
    expect(renamed.weeks).toEqual(d.weeks);
    expect(metrics(renamed, next, clock)).toEqual(metrics(d, p, clock));
  });
  it('AC81 AC84: nome novo e antigo ausente são alertas separados', () => {
    const d = fixture(),
      w = d.weeks[3],
      c = makeCollection('NovoNome;3000', null, true),
      r = nameReview(d, w, c);
    expect(r.unknown[0].name).toBe('NovoNome');
    expect(r.missing.map((p) => p.name)).toContain('Ana');
    expect(c.lines[0].playerId).toBeNull();
    expect(d.players).toHaveLength(5);
  });
  it('AC05 AC86: nome anterior dá candidatos mas nunca muda o nome atual sozinho', () => {
    const base = fixture();
    const renamed = renamePlayer(base, base.players[0].id, 'CurrentName');
    const c = makeCollection('Ana;1000', null, true);
    const review = nameReview(renamed, base.weeks[3], c);
    expect(review.candidates('Ana')).toHaveLength(1);
    expect(c.lines[0].state).toBe('pending');
    expect(renamed.players[0].name).toBe('CurrentName');
  });
  it('AC07 AC08 AC03: colagem preserva zero e não inventa pontos em valores inválidos', () => {
    expect(
      parseRows('Ana;2700\nBruno\t0\nCarla;2.5\nDuarte;-1\nEva;abc').map((l) => l.points),
    ).toEqual([2700, 0, null, null, null]);
    expect(parseRows('Ana 2 700')[0].points).toBe(2700);
  });
  it('AC67 AC68 AC83 AC85: recolha parcial e momento desconhecido permanecem explícitos', () => {
    const d = fixture(),
      w = d.weeks[3],
      c = makeCollection('Ana;1000', null, false);
    const next = saveCollection(d, w.id, c, { reason: 'Revisão de teste' });
    expect(next.weeks[3].collections[0].observedAt).toBeNull();
    expect(next.weeks[3].collections[0].timeSource).toBe('unknown');
    expect(next.weeks[3].results).toEqual(d.weeks[3].results);
    expect(() => validateWeek(next, w.id, true)).toThrow(/pending/);
    expect(nameReview(d, w, c).missing).toHaveLength(4);
  });
  it('AC09: duplicados divergentes exigem revisão e nunca são somados', () => {
    const d = fixture(),
      w = d.weeks[3],
      c = makeCollection('Ana;1000\nAna;2000', null, true);
    c.lines.forEach((l) => {
      l.playerId = d.players[0].id;
      l.state = 'confirmed';
    });
    expect(() => saveCollection(d, w.id, c, { reason: 'Revisão de teste' })).toThrow(/two rows/i);
  });
  it('AC27 AC85: exclusão explícita permite validar como incompleta', () => {
    const d = fixture(),
      w = d.weeks[3],
      c = makeCollection('Estranho;4000', null, false);
    c.lines[0].state = 'excluded';
    const next = saveCollection(d, w.id, c, { reason: 'Revisão de teste' });
    expect(() => validateWeek(next, w.id, false)).toThrow(/incomplete/);
    expect(validateWeek(next, w.id, true).weeks[3].incomplete).toBe(true);
  });
});
describe('Transferência e calendário', () => {
  it('AC35 AC70 AC71 AC87: backup completo conserva histórico e pendentes sem credenciais', () => {
    let d = fixture();
    const c = makeCollection('NomeDesconhecido;1234', null, false);
    d = saveCollection(d, d.weeks[3].id, c, { reason: 'Revisão de teste' });
    const serialized = exportBackup(d),
      restored = readBackup(serialized).dataset;
    expect(restored).toEqual(d);
    expect(restored.weeks[3].collections[0].lines[0].state).toBe('pending');
    expect(serialized).not.toContain('recoveryKey');
    expect(serialized).not.toContain('token');
  });
  it('AC36: formato inválido ou versão futura não altera o original', () => {
    const d = fixture(),
      before = JSON.stringify(d);
    for (const file of [
      'not json',
      '{}',
      JSON.stringify({ kind: 'snap-alliance-backup', formatVersion: 99, dataset: d }),
    ])
      expect(() => readBackup(file)).toThrow();
    expect(JSON.stringify(d)).toBe(before);
  });
  it.each([0, -1, 1.5, 10080])('AC40 AC76: antecedência inválida %s', (lead) =>
    expect(() => calendarFile(lead, '2026-10-27T19:00:00.000Z')).toThrow(),
  );
  it('AC76: calendário local tem reset UTC e alarme sem dados pessoais', () => {
    const file = calendarFile(30, '2026-10-27T19:00:00.000Z');
    expect(file).toContain('DTSTART:20261027T190000Z\r\n');
    expect(file).toContain('RRULE:FREQ=WEEKLY;BYDAY=TU');
    expect(file).toContain('TRIGGER:-PT30M');
    expect(file).not.toContain('Ana');
  });
});
