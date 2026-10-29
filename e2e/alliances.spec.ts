import { test, expect, type Page } from '@playwright/test';
import { fixture } from '../tests/fixtures';
import { exportBackup, readBackup } from '../src/domain/transfer';
import { scoreImage } from './image-fixture';
async function start(page: Page) {
  await page.clock.install({ time: new Date('2026-10-29T12:00:00Z') });
  const data = fixture();
  await page.goto('/');
  await page.getByLabel('Already have a backup? Import data').setInputFiles({
    name: 'fictional.json',
    mimeType: 'application/json',
    buffer: Buffer.from(exportBackup(data)),
  });
  await page.getByRole('button', { name: 'Confirm import', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Test alliance', exact: true })).toBeVisible();
  await page.goto('/#settings');
  return data;
}
async function change(page: Page, name: string, mode: 'archive' | 'delete' = 'archive') {
  await page.getByRole('button', { name: 'Change alliance', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Change alliance', exact: true });
  await dialog.getByLabel('New alliance name', { exact: true }).fill(name);
  await dialog
    .getByLabel(mode === 'archive' ? 'Archive current alliance' : 'Delete current alliance data', {
      exact: true,
    })
    .check();
  await expect(dialog).toContainText('every tab of this browser');
  await dialog.getByLabel('I understand and confirm this change', { exact: true }).check();
  return dialog;
}
async function readDownload(download: import('@playwright/test').Download) {
  let text = '';
  for await (const chunk of (await download.createReadStream())!) text += chunk.toString();
  return readBackup(text).dataset;
}
test('AC91 AC92: change confirmation, archive export, restore and archive deletion preserve history', async ({
  page,
}, info) => {
  const original = await start(page);
  await page.getByRole('button', { name: 'Change alliance', exact: true }).click();
  let modal = page.getByRole('dialog', { name: 'Change alliance', exact: true });
  await modal.getByLabel('New alliance name', { exact: true }).fill('Second team');
  await expect(
    modal.getByRole('button', { name: 'Archive and change alliance', exact: true }),
  ).toBeDisabled();
  await modal.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByLabel('Alliance name', { exact: true })).toHaveValue(
    original.alliance.name,
  );
  modal = await change(page, 'Second team');
  await page.screenshot({
    path: info.outputPath('change-alliance-confirmation.png'),
    fullPage: true,
  });
  await modal.getByRole('button', { name: 'Archive and change alliance', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Second team', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your history starts here' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Second team', exact: true })).toBeVisible();
  await page.goto('/#settings');
  const old = page
    .getByRole('listitem')
    .filter({ has: page.getByText('Test alliance', { exact: true }) });
  await expect(old).toBeVisible();
  const downloading = page.waitForEvent('download');
  await old.getByRole('button', { name: 'Export archive', exact: true }).click();
  expect(await readDownload(await downloading)).toEqual(original);
  await old.getByRole('button', { name: 'Restore alliance', exact: true }).click();
  modal = page.getByRole('dialog', { name: 'Restore archived alliance?', exact: true });
  await expect(
    modal.getByRole('button', { name: 'Archive current and restore', exact: true }),
  ).toBeDisabled();
  await modal.getByLabel('I understand and confirm this change', { exact: true }).check();
  await modal.getByRole('button', { name: 'Archive current and restore', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Test alliance', exact: true })).toBeVisible();
  await expect(page.getByText('ana.discord', { exact: true })).toBeVisible();
  await page.goto('/#settings');
  const second = page
    .getByRole('listitem')
    .filter({ has: page.getByText('Second team', { exact: true }) });
  await second.getByRole('button', { name: 'Delete archive', exact: true }).click();
  modal = page.getByRole('dialog', { name: 'Delete archived alliance?', exact: true });
  await expect(modal.getByRole('button', { name: 'Delete archive', exact: true })).toBeDisabled();
  await modal.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(second).toBeVisible();
  await second.getByRole('button', { name: 'Delete archive', exact: true }).click();
  modal = page.getByRole('dialog', { name: 'Delete archived alliance?', exact: true });
  await modal.getByLabel('I confirm deleting this archive', { exact: true }).check();
  await modal.getByRole('button', { name: 'Delete archive', exact: true }).click();
  await expect(second).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('active alliance is unchanged');
  await page.screenshot({ path: info.outputPath('alliance-settings.png'), fullPage: true });
});
test('AC91: deleting current alliance requires a warning and confirmation and starts empty', async ({
  page,
}) => {
  await start(page);
  let modal = await change(page, 'Fresh team', 'delete');
  await expect(modal).toContainText('This cannot be undone here');
  await expect(modal).toContainText('Previously exported files');
  await modal.getByLabel('Archive current alliance', { exact: true }).check();
  await modal.getByLabel('Delete current alliance data', { exact: true }).check();
  await expect(
    modal.getByRole('button', { name: 'Delete data and change alliance', exact: true }),
  ).toBeDisabled();
  await modal.getByLabel('I understand and confirm this change', { exact: true }).check();
  await modal.getByRole('button', { name: 'Delete data and change alliance', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Fresh team', exact: true })).toBeVisible();
  await page.goto('/#settings');
  await expect(
    page.getByText('No archived alliances on this device.', { exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export current alliance', exact: true }).click();
  const data = await readDownload(await download);
  expect(data.alliance.name).toBe('Fresh team');
  expect(data.players).toEqual([]);
  expect(data.weeks).toEqual([]);
  expect(data.revisions).toEqual([]);
  await page.getByText('Recover the previous copy on this device', { exact: true }).click();
  await page.getByRole('button', { name: 'Review previous copy', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('There is no previous copy');
});
test('AC91 AC93: changing alliance clears another tab’s old review without sending player data', async ({
  page,
}) => {
  test.setTimeout(120000);
  await start(page);
  const other = await page.context().newPage();
  await other.goto(new URL('/#week', page.url()).href);
  await other.getByLabel('Add images', { exact: true }).setInputFiles({
    name: 'fictional.png',
    mimeType: 'image/png',
    buffer: await scoreImage(other, [['Ana', '3100']]),
  });
  await other.getByRole('button', { name: 'Read image', exact: true }).click();
  await expect(other.getByLabel('Observed name · row 1', { exact: true })).toBeVisible({
    timeout: 90000,
  });
  const writes: string[] = [];
  page.context().on('request', (request) => {
    if (['POST', 'PUT', 'DELETE'].includes(request.method())) writes.push(request.url());
  });
  const modal = await change(page, 'Other team');
  await modal.getByRole('button', { name: 'Archive and change alliance', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Other team', exact: true })).toBeVisible();
  await expect(
    other.getByText('Review and save weekly scores for Other team.', { exact: true }),
  ).toBeVisible();
  await expect(other.getByLabel('Observed name · row 1', { exact: true })).toHaveCount(0);
  await other.goto(new URL('/#overview', page.url()).href);
  await expect(other.getByRole('heading', { name: 'Other team', exact: true })).toBeVisible();
  await expect(other.getByRole('heading', { name: 'Your history starts here' })).toBeVisible();
  expect(writes).toEqual([]);
  await other.close();
});
