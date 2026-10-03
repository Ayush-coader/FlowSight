const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const BABEL_PARSER_OPTIONS = {
  sourceType: 'unambiguous',
  allowReturnOutsideFunction: true,
  allowAwaitOutsideFunction: true,
  allowImportExportEverywhere: true,
  plugins: [
    'jsx',
    'typescript',
    'classProperties',
    'classPrivateProperties',
    'classPrivateMethods',
    'objectRestSpread',
    'dynamicImport',
    'asyncGenerators',
    'exportDefaultFrom',
    'optionalChaining',
    'nullishCoalescingOperator',
    'topLevelAwait',
    'numericSeparator',
    ['decorators', { decoratorsBeforeExport: true }]
  ]
};

/**
 * Extracts param names from Babel parameter AST nodes
 */
function extractParamNames(params) {
  const paramNames = [];
  if (!Array.isArray(params)) return paramNames;

  for (const param of params) {
    if (!param) continue;
    if (param.type === 'Identifier') {
      paramNames.push(param.name);
    } else if (param.type === 'AssignmentPattern' && param.left?.type === 'Identifier') {
      paramNames.push(param.left.name);
    } else if (param.type === 'ObjectPattern') {
      for (const prop of param.properties || []) {
        if (prop.type === 'ObjectProperty' && prop.value?.type === 'Identifier') {
          paramNames.push(prop.value.name);
        } else if (prop.type === 'RestElement' && prop.argument?.type === 'Identifier') {
          paramNames.push(prop.argument.name);
        }
      }
    } else if (param.type === 'ArrayPattern') {
      for (const elem of param.elements || []) {
        if (elem && elem.type === 'Identifier') {
          paramNames.push(elem.name);
        }
      }
    } else if (param.type === 'RestElement' && param.argument?.type === 'Identifier') {
      paramNames.push(param.argument.name);
    }
  }
  return paramNames;
}

/**
 * Helper to safely extract source snippet given line/column or offset
 */
function getSourceSnippet(content, loc) {
  if (!loc || !loc.start || !loc.end) return '';
  const lines = content.split('\n');
  const startLine = loc.start.line - 1;
  const endLine = loc.end.line - 1;

  if (startLine < 0 || startLine >= lines.length) return '';
  if (startLine === endLine) {
    return lines[startLine].substring(loc.start.column, loc.end.column);
  }

  const selected = [];
  selected.push(lines[startLine].substring(loc.start.column));
  for (let i = startLine + 1; i < endLine && i < lines.length; i++) {
    selected.push(lines[i]);
  }
  if (endLine < lines.length) {
    selected.push(lines[endLine].substring(0, loc.end.column));
  }
  return selected.join('\n');
}

/**
 * Extracts a readable callee name from CallExpression
 */
function getCalleeName(callee) {
  if (!callee) return 'anonymous';
  if (callee.type === 'Identifier') {
    return callee.name;
  }
  if (callee.type === 'MemberExpression') {
    const obj = getCalleeName(callee.object);
    const prop = callee.property?.name || (callee.property?.value ? String(callee.property.value) : '?');
    return `${obj}.${prop}`;
  }
  if (callee.type === 'CallExpression') {
    return `${getCalleeName(callee.callee)}()`;
  }
  return 'dynamicCall';
}

/**
 * Extracts argument representations from CallExpression
 */
function extractArguments(args) {
  if (!Array.isArray(args)) return [];
  return args.map((arg) => {
    if (!arg) return 'undefined';
    if (arg.type === 'Identifier') return arg.name;
    if (arg.type === 'StringLiteral') return `"${arg.value}"`;
    if (arg.type === 'NumericLiteral') return String(arg.value);
    if (arg.type === 'BooleanLiteral') return String(arg.value);
    if (arg.type === 'MemberExpression') return getCalleeName(arg);
    if (arg.type === 'ObjectExpression') return '{...}';
    if (arg.type === 'ArrayExpression') return '[...]';
    if (arg.type === 'ArrowFunctionExpression' || arg.type === 'FunctionExpression') return 'callback';
    return 'expr';
  });
}

