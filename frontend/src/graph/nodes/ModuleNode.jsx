import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Folder, Layers, ArrowRight } from 'lucide-react';

function ModuleNode({ data, selected }) {
  return (
    <div
      className={`px-4 py-3.5 rounded-xl bg-slate-900/95 border transition-all duration-200 backdrop-blur-md shadow-lg cursor-pointer group hover:scale-[1.02] ${
        selected
          ? 'border-indigo-400 ring-2 ring-indigo-400/40 shadow-indigo-500/20'
          : 'border-slate-800 hover:border-indigo-500/70 hover:shadow-indigo-500/10'
      }`}
      style={{ minWidth: 260 }}
    >
      <Handle type="target" position={Position.Left} className="!bg-indigo-400 !w-2.5 !h-2.5" />
      <Handle type="target" position={Position.Top} className="!bg-indigo-400 !w-2.5 !h-2.5" />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
            <Folder size={18} />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">Module</div>
            <div className="text-sm font-bold text-slate-100 group-hover:text-indigo-200 transition-colors">{data.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/90 border border-slate-700/60 text-xs text-slate-300 font-mono font-medium">
          <Layers size={12} className="text-indigo-400" />
          <span>{data.fileCount || (data.files ? data.files.length : 0)} files</span>
        </div>
      </div>

      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 group-hover:text-indigo-300 transition-colors font-medium">
        <span>Explore Module Flow (L2)</span>
        <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
      </div>

      <Handle type="source" position={Position.Right} className="!bg-indigo-400 !w-2.5 !h-2.5" />
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-400 !w-2.5 !h-2.5" />
    </div>
  );
}

export default memo(ModuleNode);
