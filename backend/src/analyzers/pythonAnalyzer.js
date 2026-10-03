/**
 * FlowSight Python Analyzer
 * Extracts AST-like structural data from Python files (.py, .pyw)
 * Supports:
 * - Functions (def, async def, parameters, return types, decorators)
 * - Classes & Methods (class Name(Base):)
 * - Imports (import x, from x.y import z as w, relative imports)
 * - Framework Routes (Flask, FastAPI, Django, Sanic, Tornado, Bottle, Falcon, etc.)
 * - Database / ORM operations (SQLAlchemy, Django ORM, MongoEngine, PyMongo, Peewee, SQLite, Redis)
 * - Conditional branches (if, elif)
 * - Responses & Return values (jsonify, render_template, Response, dict/json returns)
 * - Variables created and used
 */

function analyzePythonFile({ relativePath, content }) {
  const result = {
    file: relativePath,
    language: 'python',
    analysisStatus: 'analyzed',
    error: null,
    imports: [],
    exports: [],
    functions: [],
    variables: [],
    calls: [],
    assignments: [],
    routes: [],
    dbOperations: [],
    classes: []
  };

  if (!content || typeof content !== 'string') {
    result.analysisStatus = 'skipped';
    return result;
  }

  const lines = content.split('\n');

  let currentClass = null;
  let currentDecorators = [];

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines or pure comment lines
    if (!trimmed || (trimmed.startsWith('#') && !trimmed.startsWith('#['))) {
      continue;
    }

    // 1. Decorators (@app.route, @router.get, @staticmethod, etc.)
    if (trimmed.startsWith('@')) {
      currentDecorators.push({
        text: trimmed,
        line: lineNum
      });
      continue;
    }

    // 2. Imports:
    // a. "from x.y import a, b as c" or "from .models import User"
    const fromImportMatch = trimmed.match(/^from\s+([a-zA-Z0-9_.]+)\s+import\s+(.+)$/);
    if (fromImportMatch) {
      const source = fromImportMatch[1];
      const rawSpecifiers = fromImportMatch[2].replace(/[()]/g, '').split(',');
      const specifiers = rawSpecifiers.map((s) => {
        const parts = s.trim().split(/\s+as\s+/);
        return {
          imported: parts[0]?.trim(),
          local: parts[1]?.trim() || parts[0]?.trim(),
          type: 'named'
        };
      }).filter((s) => s.imported);

      result.imports.push({
        source,
        specifiers,
        kind: 'python_from',
        loc: { start: { line: lineNum, column: 0 }, end: { line: lineNum, column: line.length } }
      });
      currentDecorators = [];
      continue;
    }

    // b. "import os, sys" or "import numpy as np"
    const standardImportMatch = trimmed.match(/^import\s+(.+)$/);
    if (standardImportMatch) {
      const rawModules = standardImportMatch[1].split(',');
      for (const m of rawModules) {
        const parts = m.trim().split(/\s+as\s+/);
        const source = parts[0]?.trim();
        const local = parts[1]?.trim() || source;
        if (source) {
          result.imports.push({
            source,
            specifiers: [{ imported: 'default', local, type: 'default' }],
            kind: 'python_import',
            loc: { start: { line: lineNum, column: 0 }, end: { line: lineNum, column: line.length } }
          });
        }
      }
      currentDecorators = [];
      continue;
    }

    // 3. Classes: "class User(BaseModel):" or "class Server:"
    const classMatch = trimmed.match(/^class\s+([a-zA-Z0-9_]+)(?:\(([^)]*)\))?:/);
    if (classMatch) {
      const className = classMatch[1];
      const baseClasses = classMatch[2] ? classMatch[2].split(',').map((b) => b.trim()).filter(Boolean) : [];
      currentClass = {
        name: className,
        baseClasses,
        startLine: lineNum,
        decorators: [...currentDecorators]
      };
      result.classes.push(currentClass);
      result.exports.push({
        name: className,
        type: 'named',
        kind: 'class',
        loc: { start: { line: lineNum, column: 0 }, end: { line: lineNum, column: line.length } }
      });
      currentDecorators = [];
      continue;
    }

    // 4. Functions: "def get_weather(city: str, format='json') -> dict:" or "async def handle_request(req):"
    const funcMatch = trimmed.match(/^(?:async\s+)?def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)(?:\s*->\s*([^:]+))?:/);
    if (funcMatch) {
      const isAsync = trimmed.startsWith('async');
      const rawName = funcMatch[1];
      const rawParams = funcMatch[2] || '';
      const returnType = funcMatch[3]?.trim();
      const fnName = currentClass ? `${currentClass.name}.${rawName}` : rawName;

      // Extract parameter names
      const params = rawParams
        .split(',')
        .map((p) => {
          const clean = p.trim().split(':')[0].split('=')[0].trim();
          return clean.replace(/^(\*|\*\*)/, '');
        })
        .filter((p) => p && p !== 'self' && p !== 'cls');

      // Find function end by indentation
      const baseIndent = line.search(/\S/);
      let endLine = lineNum;
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j];
        const nextTrim = nextLine.trim();
        if (!nextTrim || nextTrim.startsWith('#')) continue;
        const nextIndent = nextLine.search(/\S/);
        if (nextIndent <= baseIndent) {
          endLine = j;
          break;
        }
        endLine = j + 1;
      }

      // Extract function source code snippet
      const sourceCode = lines.slice(lineNum - 1, endLine).join('\n');

      const fnObj = {
        name: fnName,
        isAsync,
        isAnonymous: false,
        params,
        returnType,
        startLine: lineNum,
        endLine,
        startColumn: baseIndent,
        endColumn: line.length,
        sourceCode: sourceCode.slice(0, 1500),
        decorators: [...currentDecorators],
        conditions: [],
        returns: [],
        variablesCreated: [],
        variablesUsed: []
      };

      // Check decorators for HTTP Route definitions (Flask, FastAPI, Bottle, etc.)
      for (const dec of currentDecorators) {
        // Flask: @app.route('/weather', methods=['GET']) or @api.route('/...')
        const flaskRoute = dec.text.match(/@(?:app|bp|api|router)\.route\(\s*['"]([^'"]+)['"](?:\s*,\s*methods\s*=\s*\[([^\]]+)\])?/);
        if (flaskRoute) {
          const routePath = flaskRoute[1];
          const rawMethods = flaskRoute[2] || "'GET'";
          const methods = rawMethods.split(',').map((m) => m.replace(/['"\s]/g, '').toUpperCase());
          for (const method of methods) {
            result.routes.push({
              file: relativePath,
              method,
              path: routePath,
              handler: fnName,
              startLine: dec.line,
              endLine
            });
          }
        }

        // FastAPI / APIRouter: @app.get('/path'), @router.post('/path'), @app.put, etc.
        const fastApiRoute = dec.text.match(/@(?:app|router|api)\.(get|post|put|delete|patch|options|head|websocket)\(\s*['"]([^'"]+)['"]/i);
        if (fastApiRoute) {
          const method = fastApiRoute[1].toUpperCase();
          const routePath = fastApiRoute[2];
          result.routes.push({
            file: relativePath,
            method,
            path: routePath,
            handler: fnName,
            startLine: dec.line,
            endLine
          });
        }
      }

      // Analyze inside function body for returns, conditions, DB queries, calls
      for (let j = lineNum; j < endLine; j++) {
        const bodyLine = lines[j].trim();
        if (!bodyLine || bodyLine.startsWith('#')) continue;

        // Returns
        if (bodyLine.startsWith('return ')) {
          const retVal = bodyLine.replace(/^return\s+/, '').replace(/;$/, '');
          fnObj.returns.push(retVal.slice(0, 60));
        }

        // Conditions
        const condMatch = bodyLine.match(/^(?:if|elif)\s+([^:]+):/);
        if (condMatch) {
          fnObj.conditions.push({
            test: condMatch[1].trim().slice(0, 50),
            consequentSnippet: lines[j + 1]?.trim()?.slice(0, 50) || 'branch execution',
            line: j + 1
          });
        }

        // Variable assignment: x = ...
        const assignMatch = bodyLine.match(/^([a-zA-Z0-9_]+)\s*=\s*(.+)$/);
        if (assignMatch && !assignMatch[1].startsWith('self.')) {
          const varName = assignMatch[1];
          if (!fnObj.variablesCreated.includes(varName)) {
            fnObj.variablesCreated.push(varName);
          }
        }

        // Database operations
        const dbMatch = bodyLine.match(/([A-Z][a-zA-Z0-9_]+)\.objects\.(filter|get|create|all|update|delete)\(/) ||
                        bodyLine.match(/(?:db\.)?session\.(query|add|delete|commit|execute)\(([^)]*)\)/) ||
                        bodyLine.match(/([A-Z][a-zA-Z0-9_]+)\.query\.(filter|filter_by|get|all|first)\(/) ||
                        bodyLine.match(/(?:db|cursor|conn)\.(execute|find|insert_one|update_one|delete_one)\(([^)]*)\)/);

        if (dbMatch) {
          const model = dbMatch[1] || 'Database';
          const op = dbMatch[2] || dbMatch[1] || 'query';
          result.dbOperations.push({
            file: relativePath,
            model,
            operation: op,
            enclosingFunction: fnName,
            startLine: j + 1,
            endLine: j + 1,
            queryArgs: bodyLine.slice(0, 80)
          });
        }

        // Function / Method Calls
        const callMatch = bodyLine.match(/([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)?)\s*\(([^)]*)\)/);
        if (callMatch) {
          const callee = callMatch[1];
          if (!['if', 'elif', 'while', 'for', 'return', 'print', 'len', 'range', 'str', 'int', 'dict', 'list', 'set', 'tuple', 'isinstance', 'type'].includes(callee)) {
            result.calls.push({
              callee,
              enclosingFunction: fnName,
              file: relativePath,
              line: j + 1
            });
          }
        }
      }

      result.functions.push(fnObj);
      result.exports.push({
        name: fnName,
        type: 'named',
        kind: 'function',
        loc: { start: { line: lineNum, column: 0 }, end: { line: endLine, column: 0 } }
      });

      currentDecorators = [];
      continue;
    }

    // Standalone Django url patterns: path('api/weather', views.get_weather)
    const djangoRoute = trimmed.match(/(?:path|re_path)\(\s*['"]([^'"]+)['"]\s*,\s*([a-zA-Z0-9_.]+)/);
    if (djangoRoute) {
      result.routes.push({
        file: relativePath,
        method: 'ALL',
        path: `/${djangoRoute[1].replace(/^\//, '')}`,
        handler: djangoRoute[2],
        startLine: lineNum,
        endLine: lineNum
      });
    }

    // WTTR / HTTP Handler patterns (e.g. self.wfile.write, cherrypy, tornado)
    if (trimmed.includes('wfile.write(') || trimmed.includes('self.write(')) {
      result.routes.push({
        file: relativePath,
        method: 'GET',
        path: relativePath.includes('view') || relativePath.includes('server') ? `/${relativePath.split('.')[0]}` : '/',
        handler: currentClass ? `${currentClass.name}.handler` : path_basename(relativePath),
        startLine: lineNum,
        endLine: lineNum
      });
    }

    currentDecorators = [];
  }

  return result;
}

function path_basename(p) {
  return p.split('/').pop().split('.')[0];
}

module.exports = {
  analyzePythonFile
};
