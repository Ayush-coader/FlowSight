import { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  BookOpen,
  Zap,
  Globe,
  Server,
  Database,
  ShieldCheck,
  Send,
  Layers
} from 'lucide-react';

const STEP_ICONS = {
  PAGE: Globe,
  USER_ACTION: Play,
  API: Server,
  CONTROLLER: Layers,
  SERVICE: Zap,
  DATABASE: Database,
  AUTHENTICATION: ShieldCheck,
  RESPONSE: Send
};

export default function DataFlowStoryWalkthrough({
  graphData,
  currentStepIndex = 0,
  onStepChange,
  onSelectNode,
  onOpenStorySummary
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const playSpeed = 2000; // 2 seconds per step


  // Build the chronological flow story from applicationFlow or nodes
  const storySteps = useMemo(() => {
    if (!graphData?.nodes) return [];

    // Check if graph has predefined applicationFlow
    if (graphData.applicationFlow?.nodes?.length > 0) {
      return graphData.applicationFlow.nodes;
    }

    // Filter L1 / Semantic nodes in logical order
    const semanticNodes = graphData.nodes.filter(
      (n) =>
        n.level === 'L1' ||
        n.type === 'PAGE' ||
        n.type === 'USER_ACTION' ||
        n.type === 'API' ||
        n.type === 'CONTROLLER' ||
        n.type === 'SERVICE' ||
        n.type === 'AUTHENTICATION' ||
        n.type === 'DATABASE' ||
        n.type === 'DECISION' ||
        n.type === 'RESPONSE'
    );

    if (semanticNodes.length > 0) {
      return semanticNodes;
    }

    // Fallback to top modules / files
    return graphData.nodes.slice(0, 7);
  }, [graphData]);

  // Auto-play timer
  useEffect(() => {
    let timer = null;
    if (isPlaying && storySteps.length > 0) {
      timer = setInterval(() => {
        onStepChange((prev) => {
          const next = (prev + 1) % storySteps.length;
          const targetNode = storySteps[next];
          if (targetNode && onSelectNode) {
            onSelectNode(targetNode);
          }
          return next;
        });
      }, playSpeed);
    } else {
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [isPlaying, storySteps, playSpeed, onStepChange, onSelectNode]);

  // Keyboard left/right arrow shortcut for steps
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      if (
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.isContentEditable
      ) {
        return;
      }

      if (e.key === 'ArrowRight' && !e.shiftKey) {
        if (currentStepIndex < storySteps.length - 1) {
          const next = currentStepIndex + 1;
          onStepChange(next);
          if (storySteps[next] && onSelectNode) onSelectNode(storySteps[next]);
        }
      } else if (e.key === 'ArrowLeft' && !e.shiftKey) {
        if (currentStepIndex > 0) {
          const prev = currentStepIndex - 1;
          onStepChange(prev);
          if (storySteps[prev] && onSelectNode) onSelectNode(storySteps[prev]);
        }
      } else if (e.key === ' ' && e.ctrlKey) {
        setIsPlaying((p) => !p);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStepIndex, storySteps, onStepChange, onSelectNode]);

  if (!storySteps || storySteps.length === 0) return null;

  const currentStep = storySteps[currentStepIndex] || storySteps[0];
  const StepIcon = (currentStep && STEP_ICONS[currentStep.type?.toUpperCase()]) || Zap;

  const progressPercent = ((currentStepIndex + 1) / storySteps.length) * 100;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-[96%] max-w-4xl select-none transition-all duration-300">
      <div className="bg-[#0b101e]/95 border border-sky-500/40 rounded-2xl p-3 sm:p-4 shadow-2xl shadow-sky-950/60 backdrop-blur-2xl">
        {/* Top Progress Bar */}
        <div className="w-full bg-slate-800/80 h-1.5 rounded-full mb-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-sky-400 via-indigo-400 to-cyan-300 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Main Content Layout */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          {/* Left: Step Info & Plain English Story */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Step Number & Icon Badge */}
            <div className="flex flex-col items-center shrink-0">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/50 flex items-center justify-center text-sky-300 shadow-md shadow-sky-500/20">
                <StepIcon size={20} />
              </div>
              <span className="text-[10px] font-mono font-bold text-sky-400 mt-1">
                Step {currentStepIndex + 1}/{storySteps.length}
              </span>
            </div>

            {/* Step Story Narrative */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm sm:text-base font-bold text-slate-100 truncate">
                  {currentStep.semanticName || currentStep.name}
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-sky-500/10 text-sky-300 border border-sky-500/30 uppercase">
                  {currentStep.type || 'STEP'}
                </span>
              </div>

              <p className="text-xs text-slate-300/90 leading-relaxed mt-1 line-clamp-2 sm:line-clamp-1">
                {currentStep.description ||
                  `In this step, data is processed by ${currentStep.semanticName || currentStep.name} in the system.`}
              </p>

              {/* Data tags moving in this step */}
              {(currentStep.inputs?.length > 0 || currentStep.outputs?.length > 0) && (
                <div className="flex items-center gap-1.5 mt-1.5 overflow-x-auto scrollbar-none text-[10px]">
                  <span className="text-slate-400 font-semibold shrink-0">Data:</span>
                  {currentStep.inputs?.map((inp, idx) => (
                    <span
                      key={`in-${idx}`}
                      className="px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 shrink-0 font-mono"
                    >
                      📥 {inp}
                    </span>
                  ))}
                  {currentStep.outputs?.map((out, idx) => (
                    <span
                      key={`out-${idx}`}
                      className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 shrink-0 font-mono"
                    >
                      📤 {out}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Stepper & Playback Controls */}
          <div className="flex items-center gap-2 self-end md:self-center shrink-0 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-800/80 pt-2 md:pt-0">
            {/* Step Navigator Buttons */}
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => {
                  const prev = Math.max(0, currentStepIndex - 1);
                  onStepChange(prev);
                  if (storySteps[prev] && onSelectNode) onSelectNode(storySteps[prev]);
                }}
                disabled={currentStepIndex <= 0}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Previous Step (Left Arrow)"
              >
                <SkipBack size={14} />
              </button>

              <button
                onClick={() => setIsPlaying((p) => !p)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isPlaying
                    ? 'bg-sky-400 text-slate-950 shadow-md shadow-sky-400/30'
                    : 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30'
                }`}
                title={isPlaying ? 'Pause Auto Walkthrough' : 'Play Flow Story Walkthrough'}
              >
                {isPlaying ? <Pause size={13} /> : <Play size={13} fill="currentColor" />}
                <span>{isPlaying ? 'Pause' : 'Auto Play'}</span>
              </button>

              <button
                onClick={() => {
                  const next = Math.min(storySteps.length - 1, currentStepIndex + 1);
                  onStepChange(next);
                  if (storySteps[next] && onSelectNode) onSelectNode(storySteps[next]);
                }}
                disabled={currentStepIndex >= storySteps.length - 1}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Next Step (Right Arrow)"
              >
                <SkipForward size={14} />
              </button>
            </div>

            {/* Read Complete Story Button */}
            {onOpenStorySummary && (
              <button
                onClick={onOpenStorySummary}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                title="Open Complete Data Flow Summary in Plain English"
              >
                <BookOpen size={14} />
                <span className="hidden sm:inline">Story Summary</span>
              </button>
            )}
          </div>
        </div>

        {/* Step dots clickable strip */}
        <div className="flex items-center justify-center gap-1.5 pt-2.5 mt-2 border-t border-slate-800/60 overflow-x-auto scrollbar-none">
          {storySteps.map((step, idx) => {
            const isCurrent = idx === currentStepIndex;
            const isPassed = idx < currentStepIndex;
            return (
              <button
                key={idx}
                onClick={() => {
                  onStepChange(idx);
                  if (storySteps[idx] && onSelectNode) onSelectNode(storySteps[idx]);
                }}
                className={`group relative flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-sky-400 text-slate-950 font-bold shadow-md shadow-sky-400/40 scale-105 ring-1 ring-sky-300'
                    : isPassed
                    ? 'bg-slate-900 text-sky-400/80 border border-sky-500/20 hover:bg-slate-800'
                    : 'bg-slate-900/60 text-slate-500 border border-slate-800 hover:text-slate-300'
                }`}
                title={`Jump to Step ${idx + 1}: ${step.semanticName || step.name}`}
              >
                <span>#{idx + 1}</span>
                <span className="truncate max-w-[80px] hidden md:inline">
                  {step.semanticName || step.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
