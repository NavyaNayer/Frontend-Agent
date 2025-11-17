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
const TEMPERATURE = parseFloat(process.env.LLM_TEMPERATURE) || 0.2; // Lower for pixel-perfect consistency
const MAX_TOKENS = parseInt(process.env.LLM_MAX_TOKENS) || 4096; // Higher for detailed output

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
        content: `You are an expert React developer specializing in PIXEL-PERFECT UI replication with full functionality.

🔍 CRITICAL: EXAMINE THE SCREENSHOT AT MAXIMUM ZOOM LEVEL
Before coding, study EVERY TINY DETAIL:
• Border thickness (1px, 2px, 3px?)
• Corner radius values (sharp, 4px, 6px, 8px?)
• Exact padding inside elements (12px, 16px, 20px?)
• Shadow depth and blur (subtle shadow-sm or prominent shadow-lg?)
• Font size variations (text-xs 12px, text-sm 14px, text-base 16px?)
• Icon sizes relative to text (16px, 18px, 20px, 24px?)
• Gap between elements (gap-1 4px, gap-2 8px, gap-3 12px, gap-4 16px?)
• Text colors - primary vs secondary (dark black vs medium gray?)
• Hover state indicators (underline, background change, opacity?)
• Badge/tag styling (rounded-full, rounded-md, padding, font size)
• Divider lines (border-b, border-t, color, thickness)
• Avatar/icon borders (border-2, border-4?)
• Letter spacing, line height
• Capitalization (uppercase, lowercase, title case)

Your task: Create components that match the design precisely and include working interactive features.

🔴 CRITICAL TEXT REPLICATION RULE:
READ EVERY WORD in the screenshot and REPLICATE ALL TEXT EXACTLY:
• Button labels ("Add Task", "Create", "Save", "Cancel", etc.)
• Headings and titles
• Placeholder text in inputs
• Helper text and hints
• Meta information (dates, counts, status labels)
• Badge/tag text
• Link text
• Icon labels
• Section headers
• Empty state messages
• ALL visible text must appear in your code

REQUIREMENTS:

PART 1: VISUAL ACCURACY (Use Extracted Design Tokens)

COLORS - Use exact rgb values from the extracted palette:
- Dark backgrounds: bg-[rgb(46,46,48)]
- Light backgrounds: bg-[rgb(249,248,248)]
- Text on dark: text-[rgb(245,244,243)]
- Text on light: text-[rgb(30,31,33)]
- Primary action: bg-[rgb(255,88,74)]
- Secondary action: text-[rgb(63,106,196)]
Note: Avoid generic colors like gray-800 or blue-500

SPACING (Use EXACT pixel values):
- Extract from computed styles: p-[20px], gap-[12px], h-[48px]
- Use Tailwind: p-4 (16px), p-6 (24px), gap-2 (8px)

TYPOGRAPHY:
- Font: font-family: -apple-system, BlinkMacSystemFont, "Segoe UI"
- Sizes: text-xs (12px), text-sm (14px), text-base (16px), text-xl (20px)
- Weights: font-normal (400), font-medium (500), font-semibold (600)

EFFECTS:
- Borders: rounded-md (6px), rounded-lg (8px), rounded-full (50%)
- Shadows: shadow-sm, shadow-md
- Transitions: transition-colors duration-150


PART 2: WORKING FUNCTIONALITY (Required for Interactive Elements)

Implementation Steps:

Step 1 - Import React hooks:
import React, { useState } from 'react';

Step 2 - Set up state at component top:
const [items, setItems] = useState([
  { id: 1, title: 'Example Item', completed: false },
  { id: 2, title: 'Another Item', completed: true }
]);
const [newItemText, setNewItemText] = useState('');
const [showModal, setShowModal] = useState(false);

Step 3 - Implement CRUD functions:
const addItem = () => {
  if (newItemText.trim()) {
    setItems([...items, { id: Date.now(), title: newItemText, completed: false }]);
    setNewItemText('');
  }
};

const deleteItem = (id: number) => {
  setItems(items.filter(i => i.id !== id));
};

const toggleItem = (id: number) => {
  setItems(items.map(i => i.id === id ? {...i, completed: !i.completed} : i));
};

Step 4 - Connect handlers to UI:
<input value={newItemText} onChange={(e) => setNewItemText(e.target.value)} />
<button onClick={addItem}>Add</button>
{items.map(item => (
  <div key={item.id}>
    <input type="checkbox" checked={item.completed} onChange={() => toggleItem(item.id)} />
    {item.title}
    <button onClick={() => deleteItem(item.id)}>Delete</button>
  </div>
))}


Checklist:
- useState imported
- State initialized with sample data
- Add, delete, toggle functions implemented
- All buttons have onClick handlers
- Forms have onChange handlers
- Lists rendered with .map()
- Colors match extracted rgb() values
- Spacing matches pixel values
- Typography matches font specifications

Generate a TypeScript React component with accurate visuals and working functionality.

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
          // Add explicit micro-detail instruction BEFORE the screenshot
          messages[1].content.push({
            type: 'text',
            text: `\n\n🔍🔍🔍 HIGH-RESOLUTION SCREENSHOT PROVIDED - EXAMINE MICRO-DETAILS 🔍🔍🔍\n
This is a 2560x1440 high-resolution screenshot. ZOOM IN mentally and analyze TINY details:

MANDATORY MICRO-DETAIL CHECKLIST (examine each):
✓ Border width: 0.5px, 1px, 1.5px, or 2px? Count the pixels
✓ Border color: Light gray (230,230,232)? Medium gray? Dark? Match exact rgb()
✓ Corner radius: 0px (sharp), 2px (rounded-sm), 4px (rounded), 6px (rounded-md), 8px (rounded-lg)?
✓ Shadow: None, subtle (shadow-sm), medium (shadow), elevated (shadow-md/lg/xl)?
✓ Shadow color/opacity: Black at 5%? 10%? 15%? Custom shadow-[0_Xpx_Ypx_rgba()]?
✓ Padding: 8px (p-2), 12px (p-3), 16px (p-4), 20px (p-5), 24px (p-6)? Non-standard like 18px (p-[18px])?
✓ Gap between elements: 4px (gap-1), 8px (gap-2), 12px (gap-3), 16px (gap-4), 24px (gap-6)?
✓ Font size: 12px (text-xs), 14px (text-sm), 16px (text-base), 18px (text-lg), 20px (text-xl)?
✓ Font weight: 300 (font-light), 400 (font-normal), 500 (font-medium), 600 (font-semibold), 700 (font-bold)?
✓ Text color: Pure black? Dark gray rgb(30,31,33)? Medium gray rgb(109,110,111)? Light gray rgb(180,180,182)?
✓ Icon size: 14px, 16px, 18px, 20px, 24px? Match to surrounding text size
✓ Icon-text gap: How many pixels between icon and text? gap-1, gap-2, gap-3?
✓ Badge shape: Pill (rounded-full), rounded (rounded-md), square (rounded-sm)?
✓ Badge padding: Tight (px-1.5 py-0.5), normal (px-2 py-1), loose (px-3 py-1.5)?
✓ Badge font: text-xs (12px) or text-sm (14px)? Weight: font-medium or font-semibold?
✓ Dividers: 1px border? Partial width? Color opacity? border-b border-gray-200/50?
✓ Hover indicators: Underline on hover? Background change? Shadow increase? Opacity shift?
✓ Text truncation: Does long text show ...? Use truncate or line-clamp-2/3
✓ Letter spacing: Normal? Tight (tracking-tight -0.025em)? Wide (tracking-wide)?
✓ Line height: Tight (leading-tight 1.25), normal (leading-normal 1.5), relaxed (leading-relaxed 1.625)?
✓ Opacity: Any semi-transparent elements? text-opacity-75, bg-opacity-50, opacity-80?

