import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import {
  X,
  Code2,
  Sparkles,
  ArrowDownRight,
  ArrowUpRight,
  Route,
  Layers,
  CheckCircle2,
  Zap,
  BookOpen,
  FileCode,
  Activity,
  ArrowRight
} from 'lucide-react';
import { getApiUrl } from '../config/api';


function getMonacoLanguage(filePath = '', lang = '') {
  if (lang) {
    if (lang === 'js' || lang === 'javascript') return 'javascript';
    if (lang === 'ts' || lang === 'typescript') return 'typescript';
    if (lang === 'py' || lang === 'python') return 'python';
    if (lang === 'go') return 'go';
    if (lang === 'rust' || lang === 'rs') return 'rust';
    if (lang === 'java') return 'java';
    if (lang === 'csharp' || lang === 'cs') return 'csharp';
    if (lang === 'cpp' || lang === 'c') return 'cpp';
    if (lang === 'php') return 'php';
    if (lang === 'ruby') return 'ruby';
    if (lang === 'shell') return 'shell';
    if (lang === 'sql') return 'sql';
    if (lang === 'html' || lang === 'markup') return 'html';
    if (lang === 'css') return 'css';
    if (lang === 'json' || lang === 'config') return 'json';
    if (lang === 'docs') return 'markdown';
  }
  const ext = filePath.split('.').pop()?.toLowerCase();
  const extMap = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', pyw: 'python',
    go: 'go', rs: 'rust', java: 'java', kt: 'kotlin', cs: 'csharp',
    cpp: 'cpp', c: 'cpp', h: 'cpp', hpp: 'cpp', php: 'php', rb: 'ruby',
    sh: 'shell', bash: 'shell', ps1: 'powershell',
    html: 'html', css: 'css', scss: 'scss', json: 'json',
    yaml: 'yaml', yml: 'yaml', toml: 'ini', xml: 'xml', sql: 'sql', md: 'markdown'
  };
  return extMap[ext] || 'plaintext';
}

const BADGE_STYLES = {
  PAGE: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
  USER_ACTION: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  API: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  CONTROLLER: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
  SERVICE: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
  DATABASE: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  AUTHENTICATION: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  AUTH: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  DECISION: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  RESPONSE: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  NAVIGATION: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  DATA: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
  module: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
  file: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  function: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  route: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  db_operation: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  component: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
  condition: 'text-orange-400 bg-orange-500/10 border-orange-500/30'
};

const SIMPLE_TYPE_NAMES = {
  PAGE: 'Web Screen / Page',
  USER_ACTION: 'User Trigger / Click',
  API: 'API Web Endpoint',
  CONTROLLER: 'Request Handler',
  SERVICE: 'Business Processing',
  DATABASE: 'Database Query / Storage',
  AUTHENTICATION: 'Security & Verification',
  AUTH: 'Security & Verification',
  DECISION: 'Validation Condition',
  RESPONSE: 'Response Sent to User',
  NAVIGATION: 'Page Redirection',
  DATA: 'Data Record'
};

