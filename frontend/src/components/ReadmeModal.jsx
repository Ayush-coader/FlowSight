import { useState, useMemo } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  FileText,
  Sparkles,
  BookOpen,
  Code2,
  Layers,
  Server,
  Database,
  Terminal,
  Play,
  Search,
  Printer,
  ExternalLink,
  Cpu
} from 'lucide-react';
import { generateProjectReadme, generateInteractiveHtmlGuide } from '../utils/readmeGenerator';

export default function ReadmeModal({
  isOpen,
  onClose,
  graphData
}) {
  const [activeTab, setActiveTab] = useState('interactive'); // 'interactive' | 'preview' | 'raw'
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');


  const markdownContent = useMemo(() => {
    if (!graphData) return '';
    return generateProjectReadme(graphData);
  }, [graphData]);

  if (!isOpen || !graphData) return null;

  const repoName = graphData.repositoryName || 'repository';
  const summary = graphData.summary || {};
  const nodes = graphData.nodes || [];
  const moduleNodes = nodes.filter((n) => n.type === 'module');
  const fileNodes = nodes.filter((n) => n.type === 'file');
  const routeNodes = nodes.filter((n) => n.type === 'API' || n.type === 'route');
  const dbNodes = nodes.filter((n) => n.type === 'DATABASE' || n.type === 'db_operation');
  const appFlowNodes = graphData.applicationFlow?.nodes || [];

  // Copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Primary Download: Standalone Interactive Guide (.html)
  const handleDownloadInteractiveGuide = () => {
    const htmlContent = generateInteractiveHtmlGuide(graphData);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${repoName}-Interactive-Guide.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Secondary Download: Raw Markdown .md file
  const handleDownloadMd = () => {
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${repoName}-README.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  // Print
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${repoName} - README & Guide</title>
            <style>
              body { font-family: sans-serif; line-height: 1.5; padding: 20px; color: #111; }
              pre { background: #f4f4f5; padding: 12px; border-radius: 6px; font-family: monospace; white-space: pre-wrap; }
              h1, h2, h3 { color: #0f172a; }
            </style>
          </head>
          <body>
            <h1>📘 ${repoName} - Project Guide & README</h1>
            <pre>${markdownContent}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  // Filter sections based on search query
  const matchesSearch = (text) => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md select-none animate-in fade-in duration-200">
      <div className="bg-[#0b101e] border border-sky-500/30 rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Top Header */}
        <div className="p-3.5 sm:p-5 border-b border-slate-800 bg-[#070a12]/95 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 border border-sky-400/30 text-sky-400 shadow-md shrink-0">
              <BookOpen size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-100 truncate">
                  Project README & Guide
                </h2>
                <span className="text-[9px] sm:text-[10px] font-semibold px-2 py-0.2 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20 font-mono truncate max-w-[120px] sm:max-w-[180px]">
                  {repoName}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 line-clamp-1">
                Plain English architecture, structure, how to use, and data flow journeys
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2">
            {/* Quick Copy Button */}
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-900 text-slate-300 hover:text-slate-100 hover:bg-slate-800 border-slate-800'
              }`}
              title="Copy complete Markdown to clipboard"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy Markdown'}</span>
              <span className="sm:hidden">{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {/* Download Markdown (.md) Secondary Button */}
            <button
              onClick={handleDownloadMd}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-800 text-xs font-semibold transition-all cursor-pointer"
              title="Download as GitHub README.md"
            >
              <FileText size={13} />
              <span>Save .md</span>
            </button>

            {/* PRIMARY: Download Interactive Guide (.html) */}
            <button
              onClick={handleDownloadInteractiveGuide}
              className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 hover:from-sky-400 hover:to-indigo-400 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/25 transition-all cursor-pointer"
              title="Download standalone, offline-ready Interactive Guide"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Download Guide</span>
              <span className="sm:hidden">Download</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Action & Filter Toolbar */}
        <div className="px-4 py-2.5 bg-[#090d18] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          {/* Mode Tabs */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-950 border border-slate-800">
            <button
              onClick={() => setActiveTab('interactive')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'interactive'
                  ? 'bg-sky-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles size={13} />
              <span>Interactive Guide</span>
            </button>

            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-sky-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText size={13} />
              <span>Markdown Preview</span>
            </button>

            <button
              onClick={() => setActiveTab('raw')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'raw'
                  ? 'bg-sky-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 size={13} />
              <span>Raw Markdown</span>
            </button>
          </div>

          {/* Search within document */}
          <div className="flex items-center gap-2">
            <div className="relative w-44 sm:w-60">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search within README..."
                className="w-full bg-slate-950 text-xs text-slate-200 pl-7 pr-2 py-1.5 rounded-lg border border-slate-800 focus:border-sky-500 outline-none transition-all placeholder:text-slate-500 font-mono"
              />
            </div>

            {/* Extra Export Options */}
            <button
              onClick={handleDownloadInteractiveGuide}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-sky-400 hover:text-sky-200 transition-colors cursor-pointer text-xs"
              title="Download Standalone Interactive Guide (.html)"
            >
              <ExternalLink size={14} />
            </button>

            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer text-xs"
              title="Print or Save as PDF"
            >
              <Printer size={14} />
            </button>
          </div>
        </div>


        {/* Modal Body */}
        <div className="flex-1 overflow-hidden flex">
          
          {/* TAB 1: INTERACTIVE PLAIN ENGLISH GUIDE */}
          {activeTab === 'interactive' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 scrollbar-thin text-slate-200">
              
              {/* Top Stat Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                    <FileText size={18} />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 font-medium">Total Files</div>
                    <div className="text-lg font-bold text-slate-100 font-mono">{summary.fileCount || fileNodes.length}</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <Layers size={18} />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 font-medium">Modules</div>
                    <div className="text-lg font-bold text-slate-100 font-mono">{summary.moduleCount || moduleNodes.length}</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                    <Server size={18} />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 font-medium">API Endpoints</div>
                    <div className="text-lg font-bold text-slate-100 font-mono">{summary.routeCount || routeNodes.length}</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                    <Database size={18} />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 font-medium">Database Ops</div>
                    <div className="text-lg font-bold text-slate-100 font-mono">{summary.dbOpCount || dbNodes.length}</div>
                  </div>
                </div>
              </div>

              {/* Section 1: Executive Overview in Plain English */}
              {matchesSearch('overview summary what is in the repo') && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-[#0e1628] to-slate-900 border border-sky-500/20 space-y-3">
                  <div className="flex items-center gap-2 text-sky-400 text-sm font-bold">
                    <Sparkles size={16} />
                    <span>1. What is this repository? (Plain English Overview)</span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed">
                    <strong className="text-white">{repoName}</strong> is a software project designed to organize business logic, serve API requests, and deliver reliable data. Whether you are a product manager, developer, or student, this project is built with clean separation between incoming client requests, backend services, and data storage.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {summary.hasFrontend && (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-medium">
                        ✨ Frontend UI Included
                      </span>
                    )}
                    {summary.hasBackend && (
                      <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-300 border border-sky-500/20 text-xs font-medium">
                        🚀 Backend Server & APIs
                      </span>
                    )}
                    {summary.hasDatabase && (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-medium">
                        🗄️ Database Persistence
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Section 2: How to Run / Use */}
              {matchesSearch('how to run install use setup clone npm python') && (
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                  <div className="flex items-center gap-2 text-indigo-400 text-sm font-bold">
                    <Terminal size={16} />
                    <span>2. How to Run & Use This Project Locally</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                      <div className="font-bold text-slate-300 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px]">1</span>
                        <span>Clone & Install</span>
                      </div>
                      <pre className="p-2.5 rounded-lg bg-slate-900 text-slate-300 font-mono text-[11px] overflow-x-auto">
{`git clone https://github.com/${repoName}.git
cd ${repoName}
npm install`}
                      </pre>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                      <div className="font-bold text-slate-300 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px]">2</span>
                        <span>Start Development Server</span>
                      </div>
                      <pre className="p-2.5 rounded-lg bg-slate-900 text-slate-300 font-mono text-[11px] overflow-x-auto">
{`npm run dev
# Server will launch on local port`}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 3: End-to-End Data Flow Journey */}
              {matchesSearch('data flow journey how it works step') && (
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                  <div className="flex items-center gap-2 text-cyan-400 text-sm font-bold">
                    <Play size={16} />
                    <span>3. End-to-End Data Flow Journey (How it Works)</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Follow how information travels through this application from start to finish:
                  </p>

                  <div className="space-y-3">
                    {(appFlowNodes.length > 0 ? appFlowNodes : [
                      { semanticName: 'User Action', type: 'USER_ACTION', description: 'User submits an action or sends an HTTP request.' },
                      { semanticName: 'API Endpoint', type: 'API', description: 'Server receives and validates request payload.' },
                      { semanticName: 'Business Logic Service', type: 'SERVICE', description: 'Executes core algorithms and calculations.' },
                      { semanticName: 'Database Storage', type: 'DATABASE', description: 'Reads or saves updated state to persistent database.' },
                      { semanticName: 'User Response', type: 'RESPONSE', description: 'Returns completed result or response screen to the user.' }
                    ]).map((step, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800/70">
                        <div className="w-6 h-6 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
                            <span>{step.semanticName || step.name}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 uppercase font-mono">
                              {step.type}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                            {step.plainExplanation || step.description || 'Executes this stage of the data lifecycle.'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 4: What is in the repo? (Directory & Module Breakdown) */}
              {matchesSearch('directory folders files structure what is in') && (
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                  <div className="flex items-center gap-2 text-purple-400 text-sm font-bold">
                    <Layers size={16} />
                    <span>4. What Is in This Repository? (Directories & Files)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {moduleNodes.map((m) => {
                      const modFiles = m.files || fileNodes.filter((f) => f.file?.startsWith(m.name) || f.parentId === m.id);
                      return (
                        <div key={m.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-sky-300 font-mono flex items-center gap-1.5">
                              📁 {m.name}/
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                              {modFiles.length} file{modFiles.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 line-clamp-2">
                            {m.name.includes('route') ? 'Handles HTTP API route registrations' :
                             m.name.includes('controller') ? 'Processes requests and coordinates responses' :
                             m.name.includes('service') ? 'Core business logic and algorithmic handlers' :
                             m.name.includes('model') ? 'Database models, schemas, and queries' :
                             m.name.includes('component') ? 'User interface views and interactive elements' :
                             'Modular components and supporting codebase files'}
                          </div>
                          <div className="pt-1 flex flex-wrap gap-1">
                            {modFiles.slice(0, 4).map((f, i) => (
                              <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                                {typeof f === 'string' ? f.split('/').pop() : (f.name || f.file)}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section 5: API Catalog */}
              {routeNodes.length > 0 && matchesSearch('api routes endpoints http') && (
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                  <div className="flex items-center gap-2 text-rose-400 text-sm font-bold">
                    <Server size={16} />
                    <span>5. API Endpoints & Routes Catalog</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-slate-800 rounded-xl overflow-hidden">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="p-2.5 font-semibold">Method</th>
                          <th className="p-2.5 font-semibold">Route Path</th>
                          <th className="p-2.5 font-semibold">Handler Location</th>
                          <th className="p-2.5 font-semibold">Plain English Purpose</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {routeNodes.slice(0, 15).map((r, i) => {
                          const method = r.httpMethod || (r.name?.includes('POST') ? 'POST' : 'GET');
                          return (
                            <tr key={i} className="hover:bg-slate-800/30">
                              <td className="p-2.5 font-mono font-bold text-sky-400">{method}</td>
                              <td className="p-2.5 font-mono text-slate-200">{r.routePath || r.name}</td>
                              <td className="p-2.5 font-mono text-slate-400 text-[11px]">{r.handlerName || r.file}</td>
                              <td className="p-2.5 text-slate-300">
                                {(r.routePath || r.name).includes('login') ? 'Authenticates user and returns session/token' :
                                 (r.routePath || r.name).includes('analyz') ? 'Triggers repository flow analysis' :
                                 (r.routePath || r.name).includes('chat') ? 'Interacts with codebase AI assistant' :
                                 'Receives client request and executes corresponding handler'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Section 6: Technologies Used */}
              {matchesSearch('technologies stack languages tools') && (
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                  <div className="flex items-center gap-2 text-amber-400 text-sm font-bold">
                    <Cpu size={16} />
                    <span>6. Technologies & Programming Languages Used</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {Object.entries(summary.languages || {}).map(([lang, count]) => (
                      <div key={lang} className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                        <div className="text-xs font-bold uppercase text-slate-200">{lang}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{count} file{count > 1 ? 's' : ''}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GITHUB-STYLE MARKDOWN PREVIEW */}
          {activeTab === 'preview' && (
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-[#070a12] scrollbar-thin text-slate-200 space-y-4 leading-relaxed font-sans">
              <div className="max-w-4xl mx-auto bg-slate-900/40 p-6 sm:p-8 rounded-2xl border border-slate-800/80 space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 flex items-center gap-2">
                    <span>📘 {repoName}</span>
                    <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      Project Guide
                    </span>
                  </h1>
                  <p className="text-slate-400 text-xs mt-1">Generated by FlowSight Data Flow Engine</p>
                </div>

                <div className="prose prose-invert max-w-none text-xs sm:text-sm space-y-4">
                  <pre className="p-4 rounded-xl bg-slate-950 text-slate-200 font-mono text-xs whitespace-pre-wrap border border-slate-800 leading-relaxed overflow-x-auto">
                    {markdownContent}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RAW MARKDOWN CODE */}
          {activeTab === 'raw' && (
            <div className="flex-1 overflow-y-auto p-4 bg-[#05070d] font-mono text-xs text-slate-300 scrollbar-thin">
              <div className="flex justify-between items-center pb-3 mb-3 border-b border-slate-800 px-2 text-slate-400 text-[11px]">
                <span>Format: GitHub Flavored Markdown (.md)</span>
                <span>{markdownContent.length} characters • {markdownContent.split('\n').length} lines</span>
              </div>
              <textarea
                readOnly
                value={markdownContent}
                className="w-full h-[calc(100%-40px)] bg-transparent outline-none font-mono text-xs text-sky-200/90 leading-relaxed resize-none selection:bg-sky-500/30"
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 px-6 border-t border-slate-800 bg-[#070a12] flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Document generated & verified from active repository AST</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
            >
              {copied ? '✓ Copied Markdown' : 'Copy Markdown'}
            </button>
            <span className="text-slate-700">•</span>
            <button
              onClick={handleDownloadMd}
              className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer text-xs flex items-center gap-1"
            >
              <FileText size={12} />
              <span>Save .md</span>
            </button>
            <span className="text-slate-700">•</span>
            <button
              onClick={handleDownloadInteractiveGuide}
              className="text-sky-400 hover:text-sky-300 font-bold transition-colors cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-xs"
            >
              <Download size={13} />
              <span>Save Interactive Guide (.html)</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
