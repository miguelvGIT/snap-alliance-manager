import { test, expect, type Page, type Download } from '@playwright/test';
import { fixture } from '../tests/fixtures';
import { type Dataset } from '../src/domain/model';
import { exportBackup, readBackup } from '../src/domain/transfer';
async function open(page: Page, data: Dataset) {
  await page.clock.install({ time: new Date('2026-10-29T12:00:00Z') });
  await page.goto('/');
  await page.getByLabel('Already have a backup? Import data').setInputFiles({
    name: 'fictional.json',
    mimeType: 'application/json',
    buffer: Buffer.from(exportBackup(data)),
  });
  await page.getByRole('button', { name: 'Confirm import', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Test alliance', exact: true })).toBeVisible();
  await page.goto('/#players');
}
async function downloadData(download: Download) {
  let text = '';
  for await (const chunk of (await download.createReadStream())!) text += chunk.toString();
  return readBackup(text).dataset;
}
const playerButton = (page: Page, region: string, name: string) =>
  page
    .getByRole('region', { name: region, exact: true })
    .getByRole('button')
    .filter({ has: page.getByText(name, { exact: true }) });

test('AC25 AC35 AC96: leaving records a reason, keeps history and survives transfer and rejoining', async ({
  page,
}, info) => {
  const data = fixture(),
    id = data.players[0].id;
  const reason = 'Agreed departure after repeated missed minimums.';
  await open(page, data);
  await playerButton(page, 'Alliance roster', 'Ana').click();
  await page.getByRole('button', { name: 'Remove from roster', exact: true }).click();
  let dialog = page.getByRole('dialog', { name: 'Remove player from roster?', exact: true });
  await expect(dialog.getByRole('button', { name: 'Confirm removal', exact: true })).toBeDisabled();
  await dialog.getByLabel('Reason for leaving (required)', { exact: true }).fill('   ');
  await expect(dialog.getByRole('button', { name: 'Confirm removal', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(playerButton(page, 'Alliance roster', 'Ana')).toBeVisible();
  await expect(playerButton(page, 'Former players', 'Ana')).toHaveCount(0);
  await playerButton(page, 'Alliance roster', 'Ana').click();
  await page.getByRole('button', { name: 'Remove from roster', exact: true }).click();
  await expect(dialog.getByLabel('Reason for leaving (required)', { exact: true })).toHaveValue('');
  await dialog.getByLabel('Date and time', { exact: true }).fill('2026-10-28T12:00');
  await dialog.getByLabel('Reason for leaving (required)', { exact: true }).fill(reason);
  await dialog.getByRole('button', { name: 'Confirm removal', exact: true }).click();
  await expect(playerButton(page, 'Alliance roster', 'Ana')).toHaveCount(0);
  const former = playerButton(page, 'Former players', 'Ana');
  await expect(former).toContainText(reason);
  await expect(former).toContainText('28/10/26');
  await expect(page.getByRole('status')).toContainText('moved to Former players');
  await page.screenshot({ path: info.outputPath('former-players.png'), fullPage: true });
  await page.reload();
  await expect(former).toContainText(reason);
  await former.click();
  dialog = page.getByRole('dialog', { name: 'Ana', exact: true });
  await expect(dialog).toContainText('Reason for leaving: ' + reason);
  await expect(
    dialog.getByRole('heading', { name: 'Results and exemptions', exact: true }),
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await page.goto('/#settings');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export current alliance', exact: true }).click();
  const saved = await downloadData(await pending);
  expect(saved.weeks).toEqual(data.weeks);
  expect(saved.players[0]).toMatchObject({
    id,
    social: 'ana.discord',
    memberships: [{ departureReason: reason }],
  });
  const other = await page
    .context()
    .browser()!
    .newContext({ timezoneId: 'Europe/Lisbon', locale: 'pt-PT' });
  const restored = await other.newPage();
  await restored.goto(new URL('/', page.url()).href);
  await restored.getByLabel('Already have a backup? Import data').setInputFiles({
    name: 'restored.json',
    mimeType: 'application/json',
    buffer: Buffer.from(exportBackup(saved)),
  });
  await restored.getByRole('button', { name: 'Confirm import', exact: true }).click();
  await expect(restored.getByRole('heading', { name: 'Test alliance', exact: true })).toBeVisible();
  await restored.goto(new URL('/#players', page.url()).href);
  await expect(playerButton(restored, 'Former players', 'Ana')).toContainText(reason);
  await other.close();
  await page.goto('/#players');
  await former.click();
  await page.getByRole('button', { name: 'Record rejoining', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Record rejoining', exact: true });
  await dialog.getByLabel('Date and time', { exact: true }).fill('2026-10-29T12:00');
  await dialog.getByRole('button', { name: 'Confirm rejoining', exact: true }).click();
  await expect(former).toHaveCount(0);
  await playerButton(page, 'Alliance roster', 'Ana').click();
  dialog = page.getByRole('dialog', { name: 'Ana', exact: true });
  await expect(dialog).toContainText('Reason for leaving: ' + reason);
  await expect(dialog).toContainText('Present');
});

test('AC80 AC96: legacy departures remain searchable and invalid departure dates keep the roster unchanged', async ({
  page,
}) => {
  const data = fixture(),
    eva = data.players[4];
  eva.memberships[0].leftAt = '2026-10-28T12:00:00.000Z';
  eva.social = 'legacy.contact';
  eva.aliases.push({ name: 'FormerEva', changedAt: '2026-10-27T12:00:00.000Z' });
  await open(page, data);
  await expect(playerButton(page, 'Former players', 'Eva')).toContainText(
    'No departure reason recorded',
  );
  await page.getByLabel('Search players', { exact: true }).fill('formereva');
  await expect(playerButton(page, 'Former players', 'Eva')).toBeVisible();
  await expect(playerButton(page, 'Alliance roster', 'Ana')).toHaveCount(0);
  await page.getByLabel('Search players', { exact: true }).fill('legacy.contact');
  await expect(playerButton(page, 'Former players', 'Eva')).toBeVisible();
  await page.getByLabel('Search players', { exact: true }).fill('ana.discord');
  await expect(playerButton(page, 'Alliance roster', 'Ana')).toBeVisible();
  await expect(playerButton(page, 'Former players', 'Eva')).toHaveCount(0);
  await page.getByLabel('Search players', { exact: true }).fill('');
  await playerButton(page, 'Alliance roster', 'Ana').click();
  await page.getByRole('button', { name: 'Remove from roster', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Remove player from roster?', exact: true });
  await dialog.getByLabel('Date and time', { exact: true }).fill('2026-08-01T12:00');
  await dialog
    .getByLabel('Reason for leaving (required)', { exact: true })
    .fill('Moved to another alliance');
  await dialog.getByRole('button', { name: 'Confirm removal', exact: true }).click();
  await expect(dialog).toContainText('The leaving date cannot be before the joining date.');
  await dialog.getByLabel('Date and time', { exact: true }).fill('2026-10-28T12:00');
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value: any, ...args: any[]) {
      if (this.name === 'entries' && value?.key === 'dataset') {
        IDBObjectStore.prototype.put = put;
        throw new DOMException('Fictional departure save failure', 'QuotaExceededError');
      }
      return put.call(this, value, ...args);
    };
  });
  await dialog.getByRole('button', { name: 'Confirm removal', exact: true }).click();
  await expect(dialog).toContainText('Fictional departure save failure');
  await expect(dialog.getByLabel('Reason for leaving (required)', { exact: true })).toHaveValue(
    'Moved to another alliance',
  );
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(playerButton(page, 'Alliance roster', 'Ana')).toBeVisible();
  await expect(playerButton(page, 'Former players', 'Ana')).toHaveCount(0);
});
