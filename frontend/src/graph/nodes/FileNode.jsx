import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { FileCode, CheckCircle2, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';

function FileNode({ data, selected }) {
  const statusIcon = () => {
    if (data.analysisStatus === 'analyzed') {
      return <CheckCircle2 size={13} className="text-emerald-400" title="Analyzed" />;
    }
    if (data.analysisStatus === 'partial') {
      return <AlertTriangle size={13} className="text-amber-400" title="Partially Analyzed" />;
    }
    return <XCircle size={13} className="text-rose-400" title="Analysis Skipped/Failed" />;
  };

  return (
    <div
      className={`px-3.5 py-3 rounded-xl bg-slate-900/95 border transition-all duration-200 backdrop-blur-md shadow-md group cursor-pointer ${
        selected
          ? 'border-cyan-400 ring-2 ring-cyan-400/40 shadow-cyan-500/20'
          : 'border-slate-800 hover:border-cyan-500/60'
      }`}
      style={{ minWidth: 240 }}
    >
      <Handle type="target" position={Position.Top} className="!bg-cyan-400 !w-2.5 !h-2.5" />
      <Handle type="target" position={Position.Left} className="!bg-cyan-400 !w-2.5 !h-2.5" />

      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="p-1.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
            <FileCode size={16} />
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-bold text-slate-100 truncate group-hover:text-cyan-200 transition-colors">{data.name}</div>
            <div className="text-[10px] text-slate-400 truncate">{data.file}</div>
          </div>
        </div>
        {statusIcon()}
      </div>

      <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/60 text-[10px] text-slate-400 font-mono">
        <span className="flex items-center gap-1.5">
          {data.language && (
            <span className="px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 text-[9px] font-mono uppercase font-semibold border border-cyan-500/20">
              {data.language}
            </span>
          )}
          <span>{data.functionCount || 0} fns</span>
        </span>
        <span className="flex items-center gap-1 text-slate-500 group-hover:text-cyan-400 transition-colors">
          <span>{data.importCount || 0} imports</span>
          <ArrowRight size={10} className="hidden group-hover:inline" />
        </span>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-cyan-400 !w-2.5 !h-2.5" />
      <Handle type="source" position={Position.Right} className="!bg-cyan-400 !w-2.5 !h-2.5" />
    </div>
  );
}

export default memo(FileNode);
