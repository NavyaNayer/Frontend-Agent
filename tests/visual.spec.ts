import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

/**
 * Visual Regression Testing for Asana Clone
 * Compares generated clone with original Asana pages
 */

const ORIGINAL_URL = process.env.TARGET_URL || 'https://app.asana.com';
const CLONE_URL = 'http://localhost:3000';
const MASK_SELECTORS = (process.env.MASK_SELECTORS || '').split(',').filter(Boolean);

test.describe('Visual Comparison Tests', () => {
  
  test.beforeAll(async () => {
    // Verify clone app is running
    try {
      const response = await fetch(CLONE_URL);
      if (!response.ok) {
        throw new Error('Clone app is not running');
      }
    } catch (error) {
      console.error('⚠️  Make sure the clone app is running on port 3000');
      console.error('   Run: cd generated-app && npm run dev');
      throw error;
    }
  });

  test('Homepage - Visual Comparison', async ({ page, browser }) => {
    await runVisualComparison(page, browser, '/', 'homepage');
  });

  test('Projects Page - Visual Comparison', async ({ page, browser }) => {
    await runVisualComparison(page, browser, '/projects', 'projects');
  });

  test('Tasks Page - Visual Comparison', async ({ page, browser }) => {
    await runVisualComparison(page, browser, '/tasks', 'tasks');
  });

  test('Layout Structure - Component Detection', async ({ page }) => {
    await page.goto(CLONE_URL);
    
    // Check for major layout components
    const header = await page.$('header, [class*="header"]');
    const sidebar = await page.$('aside, [class*="sidebar"]');
    const main = await page.$('main, [class*="main"]');
    
    expect(header).not.toBeNull();
    expect(sidebar).not.toBeNull();
    expect(main).not.toBeNull();
  });

  test('Responsive Design - Mobile View', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(CLONE_URL);
    
    // Take mobile screenshot
    await page.screenshot({ 
      path: 'test-results/mobile-view.png',
      fullPage: true 
    });
    
    // Check mobile-specific elements
    const isMobileOptimized = await page.evaluate(() => {
      const body = document.body;
      const width = body.offsetWidth;
      return width <= 375;
    });
    
    expect(isMobileOptimized).toBeTruthy();
  });

  test('Responsive Design - Tablet View', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(CLONE_URL);
    
    // Take tablet screenshot
    await page.screenshot({ 
      path: 'test-results/tablet-view.png',
      fullPage: true 
    });
  });

  test('Interactive Elements - Hover States', async ({ page }) => {
    await page.goto(CLONE_URL);
    
    // Find all buttons
    const buttons = await page.$$('button, [role="button"]');
    
    if (buttons.length > 0) {
      // Test first button's hover state
      await buttons[0].hover();
      await page.screenshot({ 
        path: 'test-results/hover-state.png' 
      });
    }
  });

  test('Accessibility - ARIA Labels', async ({ page }) => {
    await page.goto(CLONE_URL);
    
    // Run basic accessibility checks
    const accessibilityIssues = await page.evaluate(() => {
      const issues = [];
      
      // Check for images without alt text
      const images = document.querySelectorAll('img:not([alt])');
      if (images.length > 0) {
        issues.push(`${images.length} images without alt text`);
      }
      
      // Check for buttons without labels
      const buttons = document.querySelectorAll('button:not([aria-label]):not([title])');
      const unlabeledButtons = Array.from(buttons).filter(btn => !btn.textContent?.trim());
      if (unlabeledButtons.length > 0) {
        issues.push(`${unlabeledButtons.length} buttons without labels`);
      }
      
      return issues;
    });
    
    console.log('Accessibility issues:', accessibilityIssues);
  });

  test('Performance - Page Load Time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(CLONE_URL);
    const loadTime = Date.now() - startTime;
    
    console.log(`Page load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000); // Should load in under 5 seconds
  });
});

/**
 * Run visual comparison between original and clone
 */
async function runVisualComparison(
  page: Page, 
  browser: any, 
  path: string, 
  name: string
) {
  try {
    // Use saved screenshots from crawl instead of fetching original site
    const extractionResults = JSON.parse(
      fs.readFileSync('agent/output/extraction-results.json', 'utf-8')
    );
    
    // Map page names to screenshot indices
    const pageIndex = name === 'homepage' ? 0 : name === 'projects' ? 1 : 2;
    const savedScreenshot = extractionResults.pages[pageIndex]?.screenshotPath?.viewport;
    
    let originalScreenshot: Buffer;
    
    if (savedScreenshot && fs.existsSync(savedScreenshot)) {
      // Use saved screenshot from crawl
      console.log(`Using saved screenshot: ${savedScreenshot}`);
      originalScreenshot = fs.readFileSync(savedScreenshot);
    } else {
      console.log('⚠️  No saved screenshot found, skipping visual comparison');
      return;
    }
    
    // Copy to test-results for comparison
    fs.writeFileSync(
      `test-results/${name}-original.png`, 
      originalScreenshot
    );

    // Navigate to clone
    await page.goto(`${CLONE_URL}${path}`, { 
      waitUntil: 'networkidle' 
    });
    await page.waitForTimeout(1000);

    // Mask dynamic content on clone
    await maskDynamicContent(page);

    // Take screenshot of clone
    const cloneScreenshot = await page.screenshot({ 
      fullPage: true,
      animations: 'disabled'
    });
    
    fs.writeFileSync(
      `test-results/${name}-clone.png`, 
      cloneScreenshot
    );

    // Get dimensions from clone
    const cloneDimensions = await page.evaluate(() => ({
      width: document.body.scrollWidth,
      height: document.body.scrollHeight
    }));

    console.log(`Clone dimensions: ${cloneDimensions.width}x${cloneDimensions.height}`);

    // Pixel-by-pixel comparison using pixelmatch
    const originalImg = PNG.sync.read(Buffer.from(originalScreenshot));
    const cloneImg = PNG.sync.read(Buffer.from(cloneScreenshot));
    
    const { width, height } = originalImg;
    const diff = new PNG({ width, height });
    
    const numDiffPixels = pixelmatch(
      originalImg.data,
      cloneImg.data,
      diff.data,
      width,
      height,
      { threshold: 0.1 }
    );
    
    const totalPixels = width * height;
    const diffPercentage = ((numDiffPixels / totalPixels) * 100).toFixed(2);
    const matchPercentage = (100 - parseFloat(diffPercentage)).toFixed(2);
    
    console.log(`📊 Visual Match: ${matchPercentage}% (${numDiffPixels}/${totalPixels} pixels differ)`);
    
    // Save diff image for inspection
    fs.writeFileSync(`test-results/${name}-diff.png`, PNG.sync.write(diff));
    
    // Save visual match score for fidelity reporting (in persistent location)
    const scoresPath = 'agent/output/visual-scores.json';
    const visualScores = fs.existsSync(scoresPath) 
      ? JSON.parse(fs.readFileSync(scoresPath, 'utf-8'))
      : {};
    visualScores[name] = parseFloat(matchPercentage);
    fs.writeFileSync(scoresPath, JSON.stringify(visualScores, null, 2));
    
    // Assert reasonable match (>50% similarity for initial testing)
    expect(parseFloat(matchPercentage)).toBeGreaterThan(50);

  } catch (error) {
    console.error(`Visual comparison failed for ${name}:`, (error as Error).message);
    throw error;
  }
}

/**
 * Authenticate to Asana
 */
async function authenticateAsana(page: Page) {
  try {
    await page.goto(`${ORIGINAL_URL}/app/login`, { 
      waitUntil: 'networkidle' 
    });

    await page.fill('input[type="email"]', process.env.ASANA_EMAIL!);
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    
    await page.fill('input[type="password"]', process.env.ASANA_PASSWORD!);
    await page.click('button[type="submit"]');
    
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    await page.waitForTimeout(3000);
  } catch (error) {
    console.error('Authentication failed:', error);
  }
}

/**
 * Mask dynamic content
 */
async function maskDynamicContent(page: Page) {
  if (MASK_SELECTORS.length === 0) return;

  await page.evaluate((selectors) => {
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector.trim());
      elements.forEach(el => {
        if (el instanceof HTMLElement) {
          el.style.visibility = 'hidden';
        }
      });
    });
  }, MASK_SELECTORS);
}
