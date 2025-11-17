/**
 * Generator module - Creates React application structure and components
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { 
  generateComponent, 
  generatePage, 
  buildComponentPrompt, 
  buildPagePrompt 
} from './llm.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GENERATED_APP_DIR = path.join(__dirname, '..', 'generated-app');

/**
 * Generate complete React application
 */
export async function generateReactApp(components, crawlData) {
  // Setup app structure
  await setupAppStructure();

  // Extract design tokens from first page for global config
  const designTokens = crawlData[0]?.parsedCSS?.designTokens || null;

  // Generate components
  console.log(chalk.blue(`   📦 Generating ${components.length} components...`));
  await generateComponents(components, crawlData);

  // Generate pages
  console.log(chalk.blue(`   📄 Generating ${crawlData.length} pages...`));
  await generatePages(crawlData, components);

  // Generate supporting files with design tokens
  await generateSupportingFiles(designTokens);

  console.log(chalk.green('   ✓ Application structure complete'));
}

/**
 * Setup React application directory structure
 */
async function setupAppStructure() {
  const dirs = [
    path.join(GENERATED_APP_DIR, 'src'),
    path.join(GENERATED_APP_DIR, 'src', 'components'),
    path.join(GENERATED_APP_DIR, 'src', 'pages'),
    path.join(GENERATED_APP_DIR, 'src', 'styles'),
    path.join(GENERATED_APP_DIR, 'src', 'utils'),
    path.join(GENERATED_APP_DIR, 'public')
  ];

  for (const dir of dirs) {
    await fs.ensureDir(dir);
  }
}

/**
 * Generate all React components
 */
async function generateComponents(components, crawlData) {
  const componentsDir = path.join(GENERATED_APP_DIR, 'src', 'components');

  // First, generate base components (only if not extracted)
  await generateBaseComponents(componentsDir, crawlData, components);

  for (const component of components) {
    try {
      const prompt = await buildComponentPrompt(component);
      
      // Find the page this component came from to get its screenshot
      const pageWithComponent = crawlData.find(page => 
        page.url === component.pageUrl || page.path === component.pagePath
      );
      
      const screenshotPath = pageWithComponent?.screenshotPath?.viewport || 
                            pageWithComponent?.screenshotPath?.full;
      
      const code = await generateComponent(component, prompt, screenshotPath);

      // Save component file
      const filename = `${component.name}.tsx`;
      const filepath = path.join(componentsDir, filename);
      await fs.writeFile(filepath, code, 'utf-8');

      console.log(chalk.gray(`      ✓ ${filename}`));
    } catch (error) {
      console.error(chalk.red(`      ✗ ${component.name}: ${error.message}`));
    }
  }

  // Generate index file for easier imports
  await generateComponentIndex(components);
}

/**
 * Generate essential base components that should always exist
 * Only creates fallbacks if components weren't extracted
 */
async function generateBaseComponents(componentsDir, crawlData, extractedComponents = []) {
  // Check which base components are missing from extraction
  const hasSidebar = extractedComponents.some(c => c.type === 'sidebar');
  const hasButton = extractedComponents.some(c => c.type === 'button');
  
  const baseComponents = [];
  
  // Only add Sidebar fallback if not extracted
  if (!hasSidebar) {
    console.log(chalk.yellow('   ⚠ Sidebar not detected - generating from screenshot analysis...'));
    
    // Try to generate from first page screenshot
    if (crawlData && crawlData.length > 0) {
      const firstPage = crawlData[0];
      const screenshotPath = firstPage.screenshotPath?.viewport || firstPage.screenshotPath?.full;
      
      try {
        const sidebarPrompt = buildSidebarPrompt(firstPage, firstPage.sidebarInfo);
        const generatedCode = await generateComponent(
          { name: 'Sidebar', type: 'sidebar' },
          sidebarPrompt,
          screenshotPath
        );
        
        if (generatedCode && generatedCode.includes('export')) {
          baseComponents.push({ name: 'Sidebar', code: generatedCode });
          console.log(chalk.green('   ✓ Sidebar generated from screenshot'));
        } else {
          // Use fallback
          baseComponents.push(getFallbackSidebar());
        }
      } catch (error) {
        console.log(chalk.yellow(`   ⚠ Sidebar generation failed, using fallback: ${error.message}`));
        baseComponents.push(getFallbackSidebar());
      }
    } else {
      baseComponents.push(getFallbackSidebar());
    }
  }
  
  // Button fallback
  if (!hasButton) {
    baseComponents.push({
      name: 'Button',
      code: `import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  className?: string;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'primary',
  className = ''
}) => {
  const baseClasses = 'px-4 py-2 rounded font-medium transition-colors';
  const variantClasses = variant === 'primary' 
    ? 'bg-pink-500 text-white hover:bg-pink-600' 
    : 'bg-gray-200 text-gray-800 hover:bg-gray-300';
  
  return (
    <button 
      onClick={onClick}
      className={\`\${baseClasses} \${variantClasses} \${className}\`}
    >
      {children}
    </button>
  );
};

export default Button;`
    });
  }

  for (const component of baseComponents) {
    const filepath = path.join(componentsDir, `${component.name}.tsx`);
    // Only create if doesn't already exist
    const exists = await fs.pathExists(filepath);
    if (!exists) {
      await fs.writeFile(filepath, component.code, 'utf-8');
      console.log(chalk.gray(`      ✓ ${component.name}.tsx (fallback)`));
    }
  }
}