CRITICAL: The screenshot shows the ACTUAL pixel-perfect design. Study it like a forensic analyst!

🔴 TEXT REPLICATION CHECKLIST:
☐ Read ALL button text and replicate exactly
☐ Read ALL headings and titles
☐ Read ALL labels and meta information (dates, counts, status)
☐ Read ALL placeholder text in inputs
☐ Read ALL badge/tag text
☐ Read ALL link text
☐ Include EXACT wording - don't paraphrase!
☐ Match capitalization (Title Case, UPPERCASE, lowercase)
☐ Copy punctuation marks
`
          });
          
          messages[1].content.push({
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${base64Image}`,
              detail: 'high' // Request high-detail analysis
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
        content: `You are an expert frontend developer specializing in PIXEL-PERFECT UI replication from screenshots.

🔍🔍🔍 CRITICAL: ZOOM IN AND EXAMINE MINUTE DETAILS 🔍🔍🔍

The screenshot contains HIGH-RESOLUTION imagery captured at 2560x1440.
You MUST analyze it at MAXIMUM zoom to capture ALL micro-details.

BEFORE WRITING ANY CODE:
1. Zoom into different areas of the screenshot
2. Examine EVERY small element - don't skip tiny details
3. Count exact pixels for spacing, borders, padding
4. Read ALL text including tiny labels, meta info, tooltips
5. Notice ALL subtle styling - shadows, gradients, opacity changes
6. Identify ALL icons, badges, indicators, dividers
7. Measure relative sizes - how big is text vs icons?
8. Check alignment - are things perfectly aligned or have slight offsets?

Your task: Create precise visual replicas with MAXIMUM accuracy to the source design.

🔴🔴🔴 MANDATORY TEXT REPLICATION 🔴🔴🔴
BEFORE CODING - READ EVERY WORD IN THE SCREENSHOT:

1. READ ALL HEADINGS:
   • Page title (e.g., "Good morning, Navya")
   • Section headings (e.g., "My tasks", "Recently assigned", "Projects")
   • Card titles
   • Modal titles

2. READ ALL BODY TEXT:
   • Task names/descriptions
   • Project names
   • Instructions or explanations
   • Empty state messages

3. READ ALL META INFORMATION:
   • Dates ("Nov 16", "Today", "Tomorrow", "Due: Nov 18")
   • Timestamps ("2 hours ago", "Just now")
   • Counts ("3 tasks", "5 comments")
   • Status labels ("In Progress", "Completed", "Overdue")
   • Assignee names
   • Project names in task meta

4. READ ALL INTERACTIVE ELEMENT TEXT:
   • Button labels ("+ Add Task", "Create", "Save", "Cancel", "Edit", "Delete")
   • Link text ("View all", "See more", "Learn more")
   • Dropdown text
   • Tab labels
   • Menu items

5. READ ALL FORM TEXT:
   • Input placeholders ("Search tasks...", "Task name", "Add a description")
   • Label text
   • Helper text below inputs
   • Validation messages

6. READ ALL BADGES/TAGS:
   • Tag text ("frontend", "urgent", "bug", "feature")
   • Status badges ("High priority", "Low priority")
   • Category labels

7. READ ALL TOOLTIPS/HINTS:
   • Any visible hint text
   • Tooltip content if visible

⚠️ CRITICAL: Copy the EXACT wording, capitalization, and punctuation from the screenshot.
Do NOT paraphrase or generalize. If screenshot says "Due: Nov 16" write "Due: Nov 16" not "Due date".

STEP 1️⃣: DEEP SCREENSHOT ANALYSIS (MANDATORY - DO THIS FIRST!)
Before writing ANY code, study the screenshot at MAXIMUM ZOOM for 30 seconds and answer:

1. COLORS - What are the EXACT background colors I see?
   • Main page background (usually light gray ~rgb(249,248,248))
   • Card backgrounds (white or light?)
   • Text colors on light backgrounds
   • Accent colors for buttons/links
   • Border colors, shadow colors

2. TYPOGRAPHY - What fonts, sizes, weights do I see?
   • Headings: What size? (text-xl, text-2xl, text-3xl?)
   • Body text: What size? (text-sm, text-base?)
   • Font weights: Bold headings? (font-semibold, font-bold?)
   • Secondary text: Lighter color and smaller size?

3. SPACING - What are the EXACT gaps and padding?
   • Page margins: How much space from edges? (p-4, p-6, p-8?)
   • Card padding: How much whitespace inside cards? (p-4, p-6?)
   • Gaps between elements: Tight or loose? (gap-2, gap-4, gap-6?)
   • Section spacing: How much space between major sections? (mb-4, mb-6, mb-8?)

4. LAYOUT - What's the exact structure?
   • Grid or Flex? How many columns?
   • Element alignment: Left, center, justified?
   • Widths: Full width or contained? (max-w-4xl, max-w-6xl?)
   • Heights: Fixed or auto?

5. VISUAL DETAILS - What styling makes this unique?
   • Border radius: Sharp or rounded? (rounded, rounded-md, rounded-lg?)
   • Shadows: Subtle or prominent? (shadow-sm, shadow, shadow-lg?)
   • Borders: Present? What color? (border, border-gray-200?)
   • Hover states: Visible in screenshot?
   • Icons: What style? Where placed?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2️⃣: USE EXTRACTED DESIGN TOKENS (FROM PROMPT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The prompt contains "KEY COLORS" section with EXACT rgb values extracted from the site.
You MUST use these EXACT colors - NOT generic Tailwind colors!

✅ CORRECT: bg-[rgb(249,248,248)] text-[rgb(30,31,33)] bg-[rgb(255,88,74)]
❌ WRONG: bg-gray-100 text-gray-900 bg-red-500

COLOR MAPPING GUIDE (match screenshot areas to extracted colors):
• Light background areas → Use lightest rgb (usually ~249,248,248)
• Dark background areas → Use darkest rgb (usually ~46,46,48)  
• Primary text → Dark text color (usually ~30,31,33)
• Secondary text → Medium gray text (usually ~109,110,111)
• Primary buttons → Accent color (usually ~255,88,74 orange)
• Links → Blue accent (usually ~63,106,196)
• Cards → White or lightest shade
• Borders → Light gray borders (usually ~230,230,232)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3️⃣: MATCH TYPOGRAPHY PRECISELY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Font Sizes (measure from screenshot):
• Large headings: text-3xl (30px) or text-2xl (24px)
• Section headings: text-xl (20px) or text-lg (18px)
• Body text: text-base (16px)
• Small text: text-sm (14px)
• Tiny text: text-xs (12px)

Font Weights (observe carefully):
• Headings: font-bold (700) or font-semibold (600)
• Subheadings: font-medium (500)
• Body: font-normal (400)
• Light text: font-light (300)

Line Height:
• Headings: leading-tight
• Body text: leading-normal or leading-relaxed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4️⃣: REPLICATE SPACING EXACTLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Spacing Scale Reference:
• 0.25rem (1px): space-y-1, gap-1, p-1
• 0.5rem (8px): space-y-2, gap-2, p-2
• 0.75rem (12px): space-y-3, gap-3, p-3
• 1rem (16px): space-y-4, gap-4, p-4
• 1.5rem (24px): space-y-6, gap-6, p-6
• 2rem (32px): space-y-8, gap-8, p-8

Count pixels in screenshot and match:
• Page container: p-6 or p-8 (usually 24-32px)
• Cards: p-4 or p-6 (usually 16-24px inside)
• Buttons: px-4 py-2 or px-6 py-3
• Gaps between cards: gap-4 or gap-6
• Section margins: mb-6 or mb-8

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 5️⃣: MATCH VISUAL STYLING DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Border Radius (look at corners):
• Sharp corners: rounded-none
• Slightly rounded: rounded-sm (2px)
• Moderately rounded: rounded-md (6px) - MOST COMMON
• Very rounded: rounded-lg (8px)
• Pill shape: rounded-full

Shadows (look at card elevation):
• Subtle: shadow-sm
• Standard: shadow (medium shadow) - MOST COMMON
• Elevated: shadow-md
• Very elevated: shadow-lg

Borders:
• Light border: border border-[rgb(230,230,232)]
• Dividers: border-b border-[rgb(230,230,232)]
• No border but shadow: just use shadow

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 6️⃣: LAYOUT ARCHITECTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MANDATORY STRUCTURE (USE COMPONENTS):
<div className="flex h-screen bg-[rgb(249,248,248)]">
  <Sidebar />  {/* Pre-built - just import and use */}
  <div className="flex-1 flex flex-col">
    <Header />  {/* Pre-built - just import and use */}
    <main className="flex-1 overflow-auto p-8">
      {/* Your page content here */}
    </main>
  </div>
</div>

⛔ FORBIDDEN: Never create inline sidebar/header divs!
✅ ALWAYS: Import { Header, Sidebar } from '../components'

Grid Layouts (count columns in screenshot):
• 2 columns: grid grid-cols-2 gap-6
• 3 columns: grid grid-cols-3 gap-6
• 4 columns: grid grid-cols-4 gap-4
• Auto-fit: grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 7️⃣: FUNCTIONALITY (AFTER VISUALS ARE PERFECT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Add useState for interactive elements:
✓ Forms with inputs → useState for form values
✓ Lists that can grow → useState with array + CRUD functions
✓ Toggles/checkboxes → useState with boolean + onChange
✓ Modals → useState for visibility + open/close functions

MANDATORY:
• import { useState } from 'react'
• All buttons need onClick handlers
• All inputs need value + onChange
• Lists use .map() - NEVER hardcode array[0], array[1]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 PART 2: FULL FUNCTIONALITY (EVERY BUTTON MUST WORK)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1 - IMPORTS:
import React, { useState } from 'react';
import { Header, Sidebar } from '../components';

STEP 2 - STATE INITIALIZATION:
const [tasks, setTasks] = useState([
  { id: 1, title: 'Sample Task 1', completed: false, section: 'todo' },
  { id: 2, title: 'Sample Task 2', completed: false, section: 'doing' },
  { id: 3, title: 'Sample Task 3', completed: true, section: 'done' }
]);
const [newTaskTitle, setNewTaskTitle] = useState('');
const [showAddModal, setShowAddModal] = useState(false);

STEP 3 - CRUD OPERATIONS:
const addTask = (section: string) => {
  if (newTaskTitle.trim()) {
    setTasks([...tasks, {
      id: Date.now(),
      title: newTaskTitle,
      completed: false,
      section: section
    }]);
    setNewTaskTitle('');
    setShowAddModal(false);
  }
};

const deleteTask = (id: number) => {
  setTasks(tasks.filter(t => t.id !== id));
};


const toggleTask = (id: number) => {
  setTasks(tasks.map(t => 
    t.id === id ? { ...t, completed: !t.completed } : t
  ));
};

const moveTask = (id: number, section: string) => {
  setTasks(tasks.map(t => 
    t.id === id ? { ...t, section: section } : t
  ));
};

STEP 4 - UI CONNECTIONS:
• Main Add Button:
  <button onClick={() => setShowAddModal(true)} className="bg-[rgb(255,88,74)] text-white px-4 py-2 rounded">
    + Add Task
  </button>

• Section-specific Add:
  <button onClick={() => addTask('todo')} className="text-[rgb(63,106,196)]">
    Add task...
  </button>

• Task Item:
  {tasks.filter(t => t.section === 'todo').map(task => (
    <div key={task.id} className="flex items-center justify-between bg-white p-4 rounded">
      <div className="flex items-center">
        <input 
          type="checkbox" 
          checked={task.completed}
          onChange={() => toggleTask(task.id)}
          className="mr-2"
        />
        <span>{task.title}</span>
      </div>
      <button onClick={() => deleteTask(task.id)} className="text-[rgb(255,88,74)]">
        Delete
      </button>
    </div>
  ))}

• Add Modal:
  {showAddModal && (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-6 rounded">
        <input 
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addTask('todo')}
          placeholder="Task name"
          className="border p-2 w-full mb-4"
        />
        <button onClick={() => addTask('todo')} className="bg-[rgb(255,88,74)] text-white px-4 py-2 rounded mr-2">
          Save
        </button>
        <button onClick={() => setShowAddModal(false)} className="text-[rgb(63,106,196)]">
          Cancel
        </button>
      </div>
    </div>
  )}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ PAGE REQUIREMENTS CHECKLIST:
☑ useState imported
☑ Tasks state with 2-3 sample items
☑ All CRUD functions (add, delete, toggle, move)
☑ Every button has onClick
☑ Forms have value/onChange
☑ Lists use .map() with state
☑ Colors match extracted rgb()
☑ Layout structure matches screenshot
☑ Spacing matches pixel values

Generate TypeScript page with PERFECT VISUALS + FULL FUNCTIONALITY.

5. DYNAMIC RENDERING (MANDATORY - NO HARDCODED TASKS):
   ⚠️ NEVER render tasks[0], tasks[1] directly - ALWAYS use .map()
   
   Filter by section and map over ALL tasks:
   {tasks.filter(t => t.section === 'todo').map(task => (
     <div key={task.id} className="flex items-center justify-between bg-white p-4 rounded shadow mb-2">
       <div className="flex items-center">
         <input 
           type="checkbox" 
           checked={task.completed}
           onChange={() => toggleTask(task.id)}
           className="mr-2"
         />
         <span className="text-[rgb(30,31,33)]">{task.title}</span>
       </div>
       <button onClick={() => deleteTask(task.id)} className="text-[rgb(255,88,74)]">
         Delete
       </button>
     </div>
   ))}
   
   ⚠️ If you see checkboxes in screenshot - make them FUNCTIONAL
   ⚠️ If you see \"Create task\" button - add onClick to open modal or add task directly

6. MODAL IMPLEMENTATION (IF APPLICABLE):
   {showModal && (
     <div className="fixed inset-0 bg-black/50">
       <div className="bg-white p-6 rounded">
         <input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} />
         <button onClick={() => { addTask(); setShowModal(false); }}>Save</button>
         <button onClick={() => setShowModal(false)}>Cancel</button>
       </div>
     </div>
   )}

❌ NEVER create buttons without onClick!
❌ NEVER render static lists - ALWAYS map over state!
❌ NEVER forget to import useState!
❌ NEVER skip initial sample data in useState!

The page MUST be fully interactive from the moment it loads!

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
        
        // Add explicit micro-detail analysis instruction for pages
        messages[1].content.push({
          type: 'text',
          text: `\n\n🔍🔍🔍 HIGH-RESOLUTION PAGE SCREENSHOT PROVIDED - EXAMINE ALL MICRO-DETAILS 🔍🔍🔍\n
