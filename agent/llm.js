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
        content: 'You are an expert React developer who creates pixel-perfect, production-ready components using React and Tailwind CSS. Analyze the provided screenshot carefully and replicate the design EXACTLY - colors, spacing, fonts, layout. Generate clean, idiomatic code with proper TypeScript types.'
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
        content: 'You are an expert React developer. Analyze the screenshot to understand the exact layout and design. Create a complete page component that imports and uses the provided components to match the original layout EXACTLY.'
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

  // Add parsed CSS information if available
  let styleInfo = '';
  
  if (component.parsedCSS && Object.keys(component.parsedCSS).length > 0) {
    const css = component.parsedCSS;
    
    // Extract most relevant colors (sorted by frequency/relevance)
    const colors = css.colors?.slice(0, 20) || [];
    const fontFamilies = Array.from(css.fontFamilies || []).slice(0, 3);
    const fontSizes = Array.from(css.fontSizes || []).slice(0, 10);
    const spacing = Array.from(css.spacing || []).slice(0, 15);
    const borderRadius = Array.from(css.borderRadius || []).slice(0, 6);
    const shadows = Array.from(css.boxShadows || []).slice(0, 5);
    
    styleInfo = `
🎨 EXTRACTED DESIGN TOKENS (from website's actual CSS):

COLORS (use ONLY these exact values):
${colors.join(', ')}

TYPOGRAPHY:
Font Families: ${fontFamilies.join(' | ') || 'system defaults'}
Font Sizes: ${fontSizes.join(', ') || '14px, 16px, 18px, 20px'}

SPACING (padding/margin):
${spacing.join(', ') || '4px, 8px, 12px, 16px, 24px, 32px'}

VISUAL EFFECTS:
Border Radius: ${borderRadius.join(', ') || '4px, 8px, 12px'}
Box Shadows: ${shadows.slice(0, 3).join(' | ') || 'subtle shadows'}
${Object.keys(css.cssVariables || {}).length > 0 ? `\nCSS VARIABLES:\n${Object.entries(css.cssVariables).slice(0, 8).map(([k, v]) => `${k}: ${v}`).join('\n')}` : ''}

⚠️ CRITICAL: Use ONLY the extracted values above. Match the screenshot exactly with these design tokens.
`;
  } else if (component.colorPalette && component.colorPalette.length > 0) {
    styleInfo = `
🎨 EXTRACTED COLORS (use these EXACT values):
${component.colorPalette.slice(0, 15).join(', ')}
${component.backgroundColors ? `\nBackgrounds: ${component.backgroundColors.slice(0, 10).join(', ')}` : ''}
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
  
  // Add extracted CSS design tokens
  let designTokens = '';
  if (pageData.parsedCSS && Object.keys(pageData.parsedCSS).length > 0) {
    const css = pageData.parsedCSS;
    const colors = css.colors?.slice(0, 25) || [];
    const fonts = Array.from(css.fontFamilies || []).slice(0, 2);
    const sizes = Array.from(css.fontSizes || []).slice(0, 12);
    const spacing = Array.from(css.spacing || []).slice(0, 15);
    
    designTokens = `
🎨 PAGE DESIGN TOKENS (extracted from actual CSS):

COLORS: ${colors.join(', ')}
FONTS: ${fonts.join(' | ')}
SIZES: ${sizes.join(', ')}
SPACING: ${spacing.join(', ')}

⚠️ Use ONLY these extracted values for pixel-perfect matching.
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