/**
 * Get fallback Sidebar component code
 */
function getFallbackSidebar() {
  return {
    name: 'Sidebar',
    code: `import React from 'react';
import { Home, Search, Plus, ChevronDown, Star, Users, Calendar } from 'lucide-react';

const Sidebar: React.FC = () => {
  return (
    <aside className="w-60 bg-[rgb(46,46,48)] text-[rgb(245,244,243)] flex flex-col h-screen">
      <div className="p-3 border-b border-[rgb(70,70,72)]">
        <button className="w-full flex items-center justify-between hover:bg-[rgb(60,60,62)] rounded px-2 py-1.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[rgb(255,88,74)] rounded flex items-center justify-center text-white text-xs font-semibold">
              W
            </div>
            <span className="text-sm font-medium">Workspace</span>
          </div>
          <ChevronDown size={16} />
        </button>
      </div>
      <div className="px-3 py-2">
        <button className="w-full flex items-center gap-2 px-3 py-1.5 bg-[rgb(60,60,62)] rounded text-sm">
          <Search size={14} />
          <span>Search</span>
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-1">
        <ul className="space-y-0.5">
          <li><a href="/" className="flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-[rgb(60,60,62)]"><Home size={16} /><span>Home</span></a></li>
          <li><a href="/tasks" className="flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-[rgb(60,60,62)]"><Calendar size={16} /><span>My tasks</span></a></li>
          <li><a href="#" className="flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-[rgb(60,60,62)]"><Users size={16} /><span>Inbox</span></a></li>
        </ul>
        <div className="mt-4">
          <div className="flex items-center justify-between px-2 py-1.5 text-xs text-[rgb(180,180,182)]">
            <div className="flex items-center gap-1.5"><Star size={12} /><span>Starred</span></div>
            <Plus size={12} />
          </div>
        </div>
      </nav>
      <div className="border-t border-[rgb(70,70,72)] p-2">
        <button className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[rgb(255,88,74)] hover:bg-[rgb(230,78,64)] text-white rounded text-sm font-medium">
          <Plus size={16} /><span>Create</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;`
  };
}

/**
 * Build prompt for Sidebar generation
 */
