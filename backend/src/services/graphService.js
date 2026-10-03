const path = require('path');
const { analyzeSourceFile } = require('../analyzers/universalAnalyzer');
const { buildSymbolIndex, resolveCalleeTarget, resolveImportPath } = require('./resolverService');
const { extractDataFlowEdges } = require('./dataFlowEngine');
const { buildApplicationFlow } = require('./semanticFlowEngine');

/**
 * Builds the complete Intermediate Representation (IR) Graph for a repository across ALL languages and file types
 * @param {Array<{ relativePath: string, content: string, extension: string, size: number }>} files
 * @param {string} repoName
 * @returns {Object} Complete IR Graph containing nodes, edges, hierarchy, and metadata
 */
function buildRepositoryGraph(files, repoName) {
  const nodes = [];
  const edges = [];
  const filesMap = {}; // Map of relativePath -> file content for instant inspector viewing

  // Step 1: Run per-file multi-language analysis
  const analyzedFiles = [];
  const allRoutes = [];
  const expressMounts = [];
  const allDbOperations = [];
  const allComponents = [];
  const languageCounts = {};

  for (const file of files) {
    filesMap[file.relativePath] = file.content;

    // Run universal analyzer for current file
    const fileAnalysis = analyzeSourceFile(file);
    analyzedFiles.push(fileAnalysis);

    const lang = fileAnalysis.language || 'generic';
    languageCounts[lang] = (languageCounts[lang] || 0) + 1;

    // Collect routes (Express, Flask, FastAPI, Django, Gin, Spring, ASP.NET, etc.)
    if (fileAnalysis.routes && fileAnalysis.routes.length > 0) {
      allRoutes.push(...fileAnalysis.routes);
    }
    if (fileAnalysis.mounts && fileAnalysis.mounts.length > 0) {
      expressMounts.push(...fileAnalysis.mounts);
    }

    // Collect database operations (Mongoose, SQLAlchemy, Django, GORM, JPA, SQL, etc.)
    if (fileAnalysis.dbOperations && fileAnalysis.dbOperations.length > 0) {
      allDbOperations.push(...fileAnalysis.dbOperations);
    }

    // Collect UI components (React, Vue, Svelte, templates)
    if (fileAnalysis.components && fileAnalysis.components.length > 0) {
      allComponents.push(...fileAnalysis.components);
    }
  }

  // Step 2: Build Symbol Resolution Index
  const symbolIndex = buildSymbolIndex(analyzedFiles);

  // Step 2.5: Build Router Prefix Map
  const filePrefixMap = new Map(); // filePath -> prefix
  for (const mount of expressMounts) {
    const fileImports = symbolIndex.fileImports.get(mount.file) || [];
    for (const imp of fileImports) {
      if (imp.resolvedFile) {
        const matchesLocal = imp.specifiers?.some((s) => s.local === mount.routerName);
        const matchesSource = imp.source.includes(mount.routerName) || mount.routerName.includes(path.basename(imp.resolvedFile, path.extname(imp.resolvedFile)));
        if (matchesLocal || matchesSource) {
          filePrefixMap.set(imp.resolvedFile, mount.prefix);
        }
      }
    }
  }

  // Step 3: Discover Modules / Directories (for Level 2 hierarchy)
  const modulesMap = new Map(); // moduleName -> Array<file>
  for (const file of files) {
    const segments = file.relativePath.split('/');
    let moduleName = 'root';
    if (segments.length > 1) {
      moduleName = segments[0] === 'src' && segments.length > 2 ? segments[1] : segments[0];
    }
    if (!modulesMap.has(moduleName)) {
      modulesMap.set(moduleName, []);
    }
    modulesMap.get(moduleName).push(file.relativePath);
  }

  // Add Module Nodes (L2)
  for (const [modName, modFiles] of modulesMap.entries()) {
    nodes.push({
      id: `module:${modName}`,
      name: modName,
      type: 'module',
      level: 'L2',
      fileCount: modFiles.length,
      files: modFiles,
      parentId: null,
      analysisStatus: 'analyzed'
    });
  }

  // Step 4: Add File Nodes (L3) & Function Nodes (L4)
  for (const fileData of analyzedFiles) {
    const filePath = fileData.file;
    const segments = filePath.split('/');
    let moduleName = 'root';
    if (segments.length > 1) {
      moduleName = segments[0] === 'src' && segments.length > 2 ? segments[1] : segments[0];
    }

    // File Node
    nodes.push({
      id: filePath,
      name: path.basename(filePath),
      type: 'file',
      level: 'L3',
      file: filePath,
      parentId: `module:${moduleName}`,
      language: fileData.language || 'generic',
      analysisStatus: fileData.analysisStatus || 'analyzed',
      error: fileData.error,
      functionCount: fileData.functions?.length || 0,
      importCount: fileData.imports?.length || 0,
      exportCount: fileData.exports?.length || 0
    });

    // Function Nodes (L4)
    const fnCounts = new Map();
    for (let fIdx = 0; fIdx < (fileData.functions || []).length; fIdx++) {
      const fn = fileData.functions[fIdx];
      const baseName = fn.name || 'fn';
      const count = (fnCounts.get(baseName) || 0) + 1;
      fnCounts.set(baseName, count);

      const fnSuffix = count > 1 ? `_${fn.startLine || fIdx + 1}` : '';
      const fnUniqueKey = `${baseName}${fnSuffix}`;
      const fnId = `${filePath}:${fnUniqueKey}`;

      nodes.push({
        id: fnId,
        name: fn.name,
        type: 'function',
        level: 'L4',
        file: filePath,
        startLine: fn.startLine,
        endLine: fn.endLine,
        startColumn: fn.startColumn || 0,
        endColumn: fn.endColumn || 0,
        parentId: filePath,
        exportedName: fileData.exports?.find((e) => e.name === fn.name || e.local === fn.name)?.name || null,
        analysisStatus: fileData.analysisStatus || 'analyzed',
        module: moduleName,
        language: fileData.language || 'generic',
        sourceCode: fn.sourceCode,
        params: fn.params || [],
        returns: fn.returns || [],
        variablesCreated: fn.variablesCreated || [],
        variablesUsed: fn.variablesUsed || [],
        metadata: {
          isAsync: fn.isAsync,
          isAnonymous: fn.isAnonymous,
          frameworkRole: moduleName.toLowerCase().replace(/s$/, '')
        }
      });

      // Emit Response node if function has returns
      if (fn.returns && fn.returns.length > 0) {
        const retSnippet = fn.returns[0];
        const resNodeId = `${filePath}:res_${fnUniqueKey}`;
        nodes.push({
          id: resNodeId,
          name: retSnippet.startsWith('res.') || retSnippet.startsWith('jsonify') ? retSnippet : `return ${retSnippet}`,
          type: 'response',
          level: 'L4',
          file: filePath,
          parentId: filePath,
          analysisStatus: 'analyzed',
          module: moduleName,
          language: fileData.language || 'generic',
          metadata: {
            parentFunction: fn.name
          }
        });

        edges.push({
          id: `ret_${fnId}->${resNodeId}`,
          source: fnId,
          target: resNodeId,
          type: 'RETURN_FLOW',
          label: 'returns response',
          confidence: {
            level: 'CONFIRMED',
            score: 0.96,
            reason: 'Function return / HTTP response statement'
          }
        });
      }

      // Emit Condition / Decision nodes for logic branches
      if (fn.conditions && fn.conditions.length > 0) {
        fn.conditions.slice(0, 3).forEach((cond, cIdx) => {
          const condNodeId = `${filePath}:${fnUniqueKey}:cond_${cIdx + 1}`;
          nodes.push({
            id: condNodeId,
            name: cond.test.startsWith('if') ? cond.test : `if (${cond.test})`,
            type: 'condition',
            level: 'L4',
            file: filePath,
            parentId: filePath,
            analysisStatus: 'analyzed',
            module: moduleName,
            language: fileData.language || 'generic',
            metadata: {
              test: cond.test,
              consequent: cond.consequentSnippet,
              alternate: cond.alternateSnippet,
              parentFunction: fn.name
            }
          });

          // Edge from Function -> Condition Node
          edges.push({
            id: `cond_eval_${fnId}->${condNodeId}`,
            source: fnId,
            target: condNodeId,
            type: 'LOGIC_FLOW',
            label: 'checks condition',
            confidence: {
              level: 'CONFIRMED',
              score: 0.95,
              reason: 'Conditional decision branch'
            }
          });

          // If consequent has response/return, connect Condition -> Branch response
          if (cond.consequentSnippet && (cond.consequentSnippet.includes('res.') || cond.consequentSnippet.includes('jsonify') || cond.consequentSnippet.includes('return') || cond.consequentSnippet.includes('throw') || cond.consequentSnippet.includes('raise') || cond.consequentSnippet.includes('status') || cond.consequentSnippet.includes('send'))) {
            const errResNodeId = `${filePath}:cond_res_${fnUniqueKey}_${cIdx + 1}`;
            nodes.push({
              id: errResNodeId,
              name: cond.consequentSnippet.startsWith('res.') ? cond.consequentSnippet : `return ${cond.consequentSnippet}`,
              type: 'response',
              level: 'L4',
              file: filePath,
              parentId: filePath,
              analysisStatus: 'analyzed',
              module: moduleName,
              language: fileData.language || 'generic',
              metadata: {
                isErrorBranch: true,
                parentFunction: fn.name
              }
            });

            edges.push({
              id: `cond_yes_${condNodeId}->${errResNodeId}`,
              source: condNodeId,
              target: errResNodeId,
              type: 'CONDITIONAL_BRANCH',
              label: 'Yes (True)',
              confidence: {
                level: 'CONFIRMED',
                score: 0.95,
                reason: 'True condition branch'
              }
            });
          }
        });
      }
    }

    // Function Calls & Inter-function invocation edges
    for (const call of fileData.calls || []) {
      if (call.enclosingFunction) {
        const callerFnId = `${filePath}:${call.enclosingFunction}`;
        const resolved = resolveCalleeTarget(filePath, call.callee, symbolIndex);
        if (resolved) {
          const targetId = `${resolved.targetFile}:${resolved.targetFunction}`;
          const edgeId = `call_${callerFnId}->${targetId}`;
          if (!edges.some((e) => e.id === edgeId) && callerFnId !== targetId) {
            edges.push({
              id: edgeId,
              source: callerFnId,
              target: targetId,
              type: 'FUNCTION_CALL',
              label: `calls ${resolved.targetFunction}()`,
              confidence: resolved.confidence,
              metadata: {
                calleeName: call.callee
              }
            });
          }
        }
      }
    }

    // Import Edges (L3) & Module Dependency Aggregation (L1/L2)
    for (const imp of fileData.imports || []) {
      const resolvedTarget = symbolIndex.fileImports
        .get(filePath)
        ?.find((i) => i.source === imp.source)?.resolvedFile;

      if (resolvedTarget) {
        const impEdgeId = `imp_${filePath}->${resolvedTarget}`;
        if (!edges.some((e) => e.id === impEdgeId)) {
          edges.push({
            id: impEdgeId,
            source: filePath,
            target: resolvedTarget,
            type: 'IMPORT',
            label: `imports ${path.basename(resolvedTarget)}`,
            confidence: {
              level: 'CONFIRMED',
              score: 0.99,
              reason: 'Static import / dependency declaration'
            },
            metadata: {
              sourcePath: imp.source,
              specifiers: imp.specifiers
            }
          });
        }

        // Determine target module
        const targetSegments = resolvedTarget.split('/');
        let targetModule = 'root';
        if (targetSegments.length > 1) {
          targetModule = targetSegments[0] === 'src' && targetSegments.length > 2 ? targetSegments[1] : targetSegments[0];
        }

        if (moduleName !== targetModule) {
          const modEdgeId = `mod_dep_${moduleName}->${targetModule}`;
          if (!edges.some((e) => e.id === modEdgeId)) {
            edges.push({
              id: modEdgeId,
              source: `module:${moduleName}`,
              target: `module:${targetModule}`,
              type: 'MODULE_DEPENDENCY',
              label: `${moduleName} → ${targetModule}`,
              confidence: {
                level: 'CONFIRMED',
                score: 0.98,
                reason: 'Aggregated inter-module dependencies'
              }
            });
          }
        }
      }
    }
  }

  // Step 5: Add HTTP Route Nodes & API_ROUTE Edges (Express, Flask, FastAPI, Django, Gin, Spring, etc.)
  let routeIndex = 0;
  for (const route of allRoutes) {
    const prefix = filePrefixMap.get(route.file) || '';
    const cleanPrefix = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
    const cleanPath = (route.path || '/').startsWith('/') ? route.path : `/${route.path}`;
    const fullRoutePath = `${cleanPrefix}${cleanPath}` || '/';

    const routeNodeId = `${route.file}:${route.method}_${fullRoutePath}_${++routeIndex}`;
    nodes.push({
      id: routeNodeId,
      name: `${route.method} ${fullRoutePath}`,
      type: 'route',
      level: 'L4',
      file: route.file,
      startLine: route.startLine,
      endLine: route.endLine,
      parentId: route.file,
      analysisStatus: 'analyzed',
      module: 'routes',
      metadata: {
        method: route.method,
        path: fullRoutePath,
        rawPath: route.path,
        prefix,
        routerInstance: route.routerInstance
      }
    });

    // Link route to handler functions
    const handlerName = route.handler || (route.handlers && route.handlers[0]?.name);
    if (handlerName) {
      const resolved = resolveCalleeTarget(route.file, handlerName, symbolIndex);
      if (resolved) {
        edges.push({
          id: `route_edge_${routeNodeId}->${resolved.targetFile}:${resolved.targetFunction}`,
          source: routeNodeId,
          target: `${resolved.targetFile}:${resolved.targetFunction}`,
          type: 'API_ROUTE',
          label: `handles ${route.method} ${fullRoutePath}`,
          confidence: resolved.confidence,
          metadata: {
            httpMethod: route.method,
            routePath: fullRoutePath
          }
        });
      }
    }
  }

  // Step 6: Add Database Operation Nodes & DATABASE_OPERATION Edges (Mongoose, SQLAlchemy, Django, GORM, JPA, SQL, etc.)
  let dbIndex = 0;
  for (const op of allDbOperations) {
    const dbNodeId = `${op.file}:${op.model}.${op.operation}_${++dbIndex}`;
    nodes.push({
      id: dbNodeId,
      name: `${op.model}.${op.operation}()`,
      type: 'db_operation',
      level: 'L4',
      file: op.file,
      startLine: op.startLine,
      endLine: op.endLine,
      parentId: op.file,
      analysisStatus: 'analyzed',
      module: 'database',
      metadata: {
        model: op.model,
        operation: op.operation,
        queryArgs: op.queryArgs
      }
    });

    if (op.enclosingFunction) {
      const fnNodeId = `${op.file}:${op.enclosingFunction}`;
      edges.push({
        id: `db_edge_${fnNodeId}->${dbNodeId}`,
        source: fnNodeId,
        target: dbNodeId,
        type: 'DATABASE_OPERATION',
        label: `queries ${op.model}.${op.operation}()`,
        confidence: {
          level: 'CONFIRMED',
          score: 0.96,
          reason: 'Database query operation inside function'
        },
        metadata: {
          model: op.model,
          operation: op.operation
        }
      });
    }
  }

  // Step 7: Add UI Component Nodes & COMPONENT_RENDER Edges (React, Vue, etc.)
  for (const comp of allComponents) {
    const compNodeId = `${comp.file}:${comp.name}`;
    let existingNode = nodes.find((n) => n.id === compNodeId);
    if (!existingNode) {
      nodes.push({
        id: compNodeId,
        name: comp.name,
        type: 'component',
        level: 'L4',
        file: comp.file,
        startLine: comp.startLine,
        endLine: comp.endLine,
        parentId: comp.file,
        analysisStatus: 'analyzed',
        module: 'components',
        metadata: {
          stateVariables: comp.stateVariables || [],
          childComponents: comp.childComponents || []
        }
      });
    } else {
      existingNode.type = 'component';
      existingNode.metadata.stateVariables = comp.stateVariables || [];
      existingNode.metadata.childComponents = comp.childComponents || [];
    }

    for (const child of comp.childComponents || []) {
      const resolved = resolveCalleeTarget(comp.file, child, symbolIndex);
      if (resolved) {
        edges.push({
          id: `render_${compNodeId}->${resolved.targetFile}:${resolved.targetFunction}`,
          source: compNodeId,
          target: `${resolved.targetFile}:${resolved.targetFunction}`,
          type: 'COMPONENT_RENDER',
          label: `renders <${child} />`,
          confidence: {
            level: 'CONFIRMED',
            score: 0.95,
            reason: 'JSX/template child element reference'
          }
        });
      }
    }
  }

  // Step 8: Add Data Variable Nodes and Wire Data Flow Edges
  const dataFlowEdges = extractDataFlowEdges(analyzedFiles, symbolIndex, resolveCalleeTarget);
  
  const isBoilerplateVar = (name) => {
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
  };

  for (const edge of dataFlowEdges) {
    if (edge.type === 'DATA_FLOW' && edge.metadata?.sourceVar && edge.metadata?.targetVar) {
      const sourceVarName = edge.metadata.sourceVar;
      const targetVarName = edge.metadata.targetVar;

      if (isBoilerplateVar(sourceVarName) || isBoilerplateVar(targetVarName)) continue;

      if (!nodes.some((n) => n.id === edge.source)) {
        nodes.push({
          id: edge.source,
          name: sourceVarName,
          type: 'data',
          level: 'L4',
          file: edge.source.split(':')[0],
          parentId: edge.source.split(':')[0],
          analysisStatus: 'analyzed',
          metadata: { variable: sourceVarName }
        });
      }

      if (!nodes.some((n) => n.id === edge.target)) {
        nodes.push({
          id: edge.target,
          name: targetVarName,
          type: 'data',
          level: 'L4',
          file: edge.target.split(':')[0],
          parentId: edge.target.split(':')[0],
          analysisStatus: 'analyzed',
          metadata: { variable: targetVarName }
        });
      }
    }
  }

  edges.push(...dataFlowEdges);

  // Step 9: Build Semantic Application Flow Layer (L1) with Real Data Flow Overlay
  const applicationFlow = buildApplicationFlow(analyzedFiles, symbolIndex, nodes, edges, filePrefixMap);

  // Add semantic nodes and edges to the unified graph
  nodes.push(...applicationFlow.nodes);
  edges.push(...applicationFlow.edges);

  // Deduplicate nodes and edges to guarantee uniqueness
  const uniqueNodesMap = new Map();
  for (const node of nodes) {
    if (node && node.id && !uniqueNodesMap.has(node.id)) {
      uniqueNodesMap.set(node.id, node);
    }
  }
  const uniqueNodes = Array.from(uniqueNodesMap.values());

  const uniqueEdgesMap = new Map();
  for (const edge of edges) {
    if (edge && edge.id && !uniqueEdgesMap.has(edge.id)) {
      uniqueEdgesMap.set(edge.id, edge);
    }
  }
  const uniqueEdges = Array.from(uniqueEdgesMap.values());

  // High-level L1 Architecture Summary
  const l1Architecture = {
    hasFrontend: allComponents.length > 0 || analyzedFiles.some((f) => ['html', 'markup', 'css'].includes(f.language)),
    hasBackend: allRoutes.length > 0 || analyzedFiles.some((f) => ['python', 'go', 'rust', 'java', 'csharp', 'php', 'ruby', 'javascript', 'typescript'].includes(f.language)),
    hasDatabase: allDbOperations.length > 0 || analyzedFiles.some((f) => f.language === 'sql'),
    moduleCount: modulesMap.size,
    fileCount: files.length,
    functionCount: uniqueNodes.filter((n) => n.type === 'function').length,
    routeCount: allRoutes.length,
    dbOpCount: allDbOperations.length,
    applicationFlowStepCount: applicationFlow.nodes.length,
    languages: languageCounts
  };

  return {
    repositoryName: repoName,
    summary: l1Architecture,
    nodes: uniqueNodes,
    edges: uniqueEdges,
    applicationFlow,
    filesMap
  };
}

module.exports = {
  buildRepositoryGraph
};
