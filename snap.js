const { chromium, devices } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true
  });
  const contextDesktop = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const contextMobile = await browser.newContext({
    ...devices['iPhone 13']
  });

  const pagesToSnap = [
    { name: 'dashboard', url: 'http://localhost:3000/dashboard' },
    { name: 'production', url: 'http://localhost:3000/production' },
    { name: 'customers', url: 'http://localhost:3000/customers' },
    { name: 'calendar', url: 'http://localhost:3000/calendar' }
  ];

  for (const p of pagesToSnap) {
    // Desktop
    const pageD = await contextDesktop.newPage();
    await pageD.goto(p.url, { waitUntil: 'networkidle' });
    await pageD.waitForTimeout(1000);
    await pageD.screenshot({ path: `.screenshots/${p.name}-desktop.png`, fullPage: true });
    await pageD.close();

    // Mobile
    const pageM = await contextMobile.newPage();
    await pageM.goto(p.url, { waitUntil: 'networkidle' });
    await pageM.waitForTimeout(1000);
    await pageM.screenshot({ path: `.screenshots/${p.name}-mobile.png`, fullPage: true });
    await pageM.close();
  }

  await browser.close();
  console.log("Screenshots captured!");
})();