function buildSidebarPrompt(pageData, sidebarInfo = null) {
  const colors = pageData.parsedCSS?.colors?.slice(0, 20) || [];
  const isCollapsible = sidebarInfo?.isCollapsible || false;
  
  return `Create a Sidebar navigation component by analyzing the screenshot in extreme detail.

EXTRACTED COLORS: ${colors.join(', ')}

${isCollapsible ? '🔴 CRITICAL: This sidebar is COLLAPSIBLE - hamburger/menu icon detected!' : ''}
${isCollapsible ? '✅ MUST implement useState toggle for collapse/expand functionality' : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 CRITICAL ANALYSIS - EXAMINE SCREENSHOT CAREFULLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. COLLAPSIBLE BEHAVIOR:
   □ Is there a hamburger menu icon (☰)?
   □ Is there a collapse/expand button/icon?
   □ Is there a toggle arrow near the top?
   □ Does the sidebar look narrow/collapsed in the screenshot?
   
   If YES → Add useState for collapsed state + toggle button
   If NO → Fixed width sidebar

2. NAVIGATION ITEMS - READ EACH ONE:
   □ What are the EXACT labels? (Home, My Tasks, Inbox, etc.)
   □ What icons are shown? (home, list, inbox icons?)
   □ Which item appears selected/active? (different background?)
   □ What are the href targets? (/home, /tasks, /inbox, /projects)
   
   ⚠️ IMPORTANT: Link each nav item to its correct route!
   - Home → href="/"
   - My Tasks → href="/tasks"
   - Inbox → href="/inbox"
   - Projects → href="/projects"
   etc.

3. SECTIONS & GROUPINGS:
   □ Is there a workspace selector at top?
   □ Is there a search bar?
   □ Are nav items grouped in sections?
   □ Section headers visible? (Projects, Starred, Teams, etc.)
   □ Add buttons visible? (+ icons to add new items?)

4. VISUAL DETAILS:
   □ Exact width (200px? 240px? 260px?)
   □ Background color (use extracted colors - typically dark)
   □ Text color (light on dark background)
   □ Selected item styling (lighter background? border?)
   □ Hover effects (background changes?)
   □ Dividers between sections?
   □ Padding and spacing between items

5. DYNAMIC CONTENT:
   □ Project names shown? (extract from screenshot)
   □ Team names shown?
   □ User workspace name?
   □ Notification counts/badges?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 CRITICAL: SIDEBAR POSITIONING
   ❌ NEVER use position:fixed (causes overlap with main content)
   ❌ <aside className="fixed left-0 top-0 h-full w-60">
   
   ✅ ALWAYS use flex-shrink-0 (takes space in layout)
   ✅ <aside className="w-60 h-screen bg-[rgb(46,46,48)] flex-shrink-0">
   
   WHY: Sidebar must be part of flex layout, not positioned absolutely!
   Parent page uses: <div className="flex h-screen"> with sidebar as first child

1. COLLAPSIBLE FUNCTIONALITY (if applicable):
   \`\`\`tsx
   const [isCollapsed, setIsCollapsed] = useState(false);
   
   return (
     <aside className={\`\${isCollapsed ? 'w-16' : 'w-60'} transition-all duration-300 h-screen bg-[rgb(46,46,48)] flex-shrink-0\`}>
       <button onClick={() => setIsCollapsed(!isCollapsed)}>
         {isCollapsed ? <Menu size={20} /> : <X size={20} />}
       </button>
       {!isCollapsed && <span>Navigation Label</span>}
     </aside>
   );
   \`\`\`

2. PROPER NAVIGATION LINKS (MANDATORY - ALL LINKS MUST WORK):
   🔴 Use <a> tags with href, NOT buttons!
   🔴 Map navigation items to actual routes:
   
   \`\`\`tsx
   <nav className="space-y-1">
     <a href="/" className="flex items-center gap-2 px-3 py-2 hover:bg-[rgb(60,60,62)] rounded transition-colors">
       <Home size={18} />
       <span className="text-sm">Home</span>
     </a>
     <a href="/tasks" className="flex items-center gap-2 px-3 py-2 hover:bg-[rgb(60,60,62)] rounded transition-colors">
       <CheckSquare size={18} />
       <span className="text-sm">My Tasks</span>
     </a>
     <a href="/inbox" className="flex items-center gap-2 px-3 py-2 hover:bg-[rgb(60,60,62)] rounded transition-colors">
       <Inbox size={18} />
       <span className="text-sm">Inbox</span>
     </a>
     <a href="/projects" className="flex items-center gap-2 px-3 py-2 hover:bg-[rgb(60,60,62)] rounded transition-colors">
       <Folder size={18} />
       <span className="text-sm">Projects</span>
     </a>
   </nav>
   \`\`\`
   
   ROUTE MAPPING (extract from screenshot labels):
   • "Home" → href="/"
   • "My Tasks" / "Tasks" → href="/tasks"
   • "Inbox" → href="/inbox"
   • "Projects" / "My Projects" → href="/projects"
   • "Portfolio" → href="/portfolio"
   • "Goals" → href="/goals"
   • "Reporting" → href="/reporting"
   • "Messages" → href="/messages"

3. ACTIVE STATE DETECTION (MANDATORY):
   \`\`\`tsx
   const isActive = (path: string) => {
     if (typeof window !== 'undefined') {
       return window.location.pathname === path;
     }
     return false;
   };
   
   <a 
     href="/tasks" 
     className={\`flex items-center gap-2 px-3 py-2 rounded transition-colors \${
       isActive('/tasks') ? 'bg-[rgb(60,60,62)]' : 'hover:bg-[rgb(60,60,62)]'
     }\`}
   >
     <CheckSquare size={18} />
     <span className="text-sm">My Tasks</span>
   </a>
   \`\`\`

4. USE EXACT COLORS FROM EXTRACTED PALETTE:
   - Background: Use darkest color (typically rgb(46,46,48))
   - Text: Use lightest color (typically rgb(245,244,243))
   - Hover: Slightly lighter than background (rgb(60,60,62))
   - Selected: Even lighter or with accent border

5. IMPORT CORRECT ICONS FROM LUCIDE-REACT:
   Common icons: Home, CheckSquare, Inbox, BarChart2, Folder, Users, Star, Plus, Search, Menu, X, ChevronDown

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ CRITICAL: Study the screenshot and replicate EVERY detail:
- Exact navigation labels
- Correct route hrefs
- Proper icon choices
- Collapsible behavior if present
- Active state styling
- All sections and groupings

Return only the complete TypeScript React component code with useState if collapsible.`;
}



