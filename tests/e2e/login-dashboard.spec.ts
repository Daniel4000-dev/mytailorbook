import { test, expect } from '@playwright/test';
import { seedTenant, cleanupTenant, type E2ETenant } from './fixtures';

let tenant: E2ETenant;

test.beforeAll(async () => {
  tenant = await seedTenant('login');
});

test.afterAll(async () => {
  await cleanupTenant(tenant);
});

test('a user can log in and land on the Dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).or(page.locator('input[type=email]')).fill(tenant.ownerEmail);
  await page.locator('input[type=password]').fill(tenant.password);
  await page.locator('button[type=submit]').click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  await expect(page.getByText('Overview Analytics')).toBeVisible({ timeout: 10000 });
});
