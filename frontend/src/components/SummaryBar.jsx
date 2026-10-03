import { FileCode, Code2, Globe, Database, Route, ShieldCheck } from 'lucide-react';

export default function SummaryBar({ summary, repositoryName, totalEdges = 0 }) {
  if (!summary) return null;

  return (
    <div className="h-10 bg-slate-900/90 border-b border-slate-800/80 px-4 flex items-center justify-between text-xs text-slate-400 select-none backdrop-blur-md">
      <div className="flex items-center gap-4">
        <span className="font-semibold text-slate-200 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          {repositoryName || 'Repository'}
        </span>

        <div className="h-3.5 w-px bg-slate-800" />

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-slate-300">
            <FileCode size={13} className="text-cyan-400" />
            <span>{summary.fileCount || 0} Files</span>
          </div>

          <div className="flex items-center gap-1 text-slate-300">
            <Code2 size={13} className="text-sky-400" />
            <span>{summary.functionCount || 0} Functions</span>
          </div>

          {summary.routeCount > 0 && (
            <div className="flex items-center gap-1 text-slate-300">
              <Globe size={13} className="text-emerald-400" />
              <span>{summary.routeCount} API Endpoints</span>
            </div>
          )}

          {summary.dbOpCount > 0 && (
            <div className="flex items-center gap-1 text-slate-300">
              <Database size={13} className="text-amber-400" />
              <span>{summary.dbOpCount} DB Operations</span>
            </div>
          )}

          <div className="flex items-center gap-1 text-slate-300">
            <Route size={13} className="text-indigo-400" />
            <span>{totalEdges} Relationships & Flows</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium">
          <ShieldCheck size={12} />
          <span>AST Deterministic Engine</span>
        </span>
      </div>
    </div>
  );
}
