/**
 * FlowSight Go Analyzer
 * Extracts structural and AST-like data from Go source files (.go)
 * Supports:
 * - Package declarations
 * - Imports (single and grouped)
 * - Functions & Methods (func name, func (r *Receiver) name)
 * - Structs & Interfaces
 * - Web routes (Gin, Echo, Fiber, Chi, standard net/http)
 * - Database operations (gorm, sqlx, database/sql)
 * - Return statements & JSON responses
 * - Function calls & Variables
 */

function analyzeGoFile({ relativePath, content }) {
  const result = {
    file: relativePath,
    language: 'go',
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
    structs: []
  };

  if (!content || typeof content !== 'string') {
    result.analysisStatus = 'skipped';
    return result;
  }

  const lines = content.split('\n');
  let inImportGroup = false;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) {
      continue;
    }

    // 1. Package declaration
    const pkgMatch = trimmed.match(/^package\s+([a-zA-Z0-9_]+)/);
    if (pkgMatch) {
      result.package = pkgMatch[1];
      continue;
    }

    // 2. Grouped imports: import ( ... )
    if (trimmed.startsWith('import (')) {
      inImportGroup = true;
      continue;
    }
    if (inImportGroup) {
      if (trimmed.startsWith(')')) {
        inImportGroup = false;
        continue;
      }
      const impMatch = trimmed.match(/^(?:([a-zA-Z0-9_]+)\s+)?["']([^"']+)["']/);
      if (impMatch) {
        const alias = impMatch[1];
        const source = impMatch[2];
        const local = alias || source.split('/').pop();
        result.imports.push({
          source,
          specifiers: [{ imported: 'default', local, type: 'default' }],
          kind: 'go_import',
          loc: { start: { line: lineNum, column: 0 }, end: { line: lineNum, column: line.length } }
        });
      }
      continue;
    }

    // Single import: import "fmt" or import p "path"
    const singleImpMatch = trimmed.match(/^import\s+(?:([a-zA-Z0-9_]+)\s+)?["']([^"']+)["']/);
    if (singleImpMatch) {
      const alias = singleImpMatch[1];
      const source = singleImpMatch[2];
      const local = alias || source.split('/').pop();
      result.imports.push({
        source,
        specifiers: [{ imported: 'default', local, type: 'default' }],
        kind: 'go_import',
        loc: { start: { line: lineNum, column: 0 }, end: { line: lineNum, column: line.length } }
      });
      continue;
    }

    // 3. Structs & Interfaces: type User struct { ... }
    const structMatch = trimmed.match(/^type\s+([a-zA-Z0-9_]+)\s+(struct|interface)/);
    if (structMatch) {
      const name = structMatch[1];
      const kind = structMatch[2];
      result.structs.push({ name, kind, line: lineNum });
      result.exports.push({
        name,
        type: 'named',
        kind: structMatch[2],
        loc: { start: { line: lineNum, column: 0 }, end: { line: lineNum, column: line.length } }
      });
      continue;
    }

    // 4. Functions & Methods:
    // func (s *Server) GetWeather(w http.ResponseWriter, r *http.Request) error {
    // func HandleData(id int) (string, error) {
    const funcMatch = trimmed.match(/^func\s+(?:\(([^)]+)\)\s+)?([a-zA-Z0-9_]+)\s*\(([^)]*)\)(?:\s*(?:\([^)]*\)|[a-zA-Z0-9_*]+))?\s*\{/);
    if (funcMatch) {
      const receiver = funcMatch[1]?.trim();
      const rawName = funcMatch[2];
      const rawParams = funcMatch[3] || '';

      const fnName = receiver ? `${receiver.split(/\s+/).pop().replace(/[*&]/g, '')}.${rawName}` : rawName;

      // Extract parameter names
      const params = rawParams
        .split(',')
        .map((p) => p.trim().split(/\s+/)[0])
        .filter((p) => p && !['w', 'r', 'ctx'].includes(p));

      // Locate matching closing brace
      let braceCount = 1;
      let endLine = lineNum;
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j];
        for (const char of nextLine) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
        }
        if (braceCount <= 0) {
          endLine = j + 1;
          break;
        }
      }

      const sourceCode = lines.slice(lineNum - 1, endLine).join('\n');

      const fnObj = {
        name: fnName,
        isAsync: false,
        isAnonymous: false,
        params,
        startLine: lineNum,
        endLine,
        startColumn: 0,
        endColumn: line.length,
        sourceCode: sourceCode.slice(0, 1500),
        conditions: [],
        returns: [],
        variablesCreated: [],
        variablesUsed: []
      };

      // Analyze function body
      for (let j = lineNum; j < endLine; j++) {
        const bodyLine = lines[j].trim();
        if (!bodyLine || bodyLine.startsWith('//')) continue;

        // Return statements
        if (bodyLine.startsWith('return ')) {
          fnObj.returns.push(bodyLine.replace(/^return\s+/, '').slice(0, 60));
        }

        // Web Framework Routes (Gin, Echo, Fiber, Chi, standard net/http)
        // r.GET("/weather", handleWeather) or http.HandleFunc("/api", handler)
        const routeMatch = bodyLine.match(/(?:router|r|e|app|http|group|api)\.(GET|POST|PUT|DELETE|PATCH|HandleFunc|Handle)\(\s*["']([^"']+)["']\s*,\s*([a-zA-Z0-9_.]+)/i);
        if (routeMatch) {
          let method = routeMatch[1].toUpperCase();
          if (method === 'HANDLEFUNC' || method === 'HANDLE') method = 'ALL';
          const routePath = routeMatch[2];
          const handler = routeMatch[3];
          result.routes.push({
            file: relativePath,
            method,
            path: routePath,
            handler,
            startLine: j + 1,
            endLine: j + 1
          });
        }

        // Database operations (GORM, SQL, SQLX)
        // db.Find(&users), db.Query("SELECT ..."), db.Exec(...)
        const dbMatch = bodyLine.match(/(?:db|tx)\.(Query|QueryRow|Exec|Find|First|Where|Create|Save|Delete|Raw)\(([^)]*)\)/);
        if (dbMatch) {
          result.dbOperations.push({
            file: relativePath,
            model: 'SQLDatabase',
            operation: dbMatch[1],
            enclosingFunction: fnName,
            startLine: j + 1,
            endLine: j + 1,
            queryArgs: bodyLine.slice(0, 80)
          });
        }

        // Condition
        const condMatch = bodyLine.match(/^if\s+([^\{]+)\{/);
        if (condMatch) {
          fnObj.conditions.push({
            test: condMatch[1].trim().slice(0, 50),
            consequentSnippet: lines[j + 1]?.trim()?.slice(0, 50) || 'branch execution',
            line: j + 1
          });
        }

        // Variables: x := ...
        const varMatch = bodyLine.match(/^([a-zA-Z0-9_,\s]+)\s*:=\s*(.+)$/);
        if (varMatch) {
          const names = varMatch[1].split(',').map((v) => v.trim()).filter((v) => v !== '_');
          for (const name of names) {
            if (!fnObj.variablesCreated.includes(name)) {
              fnObj.variablesCreated.push(name);
            }
          }
        }

        // Calls
        const callMatch = bodyLine.match(/([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)?)\s*\(([^)]*)\)/);
        if (callMatch) {
          const callee = callMatch[1];
          if (!['if', 'for', 'switch', 'return', 'make', 'new', 'append', 'len', 'cap', 'panic', 'recover', 'close'].includes(callee)) {
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
      continue;
    }
  }

  return result;
}

module.exports = {
  analyzeGoFile
};
