/**
 * FlowSight Data Trace Engine
 * Computes forward and backward data-flow trajectories through both Semantic Application Flow and Technical Graphs
 * using strict directed graph connectivity, exact variable matching, and conditional branch awareness.
 */

function normalizeVar(name) {
  if (!name || typeof name !== 'string') return '';
  return name.trim().toLowerCase();
}

/**
 * Checks if a specific dataItem on an edge carries the target variable or its confirmed alias
 */
function edgeCarriesVariable(edge, targetVar) {
  if (!edge) return false;
  const targetNorm = normalizeVar(targetVar);
  if (!targetNorm) return false;

  // Exact dataItems check
  if (Array.isArray(edge.dataItems) && edge.dataItems.length > 0) {
    return edge.dataItems.some((d) => {
      const dName = normalizeVar(typeof d === 'string' ? d : d.name);
      const srcVar = normalizeVar(typeof d === 'object' ? d.sourceVariable : d);
      const tgtVar = normalizeVar(typeof d === 'object' ? d.targetVariable : d);
      return (
        dName === targetNorm ||
        srcVar === targetNorm ||
        tgtVar === targetNorm ||
        (targetNorm === 'user' && (dName === 'authenticated user' || srcVar === 'authenticated user' || tgtVar === 'authenticated user')) ||
        (targetNorm === 'token' && (dName === 'authenticated session' || srcVar === 'authenticated session' || tgtVar === 'authenticated session'))
      );
    });
  }

  // Exact label check (splitting by ' + ' or ' , ')
  const labelParts = (edge.label || '').split(/\s*\+\s*|\s*,\s*/).map(normalizeVar);
  if (labelParts.includes(targetNorm)) return true;
  if (targetNorm === 'user' && labelParts.includes('authenticated user')) return true;
  if (targetNorm === 'token' && labelParts.includes('authenticated session')) return true;

  return false;
}

/**
 * Checks if a node produces, transforms, or accepts this variable
 */
function nodeTouchesVariable(node, targetVar) {
  if (!node) return false;
  const targetNorm = normalizeVar(targetVar);
  if (!targetNorm) return false;

  const inps = (node.inputs || node.params || []).map(normalizeVar);
  const outs = (node.outputs || node.returns || node.variablesCreated || []).map(normalizeVar);

  if (inps.includes(targetNorm) || outs.includes(targetNorm)) return true;
  if (targetNorm === 'user' && (inps.includes('authenticated user') || outs.includes('authenticated user'))) return true;
  if (targetNorm === 'token' && (inps.includes('authenticated session') || outs.includes('authenticated session'))) return true;

  return false;
}

/**
 * Checks if a node is an originating source for this variable
 */
function isSourceNodeForVariable(node, targetVar, incomingEdgesForNode) {
  if (!node) return false;
  const targetNorm = normalizeVar(targetVar);
  const outs = (node.outputs || node.returns || node.variablesCreated || []).map(normalizeVar);
  const inps = (node.inputs || node.params || []).map(normalizeVar);

  const producesVar = outs.includes(targetNorm) || (targetNorm === 'user' && outs.includes('authenticated user'));
  const hasIncomingEdgeForVar = incomingEdgesForNode.some((e) => edgeCarriesVariable(e, targetVar));

  // It is an originating source if it produces the variable without receiving it from an incoming edge,
  // or if it is an entry UI page / API root with the variable
  if (producesVar && !hasIncomingEdgeForVar) return true;
  if ((node.type === 'PAGE' || node.type === 'API') && (inps.includes(targetNorm) || producesVar) && !hasIncomingEdgeForVar) return true;

  return false;
}

/**
 * Calculates a complete, connected data flow path by traversing the graph
 * @param {string} startTarget - Variable name (e.g. 'email', 'password', 'user', 'token')
 * @param {Array<Object>} nodes - All graph nodes
 * @param {Array<Object>} edges - All graph edges
 * @param {Object} [options] - Options like branch choice: { branch: 'YES' | 'NO' | 'ALL' }
 * @returns {{ path: Array<Object>, edgeIds: Array<string>, variable: string }|null}
 */