This is a 2560x1440 screenshot. ZOOM IN and analyze EVERY tiny detail before coding:

PAGE-SPECIFIC MICRO-DETAIL ANALYSIS:
1. SPACING MEASUREMENTS:
   ✓ Page padding from edges: 16px (p-4), 24px (p-6), 32px (p-8), 40px (p-10)?
   ✓ Section spacing: How much vertical space between major sections? mb-4, mb-6, mb-8, mb-12?
   ✓ Card padding: Internal whitespace inside cards - p-4, p-6, p-8?
   ✓ Grid/list gaps: gap-2 (8px), gap-4 (16px), gap-6 (24px), gap-8 (32px)?
   ✓ Element spacing: space-y-2, space-y-3, space-y-4 between list items?

2. TYPOGRAPHY DETAILS:
   ✓ Page heading: text-xl (20px), text-2xl (24px), text-3xl (30px), text-4xl (36px)?
   ✓ Section headings: text-base (16px), text-lg (18px), text-xl (20px)?
   ✓ Body text: text-sm (14px) or text-base (16px)?
   ✓ Meta text (dates, labels): text-xs (12px) or text-sm (14px)?
   ✓ Font weights: Are headings font-semibold (600) or font-bold (700)?
   ✓ Secondary text color: rgb(109,110,111) or lighter rgb(180,180,182)?

