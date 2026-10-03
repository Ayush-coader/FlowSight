import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

function DatabaseNode({ data, selected }) {
  const fileName = data.file ? `${data.file.split('/').pop()}` : '';
  const location = fileName ? `${fileName}:${data.startLine || 1}` : '';

  return (
    <div
      className={`px-3 py-2 rounded-lg bg-[#0f172a] border transition-all duration-200 shadow-sm ${
        selected
          ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-amber-500/20'
          : 'border-amber-500/30 hover:border-amber-400/60'
      }`}
      style={{ minWidth: 220, maxWidth: 280 }}
    >
      <Handle type="target" position={Position.Top} className="!bg-amber-400 !w-2 !h-2" />
      <Handle type="target" position={Position.Left} className="!bg-amber-400 !w-2 !h-2" />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span className="text-amber-400 text-xs">◉</span>
          <span className="text-xs font-mono font-bold text-amber-200 truncate">{data.name}</span>
        </div>
        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30 shrink-0">
          Database
        </span>
      </div>

      <div className="mt-1 text-[10px] text-slate-400 font-mono truncate">
        {location}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-amber-400 !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-amber-400 !w-2 !h-2" />
    </div>
  );
}

export default memo(DatabaseNode);
