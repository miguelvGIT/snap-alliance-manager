import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { readFile, readdir } from 'node:fs/promises';
import worker, { scheduled } from '../worker/index';
import { fixture } from './fixtures';
import { uuid } from '../src/domain/model';
import webpush from 'web-push';
let platform: Awaited<ReturnType<typeof getPlatformProxy>>;
let env: Parameters<typeof worker.fetch>[1];
const request = async (path: string, input?: unknown, token?: string, method?: string) =>
  worker.fetch(
    new Request('http://localhost' + path, {
      method: method ?? (input === undefined ? 'GET' : 'POST'),
      headers: {
        ...(input === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: input === undefined ? undefined : JSON.stringify(input),
    }),
    env,
  );
beforeAll(async () => {
  platform = await getPlatformProxy({ configPath: 'wrangler.jsonc', persist: false });
  env = {
    DB: (platform.env as { DB: Parameters<typeof worker.fetch>[1]['DB'] }).DB,
    ASSETS: { fetch: async () => new Response('asset') } as unknown as Parameters<
      typeof worker.fetch
    >[1]['ASSETS'],
    APP_ORIGIN: 'http://localhost',
    VAPID_SUBJECT: 'mailto:local@example.invalid',
    SYNC_PREVIEW: 'true',
  };
  for (const migration of (await readdir('worker/migrations'))
    .filter((name) => name.endsWith('.sql'))
    .sort()) {
    await env.DB.exec(await readFile('worker/migrations/' + migration, 'utf8'));
  }
}, 30000);
afterAll(async () => {
  await platform?.dispose();
});
type Creds = {
  spaceId: string;
  deviceId: string;
  token: string;
  recoveryKey: string;
  heads: Record<string, string>;
  cursor: number;
};
async function space() {
  const response = await request('/api/spaces', { dataset: fixture() });
  expect(response.status).toBe(201);
  return response.json() as Promise<Creds>;
}
describe('API local com D1 real', () => {
  it('AC58 AC69: the MVP rejects sync endpoints, including direct requests', async () => {
    delete env.SYNC_PREVIEW;
    try {
      for (const path of [
        '/api/spaces',
        '/api/spaces/example/snapshot',
        '/api/join',
        '/api/join/claim',
        '/api/recover',
      ]) {
        expect((await request(path, {})).status).toBe(404);
      }
      expect((await request('/api/config')).status).toBe(200);
      env.SYNC_PREVIEW = 'true';
      const remote = await worker.fetch(
        new Request('https://example.invalid/api/spaces', { method: 'POST' }),
        env,
      );
      expect(remote.status).toBe(404);
    } finally {
      env.SYNC_PREVIEW = 'true';
    }
  });
  it('AC59 AC33: só os dispositivos autorizados leem o espaço', async () => {
    const a = await space(),
      b = await space();
    expect((await request('/api/spaces/' + a.spaceId + '/snapshot')).status).toBe(401);
    expect(
      (await request('/api/spaces/' + a.spaceId + '/snapshot', undefined, b.token)).status,
    ).toBe(403);
    const response = await request('/api/spaces/' + a.spaceId + '/snapshot', undefined, a.token);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { dataset: { players: unknown[] } };
    expect(body.dataset.players).toHaveLength(5);
  });
  it('AC60 AC61: convite precisa de aprovação e funciona só uma vez', async () => {
    const a = await space();
    const invite = (await (
      await request('/api/spaces/' + a.spaceId + '/invites', {}, a.token)
    ).json()) as { code: string };
    const join = (await (
      await request('/api/join', { code: invite.code, label: 'Telefone de teste' })
    ).json()) as { requestId: string; claimSecret: string };
    const claim = { ...join, deviceToken: 'Z'.repeat(43), deviceId: uuid() };
    expect(
      ((await (await request('/api/join/claim', claim)).json()) as { pending: boolean }).pending,
    ).toBe(true);
    expect(
      (await request('/api/spaces/' + a.spaceId + '/approve/' + join.requestId, {}, a.token))
        .status,
    ).toBe(200);
    const granted = (await (await request('/api/join/claim', claim)).json()) as Creds;
    expect(granted.token).toBe(claim.deviceToken);
    expect((await request('/api/join/claim', claim)).status).toBe(403);
    expect(
      (await request('/api/spaces/' + a.spaceId + '/snapshot', undefined, granted.token)).status,
    ).toBe(200);
    await request(
      '/api/spaces/' + a.spaceId + '/devices/' + granted.deviceId,
      undefined,
      a.token,
      'DELETE',
    );
    expect(
      (await request('/api/spaces/' + a.spaceId + '/snapshot', undefined, granted.token)).status,
    ).toBe(403);
  });
  it('AC28 AC31 AC32: operações idempotentes conservam as revisões em conflito', async () => {
    const a = await space(),
      path = '/api/spaces/' + a.spaceId + '/sync';
    const value = { id: uuid(), name: 'Initial name', minimum: 2700, goal: 80000 };
    const op = {
      id: uuid(),
      key: 'alliance',
      base: a.heads.alliance,
      value,
      revisions: [],
      at: new Date().toISOString(),
    };
    const first = await request(path, { cursor: a.cursor, operations: [op] }, a.token);
    expect(first.status).toBe(200);
    const repeat = await request(path, { cursor: a.cursor, operations: [op] }, a.token);
    expect(repeat.status).toBe(200);
    const conflict = { ...op, id: uuid(), value: { ...value, name: 'Second version' } };
    const reply = (await (
      await request(path, { cursor: a.cursor, operations: [conflict] }, a.token)
    ).json()) as { changes: { operation: { id: string }; conflict: boolean }[] };
    expect(reply.changes.filter((change) => change.operation.id === op.id)).toHaveLength(1);
    expect(reply.changes.find((change) => change.operation.id === conflict.id)?.conflict).toBe(
      true,
    );
    const snapshot = (await (
      await request('/api/spaces/' + a.spaceId + '/snapshot', undefined, a.token)
    ).json()) as { dataset: { alliance: { name: string } } };
    expect(snapshot.dataset.alliance.name).toBe('Initial name');
  });
  it('AC62: recuperação exige a chave própria', async () => {
    const a = await space();
    expect(
      (await request('/api/recover', { spaceId: a.spaceId, recoveryKey: 'errada', label: 'Teste' }))
        .status,
    ).toBe(403);
    expect(
      (
        await request('/api/recover', {
          spaceId: a.spaceId,
          recoveryKey: a.recoveryKey,
          label: 'Recuperado',
        })
      ).status,
    ).toBe(200);
  });
  it('AC65: notificações são independentes de sincronização e rejeitam destinos internos', async () => {
    const subscription = {
      endpoint: 'http://127.0.0.1/private',
      keys: { p256dh: 'key', auth: 'key' },
      expirationTime: null,
    };
    expect((await request('/api/reminders', { subscription, leadMinutes: 30 })).status).toBe(400);
    expect((await request('/api/config')).status).toBe(200);
  });
  it('AC03: API rejeita entidade inválida sem alterar o espaço', async () => {
    const a = await space();
    const op = {
      id: uuid(),
      key: 'alliance',
      base: a.heads.alliance,
      value: { id: uuid(), name: 'Inválido', minimum: -1, goal: 80000 },
      revisions: [],
      at: new Date().toISOString(),
    };
    expect(
      (
        await request(
          '/api/spaces/' + a.spaceId + '/sync',
          { cursor: a.cursor, operations: [op] },
          a.token,
        )
      ).status,
    ).toBe(400);
  });
  it('AC39 AC41 AC44 AC65: agendamento independente e deduplicação semanal, com envio simulado', async () => {
    const send = vi
      .spyOn(webpush, 'sendNotification')
      .mockResolvedValue({ statusCode: 201, headers: {}, body: '' });
    const keys = webpush.generateVAPIDKeys();
    env.VAPID_PUBLIC_KEY = keys.publicKey;
    env.VAPID_PRIVATE_KEY = keys.privateKey;
    const response = await request('/api/reminders', {
      subscription: {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test-only',
        keys: { p256dh: 'test', auth: 'test' },
      },
      leadMinutes: 30,
    });
    expect(response.status).toBe(201);
    const reminder = (await response.json()) as { id: string; token: string };
    await env.DB.prepare('UPDATE reminders SET next_due=? WHERE id=?')
      .bind(Date.now() - 1, reminder.id)
      .run();
    await scheduled(env);
    await scheduled(env);
    expect(send).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(send.mock.calls[0][1]));
    expect(payload.body).not.toContain('Ana');
    expect(payload.reset).toBeTruthy();
    expect(send.mock.calls[0][2]?.TTL).toBeGreaterThan(0);
    const row = await env.DB.prepare('SELECT * FROM reminders WHERE id=?')
      .bind(reminder.id)
      .first<Record<string, unknown>>();
    expect(row?.sent_week).toBe(payload.week);
    expect(row?.next_due).toBeGreaterThan(Date.now());
    send.mockRestore();
    delete env.VAPID_PRIVATE_KEY;
    delete env.VAPID_PUBLIC_KEY;
  });
  it('AC43 AC50: ativação tardia agenda a recorrência seguinte, sem envio retroativo', async () => {
    const keys = webpush.generateVAPIDKeys();
    env.VAPID_PUBLIC_KEY = keys.publicKey;
    env.VAPID_PRIVATE_KEY = keys.privateKey;
    const response = await request('/api/reminders', {
      subscription: {
        endpoint: 'https://fcm.googleapis.com/fcm/send/late-test',
        keys: { p256dh: 'test', auth: 'test' },
      },
      leadMinutes: 10079,
    });
    expect(response.status).toBe(201);
    const reminder = (await response.json()) as { nextDue: number };
    expect(reminder.nextDue).toBeGreaterThan(Date.now());
    delete env.VAPID_PRIVATE_KEY;
    delete env.VAPID_PUBLIC_KEY;
  });
});