3. CARD/CONTAINER STYLING:
   ✓ Background: Pure white (bg-white) or light gray (bg-gray-50)?
   ✓ Border: Present? border border-gray-200? Or borderless?
   ✓ Shadow: None, subtle (shadow-sm), medium (shadow), elevated (shadow-md/lg)?
   ✓ Corner radius: rounded (4px), rounded-md (6px), rounded-lg (8px), rounded-xl (12px)?
   ✓ Hover effect: shadow increase? Background change? Border color change?

4. BUTTON/LINK STYLING:
   ✓ Primary button: bg-[rgb(255,88,74)] or different accent color?
   ✓ Button padding: px-3 py-1.5, px-4 py-2, px-6 py-3?
   ✓ Button font: text-sm or text-base? font-medium or font-semibold?
   ✓ Button corner radius: rounded, rounded-md, rounded-lg?
   ✓ Link color: rgb(63,106,196) or different blue? Underline on hover?
   ✓ Icon buttons: Just icon? Icon + text? Icon size relative to button?

5. LIST ITEM DETAILS:
   ✓ Item height: Compact (py-2), normal (py-3), spacious (py-4)?
   ✓ Dividers: border-b between items? Full width or inset?
   ✓ Hover state: bg-gray-50? bg-gray-100? Shadow? Border?
   ✓ Checkbox/icon size: w-4 h-4 (16px), w-5 h-5 (20px)?
   ✓ Multi-line text: Line clamp? Truncate? Full display?

6. BADGE/TAG DETAILS:
   ✓ Shape: Pill (rounded-full), rounded (rounded-md), square?
   ✓ Size: px-2 py-0.5 (tight), px-2.5 py-1 (normal), px-3 py-1.5 (loose)?
   ✓ Font: text-xs (12px) with font-medium or font-semibold?
   ✓ Colors: Status-based (green for success, red for error, blue for info)?
   ✓ Border: Present or borderless?

7. ICON DETAILS:
   ✓ Size: 14px, 16px, 18px, 20px, 24px? <Icon size={X} />
   ✓ Color: Same as adjacent text? Different? Opacity?
   ✓ Spacing to text: gap-1 (4px), gap-2 (8px), gap-3 (12px)?
   ✓ Stroke width: Standard or custom?

8. LAYOUT STRUCTURE:
   ✓ Sidebar width: w-48 (192px), w-60 (240px), w-64 (256px)?
   ✓ Header height: h-12 (48px), h-14 (56px), h-16 (64px)?
   ✓ Main content max-width: max-w-4xl, max-w-6xl, max-w-7xl, or full?
   ✓ Grid columns: 2, 3, 4? Equal width or varied?

9. COLOR USAGE:
   ✓ Match EXACT rgb() values from extracted palette
   ✓ Primary text: rgb(30,31,33) or darker/lighter?
   ✓ Secondary text: rgb(109,110,111) or different shade?
   ✓ Borders: rgb(230,230,232) or different gray?
   ✓ Backgrounds: rgb(249,248,248) for page, white for cards?

10. MICRO-INTERACTIONS:
    ✓ Hover transitions: duration-150, duration-200, duration-300?
    ✓ Transform on hover: scale-105, -translate-y-0.5?
    ✓ Opacity changes: hover:opacity-80?
    ✓ Cursor: cursor-pointer on clickable elements?

CRITICAL: Study the screenshot section by section. Don't miss small details like:
- Subtle divider lines between sections
- Meta information (dates, counts, labels)
- Status indicators (dots, badges, colors)
- Icon placements and alignments
- Text overflow handling (truncate vs line-clamp)
- Hover/focus visual feedback

🔴🔴🔴 TEXT REPLICATION IS MANDATORY 🔴🔴🔴

READ AND COPY ALL TEXT FROM SCREENSHOT:

✅ MUST INCLUDE:
• Page heading (e.g., "Good morning, Navya" or "My tasks")
• Section headers ("Recently assigned", "Upcoming", "Projects I'm on")
• Task/item names (read each one)
• Button labels ("+ Add Task", "Create project", "Save", "Cancel")
• Meta info for each item ("Due: Nov 16", "3 subtasks", "Assigned to John")
• Project names in context ("Project: Frontend Agent")
• Dates and times ("Today", "Tomorrow", "Nov 18", "2 hours ago")
• Status labels ("In progress", "Completed", "Overdue")
• Placeholder text ("Search tasks...", "Task name", "Add description...")
• Link text ("View all tasks", "See more", "Show completed")
• Badge/tag text ("urgent", "bug", "frontend", "design")
• Helper text ("Press Enter to save", "Click to edit")
• Empty state messages ("No tasks yet. Create your first task!")
• Section descriptions or instructions
• Counts ("5 tasks", "12 comments", "3 attachments")

