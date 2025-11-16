import { test, expect } from '@playwright/test';
import fs from 'fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

/**
 * Fidelity Scoring System
 * Calculates percentage match between original and clone
 */

const CLONE_URL = 'http://localhost:3000';

interface FidelityScore {
  overall: number;
  visual: number;
  css: number;
  structure: number;
  interactivity: number;
  details: {
    colorMatch: number;
    spacingMatch: number;
    typographyMatch: number;
    layoutMatch: number;
    componentCount: number;
  };
}

test.describe('Fidelity Scoring', () => {
  
  let fidelityScore: FidelityScore = {
    overall: 0,
    visual: 0,
    css: 0,
    structure: 0,
    interactivity: 0,
    details: {
      colorMatch: 0,
      spacingMatch: 0,
      typographyMatch: 0,
      layoutMatch: 0,
      componentCount: 0
    }
  };

  test('Calculate Visual Fidelity', async ({ page }) => {
    await page.goto(CLONE_URL);
    
    // Read visual scores from persistent file (saved by visual tests)
    const visualScoresFile = 'agent/output/visual-scores.json';
    
    if (fs.existsSync(visualScoresFile)) {
      const visualScores = JSON.parse(fs.readFileSync(visualScoresFile, 'utf-8'));
      const scores = Object.values(visualScores) as number[];
      
      if (scores.length > 0) {
        fidelityScore.visual = scores.reduce((a, b) => a + b, 0) / scores.length;
        console.log(`📸 Visual Match: ${fidelityScore.visual.toFixed(2)}%`);
        if (visualScores.homepage) console.log(`   - Homepage: ${visualScores.homepage.toFixed(2)}%`);
        if (visualScores.projects) console.log(`   - Projects: ${visualScores.projects.toFixed(2)}%`);
        if (visualScores.tasks) console.log(`   - Tasks: ${visualScores.tasks.toFixed(2)}%`);
      } else {
        console.log('⚠️  No visual scores found');
        fidelityScore.visual = 0;
      }
    } else {
      console.log('⚠️  Run visual tests first to generate screenshots');
      fidelityScore.visual = 0;
    }
  });

  test('Calculate CSS Fidelity', async ({ page }) => {
    await page.goto(CLONE_URL);
    
    // Extract CSS properties
    const cssMetrics = await page.evaluate(() => {
      const metrics = {
        colors: new Set<string>(),
        fonts: new Set<string>(),
        spacings: new Set<string>(),
        shadows: new Set<string>(),
        radii: new Set<string>()
      };
      
      const elements = document.querySelectorAll('*');
      
      elements.forEach(el => {
        const styles = window.getComputedStyle(el);
        
        // Colors
        if (styles.color && styles.color !== 'rgba(0, 0, 0, 0)') {
          metrics.colors.add(styles.color);
        }
        if (styles.backgroundColor && styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
          metrics.colors.add(styles.backgroundColor);
        }
        
        // Typography
        if (styles.fontFamily) {
          metrics.fonts.add(styles.fontFamily);
        }
        
        // Spacing
        if (styles.padding && styles.padding !== '0px') {
          metrics.spacings.add(styles.padding);
        }
        
        // Effects
        if (styles.boxShadow && styles.boxShadow !== 'none') {
          metrics.shadows.add(styles.boxShadow);
        }
        if (styles.borderRadius && styles.borderRadius !== '0px') {
          metrics.radii.add(styles.borderRadius);
        }
      });
      
      return {
        colors: metrics.colors.size,
        fonts: metrics.fonts.size,
        spacings: metrics.spacings.size,
        shadows: metrics.shadows.size,
        radii: metrics.radii.size
      };
    });
    
    // Load expected CSS from crawl
    const extractionResults = JSON.parse(
      fs.readFileSync('agent/output/extraction-results.json', 'utf-8')
    );
    
    // Calculate CSS scores
    const colorScore = Math.min((cssMetrics.colors / 20) * 100, 100);
    const fontScore = Math.min((cssMetrics.fonts / 3) * 100, 100);
    const spacingScore = Math.min((cssMetrics.spacings / 10) * 100, 100);
    
    fidelityScore.details.colorMatch = colorScore;
    fidelityScore.details.spacingMatch = spacingScore;
    fidelityScore.details.typographyMatch = fontScore;
    
    fidelityScore.css = (colorScore + fontScore + spacingScore) / 3;
    
    console.log(`🎨 CSS Fidelity: ${fidelityScore.css.toFixed(2)}%`);
    console.log(`   - Colors: ${colorScore.toFixed(1)}% (${cssMetrics.colors} unique)`);
    console.log(`   - Typography: ${fontScore.toFixed(1)}% (${cssMetrics.fonts} fonts)`);
    console.log(`   - Spacing: ${spacingScore.toFixed(1)}% (${cssMetrics.spacings} values)`);
  });

  test('Calculate Structure Fidelity', async ({ page }) => {
    await page.goto(CLONE_URL);
    
    const structureMetrics = await page.evaluate(() => {
      const metrics = {
        hasHeader: !!document.querySelector('header, [class*="header"]'),
        hasSidebar: !!document.querySelector('aside, [class*="sidebar"]'),
        hasMain: !!document.querySelector('main, [class*="main"]'),
        hasNav: !!document.querySelector('nav'),
        totalComponents: 0,
        semanticElements: 0
      };
      
      // Count semantic elements
      const semantic = document.querySelectorAll(
        'header, nav, main, section, article, aside, footer'
      );
      metrics.semanticElements = semantic.length;
      
      // Count potential components (elements with classes)
      const componentsWithClasses = document.querySelectorAll('[class]');
      metrics.totalComponents = componentsWithClasses.length;
      
      return metrics;
    });
    
    // Calculate structure score
    let structureScore = 0;
    if (structureMetrics.hasHeader) structureScore += 25;
    if (structureMetrics.hasSidebar) structureScore += 25;
    if (structureMetrics.hasMain) structureScore += 25;
    if (structureMetrics.semanticElements > 5) structureScore += 25;
    
    fidelityScore.structure = structureScore;
    fidelityScore.details.componentCount = structureMetrics.totalComponents;
    fidelityScore.details.layoutMatch = structureScore;
    
    console.log(`🏗️  Structure Fidelity: ${structureScore}%`);
    console.log(`   - Header: ${structureMetrics.hasHeader ? '✓' : '✗'}`);
    console.log(`   - Sidebar: ${structureMetrics.hasSidebar ? '✓' : '✗'}`);
    console.log(`   - Main: ${structureMetrics.hasMain ? '✓' : '✗'}`);
    console.log(`   - Components: ${structureMetrics.totalComponents}`);
  });

  test('Calculate Interactivity Fidelity', async ({ page }) => {
    await page.goto(CLONE_URL);
    
    const interactivityMetrics = await page.evaluate(() => {
      const metrics = {
        buttons: document.querySelectorAll('button, [role="button"]').length,
        links: document.querySelectorAll('a[href]').length,
        inputs: document.querySelectorAll('input, textarea, select').length,
        clickable: document.querySelectorAll('[onclick], [class*="click"]').length,
        hover: document.querySelectorAll('[class*="hover"]').length
      };
      
      return metrics;
    });
    
    // Calculate interactivity score
    const totalInteractive = 
      interactivityMetrics.buttons +
      interactivityMetrics.links +
      interactivityMetrics.inputs;
    
    const interactivityScore = Math.min((totalInteractive / 20) * 100, 100);
    fidelityScore.interactivity = interactivityScore;
    
    console.log(`🖱️  Interactivity Fidelity: ${interactivityScore.toFixed(2)}%`);
    console.log(`   - Buttons: ${interactivityMetrics.buttons}`);
    console.log(`   - Links: ${interactivityMetrics.links}`);
    console.log(`   - Inputs: ${interactivityMetrics.inputs}`);
  });

  test.afterAll(() => {
    // Calculate overall fidelity score
    fidelityScore.overall = (
      fidelityScore.visual * 0.4 +
      fidelityScore.css * 0.3 +
      fidelityScore.structure * 0.2 +
      fidelityScore.interactivity * 0.1
    );
    
    // Generate report
    const report = {
      timestamp: new Date().toISOString(),
      scores: fidelityScore,
      summary: generateSummary(fidelityScore)
    };
    
    // Save report
    fs.writeFileSync(
      'test-results/fidelity-report.json',
      JSON.stringify(report, null, 2)
    );
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('🎯 FIDELITY SCORE REPORT');
    console.log('='.repeat(60));
    console.log(`\n📊 Overall Fidelity: ${fidelityScore.overall.toFixed(2)}%\n`);
    console.log(`   Visual Match:        ${fidelityScore.visual.toFixed(1)}%`);
    console.log(`   CSS Accuracy:        ${fidelityScore.css.toFixed(1)}%`);
    console.log(`   Structure Match:     ${fidelityScore.structure.toFixed(1)}%`);
    console.log(`   Interactivity:       ${fidelityScore.interactivity.toFixed(1)}%`);
    console.log('\n📋 Details:');
    console.log(`   Color Match:         ${fidelityScore.details.colorMatch.toFixed(1)}%`);
    console.log(`   Typography Match:    ${fidelityScore.details.typographyMatch.toFixed(1)}%`);
    console.log(`   Spacing Match:       ${fidelityScore.details.spacingMatch.toFixed(1)}%`);
    console.log(`   Layout Match:        ${fidelityScore.details.layoutMatch.toFixed(1)}%`);
    console.log(`   Component Count:     ${fidelityScore.details.componentCount}`);
    console.log('\n' + '='.repeat(60));
    console.log(`\n✨ ${report.summary}\n`);
    
    // Assert minimum quality
    expect(fidelityScore.overall).toBeGreaterThan(30);
  });
});

