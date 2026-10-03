import { useState, useEffect, Fragment } from 'react';
import { X, ArrowRight, Play, Pause, SkipForward, SkipBack, Zap } from 'lucide-react';

export default function DataTraceToolbar({
  activeTrace,
  availableVariables = [],
  onSelectVariable,
  onClearTrace,
  onStepChange,
  currentStepIndex = 0
}) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Auto-play simulation interval
  useEffect(() => {
    let timer = null;
    if (isPlaying && activeTrace?.path?.length > 0) {
      timer = setInterval(() => {
        onStepChange && onStepChange((prev) => (prev + 1) % activeTrace.path.length);
      }, 1400);
    } else {
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [isPlaying, activeTrace, onStepChange]);

  if (!activeTrace && availableVariables.length === 0) return null;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#0b101d]/95 border border-cyan-500/40 shadow-2xl shadow-cyan-950/40 backdrop-blur-xl max-w-3xl w-[94%] sm:w-auto select-none transition-all duration-300">
      {/* Brand & Mode Indicator */}
      <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs shrink-0">
        <div className="p-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 animate-pulse">
          <Zap size={14} />
        </div>
        <span className="hidden sm:inline font-mono tracking-tight">Data Trace:</span>
      </div>

      {/* Variable selector dropdown */}
      <div className="flex items-center gap-1.5 shrink-0">
        <select
          value={activeTrace?.variable || ''}
          onChange={(e) => {
            setIsPlaying(false);
            onSelectVariable(e.target.value);
          }}
          className="bg-slate-900/90 text-xs text-cyan-300 font-mono font-semibold px-3 py-1.5 rounded-xl border border-slate-700 outline-none focus:border-cyan-400 cursor-pointer shadow-inner"
        >
          <option value="">Trace variable ({availableVariables.length} available)...</option>
          {availableVariables.map((v) => (
            <option key={v} value={v}>
              ${v}
            </option>
          ))}
        </select>
      </div>

      {/* Play / Simulation Controls */}
      {activeTrace && activeTrace.path?.length > 0 && (
        <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => onStepChange && onStepChange((prev) => Math.max(0, prev - 1))}
            disabled={currentStepIndex <= 0}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Step Backward"
          >
            <SkipBack size={12} />
          </button>

          <button
            onClick={() => setIsPlaying((p) => !p)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              isPlaying
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-cyan-300'
            }`}
            title={isPlaying ? 'Pause Simulation' : 'Play Live Data Flow'}
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} fill="currentColor" />}
            <span className="hidden sm:inline">{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            onClick={() => onStepChange && onStepChange((prev) => Math.min(activeTrace.path.length - 1, prev + 1))}
            disabled={currentStepIndex >= activeTrace.path.length - 1}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Step Forward"
          >
            <SkipForward size={12} />
          </button>
        </div>
      )}

      {/* Active Step Indicator / Path Chips */}
      {activeTrace && activeTrace.path && activeTrace.path.length > 0 ? (
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none max-w-[280px] lg:max-w-md">
          {activeTrace.path.map((step, idx) => (
            <Fragment key={idx}>
              <div
                onClick={() => onStepChange && onStepChange(idx)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-mono transition-all duration-200 shrink-0 cursor-pointer ${
                  idx === currentStepIndex
                    ? 'bg-cyan-400 text-slate-950 font-bold shadow-md shadow-cyan-400/30 ring-2 ring-cyan-300 scale-105'
                    : idx < currentStepIndex
                    ? 'bg-slate-900 text-cyan-400/80 border border-cyan-500/20'
                    : 'bg-slate-900/60 text-slate-500 border border-slate-800'
                }`}
                title={step.name || step.id}
              >
                <span className="truncate max-w-[90px]">{step.semanticName || step.name || step.id}</span>
              </div>
              {idx < activeTrace.path.length - 1 && (
                <ArrowRight size={10} className="text-slate-600 shrink-0" />
              )}
            </Fragment>
          ))}
        </div>
      ) : (
        <div className="hidden md:block text-[11px] text-slate-400 italic truncate max-w-xs">
          Select any variable to trace its complete data trajectory.
        </div>
      )}

      {/* Clear Button */}
      {activeTrace && (
        <button
          onClick={() => {
            setIsPlaying(false);
            onClearTrace();
          }}
          className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors shrink-0"
          title="Clear Data Trace"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
