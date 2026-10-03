import dagre from 'dagre';

/**
 * Calculates hierarchical layout coordinates for React Flow nodes and edges using Dagre
 * @param {Array<Object>} nodes
 * @param {Array<Object>} edges
 * @param {string} direction - 'TB' (Top-to-Bottom, default) or 'LR' (Left-to-Right)
 * @returns {{ layoutNodes: Array<Object>, layoutEdges: Array<Object> }}
 */
export function getLayoutedElements(nodes, edges, direction = 'TB') {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isVertical = direction === 'TB';
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: isVertical ? 55 : 65,
    ranksep: isVertical ? 85 : 95,
    marginx: 40,
    marginy: 40
  });

  nodes.forEach((node) => {
    let width = 280;
    let height = 130;

    const nType = (node.type || '').toUpperCase();

    if (
      nType === 'PAGE' ||
      nType === 'USER_ACTION' ||
      nType === 'API' ||
      nType === 'CONTROLLER' ||
      nType === 'SERVICE' ||
      nType === 'DATABASE' ||
      nType === 'AUTHENTICATION' ||
      nType === 'RESPONSE' ||
      nType === 'NAVIGATION'
    ) {
      width = 290;
      const hasDataChips = (node.data?.inputs?.length || 0) > 0 || (node.data?.outputs?.length || 0) > 0 || (node.inputs?.length || 0) > 0 || (node.outputs?.length || 0) > 0;
      height = hasDataChips ? 145 : 115;
    } else if (nType === 'DECISION' || node.type === 'condition') {
      width = 280;
      height = 120;
    } else if (node.type === 'module') {
      width = 260;
      height = 80;
    } else if (node.type === 'file') {
      width = 240;
      height = 70;
    } else if (node.type === 'function') {
      width = 250;
      height = 75;
    } else if (node.type === 'route') {
      width = 260;
      height = 70;
    } else if (node.type === 'db_operation') {
      width = 240;
      height = 70;
    } else if (node.type === 'component') {
      width = 240;
      height = 70;
    } else if (node.type === 'data') {
      width = 220;
      height = 55;
    } else if (node.type === 'response') {
      width = 240;
      height = 60;
    }

    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const width = nodeWithPosition?.width || 230;
    const height = nodeWithPosition?.height || 65;

    return {
      ...node,
      targetPosition: isVertical ? 'top' : 'left',
      sourcePosition: isVertical ? 'bottom' : 'right',
      position: {
        x: (nodeWithPosition?.x || 0) - width / 2,
        y: (nodeWithPosition?.y || 0) - height / 2
      }
    };
  });

  return { layoutNodes, layoutEdges: edges };
}
