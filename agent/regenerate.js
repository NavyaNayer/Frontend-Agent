/**
 * Standalone generator - regenerates app from existing extraction data
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { generateReactApp } from './generator.js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const OUTPUT_DIR = path.join(__dirname, 'output');

async function main() {
  console.log(chalk.cyan.bold('\n🔄 REGENERATING REACT APP\n'));
  
  try {
    // Load extraction results
    const resultsPath = path.join(OUTPUT_DIR, 'extraction-results.json');
    
    if (!await fs.pathExists(resultsPath)) {
      throw new Error('No extraction results found. Run "npm run crawl" first.');
    }

    const results = await fs.readJson(resultsPath);
    
    console.log(chalk.blue(`Found ${results.components.length} components and ${results.pages.length} pages`));
    
    // Load full crawl data with CSS parsing
    const { parseCSSFiles } = await import('./css-parser.js');
    const crawlData = [];
    
    for (let i = 0; i < results.pages.length; i++) {
      const htmlPath = path.join(OUTPUT_DIR, 'html', `page-${i}.html`);
      const cssPath = path.join(OUTPUT_DIR, 'css', `page-${i}.json`);
      const cssDir = path.join(OUTPUT_DIR, 'css', `page-${i}`);
      
      if (await fs.pathExists(htmlPath)) {
        const html = await fs.readFile(htmlPath, 'utf-8');
        const computedStyles = await fs.readJson(cssPath).catch(() => ({}));
        
        // Parse CSS files to extract design tokens
        let parsedCSS = null;
        if (await fs.pathExists(cssDir)) {
          parsedCSS = await parseCSSFiles(cssDir);
        }
        
        crawlData.push({
          ...results.pages[i],
          html,
          computedStyles,
          parsedCSS,
          structure: {} // Structure was saved in extraction-results
        });
      }
    }
    
    // Reconstruct components with full data
    const components = results.components.map(comp => ({
      ...comp,
      html: `<${comp.type} class="${comp.selector.replace(/[#.]/g, '')}">\n  <!-- ${comp.name} content -->\n</${comp.type}>`,
      styles: {}
    }));
    
    // Generate app
    await generateReactApp(components, crawlData);
    
    console.log(chalk.green.bold('\n✨ Regeneration complete!\n'));
    
  } catch (error) {
    console.error(chalk.red.bold('\n❌ ERROR:'), error.message);
    process.exit(1);
  }
}

main();
