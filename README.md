# Frontend Replication Agent

AI-powered agent that automatically clones web applications by analyzing screenshots and generating pixel-perfect React applications with full CRUD functionality.

## 🎯 Features

- **Pixel-Perfect UI** - Exact color matching, spacing, typography
- **Full CRUD** - Add/Edit/Delete for Tasks and Projects
- **Task Details** - Individual task pages with routing
- **Self-Validation** - Auto-checks and regenerates until functional
- **Smart Sidebar** - Detects and replicates navigation
- **Visual Testing** - Automated screenshot comparison

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp env.template .env
# Add your OPENAI_API_KEY, TARGET_URL, credentials

# Crawl website and generate app
npm run crawl

# Run generated app
cd generated-app
npm install
npm run dev
```

Visit `http://localhost:3000`

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│            FRONTEND AGENT                   │
└─────────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
   ┌─────────┐ ┌─────────┐ ┌─────────┐
   │ CRAWLER │ │EXTRACTOR│ │GENERATOR│
   │         │ │         │ │         │
   │Playwright│ │ Pattern │ │  GPT-4  │
   │  + Auth │ │Detection│ │Vision + │
   │         │ │         │ │  Code   │
   └────┬────┘ └────┬────┘ └────┬────┘
        │           │           │
        └───────────┼───────────┘
                    ▼
        ┌───────────────────────┐
        │   OUTPUT DIRECTORY    │
        ├───────────────────────┤
        │ • HTML + Screenshots  │
        │ • CSS + Design Tokens │
        │ • Component Analysis  │
        └───────────┬───────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │    SMART GENERATOR    │
        ├───────────────────────┤
        │ 1. Generate Components│
        │ 2. Generate Pages     │
        │ 3. Validate CRUD      │
        │ 4. Regenerate (max 3) │
        └───────────┬───────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │   GENERATED APP       │
        │  React + TypeScript   │
        │  + Tailwind + Vite    │
        └───────────────────────┘
```

## 📂 Structure

```
agent/
├── crawler.js          # Playwright automation + auth
├── extractor.js        # Component detection
├── generator.js        # React generation + validation
├── llm.js             # GPT-4 integration
├── validate-pages.js  # CRUD validation
└── output/            # Crawled data

generated-app/
├── src/
│   ├── components/    # Sidebar, Header, Button, Modal
│   ├── pages/         # HomePage, TasksPage, ProjectsPage, TaskDetailPage
│   └── styles/
└── package.json
```

## 🧠 How It Works

### 1. Crawl Phase
```javascript
// crawler.js
- Authenticate to target site (Asana)
- Navigate to specified pages
- Detect sidebar and collapsible behavior
- Capture: DOM structure, computed CSS, screenshots
- Extract: Colors, fonts, spacing, layouts
```

### 2. Extract Phase
```javascript
// extractor.js
- Detect UI patterns (buttons, inputs, sidebars)
- Categorize design tokens (colors, typography)
- Identify component hierarchy
- Extract semantic groups (darkBg, lightBg, accent, etc.)
```

### 3. Generate Phase
```javascript
// generator.js
- Generate base components (Sidebar, Header, Button, Modal)
- Generate pages with CRUD functionality
- Add Edit functionality (inline editing)
- Create TaskDetailPage with routing
- Validate functionality (buttons, inputs, CRUD)
- Auto-regenerate (max 3 times) if validation fails
```

### 4. Validation Loop
```javascript
// validate-pages.js
Checks:
✓ Component imports (Sidebar, Header)
✓ Button onClick handlers
✓ Input onChange handlers
✓ Checkbox onChange handlers
✓ CRUD functions (add/edit/delete/toggle)
✓ useState hooks
✓ Task detail routing

If issues found → Pass feedback to LLM → Regenerate
```

## 🎨 Key Features

### Smart CRUD Generation
The agent automatically generates:
- **Add** - Forms with inputs, validation, state management
- **Edit** - Inline editing with save/cancel actions
- **Delete** - Buttons with confirmation dialogs
- **View** - Detail pages with routing

### Edit Task Implementation
```typescript
// Auto-generated in TasksPage
const [editingId, setEditingId] = useState<number | null>(null);
const [editTitle, setEditTitle] = useState('');

