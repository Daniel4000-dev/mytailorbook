import { test, expect } from '@playwright/test';
import { seedTenant, cleanupTenant, admin, type E2ETenant } from './fixtures';

let tenant: E2ETenant;
let orderId: string;

test.beforeAll(async () => {
  tenant = await seedTenant('tracking');
  const { data: order, error } = await admin
    .from('orders')
    .insert({
      shop_id: tenant.shopId,
      customer_id: tenant.customerId,
      customer_name: 'E2E Customer tracking',
      order_details: 'Smoke test tracking order',
      total_bill: 20000,
      deposit_paid: 5000,
      status: 'Sewing',
      priority: 'normal',
      images: [],
      status_history: [],
    })
    .select()
    .single();
  if (error || !order) throw new Error(`Failed to seed tracking order: ${error?.message}`);
  orderId = order.id;
});

test.afterAll(async () => {
  await cleanupTenant(tenant);
});

test('the public tracking page renders order status with no login required', async ({ page }) => {
  await page.goto(`/track/${orderId}`);
  await expect(page.getByRole('heading', { name: 'Expert Stitching' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/Hello, E2E/)).toBeVisible();
});

test('an unknown order id shows a not-found state instead of an error', async ({ page }) => {
  await page.goto('/track/00000000-0000-0000-0000-000000000000');
  await expect(page.getByText('Order Not Found')).toBeVisible({ timeout: 10000 });
});
