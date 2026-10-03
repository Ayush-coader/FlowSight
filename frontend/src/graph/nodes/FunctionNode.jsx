import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

function FunctionNode({ data, selected }) {
  const fileName = data.file ? `${data.file.split('/').pop()}` : '';
  const location = fileName ? `${fileName}:${data.startLine || 1}` : '';
  const paramStr = data.params && data.params.length > 0 ? `(${data.params.join(', ')})` : '()';

  return (
    <div
      className={`px-3 py-2 rounded-lg bg-[#0f172a] border transition-all duration-200 shadow-sm ${
        selected
          ? 'border-purple-400 ring-2 ring-purple-400/40 shadow-purple-500/20'
          : 'border-purple-500/30 hover:border-purple-400/60'
      }`}
      style={{ minWidth: 220, maxWidth: 280 }}
    >
      <Handle type="target" position={Position.Top} className="!bg-purple-400 !w-2 !h-2" />
      <Handle type="target" position={Position.Left} className="!bg-purple-400 !w-2 !h-2" />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span className="text-purple-400 text-xs font-serif font-bold italic">ƒ</span>
          <span className="text-xs font-mono font-bold text-slate-100 truncate">
            {data.name}
            <span className="text-slate-400 font-normal">{paramStr}</span>
          </span>
        </div>
        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-purple-500/10 text-purple-300 border border-purple-500/30 shrink-0">
          Function
        </span>
      </div>

      <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400 font-mono">
        <span className="truncate">{location}</span>
        {data.metadata?.isAsync && (
          <span className="text-amber-400 font-sans text-[9px]">async</span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-purple-400 !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-purple-400 !w-2 !h-2" />
    </div>
  );
}

export default memo(FunctionNode);
