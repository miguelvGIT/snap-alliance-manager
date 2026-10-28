import { test, expect } from '@playwright/test';
import { fixture } from '../tests/fixtures';
import { exportBackup } from '../src/domain/transfer';
test('AC35 AC36 AC52 AC53 AC80: importação inicial, pesquisa e ligação Ko-fi', async ({
  page,
}, info) => {
  await page.goto('/');
  await page.getByLabel('Already have a backup? Import data').setInputFiles({
    name: 'teste.json',
    mimeType: 'application/json',
    buffer: Buffer.from(exportBackup(fixture())),
  });
  await page.getByRole('button', { name: 'Confirm import' }).click();
  await expect(page.getByRole('heading', { name: 'Test alliance', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Support the project' })).toHaveAttribute(
    'href',
    'https://ko-fi.com/tequilasunsett',
  );
  await page.getByPlaceholder('Name or contact').fill('ana.discord');
  await expect(
    page.getByRole('row').filter({ has: page.getByText('Ana', { exact: true }) }),
  ).toHaveCount(1);
  await expect(
    page.getByRole('row').filter({ has: page.getByText('Duarte', { exact: true }) }),
  ).toHaveCount(0);
  await page.getByPlaceholder('Name or contact').fill('');
  await page.screenshot({
    path: 'test-results/overview-' + info.project.name + '.png',
    fullPage: true,
  });
  await page.goto('/#week?week=' + encodeURIComponent('2026-10-20T19:00:00.000Z'));
  await expect(page.getByRole('heading', { name: 'Record scores', exact: true })).toBeVisible();
  await page.screenshot({
    path: 'test-results/week-' + info.project.name + '.png',
    fullPage: true,
  });
  await page.goto('/#settings');
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await page.screenshot({
    path: 'test-results/settings-' + info.project.name + '.png',
    fullPage: true,
  });
  await page.locator('input[type=file]').setInputFiles({
    name: 'inválido.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"invalid":true}'),
  });
  await expect(page.getByRole('alert')).toContainText('Invalid');
  await page.goto('/#overview');
  await expect(page.getByText('Ana', { exact: true })).toBeVisible();
});
