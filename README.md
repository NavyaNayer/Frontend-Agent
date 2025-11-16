# 🎬 Clooney Agent

> **AI-Powered Frontend Replication System**

Automatically crawl any web application, extract components, and generate a pixel-perfect React + Tailwind CSS clone using GPT-4.

## 🎯 What It Does

Clooney Agent is not a simple web scraper. It's a sophisticated multi-step automated agent that:

1. **Crawls** target websites (with authentication support)
2. **Captures** DOM structure, computed CSS, and screenshots
3. **Extracts** UI components using intelligent pattern detection
4. **Generates** production-ready React components via GPT-4
5. **Creates** a complete React + Tailwind application
6. **Tests** visual accuracy with Playwright

## 🏗️ Project Structure

```
clooney-agent/
├── agent/
│   ├── run.js              # Main orchestrator
│   ├── crawler.js          # Web crawling engine
│   ├── extractor.js        # Component detection
│   ├── generator.js        # React app generation
│   ├── llm.js              # OpenAI integration
│   ├── output/             # Crawl data (auto-generated)
│   └── prompts/            # LLM prompt templates
│       ├── component_prompt.txt
│       ├── css_prompt.txt
│       └── page_prompt.txt
│
├── generated-app/          # Generated React app (auto-created)
│   ├── src/
│   │   ├── components/     # Generated components
│   │   ├── pages/          # Generated pages
│   │   └── styles/         # Global styles
│   └── package.json
│
├── tests/
│   └── visual.spec.ts      # Playwright visual tests
│
├── playwright.config.ts
├── package.json
├── env.template
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- OpenAI API key (GPT-4 access recommended)
- Target website credentials (if authentication required)

### Installation

```bash
# Clone the repository
git clone https://github.com/NavyaNayer/frontend-agent.git
cd frontend-agent

# Install dependencies
npm install

# Install Playwright browsers
npm run install:browsers

# Configure environment
cp env.template .env
# Edit .env with your API keys and credentials
```

### Configuration

Edit `.env` file:

```env
# Required
OPENAI_API_KEY=sk-...
TARGET_URL=https://app.asana.com

# Optional (for authenticated sites)
ASANA_EMAIL=your@email.com
ASANA_PASSWORD=your_password

# Advanced
LLM_MODEL=gpt-4-turbo-preview
MASK_SELECTORS=.user-name,.timestamp,.avatar
PAGES_TO_CRAWL=/,/app/home,/app/projects,/app/tasks
```

### Usage

**Step 1: Crawl & Generate**

```bash
npm run crawl
```

This command will:
- ✓ Authenticate to target site (if credentials provided)
- ✓ Crawl specified pages
- ✓ Extract components
- ✓ Generate React application
- ✓ Save all data to `agent/output/`

**Step 2: Run Generated App**

```bash
cd generated-app
npm install
npm run dev
```

Visit `http://localhost:3000` to see your clone!

**Step 3: Testing & Validation**

```bash
# Install test dependencies
npm install

# Run all tests
npm test

# Or run specific test suites:
npm run test:visual      # Visual comparison (screenshots)
npm run test:css         # CSS property assertions
npm run test:fidelity    # Overall fidelity scoring
```

Tests will generate detailed reports in `test-results/` including:
- Screenshot comparisons
- Pixel difference analysis
- CSS property validations
- Fidelity score (percentage match)

## 📋 Commands

| Command | Description |
|---------|-------------|
| `npm run crawl` | Run the full agent pipeline |
| `npm run generate` | Regenerate app from existing data |
| `npm test` | Run all test suites |
| `npm run test:visual` | Visual regression tests with screenshots |
| `npm run test:css` | CSS property assertions (color, spacing, typography) |
| `npm run test:fidelity` | Calculate fidelity score (percentage match) |
| `npm run install:browsers` | Install Playwright browsers |

## 🧠 How It Works

### Phase 1: Crawling
- Launches headless browser with Playwright
- Authenticates using provided credentials
- Navigates to specified pages
- Captures full HTML, computed styles, screenshots
- Masks dynamic content (usernames, timestamps, etc.)

### Phase 2: Component Extraction
- Analyzes DOM structure
- Detects common UI patterns:
  - Headers, Sidebars, Navigation
  - Cards, Lists, Buttons
  - Forms, Modals, Dialogs
- Extracts relevant CSS for each component
- Deduplicates similar components

### Phase 3: Generation
- Builds detailed prompts for GPT-4
- Generates React + TypeScript components
- Converts styles to Tailwind CSS
- Creates page compositions
- Generates complete project structure

### Phase 4: Testing & Validation
- **Visual Comparison**: Pixel-by-pixel screenshot diff with masking for dynamic content
- **CSS Assertions**: Validates exact color values, spacing, typography, shadows
- **Fidelity Scoring**: Quantifies accuracy (Visual 40%, CSS 30%, Structure 20%, Interactivity 10%)
- **Responsive Testing**: Tests multiple viewport sizes (mobile, tablet, desktop)
- **Accessibility Audits**: Checks ARIA labels, semantic HTML, keyboard navigation
- **Performance Metrics**: Measures page load times and render performance

