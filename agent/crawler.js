/**
 * Crawler module - Handles website crawling with authentication
 * Captures DOM, CSS, screenshots, and page metadata
 */

import { chromium } from 'playwright';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { parseCSSFiles } from './css-parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, 'output');
const TIMEOUT = parseInt(process.env.CRAWL_TIMEOUT) || 120000; // Increased to 2 minutes
const VIEWPORT_WIDTH = parseInt(process.env.VIEWPORT_WIDTH) || 1920;
const VIEWPORT_HEIGHT = parseInt(process.env.VIEWPORT_HEIGHT) || 1080;
const PAGE_LOAD_WAIT = 8000; // Wait 8 seconds for dynamic content to load

/**
 * Main crawl function - orchestrates the crawling process
 */
export async function crawlPages() {
  const browser = await chromium.launch({
    headless: process.env.HEADLESS !== 'false',
    args: ['--disable-blink-features=AutomationControlled']
  });

  const context = await browser.newContext({
    viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();
  const results = [];

  try {
    let workspaceInfo = null;
    
    // Authenticate if credentials provided
    if (process.env.ASANA_EMAIL && process.env.ASANA_PASSWORD) {
      console.log(chalk.blue('🔐 Authenticating...'));
      workspaceInfo = await authenticate(page);
      console.log(chalk.green(`✓ Authentication successful (Workspace: ${workspaceInfo?.workspaceId || 'detected'})`));
    }

    // Parse pages to crawl - if workspace ID detected, use it
    const pages = getPagesToCrawl(workspaceInfo);
    console.log(chalk.blue(`📄 Crawling ${pages.length} pages...`));

    // Crawl each page
    for (let i = 0; i < pages.length; i++) {
      const pagePath = pages[i];
      console.log(chalk.gray(`   [${i + 1}/${pages.length}] ${pagePath}`));
      
      try {
        const pageData = await crawlPage(page, pagePath, i);
        results.push(pageData);
        console.log(chalk.green(`   ✓ Captured: ${pageData.title}`));
      } catch (error) {
        console.error(chalk.red(`   ✗ Failed: ${error.message}`));
      }

      // Polite delay between pages
      if (i < pages.length - 1) {
        await page.waitForTimeout(2000);
      }
    }

  } finally {
    await browser.close();
  }

  return results;
}

/**
 * Authenticate to Asana and return workspace ID
 */
async function authenticate(page) {
  const baseUrl = process.env.TARGET_URL || 'https://www.asana.com';
  
  try {
    console.log(chalk.gray('   Navigating to login page...'));
    await page.goto(`${baseUrl}/app/login`, { 
      waitUntil: 'domcontentloaded',
      timeout: TIMEOUT 
    });

    await page.waitForTimeout(3000);

    // Block Google OAuth to force email/password login
    await page.route('**/accounts.google.com/**', route => route.abort());
    await page.route('**/oauth/**', route => route.abort());

    // Look for "Use my email address instead" or similar link
    console.log(chalk.gray('   Looking for email login option...'));
    const emailLoginFound = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, button, span'));
      const emailLink = links.find(el => 
        el.textContent?.includes('email') ||
        el.textContent?.includes('Email') ||
        el.textContent?.includes('password') ||
        el.textContent?.includes('different')
      );
      if (emailLink) {
        emailLink.click();
        return true;
      }
      return false;
    });

    if (emailLoginFound) {
      await page.waitForTimeout(2000);
    }

    // Fill email
    console.log(chalk.gray('   Entering email...'));
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
    await page.fill('input[type="email"], input[name="email"]', process.env.ASANA_EMAIL);
    await page.waitForTimeout(1000);

    // Click continue
    console.log(chalk.gray('   Clicking continue...'));
    await page.keyboard.press('Enter');
    
    // Wait for password field
    console.log(chalk.gray('   Waiting for password field...'));
    await page.waitForSelector('input[type="password"]', { timeout: 15000 });
    await page.waitForTimeout(1000);
    
    // Fill password
    console.log(chalk.gray('   Entering password...'));
    await page.fill('input[type="password"]', process.env.ASANA_PASSWORD);
    await page.waitForTimeout(1000);

    // Submit login
    console.log(chalk.gray('   Submitting login...'));
    await page.keyboard.press('Enter');
    
    // Wait for authentication and redirect to workspace
    console.log(chalk.gray('   Waiting for authentication...'));
    
    // Wait for URL to change away from login page
    await page.waitForFunction(() => {
      return !window.location.href.includes('/login');
    }, { timeout: 30000 });
    
    await page.waitForLoadState('domcontentloaded', { timeout: TIMEOUT });
    await page.waitForTimeout(5000);
    
    // Extract workspace info and discover actual page URLs
    const currentUrl = page.url();
    console.log(chalk.gray(`   Current URL: ${currentUrl}`));
    
    const workspaceMatch = currentUrl.match(/\/(\d+)\/(\d+)\//);
    let workspaceInfo = null;
    
    if (workspaceMatch) {
      workspaceInfo = {
        prefix: workspaceMatch[1],
        workspaceId: workspaceMatch[2],
        homeUrl: null,
        projectsUrl: null,
        tasksUrl: null
      };
    }
    
    // Discover actual page URLs by extracting from navigation links
    console.log(chalk.gray('   Discovering page URLs...'));
    const discoveredUrls = await page.evaluate(() => {
      const urls = {
        home: null,
        projects: null,
        tasks: null,
        debug: [] // Debug: collect all project-like URLs
      };
      
      // Find all links on the page
      const links = Array.from(document.querySelectorAll('a'));
      
      for (const link of links) {
        const href = link.href;
        const text = link.textContent?.toLowerCase().trim() || '';
        
        // Match home page - exact match for /home
        if (href.includes('/home') && href.match(/\/\d+\/\d+\/home$/)) {
          urls.home = new URL(href).pathname;
        }
        
        // Match tasks page FIRST - look for "My tasks" specifically
        // This has priority because it's a specific identifier
        if ((text === 'my tasks' || text.includes('my task')) && 
            href.match(/\/project\/\d+\/list\/\d+/)) {
          if (!urls.tasks) {
            urls.tasks = new URL(href).pathname;
          }
        }
        
        // Match projects page - look for /project/{id}/list/{viewId} or /overview/
        // But NOT if it's already matched as "My tasks"
        if (href.match(/\/project\/\d+\/(list|overview)\/\d+/)) {
          const pathname = new URL(href).pathname;
          
          // If this is NOT the tasks URL we already found, and we don't have a projects URL yet
          if (pathname !== urls.tasks && !urls.projects) {
            // Prefer project links that are NOT "My tasks"
            if (!text.includes('my task')) {
              urls.projects = pathname;
            }
          }
          
          urls.debug.push({ 
            type: href.includes('/overview/') ? 'project-overview' : 'project-list', 
            href: pathname, 
            text: text.substring(0, 50) 
          });
        }
      }
      
      return urls;
    });
    
    if (workspaceInfo) {
      workspaceInfo.homeUrl = discoveredUrls.home;
      workspaceInfo.projectsUrl = discoveredUrls.projects;
      workspaceInfo.tasksUrl = discoveredUrls.tasks;
      
      console.log(chalk.gray(`   ✓ Home: ${discoveredUrls.home || 'not found'}`));
      console.log(chalk.gray(`   ✓ Projects: ${discoveredUrls.projects || 'not found'}`));
      console.log(chalk.gray(`   ✓ Tasks: ${discoveredUrls.tasks || 'not found'}`));
      
      // Debug: show what project links were found
      if (discoveredUrls.debug && discoveredUrls.debug.length > 0) {
        console.log(chalk.gray(`   📋 Debug: Found ${discoveredUrls.debug.length} project-related links`));
        discoveredUrls.debug.slice(0, 5).forEach(link => {
          console.log(chalk.gray(`      - ${link.type}: ${link.href} (${link.text || 'no text'})`));
        });
      }
    }
    
    return workspaceInfo;
    
  } catch (error) {
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

/**
 * Crawl a single page and extract all data
 */
async function crawlPage(page, pagePath, index) {
  const baseUrl = process.env.TARGET_URL || 'https://www.asana.com';
  const fullUrl = `${baseUrl}${pagePath}`;

  // Capture all network requests and responses
  const capturedResources = {
    css: [],
    js: [],
    fonts: [],
    images: [],
    api: []
  };

  // Listen to all responses - AGGRESSIVE LIMITS TO PREVENT MEMORY OVERFLOW
  page.on('response', async (response) => {
    try {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';
      const status = response.status();

      if (status >= 200 && status < 300) {
        // Capture ONLY main CSS files (LIMIT TO 5 FILES)
        if ((contentType.includes('text/css') || url.endsWith('.css')) && capturedResources.css.length < 5) {
          const cssContent = await response.text().catch(() => null);
          if (cssContent && cssContent.length < 500000) { // Max 500KB per CSS file
            capturedResources.css.push({ url, content: cssContent });
          }
        }
        // SKIP JavaScript files completely to save memory
        // Capture fonts (METADATA ONLY, LIMIT TO 5)
        else if ((contentType.includes('font') || url.match(/\.(woff2?|ttf|eot|otf)$/)) && capturedResources.fonts.length < 5) {
          capturedResources.fonts.push({ url, contentType });
        }
        // Capture images (METADATA ONLY, LIMIT TO 10)
        else if (contentType.includes('image') && capturedResources.images.length < 10) {
          capturedResources.images.push({ url, contentType });
        }
        // Skip API responses and JS to save memory
      }
    } catch (error) {
      // Ignore errors from individual resources
    }
  });

  await page.goto(fullUrl, { 
    waitUntil: 'domcontentloaded',
    timeout: TIMEOUT 
  });

  // Wait for page to be fully loaded
  await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
  
  // Wait for network to be mostly idle
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

  // Wait extra time for Asana's dynamic content and animations
  console.log(chalk.gray(`      ⏳ Waiting for dynamic content...`));
  await page.waitForTimeout(PAGE_LOAD_WAIT);
  
  // Wait specifically for common sidebar patterns to load
  let sidebarInfo = { detected: false, isCollapsible: false };
  try {
    await page.waitForSelector('aside, [class*="sidebar"], [class*="Sidebar"], [class*="Navigation"], nav[class*="navigation"]', { 
      timeout: 5000 
    });
    console.log(chalk.gray('      ✓ Sidebar detected in DOM'));
    
    // Check if sidebar is collapsible by looking for hamburger/menu/collapse buttons
    sidebarInfo.detected = true;
    sidebarInfo.isCollapsible = await page.evaluate(() => {
      // Check for hamburger menu icon
      const hamburgerSelectors = [
        '[class*="hamburger"]',
        '[class*="menu-toggle"]',
        '[class*="sidebar-toggle"]',
        '[class*="collapse"]',
        '[aria-label*="menu"]',
        '[aria-label*="navigation"]',
        '[title*="menu"]',
        '[title*="collapse"]',
        'button[class*="Menu"]',
        'svg[class*="hamburger"]'
      ];
      
      const hasHamburger = hamburgerSelectors.some(selector => {
        const elements = document.querySelectorAll(selector);
        return elements.length > 0;
      });
      
      // Check for specific icon patterns (☰, ≡, or similar)
      const hasMenuIcon = Array.from(document.querySelectorAll('button, a, span')).some(el => {
        const text = el.textContent || '';
        const ariaLabel = el.getAttribute('aria-label') || '';
        return text.includes('☰') || text.includes('≡') || 
               ariaLabel.toLowerCase().includes('menu') ||
               ariaLabel.toLowerCase().includes('sidebar') ||
               ariaLabel.toLowerCase().includes('collapse') ||
               ariaLabel.toLowerCase().includes('expand');
      });
      
      return hasHamburger || hasMenuIcon;
    });
    
    if (sidebarInfo.isCollapsible) {
      console.log(chalk.cyan('      ✓ Collapsible sidebar detected (hamburger/menu icon found)'));
    }
  } catch (e) {
    console.log(chalk.yellow('      ⚠ No sidebar element detected'));
  }
  
  // Scroll to load lazy-loaded content
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight / 2);
  });
  await page.waitForTimeout(2000);
  
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1000);

  // Mask dynamic content
  await maskDynamicContent(page);

  // Extract page data
  const stylesData = await extractComputedStyles(page);
  
  const pageData = {
    url: fullUrl,
    path: pagePath,
    title: await page.title(),
    timestamp: new Date().toISOString(),
    
    // Capture HTML
    html: await page.content(),
    
    // Capture computed CSS with color palette
    computedStyles: stylesData.styles,
    colorPalette: stylesData.colorPalette,
    backgroundColors: stylesData.backgroundColors,
    
    // Capture screenshots
    screenshotPath: await captureScreenshots(page, index),
    
    // Capture page structure
    structure: await extractPageStructure(page),
    
    // Capture viewport dimensions
    viewport: await page.viewportSize(),
    
    // Captured network resources
    resources: capturedResources,
    
    // Sidebar detection info
    sidebarInfo: sidebarInfo
  };

  // Save HTML to file
  const htmlPath = path.join(OUTPUT_DIR, 'html', `page-${index}.html`);
  await fs.writeFile(htmlPath, pageData.html, 'utf-8');

  // Save computed styles to file
  const cssPath = path.join(OUTPUT_DIR, 'css', `page-${index}.json`);
  await fs.writeJson(cssPath, pageData.computedStyles, { spaces: 2 });

  // Save captured CSS files
  if (capturedResources.css.length > 0) {
    const cssDir = path.join(OUTPUT_DIR, 'css', `page-${index}`);
    await fs.ensureDir(cssDir);
    for (let i = 0; i < capturedResources.css.length; i++) {
      const cssFile = capturedResources.css[i];
      const filename = `stylesheet-${i}.css`;
      await fs.writeFile(path.join(cssDir, filename), cssFile.content, 'utf-8');
    }
    
    // Parse CSS files to extract style information
    console.log(chalk.gray(`   🎨 Parsing CSS files...`));
    const parsedCSS = await parseCSSFiles(cssDir);
    
    if (parsedCSS) {
      console.log(chalk.gray(`   ✓ Extracted: ${parsedCSS.colors.length} colors, ${parsedCSS.fontFamilies.size} font families`));
      pageData.parsedCSS = parsedCSS;
    }
  }

  // Save captured resources metadata
  const resourcesPath = path.join(OUTPUT_DIR, 'resources', `page-${index}.json`);
  await fs.ensureDir(path.join(OUTPUT_DIR, 'resources'));
  await fs.writeJson(resourcesPath, {
    css: capturedResources.css.map(r => r.url),
    js: capturedResources.js.map(r => r.url),
    fonts: capturedResources.fonts,
    images: capturedResources.images,
    api: capturedResources.api.map(r => r.url)
  }, { spaces: 2 });

  console.log(chalk.gray(`   📦 Captured: ${capturedResources.css.length} CSS, ${capturedResources.js.length} JS, ${capturedResources.fonts.length} fonts, ${capturedResources.images.length} images`));

  return pageData;
}