/**
 * Generate component index file
 */
async function generateComponentIndex(components) {
  const componentsDir = path.join(GENERATED_APP_DIR, 'src', 'components');
  
  // Get all .tsx files in components directory
  const files = await fs.readdir(componentsDir);
  const componentFiles = files.filter(f => f.endsWith('.tsx'));
  
  // Generate exports for all component files found
  const exports = componentFiles.map(file => {
    const name = path.basename(file, '.tsx');
    return `export { default as ${name} } from './${name}';`;
  }).join('\n');

  const indexPath = path.join(componentsDir, 'index.ts');
  await fs.writeFile(indexPath, exports, 'utf-8');
}

/**
 * Validate generated page for functionality
 */
function validatePageFunctionality(code, filename) {
  const issues = [];
  
  // Check for buttons without onClick
  const hasButtons = code.includes('<button');
  if (hasButtons && !code.includes('onClick')) {
    issues.push('Buttons missing onClick handlers');
  }
  
  // Check for checkboxes without onChange
  const hasCheckboxes = code.includes('type="checkbox"');
  if (hasCheckboxes && !code.includes('onChange')) {
    issues.push('Checkboxes missing onChange handlers');
  }
  
  // Check for text inputs without onChange
  const hasTextInputs = code.includes('type="text"');
  if (hasTextInputs && !code.includes('onChange')) {
    issues.push('Text inputs missing onChange handlers');
  }
  
  // Check for CRUD operations
  const hasCRUDButtons = code.match(/Add|Create|Delete|Remove|Edit/i);
  if (hasCRUDButtons) {
    const hasAddFunction = code.includes('addTask') || code.includes('addItem') || code.includes('addProject');
    const hasDeleteFunction = code.includes('deleteTask') || code.includes('deleteItem') || code.includes('deleteProject');
    const hasToggleFunction = code.includes('toggleTask') || code.includes('toggleItem');
    const hasEditFunction = code.includes('editTask') || code.includes('editItem') || code.includes('editProject') || 
                           code.includes('startEdit') || code.includes('saveEdit') || code.includes('setEditingId');
    
    if (!hasAddFunction && code.match(/Add|Create/i)) {
      issues.push('Add/Create button without add function');
    }
    if (!hasDeleteFunction && code.match(/Delete|Remove/i)) {
      issues.push('Delete/Remove button without delete function');
    }
    if (!hasEditFunction && code.match(/Edit/i)) {
      issues.push('Edit button without edit functionality (missing editTask/startEdit/saveEdit)');
    }
    if (hasCheckboxes && !hasToggleFunction) {
      issues.push('Checkboxes without toggle function');
    }
  }
  
  // Check for useState
  if ((hasButtons || hasCheckboxes || hasTextInputs) && !code.includes('useState')) {
    issues.push('Interactive elements without useState');
  }
  
  // Check for task list pages - should have navigation to detail pages
  if (filename.includes('Task') && code.includes('tasks.map') && !code.includes('useNavigate')) {
    issues.push('Task list page missing navigation to task detail pages (needs useNavigate)');
  }
  
  // Check for project pages - should have full CRUD
  if (filename.includes('Project') && code.includes('project')) {
    const hasProjectAdd = code.includes('addProject');
    const hasProjectEdit = code.includes('editProject');
    const hasProjectDelete = code.includes('deleteProject');
    
    if (!hasProjectAdd) {
      issues.push('Project page missing Add Project functionality');
    }
    if (!hasProjectEdit) {
      issues.push('Project page missing Edit Project functionality');
    }
    if (!hasProjectDelete) {
      issues.push('Project page missing Delete Project functionality');
    }
  }
  
  return issues;
}

/**
 * Generate all page components with validation loop
 */
