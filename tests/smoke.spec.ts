import { test, expect } from '@playwright/test';

test.describe('YieldPilot Smoke Tests', () => {
  test('home page loads successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check for main heading
    await expect(page.locator('h1')).toContainText('YieldPilot');
    
    // Check for URL input
    const input = page.locator('input[type="url"]');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', /Zoopla or Rightmove/i);
  });

  test('paste and validate Zoopla URL', async ({ page }) => {
    await page.goto('/');
    
    const input = page.locator('input[type="url"]');
    const exampleUrl = 'https://www.zoopla.co.uk/for-sale/property/london/';
    
    // Type URL
    await input.fill(exampleUrl);
    
    // Wait for validation message
    await page.waitForTimeout(400); // debounce delay
    
    // Should show validation success
    await expect(page.locator('text=/Looks like Zoopla/i')).toBeVisible();
  });

  test('shows error for invalid URL', async ({ page }) => {
    await page.goto('/');
    
    const input = page.locator('input[type="url"]');
    await input.fill('not a valid url');
    
    await page.waitForTimeout(400);
    
    // Should show validation error
    await expect(page.locator('text=/Invalid URL/i')).toBeVisible();
  });

  test('analyze button disabled when URL invalid', async ({ page }) => {
    await page.goto('/');
    
    const analyzeButton = page.locator('button', { hasText: /Analyze Property/i });
    
    // Initially disabled (no URL)
    await expect(analyzeButton).toBeDisabled();
    
    // Still disabled with invalid URL
    const input = page.locator('input[type="url"]');
    await input.fill('invalid');
    await page.waitForTimeout(400);
    await expect(analyzeButton).toBeDisabled();
  });

  test('auto-prefix www. with https://', async ({ page }) => {
    await page.goto('/');
    
    const input = page.locator('input[type="url"]');
    await input.fill('www.zoopla.co.uk/for-sale/property/london/');
    
    await page.waitForTimeout(400);
    
    // Should show valid (auto-prefixed)
    await expect(page.locator('text=/Looks like Zoopla/i')).toBeVisible();
  });

  test('navigation links are present', async ({ page }) => {
    await page.goto('/');
    
    // Check for Dashboard and Browse Deals links
    await expect(page.locator('a:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('a:has-text("Browse Deals")')).toBeVisible();
  });

  test('stats section displays', async ({ page }) => {
    await page.goto('/');
    
    // Check for key stats
    await expect(page.locator('text=/10k\+/i')).toBeVisible();
    await expect(page.locator('text=/98%/i')).toBeVisible();
    await expect(page.locator('text=/<30s/i')).toBeVisible();
  });
});
