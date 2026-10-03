const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const BABEL_PARSER_OPTIONS = {
  sourceType: 'unambiguous',
  allowReturnOutsideFunction: true,
  allowAwaitOutsideFunction: true,
  allowImportExportEverywhere: true,
  plugins: ['jsx', 'classProperties', 'objectRestSpread', 'dynamicImport', 'optionalChaining', 'nullishCoalescingOperator']
};

const HTTP_METHODS = new Set(['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'use', 'all']);

/**
 * Analyzes Express routes, middlewares, router mounts, and request/response patterns
 * @param {Object} fileInfo
 * @param {string} fileInfo.relativePath
 * @param {string} fileInfo.content
 * @returns {{ routes: Array<Object>, mounts: Array<Object> }} Extracted Express routes and router mountings
 */
function analyzeExpressFile({ relativePath, content }) {
  const routes = [];
  const mounts = [];
  if (!content || typeof content !== 'string') return { routes, mounts };

  let ast;
  try {
    ast = parser.parse(content, BABEL_PARSER_OPTIONS);
  } catch (err) {
    try {
      ast = parser.parse(content, { ...BABEL_PARSER_OPTIONS, sourceType: 'script' });
    } catch (e) {
      return { routes, mounts };
    }
  }

  try {
    traverse(ast, {
      CallExpression(path) {
        const { callee, arguments: args } = path.node;
        if (!callee || callee.type !== 'MemberExpression') return;

        const methodName = callee.property?.name?.toLowerCase();
        if (!HTTP_METHODS.has(methodName)) return;

        const objName = (callee.object?.name || '').toLowerCase();
        if (['axios', 'http', 'api', 'client', 'apiclient', 'request'].includes(objName)) {
          return;
        }

        // Check for router mount: app.use('/api/auth', authRoutes)
        if (methodName === 'use' && args.length >= 2 && args[0].type === 'StringLiteral') {
          const prefix = args[0].value;
          const routerArg = args[1];
          let routerName = null;

          if (routerArg.type === 'Identifier') {
            routerName = routerArg.name;
          } else if (routerArg.type === 'CallExpression' && routerArg.callee?.name === 'require' && routerArg.arguments?.[0]?.type === 'StringLiteral') {
            routerName = routerArg.arguments[0].value;
          }

          if (routerName) {
            mounts.push({
              file: relativePath,
              prefix,
              routerName,
              startLine: path.node.loc?.start.line
            });
          }
        }

        // Check first argument for route path (e.g., '/login')
        let routePath = '/';
        let handlerStartIndex = 0;

        if (args.length > 0 && args[0].type === 'StringLiteral') {
          routePath = args[0].value;
          handlerStartIndex = 1;
        }

        const handlers = [];
        for (let i = handlerStartIndex; i < args.length; i++) {
          const arg = args[i];
          if (!arg) continue;

          if (arg.type === 'Identifier') {
            handlers.push({ name: arg.name, type: 'identifier', loc: arg.loc });
          } else if (arg.type === 'MemberExpression') {
            const obj = arg.object?.name || 'object';
            const prop = arg.property?.name || 'prop';
            handlers.push({ name: `${obj}.${prop}`, type: 'member', loc: arg.loc });
          } else if (arg.type === 'ArrowFunctionExpression' || arg.type === 'FunctionExpression') {
            const loc = arg.loc || { start: { line: 1 } };
            handlers.push({ name: `inlineHandler_L${loc.start.line}`, type: 'inline', loc });
          }
        }

        if (methodName !== 'use' && (handlers.length > 0 || routePath !== '/')) {
          routes.push({
            file: relativePath,
            method: methodName.toUpperCase(),
            path: routePath,
            handlers,
            startLine: path.node.loc?.start.line,
            endLine: path.node.loc?.end.line,
            routerInstance: callee.object?.name || 'router'
          });
        }
      }
    });
  } catch (err) {
    console.warn(`Express analysis error in ${relativePath}:`, err.message);
  }

  return { routes, mounts };
}

module.exports = {
  analyzeExpressFile
};
