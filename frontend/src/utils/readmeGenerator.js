/**
 * Universal README & Project Guide Generator
 * Converts FlowSight AST Graph Data into a comprehensive, plain English README Markdown
 * readable and understandable by anyone (non-tech stakeholders, developers, students).
 */

export function generateProjectReadme(graphData) {
  if (!graphData) return '# No Repository Data Available\nPlease analyze a repository first.';

  const repoName = graphData.repositoryName || 'FlowSight Analyzed Project';
  const summary = graphData.summary || {};
  const nodes = graphData.nodes || [];
  const applicationFlow = graphData.applicationFlow?.nodes || [];

  // 1. Language breakdown
  const languages = summary.languages || {};
  const totalLangFiles = Object.values(languages).reduce((a, b) => a + b, 0) || 1;
  const langList = Object.entries(languages)
    .sort((a, b) => b[1] - a[1])
    .map(([lang, count]) => {
      const pct = Math.round((count / totalLangFiles) * 100);
      return `- **${lang.toUpperCase()}**: ${count} file${count > 1 ? 's' : ''} (${pct}%)`;
    })
    .join('\n') || '- Generic / Multi-language';

  // 2. Primary Tech Stack heuristics
  const hasReact = nodes.some(n => n.type === 'PAGE' || n.name?.endsWith('.jsx') || n.name?.endsWith('.tsx'));
  const hasExpress = nodes.some(n => n.type === 'API' || n.type === 'route' || (n.file && n.file.includes('route')));
  const hasPython = Object.keys(languages).includes('python');
  const hasDatabase = summary.hasDatabase || nodes.some(n => n.type === 'DATABASE' || n.type === 'db_operation');

  let primaryStack = [];
  if (hasReact) primaryStack.push('React / Frontend UI');
  if (hasExpress) primaryStack.push('Node.js / Express Backend');
  if (hasPython) primaryStack.push('Python Backend / Scripting');
  if (hasDatabase) primaryStack.push('Database Persistence (SQL / NoSQL)');
  if (primaryStack.length === 0) primaryStack.push('Multi-Module Software Application');

  // 3. Extract Modules & File hierarchy
  const moduleNodes = nodes.filter(n => n.type === 'module');
  const fileNodes = nodes.filter(n => n.type === 'file');
  const routeNodes = nodes.filter(n => n.type === 'API' || n.type === 'route');
  const dbNodes = nodes.filter(n => n.type === 'DATABASE' || n.type === 'db_operation');
  const funcNodes = nodes.filter(n => n.type === 'function');

  // Directory breakdown
  const dirBreakdown = moduleNodes.length > 0
    ? moduleNodes.map(m => {
        const modFiles = m.files || fileNodes.filter(f => f.file?.startsWith(m.name) || f.parentId === m.id);
        const fileCount = modFiles.length;
        let purpose = 'Contains core application logic and supporting files.';
        const nameLower = m.name.toLowerCase();
        if (nameLower.includes('controller')) purpose = 'Handles incoming API requests and connects user inputs to business services.';
        else if (nameLower.includes('route')) purpose = 'Defines URL paths and HTTP endpoints that clients connect to.';
        else if (nameLower.includes('service')) purpose = 'Executes core business rules, algorithms, and third-party integrations.';
        else if (nameLower.includes('model')) purpose = 'Defines data schemas, tables, collections, and database structures.';
        else if (nameLower.includes('config')) purpose = 'Houses environment variables, database connections, and system settings.';
        else if (nameLower.includes('component') || nameLower.includes('view') || nameLower.includes('page')) purpose = 'User interface screens and interactive visual components.';
        else if (nameLower.includes('util') || nameLower.includes('helper')) purpose = 'Reusable utility functions, formatters, and helper tools.';
        else if (nameLower.includes('analyz')) purpose = 'AST parsing and source code inspection pipelines.';

        return `### 📁 \`${m.name}/\` (${fileCount} files)
**What it does:** ${purpose}
**Key files:**
${modFiles.slice(0, 6).map(f => typeof f === 'string' ? `- \`${f}\`` : `- \`${f.name || f.file}\``).join('\n') || '- None listed'}`;
      }).join('\n\n')
    : fileNodes.slice(0, 10).map(f => `- \`${f.name || f.file}\`: Source file`).join('\n');

  // 4. Step-by-Step Plain English Data Flow Journey
  const flowSteps = applicationFlow.length > 0
    ? applicationFlow.map((step, idx) => {
        const typeLabel = (step.type || 'STEP').toUpperCase();
        const desc = step.description || step.tooltip || 'Executes this stage of the data lifecycle.';
        const plainExp = step.plainExplanation || desc;
        const fileLoc = step.file ? ` (*defined in \`${step.file}\`*)` : '';
        return `${idx + 1}. **${step.semanticName || step.name}** [${typeLabel}]${fileLoc}
   - **What happens:** ${plainExp}`;
      }).join('\n\n')
    : `1. **User Request / Input**: The user sends data or triggers an action via UI or HTTP.
2. **Routing & Middleware**: Request is validated, authenticated, and routed to the proper handler.
3. **Business Logic Execution**: Core logic processes the input and coordinates data changes.
4. **Data Persistence**: Reads or writes state to the database or storage layer.
5. **Response Delivery**: Formatted JSON or UI view is returned to the user.`;

  // 5. API Endpoints Table
  let apiSection = '*No public HTTP endpoints detected or this is a standalone library / CLI tool.*';
  if (routeNodes.length > 0) {
    const tableRows = routeNodes.slice(0, 20).map(r => {
      const method = r.httpMethod || r.metadata?.httpMethod || (r.name?.includes('GET') ? 'GET' : r.name?.includes('POST') ? 'POST' : 'GET/POST');
      const pathStr = r.routePath || r.name || '/api';
      const handler = r.handlerName || r.file || 'Controller handler';
      let desc = 'Receives and handles client requests.';
      if (pathStr.includes('login') || pathStr.includes('auth')) desc = 'Authenticates user credentials and returns session/token.';
      else if (pathStr.includes('analyz')) desc = 'Triggers code analysis on submitted repository URL or local path.';
      else if (pathStr.includes('user')) desc = 'Retrieves or manages user account data.';
      else if (pathStr.includes('chat') || pathStr.includes('explain')) desc = 'AI-powered question answering & code explanation.';
      return `| \`${method}\` | \`${pathStr}\` | \`${handler}\` | ${desc} |`;
    }).join('\n');

    apiSection = `| HTTP Method | Endpoint Path | Handler / File | Purpose (Plain English) |
|---|---|---|---|
${tableRows}`;
  }

  // 6. Database Operations & Entities
  const dbSection = dbNodes.length > 0
    ? dbNodes.slice(0, 10).map(d => {
        const op = d.operation || d.name || 'Query';
        const col = d.collection || d.model || 'Database';
        const file = d.file ? ` in \`${d.file}\`` : '';
        return `- **${col}** (\`${op}\`)${file}: Performs data storage, lookup, or update.`;
      }).join('\n')
    : `*No external database operations detected. Data may be stored in-memory, via local file system, or stateless.*`;

  // 7. How to Run / Getting Started Guide
  const isNode = Object.keys(languages).some(l => ['javascript', 'typescript', 'jsx', 'tsx'].includes(l));
  const isPy = hasPython;

  let installSteps = `\`\`\`bash
# 1. Clone the repository
git clone https://github.com/${repoName}.git
cd ${repoName}

# 2. Install dependencies
npm install
\`\`\``;
  let runSteps = `\`\`\`bash
# Start the development server
npm run dev
# OR start production
npm start
\`\`\``;

  if (isNode && isPy) {
    installSteps = `\`\`\`bash
# 1. Clone the repository
git clone https://github.com/${repoName}.git
cd ${repoName}

# 2. Install Node.js dependencies
npm install

# 3. Install Python dependencies (if applicable)
pip install -r requirements.txt
\`\`\``;
    runSteps = `\`\`\`bash
# Run the application
npm run dev
# OR for python backend
python app.py
\`\`\``;
  } else if (isPy) {
    installSteps = `\`\`\`bash
# 1. Clone the repository
git clone https://github.com/${repoName}.git
cd ${repoName}

# 2. Create virtual environment & install packages
python -m venv venv
source venv/bin/activate # On Windows: venv\\Scripts\\activate
pip install -r requirements.txt
\`\`\``;
    runSteps = `\`\`\`bash
# Start the application
python main.py # or python app.py
\`\`\``;
  }


  // Build the complete Markdown
  return `# 📘 ${repoName} — Complete Project Guide & README

> **Generated automatically by FlowSight** • Simple, Human-Readable Codebase & Data Flow Documentation

---

## 🌟 1. Executive Summary & Overview

**${repoName}** is a software repository structured across **${summary.fileCount || fileNodes.length} files**, **${summary.moduleCount || moduleNodes.length} modules**, and **${summary.functionCount || funcNodes.length} core functions**.

### What does this project do in simple terms?
This application provides a **${primaryStack.join(', ')}** architecture. It is built to receive user inputs, coordinate data through organized application layers, apply business rules, and provide reliable responses.

- 🎯 **Primary Focus**: ${primaryStack[0] || 'Software System'}
- ⚡ **Architecture Type**: ${summary.hasFrontend && summary.hasBackend ? 'Full-Stack (Client + Server)' : summary.hasBackend ? 'Backend API & Services' : summary.hasFrontend ? 'Frontend Web Application' : 'Modular Codebase'}
- 📂 **Total Files Analyzed**: \`${summary.fileCount || fileNodes.length}\`
- ⚡ **Total Functions / Handlers**: \`${summary.functionCount || funcNodes.length}\`
- 🌐 **Public API Endpoints**: \`${summary.routeCount || routeNodes.length}\`
- 🗄️ **Database Persistence Operations**: \`${summary.dbOpCount || dbNodes.length}\`

---

## 🚀 2. How to Use & Run This Project

Follow these simple steps to run **${repoName}** on your local machine:

### 📋 Prerequisites
- **Node.js** (v18 or higher) or **Python** (v3.10+) installed on your system.
- **Git** installed.
- Package manager (\`npm\`, \`pnpm\`, \`yarn\`, or \`pip\`).

### 📦 Installation
${installSteps}

### ⚙️ Environment Variables (\`.env\`)
If the project requires API keys, database connections, or port settings, create a \`.env\` file in the root directory:

\`\`\`env
# Sample Configuration
PORT=5000
NODE_ENV=development
DATABASE_URL=mongodb://localhost:27017/${repoName.toLowerCase()}
# Optional AI / Third-Party Keys
AI_API_KEY=your_api_key_here
\`\`\`

### ▶️ Running the Application
${runSteps}

---

## 🔄 3. How Data Flows Through the Project (Step-by-Step)

Here is the exact journey of how data travels from start to finish when someone uses this system:

${flowSteps}

---

## 📁 4. What Is in This Repository? (Directory & File Breakdown)

${dirBreakdown}

---

## 🛠️ 5. Technologies & Stack Used

### 💻 Programming Languages
${langList}

### 🏗️ Architectural Components
${primaryStack.map(s => `- ✅ **${s}**`).join('\n')}

---

## 🌐 6. API Endpoints & Routes Catalog

${apiSection}

---

## 🗄️ 7. Database & Storage Layer

${dbSection}

---

## 💡 8. Key Functions & Logic Units

${funcNodes.slice(0, 10).map(fn => {
  const params = (fn.params && fn.params.length > 0) ? `(${fn.params.join(', ')})` : '()';
  const desc = fn.description || `Handles processing for ${fn.name} in module ${fn.module || 'root'}.`;
  return `- \`${fn.name}${params}\` in \`${fn.file || 'source'}\`
  - **Purpose:** ${desc}`;
}).join('\n\n') || '- Modular functional components.'}

