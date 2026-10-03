import {
  X,
  Sparkles,
  Globe,
  Server,
  Database,
  ShieldCheck,
  Send,
  Zap,
  Layers,
  Play,
  FileText
} from 'lucide-react';

const TYPE_CONFIG = {
  PAGE: { icon: Globe, color: 'text-sky-400 bg-sky-500/10 border-sky-500/30', label: 'User Screen' },
  USER_ACTION: { icon: Play, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30', label: 'User Trigger' },
  API: { icon: Server, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30', label: 'API Endpoint' },
  CONTROLLER: { icon: Layers, color: 'text-pink-400 bg-pink-500/10 border-pink-500/30', label: 'Request Controller' },
  SERVICE: { icon: Zap, color: 'text-violet-400 bg-violet-500/10 border-violet-500/30', label: 'Business Logic' },
  DATABASE: { icon: Database, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', label: 'Database Storage' },
  AUTHENTICATION: { icon: ShieldCheck, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', label: 'Security & Auth' },
  RESPONSE: { icon: Send, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30', label: 'Response to User' }
};

export default function DataFlowStoryModal({
  isOpen,
  onClose,
  graphData,
  onSelectStep,
  onOpenReadme
}) {
  if (!isOpen || !graphData) return null;

  const steps =
    graphData.applicationFlow?.nodes ||
    graphData.nodes.filter(
      (n) =>
        n.level === 'L1' ||
        n.type === 'PAGE' ||
        n.type === 'API' ||
        n.type === 'SERVICE' ||
        n.type === 'DATABASE' ||
        n.type === 'RESPONSE'
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md select-none animate-in fade-in duration-200 safe-pb">
      <div className="bg-[#0b101e] border border-sky-500/30 rounded-2xl w-full max-w-3xl max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-3.5 sm:p-5 border-b border-slate-800 bg-[#070a12]/90 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-400 shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>Data Flow Journey in Plain English</span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 line-clamp-1">
                A simple explanation of how data travels through {graphData.repositoryName || 'this system'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Journey List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 scrollbar-thin">
          {/* Quick TL;DR Card */}
          <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-r from-sky-950/40 via-indigo-950/30 to-purple-950/40 border border-sky-500/20 text-xs text-slate-200 leading-relaxed">
            <div className="font-bold text-sky-300 text-xs sm:text-sm mb-1 flex items-center gap-1.5">
              <span>💡 How this app works in 30 seconds:</span>
            </div>
            <span className="text-[11px] sm:text-xs">
              When a user interacts with the interface, the app gathers user inputs, sends a secure request to the API, validates credentials & business rules, reads or updates the database, and returns the final response back to the user screen.
            </span>
          </div>

          {/* Timeline of steps */}
          <div className="relative border-l-2 border-slate-800 ml-3 sm:ml-4 pl-4 sm:pl-6 space-y-4 sm:space-y-6 pt-2">
            {steps.map((step, idx) => {
              const cfg = TYPE_CONFIG[step.type?.toUpperCase()] || TYPE_CONFIG.SERVICE;
              const Icon = cfg.icon;

              return (
                <div
                  key={step.id || idx}
                  className="relative group cursor-pointer"
                  onClick={() => {
                    if (onSelectStep) onSelectStep(step, idx);
                    onClose();
                  }}
                >
                  {/* Step Bullet Dot */}
                  <div className="absolute -left-[27px] sm:-left-[35px] top-1.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#070a12] border-2 border-sky-400 flex items-center justify-center text-[9px] sm:text-[10px] font-bold font-mono text-sky-300 group-hover:scale-110 group-hover:bg-sky-500 group-hover:text-slate-950 transition-all shadow-md shadow-sky-500/20">
                    {idx + 1}
                  </div>

                  {/* Step Content Card */}
                  <div className="p-3 sm:p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-sky-500/50 hover:bg-slate-900 transition-all shadow-lg group-hover:shadow-sky-950/40">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`p-1 sm:p-1.5 rounded-lg border ${cfg.color}`}>
                          <Icon size={13} />
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-sky-300 transition-colors">
                          {step.semanticName || step.name}
                        </h4>
                      </div>

                      <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold border uppercase tracking-wide ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>

                    <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed mb-2">
                      {step.description || `Handles the execution for ${step.semanticName || step.name}.`}
                    </p>

                    {/* Data Moving Badges */}
                    {(step.inputs?.length > 0 || step.outputs?.length > 0) && (
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap pt-2 border-t border-slate-800/60 text-[10px] sm:text-[11px]">
                        {step.inputs?.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-slate-400 font-semibold text-[9px] sm:text-[10px] uppercase">Input:</span>
                            {step.inputs.map((inp, i) => (
                              <span key={i} className="px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 font-mono text-[9px] sm:text-[10px]">
                                {inp}
                              </span>
                            ))}
                          </div>
                        )}

                        {step.outputs?.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-slate-400 font-semibold text-[9px] sm:text-[10px] uppercase">Output:</span>
                            {step.outputs.map((out, i) => (
                              <span key={i} className="px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 font-mono text-[9px] sm:text-[10px]">
                                {out}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-[#070a12]/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <div className="text-[11px] sm:text-xs text-slate-400 text-center sm:text-left">
            Click any step to inspect it on the visual flow canvas.
          </div>
          <div className="flex items-center gap-2 justify-end">
            {onOpenReadme && (
              <button
                onClick={() => {
                  onClose();
                  onOpenReadme();
                }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-300 font-semibold text-xs transition-all cursor-pointer shadow-sm"
              >
                <FileText size={14} />
                <span>Export README</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-md shadow-sky-500/20 text-center"
            >
              Take me to canvas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
