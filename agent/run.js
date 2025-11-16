/**
 * Main orchestrator for the Clooney Agent
 * Coordinates crawling, extraction, and generation phases
 */

import { chromium } from 'playwright';
import { crawlPages } from './crawler.js';
import { extractComponents } from './extractor.js';
import { generateReactApp } from './generator.js';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const OUTPUT_DIR = path.join(__dirname, 'output');
const GENERATED_APP_DIR = path.join(__dirname, '..', 'generated-app');

/**
 * Main execution flow
 */
async function main() {
  console.log(chalk.cyan.bold('\n🎬 CLOONEY AGENT — Frontend Replication System\n'));
  console.log(chalk.gray('═'.repeat(60)));

  const startTime = Date.now();

  try {
    // Validate environment
    validateEnvironment();

    // Setup output directories
    await setupDirectories();

    // Phase 1: Crawl target website
    console.log(chalk.yellow.bold('\n📡 PHASE 1: CRAWLING'));
    console.log(chalk.gray('─'.repeat(60)));
    const crawlData = await crawlPages();
    
    if (!crawlData || crawlData.length === 0) {
      throw new Error('No pages were crawled successfully');
    }

    console.log(chalk.green(`✓ Crawled ${crawlData.length} pages successfully`));

    // Phase 2: Extract components
    console.log(chalk.yellow.bold('\n🔍 PHASE 2: COMPONENT EXTRACTION'));
    console.log(chalk.gray('─'.repeat(60)));
    const components = await extractComponents(crawlData);
    
    console.log(chalk.green(`✓ Extracted ${components.length} components`));

    // Save extraction results
    await saveExtractionResults(crawlData, components);

    // Phase 3: Generate React application
    console.log(chalk.yellow.bold('\n⚛️  PHASE 3: REACT APP GENERATION'));
    console.log(chalk.gray('─'.repeat(60)));
    await generateReactApp(components, crawlData);
    
    console.log(chalk.green('✓ Generated React application'));

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(chalk.gray('\n' + '═'.repeat(60)));
    console.log(chalk.green.bold('✨ AGENT EXECUTION COMPLETE'));
    console.log(chalk.gray(`   Duration: ${duration}s`));
    console.log(chalk.gray(`   Output: ${OUTPUT_DIR}`));
    console.log(chalk.gray(`   Generated App: ${GENERATED_APP_DIR}`));
    console.log(chalk.gray('═'.repeat(60) + '\n'));

    console.log(chalk.cyan('Next steps:'));
    console.log(chalk.white('  1. Review generated components in generated-app/'));
    console.log(chalk.white('  2. Run visual tests: npm run test:visual'));
    console.log(chalk.white('  3. Customize components as needed\n'));

  } catch (error) {
    console.error(chalk.red.bold('\n❌ ERROR:'), error.message);
    console.error(chalk.gray(error.stack));
    process.exit(1);
  }
}

/**
 * Validate required environment variables
 */
function validateEnvironment() {
  const required = ['OPENAI_API_KEY', 'TARGET_URL'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please copy env.template to .env and fill in the values.'
    );
  }

  console.log(chalk.green('✓ Environment validated'));
}

/**
 * Setup output directories
 */
async function setupDirectories() {
  const dirs = [
    OUTPUT_DIR,
    path.join(OUTPUT_DIR, 'screenshots'),
    path.join(OUTPUT_DIR, 'html'),
    path.join(OUTPUT_DIR, 'css'),
    path.join(OUTPUT_DIR, 'components'),
    GENERATED_APP_DIR
  ];

  for (const dir of dirs) {
    await fs.ensureDir(dir);
  }

  console.log(chalk.green('✓ Output directories ready'));
}

/**
 * Save extraction results to JSON files
 */
async function saveExtractionResults(crawlData, components) {
  const resultsPath = path.join(OUTPUT_DIR, 'extraction-results.json');
  
  await fs.writeJson(resultsPath, {
    timestamp: new Date().toISOString(),
    pages: crawlData.map(page => ({
      url: page.url,
      title: page.title,
      screenshotPath: page.screenshotPath
    })),
    components: components.map(comp => ({
      id: comp.id,
      name: comp.name,
      type: comp.type,
      selector: comp.selector,
      hasChildren: comp.children && comp.children.length > 0
    })),
    stats: {
      totalPages: crawlData.length,
      totalComponents: components.length,
      componentTypes: [...new Set(components.map(c => c.type))]
    }
  }, { spaces: 2 });

  console.log(chalk.green(`✓ Saved extraction results to ${path.basename(resultsPath)}`));
}

// Run the agent
main().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
