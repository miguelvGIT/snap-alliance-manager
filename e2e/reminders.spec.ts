import { test, expect, type Page } from '@playwright/test';
import { fixture } from '../tests/fixtures';
import { exportBackup } from '../src/domain/transfer';

async function prepare(page: Page) {
  await page.clock.install({ time: new Date('2026-10-28T12:00:00Z') });
  await page.addInitScript(() => {
    const state = {
      permission: 'granted',
      subscribed: sessionStorage.getItem('test-push-disabled') !== 'true',
    };
    (window as unknown as { reminderTest: typeof state }).reminderTest = state;
    const subscription = {
      unsubscribe: async () => {
        state.subscribed = false;
        sessionStorage.setItem('test-push-disabled', 'true');
        return true;
      },
    };
    const registration = {
      pushManager: { getSubscription: async () => (state.subscribed ? subscription : null) },
    };
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: {
        get permission() {
          return state.permission;
        },
        requestPermission: async () => state.permission,
      },
    });
    Object.defineProperty(window, 'PushManager', { configurable: true, value: function () {} });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        getRegistration: async () => registration,
        register: async () => registration,
        ready: Promise.resolve(registration),
      },
    });
  });
  await page.goto('/');
  await page.getByLabel('Already have a backup? Import data').setInputFiles({
    name: 'fictional.json',
    mimeType: 'application/json',
    buffer: Buffer.from(exportBackup(fixture())),
  });
  await page.getByRole('button', { name: 'Confirm import', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Test alliance', exact: true })).toBeVisible();
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('snap-alliance');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction('entries', 'readwrite');
          tx.objectStore('entries').put({
            key: 'reminder',
            value: {
              id: 'test-reminder',
              token: 'test-only-device-credential',
              leadMinutes: 30,
              nextDue: Date.parse('2026-11-03T18:30:00Z'),
              resetAt: '2026-11-03T19:00:00Z',
            },
          });
          tx.oncomplete = () => {
            open.result.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
  await page.goto('/#settings');
  await expect(page.getByRole('button', { name: 'Save lead time', exact: true })).toBeVisible();
}

test('AC43 AC46: pending changes survive reopening and permission revocation is reflected', async ({
  page,
}, info) => {
  let available = false;
  const bodies: unknown[] = [];
  await page.route('**/api/**', async (route) => {
    expect(new URL(route.request().url()).pathname).toBe('/api/reminders');
    expect(route.request().method()).toBe('PUT');
    bodies.push(route.request().postDataJSON());
    if (!available) return route.abort('failed');
    await route.fulfill({
      json: { nextDue: Date.parse('2026-11-03T18:00:00Z'), resetAt: '2026-11-03T19:00:00Z' },
    });
  });
  await prepare(page);
  await page.getByLabel('Lead time in minutes').fill('60');
  await page.getByRole('button', { name: 'Save lead time', exact: true }).click();
  await expect(page.getByText(/The service has not confirmed the new schedule yet/)).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Lead time in minutes')).toHaveValue('60');
  await page.evaluate(() => {
    (window as unknown as { reminderTest: { permission: string } }).reminderTest.permission =
      'denied';
    window.dispatchEvent(new Event('focus'));
  });
  await expect(page.getByText(/Notifications are blocked in your browser settings/)).toBeVisible();
  await expect(page.getByText(/Last confirmed schedule:/)).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Send test notification', exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Export calendar reminder' })).toBeVisible();
  await page.screenshot({
    path: 'test-results/reminders-pending-' + info.project.name + '.png',
    fullPage: true,
  });
  available = true;
  await page.evaluate(() => {
    (window as unknown as { reminderTest: { permission: string } }).reminderTest.permission =
      'granted';
    window.dispatchEvent(new Event('focus'));
  });
  await page.getByRole('button', { name: 'Retry pending change', exact: true }).click();
  await expect(page.getByText(/The service has not confirmed the new schedule yet/)).toHaveCount(0);
  await expect(page.getByText(/Last confirmed schedule:/)).toContainText('18:00');
  expect(bodies.every((body) => JSON.stringify(body) === '{"leadMinutes":60}')).toBe(true);
  await page.goto('/#overview');
  await expect(page.getByText('ana.discord', { exact: true })).toBeVisible();
});

test('AC43 AC48: a failed disable remains pending until confirmed and preserves local history', async ({
  page,
}, info) => {
  let available = false;
  await page.route('**/api/**', async (route) => {
    expect(new URL(route.request().url()).pathname).toBe('/api/reminders');
    expect(route.request().method()).toBe('DELETE');
    if (!available) return route.abort('failed');
    await route.fulfill({ json: { ok: true } });
  });
  await prepare(page);
  await page.getByRole('button', { name: 'Disable reminders', exact: true }).click();
  await expect(page.getByText(/Reminder removal is pending/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Reminder removal is pending/)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Enable on this device', exact: true }),
  ).toBeDisabled();
  available = true;
  await page.getByRole('button', { name: 'Retry pending change', exact: true }).click();
  await expect(page.getByText(/Reminder removal is pending/)).toHaveCount(0);
  await expect(page.getByText(/Last confirmed schedule:/)).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Enable on this device', exact: true }),
  ).toBeEnabled();
  await page.screenshot({
    path: 'test-results/reminders-removed-' + info.project.name + '.png',
    fullPage: true,
  });
  await page.goto('/#overview');
  await expect(page.getByText('ana.discord', { exact: true })).toBeVisible();
});
