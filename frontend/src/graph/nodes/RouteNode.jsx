import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

function RouteNode({ data, selected }) {
  const fileName = data.file ? `${data.file.split('/').pop()}` : '';
  const location = fileName ? `${fileName}:${data.startLine || 1}` : '';
  const method = data.metadata?.method || 'GET';
  const path = data.metadata?.path || data.name;

  return (
    <div
      className={`px-3 py-2 rounded-lg bg-[#0f172a] border transition-all duration-200 shadow-sm ${
        selected
          ? 'border-rose-400 ring-2 ring-rose-400/40 shadow-rose-500/20'
          : 'border-rose-500/30 hover:border-rose-400/60'
      }`}
      style={{ minWidth: 230, maxWidth: 300 }}
    >
      <Handle type="target" position={Position.Top} className="!bg-rose-400 !w-2 !h-2" />
      <Handle type="target" position={Position.Left} className="!bg-rose-400 !w-2 !h-2" />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span className="text-rose-400 text-xs">◎</span>
          <span className="text-xs font-mono font-bold text-rose-200 truncate">
            <span className="text-rose-400 font-extrabold mr-1">{method}</span>
            {path}
          </span>
        </div>
        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-rose-500/10 text-rose-300 border border-rose-500/30 shrink-0">
          API
        </span>
      </div>

      <div className="mt-1 text-[10px] text-slate-400 font-mono truncate">
        {location}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-rose-400 !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-rose-400 !w-2 !h-2" />
    </div>
  );
}

export default memo(RouteNode);