/**
 * Parses and analyzes a single JavaScript file
 * @param {Object} fileInfo
 * @param {string} fileInfo.relativePath
 * @param {string} fileInfo.content
 * @returns {Object} Structured AST data for the file
 */
function analyzeJavaScriptFile({ relativePath, content }) {
  const isTs = relativePath.endsWith('.ts') || relativePath.endsWith('.tsx') || relativePath.endsWith('.mts') || relativePath.endsWith('.cts');
  const result = {
    file: relativePath,
    language: isTs ? 'typescript' : 'javascript',
    analysisStatus: 'analyzed',
    error: null,
    imports: [],
    exports: [],
    functions: [],
    variables: [],
    calls: [],
    assignments: []
  };

  if (!content || typeof content !== 'string') {
    result.analysisStatus = 'skipped';
    return result;
  }

  let ast;
  try {
    ast = parser.parse(content, BABEL_PARSER_OPTIONS);
  } catch (err) {
    // If ambiguous parsing fails, retry with script sourceType
    try {
      ast = parser.parse(content, { ...BABEL_PARSER_OPTIONS, sourceType: 'script' });
    } catch (secondErr) {
      result.analysisStatus = 'failed';
      result.error = secondErr.message;
      return result;
    }
  }

  try {
    traverse(ast, {
      // 1. ES Modules Imports
      ImportDeclaration(path) {
        const source = path.node.source?.value;
        const specifiers = (path.node.specifiers || []).map((spec) => {
          if (spec.type === 'ImportDefaultSpecifier') {
            return { type: 'default', local: spec.local?.name, imported: 'default' };
          }
          if (spec.type === 'ImportSpecifier') {
            return {
              type: 'named',
              local: spec.local?.name,
              imported: spec.imported?.name || spec.imported?.value || spec.local?.name
            };
          }
          if (spec.type === 'ImportNamespaceSpecifier') {
            return { type: 'namespace', local: spec.local?.name, imported: '*' };
          }
          return { type: 'unknown', local: spec.local?.name, imported: spec.local?.name };
        });

        result.imports.push({
          source,
          specifiers,
          kind: 'esm',
          loc: path.node.loc
        });
      },

      // 2. ES Modules Exports
      ExportNamedDeclaration(path) {
        const declaration = path.node.declaration;
        if (declaration) {
          if (declaration.type === 'FunctionDeclaration' && declaration.id) {
            result.exports.push({
              name: declaration.id.name,
              type: 'named',
              kind: 'function',
              loc: path.node.loc
            });
          } else if (declaration.type === 'VariableDeclaration') {
            for (const decl of declaration.declarations || []) {
              if (decl.id?.type === 'Identifier') {
                result.exports.push({
                  name: decl.id.name,
                  type: 'named',
                  kind: 'variable',
                  loc: path.node.loc
                });
              }
            }
          }
        }
        for (const spec of path.node.specifiers || []) {
          result.exports.push({
            name: spec.exported?.name || spec.exported?.value || spec.local?.name,
            local: spec.local?.name,
            type: 'named',
            loc: path.node.loc
          });
        }
      },

      ExportDefaultDeclaration(path) {
        const declaration = path.node.declaration;
        let exportedName = 'default';
        if (declaration.type === 'Identifier') {
          exportedName = declaration.name;
        } else if (declaration.type === 'FunctionDeclaration' && declaration.id) {
          exportedName = declaration.id.name;
        }
        result.exports.push({
          name: exportedName,
          type: 'default',
          loc: path.node.loc
        });
      },

      // 3. CommonJS require() & module.exports
      CallExpression(path) {
        const { node } = path;

        // Check for require('...')
        if (node.callee?.type === 'Identifier' && node.callee.name === 'require') {
          const arg = node.arguments?.[0];
          if (arg && arg.type === 'StringLiteral') {
            let specifiers = [];
            // Check if assigned in VariableDeclarator
            if (path.parent?.type === 'VariableDeclarator') {
              const id = path.parent.id;
              if (id.type === 'Identifier') {
                specifiers.push({ type: 'default', local: id.name, imported: 'default' });
              } else if (id.type === 'ObjectPattern') {
                for (const prop of id.properties || []) {
                  if (prop.type === 'ObjectProperty' && prop.key?.name) {
                    specifiers.push({
                      type: 'named',
                      local: prop.value?.name || prop.key.name,
                      imported: prop.key.name
                    });
                  }
                }
              }
            }
            result.imports.push({
              source: arg.value,
              specifiers,
              kind: 'commonjs',
              loc: node.loc
            });
          }
        }

        // Generic Call Record
        const calleeName = getCalleeName(node.callee);
        const args = extractArguments(node.arguments);
        
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

        // Detect assigned variable (e.g. const user = await User.findOne(...), const token = jwt.sign(...))
        let assignedVariable = null;
        const declarator = path.findParent((p) => p.isVariableDeclarator());
        if (declarator && declarator.node.id?.name) {
          assignedVariable = declarator.node.id.name;
        }

        result.calls.push({
          calleeName,
          arguments: args,
          assignedVariable,
          enclosingFunction: enclosingFnName,
          loc: node.loc
        });
      },

      // CommonJS module.exports assignment
      AssignmentExpression(path) {
        const { node } = path;
        if (
          node.left?.type === 'MemberExpression' &&
          node.left.object?.name === 'module' &&
          node.left.property?.name === 'exports'
        ) {
          if (node.right?.type === 'Identifier') {
            result.exports.push({ name: node.right.name, type: 'default', kind: 'commonjs', loc: node.loc });
          } else if (node.right?.type === 'ObjectExpression') {
            for (const prop of node.right.properties || []) {
              if (prop.type === 'ObjectProperty' && prop.key?.name) {
                result.exports.push({
                  name: prop.key.name,
                  local: prop.value?.name || prop.key.name,
                  type: 'named',
                  kind: 'commonjs',
                  loc: prop.loc
                });
              }
            }
          }
        } else if (
          node.left?.type === 'MemberExpression' &&
          node.left.object?.name === 'exports' &&
          node.left.property?.name
        ) {
          result.exports.push({
            name: node.left.property.name,
            type: 'named',
            kind: 'commonjs',
            loc: node.loc
          });
        }

        // Track meaningful variable-to-variable assignments for data flow (skip require/module.exports boilerplate)
        if (node.left && node.right) {
          const leftName = node.left.name || getCalleeName(node.left);
          const rightName = node.right.name || getCalleeName(node.right);
          const isBoilerplate = (name) => {
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

          if (!isBoilerplate(leftName) && !isBoilerplate(rightName)) {
            result.assignments.push({
              target: leftName,
              source: rightName,
              loc: node.loc
            });
          }
        }
      },

      // Variable Declarations & Destructuring (skip require/dotenv boilerplate)
      VariableDeclaration(path) {
        const isBoilerplateInit = (init) => {
          if (!init) return true;
          if (init.type === 'CallExpression' && init.callee?.name === 'require') return true;
          const name = init.name || getCalleeName(init);
          const str = String(name).toLowerCase();
          return (
            str.startsWith('require') ||
            str.startsWith('import') ||
            str.includes('express.router') ||
            str === 'dotenv'
          );
        };

        for (const decl of path.node.declarations || []) {
          if (!decl.init || isBoilerplateInit(decl.init)) continue;

          // Object destructuring: const { email, password } = req.body
          if (decl.id?.type === 'ObjectPattern') {
            const sourceExpr = decl.init.name || getCalleeName(decl.init);
            for (const prop of decl.id.properties || []) {
              if (prop.type === 'ObjectProperty' && prop.value?.name) {
                result.assignments.push({
                  target: prop.value.name,
                  source: `${sourceExpr}.${prop.key?.name || prop.value.name}`,
                  loc: decl.loc
                });
                result.variables.push(prop.value.name);
              }
            }
          } else if (decl.id?.type === 'Identifier') {
            const sourceExpr = decl.init.name || getCalleeName(decl.init);
            result.assignments.push({
              target: decl.id.name,
              source: sourceExpr,
              loc: decl.loc
            });
            result.variables.push(decl.id.name);
          }
        }
      },

      // Functions (Declarations, Expressions, Arrow, Methods)
      'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression|ClassMethod|ObjectMethod'(path) {
        const { node } = path;
        let functionName = null;

        if (node.id?.name) {
          functionName = node.id.name;
        } else if (path.parent?.type === 'VariableDeclarator' && path.parent.id?.name) {
          functionName = path.parent.id.name;
        } else if (path.parent?.type === 'Property' && path.parent.key?.name) {
          functionName = path.parent.key.name;
        } else if (path.parent?.type === 'AssignmentExpression' && path.parent.left) {
          functionName = path.parent.left.name || getCalleeName(path.parent.left);
        } else if (node.key?.name) {
          functionName = node.key.name;
        }

        // Collect return statements, conditions, variables inside this function
        const returns = [];
        const conditions = [];
        const variablesCreated = [];
        const variablesUsed = [];

        path.traverse({
          ReturnStatement(retPath) {
            // Ensure return is directly inside this function, not a nested one
            if (retPath.getFunctionParent()?.node === node) {
              if (retPath.node.argument) {
                const retSnippet = getSourceSnippet(content, retPath.node.argument.loc);
                returns.push(retSnippet.trim() || 'value');
              } else {
                returns.push('undefined');
              }
            }
          },
          IfStatement(ifPath) {
            if (ifPath.getFunctionParent()?.node === node) {
              const testSnippet = getSourceSnippet(content, ifPath.node.test?.loc) || 'condition';
              let consequentSnippet = '';
              let alternateSnippet = '';

              if (ifPath.node.consequent) {
                consequentSnippet = getSourceSnippet(content, ifPath.node.consequent.loc);
              }
              if (ifPath.node.alternate) {
                alternateSnippet = getSourceSnippet(content, ifPath.node.alternate.loc);
              }

              conditions.push({
                test: testSnippet.trim().replace(/;$/, ''),
                consequentSnippet: consequentSnippet.trim().slice(0, 80),
                alternateSnippet: alternateSnippet.trim().slice(0, 80),
                loc: ifPath.node.loc
              });
            }
          },
          VariableDeclarator(varPath) {
            if (varPath.getFunctionParent()?.node === node) {
              if (varPath.node.id?.name) {
                variablesCreated.push(varPath.node.id.name);
              } else if (varPath.node.id?.type === 'ObjectPattern') {
                for (const prop of varPath.node.id.properties || []) {
                  if (prop.value?.name) variablesCreated.push(prop.value.name);
                }
              }
            }
          },
          Identifier(idPath) {
            if (idPath.getFunctionParent()?.node === node) {
              if (idPath.isReferencedIdentifier() && !variablesUsed.includes(idPath.node.name)) {
                variablesUsed.push(idPath.node.name);
              }
            }
          }
        });

        const params = extractParamNames(node.params);
        const loc = node.loc || { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } };
        const sourceCode = getSourceSnippet(content, loc);

        result.functions.push({
          name: functionName || `anonymous_L${loc.start.line}`,
          isAnonymous: !functionName,
          isAsync: Boolean(node.async),
          isGenerator: Boolean(node.generator),
          params,
          returns,
          conditions,
          variablesCreated: Array.from(new Set(variablesCreated)),
          variablesUsed: Array.from(new Set(variablesUsed)),
          startLine: loc.start.line,
          endLine: loc.end.line,
          startColumn: loc.start.column,
          endColumn: loc.end.column,
          sourceCode,
          loc
        });
      }
    });
  } catch (traversalErr) {
    result.analysisStatus = 'partial';
    result.error = `Traversal warning: ${traversalErr.message}`;
  }

  return result;
}

module.exports = {
  analyzeJavaScriptFile
};