const startEdit = (id, title) => {
  setEditingId(id);
  setEditTitle(title);
};

const saveEdit = (id) => {
  setTasks(tasks.map(task => 
    task.id === id ? { ...task, title: editTitle } : task
  ));
  setEditingId(null);
};
```

### Task Detail Pages
```typescript
// Auto-generated routing in App.tsx
<Route path="/tasks/:id" element={<TaskDetailPage />} />

// TaskDetailPage includes:
- Full task details (title, description, priority, due date)
- Edit mode with form inputs
- Delete functionality
- Back navigation
```

### Project CRUD
```typescript
// Enhanced ProjectsPage
- Add new projects with forms
- Edit project details inline
- Delete projects with confirmation
- View all projects in list/board views
```

## 🧪 Testing

```bash
npm run test:visual      # Screenshot comparison
npm run test:css         # CSS assertions
npm run test:fidelity    # Fidelity score
```

Tests generate reports in `test-results/`:
- Visual diffs with pixel comparison
- CSS property validations
- Overall fidelity percentage

## ⚙️ Configuration

```env
# .env
OPENAI_API_KEY=sk-...              # Required
TARGET_URL=https://app.asana.com   # Target site
ASANA_EMAIL=your@email.com         # Auth credentials
ASANA_PASSWORD=your_password
LLM_MODEL=gpt-4o                   # GPT-4 with vision
PAGES_TO_CRAWL=/,/app/home,/app/projects,/app/tasks
```

## 🔧 Commands

| Command | Description |
|---------|-------------|
| `npm run crawl` | Crawl + Extract + Generate full app |
| `npm run generate` | Regenerate from existing data |
| `npm run validate` | Validate page functionality |
| `npm test` | Run all test suites |

## 💡 Why This Approach?

### Vision + Code Generation
- **GPT-4 Vision** analyzes screenshots for visual accuracy
- **GPT-4 Code** generates React with exact RGB colors
- **Validation Loop** ensures functionality works

### Smart Fallbacks
```javascript
// 3-level sidebar generation
1. Screenshot → GPT-4 Vision generates from image
2. Styled Fallback → Pre-styled Asana-like sidebar
3. Extracted → Use detected components
```

### Content Moderation Safe
Prompts carefully worded to avoid:
- Aggressive language ("MUST", "CRITICAL", "FAILED")
- Excessive emojis (🔴, 🚨, ⚠️)
- All-caps emphasis


## 📊 Results

Generated app includes:
- ✅ 3 pages (Home, Projects, Tasks) + Task Detail pages
- ✅ Full CRUD on all pages
- ✅ Edit functionality with inline editing
- ✅ Task detail routing (`/tasks/:id`)
- ✅ Project management (Add/Edit/Delete/View)
- ✅ Pixel-perfect color matching (RGB values)
- ✅ Responsive layouts with Tailwind
- ✅ Type-safe with TypeScript

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Crawling**: Playwright (headless browser automation)
- **AI**: OpenAI GPT-4o (vision + code generation)
- **Testing**: Playwright visual regression
- **Build**: Vite + PostCSS

## 📝 Assignment Coverage

✅ **Pixel-Perfect UI** - Exact color/spacing/typography matching  
✅ **Add/Edit/Delete Task** - Full CRUD with inline editing  
✅ **Task View Page** - Individual task detail pages with routing  
✅ **Add/Edit/Delete/View Project** - Complete project management  
✅ **Visual Testing** - Automated screenshot comparison  
✅ **CSS Assertions** - Design token validation  
✅ **Smart Sidebar** - Navigation with active states  
✅ **Validation Loop** - Auto-regeneration until functional  

## 🐛 Troubleshooting

**LLM refuses to generate ("I'm sorry...")**
- Content moderation triggered
- Solution: Prompts already softened, retry generation

**Validation fails after 3 attempts**
- Complex functionality may need manual review
- Check `agent/output/extraction-results.json` for issues

**Colors don't match**
- CSS parser extracts exact RGB values
- Check `agent/output/css/` for extracted colors

**Tasks not persisting**
- App uses local state (no backend)
- For persistence, add localStorage or backend API


Built by Navya Nayer

