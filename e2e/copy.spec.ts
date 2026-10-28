import { test, expect } from '@playwright/test';
test('Onboarding is in English and describes the app, without reset highlights', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { name: 'Set up your dashboard' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible();
  await expect(page.locator('main')).not.toContainText(/19:00|Tuesday|reset/i);
  await expect(page.locator('main')).not.toContainText(/Criar|Registar|Começar/);
  await expect(page.getByText('Review weekly contributions', { exact: true })).toBeVisible();
});
