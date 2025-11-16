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
    backgroundColors: new Set(),
    textColors: new Set(),
    borderColors: new Set(),
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

    // Categorize and create design tokens
    const designTokens = categorizeColors(styleData);

    return {
      colors: Array.from(styleData.colors),
      backgroundColors: Array.from(styleData.backgroundColors),
      textColors: Array.from(styleData.textColors),
      borderColors: Array.from(styleData.borderColors),
      designTokens: designTokens,
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

  // Extract background colors
  const bgColorRegex = /background-color:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\));/g;
  while ((match = bgColorRegex.exec(css)) !== null) {
    const color = match[1];
    if (color !== 'rgba(0, 0, 0, 0)' && !color.includes('inherit')) {
      styleData.backgroundColors.add(color);
      styleData.colors.add(color);
    }
  }

  // Extract text colors
  const textColorRegex = /(?:^|[^-])color:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\));/gm;
  while ((match = textColorRegex.exec(css)) !== null) {
    const color = match[1];
    if (color !== 'rgba(0, 0, 0, 0)' && !color.includes('inherit')) {
      styleData.textColors.add(color);
      styleData.colors.add(color);
    }
  }

  // Extract border colors
  const borderColorRegex = /border(?:-(?:top|right|bottom|left))?-color:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\));/g;
  while ((match = borderColorRegex.exec(css)) !== null) {
    const color = match[1];
    if (color !== 'rgba(0, 0, 0, 0)' && !color.includes('inherit')) {
      styleData.borderColors.add(color);
      styleData.colors.add(color);
    }
  }

  // Extract colors (hex, rgb, rgba, hsl) - catch-all
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
 * Categorize colors into semantic design tokens
 */
function categorizeColors(styleData) {
  const tokens = {
    backgrounds: {},
    text: {},
    accents: {},
    borders: {}
  };

  // Analyze background colors
  const bgColors = Array.from(styleData.backgroundColors);
  const darkBgs = bgColors.filter(c => isDarkColor(c));
  const lightBgs = bgColors.filter(c => !isDarkColor(c));
  
  if (darkBgs.length > 0) {
    tokens.backgrounds.dark = getMostFrequent(darkBgs);
    tokens.backgrounds['dark-alt'] = darkBgs[1] || darkBgs[0];
  }
  
  if (lightBgs.length > 0) {
    tokens.backgrounds.light = getMostFrequent(lightBgs);
    tokens.backgrounds['light-alt'] = lightBgs[1] || lightBgs[0];
  }

  // Analyze text colors
  const textColors = Array.from(styleData.textColors);
  const darkText = textColors.filter(c => isDarkColor(c));
  const lightText = textColors.filter(c => !isDarkColor(c));
  
  if (darkText.length > 0) {
    tokens.text.primary = getMostFrequent(darkText);
    tokens.text.secondary = darkText[1] || darkText[0];
  }
  
  if (lightText.length > 0) {
    tokens.text.light = getMostFrequent(lightText);
  }

  // Identify accent colors (vibrant colors used less frequently)
  const allColors = Array.from(styleData.colors);
  const accentColors = allColors.filter(c => isVibranthColor(c));
  
  if (accentColors.length > 0) {
    // Categorize by hue
    const orangeRed = accentColors.filter(c => c.includes('255') && (c.includes('88') || c.includes('74')));
    const blues = accentColors.filter(c => c.includes('106') && c.includes('196'));
    const purples = accentColors.filter(c => c.includes('184') || c.includes('172'));
    const yellows = accentColors.filter(c => c.includes('241') && c.includes('189'));
    
    if (orangeRed.length > 0) tokens.accents.primary = orangeRed[0];
    if (blues.length > 0) tokens.accents.secondary = blues[0];
    if (purples.length > 0) tokens.accents.tertiary = purples[0];
    if (yellows.length > 0) tokens.accents.warning = yellows[0];
  }

  // Border colors
  const borderColors = Array.from(styleData.borderColors);
  if (borderColors.length > 0) {
    tokens.borders.default = getMostFrequent(borderColors);
  }

  return tokens;
}

/**
 * Check if a color is dark
 */
function isDarkColor(color) {
  // Extract RGB values
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch.map(Number);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  }
  
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  }
  
  return false;
}

/**
 * Check if a color is vibrant (high saturation)
 */
function isVibrantColor(color) {
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch.map(Number);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;
    return saturation > 0.3; // Consider colors with >30% saturation as vibrant
  }
  return false;
}

/**
 * Get most frequent color from array
 */
function getMostFrequent(colors) {
  if (colors.length === 0) return null;
  const frequency = {};
  colors.forEach(color => {
    frequency[color] = (frequency[color] || 0) + 1;
  });
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])[0][0];
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
