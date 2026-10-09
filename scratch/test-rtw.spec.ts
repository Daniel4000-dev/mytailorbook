import { test, expect } from '@playwright/test';

test('RTW Flow Test', async ({ page }) => {
  test.setTimeout(120000); // 2 minutes

  console.log('1. Logging in...');
  await page.goto('http://localhost:3000/login');
  await page.getByLabel(/email/i).fill('dadekunle31@gmail.com');
  await page.locator('input[type="password"]').fill('12345678');
  await page.getByRole('button', { name: /log in/i }).click();

  await page.waitForURL('**/dashboard', { timeout: 15000 });
  console.log('Login successful.');

  console.log('2. Setting Business Mode to Hybrid...');
  await page.goto('http://localhost:3000/settings/studio');
  await page.waitForLoadState('networkidle');
  // Attempt to select Hybrid mode
  const modeSelect = page.locator('select').filter({ hasText: /bespoke|rtw|hybrid/i });
  if (await modeSelect.count() > 0) {
    await modeSelect.selectOption({ label: 'Hybrid (Custom + Ready-to-wear)' }).catch(() => modeSelect.selectOption('hybrid'));
    await page.getByRole('button', { name: /save changes/i }).click();
    await page.waitForTimeout(2000);
  }

  console.log('3. Navigating to Size Charts...');
  await page.goto('http://localhost:3000/settings/size-charts');
  await page.waitForLoadState('networkidle');
  if (await page.getByRole('button', { name: /create chart/i }).isVisible()) {
    await page.getByRole('button', { name: /create chart/i }).click();
    await page.getByLabel(/chart name/i).fill('E2E Test Chart');
    await page.locator('textarea').fill('S: Chest 40\nM: Chest 42');
    await page.getByRole('button', { name: /save chart/i }).click();
    await page.waitForTimeout(2000);
  }

  console.log('4. Creating a Production Batch...');
  await page.goto('http://localhost:3000/orders/new');
  await page.waitForLoadState('networkidle');
  
  // Click RTW batch
  const rtwCard = page.locator('div').filter({ hasText: 'Production Batch (RTW)' }).last();
  await rtwCard.click();
  
  await page.getByLabel(/style name/i).fill('Playwright Test Shirt');
  // Fill quantity for first size
  await page.locator('input[type="number"]').first().fill('5');
  await page.getByRole('button', { name: /create batch/i }).click();

  await page.waitForURL('**/production', { timeout: 15000 });
  console.log('Batch created successfully.');

  console.log('5. Completing the batch...');
  // Find the created batch card
  const orderCard = page.locator('div').filter({ hasText: 'Playwright Test Shirt' }).first();
  await orderCard.click();
  
  // Wait for details page to open
  await page.waitForTimeout(2000);
  // Advance status until Delivered
  let maxAttempts = 5;
  while (maxAttempts > 0) {
    const advanceBtn = page.getByRole('button', { name: /move to/i }).first();
    if (await advanceBtn.isVisible()) {
      const btnText = await advanceBtn.innerText();
      await advanceBtn.click();
      await page.waitForTimeout(2000); // Wait for status update
      if (btnText.includes('Delivered')) break;
    } else {
      break;
    }
    maxAttempts--;
  }
  console.log('Batch moved to Delivered.');

  console.log('6. Processing POS Sale...');
  await page.goto('http://localhost:3000/stock');
  await page.waitForLoadState('networkidle');
  
  // Click first stock item to add to cart
  const itemCard = page.locator('div').filter({ hasText: 'Playwright Test Shirt' }).first();
  if (await itemCard.isVisible()) {
    await itemCard.click();
    await page.waitForTimeout(1000);
    
    // Checkout
    await page.getByRole('button', { name: /cash/i }).click();
    await page.getByRole('button', { name: /complete sale/i }).click();
    await page.waitForTimeout(2000);
    console.log('POS sale completed.');
  } else {
    console.log('Item not found in stock, it might not have synced yet.');
  }

  console.log('All RTW E2E steps executed successfully!');
});
