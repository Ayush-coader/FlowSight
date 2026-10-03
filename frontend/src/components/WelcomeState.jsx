import { useState } from 'react';
import {
  Sparkles,
  GitBranch,
  ArrowRight,
  ShieldCheck,
  Terminal,
  Play,
  Loader2,
  Code2,
  FolderGit2,
  BookOpen
} from 'lucide-react';

export default function WelcomeState({ onAnalyze, loading, repoUrl, setRepoUrl }) {
  const [inputVal, setInputVal] = useState(repoUrl || '');

  const handleStart = (url) => {
    const target = url || inputVal;
    if (!target.trim()) return;
    setRepoUrl && setRepoUrl(target);
    onAnalyze && onAnalyze(target);
  };

  return (
    <div className="flex-1 w-full flex flex-col items-center justify-start sm:justify-center p-3 sm:p-6 md:p-10 text-center bg-[#070a12] relative overflow-y-auto select-none safe-pb">
      {/* Background ambient glow orbs */}
      <div className="absolute w-[300px] sm:w-[500px] md:w-[600px] h-[300px] sm:h-[500px] md:h-[600px] rounded-full bg-sky-600/10 blur-3xl pointer-events-none -top-20 -left-20" />
      <div className="absolute w-[300px] sm:w-[500px] md:w-[600px] h-[300px] sm:h-[500px] md:h-[600px] rounded-full bg-indigo-600/10 blur-3xl pointer-events-none -bottom-20 -right-20" />

      <div className="max-w-3xl w-full space-y-4 sm:space-y-6 relative z-10 my-auto py-4">
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-[11px] sm:text-xs font-semibold shadow-sm max-w-full">
          <Sparkles size={13} className="animate-pulse shrink-0" />
          <span className="truncate">Simple, User-Friendly Data Flow & Codebase Explorer</span>
        </div>

        {/* Hero Title & Subtext */}
        <div className="space-y-2 px-1">
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-slate-100 leading-tight">
            See How Data Flows in{' '}
            <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              Any Codebase
            </span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            Designed for <strong className="text-slate-200">non-technical & technical users alike</strong>. Walk through step-by-step user journeys in plain English, or drill down into deep AST code flows and variables.
          </p>
        </div>

        {/* Central Ingestion Box (Responsive: flex-col on very small screens, flex-row on sm+) */}
        <div className="max-w-xl mx-auto p-1.5 sm:p-2 rounded-2xl bg-[#0f172a]/90 border border-slate-800 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex items-center gap-2 flex-1 pl-2 sm:pl-3">
              <div className="text-slate-500 shrink-0">
                <FolderGit2 size={17} />
              </div>
              <input
                type="text"
                value={inputVal}
                onChange={(e) => {
                  setInputVal(e.target.value);
                  setRepoUrl && setRepoUrl(e.target.value);
                }}
                placeholder="Paste public GitHub URL or local path..."
                className="w-full bg-transparent text-xs sm:text-sm text-slate-100 py-2 sm:py-2.5 outline-none font-mono placeholder:text-slate-500"
                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              />
            </div>
            <button
              onClick={() => handleStart()}
              disabled={loading || !inputVal.trim()}
              className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-sky-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Play size={13} fill="currentColor" />
                  <span>Analyze</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Starter Repositories */}
        <div className="space-y-2 pt-1">
          <div className="text-[10px] sm:text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
            Or launch a quick starter repo
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl mx-auto">
            <button
              onClick={() => {
                const url = 'https://github.com/chubin/wttr.in';
                setInputVal(url);
                handleStart(url);
              }}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-amber-500 text-xs font-medium text-slate-300 hover:text-amber-300 transition-all cursor-pointer group text-left"
            >
              <div className="flex items-center gap-2 truncate">
                <Terminal size={14} className="text-amber-400 shrink-0" />
                <span className="truncate">Python: wttr.in</span>
              </div>
              <ArrowRight size={13} className="text-slate-500 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>

            <button
              onClick={() => {
                setInputVal('../backend');
                handleStart('../backend');
              }}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-sky-500 text-xs font-medium text-slate-300 hover:text-sky-300 transition-all cursor-pointer group text-left"
            >
              <div className="flex items-center gap-2 truncate">
                <Terminal size={14} className="text-sky-400 shrink-0" />
                <span className="truncate">FlowSight Backend (Local)</span>
              </div>
              <ArrowRight size={13} className="text-slate-500 group-hover:text-sky-300 group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>

            <button
              onClick={() => {
                const url = 'https://github.com/passport/express-4.x-local-example';
                setInputVal(url);
                handleStart(url);
              }}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500 text-xs font-medium text-slate-300 hover:text-emerald-300 transition-all cursor-pointer group text-left"
            >
              <div className="flex items-center gap-2 truncate">
                <GitBranch size={14} className="text-emerald-400 shrink-0" />
                <span className="truncate">Express 4.x Auth</span>
              </div>
              <ArrowRight size={13} className="text-slate-500 group-hover:text-emerald-300 group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>

            <button
              onClick={() => {
                const url = 'https://github.com/bradtraversy/mern-auth';
                setInputVal(url);
                handleStart(url);
              }}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-purple-500 text-xs font-medium text-slate-300 hover:text-purple-300 transition-all cursor-pointer group text-left"
            >
              <div className="flex items-center gap-2 truncate">
                <Code2 size={14} className="text-purple-400 shrink-0" />
                <span className="truncate">MERN Auth Starter</span>
              </div>
              <ArrowRight size={13} className="text-slate-500 group-hover:text-purple-300 group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          </div>
        </div>

        {/* Feature Cards Grid (1 column on mobile, 2 on tablet, 4 on desktop) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 pt-2 sm:pt-4 text-left">
          <div className="p-3 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
            <div className="p-1.5 sm:p-2 w-fit rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 mb-2">
              <BookOpen size={15} />
            </div>
            <h3 className="text-xs font-bold text-slate-200 mb-0.5">Simple Story Mode</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Step-by-step interactive walkthrough in plain English. No coding experience needed.
            </p>
          </div>

          <div className="p-3 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
            <div className="p-1.5 sm:p-2 w-fit rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-2">
              <Sparkles size={15} />
            </div>
            <h3 className="text-xs font-bold text-slate-200 mb-0.5">Export README & Guide</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Generate, view, and download full plain English documentation and README for any repository.
            </p>
          </div>

          <div className="p-3 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
            <div className="p-1.5 sm:p-2 w-fit rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2">
              <Code2 size={15} />
            </div>
            <h3 className="text-xs font-bold text-slate-200 mb-0.5">Developer Deep Dive</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              4-level zoom hierarchy (Architecture, Modules, Files, Lineage) with live Monaco editor.
            </p>
          </div>

          <div className="p-3 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
            <div className="p-1.5 sm:p-2 w-fit rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
              <ShieldCheck size={15} />
            </div>
            <h3 className="text-xs font-bold text-slate-200 mb-0.5">Universal Languages</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Analyzes Python, JavaScript, TypeScript, Go, Rust, Java, C#, C/C++, and PHP.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
