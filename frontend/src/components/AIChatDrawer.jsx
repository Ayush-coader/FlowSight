import { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Bot,
  User,
  Trash2,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Code2,
  Database,
  ShieldCheck,
  Zap,
  ExternalLink
} from 'lucide-react';
import { getApiUrl } from '../config/api';


const CATEGORIZED_PROMPTS = [
  { label: '🔄 Data Flow', query: 'How does data flow from user requests to database in this codebase?' },
  { label: '🔒 Auth Journey', query: 'How does the authentication flow work in this codebase?' },
  { label: '🌐 API Endpoints', query: 'List all API routes and their handlers' },
  { label: '🗄️ Database Ops', query: 'Where are database queries executed and what models are used?' }
];

export default function AIChatDrawer({ graphData, selectedNode, onSelectNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `### 🎯 Welcome to FlowSight AI\nI am your **Codebase & Data Flow Architect** for **${graphData?.repositoryName || 'this repository'}**.\n\n### 💡 What I Can Help You With\n- **End-to-end data pipeline** from screen to database\n- **API route mappings** & controller logic\n- **Database operations** & query locations\n- **Interactive symbol inspection** across functions\n\n*Click any suggested question below or type your question!*`
    }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (userText) => {
    const textToSend = userText || input;
    if (!textToSend.trim() || loading) return;

    const newMessages = [...messages, { role: 'user', content: textToSend }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(getApiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: newMessages.slice(-6),
          graphData,
          selectedNode
        })
      });

      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.reply,
            isAIGenerated: data.isAIGenerated,
            provider: data.provider
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `### ⚠️ Notice\nSorry, I encountered an issue processing your query: ${data.error || 'Failed to respond'}.`
          }
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `### ⚠️ Connection Error\nCould not communicate with the backend server (${err.message}).`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        role: 'assistant',
        content: `### 🎯 FlowSight Assistant\nChat history cleared. Ask me anything about **${graphData?.repositoryName || 'this repository'}**!`
      }
    ]);
  };

  const handleCopyMessage = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Find node in graphData by name or file
  const findMatchingNode = (symbolName) => {
    if (!graphData?.nodes || !symbolName) return null;
    const clean = symbolName.replace(/[()]/g, '').trim().toLowerCase();
    return graphData.nodes.find(
      (n) =>
        n.name?.toLowerCase() === clean ||
        n.semanticName?.toLowerCase() === clean ||
        n.file?.toLowerCase().endsWith(clean) ||
        n.id?.toLowerCase().includes(clean)
    );
  };

  // Structured Markdown & Section Parser
  const renderStructuredMessage = (content) => {

    const lines = content.split('\n');
    const elements = [];
    let inCodeBlock = false;
    let codeBlockLang = '';
    let codeBlockLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code blocks ```
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          // Finish code block
          const codeText = codeBlockLines.join('\n');
          elements.push(
            <div key={`code-${i}`} className="my-2.5 rounded-xl overflow-hidden border border-slate-800 bg-[#070a12] shadow-inner text-xs font-mono">
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 text-[10px] text-slate-400">
                <span className="uppercase font-bold tracking-wider">{codeBlockLang || 'code'}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(codeText)}
                  className="flex items-center gap-1 text-slate-400 hover:text-sky-300 transition-colors cursor-pointer"
                >
                  <Copy size={11} />
                  <span>Copy</span>
                </button>
              </div>
              <pre className="p-3 text-sky-200 overflow-x-auto scrollbar-none whitespace-pre-wrap">
                {codeText}
              </pre>
            </div>
          );
          codeBlockLines = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
          codeBlockLang = line.trim().slice(3).trim();
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockLines.push(line);
        continue;
      }

      // Section Headers ###
      if (line.startsWith('### ')) {
        const headerTitle = line.slice(4).trim();
        let headerColor = 'text-sky-300 border-sky-500/30 bg-sky-500/10';
        let HeaderIcon = Sparkles;

        if (headerTitle.includes('Summary') || headerTitle.includes('🎯')) {
          headerColor = 'text-sky-300 border-sky-500/30 bg-sky-500/10';
          HeaderIcon = Sparkles;
        } else if (headerTitle.includes('Flow') || headerTitle.includes('Journey') || headerTitle.includes('🔄')) {
          headerColor = 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10';
          HeaderIcon = Zap;
        } else if (headerTitle.includes('File') || headerTitle.includes('Component') || headerTitle.includes('📂')) {
          headerColor = 'text-purple-300 border-purple-500/30 bg-purple-500/10';
          HeaderIcon = Code2;
        } else if (headerTitle.includes('Database') || headerTitle.includes('🗄️')) {
          headerColor = 'text-amber-300 border-amber-500/30 bg-amber-500/10';
          HeaderIcon = Database;
        } else if (headerTitle.includes('Takeaway') || headerTitle.includes('💡')) {
          headerColor = 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10';
          HeaderIcon = ShieldCheck;
        }

        elements.push(
          <div key={`h-${i}`} className={`flex items-center gap-2 px-2.5 py-1 rounded-xl border mt-3.5 mb-2 ${headerColor} font-bold text-xs tracking-tight`}>
            <HeaderIcon size={14} className="shrink-0" />
            <span>{headerTitle}</span>
          </div>
        );
        continue;
      }

      // Step items: 1. **Step Name**: Explanation
      const stepMatch = line.match(/^(\d+)\.\s+(\*\*[^*]+\*\*|.+?):\s*(.*)$/);
      if (stepMatch) {
        const stepNum = stepMatch[1];
        const stepTitle = stepMatch[2].replace(/\*\*/g, '').trim();
        const stepBody = stepMatch[3];

        elements.push(
          <div key={`step-${i}`} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80 my-1.5 shadow-sm">
            <div className="w-5 h-5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
              {stepNum}
            </div>
            <div className="flex-1 text-xs text-slate-200 min-w-0">
              <span className="font-bold text-slate-100">{stepTitle}: </span>
              <span>{formatInlineContent(stepBody)}</span>
            </div>
          </div>
        );
        continue;
      }

      // Bullet items: - ... or * ...
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const bulletText = line.trim().slice(2);
        elements.push(
          <div key={`li-${i}`} className="flex items-start gap-2 text-xs text-slate-300 my-1 pl-1">
            <span className="text-sky-400 font-bold shrink-0 mt-0.5">•</span>
            <div className="flex-1">{formatInlineContent(bulletText)}</div>
          </div>
        );
        continue;
      }

      // Empty line spacing
      if (!line.trim()) {
        elements.push(<div key={`sp-${i}`} className="h-1" />);
        continue;
      }

      // Normal paragraph
      elements.push(
        <p key={`p-${i}`} className="text-xs text-slate-300 leading-relaxed my-1">
          {formatInlineContent(line)}
        </p>
      );
    }

    return elements;
  };

  // Inline formatting for backticks and bold text with Interactive Node Clicking
  const formatInlineContent = (text) => {
    if (!text) return null;
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);

    return parts.map((part, idx) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        const symbol = part.slice(1, -1);
        const matchedNode = findMatchingNode(symbol);

        return (
          <span
            key={idx}
            onClick={() => {
              if (matchedNode && onSelectNode) {
                onSelectNode(matchedNode);
              }
            }}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-mono border mx-0.5 transition-all ${
              matchedNode
                ? 'bg-sky-500/15 text-sky-300 border-sky-500/40 hover:bg-sky-500/30 hover:border-sky-400 cursor-pointer shadow-sm'
                : 'bg-slate-800 text-cyan-300 border-slate-700'
            }`}
            title={matchedNode ? `Click to inspect ${matchedNode.name} on canvas` : symbol}
          >
            <span>{symbol}</span>
            {matchedNode && <ExternalLink size={9} className="opacity-70 ml-0.5" />}
          </span>
        );
      }

      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="text-slate-100 font-bold">
            {part.slice(2, -2)}
          </strong>
        );
      }

      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={idx} className="text-slate-400 italic">
            {part.slice(1, -1)}
          </em>
        );
      }

      return part;
    });
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-40 flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 hover:from-sky-400 hover:to-purple-500 text-white font-bold text-xs shadow-2xl shadow-sky-500/30 ring-2 ring-sky-300/40 hover:scale-105 transition-all cursor-pointer group safe-pb"
          title="Open FlowSight AI Assistant"
        >
          <div className="relative flex items-center justify-center">
            <Bot size={16} />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <span className="tracking-wide">AI Assistant</span>
          <Sparkles size={13} className="text-amber-300" />
        </button>
      )}

      {/* Floating Chat Drawer */}
      {isOpen && (
        <div
          className={`fixed inset-x-2 bottom-2 top-14 sm:top-auto sm:inset-x-auto sm:bottom-5 sm:right-5 z-50 flex flex-col bg-[#0b0f19]/95 border border-sky-500/30 rounded-2xl shadow-2xl shadow-sky-950/60 backdrop-blur-2xl transition-all duration-300 overflow-hidden ${
            isExpanded
              ? 'sm:w-[580px] md:w-[640px] sm:h-[86vh]'
              : 'sm:w-[440px] md:w-[480px] sm:h-[560px]'
          }`}
        >
          {/* Header */}
          <div className="p-3.5 px-4 border-b border-slate-800/80 bg-slate-950/90 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-slate-950 font-bold shadow-md shadow-sky-500/20">
                <Bot size={17} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  <span>FlowSight AI Architect</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 font-mono font-semibold">
                    Structured Q&A
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                  {graphData?.repositoryName || 'Codebase Knowledge Base'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClear}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                title="Clear Chat History"
              >
                <Trash2 size={14} />
              </button>
              <button
                onClick={() => setIsExpanded((e) => !e)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                title={isExpanded ? 'Minimize Window' : 'Maximize Window'}
              >
                {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close Assistant"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin text-xs">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-xl bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Bot size={15} />
                  </div>
                )}

                <div
                  className={`max-w-[88%] p-3.5 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-br-none shadow-md shadow-sky-600/20'
                      : 'bg-slate-900/90 text-slate-200 border border-slate-800 rounded-bl-none shadow-lg'
                  }`}
                >
                  <div className="space-y-1 font-sans">
                    {msg.role === 'user' ? (
                      <p className="text-xs leading-relaxed font-medium">{msg.content}</p>
                    ) : (
                      renderStructuredMessage(msg.content, idx)
                    )}
                  </div>

                  {msg.role === 'assistant' && (
                    <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>{msg.provider ? `Model: ${msg.provider}` : 'FlowSight AST Engine'}</span>
                      <button
                        onClick={() => handleCopyMessage(msg.content, idx)}
                        className="flex items-center gap-1 text-slate-400 hover:text-sky-300 transition-colors cursor-pointer"
                      >
                        {copiedIndex === idx ? (
                          <>
                            <Check size={11} className="text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={11} />
                            <span>Copy Answer</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                    <User size={15} />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-xl bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center shrink-0">
                  <Bot size={15} />
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-300 flex items-center gap-2 shadow-sm">
                  <Loader2 size={14} className="animate-spin text-sky-400" />
                  <span className="text-xs font-mono">Structuring codebase explanation...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Structured Question Chips */}
          <div className="px-3 py-2 border-t border-slate-800/80 bg-slate-950/70 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Sparkles size={11} className="text-sky-400" />
              <span>Ask:</span>
            </span>
            {CATEGORIZED_PROMPTS.map((item, pIdx) => (
              <button
                key={pIdx}
                onClick={() => handleSend(item.query)}
                disabled={loading}
                className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/40 text-[11px] text-slate-300 hover:text-sky-300 truncate shrink-0 transition-all font-medium cursor-pointer"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/95 flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about data flow, routes, database queries..."
              className="flex-1 bg-slate-900 text-xs text-slate-100 pl-3.5 pr-2 py-2.5 rounded-xl border border-slate-800 focus:border-sky-500 outline-none transition-all placeholder:text-slate-500 font-mono"
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={loading}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="p-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-slate-950 font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer shadow-md shadow-sky-500/20"
              title="Send Message"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
