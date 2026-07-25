import { test, expect } from '@playwright/test';

const EMAIL = process.env.E2E_TEST_EMAIL!;
const PASSWORD = process.env.E2E_TEST_PASSWORD!;
const ORDER_ID = process.env.E2E_TEST_ORDER_ID!;

test('moving the fixture order from Documented to Cutting actually persists', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: /log in/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  await page.goto(`/production/${ORDER_ID}`);
  await expect(page.getByText(/documented stage/i)).toBeVisible();

  await page.getByRole('button', { name: /move to cutting/i }).click();
  await expect(page.getByText(/cutting stage/i)).toBeVisible({ timeout: 10000 });

  // Reload to confirm the move actually persisted server-side, not just
  // an optimistic client-side flip that would silently revert.
  await page.reload();
  await expect(page.getByText(/cutting stage/i)).toBeVisible();

  // This page has no "move back" action, so the fixture is left at
  // Cutting — scripts/seed-e2e-fixture.mjs resets it to Documented on
  // every run rather than relying on a UI action that doesn't exist here.
});
