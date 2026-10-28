import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fixture } from '../tests/fixtures';
import { exportBackup, readBackup } from '../src/domain/transfer';

test('AC18 AC19: minimum changes live in Settings and preserve separate defaults/history', async ({
  page,
}, info) => {
  await page.clock.install({ time: new Date('2026-10-28T12:00:00Z') });
  await page.goto('/');
  await page
    .getByLabel('Already have a backup? Import data')
    .setInputFiles({
      name: 'fictional.json',
      mimeType: 'application/json',
      buffer: Buffer.from(exportBackup(fixture())),
    });
  await page.getByRole('button', { name: 'Confirm import', exact: true }).click();
  const selected = '2026-10-20T19:00:00.000Z';
  await page.goto('/#week?week=' + encodeURIComponent(selected));
  await expect(page.getByRole('heading', { name: 'Record scores', exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: "Correct this week's minimum", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('p').filter({ hasText: 'Minimum:' })).toContainText('2700');
  await page.screenshot({
    path: 'test-results/week-minimum-' + info.project.name + '.png',
    fullPage: true,
  });

  await page.goto('/#settings');
  await page.getByLabel('Minimum per player', { exact: true }).fill('3000');
  await page.getByRole('button', { name: 'Save settings', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Settings saved.');
  await page.goto('/#week?week=' + encodeURIComponent(selected));
  await expect(page.locator('p').filter({ hasText: 'Minimum:' })).toContainText('2700');
  await page.goto('/#week?week=' + encodeURIComponent('2026-10-27T19:00:00.000Z'));
  await expect(page.locator('p').filter({ hasText: 'Minimum:' })).toContainText('3000');

  await page.goto('/#settings');
  await page.getByText('Saved weekly minimums', { exact: true }).click();
  await page.getByRole('combobox', { name: 'Saved week', exact: true }).selectOption(selected);
  await expect(page.getByLabel('Minimum for this week', { exact: true })).toHaveValue('2700');
  await page.getByLabel('Minimum for this week', { exact: true }).fill('3000');
  await expect(
    page.getByRole('button', { name: 'Save weekly minimum', exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel('Reason for changing the minimum', { exact: true })
    .fill('Corrected imported minimum');
  await page.getByRole('button', { name: 'Save weekly minimum', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('The saved minimum was updated.');
  await expect(
    page.getByRole('button', { name: 'Save weekly minimum', exact: true }),
  ).toBeDisabled();
  await page.screenshot({
    path: 'test-results/settings-minimum-' + info.project.name + '.png',
    fullPage: true,
  });

  const pendingDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export all data', exact: true }).click();
  const download = await pendingDownload;
  const backup = readBackup(await readFile((await download.path())!, 'utf8')).dataset;
  expect(backup.alliance.minimum).toBe(3000);
  expect(backup.weeks.find((week) => week.id === selected)?.minimum).toBe(3000);
  expect(
    backup.weeks.filter((week) => week.id !== selected).every((week) => week.minimum === 2700),
  ).toBe(true);
  const revision = backup.revisions.filter((item) => item.entity === 'week/' + selected).at(-1)!;
  expect(revision.reason).toBe('Corrected imported minimum');
  expect(JSON.parse(revision.before).minimum).toBe(2700);
  expect(JSON.parse(revision.after).minimum).toBe(3000);
  await page.goto('/#overview');
  const row = page.getByRole('row').filter({ has: page.getByText('Bruno', { exact: true }) });
  await expect(row.getByRole('cell').nth(2).locator('span')).toHaveText('2');
  await expect(row.getByRole('cell').nth(3)).toHaveText('1833,33');
  await page.goto('/#week?week=' + encodeURIComponent(selected));
  await page.getByText("This week's revisions and reasons", { exact: true }).click();
  await expect(page.getByText(/Corrected imported minimum/)).toBeVisible();
});
