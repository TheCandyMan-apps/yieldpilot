import { test, expect } from '@playwright/test';

test.describe('Investor Journey: Onboarding → Alert → Underwrite → Export', () => {

  test('complete user journey', async ({ page }) => {
    // 1. Sign up
    await page.goto('/auth');
    await page.fill('input[type="email"]', `test-${Date.now()}@example.com`);
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button:has-text("Sign Up")');

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // 2. Navigate to deals
    await page.click('a[href="/deals"]');
    await expect(page).toHaveURL(/\/deals/);

    // 3. Create saved search
    await page.click('button:has-text("Filters")');
    await page.selectOption('select', 'UK');
    await page.click('button:has-text("Save Search")');
    await page.fill('input[placeholder*="search name"]', 'High-Yield UK Properties');
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=Search saved')).toBeVisible();

    // 4. Enable alerts
    await page.goto('/alerts');
    await expect(page.locator('text=High-Yield UK Properties')).toBeVisible();

    // 5. Open first deal and underwrite
    await page.goto('/deals');
    await page.click('button:has-text("Underwrite Deal")').first();
    await expect(page.locator('text=Underwriting Analysis')).toBeVisible();

    // 6. Calculate metrics
    await page.fill('input[type="number"][value="75"]', '80');
    await page.click('button:has-text("Calculate Metrics")');
    await page.click('button:has-text("Outputs")');
    await expect(page.locator('text=DSCR')).toBeVisible();
    await expect(page.locator('text=IRR')).toBeVisible();

    // 7. Export Excel
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export Excel")');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.xlsx');

    // 8. Verify service worker
    const swRegistration = await page.evaluate(() => {
      return navigator.serviceWorker.ready.then((reg) => reg.active?.state);
    });
    expect(swRegistration).toBe('activated');
  });

  test('subscription gating works', async ({ page }) => {
    await page.goto('/deals');
    
    // Pro badge should be visible on premium features
    await expect(page.locator('text=Pro').first()).toBeVisible();
  });

  test('SEO pages load correctly', async ({ page }) => {
    // Test programmatic SEO page
    await page.goto('/invest/uk/london');
    
    // Verify page loads
    await expect(page.locator('h1')).toContainText('London');
    
    // Check for structured data
    const schemaScript = await page.locator('script[type="application/ld+json"]').innerHTML();
    expect(schemaScript).toContain('@context');
    expect(schemaScript).toContain('FAQPage');
    
    // Verify stats load
    await expect(page.locator('text=Average Yield')).toBeVisible();
  });
});
