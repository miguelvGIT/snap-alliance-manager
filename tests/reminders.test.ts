import 'fake-indexeddb/auto';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { db, readDataset, readLocal, saveDataset, writeLocal } from '../src/data/store';
import {
  ReminderQueue,
  notificationState,
  readReminderCommand,
  type Reminder,
} from '../src/reminders/client';
import type { api } from '../src/sync/http';
import { exportBackup } from '../src/domain/transfer';
import { fixture } from './fixtures';

const confirmed = { nextDue: Date.parse('2026-11-03T18:00:00Z'), resetAt: '2026-11-03T19:00:00Z' };
const registration: Reminder = {
  id: 'local-reminder',
  token: 'device-secret-not-for-backup',
  leadMinutes: 30,
  ...confirmed,
};
let queue: ReminderQueue;
let send: ReturnType<typeof vi.fn>;
let unsubscribe: ReturnType<typeof vi.fn>;
beforeEach(async () => {
  await db.entries.clear();
  await db.operations.clear();
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(new Date('2026-10-28T12:00:00Z'));
  const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  const win = Object.assign(new EventTarget(), { PushManager: class {} });
  unsubscribe = vi.fn(async () => true);
  vi.stubGlobal('document', doc);
  vi.stubGlobal('window', win);
  vi.stubGlobal('navigator', {
    language: 'pt-PT',
    onLine: true,
    serviceWorker: {
      getRegistration: vi.fn(async () => ({
        pushManager: { getSubscription: vi.fn(async () => ({ unsubscribe })) },
      })),
    },
  });
  vi.stubGlobal('Notification', { permission: 'granted' });
  send = vi.fn(async () => confirmed);
  queue = new ReminderQueue(send as unknown as typeof api);
  await saveDataset(fixture(), null);
  await writeLocal('reminder', registration);
});
afterEach(() => {
  queue.stop();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('AC43: failed changes survive reopening and are confirmed after service recovery', async () => {
  send.mockRejectedValueOnce(new Error('Service unavailable'));
  const before = await readDataset();
  await queue.update(60);
  expect((await readReminderCommand())?.leadMinutes).toBe(60);
  expect((await readDataset())?.preferences.leadMinutes).toBe(30);
  queue.stop();
  queue = new ReminderQueue(send as unknown as typeof api);
  queue.start();
  await vi.advanceTimersByTimeAsync(15001);
  await vi.waitFor(async () => expect(await readReminderCommand()).toBeUndefined());
  expect((await readDataset())?.preferences.leadMinutes).toBe(60);
  expect((await readDataset())?.weeks).toEqual(before?.weeks);
  expect((await readLocal<Reminder>('reminder'))?.leadMinutes).toBe(60);
  expect(send.mock.calls.every((c) => c[0] === '/reminders')).toBe(true);
});

it('AC43 AC75: retries stop after three failures and resume on return without continuous polling', async () => {
  send.mockRejectedValue(new Error('Quota'));
  queue.start();
  await queue.update(15);
  await vi.waitFor(async () => expect((await readReminderCommand())?.error).toBe('Quota'));
  await vi.advanceTimersByTimeAsync(15001);
  await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(2));
  await vi.advanceTimersByTimeAsync(60001);
  await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(3));
  await vi.advanceTimersByTimeAsync(3600000);
  expect(send).toHaveBeenCalledTimes(3);
  send.mockResolvedValue(confirmed);
  window.dispatchEvent(new Event('focus'));
  await vi.waitFor(async () => expect(await readReminderCommand()).toBeUndefined());
  expect(send).toHaveBeenCalledTimes(4);
});

it('AC43 AC48: failed removal stops local delivery, persists, and can finish later', async () => {
  send.mockRejectedValueOnce(new Error('Network'));
  await queue.disable();
  expect(unsubscribe).toHaveBeenCalledOnce();
  expect((await readReminderCommand())?.kind).toBe('disable');
  expect(await readLocal('reminder')).toBeDefined();
  await expect(queue.update(15)).rejects.toThrow(/removal is pending/);
  await queue.retry();
  expect(await readReminderCommand()).toBeUndefined();
  expect(await readLocal('reminder')).toBeUndefined();
  expect(send.mock.calls[0][3]).toBe('DELETE');
});

it('AC43: an older response never discards a newer queued lead time', async () => {
  let finish!: (value: typeof confirmed) => void;
  send.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const first = queue.update(15);
  await vi.waitFor(() => expect(send).toHaveBeenCalledOnce());
  await queue.update(120);
  finish(confirmed);
  await first;
  expect((await readReminderCommand())?.leadMinutes).toBe(120);
  await queue.run();
  expect(await readReminderCommand()).toBeUndefined();
  expect((await readDataset())?.preferences.leadMinutes).toBe(120);
});

it('AC43: disabling supersedes a failed lead-time change without applying its unconfirmed preference', async () => {
  send.mockRejectedValueOnce(new Error('Network'));
  await queue.update(15);
  await queue.disable();
  expect(await readReminderCommand()).toBeUndefined();
  expect(await readLocal('reminder')).toBeUndefined();
  expect((await readDataset())?.preferences.leadMinutes).toBe(30);
  expect(send.mock.calls.map((call) => call[3])).toEqual(['PUT', 'DELETE']);
});

it.each([0, -1, 1.5, 10080])('AC40: invalid lead time %s is never queued or sent', async (lead) => {
  await expect(queue.update(lead)).rejects.toThrow(/whole number/);
  expect(await readReminderCommand()).toBeUndefined();
  expect(send).not.toHaveBeenCalled();
});

it('AC43 AC65: hidden or disconnected devices keep pending commands without sending', async () => {
  Object.assign(document, { visibilityState: 'hidden' });
  await queue.update(120);
  queue.start();
  await vi.advanceTimersByTimeAsync(60000);
  expect(send).not.toHaveBeenCalled();
  Object.assign(document, { visibilityState: 'visible' });
  Object.assign(navigator, { onLine: false });
  window.dispatchEvent(new Event('focus'));
  await vi.advanceTimersByTimeAsync(1000);
  expect(send).not.toHaveBeenCalled();
  Object.assign(navigator, { onLine: true });
  window.dispatchEvent(new Event('online'));
  await vi.waitFor(async () => expect(await readReminderCommand()).toBeUndefined());
  expect(send).toHaveBeenCalledOnce();
});

it('AC37 AC43: storage failure cannot produce a remote change or false confirmation', async () => {
  vi.spyOn(db.entries, 'put').mockRejectedValueOnce(new DOMException('Full', 'QuotaExceededError'));
  await expect(queue.update(15)).rejects.toThrow('Full');
  expect(send).not.toHaveBeenCalled();
  expect((await readDataset())?.preferences.leadMinutes).toBe(30);
});

it('AC46: permission is read again and revocation is visible without a new prompt', async () => {
  expect(await notificationState()).toEqual({ permission: 'granted', subscribed: true });
  Object.assign(Notification, { permission: 'denied' });
  expect((await notificationState()).permission).toBe('denied');
  vi.stubGlobal('Notification', undefined);
  expect(await notificationState()).toEqual({ permission: 'unsupported', subscribed: false });
});

it('AC72: pending reminder commands and credentials do not enter the transferable backup', async () => {
  send.mockRejectedValue(new Error('Network'));
  await queue.update(60);
  const serialized = exportBackup((await readDataset())!);
  expect(serialized).not.toContain(registration.token);
  expect(serialized).not.toContain('reminder-command');
  expect(serialized).not.toContain('registration');
});