async function generatePages(crawlData, components) {
  const pagesDir = path.join(GENERATED_APP_DIR, 'src', 'pages');
  const MAX_RETRIES = 3;
  let hasTasksPage = false;

  for (const pageData of crawlData) {
    const filename = getPageFilename(pageData.path, pageData.title);
    const filepath = path.join(pagesDir, filename);
    
    if (filename === 'TasksPage.tsx') {
      hasTasksPage = true;
    }
    
    let retries = 0;
    let success = false;
    let previousIssues = null;

    while (retries < MAX_RETRIES && !success) {
      try {
        // Pass previous validation issues to the prompt for fixing
        const prompt = await buildPagePrompt(pageData, components, previousIssues);
        const screenshotPath = pageData.screenshotPath?.viewport || pageData.screenshotPath?.full;
        const code = await generatePage(pageData, components, prompt, screenshotPath);

        // Validate the generated code
        const issues = validatePageFunctionality(code, filename);
        
        if (issues.length === 0) {
          // Save the valid code
          await fs.writeFile(filepath, code, 'utf-8');
          console.log(chalk.green(`   ✓ ${filename} (validated)`));
          success = true;
        } else {
          retries++;
          previousIssues = issues; // Store issues to pass to next attempt
          
          if (retries < MAX_RETRIES) {
            console.log(chalk.yellow(`   ⚠ ${filename} validation failed (attempt ${retries}/${MAX_RETRIES}): ${issues.join(', ')}`));
            console.log(chalk.gray(`      Regenerating with validation feedback...`));
          } else {
            // Save anyway after max retries
            await fs.writeFile(filepath, code, 'utf-8');
            console.log(chalk.red(`   ✗ ${filename} saved with issues: ${issues.join(', ')}`));
            success = true;
          }
        }
      } catch (error) {
        console.error(chalk.red(`   ✗ ${filename}: ${error.message}`));
        retries++;
        if (retries >= MAX_RETRIES) {
          success = true; // Exit loop
        }
      }
    }
  }
  
  // Generate TaskDetailPage if tasks page was created
  if (hasTasksPage) {
    console.log(chalk.blue('   📄 Generating TaskDetailPage...'));
    await generateTaskDetailPage(pagesDir, components);
  }
}

/**
 * Generate TaskDetailPage for individual task viewing/editing
 */
