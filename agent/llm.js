/**
 * LLM integration module - Handles OpenAI API calls for code generation
 */

import OpenAI from 'openai';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize OpenAI client lazily to allow env validation first
let openai = null;

function getOpenAIClient() {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set. Please add it to your .env file.');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
}

const MODEL = process.env.LLM_MODEL || 'gpt-4-turbo-preview';
const TEMPERATURE = parseFloat(process.env.LLM_TEMPERATURE) || 0.3;
const MAX_TOKENS = parseInt(process.env.LLM_MAX_TOKENS) || 4000;

/**
 * Generate React component code using LLM with vision
 */
export async function generateComponent(component, prompt, screenshotPath) {
  try {
    console.log(chalk.gray(`      Generating ${component.name}...`));

    const client = getOpenAIClient();
    
    const messages = [
      {
        role: 'system',
        content: `You are an ELITE React developer with PHOTOGRAPHIC PRECISION in UI replication.

MISSION: Create a component that is VISUALLY INDISTINGUISHABLE from the screenshot.

STRICT COLOR MATCHING RULES:
1. ALWAYS use rgb() format for extracted colors: bg-[rgb(46,46,48)] text-[rgb(245,244,243)]
2. Study the "Extracted Design System" in the prompt for the complete color palette
3. Identify which colors from the palette apply to each element:
   - Dark backgrounds (46,46,48) for headers/sidebars
   - Light backgrounds (249,248,248) for main content areas
   - Text colors: dark (30,31,33) on light, light (245,244,243) on dark
   - Accent colors: orange (255,88,74), blue (63,106,196), purple (184,172,255)
4. NEVER use generic Tailwind colors (gray-800, blue-500) - ONLY exact RGB from extracted palette
5. For hover states, use the same color with opacity: hover:bg-[rgb(46,46,48)]/80

SPACING & LAYOUT PRECISION:
1. Match EXACT pixel values from extracted spacing (p-[20px], gap-[12px], h-[48px])
2. Study computed styles for padding, margin, gap, width, height values
3. Use flexbox/grid properties from extracted styles: items-center, justify-between, flex-col

TYPOGRAPHY MATCHING:
1. Use font-family from extracted styles (usually -apple-system stack)
2. Match font-size: 12px=text-xs, 14px=text-sm, 16px=text-base, 20px=text-xl
3. Match font-weight: 400=font-normal, 500=font-medium, 600=font-semibold

VISUAL EFFECTS:
1. Copy border-radius values: 4px=rounded, 6px=rounded-md, 8px=rounded-lg, 50%=rounded-full
2. Match box-shadow from extracted values or use: shadow-sm, shadow, shadow-md
3. Add transitions: transition-colors duration-150

ICONS:
1. Use lucide-react for all icons: import { Icon Name } from 'lucide-react'
2. Match icon size from screenshot (usually 16-20px): <Icon size={20} />
3. Color icons with text color: className="text-[rgb(245,244,243)]"

Your output will be evaluated on PIXEL-PERFECT visual matching. Study the extracted design tokens carefully!

Generate clean TypeScript React code with Tailwind CSS utilities.`
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt
          }
        ]
      }
    ];

    // Add screenshot if available and use vision model
    let modelToUse = MODEL;
    if (screenshotPath && await fs.pathExists(screenshotPath)) {
      try {
        const imageBuffer = await fs.readFile(screenshotPath);
        const base64Image = imageBuffer.toString('base64');
        
        // Check if image is too large (OpenAI has a ~20MB limit)
        const imageSizeKB = base64Image.length / 1024;
        if (imageSizeKB > 15000) {
          console.log(chalk.yellow(`      ⚠ Screenshot too large (${Math.round(imageSizeKB)}KB), using text-only`));
          messages[1].content = prompt;
        } else {
          messages[1].content.push({
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${base64Image}`,
              detail: 'high'
            }
          });
          
          modelToUse = 'gpt-4o'; // Use GPT-4 with vision
          console.log(chalk.gray(`      Using vision analysis (${Math.round(imageSizeKB)}KB)...`));
        }
      } catch (imgError) {
        console.log(chalk.yellow(`      ⚠ Screenshot error: ${imgError.message}, using text-only`));
        messages[1].content = prompt; // Fallback to text only
      }
    } else {
      messages[1].content = prompt; // Text only
    }

    const completion = await client.chat.completions.create({
      model: modelToUse,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      messages: messages
    });

    const code = completion.choices[0].message.content;
    const extractedCode = extractCodeFromResponse(code);
    
    // Check if we got actual code or just text
    if (!extractedCode.includes('import') && !extractedCode.includes('export')) {
      console.log(chalk.yellow(`      ⚠ Model didn't generate code, retrying without image...`));
      // Retry without image
      const fallbackCompletion = await client.chat.completions.create({
        model: MODEL,
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
        messages: [
          {
            role: 'system',
            content: 'You are an expert React developer who creates pixel-perfect, production-ready components using React and Tailwind CSS. Generate clean, idiomatic code with proper TypeScript types.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });
      return extractCodeFromResponse(fallbackCompletion.choices[0].message.content);
    }
    
    return extractedCode;

  } catch (error) {
    console.error(chalk.red(`      ✗ Failed to generate ${component.name}: ${error.message}`));
    return generateFallbackComponent(component);
  }
}

/**
 * Generate page code using LLM with vision
 */
export async function generatePage(pageData, components, prompt, screenshotPath) {
  try {
    console.log(chalk.gray(`   Generating page: ${pageData.title}`));

    const client = getOpenAIClient();
    
    const messages = [
      {
        role: 'system',
        content: `You are an ELITE React developer with PHOTOGRAPHIC PRECISION in page layout replication.

MISSION: Create a page layout that is VISUALLY INDISTINGUISHABLE from the screenshot.

COLOR MATCHING STRATEGY (TOP PRIORITY):
1. Study the "KEY COLORS FOR THIS PAGE" section in the prompt - these are EXTRACTED from the actual site
2. Identify areas in screenshot:
   - Dark areas (headers/sidebars): use bg-[rgb(46,46,48)]
   - Light areas (main content): use bg-[rgb(249,248,248)]
   - White cards: use bg-white
   - Text on dark: text-[rgb(245,244,243)]
   - Text on light: text-[rgb(30,31,33)]
   - Secondary text: text-[rgb(109,110,111)]
3. Accent colors for buttons/highlights:
   - Primary action: bg-[rgb(255,88,74)] (orange/red)
   - Links/interactive: text-[rgb(63,106,196)] (blue)
   - Warnings/banners: bg-[rgb(241,189,108)] (yellow)
4. ALWAYS use rgb() format: bg-[rgb(R,G,B)] text-[rgb(R,G,B)]
5. NEVER use generic names: NO gray-100, NO blue-500, NO slate-800

LAYOUT STRUCTURE:
1. Analyze screenshot for main layout pattern
2. Common patterns:
   - Sidebar + Header + Main: <div className="flex h-screen"><Sidebar /><div className="flex-1 flex flex-col"><Header /><main>...</main></div></div>
   - Banner + Content: <div><div className="bg-[rgb(241,189,108)]">...</div><main>...</main></div>
3. Match exact widths/heights: Sidebar typically w-60 (240px), Header h-12 (48px)
4. Use extracted spacing values: p-6, p-8, gap-4, gap-6

COMPONENT USAGE:
1. Import available components: import { Header, Sidebar } from '../components'
2. Use them as-is with proper placement
3. Add exact content around them matching screenshot

PRECISION CHECKLIST:
☐ Background colors match extracted RGB values
☐ Text colors match for dark/light backgrounds  
☐ Layout structure matches screenshot (sidebar position, header height)
☐ Spacing matches extracted values
☐ All content from screenshot is included
☐ Components are imported and placed correctly

Your output will be evaluated on PIXEL-PERFECT matching. Study the extracted color tokens!

Generate clean TypeScript React code with proper component imports.`
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt
          }
        ]
      }
    ];

    // Add screenshot if available
    let modelToUse = MODEL;
    if (screenshotPath && await fs.pathExists(screenshotPath)) {
      try {
        const imageBuffer = await fs.readFile(screenshotPath);
        const base64Image = imageBuffer.toString('base64');
        
        messages[1].content.push({
          type: 'image_url',
          image_url: {
            url: `data:image/png;base64,${base64Image}`,
            detail: 'high'
          }
        });
        
        modelToUse = 'gpt-4o';
        console.log(chalk.gray(`   Using vision analysis...`));
      } catch (imgError) {
        messages[1].content = prompt;
      }
    } else {
      messages[1].content = prompt;
    }

    const completion = await client.chat.completions.create({
      model: modelToUse,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      messages: messages
    });

    const code = completion.choices[0].message.content;
    return extractCodeFromResponse(code);

  } catch (error) {
    console.error(chalk.red(`   ✗ Failed to generate page: ${error.message}`));
    return generateFallbackPage(pageData, components);
  }
}

/**
 * Generate CSS styles using LLM
 */
export async function generateStyles(computedStyles, prompt) {
  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: MODEL,
      temperature: TEMPERATURE,
      max_tokens: 2000,
      messages: [
        {
          role: 'system',
          content: 'You are an expert CSS developer. Convert computed styles into clean Tailwind CSS classes or custom CSS when needed.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    return completion.choices[0].message.content;

  } catch (error) {
    console.error(chalk.red(`   ✗ Failed to generate styles: ${error.message}`));
    return '';
  }
}

/**
 * Extract code from LLM response (removes markdown fences)
 */
function extractCodeFromResponse(response) {
  // Remove markdown code fences
  let code = response.trim();
  
  // Remove ```tsx, ```jsx, ```javascript, etc.
  code = code.replace(/^```(?:tsx|jsx|javascript|js|typescript|ts)?\n/gm, '');
  code = code.replace(/\n```$/gm, '');
  code = code.replace(/^```\n/gm, '');
  code = code.replace(/\n```\n/gm, '\n');
  
  return code.trim();
}

/**
 * Load prompt template from file
 */
export async function loadPromptTemplate(templateName) {
  const promptPath = path.join(__dirname, 'prompts', `${templateName}.txt`);
  
  try {
    return await fs.readFile(promptPath, 'utf-8');
  } catch (error) {
    console.warn(chalk.yellow(`⚠ Prompt template not found: ${templateName}`));
    return '';
  }
}

/**
 * Build component generation prompt
 */
export async function buildComponentPrompt(component) {
  const template = await loadPromptTemplate('component_prompt');
  
  // Build detailed context
  const htmlStructure = component.html || 'Structure not captured';
  const styles = component.styles && Object.keys(component.styles).length > 0 
    ? JSON.stringify(component.styles, null, 2)
    : 'No specific styles captured';
  
  // Add captured resources info if available
  const resourcesInfo = component.resources ? `
Captured Resources:
- CSS Files: ${component.resources.css?.length || 0} stylesheets
- Fonts: ${component.resources.fonts?.length || 0} font files
- Images: ${component.resources.images?.length || 0} images
` : '';

  // Add parsed CSS information with MORE DETAIL
  let styleInfo = '';
  
  if (component.parsedCSS && Object.keys(component.parsedCSS).length > 0) {
    const css = component.parsedCSS;
    
    // Extract comprehensive design tokens
    const colors = css.colors?.slice(0, 30) || [];
    const fontFamilies = Array.from(css.fontFamilies || []).slice(0, 3);
    const fontSizes = Array.from(css.fontSizes || []).slice(0, 15);
    const fontWeights = Array.from(css.fontWeights || []).slice(0, 8);
    const spacing = Array.from(css.spacing || []).slice(0, 20);
    const borderRadius = Array.from(css.borderRadius || []).slice(0, 8);
    const shadows = Array.from(css.boxShadows || []).slice(0, 8);
    const borderColors = Array.from(css.borderColors || []).slice(0, 10);
    
    // Create structured color palette
    const bgColors = colors.filter(c => c.includes('rgb(249') || c.includes('rgb(46') || c.includes('rgb(255') || c.includes('rgb(241'));
    const textColors = colors.filter(c => c.includes('rgb(30') || c.includes('rgb(245') || c.includes('rgb(109'));
    const accentColors = colors.filter(c => c.includes('rgb(255,88') || c.includes('rgb(184') || c.includes('rgb(63'));
    
    styleInfo = `
🎨 COMPREHENSIVE DESIGN SYSTEM (USE THESE EXACT VALUES):

═══════════════════════════════════════════════════════════════════════════════
PRIMARY COLORS (Most Important - Use These First):
═══════════════════════════════════════════════════════════════════════════════
Background Colors:
  - Light BG: rgb(249, 248, 248)  →  bg-[rgb(249,248,248)]
  - Dark BG: rgb(46, 46, 48)      →  bg-[rgb(46,46,48)]
  - White: rgb(255, 255, 255)     →  bg-white
  - Search: rgb(86, 85, 87)       →  bg-[rgb(86,85,87)]
  - Banner: rgb(241, 189, 108)    →  bg-[rgb(241,189,108)]

Text Colors:
  - Primary Dark: rgb(30, 31, 33)     →  text-[rgb(30,31,33)]
  - Primary Light: rgb(245, 244, 243) →  text-[rgb(245,244,243)]
  - Secondary: rgb(109, 110, 111)     →  text-[rgb(109,110,111)]

Accent Colors:
  - Orange/Red: rgb(255, 88, 74)      →  bg-[rgb(255,88,74)]
  - Purple: rgb(184, 172, 255)        →  bg-[rgb(184,172,255)]
  - Blue: rgb(63, 106, 196)           →  bg-[rgb(63,106,196)]

Border Colors:
  - Light: rgb(207, 203, 203)         →  border-[rgb(207,203,203)]

═══════════════════════════════════════════════════════════════════════════════
ALL EXTRACTED COLORS (Reference):
${colors.join('\n  ')}

TYPOGRAPHY:
Font Family: ${fontFamilies.join(' | ') || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto'}
Font Sizes: ${fontSizes.join(', ')}
Font Weights: ${fontWeights.join(', ')}

SPACING VALUES (padding/margin):
${spacing.join(', ')}

BORDER RADIUS:
${borderRadius.join(', ')}

BOX SHADOWS:
${shadows.slice(0, 5).join('\n  ')}

═══════════════════════════════════════════════════════════════════════════════
⚠️ MANDATORY: Use ONLY rgb() values above. NO generic Tailwind colors!
Format: className="bg-[rgb(46,46,48)] text-[rgb(245,244,243)]"
═══════════════════════════════════════════════════════════════════════════════
`;
  } else if (component.colorPalette && component.colorPalette.length > 0) {
    styleInfo = `
🎨 EXTRACTED COLOR PALETTE (use these EXACT values):

${component.colorPalette.slice(0, 20).map(c => `  - ${c}`).join('\n')}
${component.backgroundColors ? `\nBackground Colors:\n${component.backgroundColors.slice(0, 10).map(c => `  - ${c}`).join('\n')}` : ''}

Format as: bg-[${component.colorPalette[0]}] text-[${component.colorPalette[1] || 'rgb(30,31,33)'}]
`;
  }

  const prompt = `⚠️ PIXEL-PERFECT COMPONENT REPLICATION ⚠️

ANALYZE THE SCREENSHOT and create an EXACT visual replica of this ${component.type} component.

Component: ${component.name}
Type: ${component.type}
CSS Selector: ${component.selector}
${resourcesInfo}
${styleInfo}

REQUIREMENTS:

1. VISUAL FIDELITY (TOP PRIORITY)
   - Study every detail in the screenshot
   - Match exact colors from extracted palette above
   - Replicate spacing, typography, borders, shadows precisely
   - Copy layout structure (flex, grid, positioning)
   - Include all visual elements: icons, text, images, decorations

2. STYLING APPROACH
   - Use Tailwind CSS classes for all styling
   - For exact colors: bg-[#hexcode] text-[#hexcode]
   - For spacing: p-4 px-6 py-2 m-4 space-x-2 gap-4
   - For effects: shadow-sm shadow-md rounded-md rounded-lg
   - For icons: Import from 'lucide-react' if icons are visible
     Example: import { Menu, Search, Bell } from 'lucide-react'
   - Icon usage: <Search size={20} className="text-gray-600" />

3. INTERACTIVITY
   - Add hover states: hover:bg-gray-100 hover:opacity-80
   - Add focus states for accessibility: focus:outline-none focus:ring-2
   - Add smooth transitions: transition-colors transition-all
   - Make clickable elements obvious with cursor-pointer

4. CODE STRUCTURE
   - TypeScript with React.FC
   - Proper prop interfaces with TypeScript types
   - Clean component hierarchy
   - Export as default
   - Include className prop for composability

5. RESPONSIVENESS
   - Use responsive Tailwind classes: sm: md: lg:
   - Ensure component works on mobile and desktop
   - Match responsive behavior from original site

ICONS: If you see icons/symbols in the screenshot:
- Import from lucide-react: import { IconName } from 'lucide-react'
- Use appropriate icons: Menu, X, Search, Bell, User, Settings, Plus, ChevronDown, etc.
- Size: 16px-24px typically (size={20})
- Match icon color to surrounding text

Return ONLY the complete TypeScript/React component code. No explanations or markdown.`;

  return prompt;
}

/**
 * Build page generation prompt
 */
export async function buildPagePrompt(pageData, components) {
  const template = await loadPromptTemplate('page_prompt');
  
  const componentList = components.map(c => `- ${c.name} (${c.type})`).join('\n');
  const pageTitle = pageData.title || 'Page';
  
  // Create cleaner page name
  let pageName = pageTitle.split('•')[0].trim().replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '');
  if (pageName.length > 20) {
    // Use path-based name for long titles
    const pathParts = pageData.path.split('/').filter(Boolean);
    pageName = pathParts.length > 0 
      ? pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1).toLowerCase()
      : 'Home';
  }
  
  // Add extracted CSS design tokens with MORE DETAIL
  let designTokens = '';
  if (pageData.parsedCSS && Object.keys(pageData.parsedCSS).length > 0) {
    const css = pageData.parsedCSS;
    const colors = css.colors?.slice(0, 35) || [];
    const fonts = Array.from(css.fontFamilies || []).slice(0, 3);
    const sizes = Array.from(css.fontSizes || []).slice(0, 15);
    const spacing = Array.from(css.spacing || []).slice(0, 20);
    const radius = Array.from(css.borderRadius || []).slice(0, 8);
    
    designTokens = `
═══════════════════════════════════════════════════════════════════════════════
🎨 PAGE DESIGN SYSTEM (MANDATORY VALUES TO USE)
═══════════════════════════════════════════════════════════════════════════════

KEY COLORS FOR THIS PAGE:
Background Light: rgb(249, 248, 248)  →  bg-[rgb(249,248,248)]
Background Dark:  rgb(46, 46, 48)     →  bg-[rgb(46,46,48)]
Card Background:  rgb(255, 255, 255)  →  bg-white
Text Primary:     rgb(30, 31, 33)     →  text-[rgb(30,31,33)]
Text Light:       rgb(245, 244, 243)  →  text-[rgb(245,244,243)]
Text Secondary:   rgb(109, 110, 111)  →  text-[rgb(109,110,111)]
Accent Orange:    rgb(255, 88, 74)    →  bg-[rgb(255,88,74)]
Accent Blue:      rgb(63, 106, 196)   →  bg-[rgb(63,106,196)]
Banner:           rgb(241, 189, 108)  →  bg-[rgb(241,189,108)]

ALL COLORS: ${colors.join(', ')}

TYPOGRAPHY:
Fonts: ${fonts.join(' | ')}
Sizes: ${sizes.join(', ')}

SPACING: ${spacing.join(', ')}
RADIUS: ${radius.join(', ')}

═══════════════════════════════════════════════════════════════════════════════
⚠️ CRITICAL: Use rgb() format for ALL colors. NO Tailwind generic colors!
═══════════════════════════════════════════════════════════════════════════════
`;
  }
  
  const prompt = `⚠️ PIXEL-PERFECT PAGE REPLICATION ⚠️

ANALYZE THE SCREENSHOT and create an EXACT visual replica of this page.

Page: ${pageTitle}
Component: ${pageName}Page
URL: ${pageData.url}
${designTokens}

Available Components to Import:
${componentList}

MANDATORY REQUIREMENTS:

1. VISUAL ACCURACY (TOP PRIORITY)
   - Study the screenshot in detail before coding
   - Match EXACT layout, spacing, colors, typography
   - Replicate every UI element you see: buttons, cards, lists, headers, icons
   - Copy exact padding, margins, gaps, borders, shadows
   - Preserve visual hierarchy and element positioning
   - Use the exact colors from the extracted palette above

2. LAYOUT STRUCTURE (analyze screenshot for actual layout)
   - Identify main layout pattern: sidebar + content, header + content, multi-column, etc.
   - Common patterns:
     * Sidebar layout: <div className="flex h-screen"><Sidebar /><main>...</main></div>
     * Header layout: <div><Header /><main className="pt-16">...</main></div>
     * Full-width: <main className="w-full">...</main>
   - Use extracted colors for backgrounds (dark vs light areas)
   - Match exact widths, heights, positioning from screenshot
   - Account for fixed/sticky positioning

3. COMPONENT IMPORTS
   - Import from '../components': \`import { Header, Sidebar, Button } from '../components';\`
   - Use all relevant components that match what you see in the screenshot
   - Components are already styled - just arrange them properly

4. CONTENT
   - Include ALL text content visible in the screenshot
   - Replicate exact button labels, headings, descriptions
   - Keep the same section structure and grouping
   - Maintain identical content hierarchy

5. STYLING
   - Use Tailwind CSS utility classes exclusively
   - Match exact colors (use text-gray-700, bg-pink-500, etc.)
   - Match spacing (p-4, p-6, mb-4, space-y-4, etc.)
   - Add rounded corners where visible (rounded-lg, rounded-md)
   - Include shadows for cards (shadow, shadow-md, shadow-lg)

6. CODE QUALITY
   - TypeScript with React.FC
   - Export as default
   - Clean, readable code
   - No placeholder content - use what's in the screenshot

EXAMPLE STRUCTURE:
\`\`\`tsx
import React from 'react';
import { Header, Sidebar, Button } from '../components';

const ${pageName}Page: React.FC = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto pt-16 px-8">
          {/* Replicate EXACT content from screenshot */}
        </main>
      </div>
    </div>
  );
};

export default ${pageName}Page;
\`\`\`

Return ONLY the complete TypeScript React component code. No explanations, no markdown fences outside code.`;

  return prompt;
}

/**
 * Generate fallback component if LLM fails
 */
function generateFallbackComponent(component) {
  return `
import React from 'react';

interface ${component.name}Props {
  className?: string;
}

export const ${component.name}: React.FC<${component.name}Props> = ({ className = '' }) => {
  return (
    <div className={\`${component.type} \${className}\`}>
      <p className="text-gray-600">
        ${component.name} component
      </p>
    </div>
  );
};

export default ${component.name};
`.trim();
}

/**
 * Generate fallback page if LLM fails
 */
function generateFallbackPage(pageData, components) {
  const imports = components.map(c => 
    `import ${c.name} from '../components/${c.name}';`
  ).join('\n');

  const componentUsage = components.map(c => 
    `      <${c.name} />`
  ).join('\n');

  return `
import React from 'react';
${imports}

const ${pageData.title.replace(/[^a-zA-Z0-9]/g, '')}Page: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
${componentUsage}
    </div>
  );
};

export default ${pageData.title.replace(/[^a-zA-Z0-9]/g, '')}Page;
`.trim();
}

/**
 * Batch generate multiple components with rate limiting
 */
export async function batchGenerate(items, generateFn, batchSize = 5, delayMs = 1000) {
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(generateFn));
    results.push(...batchResults);
    
    // Delay between batches to respect rate limits
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
}
