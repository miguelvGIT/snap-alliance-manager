import { db, readDataset, readLocal, saveDataset, writeLocal } from '../data/store';
import { change } from '../domain/actions';
import { uuid, type Dataset } from '../domain/model';
import { api } from '../sync/http';

export type Reminder = {
  id: string;
  token: string;
  nextDue: number;
  resetAt: string;
  leadMinutes?: number;
};
export type ReminderCommand = {
  id: string;
  kind: 'update' | 'disable';
  registration: Pick<Reminder, 'id' | 'token'>;
  leadMinutes?: number;
  subscription?: PushSubscriptionJSON;
  attempts: number;
  nextAttemptAt: number;
  error?: string;
};
export const REMINDER_CHANGED = 'alliance-reminder-changed';
export const readReminderCommand = () => readLocal<ReminderCommand>('reminder-command');
type Transport = typeof api;

// This device-only queue never contains player tables and is excluded from backups.
export class ReminderQueue {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private busy = false;
  private active = false;
  private lastRestart = -Infinity;
  private onDataset: ((data: Dataset) => void) | undefined;
  constructor(private transport: Transport = api) {}
  start(onDataset?: (data: Dataset) => void) {
    this.onDataset = onDataset;
    this.active = true;
    window.addEventListener('focus', this.resume);
    window.addEventListener('online', this.resume);
    document.addEventListener('visibilitychange', this.resume);
    this.resume();
  }
  stop() {
    this.active = false;
    clearTimeout(this.timer);
    window.removeEventListener('focus', this.resume);
    window.removeEventListener('online', this.resume);
    document.removeEventListener('visibilitychange', this.resume);
  }
  private notify() {
    window.dispatchEvent(new Event(REMINDER_CHANGED));
  }
  private resume = () => {
    void this.restartIfNeeded().catch(() => {});
  };
  private async restartIfNeeded() {
    if (document.visibilityState !== 'visible') return;
    await db.transaction('rw', db.entries, async () => {
      const pending = await readReminderCommand();
      if (pending && pending.attempts >= 3 && Date.now() - this.lastRestart >= 30000) {
        this.lastRestart = Date.now();
        await writeLocal('reminder-command', { ...pending, attempts: 0, nextAttemptAt: 0 });
      }
    });
    await this.run();
  }
  async update(leadMinutes: number, subscription?: PushSubscriptionJSON) {
    if (!Number.isInteger(leadMinutes) || leadMinutes < 1 || leadMinutes > 10079)
      throw new Error('Choose a whole number between 1 and 10,079 minutes.');
    await this.queue('update', leadMinutes, subscription);
    await this.run();
  }
  async disable() {
    await this.queue('disable');
    // Stop this browser's delivery even while the remote removal is waiting.
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      await (await registration?.pushManager.getSubscription())?.unsubscribe();
    } catch {
      /* The pending remote removal still has to be processed. */
    }
    await this.run();
  }
  private async queue(
    kind: ReminderCommand['kind'],
    leadMinutes?: number,
    subscription?: PushSubscriptionJSON,
  ) {
    await db.transaction('rw', db.entries, async () => {
      const reminder = await readLocal<Reminder>('reminder');
      if (!reminder) throw new Error('Enable reminders on this device first.');
      if (kind === 'update' && (await readReminderCommand())?.kind === 'disable')
        throw new Error('A reminder removal is pending. Retry it before enabling reminders again.');
      const command: ReminderCommand = {
        id: uuid(),
        kind,
        registration: { id: reminder.id, token: reminder.token },
        leadMinutes,
        subscription,
        attempts: 0,
        nextAttemptAt: 0,
      };
      await writeLocal('reminder-command', command);
    });
    this.notify();
  }
  async retry() {
    await db.transaction('rw', db.entries, async () => {
      const pending = await readReminderCommand();
      if (pending)
        await writeLocal('reminder-command', { ...pending, attempts: 0, nextAttemptAt: 0 });
    });
    await this.run();
  }
  async run() {
    if (this.busy || document.visibilityState !== 'visible' || navigator.onLine === false) return;
    this.busy = true;
    try {
      const work = async () => {
        const command = await readReminderCommand();
        if (!command || command.attempts >= 3 || command.nextAttemptAt > Date.now()) return;
        const reminder = await readLocal<Reminder>('reminder');
        if (
          reminder?.id !== command.registration.id ||
          reminder.token !== command.registration.token
        ) {
          await db.transaction('rw', db.entries, async () => {
            if ((await readReminderCommand())?.id === command.id)
              await db.entries.delete('reminder-command');
          });
          return;
        }
        const attempt = { ...command, error: undefined, attempts: command.attempts + 1 };
        let claimed = false;
        await db.transaction('rw', db.entries, async () => {
          if ((await readReminderCommand())?.id === command.id) {
            await writeLocal('reminder-command', attempt);
            claimed = true;
          }
        });
        if (!claimed) return;
        this.notify();
        try {
          const result =
            command.kind === 'disable'
              ? await this.transport<{ ok: boolean }>(
                  '/reminders',
                  undefined,
                  reminder.token,
                  'DELETE',
                )
              : await this.transport<{ nextDue: number; resetAt: string }>(
                  '/reminders',
                  {
                    leadMinutes: command.leadMinutes,
                    ...(command.subscription ? { subscription: command.subscription } : {}),
                  },
                  reminder.token,
                  'PUT',
                );
          let updated: Dataset | undefined;
          await db.transaction('rw', db.entries, db.operations, async () => {
            const current = await readLocal<Reminder>('reminder');
            if (current?.id !== reminder.id || current.token !== reminder.token) return;
            const latest = await readReminderCommand();
            if (command.kind === 'disable') await db.entries.delete('reminder');
            else {
              await writeLocal('reminder', {
                ...current,
                ...result,
                leadMinutes: command.leadMinutes,
              });
              const data = await readDataset();
              if (data) {
                updated = change(data, 'preferences', 'Reminder schedule confirmed', (draft) => {
                  draft.preferences.leadMinutes = command.leadMinutes!;
                });
                await saveDataset(updated, data);
              }
            }
            if (latest?.id === command.id) await db.entries.delete('reminder-command');
          });
          if (updated) this.onDataset?.(updated);
        } catch (error) {
          await db.transaction('rw', db.entries, async () => {
            if ((await readReminderCommand())?.id === command.id)
              await writeLocal('reminder-command', {
                ...attempt,
                error: (error as Error).message,
                nextAttemptAt: Date.now() + (attempt.attempts === 1 ? 15000 : 60000),
              });
          });
        }
      };
      if (navigator.locks)
        await navigator.locks.request(
          'alliance-reminder-command',
          { ifAvailable: true },
          async (lock) => {
            if (lock) await work();
          },
        );
      else await work();
    } finally {
      this.busy = false;
      this.notify();
      clearTimeout(this.timer);
      const pending = await readReminderCommand();
      if (this.active && pending && pending.attempts < 3 && document.visibilityState === 'visible')
        this.timer = setTimeout(
          () => {
            void this.run().catch(() => {});
          },
          Math.max(1000, pending.nextAttemptAt - Date.now()),
        );
    }
  }
}
export const reminderQueue = new ReminderQueue();

export async function notificationState() {
  if (
    typeof Notification === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  )
    return { permission: 'unsupported' as const, subscribed: false };
  const permission = Notification.permission;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    return { permission, subscribed: !!(await registration?.pushManager.getSubscription()) };
  } catch {
    return { permission, subscribed: false };
  }
}