async function generateTaskDetailPage(pagesDir, components) {
  const code = `import React, { useState } from 'react';
import { Header, Sidebar } from '../components';
import { useParams, useNavigate } from 'react-router-dom';

const TaskDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [task, setTask] = useState({
    id: parseInt(id || '1'),
    title: 'Sample Task',
    completed: false,
    section: 'Recently assigned',
    dueDate: 'Today',
    project: 'Project Name',
    description: 'Task description with full details about what needs to be accomplished.',
    assignee: 'You',
    priority: 'Medium',
    tags: ['frontend', 'ui']
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [editedDescription, setEditedDescription] = useState(task.description);
  const [editedDueDate, setEditedDueDate] = useState(task.dueDate);
  const [editedPriority, setEditedPriority] = useState(task.priority);

  const handleSave = () => {
    setTask({
      ...task,
      title: editedTitle,
      description: editedDescription,
      dueDate: editedDueDate,
      priority: editedPriority
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      navigate('/tasks');
    }
  };

  const toggleComplete = () => {
    setTask({ ...task, completed: !task.completed });
  };

  return (
    <div className="flex h-screen bg-[rgb(249,248,248)]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-8">
          <div className="max-w-4xl mx-auto">
            <button 
              onClick={() => navigate('/tasks')} 
              className="text-[rgb(63,106,196)] text-sm hover:underline mb-4 cursor-pointer"
            >
              ← Back to My tasks
            </button>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-6">
                <input 
                  type="checkbox" 
                  checked={task.completed} 
                  onChange={toggleComplete}
                  className="w-5 h-5 cursor-pointer" 
                />
                {isEditing ? (
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="flex-1 text-2xl font-semibold text-[rgb(30,31,33)] border border-[rgb(63,106,196)] rounded px-2 py-1 focus:outline-none"
                  />
                ) : (
                  <h1 className={\`text-2xl font-semibold \${task.completed ? 'line-through text-[rgb(109,110,111)]' : 'text-[rgb(30,31,33)]'}\`}>
                    {task.title}
                  </h1>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="text-[rgb(109,110,111)] text-sm mb-1 block">Assignee</label>
                  <div className="text-[rgb(30,31,33)] text-sm">{task.assignee}</div>
                </div>
                <div>
                  <label className="text-[rgb(109,110,111)] text-sm mb-1 block">Due Date</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedDueDate}
                      onChange={(e) => setEditedDueDate(e.target.value)}
                      className="w-full text-[rgb(30,31,33)] text-sm border border-[rgb(230,230,232)] rounded px-2 py-1 focus:outline-none focus:border-[rgb(63,106,196)]"
                    />
                  ) : (
                    <div className="text-[rgb(30,31,33)] text-sm">{task.dueDate}</div>
                  )}
                </div>
                <div>
                  <label className="text-[rgb(109,110,111)] text-sm mb-1 block">Project</label>
                  <div className="text-[rgb(30,31,33)] text-sm">{task.project}</div>
                </div>
                <div>
                  <label className="text-[rgb(109,110,111)] text-sm mb-1 block">Priority</label>
                  {isEditing ? (
                    <select
                      value={editedPriority}
                      onChange={(e) => setEditedPriority(e.target.value)}
                      className="w-full text-[rgb(30,31,33)] text-sm border border-[rgb(230,230,232)] rounded px-2 py-1 focus:outline-none focus:border-[rgb(63,106,196)]"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  ) : (
                    <div className={\`text-sm inline-block px-2 py-1 rounded \${
                      task.priority === 'High' ? 'bg-[rgb(255,235,230)] text-[rgb(233,58,70)]' :
                      task.priority === 'Medium' ? 'bg-[rgb(255,249,219)] text-[rgb(241,189,108)]' :
                      'bg-[rgb(228,245,237)] text-[rgb(70,183,123)]'
                    }\`}>
                      {task.priority}
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <label className="text-[rgb(109,110,111)] text-sm mb-2 block">Description</label>
                {isEditing ? (
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    rows={4}
                    className="w-full text-[rgb(30,31,33)] text-sm border border-[rgb(230,230,232)] rounded px-3 py-2 focus:outline-none focus:border-[rgb(63,106,196)]"
                  />
                ) : (
                  <div className="text-[rgb(30,31,33)] text-sm whitespace-pre-wrap">{task.description}</div>
                )}
              </div>

              <div className="mb-6">
                <label className="text-[rgb(109,110,111)] text-sm mb-2 block">Tags</label>
                <div className="flex gap-2">
                  {task.tags.map((tag, index) => (
                    <span key={index} className="bg-[rgb(230,230,232)] text-[rgb(30,31,33)] text-xs px-3 py-1 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-[rgb(230,230,232)]">
                {isEditing ? (
                  <>
                    <button 
                      onClick={handleSave}
                      className="bg-[rgb(63,106,196)] text-white px-4 py-2 rounded text-sm hover:bg-[rgb(50,85,160)] cursor-pointer"
                    >
                      Save Changes
                    </button>
                    <button 
                      onClick={() => {
                        setIsEditing(false);
                        setEditedTitle(task.title);
                        setEditedDescription(task.description);
                        setEditedDueDate(task.dueDate);
                        setEditedPriority(task.priority);
                      }}
                      className="text-[rgb(109,110,111)] px-4 py-2 text-sm hover:text-[rgb(30,31,33)] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="bg-[rgb(63,106,196)] text-white px-4 py-2 rounded text-sm hover:bg-[rgb(50,85,160)] cursor-pointer"
                    >
                      Edit Task
                    </button>
                    <button 
                      onClick={handleDelete}
                      className="bg-[rgb(233,58,70)] text-white px-4 py-2 rounded text-sm hover:bg-[rgb(200,50,60)] cursor-pointer"
                    >
                      Delete Task
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default TaskDetailPage;`;

  const filepath = path.join(pagesDir, 'TaskDetailPage.tsx');
  await fs.writeFile(filepath, code, 'utf-8');
  console.log(chalk.green('   ✓ TaskDetailPage.tsx (auto-generated)'));
}

/**
 * Convert page path to filename
 */
function getPageFilename(pagePath, pageTitle) {
  if (!pagePath) return 'HomePage.tsx';
  
  // Extract meaningful page identifiers
  if (pagePath.includes('/home')) return 'HomePage.tsx';
  
  // Use title to differentiate between different project pages
  if (pagePath.includes('/project')) {
    // Check if it's "My tasks" based on title
    if (pageTitle && pageTitle.toLowerCase().includes('my tasks')) {
      return 'TasksPage.tsx';
    }
    // Otherwise it's a regular project page
    return 'ProjectsPage.tsx';
  }
  
  if (pagePath.includes('/tasks') || pagePath.includes('/my_tasks')) return 'TasksPage.tsx';
  
  // Fallback: use last meaningful segment
  const segments = pagePath.split('/').filter(seg => 
    seg && !seg.match(/^\d+$/) // Ignore numeric IDs
  );
  
  if (segments.length === 0) return 'HomePage.tsx';
  
  const lastSegment = segments[segments.length - 1];
  const name = lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).toLowerCase();
  
  return `${name}Page.tsx`;
}

/**
 * Generate supporting files (package.json, config files, etc.)
 */