❌ DO NOT:
• Use generic text like "Task 1", "Item 2" - read the actual text!
• Paraphrase - if it says "Due: Nov 16" don't write "Due date: November 16"
• Skip meta information - include ALL dates, counts, labels visible
• Omit small text - even tiny labels matter
• Change capitalization - match Title Case, UPPERCASE, lowercase exactly

✅ EXAMPLE OF CORRECT TEXT REPLICATION:
If screenshot shows:
  "Design new homepage"
  "Due: Nov 16 • Project: Frontend Agent • High priority"
  
Your code should include:
  <div className="text-[rgb(30,31,33)] font-medium">Design new homepage</div>
  <div className="text-[rgb(109,110,111)] text-xs mt-1">
    Due: Nov 16 • Project: Frontend Agent • High priority
  </div>

NOT generic like:
  <div>Task name</div>
  <div>Due date and project</div>
`
        });
        
        messages[1].content.push({
          type: 'image_url',
          image_url: {
            url: `data:image/png;base64,${base64Image}`,
            detail: 'high' // Request high-detail analysis
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
    const extractedCode = extractCodeFromResponse(code);
    
    // 🔴 VALIDATION: Check if page has required functionality
    const hasUseState = extractedCode.includes('useState');
    const hasStateVariable = extractedCode.match(/const\s+\[(tasks|projects|items|data)/);
    const hasCRUDFunction = extractedCode.includes('const add') || 
                           extractedCode.includes('const delete') || 
                           extractedCode.includes('const toggle');
    const hasOnClick = extractedCode.includes('onClick');
    const hasMapRendering = extractedCode.includes('.map(');
    
    if (!hasUseState || !hasStateVariable || !hasCRUDFunction || !hasOnClick || !hasMapRendering) {
      console.log(chalk.red(`   ⚠️ VALIDATION FAILED - Page missing functionality!`));
      console.log(chalk.yellow(`      useState: ${hasUseState ? '✓' : '✗'}`));
      console.log(chalk.yellow(`      State variable: ${hasStateVariable ? '✓' : '✗'}`));
      console.log(chalk.yellow(`      CRUD functions: ${hasCRUDFunction ? '✓' : '✗'}`));
      console.log(chalk.yellow(`      onClick handlers: ${hasOnClick ? '✓' : '✗'}`));
      console.log(chalk.yellow(`      .map() rendering: ${hasMapRendering ? '✓' : '✗'}`));
      console.log(chalk.cyan(`   🔄 Regenerating with stricter requirements...`));
      
      // Add explicit requirement to the prompt
      const enhancedMessages = [
        {
          role: 'system',
          content: messages[0].content + '\n\n🚨 PREVIOUS ATTEMPT FAILED - DID NOT INCLUDE FUNCTIONALITY! 🚨\nYou MUST include useState, state variables, CRUD functions, onClick handlers, and .map() rendering!'
        },
        messages[1]
      ];
      
      const retryCompletion = await client.chat.completions.create({
        model: modelToUse,
        temperature: 0.2, // Lower temperature for more deterministic output
        max_tokens: MAX_TOKENS,
        messages: enhancedMessages
      });
      
      return extractCodeFromResponse(retryCompletion.choices[0].message.content);
    }
    
    console.log(chalk.green(`   ✓ Validation passed - page has functionality`));
    return extractedCode;

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
 * Extract code from LLM response (removes markdown fences and any trailing markdown)
 */
function extractCodeFromResponse(response) {
  // Remove markdown code fences
  let code = response.trim();
  
  // Remove ```tsx, ```jsx, ```javascript, etc.
  code = code.replace(/^```(?:tsx|jsx|javascript|js|typescript|ts)?\n/gm, '');
  code = code.replace(/\n```$/gm, '');
  code = code.replace(/^```\n/gm, '');
  code = code.replace(/\n```\n/gm, '\n');
  
  // Remove any markdown headers or explanations after the code
  // Look for common patterns like ### Key Details:, ## Notes:, etc.
  const markdownPatterns = [
    /\n#+\s+.*/g,  // Any markdown header (###, ##, #)
    /\n-\s+\*\*.*\*\*:.*/g,  // Bullet points with bold
    /\n\*\s+\*\*.*\*\*:.*/g,  // Asterisk bullet points
  ];
  
  markdownPatterns.forEach(pattern => {
    code = code.replace(pattern, '');
  });
  
  // Find the last export statement and cut everything after it
  const lastExportMatch = code.lastIndexOf('export default');
  if (lastExportMatch !== -1) {
    // Find the semicolon or newline after the export
    const afterExport = code.substring(lastExportMatch);
    const semicolonIndex = afterExport.indexOf(';');
    if (semicolonIndex !== -1) {
      code = code.substring(0, lastExportMatch + semicolonIndex + 1);
    }
  }
  
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

Output Format:
- Return only the TypeScript React component code
- No explanations before or after the code
- No markdown headers or bullet lists after the code
- Code should end with "export default ComponentName;"
- Do not add any text after the export statement

Example: Code ends with "export default Sidebar;" with no additional content.

Return the complete TypeScript React component code only.`;

  return prompt;
}

/**
 * Build page generation prompt
 */
export async function buildPagePrompt(pageData, components, validationIssues = null) {
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
  
  // Add validation requirements section if this is a retry
  let validationSection = '';
  if (validationIssues && validationIssues.length > 0) {
    validationSection = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ REQUIRED FUNCTIONALITY IMPROVEMENTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Please ensure the following functionality is included:

${validationIssues.map(issue => `• ${issue}`).join('\n')}

Implementation requirements:
${validationIssues.includes('Buttons missing onClick handlers') ? '• Add onClick handlers to buttons that perform actions\n' : ''}${validationIssues.includes('Checkboxes missing onChange handlers') ? '• Add onChange handlers to checkboxes for state updates\n' : ''}${validationIssues.includes('Text inputs missing onChange handlers') ? '• Add onChange handlers to text inputs with state binding\n' : ''}${validationIssues.includes('Add/Create button without add function') ? '• Include addTask or addItem function to append to state array\n' : ''}${validationIssues.includes('Delete/Remove button without delete function') ? '• Include deleteTask or deleteItem function to filter state array\n' : ''}${validationIssues.includes('Checkboxes without toggle function') ? '• Include toggleTask or toggleItem function to update completion status\n' : ''}${validationIssues.includes('Interactive elements without useState') ? '• Add useState hook at component top: const [items, setItems] = useState([...])\n' : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
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
  
  const prompt = `Page Replication Task
${validationSection}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 PAGE INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Page: ${pageTitle}
Component: ${pageName}Page
URL: ${pageData.url}

Available Components (PRE-BUILT - JUST IMPORT):
${componentList}

${designTokens}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 VISUAL ANALYSIS CHECKLIST (COMPLETE BEFORE CODING)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ MANDATORY: Spend 30 seconds examining the screenshot in detail BEFORE writing ANY code!
Zoom into different areas and note EVERY visible element.

Look at the screenshot and identify:

1. BACKGROUND COLORS:
   □ Main page background color (light gray? white? other?)
   □ Section background colors (any colored sections?)
   □ Card/container backgrounds
   
