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

  // Generate components
  console.log(chalk.blue(`   📦 Generating ${components.length} components...`));
  await generateComponents(components, crawlData);

  // Generate pages
  console.log(chalk.blue(`   📄 Generating ${crawlData.length} pages...`));
  await generatePages(crawlData, components);

  // Generate supporting files
  await generateSupportingFiles();

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

  // First, generate base components that are always needed
  await generateBaseComponents(componentsDir, crawlData);

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
 */
async function generateBaseComponents(componentsDir, crawlData) {
  const baseComponents = [
    {
      name: 'Sidebar',
      code: `import React from 'react';

const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold">Workspace</h2>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          <li>
            <a href="/" className="block px-4 py-2 rounded hover:bg-gray-800">
              Home
            </a>
          </li>
          <li>
            <a href="/projects" className="block px-4 py-2 rounded hover:bg-gray-800">
              Projects
            </a>
          </li>
          <li>
            <a href="/tasks" className="block px-4 py-2 rounded hover:bg-gray-800">
              Tasks
            </a>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;`
    },
    {
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
    }
  ];

  for (const component of baseComponents) {
    const filepath = path.join(componentsDir, `${component.name}.tsx`);
    // Only create if doesn't already exist
    const exists = await fs.pathExists(filepath);
    if (!exists) {
      await fs.writeFile(filepath, component.code, 'utf-8');
      console.log(chalk.gray(`      ✓ ${component.name}.tsx (base component)`));
    }
  }
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
 * Generate all page components
 */
async function generatePages(crawlData, components) {
  const pagesDir = path.join(GENERATED_APP_DIR, 'src', 'pages');

  for (const pageData of crawlData) {
    try {
      const prompt = await buildPagePrompt(pageData, components);
      const screenshotPath = pageData.screenshotPath?.viewport || pageData.screenshotPath?.full;
      const code = await generatePage(pageData, components, prompt, screenshotPath);

      // Create filename from page path and title
      const filename = getPageFilename(pageData.path, pageData.title);
      const filepath = path.join(pagesDir, filename);
      await fs.writeFile(filepath, code, 'utf-8');

      console.log(chalk.gray(`   ✓ ${filename}`));
    } catch (error) {
      console.error(chalk.red(`   ✗ ${pageData.path}: ${error.message}`));
    }
  }
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
async function generateSupportingFiles() {
  // Generate package.json
  await generatePackageJson();

  // Generate tsconfig.json
  await generateTsConfig();
  
  // Generate tsconfig.node.json
  await generateTsConfigNode();

  // Generate tailwind.config.js
  await generateTailwindConfig();

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
 * Generate tailwind.config.js
 */
async function generateTailwindConfig() {
  const config = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        asana: {
          orange: '#f06a6a',
          blue: '#14aaf5',
          purple: '#6568f7',
          green: '#7bc86c',
          pink: '#f283b6',
        }
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
    else if (name.includes('Tasks')) routePath = '/tasks';
    else if (name === 'HomePage') routePath = '/';
    
    return `        <Route path="${routePath}" element={<${name} />} />`;
  }).join('\n');
  
  const code = `import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
${imports}
import './styles/global.css';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
${routes}
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
