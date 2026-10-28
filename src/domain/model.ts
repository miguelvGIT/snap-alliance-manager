import { z } from 'zod';
const stamp = z.string().datetime();
const id = z.string().min(1).max(128);
const points = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const membershipSchema = z.object({ id, joinedAt: stamp, leftAt: stamp.nullable() });
export const playerSchema = z.object({
  id,
  name: z.string().trim().min(1).max(150),
  aliases: z.array(z.object({ name: z.string(), changedAt: stamp })),
  social: z.string().max(200),
  memberships: z.array(membershipSchema),
});
export const lineSchema = z.object({
  id,
  name: z.string().min(1),
  points: points.nullable(),
  rawPoints: z.string().optional(),
  playerId: id.nullable(),
  state: z.enum(['pending', 'confirmed', 'excluded']),
});
export const collectionSchema = z.object({
  id,
  observedAt: stamp.nullable(),
  timeSource: z.enum(['manual', 'automatic', 'unknown']),
  createdAt: stamp,
  complete: z.boolean(),
  lines: z.array(lineSchema),
});
export const exemptionSchema = z.object({
  kind: z.enum(['manual', 'partial-entry']),
  reason: z.string().trim().min(1),
  createdAt: stamp,
});
export const weekSchema = z.object({
  id,
  start: stamp,
  end: stamp,
  minimum: points,
  goal: points,
  status: z.enum(['draft', 'validated']),
  incomplete: z.boolean(),
  results: z.record(
    z.string(),
    z.object({ points: points.nullable(), observedName: z.string(), collectionId: id.nullable() }),
  ),
  exemptions: z.record(z.string(), exemptionSchema),
  collections: z.array(collectionSchema),
});
export const allianceSchema = z.object({
  id,
  name: z.string().trim().min(1).max(100),
  minimum: points,
  goal: points,
});
export const preferencesSchema = z.object({
  leadMinutes: z.number().int().min(1).max(10079),
  locale: z.string(),
  timeZone: z.string(),
});
export const revisionSchema = z.object({
  id,
  entity: z.string(),
  at: stamp,
  reason: z.string().min(1),
  before: z.string(),
  after: z.string(),
});
export const datasetSchema = z
  .object({
    formatVersion: z.literal(1),
    id,
    alliance: allianceSchema,
    players: z.array(playerSchema),
    weeks: z.array(weekSchema),
    revisions: z.array(revisionSchema),
    preferences: preferencesSchema,
    updatedAt: stamp,
  })
  .superRefine((data, ctx) => {
    for (const p of data.players) {
      for (const m of p.memberships)
        if (m.leftAt && Date.parse(m.leftAt) < Date.parse(m.joinedAt))
          ctx.addIssue({
            code: 'custom',
            message: 'The leaving date cannot be before the joining date',
          });
    }
    const seen = new Set<string>();
    for (const p of data.players) {
      if (seen.has(p.id)) ctx.addIssue({ code: 'custom', message: 'Duplicate player ID' });
      seen.add(p.id);
    }
    const weeks = new Set<string>();
    for (const w of data.weeks) {
      if (weeks.has(w.id)) ctx.addIssue({ code: 'custom', message: 'Duplicate week' });
      weeks.add(w.id);
      const boundary = new Date(w.start);
      if (
        w.id !== w.start ||
        boundary.getUTCDay() !== 2 ||
        boundary.getUTCHours() !== 19 ||
        boundary.getUTCMinutes() !== 0 ||
        boundary.getUTCSeconds() !== 0 ||
        boundary.getUTCMilliseconds() !== 0
      )
        ctx.addIssue({
          code: 'custom',
          message: 'The weekly boundary must be Tuesday at 19:00 UTC',
        });
      if (Date.parse(w.end) - Date.parse(w.start) !== 604800000)
        ctx.addIssue({ code: 'custom', message: 'Invalid weekly interval' });
      for (const key of [...Object.keys(w.results), ...Object.keys(w.exemptions)])
        if (!seen.has(key)) ctx.addIssue({ code: 'custom', message: 'Unknown player in result' });
      const collectionIds = new Set<string>();
      for (const c of w.collections) {
        if (collectionIds.has(c.id))
          ctx.addIssue({ code: 'custom', message: 'Duplicate collection' });
        collectionIds.add(c.id);
        for (const line of c.lines) {
          if (line.playerId && !seen.has(line.playerId))
            ctx.addIssue({ code: 'custom', message: 'Invalid player assignment' });
          if (line.state === 'confirmed' && !line.playerId)
            ctx.addIssue({ code: 'custom', message: 'Confirm the player for this row' });
        }
      }
      for (const result of Object.values(w.results))
        if (result.collectionId && !collectionIds.has(result.collectionId))
          ctx.addIssue({ code: 'custom', message: 'Result collection not found' });
    }
  });
export const backupSchema = z.object({
  kind: z.literal('snap-alliance-backup'),
  formatVersion: z.literal(1),
  exportedAt: stamp,
  dataset: datasetSchema,
});
export type Dataset = z.infer<typeof datasetSchema>;
export type Player = z.infer<typeof playerSchema>;
export type Week = z.infer<typeof weekSchema>;
export type Collection = z.infer<typeof collectionSchema>;
export type Line = z.infer<typeof lineSchema>;
export type Exemption = z.infer<typeof exemptionSchema>;
export const uuid = () => crypto.randomUUID();
export const nowISO = () => new Date().toISOString();
export function newDataset(name: string, minimum = 2700, goal = 80000): Dataset {
  return datasetSchema.parse({
    formatVersion: 1,
    id: uuid(),
    alliance: { id: uuid(), name, minimum, goal },
    players: [],
    weeks: [],
    revisions: [],
    preferences: {
      leadMinutes: 30,
      locale: navigatorLocale(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    updatedAt: nowISO(),
  });
}
function navigatorLocale() {
  return typeof navigator === 'undefined' ? 'pt-PT' : navigator.language;
}
