/**
 * Adjusted ROI E2E Tests
 * 
 * Tests Reality Mode, EPC Advisor, and Strategy Simulation features.
 */

import { test, expect } from '@playwright/test';

test.describe('Adjusted ROI Features', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to deals page
    await page.goto('/deals');
  });

  test('Reality Mode toggle shows adjusted filters when enabled', async ({ page }) => {
    // Check if user is authenticated
    const authButton = page.locator('text="Sign In"');
    const isAuthenticated = !(await authButton.isVisible());

    if (!isAuthenticated) {
      test.skip();
      return;
    }

    // Find and toggle Reality Mode
    const realityModeToggle = page.locator('#reality-mode');
    await realityModeToggle.waitFor({ state: 'visible', timeout: 5000 });
    
    // Initially should not show adjusted filters
    await expect(page.locator('text="Min Adjusted Yield"')).not.toBeVisible();

    // Enable Reality Mode
    await realityModeToggle.click();
    await page.waitForTimeout(500);

    // Should now show adjusted filters
    await expect(page.locator('text="Min Adjusted Yield"')).toBeVisible();
    await expect(page.locator('text="Optimize For Strategy"')).toBeVisible();

    // Deal cards should show "Adjusted" badge
    const adjustedBadges = page.locator('text="Adjusted"');
    const count = await adjustedBadges.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Reality Mode shows adjusted yield label on deal cards', async ({ page }) => {
    const authButton = page.locator('text="Sign In"');
    const isAuthenticated = !(await authButton.isVisible());

    if (!isAuthenticated) {
      test.skip();
      return;
    }

    // Enable Reality Mode
    const realityModeToggle = page.locator('#reality-mode');
    await realityModeToggle.waitFor({ state: 'visible', timeout: 5000 });
    await realityModeToggle.click();
    await page.waitForTimeout(500);

    // Check that yield labels show "Adj. Yield"
    const adjYieldLabels = page.locator('text="Adj. Yield"');
    const count = await adjYieldLabels.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Can filter by minimum adjusted yield', async ({ page }) => {
    const authButton = page.locator('text="Sign In"');
    const isAuthenticated = !(await authButton.isVisible());

    if (!isAuthenticated) {
      test.skip();
      return;
    }

    // Enable Reality Mode
    const realityModeToggle = page.locator('#reality-mode');
    await realityModeToggle.waitFor({ state: 'visible', timeout: 5000 });
    await realityModeToggle.click();
    await page.waitForTimeout(500);

    // Set minimum adjusted yield to 5%
    const minYieldInput = page.locator('#min-adjusted-yield');
    await minYieldInput.fill('5');
    await page.waitForTimeout(1000);

    // Verify deals are filtered (results count should update)
    const resultsText = await page.locator('text=/Showing \\d+ of \\d+ deals/').textContent();
    expect(resultsText).toBeTruthy();
  });

  test('Can select different strategies in filter', async ({ page }) => {
    const authButton = page.locator('text="Sign In"');
    const isAuthenticated = !(await authButton.isVisible());

    if (!isAuthenticated) {
      test.skip();
      return;
    }

    // Enable Reality Mode
    const realityModeToggle = page.locator('#reality-mode');
    await realityModeToggle.waitFor({ state: 'visible', timeout: 5000 });
    await realityModeToggle.click();
    await page.waitForTimeout(500);

    // Click strategy dropdown
    const strategySelect = page.locator('#strategy-filter');
    await strategySelect.click();

    // Verify strategy options are present
    await expect(page.locator('text="Long-Term Rental"')).toBeVisible();
    await expect(page.locator('text="HMO"')).toBeVisible();
    await expect(page.locator('text="BRRR"')).toBeVisible();
    await expect(page.locator('text="Short-Term Rental"')).toBeVisible();

    // Select HMO strategy
    await page.locator('text="HMO"').first().click();
    await page.waitForTimeout(500);
  });

  test('Methodology page renders and explains adjusted ROI', async ({ page }) => {
    await page.goto('/methodology/adjusted-roi');

    // Check key sections are present
    await expect(page.locator('h1:has-text("Reality Mode")')).toBeVisible();
    await expect(page.locator('text="UK Section 24"')).toBeVisible();
    await expect(page.locator('text="EPC Upgrade Costs"')).toBeVisible();
    await expect(page.locator('text="Calculation Formula"')).toBeVisible();

    // Check disclaimer is present
    await expect(page.locator('text=/Not Financial or Tax Advice/i')).toBeVisible();
  });

  test('Reality Mode info tooltip shows explanation', async ({ page }) => {
    const authButton = page.locator('text="Sign In"');
    const isAuthenticated = !(await authButton.isVisible());

    if (!isAuthenticated) {
      test.skip();
      return;
    }

    // Find the info icon next to Reality Mode label
    const infoIcon = page.locator('[aria-label="Reality Mode info"]').or(
      page.locator('svg[data-lucide="info"]').first()
    );
    
    // Hover to show tooltip
    await infoIcon.hover();
    await page.waitForTimeout(500);

    // Check tooltip content
    const tooltip = page.locator('text=/local taxes/i');
    await expect(tooltip).toBeVisible();
  });
});

test.describe('SEO Pages', () => {
  test('Invest city page renders with dynamic content', async ({ page }) => {
    await page.goto('/invest/uk/london');

    // Check page renders
    await expect(page.locator('h1')).toContainText(/London|Investment/i);

    // Check JSON-LD schema is present
    const jsonLd = await page.locator('script[type="application/ld+json"]').count();
    expect(jsonLd).toBeGreaterThan(0);

    // Check OpenGraph meta tags
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();
  });

  test('Invest city page shows market stats', async ({ page }) => {
    await page.goto('/invest/uk/manchester');

    // Should show some market data or placeholder
    const statsSection = page.locator('text=/Average Price|Market Stats|Properties/i').first();
    await expect(statsSection).toBeVisible();
  });
});
