import React, { useMemo, useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import SemanticNode from './nodes/SemanticNode';
import ModuleNode from './nodes/ModuleNode';
import FileNode from './nodes/FileNode';
import FunctionNode from './nodes/FunctionNode';
import RouteNode from './nodes/RouteNode';
import DatabaseNode from './nodes/DatabaseNode';
import ComponentNode from './nodes/ComponentNode';
import DataNode from './nodes/DataNode';
import ResponseNode from './nodes/ResponseNode';
import ConditionNode from './nodes/ConditionNode';
import CustomEdge from './edges/CustomEdge';
import { getLayoutedElements } from './layoutUtils';
import {
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ArrowDownUp,
  ArrowLeftRight,
  ChevronRight,
  Code2
} from 'lucide-react';

const nodeTypes = {
  // Semantic Application Flow Nodes (L1 & L2 Module Flow)
  PAGE: SemanticNode,
  USER_ACTION: SemanticNode,
  API: SemanticNode,
  CONTROLLER: SemanticNode,
  SERVICE: SemanticNode,
  DATABASE: SemanticNode,
  AUTHENTICATION: SemanticNode,
  DECISION: ConditionNode,
  RESPONSE: SemanticNode,
  NAVIGATION: SemanticNode,
  DATA: DataNode,
  semantic: SemanticNode,

  // Technical & Hierarchy Nodes (L2/L3/L4)
  module: ModuleNode,
  file: FileNode,
  function: FunctionNode,
  route: RouteNode,
  db_operation: DatabaseNode,
  component: ComponentNode,
  data: DataNode,
  response: ResponseNode,
  condition: ConditionNode
};

const edgeTypes = {
  custom: CustomEdge
};

const SIMPLE_EDGE_LABELS = {
  APPLICATION_DATA_FLOW: 'Sends Data ➔',
  DATA_FLOW: 'Passes Data ➔',
  API_ROUTE: 'Calls Endpoint ➔',
  FUNCTION_CALL: 'Executes Function ➔',
  DATABASE_OPERATION: 'Queries Database ➔',
  RETURN_FLOW: 'Returns Result ➔',
  MODULE_DEPENDENCY: 'Uses Module ➔',
  COMPONENT_RENDER: 'Renders UI ➔',
  LOGIC_FLOW: 'Processes Logic ➔'
};

function FlowCanvasInner({
  rawNodes = [],
  rawEdges = [],
  currentLevel = 'L1',
  selectedModule = null,
  setSelectedModule,
  searchQuery = '',
  activeTrace = null,
  selectedNode = null,
  onSelectNode,
  onLevelChange,
  viewMode = 'simple'
}) {

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [direction, setDirection] = useState('TB'); // Top-to-Bottom by default
  const { fitView, zoomIn, zoomOut, setViewport, getViewport } = useReactFlow();

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      if (activeEl) {
        const tagName = activeEl.tagName?.toLowerCase();
        if (
          tagName === 'input' ||
          tagName === 'textarea' ||
          tagName === 'select' ||
          activeEl.isContentEditable ||
          activeEl.closest?.('.monaco-editor') ||
          activeEl.closest?.('input, textarea, select')
        ) {
          return;
        }
      }

      const step = e.shiftKey ? 180 : 80;
      let handled = false;
      const vp = getViewport();

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          setViewport({ x: vp.x, y: vp.y + step, zoom: vp.zoom });
          handled = true;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          setViewport({ x: vp.x, y: vp.y - step, zoom: vp.zoom });
          handled = true;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          setViewport({ x: vp.x + step, y: vp.y, zoom: vp.zoom });
          handled = true;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          setViewport({ x: vp.x - step, y: vp.y, zoom: vp.zoom });
          handled = true;
          break;
        case '+':
        case '=':
          zoomIn({ duration: 150 });
          handled = true;
          break;
        case '-':
        case '_':
          zoomOut({ duration: 150 });
          handled = true;
          break;
        case '0':
          setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 250 });
          handled = true;
          break;
        case 'f':
        case 'F':
          fitView({ padding: 0.2, duration: 300 });
          handled = true;
          break;
        default:
          break;
      }

      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [getViewport, setViewport, zoomIn, zoomOut, fitView]);

  // Progressive Filtering: Clean Separation of L1, L2, L3, and L4
  const filteredData = useMemo(() => {
    let visibleNodes;
    let visibleEdges;

    // Helper to check if a node belongs to selectedModule
    const isNodeInModule = (n, modName) => {
      if (!modName) return true;
      if (n.module === modName) return true;
      if (n.parentId === `module:${modName}`) return true;
      if (n.file && (n.file.includes(`/${modName}/`) || n.file.startsWith(`${modName}/`))) return true;
      if (n.technicalName && n.technicalName.includes(modName)) return true;
      return false;
    };

    if (currentLevel === 'L1' || viewMode === 'simple') {
      // -------------------------------------------------------------
      // LEVEL 1: Semantic Application Flow (Clean, User-to-Data Journey)
      // -------------------------------------------------------------
      visibleNodes = rawNodes.filter(
        (n) =>
          n.level === 'L1' ||
          n.type === 'PAGE' ||
          n.type === 'USER_ACTION' ||
          n.type === 'API' ||
          n.type === 'CONTROLLER' ||
          n.type === 'SERVICE' ||
          n.type === 'DATABASE' ||
          n.type === 'AUTHENTICATION' ||
          n.type === 'DECISION' ||
          n.type === 'RESPONSE' ||
          n.type === 'NAVIGATION'
      );

      // Fallback if repository has no synthesized semantic flow
      if (visibleNodes.length === 0) {
        visibleNodes = rawNodes.filter((n) => n.level === 'L2' || n.type === 'module');
      }

      const nodeIds = new Set(visibleNodes.map((n) => n.id));
      visibleEdges = rawEdges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
    } else if (currentLevel === 'L2' || currentLevel === 'ARCH') {
      // -------------------------------------------------------------
      // LEVEL 2: Module Flow / High-Level Responsibilities
      // -------------------------------------------------------------
      if (!selectedModule) {
        visibleNodes = rawNodes.filter((n) => n.level === 'L2' || n.type === 'module');
        const nodeIds = new Set(visibleNodes.map((n) => n.id));
        visibleEdges = rawEdges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
      } else {
        const semanticInModule = rawNodes.filter(
          (n) =>
            (n.level === 'L1' ||
              n.type === 'API' ||
              n.type === 'CONTROLLER' ||
              n.type === 'SERVICE' ||
              n.type === 'DATABASE' ||
              n.type === 'DECISION' ||
              n.type === 'RESPONSE') &&
            isNodeInModule(n, selectedModule)
        );

        if (semanticInModule.length > 0) {
          visibleNodes = semanticInModule;
          const nodeIds = new Set(visibleNodes.map((n) => n.id));
          visibleEdges = rawEdges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
        } else {
          visibleNodes = rawNodes.filter(
            (n) =>
              (n.type === 'route' ||
                n.type === 'function' ||
                n.type === 'db_operation' ||
                n.type === 'condition' ||
                n.type === 'response') &&
              isNodeInModule(n, selectedModule)
          );
          const nodeIds = new Set(visibleNodes.map((n) => n.id));
          visibleEdges = rawEdges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
        }
      }
    } else if (currentLevel === 'L3') {
      // -------------------------------------------------------------
      // LEVEL 3: File / Function Flow (Structural Hierarchy)
      // -------------------------------------------------------------
      visibleNodes = rawNodes.filter(
        (n) =>
          (n.type === 'file' ||
            n.type === 'function' ||
            n.type === 'route' ||
            n.type === 'db_operation' ||
            n.type === 'component') &&
          (!selectedModule || isNodeInModule(n, selectedModule))
      );
      const nodeIds = new Set(visibleNodes.map((n) => n.id));
      visibleEdges = rawEdges.filter(
        (e) =>
          (e.type === 'IMPORT' ||
            e.type === 'API_ROUTE' ||
            e.type === 'FUNCTION_CALL' ||
            e.type === 'DATABASE_OPERATION' ||
            e.type === 'COMPONENT_RENDER' ||
            e.type === 'RETURN_FLOW') &&
          nodeIds.has(e.source) &&
          nodeIds.has(e.target)
      );
    } else {
      // -------------------------------------------------------------
      // LEVEL 4: Detailed Code & Data Flow (Full AST, Variables, Exact Lineage)
      // -------------------------------------------------------------
      visibleNodes = rawNodes.filter(
        (n) =>
          (n.level === 'L4' ||
            n.type === 'function' ||
            n.type === 'route' ||
            n.type === 'db_operation' ||
            n.type === 'component' ||
            n.type === 'condition' ||
            n.type === 'data' ||
            n.type === 'response') &&
          (!selectedModule || isNodeInModule(n, selectedModule))
      );
      const nodeIds = new Set(visibleNodes.map((n) => n.id));
      visibleEdges = rawEdges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
    }

    // Apply Search Query & Data Trace Highlighting
    const activeSearch = searchQuery.trim().toLowerCase();
    const traceNodeIds = new Set(activeTrace?.path?.map((p) => p.id) || []);
    const traceEdgeIds = new Set(activeTrace?.edgeIds || []);

    const isSimple = viewMode === 'simple';

    // Deduplicate visibleNodes by id to avoid key collisions
    const seenNodeIds = new Set();
    const dedupedVisibleNodes = [];
    for (const node of visibleNodes) {
      if (!seenNodeIds.has(node.id)) {
        seenNodeIds.add(node.id);
        dedupedVisibleNodes.push(node);
      }
    }

    const processedNodes = dedupedVisibleNodes.map((node, idx) => {
      const isSelected = selectedNode?.id === node.id;
      const isTraceNode =
        traceNodeIds.has(node.id) ||
        (activeTrace &&
          (node.inputs?.includes(activeTrace.variable) ||
            node.outputs?.includes(activeTrace.variable) ||
            node.name?.toLowerCase().includes(activeTrace.variable.toLowerCase())));
      const isSearchMatch = activeSearch
        ? (node.semanticName || node.name)?.toLowerCase().includes(activeSearch) ||
          node.file?.toLowerCase().includes(activeSearch) ||
          node.description?.toLowerCase().includes(activeSearch)
        : true;

      const isFaded = (activeTrace && !isTraceNode) || (activeSearch && !isSearchMatch);
      const isHighlighted = isTraceNode || isSelected;

      // Assign step number in Simple Mode / L1
      const stepNumber = isSimple || currentLevel === 'L1' ? idx + 1 : undefined;

      return {
        id: node.id,
        type: node.type,
        data: {
          ...node,
          stepNumber,
          isSimpleMode: isSimple
        },
        className: `${isFaded ? 'node-faded opacity-20' : 'opacity-100'} ${isHighlighted ? 'node-highlighted ring-2 ring-sky-400' : ''}`,
        selected: isSelected
      };
    });

    // Deduplicate visibleEdges by id
    const seenEdgeIds = new Set();
    const dedupedVisibleEdges = [];
    for (const edge of visibleEdges) {
      if (!seenEdgeIds.has(edge.id)) {
        seenEdgeIds.add(edge.id);
        dedupedVisibleEdges.push(edge);
      }
    }

    const processedEdges = dedupedVisibleEdges.map((edge) => {
      const isTraceActive =
        traceEdgeIds.has(edge.id) ||
        (traceNodeIds.has(edge.source) && traceNodeIds.has(edge.target)) ||
        (activeTrace &&
          edge.dataItems?.some(
            (d) => d.name === activeTrace.variable || d.sourceVariable === activeTrace.variable
          ));
      const isFaded = activeTrace && !isTraceActive;

      const edgeColor = {
        APPLICATION_DATA_FLOW: '#38bdf8',
        DATA_FLOW: '#06b6d4',
        FUNCTION_CALL: '#a855f7',
        API_ROUTE: '#f43f5e',
        DATABASE_OPERATION: '#eab308',
        RETURN_FLOW: '#3b82f6',
        MODULE_DEPENDENCY: '#6366f1',
        IMPORT: '#64748b',
        COMPONENT_RENDER: '#818cf8',
        LOGIC_FLOW: '#f59e0b',
        CONDITIONAL_BRANCH:
          edge.label?.startsWith('Yes') || edge.metadata?.isYesBranch
            ? '#10b981'
            : edge.label?.startsWith('No') || edge.metadata?.isNoBranch
            ? '#f43f5e'
            : '#f59e0b'
      }[edge.type] || '#38bdf8';

      const displayLabel = isSimple
        ? SIMPLE_EDGE_LABELS[edge.type] || edge.label
        : edge.label;

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'custom',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isTraceActive ? '#38bdf8' : isFaded ? '#1e293b' : edgeColor,
          width: 14,
          height: 14
        },
        data: {
          label: displayLabel,
          type: edge.type,
          dataItems: edge.dataItems,
          confidence: isSimple ? null : edge.confidence,
          isTraceActive,
          isFaded
        }
      };
    });

    return getLayoutedElements(processedNodes, processedEdges, direction);
  }, [rawNodes, rawEdges, currentLevel, selectedModule, searchQuery, activeTrace, selectedNode?.id, direction, viewMode]);

  useEffect(() => {
    setNodes(filteredData.layoutNodes);
    setEdges(filteredData.layoutEdges);
    const timer = setTimeout(() => {
      fitView({ padding: 0.22, duration: 400 });
    }, 60);
    return () => clearTimeout(timer);
  }, [filteredData, setNodes, setEdges, fitView]);

  // Click & Double Click Node Handlers
  const handleNodeClick = useCallback(
    (_, node) => {
      const originalNode = rawNodes.find((n) => n.id === node.id);
      if (originalNode) {
        if (originalNode.type === 'module') {
          if (setSelectedModule) setSelectedModule(originalNode.name);
          if (onLevelChange) onLevelChange('L2');
        }
        onSelectNode(originalNode);
      }
    },
    [rawNodes, onSelectNode, onLevelChange, setSelectedModule]
  );

  const handleNodeDoubleClick = useCallback(
    (_, node) => {
      const originalNode = rawNodes.find((n) => n.id === node.id);
      if (originalNode) {
        if (originalNode.type === 'module') {
          if (setSelectedModule) setSelectedModule(originalNode.name);
          if (onLevelChange) onLevelChange('L2');
        } else if (viewMode === 'technical' && (currentLevel === 'L1' || currentLevel === 'L2')) {
          if (onLevelChange) onLevelChange('L4');
        }
        onSelectNode(originalNode);
      }
    },
    [rawNodes, currentLevel, onSelectNode, onLevelChange, setSelectedModule, viewMode]
  );

  // Dynamic Breadcrumb
  const breadcrumbs = useMemo(() => {
    const parts = [
      {
        label: 'FlowSight',
        onClick: () => {
          if (setSelectedModule) setSelectedModule(null);
          if (onLevelChange) onLevelChange('L1');
        }
      }
    ];

    if (viewMode === 'simple' || currentLevel === 'L1') {
      parts.push({
        label: 'Application Flow',
        isCurrent: !selectedNode,
        onClick: selectedNode ? () => onSelectNode(null) : undefined
      });
      if (selectedNode) {
        parts.push({
          label: selectedNode.semanticName || selectedNode.name,
          isCurrent: true
        });
      }
    } else if (currentLevel === 'L2' || currentLevel === 'ARCH') {
      parts.push({
        label: 'Modules Flow',
        onClick: selectedModule ? () => setSelectedModule(null) : undefined,
        isCurrent: !selectedModule && !selectedNode
      });
      if (selectedModule) {
        parts.push({
          label: `Module: ${selectedModule}`,
          isCurrent: !selectedNode
        });
      }
      if (selectedNode && selectedNode.type !== 'module') {
        parts.push({
          label: selectedNode.semanticName || selectedNode.name,
          isCurrent: true
        });
      }
    } else if (currentLevel === 'L3') {
      parts.push({
        label: 'Files & Functions',
        onClick: () => onLevelChange('L2')
      });
      if (selectedModule) {
        parts.push({
          label: `Module: ${selectedModule}`,
          isCurrent: !selectedNode
        });
      }
      if (selectedNode) {
        parts.push({
          label: selectedNode.name,
          isCurrent: true
        });
      }
    } else {
      parts.push({
        label: 'Code Flow (AST)',
        onClick: () => onLevelChange('L1')
      });
      if (selectedModule) {
        parts.push({
          label: `Module: ${selectedModule}`,
          onClick: () => onLevelChange('L2')
        });
      }
      if (selectedNode) {
        if (selectedNode.file) {
          parts.push({
            label: selectedNode.file.split('/').pop()
          });
        }
        parts.push({
          label: selectedNode.name,
          isCurrent: true
        });
      }
    }

    return parts;
  }, [currentLevel, selectedModule, selectedNode, onLevelChange, setSelectedModule, onSelectNode, viewMode]);

  return (
    <div className="w-full h-full relative bg-[#070a12] select-none">
      {/* Top-Left Dynamic Breadcrumbs */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0f172a]/95 border border-slate-800 text-xs font-mono text-slate-300 backdrop-blur-xl shadow-xl">
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={idx}>
            <span
              onClick={crumb.onClick}
              className={`transition-colors ${
                crumb.isCurrent
                  ? 'text-sky-400 font-bold'
                  : crumb.onClick
                  ? 'text-slate-400 hover:text-sky-300 cursor-pointer underline decoration-dotted'
                  : 'text-slate-400'
              }`}
            >
              {crumb.label}
            </span>
            {idx < breadcrumbs.length - 1 && (
              <ChevronRight size={13} className="text-slate-600 shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Top-Left Scoped Module Banner (when in L2/L3/L4 with a selectedModule in Tech View) */}
      {viewMode === 'technical' && selectedModule && (
        <div className="absolute top-14 left-4 z-20 flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#0f172a]/95 border border-sky-500/40 text-xs text-slate-200 backdrop-blur-xl shadow-xl">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="text-sky-400 font-bold">Module Scope:</span>
            <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 font-mono font-bold border border-sky-500/30">
              {selectedModule}
            </span>
          </div>
          <span className="text-slate-400 text-[11px] font-mono">({filteredData.layoutNodes.length} nodes)</span>

          <div className="h-3.5 w-px bg-slate-700 mx-0.5" />

          {currentLevel !== 'L4' && (
            <button
              onClick={() => onLevelChange && onLevelChange('L4')}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-semibold text-[11px] border border-indigo-500/30 transition-all cursor-pointer"
              title="Explore detailed AST & Data Flow for this module"
            >
              <Code2 size={12} />
              <span>Explore Code Flow (L4)</span>
            </button>
          )}

          <button
            onClick={() => setSelectedModule && setSelectedModule(null)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-all cursor-pointer"
            title="View entire repository flow"
          >
            <span>🌐 Full Project</span>
          </button>
        </div>
      )}

      {/* Top-Right Compact Floating Canvas Controls */}
      <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-20 flex items-center gap-1 sm:gap-1.5 p-1 rounded-xl bg-[#0f172a]/95 border border-slate-800 text-xs text-slate-300 backdrop-blur-xl shadow-xl">
        <button
          onClick={() => setDirection((d) => (d === 'TB' ? 'LR' : 'TB'))}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-sky-400 transition-colors cursor-pointer"
          title="Toggle Layout Direction (Top-Bottom vs Left-Right)"
        >
          {direction === 'TB' ? <ArrowDownUp size={13} /> : <ArrowLeftRight size={13} />}
          <span className="hidden sm:inline text-[11px] font-mono font-semibold">{direction === 'TB' ? 'Vertical (TB)' : 'Horizontal (LR)'}</span>
        </button>

        <div className="h-4 w-px bg-slate-800" />

        <button
          onClick={() => fitView({ padding: 0.22, duration: 300 })}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-sky-300 transition-colors cursor-pointer"
          title="Fit View (F)"
        >
          <Maximize2 size={14} />
        </button>

        <button
          onClick={() => zoomIn({ duration: 200 })}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-sky-300 transition-colors cursor-pointer"
          title="Zoom In (+)"
        >
          <ZoomIn size={14} />
        </button>

        <button
          onClick={() => zoomOut({ duration: 200 })}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-sky-300 transition-colors cursor-pointer"
          title="Zoom Out (-)"
        >
          <ZoomOut size={14} />
        </button>

        <button
          onClick={() => setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 250 })}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-sky-300 transition-colors cursor-pointer"
          title="Reset Zoom (0)"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Main React Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onPaneClick={() => onSelectNode && onSelectNode(null)}
        fitView
        minZoom={0.15}
        maxZoom={2.2}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1.2}
          color="#1e293b"
          className="bg-[#070a12]"
        />
      </ReactFlow>
    </div>
  );
}

export default function FlowCanvas(props) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
