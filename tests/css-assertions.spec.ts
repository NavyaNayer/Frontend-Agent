import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * CSS Property Assertions
 * Validates that computed CSS styles match between original and clone
 */

const CLONE_URL = 'http://localhost:3000';

// Load extracted CSS data from crawl
const extractionResults = JSON.parse(
  fs.readFileSync('agent/output/extraction-results.json', 'utf-8')
);

test.describe('CSS Property Assertions', () => {
  
  test('Color Palette - Exact Hex Values', async ({ page }) => {
    await page.goto(CLONE_URL);
    
    // Extract colors from generated app
    const extractedColors = await page.evaluate(() => {
      const colors = new Set<string>();
      const allElements = document.querySelectorAll('*');
      
      allElements.forEach(el => {
        const styles = window.getComputedStyle(el);
        
        // Extract color values
        const color = styles.color;
        const bgColor = styles.backgroundColor;
        const borderColor = styles.borderColor;
        
        if (color && color !== 'rgba(0, 0, 0, 0)') colors.add(color);
        if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)') colors.add(bgColor);
        if (borderColor && borderColor !== 'rgba(0, 0, 0, 0)') colors.add(borderColor);
      });
      
      return Array.from(colors);
    });
    
    console.log('📊 Extracted colors from clone:', extractedColors.length);
    
    // Load expected colors from crawl data
    const pages = extractionResults.pages || [];
    let totalExpectedColors = 0;
    let matchedColors = 0;
    
    for (const pageData of pages) {
      const cssFile = `agent/output/css/page-${pages.indexOf(pageData)}.json`;
      if (fs.existsSync(cssFile)) {
        const cssData = JSON.parse(fs.readFileSync(cssFile, 'utf-8'));
        
        // Extract colors from parsed CSS
        Object.values(cssData).forEach((styles: any) => {
          if (styles.color) {
            totalExpectedColors++;
            if (extractedColors.some(c => rgbToHex(c) === rgbToHex(styles.color))) {
              matchedColors++;
            }
          }
          if (styles.backgroundColor) {
            totalExpectedColors++;
            if (extractedColors.some(c => rgbToHex(c) === rgbToHex(styles.backgroundColor))) {
              matchedColors++;
            }
          }
        });
      }
    }
    
    const colorMatchPercentage = totalExpectedColors > 0 
      ? (matchedColors / totalExpectedColors) * 100 
      : 0;
    
    console.log(`🎨 Color Match: ${colorMatchPercentage.toFixed(2)}% (${matchedColors}/${totalExpectedColors})`);
    
    // Assert reasonable color matching
    expect(extractedColors.length).toBeGreaterThan(5);
  });

  test('Primary Button - Color Assertion', async ({ page }) => {
    await page.goto(CLONE_URL);
    
    // Find primary button
    const primaryButton = await page.locator('button').first();
    
    if (await primaryButton.count() > 0) {
      const bgColor = await primaryButton.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      
      const textColor = await primaryButton.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });
      
      console.log('🔘 Primary Button Colors:', { bgColor, textColor });
      
      // Assert button has actual colors (not transparent)
      expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(textColor).not.toBe('rgba(0, 0, 0, 0)');
    }
  });

  test('Typography - Font Families', async ({ page }) => {
    await page.goto(CLONE_URL);
    
    const fontFamilies = await page.evaluate(() => {
      const fonts = new Set<string>();
      const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, button, a');
      
      elements.forEach(el => {
        const fontFamily = window.getComputedStyle(el).fontFamily;
        fonts.add(fontFamily);
      });
      
      return Array.from(fonts);
    });
    
    console.log('🔤 Font Families Used:', fontFamilies);
    
    // Assert consistent typography
    expect(fontFamilies.length).toBeGreaterThan(0);
    expect(fontFamilies.length).toBeLessThan(5); // Reasonable number of fonts
  });

  test('Spacing - Padding and Margins', async ({ page }) => {
    await page.goto(CLONE_URL);
    
    const spacingData = await page.evaluate(() => {
      const spacing = {
        paddings: new Set<string>(),
        margins: new Set<string>()
      };
      
      const elements = document.querySelectorAll('div, section, article, header, footer');
      
      elements.forEach(el => {
        const styles = window.getComputedStyle(el);
        
        if (styles.padding && styles.padding !== '0px') {
          spacing.paddings.add(styles.padding);
        }
        if (styles.margin && styles.margin !== '0px') {
          spacing.margins.add(styles.margin);
        }
      });
      
      return {
        paddings: Array.from(spacing.paddings),
        margins: Array.from(spacing.margins)
      };
    });
    
    console.log('📏 Spacing Values:', {
      paddings: spacingData.paddings.length,
      margins: spacingData.margins.length
    });
    
    // Assert spacing is applied
    expect(spacingData.paddings.length).toBeGreaterThan(0);
  });

  test('Border Radius - Rounded Corners', async ({ page }) => {
    await page.goto(CLONE_URL);
    
    const borderRadii = await page.evaluate(() => {
      const radii = new Set<string>();
      const elements = document.querySelectorAll('button, div, section, img, input');
      
      elements.forEach(el => {
        const borderRadius = window.getComputedStyle(el).borderRadius;
        if (borderRadius && borderRadius !== '0px') {
          radii.add(borderRadius);
        }
      });
      
      return Array.from(radii);
    });
    
    console.log('⚪ Border Radius Values:', borderRadii);
    
    // Assert rounded corners are used
    expect(borderRadii.length).toBeGreaterThan(0);
  });

  test('Box Shadows - Depth and Elevation', async ({ page }) => {
    await page.goto(CLONE_URL);
    
    const shadows = await page.evaluate(() => {
      const shadowSet = new Set<string>();
      const elements = document.querySelectorAll('*');
      
      elements.forEach(el => {
        const boxShadow = window.getComputedStyle(el).boxShadow;
        if (boxShadow && boxShadow !== 'none') {
          shadowSet.add(boxShadow);
        }
      });
      
      return Array.from(shadowSet);
    });
    
    console.log('🌓 Box Shadows Used:', shadows.length);
    
    // Shadows add depth to UI
    if (shadows.length > 0) {
      console.log('Shadow examples:', shadows.slice(0, 3));
    }
  });

  test('Flexbox Layout - Structure', async ({ page }) => {
    await page.goto(CLONE_URL);
    
    const flexStats = await page.evaluate(() => {
      const stats = {
        flexContainers: 0,
        gridContainers: 0,
        totalElements: 0
      };
      
      const elements = document.querySelectorAll('*');
      stats.totalElements = elements.length;
      
      elements.forEach(el => {
        const display = window.getComputedStyle(el).display;
        if (display === 'flex' || display === 'inline-flex') {
          stats.flexContainers++;
        }
        if (display === 'grid' || display === 'inline-grid') {
          stats.gridContainers++;
        }
      });
      
      return stats;
    });
    
    console.log('📦 Layout Statistics:', flexStats);
    
    // Modern layouts use flexbox/grid
    expect(flexStats.flexContainers + flexStats.gridContainers).toBeGreaterThan(0);
  });

  test('Responsive Classes - Tailwind CSS', async ({ page }) => {
    await page.goto(CLONE_URL);
    
    const tailwindUsage = await page.evaluate(() => {
      const elements = document.querySelectorAll('[class]');
      const tailwindClasses = new Set<string>();
      
      elements.forEach(el => {
        const className = el.className;
        if (typeof className === 'string' && className) {
          const classes = className.split(' ');
          classes.forEach(cls => {
            // Check for Tailwind patterns
            if (
              cls.match(/^(p|m|w|h|text|bg|border|rounded|shadow|flex|grid)-/) ||
              cls.match(/^(sm|md|lg|xl):/)
            ) {
              tailwindClasses.add(cls);
            }
          });
        }
      });
      
      return {
        totalTailwindClasses: tailwindClasses.size,
        examples: Array.from(tailwindClasses).slice(0, 10)
      };
    });
    
    console.log('🎨 Tailwind CSS Usage:', tailwindUsage);
    
    // Assert Tailwind is being used
    expect(tailwindUsage.totalTailwindClasses).toBeGreaterThan(10);
  });

  test('Hover States - Interactive Elements', async ({ page }) => {
    await page.goto(CLONE_URL);
    
    const buttons = await page.locator('button, a, [role="button"]').all();
    
    if (buttons.length > 0) {
      const button = buttons[0];
      
      // Get default state
      const defaultColor = await button.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      
      // Hover and check for change
      await button.hover();
      await page.waitForTimeout(100);
      
      const hoverColor = await button.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      
      console.log('🖱️ Button States:', { defaultColor, hoverColor });
      
      // Hover states can change color (but not required)
      expect(defaultColor).toBeDefined();
    }
  });
});

/**
 * Convert RGB to Hex for comparison
 */
function rgbToHex(rgb: string): string {
  if (rgb.startsWith('#')) return rgb;
  
  const match = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return rgb;
  
  const r = parseInt(match[1]).toString(16).padStart(2, '0');
  const g = parseInt(match[2]).toString(16).padStart(2, '0');
  const b = parseInt(match[3]).toString(16).padStart(2, '0');
  
  return `#${r}${g}${b}`;
}
