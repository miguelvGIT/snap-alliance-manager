import { test, expect } from '@playwright/test';

test('AC58 AC69: file transfer stays free and automatic sync is absent from the MVP', async ({
  page,
}) => {
  const calls: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) calls.push(request.url());
  });
  await page.clock.install({ time: new Date('2026-10-28T12:00:00Z') });
  await page.goto('/');
  await page.getByLabel('Alliance name', { exact: true }).fill('Local only');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('snap-alliance');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction('entries', 'readwrite');
          tx.objectStore('entries').put({
            key: 'sync',
            value: {
              spaceId: 'old-prototype',
              deviceId: 'old-device',
              token: 'local-test-only-token',
              cursor: 0,
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
  await page.reload();
  await page.goto('/#settings');
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Linked devices' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Enable sync', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Export all data', exact: true })).toBeVisible();
  await page.clock.runFor(65000);
  expect(calls).toEqual([]);
});
