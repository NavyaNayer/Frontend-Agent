/**
 * Validation script - checks if pages are using Sidebar/Header components correctly
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PAGES_DIR = path.join(__dirname, 'generated-app', 'src', 'pages');

async function validatePages() {
  console.log(chalk.cyan.bold('\n🔍 VALIDATING PAGE COMPONENTS\n'));
  
  const files = await fs.readdir(PAGES_DIR);
  const pageFiles = files.filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
  
  let passCount = 0;
  let failCount = 0;
  
  for (const file of pageFiles) {
    const filePath = path.join(PAGES_DIR, file);
    const content = await fs.readFile(filePath, 'utf-8');
    
    const issues = [];
    
    // Check if Sidebar/Header are imported
    const hasImport = content.includes("from '../components'") || 
                      content.includes('from "../components"');
    
    const importsSidebar = content.includes('Sidebar');
    const importsHeader = content.includes('Header');
    
    // Check for inline sidebars (bad)
    const hasInlineSidebar = content.match(/<div[^>]*className="w-60[^"]*bg-\[rgb\(46,46,48\)\][^>]*>/);
    const hasInlineHeader = content.match(/<header[^>]*className=/);
    
    // Check for component usage (good)
    const usesSidebarComponent = content.includes('<Sidebar');
    const usesHeaderComponent = content.includes('<Header');
    
    if (hasInlineSidebar) {
      issues.push('❌ Has inline sidebar div instead of <Sidebar /> component');
    }
    
    if (hasInlineHeader) {
      issues.push('❌ Has inline <header> instead of <Header /> component');
    }
    
    if (!hasImport && (hasInlineSidebar || hasInlineHeader)) {
      issues.push('⚠️  Missing imports from ../components');
    }
    
    if (hasImport && importsSidebar && !usesSidebarComponent) {
      issues.push('⚠️  Imports Sidebar but doesn\'t use it');
    }
    
    if (hasImport && importsHeader && !usesHeaderComponent) {
      issues.push('⚠️  Imports Header but doesn\'t use it');
    }
    
    // Report
    if (issues.length === 0) {
      console.log(chalk.green(`✓ ${file}`));
      if (usesSidebarComponent) console.log(chalk.gray(`  → Uses <Sidebar /> component`));
      if (usesHeaderComponent) console.log(chalk.gray(`  → Uses <Header /> component`));
      passCount++;
    } else {
      console.log(chalk.red(`✗ ${file}`));
      issues.forEach(issue => console.log(chalk.yellow(`  ${issue}`)));
      failCount++;
    }
  }
  
  console.log(chalk.cyan('\n' + '─'.repeat(60)));
  console.log(chalk.bold(`Total: ${pageFiles.length} pages`));
  console.log(chalk.green(`✓ Pass: ${passCount}`));
  console.log(chalk.red(`✗ Fail: ${failCount}`));
  
  if (failCount > 0) {
    console.log(chalk.yellow('\n⚠️  Some pages need regeneration:'));
    console.log(chalk.white('   Run: npm run generate'));
    console.log(chalk.gray('   This will regenerate all pages using the fixed generation code.\n'));
  } else {
    console.log(chalk.green('\n✨ All pages are using components correctly!\n'));
  }
}

validatePages().catch(error => {
  console.error(chalk.red('Error:'), error.message);
  process.exit(1);
});
