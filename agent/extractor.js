/**
 * Extractor module - Analyzes crawled data and identifies components
 * Detects common UI patterns and component boundaries
 */

import chalk from 'chalk';

/**
 * Extract components from crawled page data
 */
export async function extractComponents(crawlData) {
  const allComponents = [];
  let componentId = 0;

  for (const pageData of crawlData) {
    console.log(chalk.gray(`   Analyzing: ${pageData.title}`));
    
    const pageComponents = analyzePageStructure(pageData, componentId);
    allComponents.push(...pageComponents);
    componentId += pageComponents.length;
  }

  // Deduplicate similar components
  const uniqueComponents = deduplicateComponents(allComponents);
  
  return uniqueComponents;
}

/**
 * Analyze page structure and identify components
 */
function analyzePageStructure(pageData, startId) {
  const components = [];
  const structure = pageData.structure;

  if (!structure) return components;

  // Identify major layout components with full data
  const layoutComponents = identifyLayoutComponents(structure, pageData);
  components.push(...layoutComponents.map((comp, idx) => ({
    ...comp,
    id: `comp-${startId + idx}`,
    pageUrl: pageData.url,
    pagePath: pageData.path,
    pageTitle: pageData.title,
    colorPalette: pageData.colorPalette || [],
    backgroundColors: pageData.backgroundColors || [],
    parsedCSS: pageData.parsedCSS || {},
    resources: pageData.resources || {}
  })));

  return components;
}

/**
 * Identify common layout components (header, sidebar, main, etc.)
 */
function identifyLayoutComponents(structure, pageData) {
  const components = [];

  // Traverse structure and identify components
  function traverse(node, path = []) {
    if (!node) return;

    const component = detectComponent(node, path);
    if (component) {
      components.push({
        ...component,
        html: generateHtmlSnippet(node),
        styles: extractRelevantStyles(node, pageData.computedStyles)
      });
    }

    // Recursively traverse children
    if (node.children && node.children.length > 0) {
      node.children.forEach((child, idx) => {
        traverse(child, [...path, idx]);
      });
    }
  }

  traverse(structure);
  return components;
}

/**
 * Detect if a node represents a component
 */
function detectComponent(node, path) {
  if (!node) return null;

  const { tag, classes, id, children } = node;
  const classStr = classes.join(' ').toLowerCase();

  // Header detection
  if (tag === 'header' || classStr.includes('header') || classStr.includes('topbar')) {
    return {
      name: 'Header',
      type: 'header',
      selector: id ? `#${id}` : `.${classes[0] || 'header'}`,
      children: children || []
    };
  }

  // Sidebar detection
  if (tag === 'aside' || classStr.includes('sidebar') || classStr.includes('nav')) {
    return {
      name: 'Sidebar',
      type: 'sidebar',
      selector: id ? `#${id}` : `.${classes[0] || 'sidebar'}`,
      children: children || []
    };
  }

  // Main content area
  if (tag === 'main' || classStr.includes('main-content') || classStr.includes('content-area')) {
    return {
      name: 'MainContent',
      type: 'main',
      selector: id ? `#${id}` : `.${classes[0] || 'main'}`,
      children: children || []
    };
  }

  // Card components
  if (classStr.includes('card') || classStr.includes('task-') || classStr.includes('project-')) {
    return {
      name: 'Card',
      type: 'card',
      selector: id ? `#${id}` : `.${classes[0] || 'card'}`,
      children: children || []
    };
  }

  // List components
  if (tag === 'ul' || tag === 'ol' || classStr.includes('list')) {
    return {
      name: 'List',
      type: 'list',
      selector: id ? `#${id}` : `.${classes[0] || 'list'}`,
      children: children || []
    };
  }

  // Button components
  if (tag === 'button' || classStr.includes('button') || classStr.includes('btn')) {
    return {
      name: 'Button',
      type: 'button',
      selector: id ? `#${id}` : `.${classes[0] || 'button'}`,
      text: node.text,
      children: []
    };
  }

  // Form components
  if (tag === 'form' || classStr.includes('form') || classStr.includes('input-group')) {
    return {
      name: 'Form',
      type: 'form',
      selector: id ? `#${id}` : `.${classes[0] || 'form'}`,
      children: children || []
    };
  }

  // Modal/Dialog components
  if (classStr.includes('modal') || classStr.includes('dialog') || classStr.includes('popup')) {
    return {
      name: 'Modal',
      type: 'modal',
      selector: id ? `#${id}` : `.${classes[0] || 'modal'}`,
      children: children || []
    };
  }

  return null;
}

/**
 * Generate simplified HTML snippet for a node
 */
function generateHtmlSnippet(node, depth = 0) {
  if (!node || depth > 3) return '';

  const { tag, classes, id, text, children } = node;
  const indent = '  '.repeat(depth);

  let html = `${indent}<${tag}`;
  if (id) html += ` id="${id}"`;
  if (classes && classes.length > 0) html += ` class="${classes.join(' ')}"`;
  html += '>';

  if (text) {
    html += text;
  } else if (children && children.length > 0 && depth < 2) {
    html += '\n';
    children.forEach(child => {
      html += generateHtmlSnippet(child, depth + 1);
    });
    html += indent;
  }

  html += `</${tag}>\n`;
  return html;
}

/**
 * Extract relevant styles for a component
 */
function extractRelevantStyles(node, computedStyles) {
  if (!node || !computedStyles) return {};

  const { id, classes } = node;
  const relevantStyles = {};

  // Get styles for this element
  if (id && computedStyles[`#${id}`]) {
    relevantStyles[`#${id}`] = computedStyles[`#${id}`];
  }

  if (classes && classes.length > 0) {
    classes.forEach(cls => {
      const selector = `.${cls}`;
      if (computedStyles[selector]) {
        relevantStyles[selector] = computedStyles[selector];
      }
    });
  }

  return relevantStyles;
}

/**
 * Deduplicate similar components across pages
 */
function deduplicateComponents(components) {
  const uniqueMap = new Map();

  components.forEach(comp => {
    const key = `${comp.type}-${comp.name}`;
    
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, comp);
    } else {
      // Merge information from duplicate
      const existing = uniqueMap.get(key);
      if (!existing.pages) {
        existing.pages = [existing.pageUrl];
      }
      if (!existing.pages.includes(comp.pageUrl)) {
        existing.pages.push(comp.pageUrl);
      }
    }
  });

  return Array.from(uniqueMap.values());
}

/**
 * Calculate similarity between two components
 */
function calculateSimilarity(comp1, comp2) {
  if (comp1.type !== comp2.type) return 0;

  let score = 0;
  
  // Same type
  score += 0.3;

  // Similar name
  if (comp1.name === comp2.name) score += 0.3;

  // Similar selector
  if (comp1.selector === comp2.selector) score += 0.2;

  // Similar number of children
  const childDiff = Math.abs(
    (comp1.children?.length || 0) - (comp2.children?.length || 0)
  );
  if (childDiff === 0) score += 0.2;

  return score;
}