/**
 * Mask dynamic content like usernames, timestamps, etc.
 */
async function maskDynamicContent(page) {
  const selectors = (process.env.MASK_SELECTORS || '').split(',').filter(Boolean);
  
  if (selectors.length === 0) return;

  await page.evaluate((selectorList) => {
    selectorList.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector.trim());
        elements.forEach(el => {
          if (el.textContent) {
            el.textContent = '████████';
          }
          if (el.src && el.tagName === 'IMG') {
            el.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjY2NjIi8+PC9zdmc+';
          }
        });
      } catch (e) {
        // Skip invalid selectors
        console.warn(`Invalid selector: ${selector}`);
      }
    });
  }, selectors);
}

/**
 * Extract computed CSS styles for all elements + color palette
 */
async function extractComputedStyles(page) {
  return await page.evaluate(() => {
    const elements = document.querySelectorAll('*');
    const styles = {};
    const colorPalette = new Set();
    const backgroundColors = new Set();
    
    elements.forEach((el, index) => {
      if (!el.id && !el.className) return;
      
      const computed = window.getComputedStyle(el);
      const className = typeof el.className === 'string' ? el.className : '';
      const selector = el.id ? `#${el.id}` : (className ? `.${className.split(' ')[0]}` : '');
      
      if (!selector) return;
      
      // Collect colors
      if (computed.color && computed.color !== 'rgba(0, 0, 0, 0)') {
        colorPalette.add(computed.color);
      }
      if (computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        backgroundColors.add(computed.backgroundColor);
      }
      
      styles[selector] = {
        display: computed.display,
        position: computed.position,
        width: computed.width,
        height: computed.height,
        padding: computed.padding,
        margin: computed.margin,
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
        fontFamily: computed.fontFamily,
        border: computed.border,
        borderRadius: computed.borderRadius,
        flexDirection: computed.flexDirection,
        alignItems: computed.alignItems,
        justifyContent: computed.justifyContent,
        gridTemplateColumns: computed.gridTemplateColumns,
        gap: computed.gap,
        boxShadow: computed.boxShadow,
        textDecoration: computed.textDecoration,
        lineHeight: computed.lineHeight
      };
    });
    
    return {
      styles,
      colorPalette: Array.from(colorPalette),
      backgroundColors: Array.from(backgroundColors)
    };
  });
}

