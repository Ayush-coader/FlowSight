import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { GitFork } from 'lucide-react';

function ConditionNode({ data, selected }) {
  const title = data.semanticName || data.name || 'Decision';
  const testExpr = data.technicalExpression || data.metadata?.test || data.name || 'condition';

  return (
    <div
      className={`px-3.5 py-3 rounded-xl bg-[#0f172a]/95 border transition-all duration-200 shadow-xl backdrop-blur-md ${
        selected
          ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-amber-500/20'
          : 'border-amber-500/40 hover:border-amber-400/80 hover:shadow-amber-500/10'
      }`}
      style={{ minWidth: 240, maxWidth: 300 }}
    >
      <Handle type="target" position={Position.Top} className="!bg-amber-400 !w-2.5 !h-2.5" />
      <Handle type="target" position={Position.Left} className="!bg-amber-400 !w-2.5 !h-2.5" />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
            <GitFork size={13} />
          </div>
          <span className="text-xs font-bold text-amber-200 tracking-tight leading-snug truncate">
            {title}
          </span>
        </div>
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30 shrink-0">
          DECISION
        </span>
      </div>

      {data.description && (
        <p className="text-[11px] text-slate-300/90 leading-tight mt-1.5 mb-1">
          {data.description}
        </p>
      )}

      <div className="mt-1.5 p-1.5 rounded-md bg-slate-900/90 border border-slate-800 text-[11px] font-mono font-semibold text-amber-300/90 break-words">
        {testExpr.startsWith('if') ? testExpr : `if (${testExpr})`}
      </div>

      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800/80 text-[10px] font-mono">
        <span className="text-emerald-400 flex items-center gap-0.5 font-bold">
          <span>✓</span> Yes (True)
        </span>
        <span className="text-rose-400 flex items-center gap-0.5 font-bold">
          <span>✗</span> No (False)
        </span>
      </div>

      {/* Outflow handles for branches */}
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-400 !w-2.5 !h-2.5" id="yes" />
      <Handle type="source" position={Position.Right} className="!bg-rose-400 !w-2.5 !h-2.5" id="no" />
    </div>
  );
}

export default memo(ConditionNode);
