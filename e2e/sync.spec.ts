import { test, expect, type Page } from '@playwright/test';
import { fixture } from '../tests/fixtures';
import { exportBackup } from '../src/domain/transfer';
test('AC28 AC59 AC60: duas sessões autorizadas sincronizam automaticamente', async ({
  browser,
}, testInfo) => {
  test.skip(
    process.env.ALLIANCE_TEST_SYNC_PREVIEW !== 'true' || testInfo.project.name !== 'desktop',
    'P2: local sync prototype requires explicit opt-in.',
  );
  test.setTimeout(90000);
  const a = await browser.newContext({
    locale: 'pt-PT',
    timezoneId: 'Europe/Lisbon',
    viewport: { width: 1440, height: 900 },
  });
  const b = await browser.newContext({
    locale: 'pt-PT',
    timezoneId: 'Europe/Lisbon',
    viewport: { width: 390, height: 844 },
  });
  const first = await a.newPage(),
    second = await b.newPage();
  try {
    for (const page of [first, second]) {
      await page.clock.install({ time: new Date('2026-10-28T12:00:00Z') });
      await page.goto('/');
      await page.getByLabel('Alliance name', { exact: true }).fill('Test link');
      await page.getByRole('button', { name: 'Start' }).click();
      await page.goto('/#settings');
    }
    await first.bringToFront();
    await expect(first.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
    await first.getByLabel('Import file', { exact: true }).setInputFiles({
      name: 'fixture.json',
      mimeType: 'application/json',
      buffer: Buffer.from(exportBackup(fixture())),
    });
    await expect(first.getByRole('dialog', { name: 'Review import' })).toBeVisible();
    await first.getByRole('button', { name: 'Confirm replacement' }).click();
    await first.getByLabel('I want to enable a private copy').check();
    await first.getByRole('button', { name: 'Enable sync', exact: true }).click();
    await expect(first.getByText('Sync is enabled on this device')).toBeVisible();
    await first.getByRole('button', { name: 'Create invitation' }).click();
    const code = await first.getByLabel('Invitation (valid for ten minutes)').inputValue();
    await second.getByText('I have an invitation from another device', { exact: true }).click();
    await second.getByLabel('Temporary invitation').fill(code);
    await second.getByRole('button', { name: 'Request a link' }).click();
    await expect(second.getByText(/Confirm code/)).toBeVisible();
    await first.getByRole('button', { name: 'View link requests' }).click();
    await first.getByRole('button', { name: 'Confirm code and authorize' }).click();
    await second.clock.runFor(5001);
    await expect(
      second.getByRole('dialog', { name: "Confirm the other device's data" }),
    ).toBeVisible();
    await second.getByRole('button', { name: 'Confirm and receive history' }).click();
    await first.goto('/#players');
    await first.getByRole('button').filter({ hasText: 'Ana' }).first().click();
    await first.getByRole('button', { name: 'Edit name or contact' }).click();
    await first.getByLabel('In-game name', { exact: true }).fill('Ana synced');
    const pushed = first.waitForResponse(
      (r) => r.url().includes('/sync') && r.request().method() === 'POST',
    );
    await first.getByRole('button', { name: 'Confirm changes' }).click();
    await first.clock.runFor(5001);
    expect((await pushed).status()).toBe(200);
    await second.goto('/#overview');
    await second.clock.runFor(60001);
    await expect(second.getByText('Ana synced', { exact: true })).toBeVisible({
      timeout: 15000,
    });
    await expect(second.getByText('ana.discord', { exact: true })).toBeVisible();
    await expect(
      second
        .getByRole('row')
        .filter({ has: second.getByText('Ana synced', { exact: true }) })
        .getByText('2500,00', { exact: true }),
    ).toBeAttached();
  } finally {
    await a.close();
    await b.close();
  }
});