/**
 * Capture full page screenshot and viewport screenshot
 */
async function captureScreenshots(page, index) {
  const screenshotDir = path.join(OUTPUT_DIR, 'screenshots');
  
  // Full page screenshot
  const fullPath = path.join(screenshotDir, `page-${index}-full.png`);
  await page.screenshot({ 
    path: fullPath, 
    fullPage: true 
  });

  // Viewport screenshot
  const viewportPath = path.join(screenshotDir, `page-${index}-viewport.png`);
  await page.screenshot({ 
    path: viewportPath, 
    fullPage: false 
  });

  return {
    full: fullPath,
    viewport: viewportPath
  };
}

/**
 * Extract hierarchical page structure
 */
async function extractPageStructure(page) {
  return await page.evaluate(() => {
    function analyzeElement(element, depth = 0) {
      if (depth > 5) return null; // Limit depth
      
      const tagName = element.tagName.toLowerCase();
      const classList = Array.from(element.classList);
      const id = element.id;
      
      // Skip script, style, and svg elements
      if (['script', 'style', 'svg', 'path'].includes(tagName)) {
        return null;
      }

      const node = {
        tag: tagName,
        id: id || null,
        classes: classList,
        text: null,
        children: []
      };

      // Get text content for leaf nodes
      if (element.children.length === 0) {
        const text = element.textContent?.trim();
        if (text && text.length < 100) {
          node.text = text;
        }
      }

      // Recursively analyze children
      Array.from(element.children).forEach(child => {
        const childNode = analyzeElement(child, depth + 1);
        if (childNode) {
          node.children.push(childNode);
        }
      });

      return node;
    }

    const body = document.body;
    return analyzeElement(body);
  });
}

