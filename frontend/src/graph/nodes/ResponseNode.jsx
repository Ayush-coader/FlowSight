import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

function ResponseNode({ data, selected }) {
  const filePath = data.file ? `${data.file.split('/').pop()}` : '';

  return (
    <div
      className={`px-3 py-2 rounded-lg bg-[#0f172a] border transition-all duration-200 shadow-sm ${
        selected
          ? 'border-blue-400 ring-2 ring-blue-400/40 shadow-blue-500/20'
          : 'border-blue-500/30 hover:border-blue-400/60'
      }`}
      style={{ minWidth: 210, maxWidth: 280 }}
    >
      <Handle type="target" position={Position.Top} className="!bg-blue-400 !w-2 !h-2" />
      <Handle type="target" position={Position.Left} className="!bg-blue-400 !w-2 !h-2" />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span className="text-blue-400 text-xs">▣</span>
          <span className="text-xs font-mono font-bold text-blue-200 truncate">{data.name}</span>
        </div>
        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-blue-500/10 text-blue-300 border border-blue-500/30 shrink-0">
          Response
        </span>
      </div>

      {filePath && (
        <div className="mt-1 text-[10px] text-slate-400 font-mono truncate">
          {filePath}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-blue-400 !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-blue-400 !w-2 !h-2" />
    </div>
  );
}

export default memo(ResponseNode);
