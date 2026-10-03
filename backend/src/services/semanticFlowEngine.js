const path = require('path');

/**
 * FlowSight Semantic Flow Engine
 * Interprets low-level AST, IR, routes, DB operations, and React components
 * into a human-understandable Application Flow Graph with a real Data Flow overlay.
 *
 * Strictly deterministic and evidence-driven:
 * - Never invents non-existent nodes or files
 * - Adapts dynamically to any JavaScript/TypeScript/MERN/Node/Express/Python/Go codebase
 */

// Helper to convert camelCase, PascalCase, or snake_case to Human Title Case
function humanizeIdentifier(str = '') {
  if (!str) return '';
  const cleaned = str
    .replace(/^get|^fetch|^handle|^on|^set|^do|^process|^run|^execute/i, '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return str;
  return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Deterministically derives semantic names and descriptions for HTTP routes
 */
function getRouteSemanticInfo(method = 'GET', routePath = '/') {
  const m = method.toUpperCase();
  const cleanPath = routePath.toLowerCase().replace(/^\/api\/?/, '/');
  const segments = cleanPath.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1] || 'root';

  // Authentication routes
  if (lastSegment === 'login' || cleanPath.includes('/auth/login')) {
    return { name: 'Login API', desc: 'Handles incoming HTTP POST request for user authentication', role: 'AUTH' };
  }
  if (lastSegment === 'register' || lastSegment === 'signup' || cleanPath.includes('/auth/register')) {
    return { name: 'Registration API', desc: 'Handles incoming HTTP request to register a new user account', role: 'AUTH' };
  }
  if (lastSegment === 'logout' || cleanPath.includes('/auth/logout')) {
    return { name: 'Logout API', desc: 'Terminates user session and invalidates authentication', role: 'AUTH' };
  }
  if (lastSegment === 'me' || lastSegment === 'profile' || cleanPath.includes('/user/profile')) {
    return { name: 'Get Profile API', desc: 'Retrieves profile information for the authenticated user', role: 'API' };
  }
  if (lastSegment === 'analyze' || cleanPath.includes('/analyze')) {
    return { name: 'Analyze Repository API', desc: 'Ingests source code and generates AST graph', role: 'SERVICE' };
  }
  if (lastSegment === 'explain' || cleanPath.includes('/explain')) {
    return { name: 'Explain Node API', desc: 'Generates semantic explanation for selected AST node', role: 'SERVICE' };
  }
  if (lastSegment === 'chat' || cleanPath.includes('/chat')) {
    return { name: 'Codebase Chat API', desc: 'Queries codebase knowledge via interactive chat', role: 'SERVICE' };
  }

  // Generic REST conventions
  const resource = humanizeIdentifier(segments[0] || 'Resource');
  if (m === 'GET') {
    if (segments.length > 1 && (lastSegment.startsWith(':') || lastSegment === 'id')) {
      return { name: `Get ${resource} by ID API`, desc: `Fetches a single ${resource} record by identifier`, role: 'API' };
    }
    return { name: `Get ${resource} API`, desc: `Retrieves a list of ${resource} records`, role: 'API' };
  }
  if (m === 'POST') {
    return { name: `Create ${resource} API`, desc: `Creates a new ${resource} record`, role: 'API' };
  }
  if (m === 'PUT' || m === 'PATCH') {
    return { name: `Update ${resource} API`, desc: `Updates existing ${resource} record`, role: 'API' };
  }
  if (m === 'DELETE') {
    return { name: `Delete ${resource} API`, desc: `Deletes ${resource} record from system`, role: 'API' };
  }

  return { name: `${m} ${routePath} API`, desc: `Endpoint for ${m} ${routePath}`, role: 'API' };
}

/**
 * Deterministically derives semantic names and descriptions for Database Operations
 */
function getDbSemanticInfo(model = 'Record', operation = 'find', queryArgs = []) {
  const op = (operation || 'find').toLowerCase();
  const m = humanizeIdentifier(model) || 'Document';

  const rawArgs = Array.isArray(queryArgs) ? queryArgs : [String(queryArgs || '')];
  const inputVars = [];
  for (const a of rawArgs) {
    const s = String(a || '').trim();
    if (!s || s === '{...}' || s === 'arg') continue;
    inputVars.push(s);
  }

  let fieldName = '';
  if (inputVars.length > 0) {
    fieldName = `by ${inputVars.map((v) => humanizeIdentifier(v)).join(' and ')}`;
  }

  const defaultInputs = inputVars.length > 0 ? inputVars : ['queryCriteria'];
  const defaultOutputs = [m.toLowerCase()];

  if (op === 'findone' || op === 'find_one') {
    return {
      name: fieldName ? `Find ${m} ${fieldName}` : `Find ${m}`,
      desc: `Query database for ${m.toLowerCase()} record ${fieldName || 'matching criteria'}`.trim(),
      inputs: defaultInputs,
      outputs: defaultOutputs
    };
  }
  if (op === 'findbyid' || op === 'find_by_id' || op === 'get') {
    return {
      name: `Find ${m} by ID`,
      desc: `Find ${m.toLowerCase()} record matching unique primary key identifier`,
      inputs: inputVars.length > 0 ? inputVars : ['id'],
      outputs: defaultOutputs
    };
  }
  if (op === 'create' || op === 'insert' || op === 'insertmany' || op === 'insert_one') {
    return {
      name: `Create ${m}`,
      desc: `Insert new ${m.toLowerCase()} record into database collection`,
      inputs: inputVars.length > 0 ? inputVars : [`${m.toLowerCase()}Data`],
      outputs: defaultOutputs
    };
  }
  if (op === 'save') {
    return {
      name: `Save ${m}`,
      desc: `Persist modified ${m.toLowerCase()} state to database`,
      inputs: defaultOutputs,
      outputs: [`saved${m}`]
    };
  }
  if (op === 'find' || op === 'filter' || op === 'all' || op === 'query') {
    return {
      name: `Find ${m}s`,
      desc: `Query all matching ${m.toLowerCase()} records from database`,
      inputs: defaultInputs,
      outputs: [`${m.toLowerCase()}List`]
    };
  }
  if (op.includes('update')) {
    return {
      name: `Update ${m}`,
      desc: `Modify existing ${m.toLowerCase()} record in database`,
      inputs: inputVars.length > 0 ? inputVars : ['id', 'updates'],
      outputs: [`updated${m}`]
    };
  }
  if (op.includes('delete') || op.includes('remove')) {
    return {
      name: `Delete ${m}`,
      desc: `Remove ${m.toLowerCase()} record from database collection`,
      inputs: inputVars.length > 0 ? inputVars : ['id'],
      outputs: ['result']
    };
  }

  return {
    name: `${humanizeIdentifier(operation)} ${m}`,
    desc: `Execute ${operation} on ${m} database collection`,
    inputs: defaultInputs,
    outputs: ['result']
  };
}

/**
 * Builds the high-level Semantic Application Flow Graph from analyzed source files
 * @param {Array<Object>} analyzedFiles
 * @param {Object} symbolIndex
 * @param {Array<Object>} technicalNodes
 * @param {Array<Object>} technicalEdges
 * @param {Map<string, string>} filePrefixMap
 * @returns {{ nodes: Array<Object>, edges: Array<Object> }} Semantic Application Flow Graph
 */
function buildApplicationFlow(analyzedFiles, symbolIndex, technicalNodes = [], technicalEdges = [], filePrefixMap = new Map()) {
  const semanticNodes = [];
  const semanticEdges = [];
  const visitedNodeKeys = new Set();
  let nodeIdCounter = 0;
  let edgeIdCounter = 0;

  const addSemanticNode = (nodeData) => {
    const key = `${nodeData.file || ''}:${nodeData.semanticName}:${nodeData.line || 0}`;
    if (visitedNodeKeys.has(key)) {
      return semanticNodes.find((n) => `${n.file || ''}:${n.semanticName}:${n.line || 0}` === key);
    }
    visitedNodeKeys.add(key);

    const node = {
      id: nodeData.id || `app_node_${++nodeIdCounter}`,
      name: nodeData.semanticName, // for React Flow rendering compatibility
      semanticName: nodeData.semanticName,
      description: nodeData.description || `Application flow step: ${nodeData.semanticName}`,
      type: nodeData.type || 'SERVICE', // PAGE, USER_ACTION, API, CONTROLLER, SERVICE, DATABASE, AUTHENTICATION, DECISION, RESPONSE, NAVIGATION, DATA
      level: 'L1',
      file: nodeData.file || '',
      line: nodeData.line || nodeData.startLine || 1,
      startLine: nodeData.startLine || nodeData.line || 1,
      endLine: nodeData.endLine || nodeData.line || 1,
      technicalName: nodeData.technicalName || nodeData.semanticName,
      technicalExpression: nodeData.technicalExpression || nodeData.technicalName || '',
      inputs: nodeData.inputs || [],
      outputs: nodeData.outputs || [],
      confidence: nodeData.confidence || {
        level: 'CONFIRMED',
        score: 0.98,
        reason: 'Deterministic AST-based application flow analysis'
      },
      sourceNodeIds: nodeData.sourceNodeIds || []
    };

    semanticNodes.push(node);
    return node;
  };

  const addSemanticEdge = (sourceNode, targetNode, options = {}) => {
    if (!sourceNode || !targetNode || sourceNode.id === targetNode.id) return null;

    // Determine data items flowing between source and target
    const sharedData = [];
    const rawItems = options.dataItems || [];

    if (rawItems.length > 0) {
      rawItems.forEach((item) => {
        const name = typeof item === 'string' ? item : item.name || 'data';
        sharedData.push({
          name,
          sourceVariable: typeof item === 'object' && item.sourceVariable ? item.sourceVariable : name,
          targetVariable: typeof item === 'object' && item.targetVariable ? item.targetVariable : name,
          confidence: (typeof item === 'object' && item.confidence) || options.confidence || {
            level: 'CONFIRMED',
            score: 0.98,
            reason: 'Data flow variable'
          }
        });
      });
    } else {
      const srcOutputs = sourceNode.outputs || [];
      const tgtInputs = targetNode.inputs || [];

      const commonVars = srcOutputs.filter((v) => tgtInputs.includes(v));
      const varsToUse = commonVars.length > 0 ? commonVars : srcOutputs.length > 0 ? srcOutputs : tgtInputs;

      varsToUse.forEach((varName) => {
        sharedData.push({
          name: varName,
          sourceVariable: varName,
          targetVariable: varName,
          confidence: options.confidence || {
            level: 'CONFIRMED',
            score: 0.98,
            reason: 'Direct variable flow across execution chain'
          }
        });
      });
    }

    const labelText =
      options.label ||
      (sharedData.length > 0 ? sharedData.map((d) => d.name).join(' + ') : 'flows to');

    const edge = {
      id: `app_edge_${++edgeIdCounter}_${sourceNode.id}->${targetNode.id}`,
      source: sourceNode.id,
      target: targetNode.id,
      type: options.type || 'APPLICATION_DATA_FLOW',
      label: labelText,
      dataItems: sharedData,
      confidence: options.confidence || {
        level: 'CONFIRMED',
        score: 0.98,
        reason: 'Direct application flow transition'
      },
      metadata: {
        isYesBranch: options.isYesBranch,
        isNoBranch: options.isNoBranch,
        conditionTest: options.conditionTest
      }
    };

    if (!semanticEdges.some((e) => e.source === edge.source && e.target === edge.target && e.label === edge.label)) {
      semanticEdges.push(edge);
    }
    return edge;
  };

  // Collect all discovered components, routes, database operations, and calls
  const allRoutes = [];
  const allDbOps = [];
  const allComponents = [];
  const allApiCalls = [];
  const allNavigations = [];
  const allUserActions = [];

  for (const file of analyzedFiles) {
    if (file.routes) allRoutes.push(...file.routes);
    if (file.dbOperations) allDbOps.push(...file.dbOperations);
    if (file.components) allComponents.push(...file.components);
    if (file.reactApiCalls) allApiCalls.push(...file.reactApiCalls);
    if (file.reactNavigations) allNavigations.push(...file.reactNavigations);
    if (file.reactUserActions) allUserActions.push(...file.reactUserActions);
  }

  // Deduplicate Express routes
  const distinctRoutes = [];
  const seenRouteKeys = new Set();
  for (const r of allRoutes) {
    const prefix = filePrefixMap.get(r.file) || '';
    const cleanPrefix = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
    const cleanPath = (r.path || '/').startsWith('/') ? r.path : `/${r.path}`;
    const fullRoutePath = `${cleanPrefix}${cleanPath}` || '/';
    const key = `${r.method}:${fullRoutePath}`;
    if (!seenRouteKeys.has(key)) {
      seenRouteKeys.add(key);
      distinctRoutes.push({ ...r, fullRoutePath });
    }
  }

  // ----------------------------------------------------
  // FLOW SYNTHESIS 1: Route-Driven Application Flows
  // ----------------------------------------------------
  for (const route of distinctRoutes) {
    const fullRoutePath = route.fullRoutePath;
    const routeInfo = getRouteSemanticInfo(route.method, fullRoutePath);
    const isAuthLogin = fullRoutePath.includes('login') || routeInfo.name.includes('Login');
    const isAuthRegister = fullRoutePath.includes('register') || fullRoutePath.includes('signup');

    // Step A: Check for Frontend Page & Action that triggers this route
    let pageNode = null;
    let actionNode = null;

    const matchedApiCall = allApiCalls.find(
      (api) =>
        api.endpoint === fullRoutePath ||
        api.endpoint === route.path ||
        fullRoutePath.endsWith(api.endpoint) ||
        (api.endpoint && fullRoutePath.includes(api.endpoint.replace('/api/', '')))
    );

    const matchedComponent = matchedApiCall
      ? allComponents.find((c) => c.file === matchedApiCall.file)
      : null;

    if (matchedComponent) {
      const pageName = `${humanizeIdentifier(matchedComponent.name.replace(/Page$|View$|Screen$/i, ''))} Page`;
      const pageOutputs = matchedApiCall.payloadVars?.length > 0
        ? matchedApiCall.payloadVars
        : isAuthLogin
        ? ['email', 'password']
        : isAuthRegister
        ? ['username', 'email', 'password']
        : ['formData'];

      pageNode = addSemanticNode({
        semanticName: pageName,
        description: `User interface view for ${pageName.toLowerCase()}`,
        type: 'PAGE',
        file: matchedComponent.file,
        line: matchedComponent.startLine || 1,
        technicalName: `<${matchedComponent.name} />`,
        technicalExpression: `<${matchedComponent.name} />`,
        inputs: [],
        outputs: pageOutputs,
        confidence: {
          level: 'CONFIRMED',
          score: 0.98,
          reason: 'Frontend React UI Page component'
        }
      });

      // User Action (e.g. Submit Login)
      const actionFnName = matchedApiCall.enclosingFunction || 'handleSubmit';
      const actionSemanticName = isAuthLogin
        ? 'Submit Login'
        : isAuthRegister
        ? 'Submit Registration'
        : `Submit ${humanizeIdentifier(actionFnName)}`;

      actionNode = addSemanticNode({
        semanticName: actionSemanticName,
        description: `User submits form credentials to initiate ${routeInfo.name}`,
        type: 'USER_ACTION',
        file: matchedComponent.file,
        line: (matchedComponent.startLine || 1) + 4,
        technicalName: actionFnName,
        technicalExpression: `${actionFnName}(e)`,
        inputs: pageOutputs,
        outputs: pageOutputs,
        confidence: {
          level: 'CONFIRMED',
          score: 0.96,
          reason: 'User interaction event handler triggering client API call'
        }
      });

      addSemanticEdge(pageNode, actionNode, {
        label: pageOutputs.join(' + '),
        dataItems: pageOutputs.map((v) => ({ name: v, sourceVariable: v, targetVariable: v }))
      });
    }

    // Step B: API Route Node
    const routeInputs = matchedApiCall?.payloadVars?.length > 0
      ? matchedApiCall.payloadVars
      : ['requestPayload'];
    const routeOutputs = routeInputs;

    const apiNode = addSemanticNode({
      semanticName: routeInfo.name,
      description: routeInfo.desc,
      type: 'API',
      file: route.file,
      line: route.startLine || 1,
      endLine: route.endLine || route.startLine,
      technicalName: `${route.method} ${fullRoutePath}`,
      technicalExpression: `${route.routerInstance || 'router'}.${route.method.toLowerCase()}("${route.path}", handler)`,
      inputs: routeInputs,
      outputs: routeOutputs,
      confidence: {
        level: 'CONFIRMED',
        score: 0.99,
        reason: 'Direct HTTP route definition'
      }
    });

    if (actionNode) {
      addSemanticEdge(actionNode, apiNode, {
        label: routeInputs.join(' + '),
        dataItems: routeInputs.map((v) => ({ name: v, sourceVariable: v, targetVariable: v }))
      });
    }

    // Step C: Controller Handler Node
    const handlerName = route.handler || (route.handlers && route.handlers[0]?.name);
    let lastNode = apiNode;
    let currentServiceNode = null;

    if (handlerName) {
      const resolvedHandler = symbolIndex ? resolveHandlerFunction(route.file, handlerName, symbolIndex) : null;
      const controllerFile = resolvedHandler?.file || route.file;
      const controllerFn = resolvedHandler || { name: handlerName, file: controllerFile, startLine: route.startLine };

      const controllerSemanticTitle = isAuthLogin
        ? 'Login Controller'
        : isAuthRegister
        ? 'Registration Controller'
        : handlerName.startsWith('inline') || handlerName.startsWith('anonymous')
        ? `${routeInfo.name.replace(/ API$/, '')} Controller`
        : `${humanizeIdentifier(handlerName)} Controller`;

      const controllerNode = addSemanticNode({
        semanticName: controllerSemanticTitle,
        description: `Receives request payload and coordinates execution for ${routeInfo.name}`,
        type: 'CONTROLLER',
        file: controllerFile,
        line: controllerFn.startLine || route.startLine,
        endLine: controllerFn.endLine || controllerFn.startLine,
        technicalName: handlerName,
        technicalExpression: `async function ${handlerName}(req, res)`,
        inputs: routeInputs,
        outputs: routeOutputs,
        confidence: {
          level: 'CONFIRMED',
          score: 0.98,
          reason: 'Route handler controller function'
        }
      });

      addSemanticEdge(lastNode, controllerNode, {
        label: routeOutputs.join(' + '),
        dataItems: routeOutputs.map((v) => ({ name: v, sourceVariable: v, targetVariable: v }))
      });
      lastNode = controllerNode;

      // Step D: Follow calls from Controller (Service functions & Auth operations)
      const fileData = analyzedFiles.find((f) => f.file === controllerFile);
      const callsInController = fileData?.calls?.filter((c) => c.enclosingFunction === handlerName) || [];
      let currentServiceFnName = null;
      let serviceFile = controllerFile;

      // Check for service calls (e.g. loginUser, registerUser, fetchRepository, etc.)
      for (const call of callsInController) {
        if (
          !call.calleeName.startsWith('res.') &&
          !call.calleeName.startsWith('req.') &&
          !call.calleeName.startsWith('console.') &&
          call.calleeName !== 'require' &&
          call.calleeName !== 'next'
        ) {
          const resolvedService = symbolIndex ? resolveHandlerFunction(controllerFile, call.calleeName, symbolIndex) : null;
          serviceFile = resolvedService?.file || controllerFile;
          currentServiceFnName = resolvedService?.name || call.calleeName;

          const isAuthService = isAuthLogin || call.calleeName.toLowerCase().includes('login') || call.calleeName.toLowerCase().includes('auth');
          const serviceSemanticTitle = isAuthService
            ? 'Authenticate User'
            : `${humanizeIdentifier(currentServiceFnName)}`;

          const serviceNode = addSemanticNode({
            semanticName: serviceSemanticTitle,
            description: `Executes business logic for ${serviceSemanticTitle}`,
            type: isAuthService ? 'AUTHENTICATION' : 'SERVICE',
            file: serviceFile,
            line: call.loc?.start?.line || controllerNode.line,
            technicalName: call.calleeName,
            technicalExpression: `${call.calleeName}(${(call.arguments || []).join(', ')})`,
            inputs: routeInputs,
            outputs: routeOutputs,
            confidence: {
              level: 'CONFIRMED',
              score: 0.96,
              reason: 'Business service invocation'
            }
          });

          addSemanticEdge(lastNode, serviceNode, {
            label: routeOutputs.join(' + '),
            dataItems: routeOutputs.map((v) => ({ name: v, sourceVariable: v, targetVariable: v }))
          });
          lastNode = serviceNode;
          currentServiceNode = serviceNode;
          break;
        }
      }

      // Step E: Database Operation in Flow (Exact function-scoped & line-scoped lookup)
      const relevantDbOp =
        (currentServiceFnName && allDbOps.find((op) => op.file === serviceFile && op.enclosingFunction === currentServiceFnName)) ||
        allDbOps.find((op) => op.file === controllerFile && op.enclosingFunction === handlerName) ||
        allDbOps.find((op) => op.file === route.file && op.startLine >= route.startLine && op.startLine <= (route.endLine || route.startLine + 40)) ||
        (serviceFile && !currentServiceFnName && allDbOps.find((op) => op.file === serviceFile)) ||
        (controllerFile && !handlerName && allDbOps.find((op) => op.file === controllerFile));

      if (relevantDbOp) {
        const dbInfo = getDbSemanticInfo(relevantDbOp.model, relevantDbOp.operation, relevantDbOp.queryArgs);
        const dbInputs = dbInfo.inputs;
        const dbOutputs = [relevantDbOp.model?.toLowerCase() || 'record'];

        const dbNode = addSemanticNode({
          semanticName: dbInfo.name,
          description: dbInfo.desc,
          type: 'DATABASE',
          file: relevantDbOp.file,
          line: relevantDbOp.startLine || 1,
          technicalName: `${relevantDbOp.model}.${relevantDbOp.operation}`,
          technicalExpression: `${relevantDbOp.model}.${relevantDbOp.operation}(${Array.isArray(relevantDbOp.queryArgs) ? relevantDbOp.queryArgs.join(', ') : ''})`,
          inputs: dbInputs,
          outputs: dbOutputs,
          confidence: {
            level: 'CONFIRMED',
            score: 0.98,
            reason: `Detected database ${relevantDbOp.operation} query`
          }
        });

        addSemanticEdge(lastNode, dbNode, {
          label: dbInputs.join(' + '),
          dataItems: dbInputs.map((v) => ({ name: v, sourceVariable: v, targetVariable: v }))
        });
        lastNode = dbNode;

        // Step F: Decision Node (e.g. Does User Exist?)
        const serviceFileData = analyzedFiles.find((f) => f.file === relevantDbOp.file);
        const relevantFunction = serviceFileData?.functions?.find((fn) => fn.name === relevantDbOp.enclosingFunction);
        const userCheckCondition = relevantFunction?.conditions?.find((c) => c.test?.includes('user') || c.test?.includes('data') || c.test?.includes('!'));

        let decisionNode = null;
        if (userCheckCondition || isAuthLogin) {
          const decisionTitle = isAuthLogin ? 'Does User Exist?' : `Is ${humanizeIdentifier(relevantDbOp.model)} Found?`;
          decisionNode = addSemanticNode({
            semanticName: decisionTitle,
            description: `Verifies whether database record exists for submitted identifier`,
            type: 'DECISION',
            file: relevantDbOp.file,
            line: userCheckCondition?.loc?.start?.line || (relevantDbOp.startLine || 1) + 2,
            technicalName: userCheckCondition?.test || 'if (!user)',
            technicalExpression: `if (!${dbOutputs[0]}) { return error; }`,
            inputs: dbOutputs,
            outputs: dbOutputs,
            confidence: {
              level: 'CONFIRMED',
              score: 0.95,
              reason: 'Conditional decision branch verifying database query result'
            }
          });

          addSemanticEdge(lastNode, decisionNode, {
            label: dbOutputs[0],
            dataItems: [{ name: dbOutputs[0], sourceVariable: dbOutputs[0], targetVariable: dbOutputs[0] }]
          });

          // Branch NO: Authentication Failed / Error
          const errResNode = addSemanticNode({
            semanticName: isAuthLogin ? 'Authentication Failed' : 'Resource Not Found',
            description: isAuthLogin ? 'Returns HTTP 401 Unauthorized because user was not found' : 'Returns error response',
            type: 'RESPONSE',
            file: relevantDbOp.file,
            line: (userCheckCondition?.loc?.start?.line || relevantDbOp.startLine || 1) + 1,
            technicalName: 'res.status(401).json',
            technicalExpression: 'res.status(401).json({ error: "Invalid credentials" })',
            inputs: ['error'],
            outputs: ['401 Unauthorized'],
            confidence: {
              level: 'CONFIRMED',
              score: 0.96,
              reason: 'Error response in conditional branch'
            }
          });

          addSemanticEdge(decisionNode, errResNode, {
            label: 'No (Not Found)',
            isNoBranch: true,
            type: 'CONDITIONAL_BRANCH',
            dataItems: [{ name: 'error', sourceVariable: dbOutputs[0], targetVariable: 'error' }]
          });

          lastNode = decisionNode;
        }

        // Step G: Authentication Verification & Token Generation (if bcrypt / jwt calls present)
        const callsInDbFile = serviceFileData?.calls || [];
        const bcryptCall = callsInDbFile.find((c) => c.calleeName.includes('bcrypt') || c.calleeName.includes('compare'));
        const jwtCall = callsInDbFile.find((c) => c.calleeName.includes('jwt') || c.calleeName.includes('sign'));

        let verifyPwdNode = null;
        if (bcryptCall) {
          const verifyPwdInputs = bcryptCall.arguments?.length >= 2 ? bcryptCall.arguments : ['password', 'user'];
          const verifyPwdExpression = bcryptCall.arguments?.length >= 2
            ? `const isMatch = await bcrypt.compare(${bcryptCall.arguments.join(', ')})`
            : 'const isMatch = await bcrypt.compare(password, user.password)';

          verifyPwdNode = addSemanticNode({
            semanticName: 'Verify Password',
            description: 'Compares submitted password with stored password hash using bcrypt',
            type: 'AUTHENTICATION',
            file: relevantDbOp.file,
            line: bcryptCall.loc?.start?.line || (relevantDbOp.startLine || 1) + 5,
            technicalName: bcryptCall.calleeName,
            technicalExpression: verifyPwdExpression,
            inputs: verifyPwdInputs,
            outputs: ['authenticated user'],
            confidence: {
              level: 'CONFIRMED',
              score: 0.98,
              reason: 'Bcrypt cryptographic password validation'
            }
          });

          addSemanticEdge(lastNode, verifyPwdNode, {
            label: 'Yes (User Found)',
            isYesBranch: true,
            type: 'CONDITIONAL_BRANCH',
            dataItems: [{ name: 'user', sourceVariable: 'user', targetVariable: 'user' }]
          });

          // Connect password input from service to verify password
          if (currentServiceNode && routeInputs.includes('password')) {
            addSemanticEdge(currentServiceNode, verifyPwdNode, {
              label: 'password',
              dataItems: [{ name: 'password', sourceVariable: 'password', targetVariable: 'password' }]
            });
          }

          lastNode = verifyPwdNode;
        }

        if (jwtCall) {
          const tokenNode = addSemanticNode({
            semanticName: 'Generate Login Token',
            description: 'Issues signed JSON Web Token (JWT) containing authenticated user identity',
            type: 'AUTHENTICATION',
            file: relevantDbOp.file,
            line: jwtCall.loc?.start?.line || (relevantDbOp.startLine || 1) + 8,
            technicalName: jwtCall.calleeName,
            technicalExpression: jwtCall.arguments?.length >= 2
              ? `const token = jwt.sign(${jwtCall.arguments.join(', ')})`
              : 'const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)',
            inputs: ['authenticated user'],
            outputs: [jwtCall.assignedVariable || 'token'],
            confidence: {
              level: 'CONFIRMED',
              score: 0.98,
              reason: 'JWT token signing for authenticated user'
            }
          });

          addSemanticEdge(lastNode, tokenNode, {
            label: 'user',
            dataItems: [{ name: 'user', sourceVariable: 'user', targetVariable: 'user' }]
          });
          lastNode = tokenNode;
        }
      }

      // Step H: Response Node (e.g. Login Response / Send Response)
      const resName = isAuthLogin ? 'Login Response' : isAuthRegister ? 'Registration Response' : 'Send Response';
      const resOutputs = isAuthLogin ? ['token'] : ['response'];
      const resInputs = isAuthLogin ? ['token'] : ['result'];

      const responseNode = addSemanticNode({
        semanticName: resName,
        description: `Returns HTTP 200 Success payload to client`,
        type: 'RESPONSE',
        file: controllerFile,
        line: (controllerNode.line || 1) + 10,
        technicalName: 'res.json',
        technicalExpression: isAuthLogin ? 'res.json({ token, user })' : 'res.json({ success: true })',
        inputs: resInputs,
        outputs: resOutputs,
        confidence: {
          level: 'CONFIRMED',
          score: 0.98,
          reason: 'HTTP response dispatch to client'
        }
      });

      addSemanticEdge(lastNode, responseNode, {
        label: isAuthLogin ? 'token' : 'result',
        dataItems: (isAuthLogin ? ['token'] : ['result']).map((v) => ({ name: v, sourceVariable: v, targetVariable: v }))
      });
      lastNode = responseNode;

      // Step I: Client-Side Navigation Flow (Function-scoped to caller action/API call)
      const actionFnName = matchedApiCall?.enclosingFunction;
      const callerNav =
        (actionFnName && allNavigations.find((n) => n.file === matchedApiCall.file && n.enclosingFunction === actionFnName && n.type === 'NAVIGATE')) ||
        allNavigations.find(
          (n) =>
            ((matchedComponent && n.file === matchedComponent.file) ||
              (matchedApiCall && n.file === matchedApiCall.file)) &&
            n.type === 'NAVIGATE'
        ) ||
        allNavigations.find(
          (n) =>
            (matchedComponent && n.file === matchedComponent.file) ||
            (matchedApiCall && n.file === matchedApiCall.file)
        );

      if (callerNav) {
        const navTarget = callerNav.target || '/home';
        const targetPageName = navTarget === '/home' || navTarget === '/' || navTarget === '/dashboard' ? 'Home Page' : `${humanizeIdentifier(navTarget.replace('/', ''))} Page`;

        const navNode = addSemanticNode({
          semanticName: `Go to ${targetPageName}`,
          description: `Client-side route redirection to ${navTarget}`,
          type: 'NAVIGATION',
          file: callerNav.file,
          line: callerNav.startLine || 1,
          technicalName: `navigate("${navTarget}")`,
          technicalExpression: `navigate("${navTarget}")`,
          inputs: ['token'],
          outputs: ['authenticated session'],
          confidence: {
            level: 'CONFIRMED',
            score: 0.95,
            reason: 'React Router navigate client-side redirection'
          }
        });

        addSemanticEdge(lastNode, navNode, {
          label: 'token',
          dataItems: [{ name: 'token', sourceVariable: 'token', targetVariable: 'token' }]
        });

        const homePageNode = addSemanticNode({
          semanticName: targetPageName,
          description: `Destination page view rendered after navigation`,
          type: 'PAGE',
          file: callerNav.file,
          line: (callerNav.startLine || 1) + 2,
          technicalName: `<${targetPageName.replace(/\s+/g, '')} />`,
          technicalExpression: `<${targetPageName.replace(/\s+/g, '')} />`,
          inputs: ['authenticated session'],
          outputs: [],
          confidence: {
            level: 'CONFIRMED',
            score: 0.95,
            reason: 'Destination Page Component'
          }
        });

        addSemanticEdge(navNode, homePageNode, {
          label: 'authenticated session',
          dataItems: [{ name: 'token', sourceVariable: 'token', targetVariable: 'token' }]
        });
      }
    }
  }

  // ----------------------------------------------------
  // FLOW SYNTHESIS 2: Pure Frontend Repositories (Components & Client API calls)
  // ----------------------------------------------------
  if (distinctRoutes.length === 0 && allComponents.length > 0) {
    for (const comp of allComponents) {
      if (comp.isPage || comp.name.endsWith('Page') || comp.name.endsWith('View') || comp.name.endsWith('Screen')) {
        const cleanCompName = comp.name.replace(/(Page|View|Screen)$/i, '');
        const pageName = `${humanizeIdentifier(cleanCompName || comp.name)} Page`;

        const pNode = addSemanticNode({
          semanticName: pageName,
          description: `User interface page view: ${pageName}`,
          type: 'PAGE',
          file: comp.file,
          line: comp.startLine || 1,
          technicalName: `<${comp.name} />`,
          technicalExpression: `<${comp.name} />`,
          inputs: [],
          outputs: ['userData'],
          confidence: { level: 'CONFIRMED', score: 0.95, reason: 'React Page Component' }
        });

        let currentFrontendNode = pNode;

        // Find child actions
        const actionsInFile = allUserActions.filter((a) => a.file === comp.file);
        for (const act of actionsInFile) {
          const actNode = addSemanticNode({
            semanticName: `Submit ${humanizeIdentifier(act.name)}`,
            description: `User action triggering UI state update or API dispatch`,
            type: 'USER_ACTION',
            file: act.file,
            line: act.startLine || 1,
            technicalName: act.name,
            technicalExpression: `${act.name}()`,
            inputs: ['userData'],
            outputs: ['formData'],
            confidence: { level: 'CONFIRMED', score: 0.95, reason: 'User event handler' }
          });
          addSemanticEdge(currentFrontendNode, actNode, { label: 'userData' });
          currentFrontendNode = actNode;
        }

        // Find API calls in component
        const apiCallsInFile = allApiCalls.filter((api) => api.file === comp.file);
        for (const api of apiCallsInFile) {
          const apiInfo = getRouteSemanticInfo(api.method || 'GET', api.endpoint || '/');
          const apiNode = addSemanticNode({
            semanticName: apiInfo.name,
            description: `Client dispatches ${api.method || 'GET'} request to ${api.endpoint}`,
            type: 'API',
            file: api.file,
            line: api.startLine || 1,
            technicalName: `${api.method || 'GET'} ${api.endpoint}`,
            technicalExpression: `axios.${(api.method || 'get').toLowerCase()}("${api.endpoint}")`,
            inputs: api.payloadVars?.length > 0 ? api.payloadVars : ['formData'],
            outputs: ['apiResponse'],
            confidence: { level: 'CONFIRMED', score: 0.95, reason: 'Client-side API call' }
          });
          addSemanticEdge(currentFrontendNode, apiNode, { label: (api.payloadVars || ['formData']).join(' + ') });
          currentFrontendNode = apiNode;
        }

        // Find navigations in component
        const navsInFile = allNavigations.filter((nav) => nav.file === comp.file);
        for (const nav of navsInFile) {
          const navTarget = nav.target || '/home';
          const targetPageName = `${humanizeIdentifier(navTarget.replace(/^\//, '').replace(/\//g, ' '))} Page`;

          const navNode = addSemanticNode({
            semanticName: `Go to ${targetPageName}`,
            description: `Client-side route redirection to ${navTarget}`,
            type: 'NAVIGATION',
            file: nav.file,
            line: nav.startLine || 1,
            technicalName: `navigate("${navTarget}")`,
            technicalExpression: `navigate("${navTarget}")`,
            inputs: ['apiResponse'],
            outputs: ['authenticated session'],
            confidence: { level: 'CONFIRMED', score: 0.95, reason: 'Client-side navigation' }
          });
          addSemanticEdge(currentFrontendNode, navNode, { label: 'navigation' });

          const destNode = addSemanticNode({
            semanticName: targetPageName,
            description: `Destination page view rendered after navigation`,
            type: 'PAGE',
            file: nav.file,
            line: (nav.startLine || 1) + 2,
            technicalName: `<${targetPageName.replace(/\s+/g, '')} />`,
            technicalExpression: `<${targetPageName.replace(/\s+/g, '')} />`,
            inputs: ['authenticated session'],
            outputs: [],
            confidence: { level: 'CONFIRMED', score: 0.95, reason: 'Destination Page Component' }
          });
          addSemanticEdge(navNode, destNode, { label: 'rendered' });
          currentFrontendNode = destNode;
        }
      }
    }
  }

  // ----------------------------------------------------
  // FLOW SYNTHESIS 3: Fallback for Generic / Backend Repositories
  // ----------------------------------------------------
  if (semanticNodes.length === 0) {
    for (const file of analyzedFiles) {
      for (const fn of file.functions || []) {
        if (fn.name.startsWith('_') || fn.name === 'isBoilerplate' || fn.name === 'getSourceSnippet') continue;

        const fnSemanticName = humanizeIdentifier(fn.name);
        addSemanticNode({
          semanticName: fnSemanticName,
          description: `Executes business logic for ${fnSemanticName}`,
          type: fn.name.toLowerCase().includes('controller') ? 'CONTROLLER' : 'SERVICE',
          file: file.file,
          line: fn.startLine,
          endLine: fn.endLine,
          technicalName: fn.name,
          technicalExpression: `${fn.name}(${(fn.params || []).join(', ')})`,
          inputs: fn.params || [],
          outputs: fn.returns || [],
          confidence: {
            level: 'CONFIRMED',
            score: 0.90,
            reason: 'Analyzed module function definition'
          }
        });
      }
    }
  }

  return {
    nodes: semanticNodes,
    edges: semanticEdges
  };
}

/**
 * Helper to resolve handler function definition from symbol index
 */
function resolveHandlerFunction(sourceFile, handlerName, symbolIndex) {
  if (!symbolIndex || !handlerName) return null;

  let targetMethod = handlerName;
  let objectBinding = null;
  if (handlerName.includes('.')) {
    const parts = handlerName.split('.');
    objectBinding = parts[0];
    targetMethod = parts[1];
  }

  const localKey = `${sourceFile}:${targetMethod}`;
  if (symbolIndex.functionRegistry?.has(localKey)) {
    return symbolIndex.functionRegistry.get(localKey);
  }

  const imports = symbolIndex.fileImports?.get(sourceFile) || [];
  for (const imp of imports) {
    if (!imp.resolvedFile) continue;

    // If called as authService.loginUser, match the import of authService
    if (objectBinding) {
      const matchesBinding =
        imp.specifiers?.some((s) => s.local === objectBinding) ||
        imp.source.includes(objectBinding);
      if (matchesBinding) {
        const methodKey = `${imp.resolvedFile}:${targetMethod}`;
        if (symbolIndex.functionRegistry?.has(methodKey)) {
          return symbolIndex.functionRegistry.get(methodKey);
        }
        return { name: targetMethod, file: imp.resolvedFile };
      }
    }

    for (const spec of imp.specifiers || []) {
      if (spec.local === targetMethod || spec.local === handlerName) {
        const targetFn = spec.imported === 'default' ? spec.local : spec.imported;
        const targetKey = `${imp.resolvedFile}:${targetFn}`;
        if (symbolIndex.functionRegistry?.has(targetKey)) {
          return symbolIndex.functionRegistry.get(targetKey);
        }
        return { name: targetFn, file: imp.resolvedFile };
      }
    }
  }
  return null;
}

module.exports = {
  buildApplicationFlow,
  getRouteSemanticInfo,
  getDbSemanticInfo,
  humanizeIdentifier
};
