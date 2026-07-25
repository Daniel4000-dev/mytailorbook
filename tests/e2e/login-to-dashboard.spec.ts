import { test, expect } from '@playwright/test';

const EMAIL = process.env.E2E_TEST_EMAIL!;
const PASSWORD = process.env.E2E_TEST_PASSWORD!;

test('logging in lands on the dashboard with real account data', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: /log in/i }).click();

  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await expect(page.getByText(/overview analytics/i)).toBeVisible();
});
