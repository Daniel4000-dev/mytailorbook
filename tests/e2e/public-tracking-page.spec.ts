import { test, expect } from '@playwright/test';

const ORDER_ID = process.env.E2E_TEST_ORDER_ID!;

test('the public tracking page loads with no login required', async ({ page }) => {
  // A fresh browser context (Playwright's default per-test isolation) has
  // no session cookie at all — this is exactly the "customer with no
  // account, just a link" path the feature exists for.
  await page.goto(`/track/${ORDER_ID}`);

  await expect(page.getByText(/tracking your e2e fixture gown/i)).toBeVisible();
  await expect(page.getByText(/hello e2e/i)).toBeVisible();
});
