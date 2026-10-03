const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const BABEL_PARSER_OPTIONS = {
  sourceType: 'unambiguous',
  allowReturnOutsideFunction: true,
  allowAwaitOutsideFunction: true,
  allowImportExportEverywhere: true,
  plugins: ['jsx', 'classProperties', 'objectRestSpread', 'dynamicImport', 'optionalChaining', 'nullishCoalescingOperator']
};

/**
 * Analyzes React components, hooks (useState, useEffect), and client-side API calls
 * @param {Object} fileInfo
 * @param {string} fileInfo.relativePath
 * @param {string} fileInfo.content
 * @returns {{ components: Array<Object>, apiCalls: Array<Object> }}
 */
function analyzeReactFile({ relativePath, content }) {
  const result = {
    components: [],
    apiCalls: [],
    navigations: [],
    userActions: []
  };

  if (!content || typeof content !== 'string') return result;

  let ast;
  try {
    ast = parser.parse(content, BABEL_PARSER_OPTIONS);
  } catch (err) {
    try {
      ast = parser.parse(content, { ...BABEL_PARSER_OPTIONS, sourceType: 'script' });
    } catch (e) {
      return result;
    }
  }

  const isPagePath =
    relativePath.toLowerCase().includes('/page') ||
    relativePath.toLowerCase().includes('/view') ||
    relativePath.toLowerCase().includes('/screen') ||
    relativePath.toLowerCase().includes('login') ||
    relativePath.toLowerCase().includes('register') ||
    relativePath.toLowerCase().includes('auth') ||
    relativePath.toLowerCase().includes('dashboard') ||
    relativePath.toLowerCase().includes('home') ||
    relativePath.toLowerCase().includes('profile');

  try {
    traverse(ast, {
      // 1. Detect React Component Functions
      'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression'(path) {
        let name = null;
        if (path.node.id?.name) {
          name = path.node.id.name;
        } else if (path.parent?.type === 'VariableDeclarator' && path.parent.id?.name) {
          name = path.parent.id.name;
        }

        // Detect User Actions inside or outside components (e.g. handleSubmit, handleLogin, login, register, onSubmit)
        if (
          name &&
          (name.startsWith('handle') ||
            name.startsWith('on') ||
            name === 'submit' ||
            name === 'login' ||
            name === 'register' ||
            name === 'authenticate' ||
            name.endsWith('Submit') ||
            name.endsWith('Click') ||
            name.endsWith('Action'))
        ) {
          result.userActions.push({
            name,
            file: relativePath,
            startLine: path.node.loc?.start.line,
            endLine: path.node.loc?.end.line
          });
        }

        // React components typically start with a capital letter
        if (name && /^[A-Z]/.test(name)) {
          let hasJSX = false;
          let stateVars = [];
          let childComponents = [];

          path.traverse({
            JSXElement(jsxPath) {
              hasJSX = true;
              const openingTag = jsxPath.node.openingElement;
              const tagName = openingTag.name?.name;
              if (tagName && /^[A-Z]/.test(tagName) && !childComponents.includes(tagName)) {
                childComponents.push(tagName);
              }

              // Detect <Link to="/home"> or <NavLink to="/dashboard">
              if ((tagName === 'Link' || tagName === 'NavLink') && openingTag.attributes) {
                for (const attr of openingTag.attributes) {
                  if (attr.name?.name === 'to' && attr.value?.type === 'StringLiteral') {
                    result.navigations.push({
                      target: attr.value.value,
                      enclosingComponent: name,
                      file: relativePath,
                      startLine: jsxPath.node.loc?.start.line
                    });
                  }
                }
              }
            },
            CallExpression(callPath) {
              const calleeName = callPath.node.callee?.name;
              if (calleeName === 'useState') {
                if (callPath.parent?.type === 'VariableDeclarator' && callPath.parent.id?.type === 'ArrayPattern') {
                  const stateVar = callPath.parent.id.elements?.[0]?.name;
                  const setterVar = callPath.parent.id.elements?.[1]?.name;
                  if (stateVar) {
                    stateVars.push({ state: stateVar, setter: setterVar });
                  }
                }
              }
            }
          });

          const isPage =
            isPagePath ||
            name.endsWith('Page') ||
            name.endsWith('View') ||
            name.endsWith('Screen') ||
            name.includes('Login') ||
            name.includes('Register') ||
            name.includes('Home') ||
            name.includes('Dashboard') ||
            name.includes('Profile');

          if (hasJSX || isPage || name.endsWith('Component')) {
            result.components.push({
              name,
              file: relativePath,
              isPage,
              stateVariables: stateVars,
              childComponents,
              startLine: path.node.loc?.start.line,
              endLine: path.node.loc?.end.line
            });
          }
        }
      },

      // 2. Detect Client-Side API Calls: fetch('/api/...'), axios.post(...)
      // and Navigation calls: navigate('/home'), history.push('/home')
      CallExpression(path) {
        const { callee, arguments: args } = path.node;
        let isApi = false;
        let method = 'GET';
        let endpoint = null;
        const payloadVars = [];

        // Helper to extract string or prefix from endpoint argument
        const extractEndpointValue = (node) => {
          if (!node) return null;
          if (node.type === 'StringLiteral') return node.value;
          if (node.type === 'TemplateLiteral' && node.quasis?.length > 0) return node.quasis[0].value.raw;
          if (node.type === 'BinaryExpression' && node.left?.type === 'StringLiteral') return node.left.value;
          return null;
        };

        // Find enclosing function
        const enclosingFn = path.findParent((p) =>
          p.isFunctionDeclaration() ||
          p.isFunctionExpression() ||
          p.isArrowFunctionExpression() ||
          p.isClassMethod() ||
          p.isObjectMethod()
        );

        let enclosingFnName = null;
        if (enclosingFn) {
          if (enclosingFn.node.id?.name) {
            enclosingFnName = enclosingFn.node.id.name;
          } else if (enclosingFn.parent?.type === 'VariableDeclarator' && enclosingFn.parent.id?.name) {
            enclosingFnName = enclosingFn.parent.id.name;
          } else if (enclosingFn.parent?.type === 'Property' && enclosingFn.parent.key?.name) {
            enclosingFnName = enclosingFn.parent.key.name;
          } else if (enclosingFn.node.key?.name) {
            enclosingFnName = enclosingFn.node.key.name;
          }
        }

        // Navigation: navigate('/home'), history.push('/home')
        if (
          (callee?.type === 'Identifier' && (callee.name === 'navigate' || callee.name === 'redirect')) ||
          (callee?.type === 'MemberExpression' &&
            callee.object?.name === 'history' &&
            (callee.property?.name === 'push' || callee.property?.name === 'replace'))
        ) {
          const navTarget = extractEndpointValue(args[0]);
          if (navTarget) {
            result.navigations.push({
              target: navTarget,
              type: 'NAVIGATE',
              enclosingFunction: enclosingFnName,
              file: relativePath,
              startLine: path.node.loc?.start.line
            });
          }
        }

        // HTTP API Calls
        if (callee?.type === 'Identifier' && callee.name === 'fetch') {
          isApi = true;
          endpoint = extractEndpointValue(args[0]);
          if (args.length > 1 && args[1].type === 'ObjectExpression') {
            for (const prop of args[1].properties || []) {
              if (prop.key?.name === 'method' && prop.value?.type === 'StringLiteral') {
                method = prop.value.value.toUpperCase();
              }
              if (prop.key?.name === 'body') {
                if (prop.value?.type === 'Identifier') {
                  payloadVars.push(prop.value.name);
                } else if (prop.value?.type === 'CallExpression' && prop.value.arguments?.[0]?.type === 'ObjectExpression') {
                  for (const p of prop.value.arguments[0].properties || []) {
                    if (p.key?.name) payloadVars.push(p.key.name);
                    else if (p.value?.name) payloadVars.push(p.value.name);
                  }
                }
              }
            }
          }
        } else if (callee?.type === 'MemberExpression') {
          const obj = callee.object?.name?.toLowerCase();
          const prop = callee.property?.name?.toLowerCase();
          if (obj === 'axios' || obj === 'api' || obj === 'http' || obj === 'client' || obj === 'request') {
            isApi = true;
            method = prop.toUpperCase();
            endpoint = extractEndpointValue(args[0]);
            if (args.length > 1) {
              if (args[1].type === 'Identifier') {
                payloadVars.push(args[1].name);
              } else if (args[1].type === 'ObjectExpression') {
                for (const p of args[1].properties || []) {
                  if (p.key?.name) payloadVars.push(p.key.name);
                  else if (p.value?.name) payloadVars.push(p.value.name);
                }
              }
            }
          }
        }

        if (isApi) {
          const enclosingFn = path.findParent((p) =>
            p.isFunctionDeclaration() ||
            p.isFunctionExpression() ||
            p.isArrowFunctionExpression()
          );

          let enclosingFnName = null;
          if (enclosingFn) {
            enclosingFnName = enclosingFn.node.id?.name || enclosingFn.parent?.id?.name || 'anonymous';
          }

          result.apiCalls.push({
            method,
            endpoint: endpoint || '/dynamic-endpoint',
            payloadVars,
            enclosingFunction: enclosingFnName,
            file: relativePath,
            startLine: path.node.loc?.start.line,
            endLine: path.node.loc?.end.line
          });
        }
      }
    });
  } catch (err) {
    console.warn(`React analysis error in ${relativePath}:`, err.message);
  }

  return result;
}

module.exports = {
  analyzeReactFile
};
