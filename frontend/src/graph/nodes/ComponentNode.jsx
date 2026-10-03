import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Atom } from 'lucide-react';

function ComponentNode({ data, selected }) {
  const stateCount = data.metadata?.stateVariables?.length || 0;
  return (
    <div
      className={`px-3.5 py-2.5 rounded-xl bg-slate-900/95 border transition-all duration-200 shadow-md ${
        selected
          ? 'border-indigo-400 ring-2 ring-indigo-400/50 shadow-indigo-500/20'
          : 'border-slate-800 hover:border-slate-700'
      }`}
      style={{ minWidth: 230 }}
    >
      <Handle type="target" position={Position.Left} className="!bg-indigo-400 !w-2.5 !h-2.5" />
      <div className="flex items-center gap-2 mb-1">
        <div className="p-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <Atom size={14} />
        </div>
        <span className="text-[10px] font-semibold tracking-wider text-indigo-400 uppercase">
          React Component
        </span>
      </div>

      <div className="text-xs font-mono font-bold text-slate-100 truncate">
        &lt;{data.name} /&gt;
      </div>

      <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
        <span>{stateCount} useState hooks</span>
        <span>L{data.startLine || 1}</span>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-indigo-400 !w-2.5 !h-2.5" />
    </div>
  );
}

export default memo(ComponentNode);
