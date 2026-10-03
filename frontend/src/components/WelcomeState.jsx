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
    <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 text-center bg-[#070a12] relative overflow-y-auto select-none">
      {/* Background glow orbs */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-sky-600/10 blur-3xl pointer-events-none -top-40 -left-40" />
      <div className="absolute w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-3xl pointer-events-none -bottom-40 -right-40" />

      <div className="max-w-3xl w-full space-y-6 relative z-10 my-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-semibold shadow-sm">
          <Sparkles size={14} className="animate-pulse" />
          <span>Simple, User-Friendly Data Flow & Codebase Explorer</span>
        </div>

        {/* Hero Title */}
        <div className="space-y-2">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-100">
            See How Data Flows in{' '}
            <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              Any Codebase
            </span>
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            Designed for <strong className="text-slate-200">non-technical & technical users alike</strong>. Walk through step-by-step user journeys in plain English, or drill down into deep AST code flows and variables.
          </p>
        </div>

        {/* Central Ingestion Box */}
        <div className="max-w-xl mx-auto p-2 rounded-2xl bg-[#0f172a]/90 border border-slate-800 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <div className="pl-3 text-slate-500">
              <FolderGit2 size={18} />
            </div>
            <input
              type="text"
              value={inputVal}
              onChange={(e) => {
                setInputVal(e.target.value);
                setRepoUrl && setRepoUrl(e.target.value);
              }}
              placeholder="Paste public GitHub URL or local path (e.g., https://github.com/chubin/wttr.in)..."
              className="flex-1 bg-transparent text-xs md:text-sm text-slate-100 py-2.5 outline-none font-mono placeholder:text-slate-500"
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
            />
            <button
              onClick={() => handleStart()}
              disabled={loading || !inputVal.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-slate-950 font-bold text-xs md:text-sm shadow-lg shadow-sky-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Play size={14} fill="currentColor" />
                  <span>Analyze</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Sample Presets */}
        <div className="space-y-2">
          <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
            Or launch a quick starter repo
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button
              onClick={() => {
                const url = 'https://github.com/chubin/wttr.in';
                setInputVal(url);
                handleStart(url);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-amber-500 text-xs font-medium text-slate-300 hover:text-amber-300 transition-all cursor-pointer group"
            >
              <Terminal size={14} className="text-amber-400" />
              <span>Python: wttr.in Repo</span>
              <ArrowRight size={13} className="text-slate-500 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all" />
            </button>

            <button
              onClick={() => {
                setInputVal('../backend');
                handleStart('../backend');
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-sky-500 text-xs font-medium text-slate-300 hover:text-sky-300 transition-all cursor-pointer group"
            >
              <Terminal size={14} className="text-sky-400" />
              <span>FlowSight Backend (Local)</span>
              <ArrowRight size={13} className="text-slate-500 group-hover:text-sky-300 group-hover:translate-x-0.5 transition-all" />
            </button>

            <button
              onClick={() => {
                const url = 'https://github.com/passport/express-4.x-local-example';
                setInputVal(url);
                handleStart(url);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500 text-xs font-medium text-slate-300 hover:text-emerald-300 transition-all cursor-pointer group"
            >
              <GitBranch size={14} className="text-emerald-400" />
              <span>Express 4.x Auth</span>
              <ArrowRight size={13} className="text-slate-500 group-hover:text-emerald-300 group-hover:translate-x-0.5 transition-all" />
            </button>

            <button
              onClick={() => {
                const url = 'https://github.com/bradtraversy/mern-auth';
                setInputVal(url);
                handleStart(url);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-purple-500 text-xs font-medium text-slate-300 hover:text-purple-300 transition-all cursor-pointer group"
            >
              <Code2 size={14} className="text-purple-400" />
              <span>MERN Auth Starter</span>
              <ArrowRight size={13} className="text-slate-500 group-hover:text-purple-300 group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 text-left">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
            <div className="p-2 w-fit rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 mb-2.5">
              <BookOpen size={16} />
            </div>
            <h3 className="text-xs font-bold text-slate-200 mb-1">Simple Story Mode</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Step-by-step interactive walkthrough in plain English. No coding experience needed.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
            <div className="p-2 w-fit rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-2.5">
              <Sparkles size={16} />
            </div>
            <h3 className="text-xs font-bold text-slate-200 mb-1">Export README & Guide</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Generate, view, and download full plain English documentation and README for any repository.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
            <div className="p-2 w-fit rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2.5">
              <Code2 size={16} />
            </div>
            <h3 className="text-xs font-bold text-slate-200 mb-1">Developer Deep Dive</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              4-level zoom hierarchy (Architecture, Modules, Files, Lineage) with live Monaco editor.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
            <div className="p-2 w-fit rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2.5">
              <ShieldCheck size={16} />
            </div>
            <h3 className="text-xs font-bold text-slate-200 mb-1">Universal Languages</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Analyzes Python, JavaScript, TypeScript, Go, Rust, Java, C#, C/C++, and PHP.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

