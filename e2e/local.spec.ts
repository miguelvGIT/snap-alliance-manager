import { test, expect, type Page } from '@playwright/test';
import { fixture } from '../tests/fixtures';
import { exportBackup } from '../src/domain/transfer';
async function create(page: Page) {
  await page.clock.install({ time: new Date('2026-10-28T12:00:00Z') });
  await page.goto('/');
  await page.getByLabel('Alliance name', { exact: true }).fill('Test team');
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByRole('heading', { name: 'Test team' })).toBeVisible();
}
async function importFixture(page: Page) {
  await create(page);
  await page.goto('/#settings');
  await page.locator('input[type=file]').setInputFiles({
    name: 'fixture.json',
    mimeType: 'application/json',
    buffer: Buffer.from(exportBackup(fixture())),
  });
  await page.getByRole('button', { name: 'Confirm replacement' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto('/#overview');
}
test('AC01 AC12 AC53 AC58: acesso sem conta, persistência e tabela local', async ({ page }) => {
  const apiCalls: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/api/')) apiCalls.push(r.url());
  });
  await importFixture(page);
  await expect(page.getByRole('heading', { name: 'Test alliance', exact: true })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: '20/10/26 - 27/10/26' })).toBeAttached();
  await expect(page.getByText('Repeated missed minimums', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('ana.discord', { exact: true })).toBeVisible();
  expect(apiCalls).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
test('AC20 AC66: a dispensa pede sempre motivo antes de confirmar', async ({ page }) => {
  await importFixture(page);
  await page.goto('/#week?week=' + encodeURIComponent('2026-10-20T19:00:00.000Z'));
  const ana = page.getByRole('row').filter({ has: page.getByText('Ana', { exact: true }) });
  await ana.getByRole('button', { name: 'Excuse this week', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Weekly exemption · Ana' });
  await expect(dialog.getByRole('button', { name: 'Confirm exemption' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await ana.getByRole('button', { name: 'Excuse this week', exact: true }).click();
  await expect(page.getByLabel('Reason (required)')).toHaveValue('');
  await page.getByLabel('Reason (required)').fill('Agreed absence');
  await page.getByRole('button', { name: 'Confirm exemption' }).click();
  await expect(ana.getByText('Agreed absence')).toBeVisible();
  await expect(ana.locator('td').nth(1)).toHaveText(/1\s?000/);
});
test('AC81 AC84 AC04: deteta diferença e só associa depois de confirmação', async ({ page }) => {
  await importFixture(page);
  await page.goto('/#week');
  await page.getByLabel('Names and points').fill('SnapNovo;3000\nBruno;2700');
  await page.getByLabel('The collected list is complete').check();
  await page.getByRole('button', { name: 'Review names and points' }).click();
  await expect(page.getByText('Unknown name', { exact: true })).toBeVisible();
  await expect(page.getByText(/Name not found in the collected list:/)).toContainText('Ana');
  await page.getByRole('button', { name: 'Assign manually' }).first().click();
  await page.getByLabel('Existing player').selectOption({ label: 'Ana · ana.discord' });
  await page.getByLabel('I confirm the current name changed').check();
  await page.getByRole('button', { name: 'Confirm assignment' }).click();
  await page.getByRole('button', { name: 'Confirm recognized current names' }).click();
  await page.getByRole('button', { name: 'Save collection', exact: true }).click();
  await expect(page.getByText(/Collection saved as a draft/)).toBeVisible();
  await page.goto('/#overview');
  await expect(page.getByText('SnapNovo', { exact: true })).toBeVisible();
  await expect(page.getByText('ana.discord', { exact: true })).toBeVisible();
});
test('AC35 AC70 AC76: exportação local e calendário sem API', async ({ page }) => {
  await importFixture(page);
  await page.goto('/#settings');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export all data', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.json$/);
  const calendarPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export calendar reminder' }).click();
  const calendar = await calendarPromise;
  expect(calendar.suggestedFilename()).toBe('alliance-reminder.ics');
  const stream = await calendar.createReadStream();
  let text = '';
  for await (const chunk of stream!) text += chunk.toString();
  expect(text).toContain('RRULE:FREQ=WEEKLY;BYDAY=TU');
  expect(text).toContain('TRIGGER:-PT30M');
});
