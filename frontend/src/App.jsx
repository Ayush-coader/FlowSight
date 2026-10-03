import { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import RepositoryExplorer from './components/RepositoryExplorer';
import FlowCanvas from './graph/FlowCanvas';
import InspectorPanel from './components/InspectorPanel';
import DataTraceToolbar from './components/DataTraceToolbar';
import DataFlowStoryWalkthrough from './components/DataFlowStoryWalkthrough';
import DataFlowStoryModal from './components/DataFlowStoryModal';
import ReadmeModal from './components/ReadmeModal';
import WelcomeState from './components/WelcomeState';
import AIChatDrawer from './components/AIChatDrawer';
import { calculateDataTrace, extractAvailableVariables } from './graph/traceEngine';
import { AlertCircle } from 'lucide-react';
import { getApiUrl } from './config/api';

export default function App() {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [viewMode, setViewMode] = useState('simple'); // 'simple' | 'technical'
  const [currentLevel, setCurrentLevel] = useState('L1');
  const [selectedModule, setSelectedModule] = useState(null); // null means full project
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeTrace, setActiveTrace] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [isReadmeModalOpen, setIsReadmeModalOpen] = useState(false);


  // Responsive sidebar toggles
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(window.innerWidth >= 1024);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsLeftSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleAnalyze = async (overrideUrl) => {
    const targetUrl = overrideUrl || repoUrl;
    if (!targetUrl.trim()) return;

    setLoading(true);
    setError(null);
    setSelectedNode(null);
    setActiveTrace(null);
    setSelectedModule(null);
    setCurrentLevel('L1');
    setCurrentStepIndex(0);

    try {
      const isLocal = !targetUrl.startsWith('http://') && !targetUrl.startsWith('https://');
      const payload = isLocal ? { localPath: targetUrl } : { repoUrl: targetUrl };

      const res = await fetch(getApiUrl('/api/analyze'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to analyze repository');
      }

      setGraphData(data.graph);
      const firstNode =
        data.graph.applicationFlow?.nodes?.[0] ||
        data.graph.nodes.find((n) => n.level === 'L1' || n.type === 'PAGE' || n.type === 'API' || n.type === 'function');
      if (firstNode) {
        setSelectedNode(firstNode);
        setIsInspectorOpen(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrace = (varName) => {
    if (!graphData || !varName) return;
    const trace = calculateDataTrace(varName, graphData.nodes, graphData.edges);
    if (trace) {
      setActiveTrace(trace);
      setCurrentStepIndex(0);
      if (trace.path.length > 0) {
        setSelectedNode(trace.path[0]);
        setIsInspectorOpen(true);
      }
    }
  };

  const handleClearTrace = () => {
    setActiveTrace(null);
    setCurrentStepIndex(0);
  };

  const handleToggleTraceMode = () => {
    if (activeTrace) {
      handleClearTrace();
    } else if (graphData) {
      const vars = extractAvailableVariables(graphData.nodes);
      if (vars.length > 0) {
        handleStartTrace(vars[0]);
      }
    }
  };

  const availableVariables = graphData ? extractAvailableVariables(graphData.nodes, graphData.edges) : [];

  const availableModules = useMemo(() => {
    if (!graphData?.nodes) return [];
    return graphData.nodes
      .filter((n) => n.type === 'module')
      .map((m) => ({
        id: m.id,
        name: m.name,
        fileCount: m.fileCount || (m.files ? m.files.length : 0),
        functionCount: graphData.nodes.filter(
          (n) => n.module === m.name && (n.type === 'function' || n.type === 'route' || n.type === 'component')
        ).length
      }));
  }, [graphData]);

  const incomingEdges = selectedNode && graphData
    ? graphData.edges.filter((e) => e.target === selectedNode.id)
    : [];

  const outgoingEdges = selectedNode && graphData
    ? graphData.edges.filter((e) => e.source === selectedNode.id)
    : [];

  return (
    <div className="w-screen h-screen flex flex-col bg-[#070a12] text-slate-100 overflow-hidden select-none">
      {/* Top Navigation Bar */}
      <Navbar
        repoUrl={repoUrl}
        setRepoUrl={setRepoUrl}
        onAnalyze={() => handleAnalyze()}
        loading={loading}
        currentLevel={currentLevel}
        setCurrentLevel={setCurrentLevel}
        selectedModule={selectedModule}
        setSelectedModule={setSelectedModule}
        availableModules={availableModules}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        repositoryName={graphData?.repositoryName}
        activeTrace={activeTrace}
        onToggleTraceMode={handleToggleTraceMode}
        isLeftSidebarOpen={isLeftSidebarOpen}
        onToggleLeftSidebar={() => setIsLeftSidebarOpen((prev) => !prev)}
        isInspectorOpen={isInspectorOpen}
        onToggleInspector={() => setIsInspectorOpen((prev) => !prev)}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onOpenStorySummary={() => setIsStoryModalOpen(true)}
        onOpenReadme={() => setIsReadmeModalOpen(true)}
      />

      {/* Error Alert Notification */}
      {error && (
        <div className="bg-rose-500/10 border-b border-rose-500/20 px-4 py-2 flex items-center gap-2 text-rose-300 text-xs shrink-0">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Workspace Area */}
      <div className="flex-1 relative flex overflow-hidden">
        {graphData ? (
          <>
            {/* Column 1: Left Repository Explorer (Responsive) */}
            {isLeftSidebarOpen && (
              <div className="fixed lg:relative inset-y-0 left-0 z-40 lg:z-20 flex shadow-2xl lg:shadow-none">
                <RepositoryExplorer
                  graphData={graphData}
                  selectedNodeId={selectedNode?.id}
                  selectedModule={selectedModule}
                  onSelectModule={(modName) => {
                    setSelectedModule(modName);
                    setCurrentLevel('L2');
                    if (window.innerWidth < 1024) setIsLeftSidebarOpen(false);
                  }}
                  onSelectNode={(node) => {
                    setSelectedNode(node);
                    setIsInspectorOpen(true);
                    if (window.innerWidth < 1024) setIsLeftSidebarOpen(false);
                  }}
                  onSelectFile={(fileNode) => {
                    setSelectedNode(fileNode);
                    setIsInspectorOpen(true);
                    if (window.innerWidth < 1024) setIsLeftSidebarOpen(false);
                  }}
                  onOpenReadme={() => setIsReadmeModalOpen(true)}
                />
                {/* Backdrop on mobile */}
                <div
                  onClick={() => setIsLeftSidebarOpen(false)}
                  className="lg:hidden fixed inset-0 -z-10 bg-slate-950/70 backdrop-blur-sm"
                />
              </div>
            )}

            {/* Column 2: Central React Flow Canvas */}
            <div className="flex-1 h-full relative overflow-hidden">
              {/* Interactive Step-by-Step Story Walkthrough (For both Non-Tech and Tech users) */}
              <DataFlowStoryWalkthrough
                graphData={graphData}
                currentStepIndex={currentStepIndex}
                onStepChange={setCurrentStepIndex}
                selectedNode={selectedNode}
                onSelectNode={(node) => {
                  setSelectedNode(node);
                  setIsInspectorOpen(true);
                }}
                onOpenStorySummary={() => setIsStoryModalOpen(true)}
                isSimpleMode={viewMode === 'simple'}
              />

              {/* Data Trace Toolbar (When active trace is running in Tech View) */}
              {viewMode === 'technical' && activeTrace && (
                <DataTraceToolbar
                  activeTrace={activeTrace}
                  availableVariables={availableVariables}
                  onSelectVariable={handleStartTrace}
                  onClearTrace={handleClearTrace}
                  currentStepIndex={currentStepIndex}
                  onStepChange={(newIndexOrFn) => {
                    const newIndex = typeof newIndexOrFn === 'function' ? newIndexOrFn(currentStepIndex) : newIndexOrFn;
                    setCurrentStepIndex(newIndex);
                    if (activeTrace?.path?.[newIndex]) {
                      setSelectedNode(activeTrace.path[newIndex]);
                      setIsInspectorOpen(true);
                    }
                  }}
                />
              )}

              <FlowCanvas
                rawNodes={graphData.nodes}
                rawEdges={graphData.edges}
                currentLevel={currentLevel}
                selectedModule={selectedModule}
                setSelectedModule={setSelectedModule}
                availableModules={availableModules}
                searchQuery={searchQuery}
                activeTrace={activeTrace}
                selectedNode={selectedNode}
                onSelectNode={(node) => {
                  setSelectedNode(node);
                  setIsInspectorOpen(true);
                }}
                onLevelChange={(lvl) => setCurrentLevel(lvl)}
                viewMode={viewMode}
              />
            </div>

            {/* Column 3: Right Node Inspector with Monaco (Responsive) */}
            {selectedNode && isInspectorOpen && (
              <div className="fixed xl:relative inset-y-0 right-0 z-40 xl:z-20 flex shadow-2xl xl:shadow-none">
                <InspectorPanel
                  selectedNode={selectedNode}
                  filesMap={graphData.filesMap}
                  incomingEdges={incomingEdges}
                  outgoingEdges={outgoingEdges}
                  onClose={() => setIsInspectorOpen(false)}
                  onSelectNode={(id) => {
                    const target = graphData.nodes.find((n) => n.id === id);
                    if (target) setSelectedNode(target);
                  }}
                  onStartTrace={handleStartTrace}
                  onExploreCodeFlow={(node) => {
                    setViewMode('technical');
                    setCurrentLevel('L4');
                    if (node?.module) {
                      setSelectedModule(node.module);
                    }
                  }}
                  isSimpleMode={viewMode === 'simple'}
                />
                {/* Backdrop on tablet / laptop */}
                <div
                  onClick={() => setIsInspectorOpen(false)}
                  className="xl:hidden fixed inset-0 -z-10 bg-slate-950/60 backdrop-blur-sm"
                />
              </div>
            )}

            {/* Plain English Story Summary Modal */}
            <DataFlowStoryModal
              isOpen={isStoryModalOpen}
              onClose={() => setIsStoryModalOpen(false)}
              graphData={graphData}
              onSelectStep={(step, idx) => {
                setSelectedNode(step);
                setCurrentStepIndex(idx);
                setIsInspectorOpen(true);
              }}
              onOpenReadme={() => setIsReadmeModalOpen(true)}
            />

            {/* Plain English Complete Project README & Guide Modal */}
            <ReadmeModal
              isOpen={isReadmeModalOpen}
              onClose={() => setIsReadmeModalOpen(false)}
              graphData={graphData}
            />
          </>
        ) : (
          <WelcomeState
            repoUrl={repoUrl}
            setRepoUrl={setRepoUrl}
            loading={loading}
            onAnalyze={handleAnalyze}
            onSelectSample={(sampleUrl) => {
              setRepoUrl(sampleUrl);
              handleAnalyze(sampleUrl);
            }}
          />
        )}
      </div>

      {/* Floating Codebase AI Chatbot */}
      <AIChatDrawer
        graphData={graphData}
        selectedNode={selectedNode}
        onSelectNode={(node) => {
          setSelectedNode(node);
          setIsInspectorOpen(true);
        }}
      />
    </div>
  );
}

