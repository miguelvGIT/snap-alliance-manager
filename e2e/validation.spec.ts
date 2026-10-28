import { test, expect, type Page } from '@playwright/test';
import { fixture } from '../tests/fixtures';
import { exportBackup, readBackup } from '../src/domain/transfer';
import { scoreImage } from './image-fixture';
async function open(page: Page) {
  await page.clock.install({ time: new Date('2026-10-28T12:00:00Z') });
  const data = fixture();
  data.players = data.players.slice(0, 1);
  data.weeks = [];
  await page.goto('/');
  await page
    .getByLabel('Already have a backup? Import data')
    .setInputFiles({
      name: 'fictional.json',
      mimeType: 'application/json',
      buffer: Buffer.from(exportBackup(data)),
    });
  await page.getByRole('button', { name: 'Confirm import', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Test alliance', exact: true })).toBeVisible();
  await page.goto('/#week');
}
async function read(page: Page, name = 'Ana') {
  await page
    .getByLabel('Add images', { exact: true })
    .setInputFiles({
      name: 'fictional.png',
      mimeType: 'image/png',
      buffer: await scoreImage(page, [[name, '3100']]),
    });
  await page.getByRole('button', { name: 'Read image', exact: true }).click();
  await expect(page.getByLabel('Observed name · row 1', { exact: true })).toBeVisible({
    timeout: 90000,
  });
}
test('AC07 AC15 AC27: validation saves the current review, confirms it and survives reopening', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await open(page);
  await read(page);
  await page.getByRole('button', { name: 'Confirm recognized current names', exact: true }).click();
  await page.getByLabel('I confirm this list is complete').check();
  await page.getByRole('button', { name: 'Validate week', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Validate week', exact: true });
  await expect(modal).toContainText('Your current review will be saved');
  await modal.getByRole('button', { name: 'Confirm validation', exact: true }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText(
    'Week validated. 1 score saved on this device.',
  );
  await expect(page.getByRole('status')).toBeFocused();
  const saved = page.getByRole('row').filter({ has: page.getByText('Ana', { exact: true }) });
  await expect(saved.locator('td').nth(1)).toHaveText(/3.?100/);
  await page.screenshot({ path: info.outputPath('week-validated.png'), fullPage: true });
  await page.getByRole('link', { name: 'View overview', exact: true }).click();
  await expect(page.getByRole('progressbar', { name: 'Alliance points' })).toHaveAttribute(
    'aria-valuenow',
    '3100',
  );
  await expect(page.getByText('0 completed weeks', { exact: false })).toBeVisible();
  await expect(page.getByText(/Scores are saved for the current week/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole('progressbar', { name: 'Alliance points' })).toHaveAttribute(
    'aria-valuenow',
    '3100',
  );
  await page.goto('/#settings');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export all data', exact: true }).click();
  let text = '';
  for await (const chunk of (await (await download).createReadStream())!) text += chunk.toString();
  const restored = readBackup(text).dataset;
  expect(restored.weeks).toHaveLength(1);
  expect(restored.weeks[0].status).toBe('validated');
  expect(restored.weeks[0].results[restored.players[0].id].points).toBe(3100);
});
test('AC27 AC85: empty and unassigned reviews are blocked with actionable feedback', async ({
  page,
}) => {
  test.setTimeout(120000);
  await open(page);
  await page.getByRole('button', { name: 'Validate week', exact: true }).click();
  let modal = page.getByRole('dialog', { name: 'Validate week', exact: true });
  await expect(modal).toContainText('No scores are ready');
  await modal.getByLabel('I confirm validation as incomplete if any data is missing').check();
  await expect(modal.getByRole('button', { name: 'Confirm validation' })).toBeDisabled();
  await modal.getByRole('button', { name: 'Return to review' }).click();
  await read(page, 'Nova');
  await page.getByRole('button', { name: 'Validate week', exact: true }).click();
  modal = page.getByRole('dialog', { name: 'Validate week', exact: true });
  await expect(modal).toContainText('1 row still needs a player assignment');
  await expect(modal.getByRole('button', { name: 'Confirm validation' })).toBeDisabled();
  await modal.getByRole('button', { name: 'Return to review' }).click();
  await expect(page.getByLabel('Observed name · row 1', { exact: true })).toHaveValue('Nova');
});
test('AC10 AC67: date shortcut uses local time and changing weeks protects images and reviews', async ({
  page,
  browser,
}) => {
  test.setTimeout(120000);
  await open(page);
  await page
    .getByRole('combobox', { name: 'Week', exact: true })
    .selectOption('2026-10-20T19:00:00.000Z');
  await read(page, 'Nova');
  await page.getByRole('button', { name: 'New player', exact: true }).click();
  const add = page.getByRole('dialog', { name: 'Add player', exact: true });
  await expect(add.getByLabel('Alliance joining date')).toHaveValue('2026-10-20T20:00');
  await add.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Week', exact: true })
    .selectOption('2026-10-27T19:00:00.000Z');
  let change = page.getByRole('dialog', { name: 'Change week?', exact: true });
  await change.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page.getByLabel('Observed name · row 1', { exact: true })).toHaveValue('Nova');
  await expect(page.getByRole('combobox', { name: 'Week', exact: true })).toHaveValue(
    '2026-10-20T19:00:00.000Z',
  );
  await page
    .getByRole('combobox', { name: 'Week', exact: true })
    .selectOption('2026-10-27T19:00:00.000Z');
  change = page.getByRole('dialog', { name: 'Change week?', exact: true });
  await change.getByRole('button', { name: 'Discard and change week' }).click();
  await expect(page.getByLabel('Observed name · row 1', { exact: true })).toHaveCount(0);
  const context = await browser.newContext({ timezoneId: 'Asia/Kolkata', locale: 'pt-PT' });
  const local = await context.newPage();
  await local.goto(new URL('/', page.url()).href);
  await local.getByLabel('Alliance name', { exact: true }).fill('Local clock');
  await local.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(local.getByRole('heading', { name: 'Local clock', exact: true })).toBeVisible();
  await local.goto(new URL('/#week', page.url()).href);
  await local.getByLabel('Find week by date').fill('2026-10-28T00:15');
  await expect(local.getByRole('combobox', { name: 'Week', exact: true })).toHaveValue(
    '2026-10-20T19:00:00.000Z',
  );
  await local.getByLabel('Find week by date').fill('2026-10-28T00:45');
  await expect(local.getByRole('combobox', { name: 'Week', exact: true })).toHaveValue(
    '2026-10-27T19:00:00.000Z',
  );
  await context.close();
});
