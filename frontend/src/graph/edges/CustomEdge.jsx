import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from '@xyflow/react';

function CustomEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style = {},
  markerEnd
}) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 14
  });

  const isTraceActive = data?.isTraceActive;
  const isFaded = data?.isFaded;
  const confidence = data?.confidence;
  const type = data?.type;

  const isYesBranch = data?.label?.startsWith('Yes');
  const isNoBranch = data?.label?.startsWith('No');

  const edgeColor = {
    APPLICATION_DATA_FLOW: '#38bdf8', // sky/cyan
    DATA_FLOW: '#06b6d4', // cyan
    FUNCTION_CALL: '#a855f7', // purple
    API_ROUTE: '#f43f5e', // rose
    DATABASE_OPERATION: '#eab308', // amber
    RETURN_FLOW: '#3b82f6', // blue
    MODULE_DEPENDENCY: '#6366f1', // indigo
    IMPORT: '#64748b', // slate
    COMPONENT_RENDER: '#818cf8',
    LOGIC_FLOW: '#f59e0b', // amber
    CONDITIONAL_BRANCH: isYesBranch ? '#10b981' : isNoBranch ? '#f43f5e' : '#f59e0b'
  }[type] || '#38bdf8';

  const particleColor = isTraceActive
    ? '#38bdf8'
    : type === 'APPLICATION_DATA_FLOW'
    ? '#38bdf8'
    : type === 'DATA_FLOW'
    ? '#22d3ee'
    : type === 'API_ROUTE'
    ? '#fb7185'
    : type === 'DATABASE_OPERATION'
    ? '#fbbf24'
    : type === 'RETURN_FLOW'
    ? '#60a5fa'
    : type === 'FUNCTION_CALL'
    ? '#c084fc'
    : type === 'LOGIC_FLOW'
    ? '#fbbf24'
    : type === 'CONDITIONAL_BRANCH'
    ? isYesBranch
      ? '#34d399'
      : '#f87171'
    : '#818cf8';

  const shouldAnimateParticles = !isFaded;

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        className={isTraceActive ? 'edge-trace-active' : isFaded ? 'edge-faded' : ''}
        style={{
          ...style,
          stroke: isTraceActive ? '#38bdf8' : isFaded ? '#1e293b' : edgeColor,
          strokeWidth: isTraceActive ? 2.8 : 1.8,
          opacity: isFaded ? 0.15 : 0.85
        }}
      />

      {/* Moving Data Packet: Circle with Directional Arrow */}
      {shouldAnimateParticles && (
        <g>
          {/* Primary Traveling Data Packet (Circle + Directional Arrow) */}
          <g style={{ filter: `drop-shadow(0 0 6px ${particleColor})` }}>
            <animateMotion
              path={edgePath}
              dur={isTraceActive ? '1.2s' : '2.2s'}
              repeatCount="indefinite"
              rotate="auto"
            />
            {/* Glowing outer aura */}
            <circle r={isTraceActive ? 8 : 6.5} fill={particleColor} opacity={0.35} />
            {/* Solid core circle */}
            <circle r={isTraceActive ? 5.5 : 4.5} fill={particleColor} stroke="#070a12" strokeWidth={1} />
            {/* Directional arrow pointing forward along the path */}
            <path
              d="M -2.5 -2.5 L 2.5 0 L -2.5 2.5 Z"
              fill="#070a12"
              stroke="#070a12"
              strokeWidth={0.5}
            />
          </g>

          {/* Secondary trailing pulse dot */}
          <g opacity={0.65} style={{ filter: `drop-shadow(0 0 4px ${particleColor})` }}>
            <animateMotion
              path={edgePath}
              dur={isTraceActive ? '1.2s' : '2.2s'}
              begin={isTraceActive ? '0.6s' : '1.1s'}
              repeatCount="indefinite"
              rotate="auto"
            />
            <circle r={isTraceActive ? 4 : 3} fill={particleColor} />
            <path
              d="M -1.5 -1.5 L 1.5 0 L -1.5 1.5 Z"
              fill="#070a12"
            />
          </g>
        </g>
      )}

      {/* Floating Edge Label Tag */}
      {data?.label && !isFaded && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all'
            }}
            className={`nodrag nopan px-2 py-0.5 rounded-md border text-[10px] font-mono shadow-lg flex items-center gap-1.5 transition-all backdrop-blur-md ${
              isYesBranch
                ? 'bg-emerald-950/95 border-emerald-500/60 text-emerald-300 ring-1 ring-emerald-500/30'
                : isNoBranch
                ? 'bg-rose-950/95 border-rose-500/60 text-rose-300 ring-1 ring-rose-500/30'
                : isTraceActive
                ? 'bg-[#0b1329]/95 border-sky-400 text-sky-200 ring-2 ring-sky-400/40 shadow-sky-500/30'
                : 'bg-[#0b0f19]/95 border-slate-700/80 text-slate-200'
            }`}
          >
            {isTraceActive && <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping shrink-0" />}
            {isYesBranch ? (
              <span className="text-emerald-400 font-bold text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 border border-emerald-500/40">YES</span>
            ) : isNoBranch ? (
              <span className="text-rose-400 font-bold text-[9px] px-1 py-0.2 rounded bg-rose-500/20 border border-rose-500/40">NO</span>
            ) : (
              <span className="text-[11px] select-none">📦</span>
            )}
            <span className="font-semibold tracking-tight">{data.label}</span>
            {confidence && !isYesBranch && !isNoBranch && (
              <span
                className={`px-1 py-0.2 rounded text-[8px] font-bold ${
                  confidence.level === 'CONFIRMED'
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
                title={confidence.reason || 'Confidence score'}
              >
                {Math.round((confidence.score || 0.9) * 100)}%
              </span>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default memo(CustomEdge);
