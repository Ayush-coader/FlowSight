/**
 * FlowSight Java / C# / Kotlin / Scala Analyzer
 * Supports:
 * - Packages / Namespaces
 * - Imports / Usings
 * - Classes, Interfaces, Records, Enums
 * - Methods / Functions
 * - Spring Boot & ASP.NET Endpoints (@GetMapping, @PostMapping, [HttpGet], [HttpPost])
 * - Database operations (JPA, Hibernate, Entity Framework, JDBC)
 * - Return statements & conditionals
 */

function analyzeJavaOrCSharpFile({ relativePath, content, extension }) {
  const isCSharp = extension === '.cs';
  const isKotlin = extension === '.kt' || extension === '.kts';
  const langName = isCSharp ? 'csharp' : isKotlin ? 'kotlin' : 'java';

  const result = {
    file: relativePath,
    language: langName,
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
  let currentAnnotations = [];
  let currentClass = null;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      continue;
    }

    // 1. Annotations (@GetMapping, @RestController, [HttpGet], etc.)
    if (trimmed.startsWith('@') || (isCSharp && trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      currentAnnotations.push({ text: trimmed, line: lineNum });
      continue;
    }

    // 2. Imports / Usings
    const impMatch = trimmed.match(/^(?:import|using)\s+(?:static\s+)?([a-zA-Z0-9_.]+);?/);
    if (impMatch) {
      const source = impMatch[1];
      const local = source.split('.').pop();
      result.imports.push({
        source,
        specifiers: [{ imported: local, local, type: 'named' }],
        kind: isCSharp ? 'csharp_using' : 'java_import',
        loc: { start: { line: lineNum, column: 0 }, end: { line: lineNum, column: line.length } }
      });
      currentAnnotations = [];
      continue;
    }

    // 3. Classes / Interfaces / Records
    const classMatch = trimmed.match(/(?:public|private|protected|internal|abstract|final|open)?\s*(?:class|interface|record|enum)\s+([a-zA-Z0-9_]+)/);
    if (classMatch) {
      const className = classMatch[1];
      currentClass = {
        name: className,
        startLine: lineNum,
        annotations: [...currentAnnotations]
      };
      result.classes.push(currentClass);
      result.exports.push({
        name: className,
        type: 'named',
        kind: 'class',
        loc: { start: { line: lineNum, column: 0 }, end: { line: lineNum, column: line.length } }
      });
      currentAnnotations = [];
      continue;
    }

    // 4. Methods / Functions:
    // public ResponseEntity<User> getUser(@PathVariable String id) {
    // public async Task<IActionResult> GetWeather(string city)
    // fun handleRequest(req: Request): Response
    const methodMatch = trimmed.match(/(?:public|private|protected|internal|static|async|override|final)?\s*(?:(?:Task<[^>]+>|ResponseEntity<[^>]+>|[a-zA-Z0-9_<>[\]]+)\s+)?(?:fun\s+)?([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*(?:throws\s+[a-zA-Z0-9_,\s]+)?\s*\{?/);
    if (methodMatch && !['if', 'for', 'while', 'switch', 'catch'].includes(methodMatch[1])) {
      const rawName = methodMatch[1];
      const rawParams = methodMatch[2] || '';
      const fnName = currentClass ? `${currentClass.name}.${rawName}` : rawName;

      const params = rawParams
        .split(',')
        .map((p) => p.trim().split(/\s+/).pop())
        .filter((p) => p && !p.includes('{'));

      // Scan matching braces
      let braceCount = trimmed.includes('{') ? 1 : 0;
      let endLine = lineNum;
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j];
        for (const char of nextLine) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
        }
        if (braceCount <= 0 && trimmed.includes('{')) {
          endLine = j + 1;
          break;
        }
      }

      const sourceCode = lines.slice(lineNum - 1, endLine).join('\n');

      const fnObj = {
        name: fnName,
        isAsync: trimmed.includes('async') || trimmed.includes('Task<') || trimmed.includes('suspend'),
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

      // Check Spring / ASP.NET Route annotations
      for (const ann of currentAnnotations) {
        // Spring: @GetMapping("/path"), @PostMapping, @RequestMapping
        const springRoute = ann.text.match(/@(Get|Post|Put|Delete|Patch|Request)Mapping(?:\(\s*(?:value\s*=\s*)?["']([^"']+)["']\s*\))?/i);
        if (springRoute) {
          let method = springRoute[1].toUpperCase();
          if (method === 'REQUEST') method = 'ALL';
          const routePath = springRoute[2] || '/';
          result.routes.push({
            file: relativePath,
            method,
            path: routePath,
            handler: fnName,
            startLine: ann.line,
            endLine
          });
        }

        // ASP.NET: [HttpGet("path")], [HttpPost]
        const aspRoute = ann.text.match(/\[Http(Get|Post|Put|Delete|Patch)(?:\(\s*["']([^"']+)["']\s*\))?\]/i);
        if (aspRoute) {
          const method = aspRoute[1].toUpperCase();
          const routePath = aspRoute[2] || '/';
          result.routes.push({
            file: relativePath,
            method,
            path: routePath,
            handler: fnName,
            startLine: ann.line,
            endLine
          });
        }
      }

      // Analyze method body
      for (let j = lineNum; j < endLine; j++) {
        const bodyLine = lines[j].trim();
        if (!bodyLine || bodyLine.startsWith('//')) continue;

        // JPA / Hibernate / Entity Framework DB Operations
        const dbMatch = bodyLine.match(/(?:[a-zA-Z0-9_]+Repository|_context\.[a-zA-Z0-9_]+)\.(find|save|delete|count|exists|findAll|findById|Where|FirstOrDefault|Add|SaveChanges)\(/i);
        if (dbMatch) {
          result.dbOperations.push({
            file: relativePath,
            model: 'Repository/DbContext',
            operation: dbMatch[1],
            enclosingFunction: fnName,
            startLine: j + 1,
            endLine: j + 1,
            queryArgs: bodyLine.slice(0, 80)
          });
        }

        // Returns
        if (bodyLine.startsWith('return ')) {
          fnObj.returns.push(bodyLine.replace(/^return\s+/, '').replace(/;$/, '').slice(0, 60));
        }

        // Conditions
        const condMatch = bodyLine.match(/^if\s*\(([^)]+)\)/);
        if (condMatch) {
          fnObj.conditions.push({
            test: condMatch[1].trim().slice(0, 50),
            consequentSnippet: lines[j + 1]?.trim()?.slice(0, 50) || 'branch execution',
            line: j + 1
          });
        }

        // Calls
        const callMatch = bodyLine.match(/([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)?)\s*\(/);
        if (callMatch) {
          const callee = callMatch[1];
          if (!['if', 'for', 'while', 'switch', 'super', 'this'].includes(callee)) {
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

      currentAnnotations = [];
      continue;
    }

    currentAnnotations = [];
  }

  return result;
}

module.exports = {
  analyzeJavaOrCSharpFile
};