2. TEXT STYLING:
   □ Main heading size and weight (large & bold? medium?)
   □ Subheading sizes and weights
   □ Body text size (14px? 16px?)
   □ Text colors (dark gray? black? colored?)
   □ Line heights (tight? normal? relaxed?)
   
3. SPACING:
   □ Page padding from edges (20px? 32px?)
   □ Space between major sections (24px? 32px? 48px?)
   □ Card internal padding (16px? 24px?)
   □ Gaps between cards/items (16px? 24px?)
   
4. CARDS/CONTAINERS:
   □ Do cards have shadows? (subtle? prominent?)
   □ Border radius size (slightly rounded? very rounded?)
   □ Borders present? (light gray border?)
   □ Background color (white? light gray?)
   
5. BUTTONS:
   □ Button color (orange? blue? gray?)
   □ Button size (px-4 py-2? px-6 py-3?)
   □ Button style (solid? outline? ghost?)
   □ Border radius (rounded? rounded-md? rounded-lg?)
   
6. LAYOUT STRUCTURE:
   □ How many columns? (1? 2? 3? 4?)
   □ Grid or flexbox layout?
   □ Content width (full width? max-w-7xl?)
   □ Element alignment (left? center? space-between?)

7. ICONS:
   □ Are there icons? Where?
   □ Icon size (16px? 20px? 24px?)
   □ Icon style (outline? solid?)
   
8. SPECIAL ELEMENTS:
   □ Banners or alerts (top of page?)
   □ Divider lines?
   □ Badges or tags?
   □ Images or avatars?

