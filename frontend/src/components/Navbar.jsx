import {
  Compass,
  Search,
  Play,
  Loader2,
  Route,
  GitBranch,
  FolderGit2,
  PanelLeft,
  PanelRight,
  Boxes,
  Sparkles,
  Code2,
  BookOpen,
  FileText
} from 'lucide-react';


export default function Navbar({
  repoUrl,
  setRepoUrl,
  onAnalyze,
  loading,
  currentLevel,
  setCurrentLevel,
  selectedModule,
  setSelectedModule,
  availableModules = [],
  searchQuery,
  setSearchQuery,
  repositoryName,
  activeTrace,
  onToggleTraceMode,
  isLeftSidebarOpen,
  onToggleLeftSidebar,
  isInspectorOpen,
  onToggleInspector,
  viewMode = 'simple', // 'simple' | 'technical'
  setViewMode,
  onOpenStorySummary,
  onOpenReadme
}) {
  const navTabs = [
    { id: 'L1', label: 'App Flow', fullLabel: 'L1 — Application Flow' },
    { id: 'L2', label: 'Modules', fullLabel: 'L2 — Module Flow' },
    { id: 'L3', label: 'Files & Functions', fullLabel: 'L3 — Files & Functions' },
    { id: 'L4', label: 'Code Flow', fullLabel: 'L4 — Detailed Code Flow' }

  ];

  return (
    <header className="h-14 bg-[#070a12] border-b border-slate-800/80 px-2 sm:px-4 flex items-center justify-between gap-2 md:gap-4 z-30 shrink-0 select-none shadow-md">
      {/* Left: Sidebar Toggle & Brand */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {onToggleLeftSidebar && (
          <button
            onClick={onToggleLeftSidebar}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              isLeftSidebarOpen
                ? 'bg-slate-800 text-sky-400 border-slate-700'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Toggle Repository Files"
          >
            <PanelLeft size={16} />
          </button>
        )}

        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-slate-950 font-bold shrink-0 shadow-md shadow-sky-500/20">
            <Compass size={16} />
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-extrabold tracking-tight text-slate-100 flex items-center gap-1.5">
              <span>FlowSight</span>
              <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                Data Flow
              </span>
            </div>
            <p className="text-[9px] text-slate-400 -mt-0.5">Simple Visual Code Journeys</p>
          </div>
        </div>

        {repositoryName && (
          <>
            <div className="hidden md:block h-5 w-px bg-slate-800 mx-1" />
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 max-w-[160px] lg:max-w-[220px]">
              <FolderGit2 size={13} className="text-slate-400 shrink-0" />
              <span className="font-mono font-semibold text-slate-200 truncate">
                {repositoryName}
              </span>
              <span className="hidden lg:flex items-center gap-0.5 text-[10px] text-slate-500 font-mono shrink-0">
                <GitBranch size={10} /> main
              </span>
            </div>
          </>
        )}
      </div>

      {/* Center: Dual Mode Switcher (Simple vs Technical) & Sub-tabs */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Experience Mode Segmented Switcher */}
        <div className="flex items-center p-0.5 rounded-xl bg-[#0b0f19] border border-slate-800 shadow-inner">
          <button
            onClick={() => {
              setViewMode && setViewMode('simple');
              setCurrentLevel('L1');
            }}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              viewMode === 'simple'
                ? 'bg-gradient-to-r from-sky-500 to-cyan-400 text-slate-950 shadow-md shadow-sky-500/25 ring-1 ring-sky-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Simple, user-friendly flow for everyone"
          >
            <Sparkles size={13} />
            <span>Simple View</span>
          </button>

          <button
            onClick={() => {
              setViewMode && setViewMode('technical');
            }}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              viewMode === 'technical'
                ? 'bg-slate-800 text-sky-300 shadow-md border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Technical code levels, AST, and developer details"
          >
            <Code2 size={13} />
            <span>Tech View</span>
          </button>
        </div>

        {/* Technical Granularity Tabs (Visible in Tech View) */}
        {viewMode === 'technical' && (
          <nav className="hidden lg:flex items-center gap-0.5 bg-[#0b0f19] p-0.5 rounded-xl border border-slate-800/80">
            {navTabs.map((tab) => {
              const isActive = currentLevel === tab.id || (tab.id === 'L2' && currentLevel === 'ARCH');
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentLevel(tab.id)}
                  title={tab.fullLabel}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    isActive
                      ? 'bg-sky-500 text-slate-950 font-bold shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Module Selector in Tech View */}
        {viewMode === 'technical' && availableModules?.length > 0 && (
          <div className="hidden xl:flex items-center gap-1.5 bg-[#0b0f19] px-2.5 py-1 rounded-xl border border-slate-800/80 text-xs">
            <Boxes size={13} className={selectedModule ? 'text-amber-400' : 'text-sky-400'} />
            <span className="text-slate-400 text-[10px] uppercase font-bold">Scope:</span>
            <select
              value={selectedModule || ''}
              onChange={(e) => {
                const mod = e.target.value ? e.target.value : null;
                setSelectedModule(mod);
                if (mod && currentLevel === 'L1') {
                  setCurrentLevel('L2');
                }
              }}
              className="bg-transparent text-slate-200 font-mono text-xs font-semibold outline-none cursor-pointer hover:text-sky-300"
            >
              <option value="" className="bg-slate-900 text-slate-100">🌐 Full Project</option>
              {availableModules.map((m) => (
                <option key={m.id || m.name} value={m.name} className="bg-slate-900 text-slate-100">
                  📦 {m.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Quick Story Summary Button */}
        {onOpenStorySummary && (
          <button
            onClick={onOpenStorySummary}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all cursor-pointer"
            title="Read Complete Data Flow Journey in Plain English"
          >
            <BookOpen size={13} />
            <span className="hidden md:inline">Flow Story</span>
          </button>
        )}

        {/* Project README & Guide Button */}
        {onOpenReadme && (
          <button
            onClick={onOpenReadme}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-sky-500/15 via-indigo-500/15 to-purple-500/15 hover:from-sky-500/25 hover:to-indigo-500/25 text-sky-300 border border-sky-500/35 text-xs font-bold shadow-sm transition-all cursor-pointer"
            title="View & Download Plain English Project README & Guide"
          >
            <FileText size={13} className="text-sky-400" />
            <span>README & Guide</span>
          </button>
        )}
      </div>


      {/* Right: Search, Trace Toggle & Ingest */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Search */}
        <div className="relative hidden xl:block w-36 2xl:w-44">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search flow..."
            className="w-full bg-[#0b0f19] text-xs text-slate-200 pl-7 pr-2 py-1.5 rounded-lg border border-slate-800 focus:border-sky-500 outline-none transition-all placeholder:text-slate-500 font-mono"
          />
        </div>

        {/* Trace Toggle in Tech View */}
        {viewMode === 'technical' && (
          <button
            onClick={onToggleTraceMode}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              activeTrace
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-md'
                : 'bg-[#0b0f19] text-slate-400 hover:text-cyan-300 border-slate-800'
            }`}
            title="Trace Specific Variable"
          >
            <Route size={13} />
            <span className="hidden sm:inline">Trace</span>
          </button>
        )}

        {/* Analyze Input */}
        <div className="hidden md:flex items-center gap-1 bg-[#0b0f19] p-0.5 rounded-xl border border-slate-800">
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="GitHub URL or local path..."
            className="bg-transparent text-xs text-slate-200 px-2 py-1 w-32 xl:w-44 outline-none font-mono placeholder:text-slate-500"
            onKeyDown={(e) => e.key === 'Enter' && onAnalyze && onAnalyze()}
          />
          <button
            onClick={onAnalyze}
            disabled={loading || !repoUrl.trim()}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Play size={11} fill="currentColor" />}
            <span className="hidden lg:inline">{loading ? 'Analyzing...' : 'Analyze'}</span>
          </button>
        </div>

        {/* Inspector Panel Toggle Button */}
        {onToggleInspector && (
          <button
            onClick={onToggleInspector}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              isInspectorOpen
                ? 'bg-slate-800 text-sky-400 border-slate-700'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Toggle Details Inspector"
          >
            <PanelRight size={16} />
          </button>
        )}
      </div>
    </header>
  );
}