async function generateSupportingFiles(designTokens = null) {
  // Generate package.json
  await generatePackageJson();

  // Generate tsconfig.json
  await generateTsConfig();
  
  // Generate tsconfig.node.json
  await generateTsConfigNode();

  // Generate tailwind.config.js with extracted colors
  await generateTailwindConfig(designTokens);

  // Generate postcss.config.js
  await generatePostCSSConfig();

  // Generate index.html
  await generateIndexHtml();

  // Generate App.tsx
  await generateAppTsx();

  // Generate main.tsx
  await generateMainTsx();

  // Generate global styles
  await generateGlobalStyles();

  // Generate README
  await generateAppReadme();

  // Generate vite.config.ts
  await generateViteConfig();
}

/**
 * Generate package.json for the React app
 */
async function generatePackageJson() {
  const packageJson = {
    name: "asana-clone",
    version: "1.0.0",
    type: "module",
    scripts: {
      dev: "vite",
      build: "tsc && vite build",
      preview: "vite preview",
      lint: "eslint src --ext ts,tsx"
    },
    dependencies: {
      react: "^18.2.0",
      "react-dom": "^18.2.0",
      "react-router-dom": "^6.20.0",
      "lucide-react": "^0.294.0"
    },
    devDependencies: {
      "@types/react": "^18.2.43",
      "@types/react-dom": "^18.2.17",
      "@vitejs/plugin-react": "^4.2.1",
      autoprefixer: "^10.4.16",
      postcss: "^8.4.32",
      tailwindcss: "^3.3.6",
      typescript: "^5.3.3",
      vite: "^5.0.8"
    }
  };

  const filepath = path.join(GENERATED_APP_DIR, 'package.json');
  await fs.writeJson(filepath, packageJson, { spaces: 2 });
}

/**
 * Generate tsconfig.json
 */
async function generateTsConfig() {
  const tsConfig = {
    compilerOptions: {
      target: "ES2020",
      useDefineForClassFields: true,
      lib: ["ES2020", "DOM", "DOM.Iterable"],
      module: "ESNext",
      skipLibCheck: true,
      moduleResolution: "bundler",
      allowImportingTsExtensions: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: "react-jsx",
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noFallthroughCasesInSwitch: true
    },
    include: ["src"],
    references: [{ path: "./tsconfig.node.json" }]
  };

  const filepath = path.join(GENERATED_APP_DIR, 'tsconfig.json');
  await fs.writeJson(filepath, tsConfig, { spaces: 2 });
}

/**
 * Generate tsconfig.node.json
 */
async function generateTsConfigNode() {
  const tsConfigNode = {
    compilerOptions: {
      composite: true,
      skipLibCheck: true,
      module: "ESNext",
      moduleResolution: "bundler",
      allowSyntheticDefaultImports: true
    },
    include: ["vite.config.ts"]
  };

  const filepath = path.join(GENERATED_APP_DIR, 'tsconfig.node.json');
  await fs.writeJson(filepath, tsConfigNode, { spaces: 2 });
}

/**
 * Generate tailwind.config.js with extracted design tokens
 */
