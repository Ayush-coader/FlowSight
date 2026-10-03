/**
 * Data Flow Engine
 * Statically infers variable transformations, parameter pass-throughs,
 * and data flow linkages between functions and database operations.
 */

/**
 * Extracts data flow edges from assignments, parameter passing, and return values
 * @param {Array<Object>} analyzedFiles
 * @param {Object} symbolIndex
 * @param {Function} resolveCalleeTarget
 * @returns {Array<Object>} Extracted DATA_FLOW and RETURN_FLOW edges
 */
function isBoilerplate(name) {
  if (!name) return true;
  const str = String(name).toLowerCase();
  return (
    str.startsWith('require') ||
    str.startsWith('import') ||
    str.startsWith('module.exports') ||
    str.startsWith('exports') ||
    str.includes('express.router') ||
    str === 'router' ||
    str === 'express' ||
    str === 'dotenv'
  );
}

function extractDataFlowEdges(analyzedFiles, symbolIndex, resolveCalleeTarget) {
  const dataEdges = [];
  let edgeCounter = 0;

  for (const fileData of analyzedFiles) {
    const filePath = fileData.file;

    // 1. Trace Variable Assignments inside file (skipping boilerplate)
    // e.g. target: 'email', source: 'req.body.email'
    for (const assign of fileData.assignments || []) {
      if (assign.source && assign.target && !isBoilerplate(assign.source) && !isBoilerplate(assign.target)) {
        const sourceNodeId = `${filePath}:${assign.source}`;
        const targetNodeId = `${filePath}:${assign.target}`;

        dataEdges.push({
          id: `flow_assign_${++edgeCounter}`,
          source: sourceNodeId,
          target: targetNodeId,
          type: 'DATA_FLOW',
          label: `transforms to ${assign.target}`,
          confidence: {
            level: 'CONFIRMED',
            score: 0.98,
            reason: 'Direct AST variable assignment / destructuring'
          },
          metadata: {
            sourceVar: assign.source,
            targetVar: assign.target,
            line: assign.loc?.start?.line
          }
        });
      }
    }

    // 2. Trace Function Calls & Parameter Passing
    // e.g. login(req, res) calls loginUser(email, password)
    for (const call of fileData.calls || []) {
      if (!call.enclosingFunction) continue;

      const callerNodeId = `${filePath}:${call.enclosingFunction}`;
      const resolved = resolveCalleeTarget(filePath, call.calleeName, symbolIndex);

      if (resolved) {
        const calleeNodeId = `${resolved.targetFile}:${resolved.targetFunction}`;

        // Create FUNCTION_CALL edge
        dataEdges.push({
          id: `call_${++edgeCounter}`,
          source: callerNodeId,
          target: calleeNodeId,
          type: 'FUNCTION_CALL',
          label: `calls ${call.calleeName}(${call.arguments.join(', ')})`,
          confidence: resolved.confidence,
          metadata: {
            arguments: call.arguments,
            line: call.loc?.start?.line
          }
        });

        // If arguments are passed, create argument -> parameter DATA_FLOW
        const targetFn = symbolIndex.functionRegistry.get(calleeNodeId);
        if (targetFn && targetFn.params) {
          call.arguments.forEach((arg, index) => {
            const paramName = targetFn.params[index];
            if (paramName && arg !== 'undefined' && arg !== 'callback' && arg !== '{...}') {
              dataEdges.push({
                id: `flow_param_${++edgeCounter}`,
                source: `${filePath}:${arg}`,
                target: `${resolved.targetFile}:${paramName}`,
                type: 'DATA_FLOW',
                label: `passes ${arg} -> ${paramName}`,
                confidence: {
                  level: 'CONFIRMED',
                  score: 0.94,
                  reason: 'Direct argument to parameter binding in call expression'
                },
                metadata: {
                  sourceVar: arg,
                  targetVar: paramName,
                  callerFunction: call.enclosingFunction,
                  calleeFunction: targetFn.name
                }
              });
            }
          });
        }
      }
    }
  }

  return dataEdges;
}

module.exports = {
  extractDataFlowEdges
};
