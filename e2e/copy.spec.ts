import { test, expect } from '@playwright/test';
test('AC01 AC97: onboarding hides navigation until setup and keeps support available', async ({
  page,
}, info) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { name: 'Set up your dashboard' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible();
  await expect(page.locator('main')).not.toContainText(/19:00|Tuesday|reset/i);
  await expect(page.locator('main')).not.toContainText(/Criar|Registar|Começar/);
  await expect(page.getByText('Review weekly contributions', { exact: true })).toBeVisible();
  await expect(page.getByRole('banner')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Main navigation', exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'Support the project', exact: true }),
  ).toHaveAttribute('href', 'https://ko-fi.com/tequilasunsett');
  await page.screenshot({
    path: info.outputPath('onboarding-without-navigation.png'),
    fullPage: true,
  });
  await page.getByLabel('Alliance name', { exact: true }).fill('Navigation team');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Navigation team', exact: true })).toBeVisible();
  await expect(page.getByRole('banner')).toBeVisible();
  if (await page.getByRole('button', { name: 'Open menu', exact: true }).isVisible())
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  await page.getByRole('link', { name: 'Players', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Players', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Players', exact: true })).toBeVisible();
  await expect(page.getByRole('banner')).toBeVisible();
});
