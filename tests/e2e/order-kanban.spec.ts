import { test, expect } from '@playwright/test';
import { seedTenant, cleanupTenant, type E2ETenant } from './fixtures';

let tenant: E2ETenant;

test.beforeAll(async () => {
  tenant = await seedTenant('kanban');
});

test.afterAll(async () => {
  await cleanupTenant(tenant);
});

async function login(page: import('@playwright/test').Page, tenant: E2ETenant) {
  await page.goto('/login');
  await page.locator('input[type=email]').fill(tenant.ownerEmail);
  await page.locator('input[type=password]').fill(tenant.password);
  await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
}

test('creating an order surfaces it in the Intake Queue and it can be moved into Cutting', async ({ page }) => {
  await login(page, tenant);

  await page.goto('/production');
  await page.locator('[class*="fab" i]').first().click();
  await page.getByText('New Order', { exact: true }).click();

  // Note: "Customer Name" label is a JSX node (contains a conditional "View
  // Measurements" link), not a plain string, so Input's htmlFor-generation
  // never associates it — a real, minor accessibility gap worth fixing
  // later, but targeted by placeholder here rather than blocking on it.
  await page.getByPlaceholder('Full name').fill('Kanban Smoke Customer');
  await page.getByLabel('WhatsApp Number').fill('2348012345678');
  await page.getByLabel('Order Details').fill('Smoke test agbada order');
  await page.getByLabel(/Total Bill/).fill('25000');
  await page.getByRole('button', { name: 'Create Order' }).click();

  // New orders land in the Intake Queue (Documented), not a kanban column.
  const intakeHeader = page.locator('[class*="intakeHeader" i]');
  await expect(intakeHeader).toBeVisible({ timeout: 10000 });
  await intakeHeader.click();
  await expect(page.locator('[class*="intakeCardName" i]')).toHaveText('Kanban Smoke Customer');

  await page.locator('[class*="startBtn" i]').click();
  // "Cutting (N)" tab counters only render in the mobile tab-bar layout
  // (CSS-hidden at desktop viewport width), so assert on the order card
  // itself surfacing on the board instead of that count text.
  await expect(page.locator('[class*="customerName" i]').filter({ hasText: 'Kanban Smoke Customer' })).toBeVisible({
    timeout: 10000,
  });
});
