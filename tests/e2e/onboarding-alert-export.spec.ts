import { test, expect } from '@playwright/test';

test.describe('Onboarding → Alert → Export Flow', () => {
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
    await page.click('button:has-text("Save Search")');
    await page.fill('input[placeholder*="search name"]', 'High-Yield UK Properties');
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=Search saved')).toBeVisible();

    // 4. Enable alerts
    await page.click('button[aria-label="Enable Alerts"]');
    await expect(page.locator('text=Alerts enabled')).toBeVisible();

    // 5. Open first deal
    await page.click('.deal-card').first();
    await expect(page.locator('h1')).toContainText(/Property|Deal/);

    // 6. Open underwriting drawer
    await page.click('button:has-text("Underwrite")');
    await expect(page.locator('text=Underwriting Analysis')).toBeVisible();

    // 7. Calculate metrics
    await page.fill('input[type="number"]', '250000');
    await page.click('button:has-text("Calculate Metrics")');
    await expect(page.locator('text=DSCR')).toBeVisible();

    // 8. Export PDF
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export PDF")');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.pdf');

    // 9. Verify service worker received push
    const swRegistration = await page.evaluate(() => {
      return navigator.serviceWorker.ready.then((reg) => reg.active?.state);
    });
    expect(swRegistration).toBe('activated');
  });
});
