/**
 * CSS Parser - Extracts colors, fonts, spacing from captured CSS files
 */

import fs from 'fs-extra';
import path from 'path';

/**
 * Parse CSS files and extract useful style information
 */
export async function parseCSSFiles(cssDirectory) {
  const styleData = {
    colors: new Set(),
    cssVariables: {},
    fontFamilies: new Set(),
    fontSizes: new Set(),
    spacing: new Set(),
    borderRadius: new Set(),
    boxShadows: new Set()
  };

  try {
    const files = await fs.readdir(cssDirectory);
    const cssFiles = files.filter(f => f.endsWith('.css'));

    for (const file of cssFiles) {
      const filePath = path.join(cssDirectory, file);
      const content = await fs.readFile(filePath, 'utf-8');
      
      extractStyles(content, styleData);
    }

    return {
      colors: Array.from(styleData.colors),
      cssVariables: styleData.cssVariables,
      fontFamilies: Array.from(styleData.fontFamilies),
      fontSizes: Array.from(styleData.fontSizes),
      spacing: Array.from(styleData.spacing),
      borderRadius: Array.from(styleData.borderRadius),
      boxShadows: Array.from(styleData.boxShadows)
    };
  } catch (error) {
    console.error('Error parsing CSS files:', error);
    return null;
  }
}

/**
 * Extract style information from CSS content
 */
function extractStyles(css, styleData) {
  // Extract CSS variables (custom properties)
  const varRegex = /--([\w-]+):\s*([^;]+);/g;
  let match;
  while ((match = varRegex.exec(css)) !== null) {
    styleData.cssVariables[`--${match[1]}`] = match[2].trim();
  }

  // Extract colors (hex, rgb, rgba, hsl)
  const colorRegex = /(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))/g;
  while ((match = colorRegex.exec(css)) !== null) {
    const color = match[1];
    // Skip transparent and very common values
    if (color !== 'rgba(0, 0, 0, 0)' && color !== '#000' && color !== '#fff') {
      styleData.colors.add(color);
    }
  }

  // Extract font-family
  const fontRegex = /font-family:\s*([^;]+);/gi;
  while ((match = fontRegex.exec(css)) !== null) {
    const fonts = match[1].trim();
    if (!fonts.includes('inherit') && !fonts.includes('monospace, monospace')) {
      styleData.fontFamilies.add(fonts);
    }
  }

  // Extract font-size
  const fontSizeRegex = /font-size:\s*([^;]+);/gi;
  while ((match = fontSizeRegex.exec(css)) !== null) {
    const size = match[1].trim();
    if (size.match(/^\d+px$/) || size.match(/^\d+rem$/)) {
      styleData.fontSizes.add(size);
    }
  }

  // Extract padding/margin values
  const spacingRegex = /(?:padding|margin)(?:-(?:top|right|bottom|left))?:\s*([^;]+);/gi;
  while ((match = spacingRegex.exec(css)) !== null) {
    const spacing = match[1].trim();
    if (spacing.match(/^\d+px$/) || spacing.match(/^\d+rem$/)) {
      styleData.spacing.add(spacing);
    }
  }

  // Extract border-radius
  const borderRadiusRegex = /border-radius:\s*([^;]+);/gi;
  while ((match = borderRadiusRegex.exec(css)) !== null) {
    styleData.borderRadius.add(match[1].trim());
  }

  // Extract box-shadow
  const boxShadowRegex = /box-shadow:\s*([^;]+);/gi;
  while ((match = boxShadowRegex.exec(css)) !== null) {
    const shadow = match[1].trim();
    if (shadow !== 'none') {
      styleData.boxShadows.add(shadow);
    }
  }
}

/**
 * Get the most common values from a set
 */
export function getMostCommon(array, limit = 10) {
  const frequency = {};
  array.forEach(item => {
    frequency[item] = (frequency[item] || 0) + 1;
  });

  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([item]) => item);
}