export default function InspectorPanel({
  selectedNode,
  filesMap = {},
  incomingEdges = [],
  outgoingEdges = [],
  onClose,
  onSelectNode,
  onStartTrace,
  onExploreCodeFlow,
  isSimpleMode = true
}) {
  const [activeTab, setActiveTab] = useState(isSimpleMode ? 'story' : 'overview');
  const [aiExplanation, setAiExplanation] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [prevNodeId, setPrevNodeId] = useState(selectedNode?.id);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);

  if (selectedNode?.id !== prevNodeId) {
    setPrevNodeId(selectedNode?.id);
    setAiExplanation(null);
  }

  useEffect(() => {
    if (editorRef.current && monacoRef.current && selectedNode && activeTab === 'source') {
      const line = selectedNode.line || selectedNode.startLine || 1;
      editorRef.current.revealLineInCenter(line);
      decorationsRef.current = editorRef.current.deltaDecorations(
        decorationsRef.current || [],
        [
          {
            range: new monacoRef.current.Range(
              line,
              1,
              selectedNode.endLine || line,
              100
            ),
            options: {
              isWholeLine: true,
              className: 'bg-sky-500/20 border-l-4 border-sky-400',
              glyphMarginClassName: 'bg-sky-400'
            }
          }
        ]
      );
    }
  }, [selectedNode, activeTab]);

  if (!selectedNode) return null;

  const fileContent = selectedNode.file
    ? filesMap[selectedNode.file] || selectedNode.sourceCode || '// Source code loading...'
    : '// No source file directly mapped for this node';

  const handleExplain = async () => {
    setLoadingAi(true);
    try {
      const res = await fetch(getApiUrl('/api/explain'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node: selectedNode,
          incomingEdges,
          outgoingEdges
        })
      });
      const data = await res.json();
      if (data.success) {
        setAiExplanation(data.explanation);
      } else {
        setAiExplanation('Unable to generate explanation.');
      }
    } catch (err) {
      setAiExplanation(`Explanation failed: ${err.message}`);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    const line = selectedNode.line || selectedNode.startLine || 1;
    if (line) {
      editor.revealLineInCenter(line);
      decorationsRef.current = editor.deltaDecorations(
        [],
        [
          {
            range: new monaco.Range(
              line,
              1,
              selectedNode.endLine || line,
              100
            ),
            options: {
              isWholeLine: true,
              className: 'bg-sky-500/20 border-l-4 border-sky-400',
              glyphMarginClassName: 'bg-sky-400'
            }
          }
        ]
      );
    }
  };

  const nodeType = (selectedNode.type || 'SERVICE').toUpperCase();
  const badgeStyle = BADGE_STYLES[nodeType] || BADGE_STYLES[selectedNode.type] || 'text-slate-400 bg-slate-800 border-slate-700';
  const simpleTypeName = SIMPLE_TYPE_NAMES[nodeType] || selectedNode.type || 'Step';

  const inputs = selectedNode.inputs || selectedNode.params || [];
  const outputs = selectedNode.outputs || selectedNode.returns || [];

  // Extract Data Flows
  const incomingDataFlows = incomingEdges.filter(
    (e) => e.type === 'APPLICATION_DATA_FLOW' || e.type === 'DATA_FLOW' || e.type === 'API_ROUTE'
  );
  const outgoingDataFlows = outgoingEdges.filter(
    (e) => e.type === 'APPLICATION_DATA_FLOW' || e.type === 'DATA_FLOW' || e.type === 'RETURN_FLOW'
  );
  const connectedCalls = outgoingEdges.filter(
    (e) => e.type === 'FUNCTION_CALL' || e.type === 'DATABASE_OPERATION' || e.type === 'COMPONENT_RENDER'
  );
  const incomingTriggers = incomingEdges.filter(
    (e) => e.type === 'FUNCTION_CALL' || e.type === 'API_ROUTE' || e.type === 'COMPONENT_RENDER'
  );

  const tabs = [
    { id: 'story', label: 'Plain English', icon: Sparkles },
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'dataflow', label: 'Data Flow', icon: Route },
    { id: 'relationships', label: 'Relations', icon: Layers },
    { id: 'source', label: 'Source Code', icon: Code2 }
  ];

  return (
    <div className="w-full sm:w-96 md:w-[420px] lg:w-[440px] max-w-[100vw] h-full bg-[#0b0f19] border-l border-slate-800 flex flex-col z-20 shadow-2xl overflow-hidden select-none safe-pb">
      {/* Inspector Top Header */}
      <div className="p-3 sm:p-3.5 border-b border-slate-800 bg-[#070a12]/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="p-1.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
            <Activity size={16} />
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-bold text-slate-100 truncate">
              {selectedNode.semanticName || selectedNode.name}
            </div>
            <div className="text-[10px] text-slate-400 font-mono truncate">
              {simpleTypeName}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${badgeStyle}`}>
            {simpleTypeName}
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Close Details Panel"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center border-b border-slate-800/80 bg-[#070a12]/60 px-1 overflow-x-auto scrollbar-none shrink-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'border-sky-400 text-sky-300 font-bold bg-slate-900/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon size={12} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Body Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {/* 0. PLAIN ENGLISH STORY TAB (Easy & Non-Technical) */}
        {activeTab === 'story' && (
          <div className="space-y-4">
            {/* Simple Step Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-950/40 via-slate-900 to-indigo-950/40 border border-sky-500/30 space-y-2.5 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-sky-400" />
                  <span>What happens in this step?</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 uppercase">
                  {simpleTypeName}
                </span>
              </div>

              <p className="text-xs text-slate-200 leading-relaxed font-normal">
                {selectedNode.description ||
                  `In this step, the system executes logic for ${selectedNode.semanticName || selectedNode.name} to process incoming data.`}
              </p>
            </div>

            {/* Step-by-Step Data Journey Flow (Previous -> This Step -> Next) */}
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Route size={13} className="text-sky-400" />
                <span>Data Journey Pathway</span>
              </div>

              {/* 1. Received From */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <ArrowDownRight size={12} className="text-cyan-400" />
                  <span>1. Received From (Inputs)</span>
                </span>
                {incomingEdges.length === 0 ? (
                  <div className="p-2 rounded-xl bg-[#070a12] border border-slate-800 text-[11px] text-slate-400 italic">
                    Initiated by user click or external web request
                  </div>
                ) : (
                  <div className="space-y-1">
                    {incomingEdges.slice(0, 3).map((edge) => (
                      <div
                        key={edge.id}
                        onClick={() => onSelectNode(edge.source)}
                        className="p-2 rounded-xl bg-[#070a12] hover:bg-slate-800 border border-slate-800 cursor-pointer flex items-center justify-between text-xs text-slate-200 transition-colors"
                      >
                        <span className="truncate">← {edge.label || edge.source}</span>
                        <span className="text-[10px] text-sky-400 font-semibold">Jump</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Processed Here */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Zap size={12} className="text-amber-400" />
                  <span>2. Handled by this Component</span>
                </span>
                <div className="p-2.5 rounded-xl bg-sky-950/20 border border-sky-500/30 text-xs text-sky-200">
                  <span className="font-bold">{selectedNode.semanticName || selectedNode.name}</span>
                  {selectedNode.file && (
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      File: {selectedNode.file.split('/').pop()}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Sent To */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <ArrowUpRight size={12} className="text-emerald-400" />
                  <span>3. Sends Data To (Outputs)</span>
                </span>
                {outgoingEdges.length === 0 ? (
                  <div className="p-2 rounded-xl bg-[#070a12] border border-slate-800 text-[11px] text-slate-400 italic">
                    Final result returned to user interface
                  </div>
                ) : (
                  <div className="space-y-1">
                    {outgoingEdges.slice(0, 3).map((edge) => (
                      <div
                        key={edge.id}
                        onClick={() => onSelectNode(edge.target)}
                        className="p-2 rounded-xl bg-[#070a12] hover:bg-slate-800 border border-slate-800 cursor-pointer flex items-center justify-between text-xs text-slate-200 transition-colors"
                      >
                        <span className="truncate">→ {edge.label || edge.target}</span>
                        <span className="text-[10px] text-emerald-400 font-semibold">Jump</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* AI Simple Explainer Button */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/30 to-indigo-950/30 border border-purple-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-purple-400" />
                  <span>Need an easy AI explanation?</span>
                </span>
                <button
                  onClick={handleExplain}
                  disabled={loadingAi}
                  className="px-3 py-1 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 text-xs font-bold transition-all cursor-pointer disabled:opacity-40 shadow-sm"
                >
                  {loadingAi ? 'Analyzing...' : 'Explain in Simple Words'}
                </button>
              </div>

              {aiExplanation && (
                <div className="p-3 rounded-xl bg-[#070a12]/90 border border-purple-500/20 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {aiExplanation}
                </div>
              )}
            </div>

            {/* Switch to Developer Tab Button */}
            <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
              <span>Looking for code details?</span>
              <button
                onClick={() => setActiveTab('source')}
                className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>View Source Code</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        )}

        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Quick Drill-Down Action Banner */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-sky-950/40 to-indigo-950/40 border border-sky-500/30 space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-sky-300 flex items-center gap-1.5">
                  <Zap size={14} className="text-sky-400" />
                  <span>Deep Code Flow</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Level 4</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Explore the exact AST call expressions, variable assignments, and parameters for this operation.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => onExploreCodeFlow && onExploreCodeFlow(selectedNode)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-sky-500/20 cursor-pointer"
                >
                  <Code2 size={13} />
                  <span>View Code Flow</span>
                  <ArrowRight size={13} />
                </button>
                <button
                  onClick={() => setActiveTab('source')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer flex items-center gap-1"
                >
                  <FileCode size={13} className="text-sky-400" />
                  <span>Source</span>
                </button>
              </div>
            </div>

            {/* Description Card */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Semantic Responsibility</div>
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200 leading-relaxed">
                {selectedNode.description ||
                  `Handles execution for ${selectedNode.semanticName || selectedNode.name} in ${selectedNode.file || 'codebase'}.`}
              </div>
            </div>

            {/* Inputs & Outputs Chips */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Inputs */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <ArrowDownRight size={12} className="text-cyan-400" />
                  <span>Inputs ({inputs.length})</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 min-h-[50px] space-y-1">
                  {inputs.length === 0 ? (
                    <span className="text-[10px] text-slate-500 italic">No input params</span>
                  ) : (
                    inputs.map((inp, idx) => (
                      <div
                        key={idx}
                        onClick={() => onStartTrace && onStartTrace(inp)}
                        className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-mono text-[10px] border border-cyan-500/20 hover:border-cyan-400 cursor-pointer flex items-center justify-between group"
                        title="Click to trace this variable"
                      >
                        <span className="truncate">${inp}</span>
                        <Zap size={10} className="text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Outputs */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <ArrowUpRight size={12} className="text-emerald-400" />
                  <span>Outputs ({outputs.length})</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 min-h-[50px] space-y-1">
                  {outputs.length === 0 ? (
                    <span className="text-[10px] text-slate-500 italic">No outputs</span>
                  ) : (
                    outputs.map((out, idx) => (
                      <div
                        key={idx}
                        onClick={() => onStartTrace && onStartTrace(out)}
                        className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono text-[10px] border border-emerald-500/20 hover:border-emerald-400 cursor-pointer flex items-center justify-between group"
                        title="Click to trace this variable"
                      >
                        <span className="truncate">${out}</span>
                        <Zap size={10} className="text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Technical Expression & Evidence */}
            {selectedNode.technicalExpression && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Technical Expression</div>
                <pre className="p-2.5 rounded-xl bg-[#070a12] border border-slate-800 text-[11px] font-mono text-purple-300 overflow-x-auto scrollbar-none whitespace-pre-wrap">
                  {selectedNode.technicalExpression}
                </pre>
              </div>
            )}

            {/* Verification Confidence & Source Mapping */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px] font-medium">Confidence Score:</span>
                <span className="flex items-center gap-1 font-bold text-emerald-400 font-mono">
                  <CheckCircle2 size={12} />
                  <span>{selectedNode.confidence?.score ? `${Math.round(selectedNode.confidence.score * 100)}%` : '98%'}</span>
                  <span className="text-[10px] uppercase font-sans text-slate-500">
                    ({selectedNode.confidence?.level || 'CONFIRMED'})
                  </span>
                </span>
              </div>
              {selectedNode.file && (
                <div className="flex items-center justify-between border-t border-slate-800 pt-1.5 text-[11px]">
                  <span className="text-slate-400">File & Line:</span>
                  <span className="font-mono text-sky-400 truncate max-w-[200px]">
                    {selectedNode.file}:{selectedNode.line || selectedNode.startLine || 1}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. DATA FLOW TAB */}
        {activeTab === 'dataflow' && (
          <div className="space-y-4">
            {/* Incoming Data Flows */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <ArrowDownRight size={13} className="text-cyan-400" />
                <span>Incoming Data Flows</span>
              </div>
              {incomingDataFlows.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs text-slate-500 italic">
                  No direct incoming data variables connected.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {incomingDataFlows.map((edge) => (
                    <div
                      key={edge.id}
                      className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-xs font-mono transition-colors"
                    >
                      <div
                        onClick={() => onSelectNode(edge.source)}
                        className="cursor-pointer hover:text-cyan-300 text-slate-200 truncate max-w-[220px]"
                      >
                        ← {edge.label || edge.source}
                      </div>
                      <button
                        onClick={() => {
                          const varToTrace = edge.dataItems?.[0]?.name || edge.label?.split(' ')[0] || inputs[0];
                          if (varToTrace) onStartTrace(varToTrace);
                        }}
                        className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 text-[10px] font-sans font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Zap size={10} />
                        <span>Trace</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Outgoing Data Flows */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <ArrowUpRight size={13} className="text-emerald-400" />
                <span>Outgoing Data Flows</span>
              </div>
              {outgoingDataFlows.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs text-slate-500 italic">
                  No direct outgoing data flows.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {outgoingDataFlows.map((edge) => (
                    <div
                      key={edge.id}
                      className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-xs font-mono transition-colors"
                    >
                      <div
                        onClick={() => onSelectNode(edge.target)}
                        className="cursor-pointer hover:text-emerald-300 text-slate-200 truncate max-w-[220px]"
                      >
                        → {edge.label || edge.target}
                      </div>
                      <button
                        onClick={() => {
                          const varToTrace = edge.dataItems?.[0]?.name || edge.label?.split(' ')[0] || outputs[0];
                          if (varToTrace) onStartTrace(varToTrace);
                        }}
                        className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 text-[10px] font-sans font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Zap size={10} />
                        <span>Trace</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. RELATIONSHIPS TAB */}
        {activeTab === 'relationships' && (
          <div className="space-y-4">
            {/* Incoming Triggers / Callers */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={13} className="text-sky-400" />
                <span>Incoming Triggers / Callers ({incomingTriggers.length})</span>
              </div>
              {incomingTriggers.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs text-slate-500 italic">
                  Root entry point or direct client trigger.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {incomingTriggers.map((edge) => (
                    <div
                      key={edge.id}
                      onClick={() => onSelectNode(edge.source)}
                      className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 cursor-pointer flex items-center justify-between text-xs text-slate-200 font-mono transition-colors group"
                    >
                      <span className="truncate group-hover:text-sky-300">{edge.source}</span>
                      <ArrowRight size={12} className="text-slate-500 group-hover:text-sky-300 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Outgoing Operations / Callees */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Code2 size={13} className="text-purple-400" />
                <span>Connected Operations / Callees ({connectedCalls.length})</span>
              </div>
              {connectedCalls.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs text-slate-500 italic">
                  No outgoing function or database calls recorded.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {connectedCalls.map((edge) => (
                    <div
                      key={edge.id}
                      onClick={() => onSelectNode(edge.target)}
                      className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 cursor-pointer flex items-center justify-between text-xs text-slate-200 font-mono transition-colors group"
                    >
                      <span className="truncate group-hover:text-purple-300">{edge.target}</span>
                      <ArrowRight size={12} className="text-slate-500 group-hover:text-purple-300 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. SOURCE CODE TAB */}
        {activeTab === 'source' && (
          <div className="space-y-2 h-full flex flex-col min-h-[380px]">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span className="truncate">{selectedNode.file || 'No file mapping'}</span>
              <span>Line {selectedNode.line || selectedNode.startLine || 1}</span>
            </div>
            <div className="flex-1 min-h-[350px] rounded-xl overflow-hidden border border-slate-800 bg-[#1e1e1e]">
              <Editor
                height="100%"
                language={getMonacoLanguage(selectedNode.file, selectedNode.language)}
                theme="vs-dark"
                value={fileContent}
                onMount={handleEditorDidMount}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 12,
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                  folding: false,
                  wordWrap: 'on'
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
