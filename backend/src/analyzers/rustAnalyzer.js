/**
 * FlowSight Rust Analyzer
 * Extracts structural data from Rust source files (.rs)
 * Supports:
 * - Module & Use declarations (use crate::..., use std::...)
 * - Functions (fn, pub fn, pub async fn, parameters, return types)
 * - Structs, Enums, Traits, Impls
 * - Web Framework routes (Actix-web, Axum, Rocket, Warp)
 * - Database queries (SQLx, Diesel, SeaORM)
 * - Return expressions and conditionals
 */

function analyzeRustFile({ relativePath, content }) {
  const result = {
    file: relativePath,
    language: 'rust',
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
  let currentAttributes = [];

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) {
      continue;
    }

    // 1. Rust attributes / macros: #[get("/api/weather")] or #[derive(...)]
    if (trimmed.startsWith('#[')) {
      currentAttributes.push({ text: trimmed, line: lineNum });
      continue;
    }

    // 2. Use statements: use std::sync::Arc; or use actix_web::{get, web, App};
    const useMatch = trimmed.match(/^pub\s+use\s+(.+);|^use\s+(.+);/);
    if (useMatch) {
      const rawUse = (useMatch[1] || useMatch[2]).trim();
      const isGroup = rawUse.includes('{');
      if (isGroup) {
        const parts = rawUse.split('{');
        const prefix = parts[0].replace(/::$/, '');
        const items = parts[1].replace('}', '').split(',').map((s) => s.trim()).filter(Boolean);
        result.imports.push({
          source: prefix,
          specifiers: items.map((it) => ({ imported: it, local: it, type: 'named' })),
          kind: 'rust_use',
          loc: { start: { line: lineNum, column: 0 }, end: { line: lineNum, column: line.length } }
        });
      } else {
        const local = rawUse.split('::').pop();
        result.imports.push({
          source: rawUse,
          specifiers: [{ imported: 'default', local, type: 'default' }],
          kind: 'rust_use',
          loc: { start: { line: lineNum, column: 0 }, end: { line: lineNum, column: line.length } }
        });
      }
      currentAttributes = [];
      continue;
    }

    // 3. Structs & Enums: pub struct User { ... } or enum Status { ... }
    const structMatch = trimmed.match(/^(?:pub(?:\([^)]*\))?\s+)?(struct|enum|trait)\s+([a-zA-Z0-9_]+)/);
    if (structMatch) {
      const kind = structMatch[1];
      const name = structMatch[2];
      result.structs.push({ name, kind, line: lineNum });
      result.exports.push({
        name,
        type: 'named',
        kind,
        loc: { start: { line: lineNum, column: 0 }, end: { line: lineNum, column: line.length } }
      });
      currentAttributes = [];
      continue;
    }

    // 4. Functions:
    // pub async fn get_weather(web::Path(city): web::Path<String>) -> impl Responder {
    // fn calculate_hash(data: &[u8]) -> String {
    const fnMatch = trimmed.match(/^(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?fn\s+([a-zA-Z0-9_]+)\s*(?:<[^>]*>)?\s*\(([^)]*)\)(?:\s*->\s*([^{]+))?\s*\{?/);
    if (fnMatch) {
      const isAsync = trimmed.includes('async fn');
      const fnName = fnMatch[1];
      const rawParams = fnMatch[2] || '';
      const returnType = fnMatch[3]?.trim();

      const params = rawParams
        .split(',')
        .map((p) => p.trim().split(':')[0].trim())
        .filter((p) => p && !['&self', '&mut self', 'self'].includes(p));

      // Calculate matching braces
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
        isAsync,
        isAnonymous: false,
        params,
        returnType,
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

      // Check Actix/Rocket/Axum attribute routes
      for (const attr of currentAttributes) {
        const actixRoute = attr.text.match(/#\[(get|post|put|delete|patch|head)\(\s*["']([^"']+)["']/i);
        if (actixRoute) {
          result.routes.push({
            file: relativePath,
            method: actixRoute[1].toUpperCase(),
            path: actixRoute[2],
            handler: fnName,
            startLine: attr.line,
            endLine
          });
        }
      }

      // Analyze inside function body
      for (let j = lineNum; j < endLine; j++) {
        const bodyLine = lines[j].trim();
        if (!bodyLine || bodyLine.startsWith('//')) continue;

        // SQLx / Diesel DB operations
        const dbMatch = bodyLine.match(/(?:sqlx::query|diesel::|sea_orm::)([a-zA-Z0-9_!]+)/);
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

        // Returns
        if (bodyLine.startsWith('return ') || (!bodyLine.endsWith(';') && bodyLine.length > 2 && !bodyLine.endsWith('{') && !bodyLine.endsWith('}'))) {
          const ret = bodyLine.replace(/^return\s+/, '').replace(/;$/, '');
          if (!['{', '}', 'Ok(())'].includes(ret)) {
            fnObj.returns.push(ret.slice(0, 60));
          }
        }

        // Let variables
        const letMatch = bodyLine.match(/^let\s+(?:mut\s+)?([a-zA-Z0-9_]+)/);
        if (letMatch && !fnObj.variablesCreated.includes(letMatch[1])) {
          fnObj.variablesCreated.push(letMatch[1]);
        }

        // Function calls
        const callMatch = bodyLine.match(/([a-zA-Z0-9_]+(?:::|.)[a-zA-Z0-9_]+)\s*\(/);
        if (callMatch) {
          result.calls.push({
            callee: callMatch[1],
            enclosingFunction: fnName,
            file: relativePath,
            line: j + 1
          });
        }
      }

      result.functions.push(fnObj);
      result.exports.push({
        name: fnName,
        type: 'named',
        kind: 'function',
        loc: { start: { line: lineNum, column: 0 }, end: { line: endLine, column: 0 } }
      });

      currentAttributes = [];
      continue;
    }

    currentAttributes = [];
  }

  return result;
}

module.exports = {
  analyzeRustFile
};