/**
 * Compare two images and return similarity percentage
 */
async function compareImages(img1Path: string, img2Path: string): Promise<number> {
  try {
    const img1 = PNG.sync.read(Buffer.from(fs.readFileSync(img1Path)));
    const img2 = PNG.sync.read(Buffer.from(fs.readFileSync(img2Path)));
    
    const { width, height } = img1;
    const diff = new PNG({ width, height });
    
    const numDiffPixels = pixelmatch(
      img1.data,
      img2.data,
      diff.data,
      width,
      height,
      { threshold: 0.1 }
    );
    
    const totalPixels = width * height;
    const similarity = ((totalPixels - numDiffPixels) / totalPixels) * 100;
    
    // Save diff image
    fs.writeFileSync('test-results/visual-diff.png', PNG.sync.write(diff));
    
    return similarity;
  } catch (error) {
    console.error('Error comparing images:', error);
    return 0;
  }
}

/**
 * Generate human-readable summary
 */
function generateSummary(score: FidelityScore): string {
  const overall = score.overall;
  
  if (overall >= 90) {
    return 'Excellent! Near pixel-perfect replication achieved.';
  } else if (overall >= 75) {
    return 'Very Good! High fidelity clone with minor differences.';
  } else if (overall >= 60) {
    return 'Good! Decent replication with room for improvement.';
  } else if (overall >= 40) {
    return 'Fair. Basic structure present but needs refinement.';
  } else {
    return 'Needs Improvement. Significant differences from original.';
  }
}
