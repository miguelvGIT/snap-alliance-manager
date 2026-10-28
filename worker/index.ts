/// <reference types="@cloudflare/workers-types" />
import { z } from 'zod';
import webpush from 'web-push';
import {
  datasetSchema,
  playerSchema,
  weekSchema,
  allianceSchema,
  preferencesSchema,
  revisionSchema,
  uuid,
  nowISO,
  type Dataset,
} from '../src/domain/model';
import { weekBounds } from '../src/domain/weeks';
type Env = {
  DB: D1Database;
  ASSETS: Fetcher;
  APP_ORIGIN: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT: string;
  SYNC_PREVIEW?: string;
};
type Device = { id: string; space_id: string; label: string; revoked: number };
const opSchema = z.object({
  id: z.string().uuid(),
  key: z.string().max(160),
  base: z.string().nullable(),
  value: z.unknown(),
  revisions: z.array(revisionSchema).max(1000),
  at: z.string().datetime(),
});
const secret = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
};
const hash = async (value: string) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
const json = (value: unknown, status = 200) =>
  Response.json(value, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
async function body(request: Request) {
  if (Number(request.headers.get('Content-Length') ?? 0) > 4000000)
    throw new HttpError(413, 'The request is too large.');
  const text = await request.text();
  if (text.length > 4000000) throw new HttpError(413, 'The request is too large.');
  return JSON.parse(text);
}
async function auth(request: Request, env: Env, space?: string) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!token || token.length < 32) throw new HttpError(401, 'Device not authorized.');
  const device = await env.DB.prepare(
    'SELECT id, space_id, label, revoked FROM devices WHERE token_hash=?',
  )
    .bind(await hash(token))
    .first<Device>();
  if (!device || device.revoked || (space && device.space_id !== space))
    throw new HttpError(403, 'This device does not have access to this alliance.');
  return device;
}
async function limit(request: Request, env: Env) {
  const minute = Math.floor(Date.now() / 60000);
  const bucket = (await hash(request.headers.get('CF-Connecting-IP') ?? 'local')) + ':' + minute;
  const row = await env.DB.prepare(
    'INSERT INTO rate_limits(bucket,count,expires) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1 RETURNING count',
  )
    .bind(bucket, Date.now() + 600000)
    .first<{ count: number }>();
  if ((row?.count ?? 0) > 40) throw new HttpError(429, 'Too many attempts. Wait a minute.');
}
const validateEntity = (key: string, value: unknown) => {
  if (key === 'alliance') return allianceSchema.parse(value);
  if (key === 'preferences') return preferencesSchema.parse(value);
  if (key.startsWith('player/')) {
    const p = playerSchema.parse(value);
    if (key !== 'player/' + p.id) throw new HttpError(400, 'Inconsistent identity.');
    return p;
  }
  if (key.startsWith('week/')) {
    const w = weekSchema.parse(value);
    if (
      key !== 'week/' + w.id ||
      weekBounds(w.start).start !== w.start ||
      Date.parse(w.end) - Date.parse(w.start) !== 604800000
    )
      throw new HttpError(400, 'Invalid week.');
    return w;
  }
  throw new HttpError(400, 'Unknown entity.');
};
async function snapshot(env: Env, spaceId: string) {
  const space = await env.DB.prepare('SELECT dataset_id FROM spaces WHERE id=?')
    .bind(spaceId)
    .first<{ dataset_id: string }>();
  if (!space) throw new HttpError(404, 'Alliance not found.');
  const records = await env.DB.prepare(
    'SELECT entity_key, revision, value_json FROM heads WHERE space_id=?',
  )
    .bind(spaceId)
    .all<{ entity_key: string; revision: string; value_json: string }>();
  const changes = await env.DB.prepare(
    'SELECT seq, operation_json FROM changes WHERE space_id=? ORDER BY seq',
  )
    .bind(spaceId)
    .all<{ seq: number; operation_json: string }>();
  const values = Object.fromEntries(
    records.results.map((r) => [r.entity_key, JSON.parse(r.value_json)]),
  );
  const revisions = new Map<string, Dataset['revisions'][number]>();
  for (const row of changes.results) {
    const op = JSON.parse(row.operation_json) as z.infer<typeof opSchema>;
    for (const revision of op.revisions) revisions.set(revision.id, revision);
  }
  const dataset = datasetSchema.parse({
    formatVersion: 1,
    id: space.dataset_id,
    alliance: values.alliance,
    preferences: values.preferences,
    players: Object.entries(values)
      .filter(([key]) => key.startsWith('player/'))
      .map(([, value]) => value),
    weeks: Object.entries(values)
      .filter(([key]) => key.startsWith('week/'))
      .map(([, value]) => value),
    revisions: [...revisions.values()],
    updatedAt: nowISO(),
  });
  return {
    dataset,
    heads: Object.fromEntries(records.results.map((r) => [r.entity_key, r.revision])),
    cursor: changes.results.at(-1)?.seq ?? 0,
  };
}
async function handle(request: Request, env: Env) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (!path.startsWith('/api/')) return env.ASSETS.fetch(request);
  if (/^\/api\/(spaces|join|recover)(\/|$)/.test(path)) {
    const localHosts = ['localhost', '127.0.0.1', '[::1]'];
    if (
      env.SYNC_PREVIEW !== 'true' ||
      !localHosts.includes(url.hostname) ||
      !localHosts.includes(new URL(env.APP_ORIGIN).hostname)
    )
      throw new HttpError(
        404,
        'Automatic sync is not available in this version. Use file transfer.',
      );
  }
  if (
    !['GET', 'HEAD'].includes(request.method) &&
    request.headers.get('Origin') &&
    request.headers.get('Origin') !== url.origin &&
    request.headers.get('Origin') !== env.APP_ORIGIN
  )
    throw new HttpError(403, 'Origin not authorized.');
  if (path === '/api/config' && request.method === 'GET')
    return json({
      pushAvailable: !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY),
      vapidPublicKey: env.VAPID_PUBLIC_KEY ?? null,
    });
  if (path === '/api/spaces' && request.method === 'POST') {
    await limit(request, env);
    const input = z.object({ dataset: datasetSchema }).parse(await body(request));
    const data = input.dataset;
    const spaceId = uuid(),
      deviceId = uuid(),
      token = secret(),
      recoveryKey = secret(),
      heads: Record<string, string> = {};
    const values: [string, unknown][] = [
      ['alliance', data.alliance],
      ['preferences', data.preferences],
      ...data.players.map((p) => ['player/' + p.id, p] as [string, unknown]),
      ...data.weeks.map((w) => ['week/' + w.id, w] as [string, unknown]),
    ];
    const statements = [
      env.DB.prepare('INSERT INTO spaces VALUES(?,?,?,?)').bind(
        spaceId,
        data.id,
        await hash(recoveryKey),
        nowISO(),
      ),
      env.DB.prepare('INSERT INTO devices(id,space_id,token_hash,label) VALUES(?,?,?,?)').bind(
        deviceId,
        spaceId,
        await hash(token),
        'First device',
      ),
    ];
    const initial = values.map(([key, value]) => {
      const id = uuid();
      heads[key] = id;
      return {
        key,
        revision: id,
        value: JSON.stringify(value),
        operation: JSON.stringify({
          id,
          key,
          base: null,
          value,
          revisions: data.revisions.filter((r) => r.entity === key),
          at: nowISO(),
        }),
      };
    });
    const initialJSON = JSON.stringify(initial);
    statements.push(
      env.DB.prepare(
        "INSERT INTO heads SELECT ?,json_extract(value,'$.key'),json_extract(value,'$.revision'),json_extract(value,'$.value') FROM json_each(?)",
      ).bind(spaceId, initialJSON),
      env.DB.prepare(
        "INSERT INTO changes(space_id,operation_id,operation_json,created_at) SELECT ?,json_extract(value,'$.revision'),json_extract(value,'$.operation'),? FROM json_each(?)",
      ).bind(spaceId, nowISO(), initialJSON),
    );
    await env.DB.batch(statements);
    const cursor = await env.DB.prepare('SELECT MAX(seq) AS cursor FROM changes WHERE space_id=?')
      .bind(spaceId)
      .first<{ cursor: number }>();
    return json({ spaceId, deviceId, token, recoveryKey, heads, cursor: cursor?.cursor ?? 0 }, 201);
  }
  const match = path.match(/^\/api\/spaces\/([^/]+)(?:\/(.*))?$/);
  if (match) {
    const spaceId = match[1],
      action = match[2] ?? '';
    const device = await auth(request, env, spaceId);
    if (action === 'snapshot' && request.method === 'GET')
      return json(await snapshot(env, spaceId));
    if (action === 'entity' && request.method === 'GET') {
      const row = await env.DB.prepare(
        'SELECT value_json FROM heads WHERE space_id=? AND entity_key=?',
      )
        .bind(spaceId, url.searchParams.get('key'))
        .first<{ value_json: string }>();
      return json({ value: row ? JSON.parse(row.value_json) : null });
    }
    if (action === 'sync' && request.method === 'POST') {
      const input = z
        .object({ cursor: z.number().int().nonnegative(), operations: z.array(opSchema).max(10) })
        .parse(await body(request));
      for (const op of input.operations) {
        const value = validateEntity(op.key, op.value);
        if (op.key.startsWith('player/')) {
          const player = playerSchema.parse(value);
          if (player.memberships.some((m) => m.leftAt && m.leftAt < m.joinedAt))
            throw new HttpError(400, 'Invalid membership interval.');
        }
        if (op.key.startsWith('week/')) {
          const week = weekSchema.parse(value);
          const ids = [
            ...new Set([
              ...Object.keys(week.results),
              ...Object.keys(week.exemptions),
              ...week.collections.flatMap((c) =>
                c.lines.map((l) => l.playerId).filter((id): id is string => id !== null),
              ),
            ]),
          ];
          if (ids.length) {
            const found = await env.DB.prepare(
              "SELECT entity_key FROM heads WHERE space_id=? AND entity_key IN (SELECT 'player/'||value FROM json_each(?))",
            )
              .bind(spaceId, JSON.stringify(ids))
              .all();
            if (found.results.length !== ids.length)
              throw new HttpError(
                400,
                'The result refers to a player who does not exist in this space.',
              );
          }
        }
        const prior = await env.DB.prepare('SELECT space_id FROM changes WHERE operation_id=?')
          .bind(op.id)
          .first<{ space_id: string }>();
        if (prior) {
          if (prior.space_id !== spaceId) throw new HttpError(409, 'Operation ID unavailable.');
          continue;
        }
        // The insert and head update share an atomic D1 batch. The conflict is decided in SQL against the current head.
        const text = JSON.stringify({ ...op, value });
        await env.DB.batch([
          env.DB.prepare(
            "INSERT INTO changes(space_id,operation_id,operation_json,conflict,created_at) SELECT ?,?,?,CASE WHEN COALESCE((SELECT revision FROM heads WHERE space_id=? AND entity_key=?),'')=COALESCE(?,'') THEN 0 ELSE 1 END,?",
          ).bind(spaceId, op.id, text, spaceId, op.key, op.base, nowISO()),
          env.DB.prepare(
            'INSERT INTO heads(space_id,entity_key,revision,value_json) SELECT ?,?,?,? WHERE (SELECT conflict FROM changes WHERE operation_id=?)=0 ON CONFLICT(space_id,entity_key) DO UPDATE SET revision=excluded.revision,value_json=excluded.value_json',
          ).bind(spaceId, op.key, op.id, JSON.stringify(value), op.id),
        ]);
      }
      const changed = await env.DB.prepare(
        'SELECT seq,operation_json,conflict FROM changes WHERE space_id=? AND seq>? ORDER BY seq LIMIT 501',
      )
        .bind(spaceId, input.cursor)
        .all<{ seq: number; operation_json: string; conflict: number }>();
      const page = changed.results.slice(0, 500);
      const changedKeys = [
        ...new Set(page.map((row) => JSON.parse(row.operation_json).key as string)),
      ];
      const heads = changedKeys.length
        ? await env.DB.prepare(
            'SELECT entity_key,revision FROM heads WHERE space_id=? AND entity_key IN (SELECT value FROM json_each(?))',
          )
            .bind(spaceId, JSON.stringify(changedKeys))
            .all<{ entity_key: string; revision: string }>()
        : { results: [] as { entity_key: string; revision: string }[] };
      return json({
        changes: page.map((row) => ({
          seq: row.seq,
          operation: JSON.parse(row.operation_json),
          conflict: !!row.conflict,
        })),
        cursor: page.at(-1)?.seq ?? input.cursor,
        more: changed.results.length > 500,
        heads: Object.fromEntries(heads.results.map((r) => [r.entity_key, r.revision])),
      });
    }
    if (action === 'devices' && request.method === 'GET') {
      const devices = await env.DB.prepare('SELECT id,label,revoked FROM devices WHERE space_id=?')
        .bind(spaceId)
        .all();
      return json({ devices: devices.results, currentDeviceId: device.id });
    }
    if (action.startsWith('devices/') && request.method === 'DELETE') {
      await env.DB.prepare('UPDATE devices SET revoked=1 WHERE id=? AND space_id=?')
        .bind(action.slice(8), spaceId)
        .run();
      return json({ ok: true });
    }
    if (action === 'invites' && request.method === 'POST') {
      const inviteId = uuid(),
        inviteSecret = secret();
      await env.DB.prepare(
        'INSERT INTO invites(id,space_id,secret_hash,expires_at) VALUES(?,?,?,?)',
      )
        .bind(inviteId, spaceId, await hash(inviteSecret), Date.now() + 600000)
        .run();
      return json({ code: inviteId + '.' + inviteSecret, expiresAt: Date.now() + 600000 });
    }
    if (action === 'invites' && request.method === 'GET') {
      const joins = await env.DB.prepare(
        "SELECT j.id,j.label,j.verification,j.status FROM join_requests j JOIN invites i ON j.invite_id=i.id WHERE i.space_id=? AND i.expires_at>? AND j.status='pending'",
      )
        .bind(spaceId, Date.now())
        .all();
      return json({ requests: joins.results });
    }
    if (action.startsWith('approve/') && request.method === 'POST') {
      const result = await env.DB.prepare(
        "UPDATE join_requests SET status='approved' WHERE id=? AND status='pending' AND invite_id IN (SELECT id FROM invites WHERE space_id=? AND expires_at>? AND used=0)",
      )
        .bind(action.slice(8), spaceId, Date.now())
        .run();
      if (!result.meta.changes)
        throw new HttpError(410, 'The request expired or has already been used.');
      return json({ ok: true });
    }
    throw new HttpError(404, 'Action not found.');
  }
  if (path === '/api/join' && request.method === 'POST') {
    await limit(request, env);
    const input = z
      .object({ code: z.string().max(200), label: z.string().trim().min(1).max(100) })
      .parse(await body(request));
    const [inviteId, inviteSecret] = input.code.split('.');
    const invite = await env.DB.prepare('SELECT * FROM invites WHERE id=?')
      .bind(inviteId ?? '')
      .first<{
        id: string;
        secret_hash: string;
        expires_at: number;
        used: number;
        attempts: number;
      }>();
    if (!invite || invite.used || invite.expires_at < Date.now() || invite.attempts >= 5)
      throw new HttpError(410, 'Invalid, expired or already used invitation.');
    if ((await hash(inviteSecret ?? '')) !== invite.secret_hash) {
      await env.DB.prepare('UPDATE invites SET attempts=attempts+1 WHERE id=?')
        .bind(inviteId)
        .run();
      throw new HttpError(403, 'Invalid invitation.');
    }
    const id = uuid(),
      claimSecret = secret(),
      verification = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(
        6,
        '0',
      );
    await env.DB.prepare(
      'INSERT INTO join_requests(id,invite_id,claim_hash,label,verification) VALUES(?,?,?,?,?)',
    )
      .bind(id, inviteId, await hash(claimSecret), input.label, verification)
      .run();
    return json({ requestId: id, claimSecret, verification }, 201);
  }
  if (path === '/api/join/claim' && request.method === 'POST') {
    await limit(request, env);
    const input = z
      .object({
        requestId: z.string(),
        claimSecret: z.string(),
        deviceToken: z.string().min(40),
        deviceId: z.string().uuid(),
      })
      .parse(await body(request));
    const row = await env.DB.prepare(
      'SELECT j.*,i.space_id,i.expires_at,i.used FROM join_requests j JOIN invites i ON j.invite_id=i.id WHERE j.id=?',
    )
      .bind(input.requestId)
      .first<{
        claim_hash: string;
        status: string;
        token_claimed: number;
        space_id: string;
        expires_at: number;
        used: number;
        invite_id: string;
        label: string;
      }>();
    if (
      !row ||
      row.used ||
      row.token_claimed ||
      row.expires_at < Date.now() ||
      (await hash(input.claimSecret)) !== row.claim_hash
    )
      throw new HttpError(403, 'This request is not valid.');
    if (row.status !== 'approved') return json({ pending: true });
    const claimed = await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO devices(id,space_id,token_hash,label) SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM join_requests j JOIN invites i ON i.id=j.invite_id WHERE j.id=? AND j.token_claimed=0 AND j.status='approved' AND i.used=0 AND i.expires_at>?)",
      ).bind(
        input.deviceId,
        row.space_id,
        await hash(input.deviceToken),
        row.label,
        input.requestId,
        Date.now(),
      ),
      env.DB.prepare(
        'UPDATE join_requests SET token_claimed=1 WHERE id=? AND EXISTS(SELECT 1 FROM devices WHERE id=?)',
      ).bind(input.requestId, input.deviceId),
      env.DB.prepare(
        'UPDATE invites SET used=1 WHERE id=? AND EXISTS(SELECT 1 FROM devices WHERE id=?)',
      ).bind(row.invite_id, input.deviceId),
    ]);
    if (!claimed[0].meta.changes) throw new HttpError(409, 'The invitation has already been used.');
    return json({
      pending: false,
      spaceId: row.space_id,
      deviceId: input.deviceId,
      token: input.deviceToken,
      cursor: 0,
    });
  }
  if (path === '/api/recover' && request.method === 'POST') {
    await limit(request, env);
    const input = z
      .object({ spaceId: z.string(), recoveryKey: z.string(), label: z.string().max(100) })
      .parse(await body(request));
    const space = await env.DB.prepare('SELECT id FROM spaces WHERE id=? AND recovery_hash=?')
      .bind(input.spaceId, await hash(input.recoveryKey))
      .first();
    if (!space) throw new HttpError(403, 'Invalid recovery key.');
    const token = secret(),
      deviceId = uuid();
    await env.DB.prepare('INSERT INTO devices(id,space_id,token_hash,label) VALUES(?,?,?,?)')
      .bind(deviceId, input.spaceId, await hash(token), input.label)
      .run();
    return json({ spaceId: input.spaceId, deviceId, token, cursor: 0 });
  }
  if (path.startsWith('/api/reminders')) return reminderRoute(request, env, path);
  throw new HttpError(404, 'Page not found.');
}
const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(200) }),
});
function safeEndpoint(endpoint: string) {
  const u = new URL(endpoint);
  return (
    u.protocol === 'https:' &&
    u.port === '' &&
    (u.hostname === 'fcm.googleapis.com' ||
      u.hostname === 'updates.push.services.mozilla.com' ||
      u.hostname.endsWith('.push.apple.com') ||
      u.hostname.endsWith('.notify.windows.com'))
  );
}
async function reminderRoute(request: Request, env: Env, path: string) {
  if (request.method === 'POST' && path === '/api/reminders') {
    await limit(request, env);
    const input = z
      .object({ subscription: subscriptionSchema, leadMinutes: z.number().int().min(1).max(10079) })
      .parse(await body(request));
    if (!safeEndpoint(input.subscription.endpoint))
      throw new HttpError(400, 'Push service not supported.');
    if (!env.VAPID_PRIVATE_KEY)
      throw new HttpError(
        503,
        'Reminders are not available on this server yet. You can use your calendar.',
      );
    let reset = weekBounds().end;
    if (Date.parse(reset) - input.leadMinutes * 60000 <= Date.now())
      reset = new Date(Date.parse(reset) + 604800000).toISOString();
    const week = weekBounds(Date.parse(reset) - 1).id,
      id = uuid(),
      token = secret();
    const due = Date.parse(reset) - input.leadMinutes * 60000;
    await env.DB.prepare(
      'INSERT INTO reminders(id,token_hash,subscription_json,lead_minutes,next_due,reset_at,week_id) VALUES(?,?,?,?,?,?,?)',
    )
      .bind(
        id,
        await hash(token),
        JSON.stringify(input.subscription),
        input.leadMinutes,
        due,
        reset,
        week,
      )
      .run();
    return json({ id, token, resetAt: reset, nextDue: due }, 201);
  }
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!token) throw new HttpError(401, 'Reminder not authorized.');
  if (request.method === 'DELETE' && path === '/api/reminders') {
    await env.DB.prepare('DELETE FROM reminders WHERE token_hash=?')
      .bind(await hash(token))
      .run();
    return json({ ok: true });
  }
  const reminder = await env.DB.prepare('SELECT * FROM reminders WHERE token_hash=?')
    .bind(await hash(token))
    .first<Record<string, unknown>>();
  if (!reminder) throw new HttpError(403, 'Reminder not authorized.');
  if (request.method === 'POST' && path === '/api/reminders/test') {
    await sendPush(env, { ...reminder, reset_at: weekBounds().end, week_id: weekBounds().id });
    return json({ ok: true });
  }
  if (request.method === 'PUT') {
    const input = z
      .object({
        leadMinutes: z.number().int().min(1).max(10079),
        subscription: subscriptionSchema.optional(),
      })
      .parse(await body(request));
    if (input.subscription && !safeEndpoint(input.subscription.endpoint))
      throw new HttpError(400, 'Push service not supported.');
    let reset = weekBounds().end;
    if (
      reminder.sent_week === weekBounds().id ||
      Date.parse(reset) - input.leadMinutes * 60000 <= Date.now()
    )
      reset = new Date(Date.parse(reset) + 604800000).toISOString();
    const due = Date.parse(reset) - input.leadMinutes * 60000;
    await env.DB.prepare(
      'UPDATE reminders SET lead_minutes=?,next_due=?,reset_at=?,week_id=?,subscription_json=?,attempts=0 WHERE id=?',
    )
      .bind(
        input.leadMinutes,
        due,
        reset,
        weekBounds(Date.parse(reset) - 1).id,
        input.subscription ? JSON.stringify(input.subscription) : reminder.subscription_json,
        reminder.id,
      )
      .run();
    return json({ nextDue: due, resetAt: reset });
  }
  return json({ nextDue: reminder.next_due, resetAt: reminder.reset_at });
}
async function sendPush(env: Env, row: Record<string, unknown>) {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) throw new Error('VAPID is not configured.');
  const ttl = Math.max(
    0,
    Math.min(604800, Math.floor((Date.parse(String(row.reset_at)) - Date.now()) / 1000)),
  );
  await webpush.sendNotification(
    JSON.parse(String(row.subscription_json)),
    JSON.stringify({
      title: 'Record your alliance scores',
      body: "Save this week's points table before the weekly reset.",
      week: row.week_id,
      reset: row.reset_at,
      tag: 'snap-reset-' + row.week_id,
    }),
    {
      TTL: ttl,
      vapidDetails: {
        subject: env.VAPID_SUBJECT,
        publicKey: env.VAPID_PUBLIC_KEY,
        privateKey: env.VAPID_PRIVATE_KEY,
      },
      timeout: 10000,
    },
  );
}
export async function scheduled(env: Env) {
  const instant = Date.now();
  const jobs = await env.DB.prepare(
    'UPDATE reminders SET lease_until=? WHERE id IN (SELECT id FROM reminders WHERE next_due<=? AND lease_until<? AND attempts<3 ORDER BY next_due LIMIT 10) RETURNING *',
  )
    .bind(instant + 120000, instant, instant)
    .all<Record<string, unknown>>();
  for (const row of jobs.results) {
    const current = weekBounds();
    let delivered = false;
    try {
      if (Date.parse(String(row.reset_at)) > instant && row.sent_week !== row.week_id) {
        await sendPush(env, row);
        delivered = true;
      }
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await env.DB.prepare('DELETE FROM reminders WHERE id=?').bind(row.id).run();
        continue;
      }
      if (Number(row.attempts) >= 2) {
        const reset = new Date(
          Math.max(Date.parse(String(row.reset_at)) + 604800000, Date.parse(current.end)),
        ).toISOString();
        await env.DB.prepare(
          'UPDATE reminders SET reset_at=?,week_id=?,next_due=?,lease_until=0,attempts=0 WHERE id=?',
        )
          .bind(
            reset,
            weekBounds(Date.parse(reset) - 1).id,
            Date.parse(reset) - Number(row.lead_minutes) * 60000,
            row.id,
          )
          .run();
      } else
        await env.DB.prepare(
          'UPDATE reminders SET lease_until=0,attempts=attempts+1,next_due=? WHERE id=?',
        )
          .bind(instant + 60000 * Math.pow(2, Number(row.attempts)), row.id)
          .run();
      continue;
    }
    const reset =
      Date.parse(String(row.reset_at)) > instant
        ? new Date(Date.parse(String(row.reset_at)) + 604800000).toISOString()
        : current.end;
    await env.DB.prepare(
      'UPDATE reminders SET sent_week=?,next_due=?,reset_at=?,week_id=?,lease_until=0,attempts=0 WHERE id=?',
    )
      .bind(
        delivered ? row.week_id : row.sent_week,
        Date.parse(reset) - Number(row.lead_minutes) * 60000,
        reset,
        weekBounds(Date.parse(reset) - 1).id,
        row.id,
      )
      .run();
  }
  await env.DB.prepare('DELETE FROM rate_limits WHERE expires<?').bind(instant).run();
  await env.DB.prepare(
    'DELETE FROM join_requests WHERE invite_id IN (SELECT id FROM invites WHERE expires_at<?)',
  )
    .bind(instant)
    .run();
  await env.DB.prepare('DELETE FROM invites WHERE expires_at<?').bind(instant).run();
}
export default {
  async fetch(request: Request, env: Env) {
    try {
      return await handle(request, env);
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status);
      if (error instanceof z.ZodError || error instanceof SyntaxError)
        return json({ error: 'Invalid data. Check the fields and try again.' }, 400);
      return json(
        { error: 'Service temporarily unavailable. Your local data is still available.' },
        503,
      );
    }
  },
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(scheduled(env));
  },
};