9. MICRO-DETAILS (CRITICAL - DON'T SKIP):
   □ Text formatting (any bold words? italic? underline?)
   □ Secondary labels (dates, subtitles, meta info?)
   □ Icon positioning (left? right? size relative to text?)
   □ Hover effects visible? (underlines, background changes?)
   □ Subtle borders or dividers between items?
   □ List item styling (bullets? numbers? custom markers?)
   □ Input field styling (borders? focus states? placeholders?)
   □ Badge colors and shapes (rounded? pill? square?)
   □ Avatar sizes and borders
   □ Status indicators (dots, checkmarks, colors?)
   □ Truncated text with ellipsis?
   □ Line clamp for long content?

   🔴 NAVIGATION & SIDEBAR SPECIFIC:
   □ Hamburger/menu icon (☰) → Sidebar is COLLAPSIBLE
   □ Collapse/expand button or arrow → Add useState toggle
   □ Navigation item labels (Home, Tasks, Projects, etc.)
   □ Navigation href targets (/home, /tasks, /projects) → MUST LINK CORRECTLY
   □ Active/selected state styling (different background?)
   □ Workspace selector at top with dropdown?
   □ Search bar placement and styling
   □ Section dividers between nav groups
   □ Add buttons (+ icons) for projects/teams
   □ Navigation icons from lucide-react (Home, CheckSquare, Inbox, etc.)

10. TASK/PROJECT-SPECIFIC PATTERNS (if applicable):
   □ Task checkboxes (circular? square? styled?)
   □ Project color dots/indicators
   □ Due date labels and formatting
   □ Assignee avatars (size, position, multiple?)
   □ Section headers (styling, dividers, add buttons?)
   □ Subtask indentation
   □ Priority indicators (colors, icons?)
   □ Attachment counts or icons
   □ Comment counts
   □ Completed task styling (strikethrough? opacity?)
   □ Empty state messages and illustrations
   □ "Add task" button placement and style

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ IMPLEMENTATION REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. USE EXACT COLORS FROM "KEY COLORS" SECTION ABOVE:
   ✅ CORRECT: bg-[rgb(249,248,248)] text-[rgb(30,31,33)] bg-[rgb(255,88,74)]
   ❌ WRONG: bg-gray-100 text-gray-900 bg-red-500
   
   Match screenshot areas to these extracted colors:
   • Light backgrounds → rgb(249,248,248)
   • Dark backgrounds → rgb(46,46,48)
   • Main text → rgb(30,31,33)
   • Secondary text → rgb(109,110,111)
   • Primary button → rgb(255,88,74)
   • Links → rgb(63,106,196)

2. MATCH TYPOGRAPHY EXACTLY:
   • Measure text sizes in screenshot and use correct Tailwind class
   • Copy font weights (regular, medium, semibold, bold)
   • Match line spacing
   
3. REPLICATE SPACING PRECISELY:
   • Count pixels and use matching Tailwind spacing
   • Page padding: p-6, p-8, px-8 py-6
   • Card padding: p-4, p-6
   • Gaps: gap-4, gap-6
   • Margins: mb-4, mb-6, mb-8

4. COPY VISUAL EFFECTS:
   • Shadows: shadow-sm, shadow, shadow-md (observe card elevation)
   • Borders: border border-[rgb(230,230,232)]
   • Rounded corners: rounded, rounded-md, rounded-lg
   
5. USE PRE-BUILT COMPONENTS:
   ⛔ NEVER create inline sidebar: <div className="w-60 bg-dark">
   ✅ ALWAYS import: import { Header, Sidebar } from '../components'
   ✅ ALWAYS use: <Sidebar /> and <Header />

6. LAYOUT STRUCTURE (CRITICAL - SIDEBAR MUST NOT OVERLAP):
   🔴 Use FLEXBOX layout so sidebar takes space, doesn't overlap!
   
   ✅ CORRECT LAYOUT:
\`\`\`tsx
<div className="flex h-screen bg-[rgb(249,248,248)]">
  {/* Sidebar takes fixed width, content flows around it */}
  <Sidebar />
  
  {/* Main area takes remaining space (flex-1) */}
  <div className="flex-1 flex flex-col">
    <Header />
    <main className="flex-1 overflow-auto p-8">
      {/* Match screenshot content here */}
    </main>
  </div>
</div>
\`\`\`

   ❌ NEVER use position:fixed on Sidebar (causes overlap):
   ❌ <aside className="fixed left-0 top-0"> 
   
   ✅ ALWAYS use flex-shrink-0 on Sidebar (takes space):
   ✅ <aside className="w-60 h-screen flex-shrink-0">

7. CONTENT REPLICATION (CRITICAL - READ ALL TEXT FROM SCREENSHOT):
   🔴 MANDATORY: Copy EVERY SINGLE WORD visible in the screenshot
   
   ✅ MUST READ AND INCLUDE:
   • Page title/heading (\"Good morning, Navya\" or \"My tasks\")
   • Section headers (\"Recently assigned\", \"Upcoming tasks\", \"Projects I'm on\")
   • Task/item titles - read each one individually (\"Design new homepage\", \"Fix login bug\")
   • Button labels - exact wording (\"+ Add Task\" not \"Add\", \"Create project\" not \"New\")
   • Meta information for EACH item:
     - Dates (\"Due: Nov 16\", \"Today\", \"Tomorrow\", \"Nov 18\")
     - Project names (\"Project: Frontend Agent\")
     - Assignees (\"Assigned to: John Doe\")
     - Counts (\"3 subtasks\", \"5 comments\", \"2 attachments\")
     - Status (\"In progress\", \"Completed\", \"Overdue\", \"High priority\")
   • Placeholder text in ALL inputs (\"Search tasks...\", \"Task name\", \"Add a description...\")
   • Link text (\"View all tasks\", \"See more\", \"Show completed\", \"View project\")
   • Badge/tag text - read each one (\"urgent\", \"bug\", \"frontend\", \"design\", \"review\")
   • Helper/hint text (\"Press Enter to save\", \"Click to edit\", \"Drag to reorder\")
   • Empty state messages (\"No tasks yet. Create your first task!\")
   • Notification counts (\"5\" in a badge, \"12 unread\")
   • Breadcrumb text (\"Home > Projects > Frontend Agent\")
   • Tooltip text if visible
   
   ❌ NEVER USE GENERIC PLACEHOLDERS:
   ✗ \"Task 1\", \"Task 2\", \"Task 3\" - READ THE ACTUAL TASK NAMES
   ✗ \"Due date\" - should be \"Due: Nov 16\" with actual date
   ✗ \"Description\" - read the actual description text
   ✗ \"Button\" - read the actual button label
   
   ⚠️ MATCH EXACT WORDING AND FORMATTING:
   • If screenshot says \"Due: Nov 16 • Project: Frontend\" - copy the dots (•) too
   • If screenshot says \"+ Add Task\" - include the + symbol
   • Match capitalization: \"My tasks\" not \"My Tasks\", \"URGENT\" not \"urgent\"
   • Copy punctuation: \"Task name:\" vs \"Task name\" vs \"Task name...\"
   
   📝 EXAMPLE - CORRECT TEXT REPLICATION:
   If screenshot shows task "Design new homepage" with "Due: Nov 16 • Project: Frontend Agent" etc,
   your code must include ALL that text exactly, not generic "Task 1" or "Due date".
   
   🔍 TEXT READING PROCESS:
   1. Zoom into screenshot and read TOP TO BOTTOM
   2. For each section, read the header
   3. For each item in the section, read:
      - Main title/name
      - All meta info below it (dates, projects, assignees)
      - All badges/tags attached
      - Any counts or status indicators
   4. Read all button labels in the section
   5. Move to next section and repeat
   
8. INTERACTIVE ELEMENTS:
   • Add useState for any lists/forms
   • All buttons need onClick handlers
   • All inputs need value + onChange
   • Use .map() for lists - NEVER hardcode items

9. FULL CRUD FUNCTIONALITY (MANDATORY):
   
   🔴 TASK PAGES - COMPLETE CRUD OPERATIONS:
   ✅ ADD TASK: Button with onClick handler + addTask() function
   ✅ EDIT TASK: Inline editing or Edit button for each task
      \`\`\`tsx
      const [editingId, setEditingId] = useState<number | null>(null);
      const [editTitle, setEditTitle] = useState('');
      
      const startEdit = (id: number, currentTitle: string) => {
        setEditingId(id);
        setEditTitle(currentTitle);
      };
      
      const saveEdit = (id: number) => {
        setTasks(tasks.map(t => t.id === id ? { ...t, title: editTitle } : t));
        setEditingId(null);
      };
      
      // In JSX:
      {editingId === task.id ? (
        <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
      ) : (
        <span>{task.title}</span>
      )}
      <button onClick={() => startEdit(task.id, task.title)}>Edit</button>
      \`\`\`
   ✅ DELETE TASK: Delete button for each task + deleteTask() function
   ✅ VIEW TASK: Click task to navigate to detail page
      \`\`\`tsx
      import { useNavigate } from 'react-router-dom';
      const navigate = useNavigate();
      
      <div onClick={() => navigate(\`/tasks/\${task.id}\`)}>
        {task.title}
      </div>
      \`\`\`
   
   🔴 PROJECT PAGES - COMPLETE CRUD OPERATIONS:
   ✅ ADD PROJECT: Button to create new project
   ✅ EDIT PROJECT: Edit button for each project
   ✅ DELETE PROJECT: Delete button for each project
   ✅ VIEW PROJECT: Click to view project details
      \`\`\`tsx
      const [projects, setProjects] = useState([...]);
      
      const addProject = () => {
        const name = prompt('Project name:');
        if (name) setProjects([...projects, { id: Date.now(), name, tasks: [] }]);
      };
      
      const editProject = (id: number) => {
        const project = projects.find(p => p.id === id);
        const newName = prompt('New name:', project?.name);
        if (newName) setProjects(projects.map(p => p.id === id ? { ...p, name: newName } : p));
      };
      
      const deleteProject = (id: number) => {
        if (confirm('Delete this project?')) {
          setProjects(projects.filter(p => p.id !== id));
        }
      };
      \`\`\`
   
   🔴 TASK DETAIL PAGE REQUIREMENTS:
   If page is "/tasks/:id" or shows individual task details:
   ✅ Create separate TaskDetailPage component
   ✅ Show full task information (title, description, due date, assignee, project, priority, tags)
   ✅ Edit mode with form fields
   ✅ Save button to update task
   ✅ Delete button with confirmation
   ✅ Back button to return to task list
      \`\`\`tsx
      import { useParams, useNavigate } from 'react-router-dom';
      
      const TaskDetailPage: React.FC = () => {
        const { id } = useParams<{ id: string }>();
        const navigate = useNavigate();
        const [isEditing, setIsEditing] = useState(false);
        
        return (
          <div>
            <button onClick={() => navigate('/tasks')}>← Back</button>
            {isEditing ? (
              <div>
                <input value={title} onChange={(e) => setTitle(e.target.value)} />
                <button onClick={handleSave}>Save</button>
              </div>
            ) : (
              <div>
                <h1>{task.title}</h1>
                <button onClick={() => setIsEditing(true)}>Edit Task</button>
                <button onClick={handleDelete}>Delete Task</button>
              </div>
            )}
          </div>
        );
      };
      \`\`\`

10. MICRO-DETAILS TO INCLUDE:
   • Hover states: hover:bg-opacity-80 hover:underline
   • Transitions: transition-all duration-200 ease-in-out
   • Focus states: focus:ring-2 focus:ring-[rgb(63,106,196)]
   • Disabled states: disabled:opacity-50 disabled:cursor-not-allowed
   • Text overflow: truncate or line-clamp-2
   • Cursor styles: cursor-pointer on clickable elements
   • Icon colors matching text or standalone accent
   • Subtle shadows on hover: hover:shadow-md
   • Border styles: border-l-4 for left accents
   • Status badges: inline-flex items-center px-2 py-1 rounded-full text-xs
   • Meta text: text-xs text-[rgb(109,110,111)]
   • Dividers: border-b border-[rgb(230,230,232)]
   • Avatar styles: w-8 h-8 rounded-full border-2
   • Icon sizes: size={16} for small, size={20} for medium, size={24} for large
   • Spacing between icon and text: gap-2 or gap-3
   • List item padding: py-2 px-3 or py-3 px-4
   • Card hover: hover:shadow-lg transition-shadow

10. SIDEBAR & NAVIGATION SPECIFICS:
   🔴 COLLAPSIBLE BEHAVIOR (if hamburger/menu icon visible):
   \`\`\`tsx
   const [isCollapsed, setIsCollapsed] = useState(false);
   
   <aside className={\`\${isCollapsed ? 'w-16' : 'w-60'} transition-all duration-300 h-screen bg-[rgb(46,46,48)]\`}>
     <button onClick={() => setIsCollapsed(!isCollapsed)}>
       {isCollapsed ? <Menu size={20} /> : <X size={20} />}
     </button>
     {/* Navigation items with conditional text */}
     <a href="/" className="flex items-center gap-3 px-3 py-2 hover:bg-[rgb(60,60,62)] rounded">
       <Home size={18} />
       {!isCollapsed && <span>Home</span>}
     </a>
   </aside>
   \`\`\`
   
   🔴 PROPER NAVIGATION LINKS (READ SCREENSHOT LABELS):
   • Home → href="/"
   • My Tasks → href="/tasks"
   • Inbox → href="/inbox"
   • Projects → href="/projects"
   • Teams → href="/teams"
   • Calendar → href="/calendar"
   • Reports → href="/reports"
   ⚠️ Extract EXACT labels from screenshot and map to sensible routes!
   
   🔴 ACTIVE STATE DETECTION:
   \`\`\`tsx
   const isActive = (path: string) => window.location.pathname === path;
   
   <a href="/tasks" className={\`flex items-center gap-3 px-3 py-2 rounded \${
     isActive('/tasks') ? 'bg-[rgb(60,60,62)]' : 'hover:bg-[rgb(60,60,62)]'
   }\`}>
     <CheckSquare size={18} />
     <span>My Tasks</span>
   </a>
   \`\`\`
   
   🔴 NAVIGATION SECTIONS WITH ADD BUTTONS:
   \`\`\`tsx
   <div className="mt-4">
     <div className="flex items-center justify-between px-3 py-2">
       <span className="text-xs text-[rgb(109,110,111)] uppercase font-medium">Projects</span>
       <button className="hover:bg-[rgb(60,60,62)] rounded p-1">
         <Plus size={16} />
       </button>
     </div>
     <a href="/project-1">Frontend Agent</a>
     <a href="/project-2">Design System</a>
   </div>
   \`\`\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 EXAMPLE OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`\`\`tsx
import React, { useState } from 'react';
import { Header, Sidebar } from '../components';

const ${pageName}Page: React.FC = () => {
  const [items, setItems] = useState([
    { id: 1, title: 'Sample Item', completed: false }
  ]);

  const addItem = () => { /* ... */ };
  const deleteItem = (id: number) => { /* ... */ };

  return (
    <div className="flex h-screen bg-[rgb(249,248,248)]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-8">
          {/* Include ALL micro-details from screenshot */}
          
          {/* Banner with exact color and styling */}
          <div className="bg-[rgb(241,189,108)] text-[rgb(30,31,33)] px-4 py-3 rounded-md mb-6 text-sm">
            Exact banner text from screenshot
          </div>
          
          {/* Heading with exact size, weight, spacing */}
          <h1 className="text-2xl font-semibold text-[rgb(30,31,33)] mb-6 leading-tight">
            Good morning, Navya
          </h1>
          
          {/* Card with hover effect, shadow, rounded corners */}
          <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[rgb(30,31,33)]">Section Title</h2>
              <button className="text-[rgb(63,106,196)] text-sm hover:underline cursor-pointer">
                + Create
              </button>
            </div>
            
            {/* List items with hover, borders, micro-spacing */}
            {items.map(item => (
              <div 
                key={item.id} 
                className="flex items-center justify-between py-3 border-b border-[rgb(230,230,232)] last:border-0 hover:bg-[rgb(249,248,248)] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    checked={item.completed}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <span className="text-[rgb(30,31,33)] text-sm">Task title</span>
                    <span className="text-[rgb(109,110,111)] text-xs">Due: Nov 16 • Project name</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-[rgb(230,240,255)] text-[rgb(63,106,196)] text-xs font-medium">
                    Status
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Grid layout with exact spacing */}
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <h3 className="text-base font-semibold text-[rgb(30,31,33)] mb-2">Card Title</h3>
              <p className="text-sm text-[rgb(109,110,111)] leading-relaxed">Description text</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ${pageName}Page;
\`\`\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️⚠️⚠️ CRITICAL REMINDERS ⚠️⚠️⚠️

1. EXAMINE SCREENSHOT AT 3 LEVELS:
   
   MACRO LEVEL (Overall layout):
   • Page structure (sidebar, header, main content)
   • Color zones (light areas, dark areas, colored sections)
   • Major sections and their spacing
   • Grid/column layout
   
   MESO LEVEL (Component details):
   • Card styling (shadows, borders, padding)
   • Button styles (solid, outline, text-only?)
   • Input field appearance
   • List item structure
   • Typography hierarchy (heading sizes, weights)
   
   MICRO LEVEL (Tiny details - MOST IMPORTANT):
   • Read ALL text including:
     - Meta information (dates like "Nov 16", "Due: Today")
     - Project names, section names
     - Button labels ("+ Add task", "Create", etc.)
     - Placeholder text in inputs
     - Badge text and colors
   • Count items (how many tasks/cards shown?)
   • Notice ALL icons (checkboxes, dots, arrows, etc.)
   • See divider lines (between list items? sections?)
   • Observe spacing (tight py-2 or loose py-4?)
   • Check text colors (primary black? secondary gray?)
   • Look for status indicators (colored dots, badges)
   • Notice hover effects if visible

2. YOUR GOAL: High Visual Accuracy
   • If screenshot shows "Due: Nov 16" - include it
   • If screenshot shows a badge - replicate color, shape, text
   • If screenshot shows an icon - import from lucide-react and place it
   • If screenshot shows subtle dividers - add border-b
   • If screenshot shows secondary text - use text-xs and gray color
   • If screenshot shows rounded corners - measure and match
   • If screenshot shows shadows - add appropriate shadow class

3. COMPLETE REPLICATION REQUIREMENTS:
   
   ✅ REQUIRED APPROACH:
   • Match EXACT text: "Due: Nov 16" not "Due date"
   • Match EXACT colors: bg-[rgb(255,88,74)] not bg-red-500
   • Match EXACT spacing: py-3 px-4 not just p-4
   • Match EXACT sizes: text-sm not text-base
   • Include ALL meta info visible in screenshot
   • Add ALL icons you see (import from lucide-react)
   • Include ALL dividers and borders
   • Add ALL hover states and transitions
   • Include ALL badges with exact colors
   • Show exact number of items from screenshot
   
   ❌ AVOID THESE ISSUES:
   • Simplifying layouts
   • Skipping small text elements
   • Using generic colors (gray-100, blue-500)
   • Hardcoding arrays instead of using state and .map()
   • Omitting secondary information
   • Missing micro-spacing details
   • Skipping transitions or animations
   • Using placeholder content instead of screenshot content

Output Requirements:
1. Return only the TypeScript React component code
2. No explanations before or after the code
3. No markdown headers like "### Implementation Notes" or "### Key Details"
4. No bullet point lists explaining the code
5. Code must end with "export default ComponentName;" with nothing after it
6. Additional text after the export statement will break the build

Correct format: Last line is "export default HomePage;"
Incorrect format: Adding explanations like "### Features:" after the code

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
