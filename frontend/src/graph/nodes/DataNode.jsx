import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

function DataNode({ data, selected }) {
  const varName = data.name || data.metadata?.variable || 'data';
  const filePath = data.file ? `${data.file.split('/').pop()}` : '';

  return (
    <div
      className={`px-3 py-2 rounded-lg bg-[#0f172a] border transition-all duration-200 shadow-sm ${
        selected
          ? 'border-cyan-400 ring-2 ring-cyan-400/40 shadow-cyan-500/20'
          : 'border-cyan-500/30 hover:border-cyan-400/60'
      }`}
      style={{ minWidth: 200, maxWidth: 260 }}
    >
      <Handle type="target" position={Position.Top} className="!bg-cyan-400 !w-2 !h-2" />
      <Handle type="target" position={Position.Left} className="!bg-cyan-400 !w-2 !h-2" />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span className="text-cyan-400 text-xs font-mono">▣</span>
          <span className="text-xs font-mono font-bold text-cyan-200 truncate">{varName}</span>
        </div>
        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shrink-0">
          Data
        </span>
      </div>

      {filePath && (
        <div className="mt-1 text-[10px] text-slate-400 font-mono truncate">
          {filePath}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-cyan-400 !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-cyan-400 !w-2 !h-2" />
    </div>
  );
}

export default memo(DataNode);