function calculateDataTrace(startTarget, nodes = [], edges = [], options = {}) {
  if (!startTarget || nodes.length === 0) return null;

  const targetNorm = normalizeVar(startTarget);
  const branchMode = options.branch || 'YES'; // default to YES/primary path for decisions

  // Build adjacency maps
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const outgoingMap = new Map();
  const incomingMap = new Map();

  nodes.forEach((n) => {
    outgoingMap.set(n.id, []);
    incomingMap.set(n.id, []);
  });

  edges.forEach((e) => {
    if (outgoingMap.has(e.source)) outgoingMap.get(e.source).push(e);
    if (incomingMap.has(e.target)) incomingMap.get(e.target).push(e);
  });

  // Find all edges that carry this variable
  const matchingEdges = edges.filter((e) => edgeCarriesVariable(e, startTarget));
  if (matchingEdges.length === 0) {
    const matchingNodes = nodes.filter((n) => nodeTouchesVariable(n, startTarget));
    if (matchingNodes.length === 0) return null;
    return {
      variable: startTarget,
      path: matchingNodes,
      edgeIds: []
    };
  }

  // Find candidate start nodes (sources)
  let startNodes = nodes.filter((n) => isSourceNodeForVariable(n, startTarget, incomingMap.get(n.id) || []));

  // If no pure source found, pick nodes that touch variable and have outgoing matching edges but no incoming matching edges
  if (startNodes.length === 0) {
    startNodes = nodes.filter((n) => {
      const inc = incomingMap.get(n.id) || [];
      const out = outgoingMap.get(n.id) || [];
      const hasInc = inc.some((e) => edgeCarriesVariable(e, startTarget));
      const hasOut = out.some((e) => edgeCarriesVariable(e, startTarget));
      return hasOut && !hasInc;
    });
  }

  // Fallback: pick the source of the first matching edge
  if (startNodes.length === 0 && matchingEdges.length > 0) {
    const firstSrc = nodeMap.get(matchingEdges[0].source);
    if (firstSrc) startNodes = [firstSrc];
  }

  const collectedNodeIds = [];
  const collectedEdgeIds = [];
  const visitedNodeIds = new Set();
  const visitedEdgeIds = new Set();

  function traverseForward(currentNodeId) {
    if (visitedNodeIds.has(currentNodeId)) return;
    visitedNodeIds.add(currentNodeId);
    collectedNodeIds.push(currentNodeId);

    const outEdges = outgoingMap.get(currentNodeId) || [];
    const matchingOutEdges = outEdges.filter((e) => edgeCarriesVariable(e, startTarget));

    for (const edge of matchingOutEdges) {
      // Branch filtering for DECISION nodes:
      if (edge.type === 'CONDITIONAL_BRANCH' || edge.metadata?.isYesBranch || edge.metadata?.isNoBranch) {
        if (branchMode === 'YES' && (edge.metadata?.isNoBranch || edge.label?.toLowerCase().startsWith('no'))) {
          // Skip NO branch when tracing normal path
          continue;
        }
        if (branchMode === 'NO' && (edge.metadata?.isYesBranch || edge.label?.toLowerCase().startsWith('yes'))) {
          // Skip YES branch when tracing error path
          continue;
        }
      }

      if (!visitedEdgeIds.has(edge.id)) {
        visitedEdgeIds.add(edge.id);
        collectedEdgeIds.push(edge.id);
      }

      traverseForward(edge.target);
    }
  }

  // Run traversal starting from each source node
  startNodes.forEach((src) => {
    traverseForward(src.id);
  });

  const pathNodes = collectedNodeIds.map((id) => nodeMap.get(id)).filter(Boolean);
  if (pathNodes.length === 0) return null;

  return {
    variable: startTarget,
    path: pathNodes,
    edgeIds: collectedEdgeIds
  };
}

/**
 * Extracts a prioritized list of distinct tracked data variables across semantic and technical nodes
 */
function extractAvailableVariables(nodes = [], edges = []) {
  const vars = new Set();
  const priorityVars = ['email', 'password', 'user', 'token', 'username', 'id', 'result', 'response'];

  nodes.forEach((n) => {
    (n.inputs || []).forEach((inp) => inp && vars.add(inp));
    (n.outputs || []).forEach((out) => out && vars.add(out));
    (n.params || []).forEach((p) => p && vars.add(p));
    (n.variablesCreated || []).forEach((v) => v && vars.add(v));
  });

  edges.forEach((e) => {
    if (Array.isArray(e.dataItems)) {
      e.dataItems.forEach((d) => {
        if (typeof d === 'string') vars.add(d);
        else {
          if (d.name) vars.add(d.name);
          if (d.targetVariable) vars.add(d.targetVariable);
        }
      });
    }
  });

  const varList = Array.from(vars).filter(
    (v) =>
      v &&
      typeof v === 'string' &&
      v.length > 1 &&
      !v.startsWith('_') &&
      !v.includes(';') &&
      !v.includes('{') &&
      !v.startsWith('anonymous')
  );

  return varList.sort((a, b) => {
    const aPri = priorityVars.indexOf(a.toLowerCase());
    const bPri = priorityVars.indexOf(b.toLowerCase());
    if (aPri !== -1 && bPri !== -1) return aPri - bPri;
    if (aPri !== -1) return -1;
    if (bPri !== -1) return 1;
    return a.localeCompare(b);
  });
}

module.exports = {
  calculateDataTrace,
  extractAvailableVariables,
  edgeCarriesVariable,
  nodeTouchesVariable
};