---

## 🤝 9. Tips for Contributors & Developers

1. **Keep Functions Modular**: Each function has a distinct responsibility in the data flow.
2. **Follow Layered Separation**: Keep routes in route files, controllers handling requests, and database queries in dedicated models/services.
3. **Verify Data Flow**: When adding new features, trace how inputs enter the system, what services touch them, and what gets returned.

---

*This guide was generated by [FlowSight](https://github.com) Data Flow Engine.*
`;
}

/**
 * Generates a standalone, fully-featured, offline-ready Interactive HTML Guide file.
 * Includes interactive tab navigation, search filtering, collapsible folders,
 * copy-to-clipboard code snippets, step-by-step visual data flow journey, and print support.
 */
export function generateInteractiveHtmlGuide(graphData) {
  if (!graphData) return '<!DOCTYPE html><html><body><h1>No Data Available</h1></body></html>';

  const repoName = graphData.repositoryName || 'FlowSight Project';
  const summary = graphData.summary || {};
  const nodes = graphData.nodes || [];
  const moduleNodes = nodes.filter((n) => n.type === 'module');
  const fileNodes = nodes.filter((n) => n.type === 'file');
  const routeNodes = nodes.filter((n) => n.type === 'API' || n.type === 'route');
  const dbNodes = nodes.filter((n) => n.type === 'DATABASE' || n.type === 'db_operation');
  const appFlowNodes = graphData.applicationFlow?.nodes || [];
  const markdown = generateProjectReadme(graphData);

  const totalFiles = summary.fileCount || fileNodes.length;
  const totalModules = summary.moduleCount || moduleNodes.length;
  const totalRoutes = summary.routeCount || routeNodes.length;
  const totalDb = summary.dbOpCount || dbNodes.length;

  return `<!DOCTYPE html>

<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${repoName} — Interactive Project Guide & README</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #070a12;
      --card-bg: #0b101e;
      --card-inner: #0f172a;
      --border: #1e293b;
      --border-focus: #38bdf8;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #38bdf8;
      --primary-gradient: linear-gradient(135deg, #38bdf8 0%, #6366f1 100%);
      --accent-purple: #c084fc;
      --accent-green: #34d399;
      --accent-amber: #fbbf24;
      --accent-rose: #fb7185;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 0;
      margin: 0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    a { color: var(--primary); text-decoration: none; }
    code, pre { font-family: 'JetBrains Mono', monospace; }
    
    /* Top Header */
    header {
      background: rgba(7, 10, 18, 0.95);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      padding: 1rem 2rem;
      position: sticky;
      top: 0;
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .brand-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: var(--primary-gradient);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      box-shadow: 0 4px 14px rgba(56, 189, 248, 0.3);
    }
    .brand-title {
      font-size: 1.15rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .badge {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;
      background: rgba(56, 189, 248, 0.15);
      color: var(--primary);
      border: 1px solid rgba(56, 189, 248, 0.3);
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.5rem 0.9rem;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid var(--border);
      background: #0f172a;
      color: var(--text);
      transition: all 0.2s;
    }
    .btn:hover {
      background: #1e293b;
      border-color: #334155;
    }
    .btn-primary {
      background: var(--primary-gradient);
      color: #070a12;
      border: none;
      font-weight: 700;
    }
    .btn-primary:hover {
      opacity: 0.9;
      box-shadow: 0 4px 12px rgba(56, 189, 248, 0.35);
    }
    .search-input {
      background: #0f172a;
      border: 1px solid var(--border);
      padding: 0.5rem 0.9rem;
      border-radius: 8px;
      color: #fff;
      font-size: 0.8rem;
      font-family: inherit;
      outline: none;
      width: 220px;
      transition: all 0.2s;
    }
    .search-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
    }
    
    /* Layout */
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
      flex: 1;
      width: 100%;
    }
    
    /* Stats Bar */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      padding: 1.25rem;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .stat-icon {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }
    .stat-value {
      font-size: 1.4rem;
      font-weight: 800;
      font-family: 'JetBrains Mono', monospace;
      color: #fff;
    }
    .stat-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 600;
    }

    /* Tabs Navigation */
    .nav-tabs {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #0b101e;
      padding: 0.35rem;
      border-radius: 12px;
      border: 1px solid var(--border);
      margin-bottom: 2rem;
      overflow-x: auto;
    }
    .tab-btn {
      padding: 0.55rem 1.1rem;
      border-radius: 8px;
      font-size: 0.825rem;
      font-weight: 700;
      border: none;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      white-space: nowrap;
      transition: all 0.2s;
    }
    .tab-btn:hover {
      color: #fff;
    }
    .tab-btn.active {
      background: var(--primary-gradient);
      color: #070a12;
      box-shadow: 0 2px 8px rgba(56, 189, 248, 0.3);
    }

    /* Tab Panels */
    .tab-panel {
      display: none;
      animation: fadeIn 0.3s ease-in-out;
    }
    .tab-panel.active {
      display: block;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Cards & Sections */
    .section-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .section-title {
      font-size: 1.1rem;
      font-weight: 700;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      color: #fff;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      padding-bottom: 0.75rem;
    }
    
    /* Code Box with Copy */
    .code-box {
      background: #05070d;
      border: 1px solid var(--border);
      border-radius: 10px;
      margin: 1rem 0;
      overflow: hidden;
    }
    .code-header {
      background: #090d18;
      padding: 0.5rem 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
    }
    .code-content {
      padding: 1rem;
      font-size: 0.85rem;
      color: #38bdf8;
      overflow-x: auto;
      white-space: pre;
    }
    .copy-btn {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      color: #fff;
      font-size: 0.7rem;
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
      cursor: pointer;
    }
    .copy-btn:hover {
      background: var(--primary);
      color: #000;
    }

    /* Flow Step Journey */
    .flow-timeline {
      position: relative;
      margin-left: 1rem;
      padding-left: 1.5rem;
      border-left: 2px solid var(--border);
    }
    .flow-item {
      position: relative;
      margin-bottom: 1.5rem;
      background: var(--card-inner);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1rem 1.25rem;
      transition: transform 0.2s;
    }
    .flow-item:hover {
      transform: translateX(4px);
      border-color: rgba(56, 189, 248, 0.4);
    }
    .flow-item::before {
      content: '';
      position: absolute;
      left: -2.05rem;
      top: 1.25rem;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--primary);
      border: 3px solid var(--bg);
    }
    .flow-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }
    .flow-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #fff;
    }

    /* Directory Accordion Grid */
    .dir-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }
    .dir-card {
      background: var(--card-inner);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .dir-card:hover {
      border-color: var(--primary);
      background: rgba(15, 23, 42, 0.9);
    }
    .dir-name {
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      color: var(--primary);
      font-size: 0.85rem;
      margin-bottom: 0.4rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .dir-desc {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: 0.6rem;
    }

    /* Tables */
    .table-container {
      overflow-x: auto;
      border-radius: 10px;
      border: 1px solid var(--border);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;
      text-align: left;
    }
    th {
      background: #090d18;
      color: var(--text-muted);
      padding: 0.75rem 1rem;
      font-weight: 600;
      border-bottom: 1px solid var(--border);
    }
    td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    tr:hover td {
      background: rgba(255,255,255,0.02);
    }
    .method-badge {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 800;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
    }
    .method-get { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }
    .method-post { background: rgba(52, 211, 153, 0.15); color: #34d399; }
    .method-put { background: rgba(251, 191, 36, 0.15); color: #fbbf24; }
    .method-delete { background: rgba(251, 113, 133, 0.15); color: #fb7185; }

    /* Footer */
    footer {
      background: #05070d;
      border-top: 1px solid var(--border);
      padding: 1.5rem 2rem;
      text-align: center;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: auto;
    }

    /* Print styles */
    @media print {
      header, .nav-tabs, .search-input, .btn, footer { display: none !important; }
      .tab-panel { display: block !important; }
      body, .container { background: #fff !important; color: #000 !important; }
      .section-card, .stat-card, .flow-item, .code-box { border: 1px solid #ddd !important; background: #fff !important; color: #000 !important; }
      .stat-value, .flow-title, .section-title, h1, h2, h3 { color: #000 !important; }
    }
  </style>
</head>
<body>

  <!-- Header -->
  <header>
    <div class="brand">
      <div class="brand-icon">⚡</div>
      <div>
        <div class="brand-title">
          <span>${repoName}</span>
          <span class="badge">Interactive Guide</span>
        </div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">Plain English Codebase Architecture & Data Flow Guide</div>
      </div>
    </div>

    <div class="header-actions">
      <input type="text" id="searchInput" class="search-input" placeholder="Search guide..." onkeyup="filterGuide(this.value)">
      <button class="btn" onclick="copyFullMarkdown()">📋 Copy Markdown</button>
      <button class="btn" onclick="window.print()">🖨️ Print / PDF</button>
      <button class="btn btn-primary" onclick="downloadRawMarkdown()">💾 Save Markdown</button>
    </div>
  </header>

  <!-- Main Container -->
  <div class="container">

    <!-- Stat Highlights -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(56, 189, 248, 0.1); color: #38bdf8;">📄</div>
        <div>
          <div class="stat-value">${totalFiles}</div>
          <div class="stat-label">Total Files</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(192, 132, 252, 0.1); color: #c084fc;">📦</div>
        <div>
          <div class="stat-value">${totalModules}</div>
          <div class="stat-label">Modules</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(52, 211, 153, 0.1); color: #34d399;">🌐</div>
        <div>
          <div class="stat-value">${totalRoutes}</div>
          <div class="stat-label">API Routes</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(251, 191, 36, 0.1); color: #fbbf24;">🗄️</div>
        <div>
          <div class="stat-value">${totalDb}</div>
          <div class="stat-label">Database Ops</div>
        </div>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="nav-tabs">
      <button class="tab-btn active" onclick="showTab('overview')">🌟 1. Overview & Setup</button>
      <button class="tab-btn" onclick="showTab('flow')">🔄 2. Data Flow Journey</button>
      <button class="tab-btn" onclick="showTab('dirs')">📁 3. Repo & Directory Breakdown</button>
      <button class="tab-btn" onclick="showTab('apis')">🌐 4. API Catalog</button>
      <button class="tab-btn" onclick="showTab('tech')">🛠️ 5. Tech Stack</button>
      <button class="tab-btn" onclick="showTab('markdown')">📝 6. Full Markdown Doc</button>
    </div>

    <!-- TAB 1: OVERVIEW & SETUP -->
    <div id="tab-overview" class="tab-panel active">
      <div class="section-card searchable">
        <div class="section-title">✨ What is ${repoName}? (Plain English Summary)</div>
        <p style="font-size: 0.9rem; color: #cbd5e1; line-height: 1.7;">
          <strong>${repoName}</strong> is a software project built to handle user interactions, manage data flow through organized application services, and return responses. It features clean separation between public routes, internal handlers, and persistent storage.
        </p>
      </div>

      <div class="section-card searchable">
        <div class="section-title">🚀 How to Run & Use This Project Locally</div>
        
        <div style="font-size: 0.85rem; font-weight: 700; color: #fff; margin-top: 0.5rem;">Step 1: Clone & Install Dependencies</div>
        <div class="code-box">
          <div class="code-header">
            <span>Terminal / Bash</span>
            <button class="copy-btn" onclick="copySnippet(this, 'git clone https://github.com/${repoName}.git\\ncd ${repoName}\\nnpm install')">Copy</button>
          </div>
          <div class="code-content">git clone https://github.com/${repoName}.git
cd ${repoName}
npm install</div>
        </div>

        <div style="font-size: 0.85rem; font-weight: 700; color: #fff; margin-top: 1rem;">Step 2: Start the Development Server</div>
        <div class="code-box">
          <div class="code-header">
            <span>Terminal / Bash</span>
            <button class="copy-btn" onclick="copySnippet(this, 'npm run dev')">Copy</button>
          </div>
          <div class="code-content">npm run dev</div>
        </div>
      </div>
    </div>

    <!-- TAB 2: DATA FLOW JOURNEY -->
    <div id="tab-flow" class="tab-panel">
      <div class="section-card">
        <div class="section-title">🔄 Step-by-Step Data Flow Journey</div>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1.5rem;">
          How data enters the app, moves across services, and reaches the user screen:
        </p>

        <div class="flow-timeline">
          ${(appFlowNodes.length > 0 ? appFlowNodes : [
            { semanticName: 'User Request Trigger', type: 'PAGE', description: 'User submits information via the interface or API.' },
            { semanticName: 'Route Handler & Middleware', type: 'API', description: 'Server validates parameters and ensures request authentication.' },
            { semanticName: 'Business Logic Execution', type: 'SERVICE', description: 'Internal algorithms process business calculations and transformations.' },
            { semanticName: 'Database State Update', type: 'DATABASE', description: 'Queries persistent storage to fetch or save updated documents.' },
            { semanticName: 'Response Delivery', type: 'RESPONSE', description: 'Serialized response is returned to the user interface.' }
          ]).map((step, idx) => `
            <div class="flow-item searchable">
              <div class="flow-header">
                <div class="flow-title">Step ${idx + 1}: ${step.semanticName || step.name}</div>
                <span class="badge">${step.type || 'STEP'}</span>
              </div>
              <div style="font-size: 0.825rem; color: #cbd5e1;">${step.plainExplanation || step.description || 'Executes this stage of the data pipeline.'}</div>
              ${step.file ? `<div style="font-size: 0.725rem; color: var(--text-muted); font-family: monospace; margin-top: 0.4rem;">📁 ${step.file}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- TAB 3: REPO & DIRECTORIES -->
    <div id="tab-dirs" class="tab-panel">
      <div class="section-card">
        <div class="section-title">📁 What is in this repository? (Directories & Files)</div>
        <div class="dir-grid">
          ${moduleNodes.map(m => {
            const modFiles = m.files || fileNodes.filter(f => f.file?.startsWith(m.name));
            return `
              <div class="dir-card searchable">
                <div class="dir-name">
                  <span>📁 ${m.name}/</span>
                  <span style="font-size: 0.7rem; color: var(--text-muted);">${modFiles.length} files</span>
                </div>
                <div class="dir-desc">
                  ${m.name.includes('route') ? 'Handles HTTP API route registrations' :
                    m.name.includes('controller') ? 'Processes requests and coordinates responses' :
                    m.name.includes('service') ? 'Core business logic and algorithmic handlers' :
                    m.name.includes('model') ? 'Database models, schemas, and queries' :
                    m.name.includes('component') ? 'User interface views and components' :
                    'Modular codebase directory'}
                </div>
                <div style="font-size: 0.7rem; color: var(--primary); font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${modFiles.slice(0, 3).map(f => typeof f === 'string' ? f.split('/').pop() : (f.name || f.file)).join(', ')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- TAB 4: API CATALOG -->
    <div id="tab-apis" class="tab-panel">
      <div class="section-card">
        <div class="section-title">🌐 API Endpoints & Routes Catalog</div>
        ${routeNodes.length > 0 ? `
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Route Endpoint</th>
                  <th>Handler Location</th>
                  <th>Plain English Purpose</th>
                </tr>
              </thead>
              <tbody>
                ${routeNodes.slice(0, 25).map(r => {
                  const method = r.httpMethod || (r.name?.includes('POST') ? 'POST' : 'GET');
                  const methodClass = method.toLowerCase() === 'post' ? 'method-post' : method.toLowerCase() === 'put' ? 'method-put' : method.toLowerCase() === 'delete' ? 'method-delete' : 'method-get';
                  return `
                    <tr class="searchable">
                      <td><span class="method-badge ${methodClass}">${method}</span></td>
                      <td style="font-family: monospace; font-weight: 600; color: #fff;">${r.routePath || r.name}</td>
                      <td style="font-family: monospace; color: var(--text-muted); font-size: 0.75rem;">${r.handlerName || r.file}</td>
                      <td style="color: #cbd5e1;">Handles client request payload and returns data.</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : `<p style="font-size: 0.85rem; color: var(--text-muted);">No external HTTP routes detected.</p>`}
      </div>
    </div>

    <!-- TAB 5: TECH STACK -->
    <div id="tab-tech" class="tab-panel">
      <div class="section-card">
        <div class="section-title">🛠️ Programming Languages & Tech Stack</div>
        <div class="dir-grid">
          ${Object.entries(summary.languages || {}).map(([lang, count]) => `
            <div class="dir-card searchable">
              <div class="dir-name" style="text-transform: uppercase;">${lang}</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: #fff; font-family: monospace;">${count} file${count > 1 ? 's' : ''}</div>
              <div class="dir-desc" style="margin-top: 0.4rem;">Verified and parsed via FlowSight AST engine.</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- TAB 6: FULL MARKDOWN -->
    <div id="tab-markdown" class="tab-panel">
      <div class="section-card">
        <div class="section-title" style="justify-content: space-between;">
          <span>📝 Full Markdown Source</span>
          <button class="btn" onclick="copyFullMarkdown()">Copy All</button>
        </div>
        <pre id="rawMarkdownBlock" style="padding: 1rem; background: #05070d; border: 1px solid var(--border); border-radius: 8px; font-size: 0.8rem; color: #cbd5e1; overflow-x: auto; white-space: pre-wrap; line-height: 1.6;">${markdown.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
      </div>
    </div>

  </div>

  <!-- Footer -->
  <footer>
    Generated by <strong>FlowSight</strong> • Interactive Codebase & Data Flow Engine
  </footer>

  <!-- Embedded Interactive Script -->
  <script>
    const rawMarkdownText = ${JSON.stringify(markdown)};

    function showTab(tabId) {
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      
      const targetPanel = document.getElementById('tab-' + tabId);
      if (targetPanel) targetPanel.classList.add('active');

      const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick').includes(tabId));
      if (activeBtn) activeBtn.classList.add('active');
    }

    function copySnippet(btn, text) {
      navigator.clipboard.writeText(text);
      const originalText = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = originalText; }, 2000);
    }

    function copyFullMarkdown() {
      navigator.clipboard.writeText(rawMarkdownText);
      alert('Markdown document copied to clipboard!');
    }

    function downloadRawMarkdown() {
      const blob = new Blob([rawMarkdownText], { type: 'text/markdown;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', '${repoName}-README.md');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    function filterGuide(query) {
      const q = (query || '').toLowerCase().trim();
      const items = document.querySelectorAll('.searchable');
      items.forEach(el => {
        const text = el.textContent.toLowerCase();
        if (!q || text.includes(q)) {
          el.style.display = '';
        } else {
          el.style.display = 'none';
        }
      });
    }
  </script>
</body>
</html>`;
}