/**
 * Get list of pages to crawl from environment
 */
function getPagesToCrawl(workspaceInfo) {
  // If workspace info has discovered URLs, use those
  if (workspaceInfo && (workspaceInfo.homeUrl || workspaceInfo.projectsUrl || workspaceInfo.tasksUrl)) {
    const pages = [];
    
    if (workspaceInfo.homeUrl) pages.push(workspaceInfo.homeUrl);
    if (workspaceInfo.projectsUrl) pages.push(workspaceInfo.projectsUrl);
    if (workspaceInfo.tasksUrl) pages.push(workspaceInfo.tasksUrl);
    
    return pages;
  }

  // Fallback: use environment variable or default pages
  const pagesEnv = process.env.PAGES_TO_CRAWL;
  
  if (pagesEnv) {
    let pages = pagesEnv.split(',').map(p => p.trim());
    
    // If workspace info detected and pages don't have it, inject it
    if (workspaceInfo && pages[0] && !pages[0].includes(workspaceInfo.workspaceId)) {
      pages = pages.map(p => {
        // Convert /app/home to /1/{workspaceId}/home using detected prefix
        if (p.startsWith('/app/')) {
          return p.replace('/app/', `/${workspaceInfo.prefix}/${workspaceInfo.workspaceId}/`);
        }
        return p;
      });
    }
    
    return pages;
  }

  // Default pages - will be updated with workspace ID if detected
  if (workspaceInfo) {
    return [
      `/${workspaceInfo.prefix}/${workspaceInfo.workspaceId}/home`,
      `/${workspaceInfo.prefix}/${workspaceInfo.workspaceId}/projects`,
      `/${workspaceInfo.prefix}/${workspaceInfo.workspaceId}/tasks`
    ];
  }
  
  return ['/app/home', '/app/projects', '/app/tasks'];
}