## 🎨 Features

### Advanced Crawling
- ✅ Authentication support (login flows)
- ✅ Dynamic content masking
- ✅ Full-page screenshots
- ✅ Computed CSS extraction
- ✅ Configurable viewport sizes

### Intelligent Extraction
- ✅ Pattern-based component detection
- ✅ Hierarchical structure analysis
- ✅ Style inheritance tracking
- ✅ Component deduplication

### Smart Generation
- ✅ GPT-4 powered code generation
- ✅ Tailwind CSS conversion
- ✅ TypeScript type generation
- ✅ Responsive design implementation
- ✅ Accessibility features

### Comprehensive Testing
- ✅ **Visual Regression**: Pixel-diff comparison with original site
- ✅ **CSS Assertions**: Explicit property validation (colors, fonts, spacing)
- ✅ **Fidelity Scoring**: Percentage-based accuracy measurement
- ✅ **Multi-device Testing**: Mobile, tablet, desktop viewports
- ✅ **Accessibility Audits**: ARIA, semantic HTML, keyboard nav
- ✅ **Performance Benchmarks**: Load times, render metrics

## 📊 Output

After running the agent, you'll get:

**In `agent/output/`:**
- `extraction-results.json` - Component analysis
- `screenshots/` - Full page captures (viewport + full page)
- `html/` - Raw HTML files
- `css/` - Computed styles and parsed design tokens

**In `generated-app/`:**
- Complete React + Vite project
- TypeScript components
- Tailwind CSS styling
- Ready to run and customize

**In `test-results/` (after testing):**
- `fidelity-report.json` - Overall accuracy score
- `*-original.png` - Original site screenshots
- `*-clone.png` - Generated app screenshots
- `visual-diff.png` - Pixel difference visualization
- `results.json` - Detailed test results
- `playwright-report/` - HTML test report

## 🔧 Customization

### Prompt Templates

Customize LLM behavior by editing files in `agent/prompts/`:
- `component_prompt.txt` - Component generation
- `css_prompt.txt` - Style conversion
- `page_prompt.txt` - Page composition

### Component Detection

Modify `agent/extractor.js` to adjust:
- Pattern matching rules
- Component type detection
- CSS extraction logic

### Crawler Behavior

Edit `agent/crawler.js` to change:
- Authentication flow
- Wait times and timeouts
- Screenshot settings
- Content masking

## 🐛 Troubleshooting

**Authentication fails:**
- Verify credentials in `.env`
- Check if target site uses CAPTCHA
- Try increasing `CRAWL_TIMEOUT`

**Components not detected:**
- Check `agent/output/extraction-results.json`
- Adjust detection patterns in `extractor.js`
- Increase page wait times

**LLM generation errors:**
- Verify OpenAI API key
- Check API rate limits
- Try reducing `LLM_MAX_TOKENS`

**Visual tests fail:**
- Ensure clone app is running on port 3000
- Check `MASK_SELECTORS` configuration
- Review test screenshots in `test-results/`

## 📈 Performance

- Crawls 3-5 pages in ~2-3 minutes
- Generates 10-15 components in ~5-8 minutes
- Total pipeline: ~10-15 minutes for typical app

## 🎯 Fidelity Scoring

The agent quantifies replication accuracy through comprehensive testing:

**Scoring Breakdown:**
- **Visual Match (40%)**: Pixel-by-pixel screenshot comparison
- **CSS Accuracy (30%)**: Color, typography, spacing validation
- **Structure Match (20%)**: Layout, components, semantic HTML
- **Interactivity (10%)**: Buttons, links, forms, hover states

**Example Report:**
```
📊 Overall Fidelity: 87.3%

   Visual Match:        92.5%
   CSS Accuracy:        85.8%
   Structure Match:     75.0%
   Interactivity:       91.2%

📋 Details:
   Color Match:         88.4%
   Typography Match:    83.2%
   Spacing Match:       85.6%
   Layout Match:        75.0%
   Component Count:     142

✨ Very Good! High fidelity clone with minor differences.
```

**Quality Levels:**
- 90-100%: Excellent (Near pixel-perfect)
- 75-89%: Very Good (High fidelity)
- 60-74%: Good (Decent replication)
- 40-59%: Fair (Basic structure)
- <40%: Needs Improvement

View detailed results in `test-results/fidelity-report.json`

## ⚖️ Legal & Ethics

**Important:** This tool is for:
- ✅ Learning and education
- ✅ Prototyping and wireframing
- ✅ Internal tool replication
- ✅ Design system documentation

**Not for:**
- ❌ Copying production sites
- ❌ Copyright infringement
- ❌ Terms of service violations
- ❌ Bypassing paywalls

Always respect:
- robots.txt directives
- Terms of Service
- Copyright and IP rights
- Rate limits and API policies

## 🛠️ Tech Stack

- **Crawler:** Playwright
- **LLM:** OpenAI GPT-4
- **Generation:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Testing:** Playwright Test
- **Runtime:** Node.js (ES Modules)
---

**Built by Navya Nayer**

