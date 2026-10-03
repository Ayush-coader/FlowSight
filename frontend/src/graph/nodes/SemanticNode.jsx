import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Globe,
  Play,
  Server,
  Layers,
  Cpu,
  Database,
  ShieldCheck,
  GitFork,
  Send,
  Navigation,
  Box,
  ArrowRight
} from 'lucide-react';


const TYPE_CONFIG = {
  PAGE: {
    icon: Globe,
    badge: 'PAGE',
    simpleBadge: 'Web Screen',
    color: '#38bdf8', // sky
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    activeBorder: 'border-sky-400 ring-2 ring-sky-400/40 shadow-sky-500/25',
    text: 'text-sky-300'
  },
  USER_ACTION: {
    icon: Play,
    badge: 'USER ACTION',
    simpleBadge: 'User Click',
    color: '#a855f7', // purple
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    activeBorder: 'border-purple-400 ring-2 ring-purple-400/40 shadow-purple-500/25',
    text: 'text-purple-300'
  },
  API: {
    icon: Server,
    badge: 'API',
    simpleBadge: 'API Endpoint',
    color: '#f43f5e', // rose
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    activeBorder: 'border-rose-400 ring-2 ring-rose-400/40 shadow-rose-500/25',
    text: 'text-rose-300'
  },
  CONTROLLER: {
    icon: Layers,
    badge: 'CONTROLLER',
    simpleBadge: 'Request Handler',
    color: '#ec4899', // pink
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/30',
    activeBorder: 'border-pink-400 ring-2 ring-pink-400/40 shadow-pink-500/25',
    text: 'text-pink-300'
  },
  SERVICE: {
    icon: Cpu,
    badge: 'SERVICE',
    simpleBadge: 'Business Logic',
    color: '#8b5cf6', // violet
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    activeBorder: 'border-violet-400 ring-2 ring-violet-400/40 shadow-violet-500/25',
    text: 'text-violet-300'
  },
  DATABASE: {
    icon: Database,
    badge: 'DATABASE',
    simpleBadge: 'Database Query',
    color: '#f59e0b', // amber
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    activeBorder: 'border-amber-400 ring-2 ring-amber-400/40 shadow-amber-500/25',
    text: 'text-amber-300'
  },
  AUTHENTICATION: {
    icon: ShieldCheck,
    badge: 'AUTH',
    simpleBadge: 'Security & Auth',
    color: '#10b981', // emerald
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    activeBorder: 'border-emerald-400 ring-2 ring-emerald-400/40 shadow-emerald-500/25',
    text: 'text-emerald-300'
  },
  DECISION: {
    icon: GitFork,
    badge: 'DECISION',
    simpleBadge: 'Validation Rule',
    color: '#f97316', // orange
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    activeBorder: 'border-orange-400 ring-2 ring-orange-400/40 shadow-orange-500/25',
    text: 'text-orange-300'
  },
  RESPONSE: {
    icon: Send,
    badge: 'RESPONSE',
    simpleBadge: 'Return Result',
    color: '#3b82f6', // blue
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    activeBorder: 'border-blue-400 ring-2 ring-blue-400/40 shadow-blue-500/25',
    text: 'text-blue-300'
  },
  NAVIGATION: {
    icon: Navigation,
    badge: 'NAVIGATION',
    simpleBadge: 'Page Navigation',
    color: '#06b6d4', // cyan
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    activeBorder: 'border-cyan-400 ring-2 ring-cyan-400/40 shadow-cyan-500/25',
    text: 'text-cyan-300'
  },
  DATA: {
    icon: Box,
    badge: 'DATA',
    simpleBadge: 'Data Payload',
    color: '#64748b',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    activeBorder: 'border-slate-400 ring-2 ring-slate-400/40',
    text: 'text-slate-300'
  }
};

function SemanticNode({ data, selected }) {
  const nodeType = data.type?.toUpperCase() || 'SERVICE';
  const cfg = TYPE_CONFIG[nodeType] || TYPE_CONFIG.SERVICE;
  const Icon = cfg.icon;

  const fileName = data.file ? data.file.split('/').pop() : '';
  const location = fileName ? `${fileName}${data.line ? `:${data.line}` : ''}` : '';
  const inputs = data.inputs || [];
  const outputs = data.outputs || [];
  const stepNumber = data.stepNumber;
  const badgeLabel = data.isSimpleMode === false ? cfg.badge : (cfg.simpleBadge || cfg.badge);

  return (
    <div
      className={`px-4 py-3 rounded-2xl bg-[#0d1322]/95 border transition-all duration-200 shadow-xl backdrop-blur-md select-none group cursor-pointer ${
        selected ? cfg.activeBorder : `${cfg.border} hover:border-slate-600 hover:shadow-2xl`
      }`}
      style={{ minWidth: 290, maxWidth: 350 }}
    >
      {/* React Flow Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !border-2 !border-[#070a12]"
        style={{ backgroundColor: cfg.color }}
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !border-2 !border-[#070a12]"
        style={{ backgroundColor: cfg.color }}
      />

      {/* Header: Step Number, Icon, Title & Friendly Badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 overflow-hidden">
          {stepNumber && (
            <div className="w-5 h-5 rounded-full bg-sky-500 text-slate-950 font-mono font-bold text-[10px] flex items-center justify-center shrink-0 shadow-sm">
              {stepNumber}
            </div>
          )}
          <div className={`p-1.5 rounded-xl ${cfg.bg} border ${cfg.border} shrink-0`} style={{ color: cfg.color }}>
            <Icon size={16} />
          </div>
          <span className="text-xs font-bold text-slate-100 tracking-tight leading-snug truncate">
            {data.semanticName || data.name}
          </span>
        </div>

        <span
          className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.text} border ${cfg.border} shrink-0`}
        >
          {badgeLabel}
        </span>
      </div>


      {/* Human Plain-English Description */}
      {data.description && (
        <p className="text-[11px] text-slate-300 leading-relaxed mb-2.5 line-clamp-2">
          {data.description}
        </p>
      )}

      {/* Clean Inputs & Outputs Badges */}
      {(inputs.length > 0 || outputs.length > 0) && (
        <div className="space-y-1.5 py-1.5 px-2.5 rounded-xl bg-[#070a12]/80 border border-slate-800/80 text-[10px] font-mono mb-2">
          {inputs.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] shrink-0">📥 IN:</span>
              <div className="flex flex-wrap gap-1 overflow-hidden">
                {inputs.map((inp, idx) => (
                  <span
                    key={idx}
                    className="px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 truncate max-w-[130px]"
                  >
                    {inp}
                  </span>
                ))}
              </div>
            </div>
          )}

          {outputs.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] shrink-0">📤 OUT:</span>
              <div className="flex flex-wrap gap-1 overflow-hidden">
                {outputs.map((out, idx) => (
                  <span
                    key={idx}
                    className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 truncate max-w-[130px]"
                  >
                    {out}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer: Location info or friendly action indicator */}
      <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/60 text-[10px] text-slate-400 font-mono">
        <span className="truncate max-w-[160px]" title={data.file || ''}>
          {location || 'Flow Step'}
        </span>

        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-0.5 text-sky-400 group-hover:text-sky-300 text-[9px] font-sans font-semibold transition-colors">
            <span>Details</span>
            <ArrowRight size={10} />
          </span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !border-2 !border-[#070a12]"
        style={{ backgroundColor: cfg.color }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !border-2 !border-[#070a12]"
        style={{ backgroundColor: cfg.color }}
      />
    </div>
  );
}

export default memo(SemanticNode);