async function generateTailwindConfig(designTokens = null) {
  let colorConfig = `        asana: {
          orange: '#f06a6a',
          blue: '#14aaf5',
          purple: '#6568f7',
          green: '#7bc86c',
          pink: '#f283b6',
        }`;

  // Use extracted design tokens if available
  if (designTokens) {
    const colors = [];
    
    // Add background colors
    if (designTokens.backgrounds) {
      if (designTokens.backgrounds.dark) colors.push(`          'bg-dark': '${designTokens.backgrounds.dark}'`);
      if (designTokens.backgrounds['dark-alt']) colors.push(`          'bg-dark-alt': '${designTokens.backgrounds['dark-alt']}'`);
      if (designTokens.backgrounds.light) colors.push(`          'bg-light': '${designTokens.backgrounds.light}'`);
      if (designTokens.backgrounds['light-alt']) colors.push(`          'bg-light-alt': '${designTokens.backgrounds['light-alt']}'`);
    }
    
    // Add text colors
    if (designTokens.text) {
      if (designTokens.text.primary) colors.push(`          'text-primary': '${designTokens.text.primary}'`);
      if (designTokens.text.secondary) colors.push(`          'text-secondary': '${designTokens.text.secondary}'`);
      if (designTokens.text.light) colors.push(`          'text-light': '${designTokens.text.light}'`);
    }
    
    // Add accent colors
    if (designTokens.accents) {
      if (designTokens.accents.primary) colors.push(`          'accent-primary': '${designTokens.accents.primary}'`);
      if (designTokens.accents.secondary) colors.push(`          'accent-secondary': '${designTokens.accents.secondary}'`);
      if (designTokens.accents.tertiary) colors.push(`          'accent-tertiary': '${designTokens.accents.tertiary}'`);
      if (designTokens.accents.warning) colors.push(`          'accent-warning': '${designTokens.accents.warning}'`);
    }
    
    // Add border colors
    if (designTokens.borders && designTokens.borders.default) {
      colors.push(`          'border-default': '${designTokens.borders.default}'`);
    }
    
    if (colors.length > 0) {
      colorConfig = `        app: {
${colors.join(',\n')}
        }`;
    }
  }

  const config = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
${colorConfig}
      }
    },
  },
  plugins: [],
}`;

  const filepath = path.join(GENERATED_APP_DIR, 'tailwind.config.js');
  await fs.writeFile(filepath, config, 'utf-8');
}

/**
 * Generate postcss.config.js
 */
async function generatePostCSSConfig() {
  const config = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;

  const filepath = path.join(GENERATED_APP_DIR, 'postcss.config.js');
  await fs.writeFile(filepath, config, 'utf-8');
}

/**
 * Generate index.html
 */
async function generateIndexHtml() {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Asana Clone</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;

  const filepath = path.join(GENERATED_APP_DIR, 'index.html');
  await fs.writeFile(filepath, html, 'utf-8');
}

/**
 * Generate App.tsx with routes for all pages
 */
async function generateAppTsx() {
  const pagesDir = path.join(GENERATED_APP_DIR, 'src', 'pages');
  
  // Find all page files
  const pageFiles = await fs.readdir(pagesDir);
  const pages = pageFiles.filter(f => f.endsWith('.tsx'));
  
  // Generate imports
  const imports = pages.map(file => {
    const name = path.basename(file, '.tsx');
    return `import ${name} from './pages/${name}';`;
  }).join('\n');
  
  // Generate routes
  const routes = pages.map(file => {
    const name = path.basename(file, '.tsx');
    let routePath = '/';
    
    if (name.includes('Projects')) routePath = '/projects';
    else if (name.includes('Tasks') && !name.includes('Detail')) routePath = '/tasks';
    else if (name === 'HomePage') routePath = '/';
    
    return `        <Route path="${routePath}" element={<${name} />} />`;
  }).join('\n');
  
  // Add task detail route if TaskDetailPage exists
  const hasTaskDetailPage = pages.some(f => f.includes('TaskDetail'));
  const taskDetailRoute = hasTaskDetailPage 
    ? `        <Route path="/tasks/:id" element={<TaskDetailPage />} />`
    : '';
  
  const code = `import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
${imports}
import './styles/global.css';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
${routes}
${taskDetailRoute}
      </Routes>
    </Router>
  );
};

export default App;`;

  const filepath = path.join(GENERATED_APP_DIR, 'src', 'App.tsx');
  await fs.writeFile(filepath, code, 'utf-8');
}

/**
 * Generate main.tsx
 */
async function generateMainTsx() {
  const code = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);`;

  const filepath = path.join(GENERATED_APP_DIR, 'src', 'main.tsx');
  await fs.writeFile(filepath, code, 'utf-8');
}

/**
 * Generate global CSS
 */
async function generateGlobalStyles() {
  const css = `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply antialiased;
  }
}

@layer components {
  .btn-primary {
    @apply bg-asana-orange text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors;
  }
  
  .btn-secondary {
    @apply bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors;
  }
}`;

  const filepath = path.join(GENERATED_APP_DIR, 'src', 'styles', 'global.css');
  await fs.writeFile(filepath, css, 'utf-8');
}

/**
 * Generate vite.config.ts
 */
async function generateViteConfig() {
  const config = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
});`;

  const filepath = path.join(GENERATED_APP_DIR, 'vite.config.ts');
  await fs.writeFile(filepath, config, 'utf-8');
}

/**
 * Generate README for the generated app
 */
async function generateAppReadme() {
  const readme = `# Asana Clone

This application was automatically generated by Clooney Agent.

## Getting Started

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Run development server:
\`\`\`bash
npm run dev
\`\`\`

3. Build for production:
\`\`\`bash
npm run build
\`\`\`

## Structure

- \`src/components/\` - Reusable UI components
- \`src/pages/\` - Page-level components
- \`src/styles/\` - Global styles and Tailwind CSS

## Technologies

- React 18
- TypeScript
- Tailwind CSS
- Vite
`;

  const filepath = path.join(GENERATED_APP_DIR, 'README.md');
  await fs.writeFile(filepath, readme, 'utf-8');
}
