const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'mtb-e2e-1784621489178@example.com');
  await page.fill('input[type="password"]', 'TempPass123!verify');
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard|production/, { timeout: 15000 }).catch(() => {});

  await page.goto('http://localhost:3000/customers');
  await page.waitForTimeout(1200);
  await page.locator('[class*="mobileCard"]', { hasText: 'Chidinma Test' }).first().click({ timeout: 10000 });
  await page.waitForTimeout(1200);

  const viewEdit = page.getByText(/VIEW\s*\/\s*EDIT/i).first();
  await viewEdit.click();
  await page.waitForTimeout(1000);

  const removeBtn = page.getByRole('button', { name: /^Remove$/i }).first();
  await removeBtn.click({ timeout: 10000 });
  await page.waitForTimeout(800);

  const diag = await page.evaluate(() => {
    const cancelBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.trim() === 'Cancel');
    const cancelBtn = cancelBtns[cancelBtns.length - 1];
    const rect = cancelBtn.getBoundingClientRect();
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    const elAtPoint = document.elementFromPoint(cx, cy);

    function ancestorsInfo(el) {
      const chain = [];
      let cur = el;
      while (cur && cur !== document.body) {
        const cs = getComputedStyle(cur);
        chain.push({
          tag: cur.tagName,
          cls: cur.className && cur.className.toString().slice(0, 60),
          zIndex: cs.zIndex,
          position: cs.position,
          transform: cs.transform !== 'none' ? cs.transform.slice(0, 30) : 'none',
        });
        cur = cur.parentElement;
      }
      return chain;
    }

    // find the overlay div (ConfirmDialog's own overlay - parent of cancelBtn's ancestor chain)
    const overlayChain = ancestorsInfo(cancelBtn);

    const elAtPointChain = elAtPoint ? ancestorsInfo(elAtPoint) : null;

    return {
      cancelRect: rect,
      elAtPointTag: elAtPoint ? elAtPoint.tagName : null,
      elAtPointClass: elAtPoint ? (elAtPoint.className && elAtPoint.className.toString().slice(0,80)) : null,
      overlayChain,
      elAtPointChain,
    };
  });
  console.log(JSON.stringify(diag, null, 2));

  await browser.close();
})().catch(e => { console.error('SCRIPT_ERROR', e.message); process.exit(1); });
