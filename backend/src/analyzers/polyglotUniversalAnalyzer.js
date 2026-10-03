/**
 * FlowSight Polyglot & Universal File Analyzer
 * Supports:
 * - C / C++ (.c, .cpp, .cc, .cxx, .h, .hpp)
 * - PHP (.php)
 * - Ruby (.rb)
 * - Swift (.swift), Dart (.dart)
 * - Shell / Bash / PowerShell (.sh, .bash, .zsh, .ps1, .bat)
 * - SQL Schemas & Queries (.sql)
 * - HTML / Vue / Svelte / Template files
 * - Configs (JSON, YAML, TOML, XML, Dockerfile, Makefile, Markdown)
 * - Any generic text or source code file
 */

function analyzePolyglotFile({ relativePath, content, extension }) {
  const ext = (extension || '').toLowerCase();
  let lang = 'generic';

  if (['.c', '.cpp', '.cc', '.cxx', '.h', '.hpp'].includes(ext)) lang = 'cpp';
  else if (ext === '.php') lang = 'php';
  else if (ext === '.rb') lang = 'ruby';
  else if (ext === '.swift') lang = 'swift';
  else if (ext === '.dart') lang = 'dart';
  else if (['.sh', '.bash', '.zsh', '.ps1', '.bat'].includes(ext)) lang = 'shell';
  else if (ext === '.sql') lang = 'sql';
  else if (['.html', '.htm', '.vue', '.svelte', '.astro'].includes(ext)) lang = 'markup';
  else if (['.json', '.yaml', '.yml', '.toml', '.xml', '.env'].includes(ext)) lang = 'config';
  else if (['.md', '.mdx', '.txt', '.rst'].includes(ext)) lang = 'docs';
  else if (relativePath.toLowerCase().includes('dockerfile')) lang = 'dockerfile';
  else if (relativePath.toLowerCase().includes('makefile')) lang = 'makefile';

  const result = {
    file: relativePath,
    language: lang,
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
    classes: [],
    metadata: {}
  };

  if (!content || typeof content !== 'string') {
    result.analysisStatus = 'skipped';
    return result;
  }

  const lines = content.split('\n');

  // SPECIALIZED PARSERS BASED ON LANGUAGE:

  // 1. SQL Files: Extract Tables, Queries, Primary/Foreign keys
  if (lang === 'sql') {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const createTable = line.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"']?[a-zA-Z0-9_]+[`"']?)/i);
      if (createTable) {
        const tableName = createTable[1].replace(/[`"']/g, '');
        result.dbOperations.push({
          file: relativePath,
          model: tableName,
          operation: 'CREATE TABLE',
          startLine: i + 1,
          endLine: i + 1,
          queryArgs: line
        });
        result.exports.push({
          name: tableName,
          type: 'table',
          kind: 'database_table',
          loc: { start: { line: i + 1, column: 0 }, end: { line: i + 1, column: line.length } }
        });
      }
    }
    return result;
  }

  // 2. C / C++ Files
  if (lang === 'cpp') {
    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const line = lines[i].trim();

      // #include <stdio.h> or #include "header.h"
      const incMatch = line.match(/^#include\s+[<"]([^>"]+)[>"]/);
      if (incMatch) {
        result.imports.push({
          source: incMatch[1],
          specifiers: [{ imported: 'default', local: incMatch[1], type: 'default' }],
          kind: 'c_include',
          loc: { start: { line: lineNum, column: 0 }, end: { line: lineNum, column: line.length } }
        });
        continue;
      }

      // Functions: int main(int argc, char** argv) { or void calculate_sum(...)
      const fnMatch = line.match(/^(?:static\s+|inline\s+|virtual\s+)?[a-zA-Z0-9_*&:]+\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*(?:const)?\s*\{?/);
      if (fnMatch && !['if', 'for', 'while', 'switch', 'return', 'sizeof'].includes(fnMatch[1])) {
        const fnName = fnMatch[1];
        const rawParams = fnMatch[2] || '';
        const params = rawParams.split(',').map((p) => p.trim().split(/\s+/).pop()).filter(Boolean);

        result.functions.push({
          name: fnName,
          isAsync: false,
          isAnonymous: false,
          params,
          startLine: lineNum,
          endLine: Math.min(lineNum + 20, lines.length),
          sourceCode: line,
          conditions: [],
          returns: [],
          variablesCreated: [],
          variablesUsed: []
        });
        result.exports.push({
          name: fnName,
          type: 'named',
          kind: 'function',
          loc: { start: { line: lineNum, column: 0 }, end: { line: lineNum, column: line.length } }
        });
      }
    }
    return result;
  }

  // 3. PHP Files
  if (lang === 'php') {
    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const line = lines[i].trim();

      // use App\Services\AuthService;
      const useMatch = line.match(/^use\s+([a-zA-Z0-9_\\]+);/);
      if (useMatch) {
        const source = useMatch[1];
        const local = source.split('\\').pop();
        result.imports.push({
          source,
          specifiers: [{ imported: local, local, type: 'named' }],
          kind: 'php_use',
          loc: { start: { line: lineNum, column: 0 }, end: { line: lineNum, column: line.length } }
        });
      }

      // Laravel / Symfony Routes: Route::get('/weather', [WeatherController::class, 'show'])
      const routeMatch = line.match(/Route::(get|post|put|delete|patch|any)\(\s*['"]([^'"]+)['"]\s*,\s*([^)]+)\)/i);
      if (routeMatch) {
        result.routes.push({
          file: relativePath,
          method: routeMatch[1].toUpperCase(),
          path: routeMatch[2],
          handler: routeMatch[3].replace(/['"\s\[\]]/g, ''),
          startLine: lineNum,
          endLine: lineNum
        });
      }

      // Functions: function getUser($id)
      const fnMatch = line.match(/(?:public|private|protected|static)?\s*function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/);
      if (fnMatch) {
        const fnName = fnMatch[1];
        const rawParams = fnMatch[2] || '';
        const params = rawParams.split(',').map((p) => p.trim().replace(/^\$/, '')).filter(Boolean);
        result.functions.push({
          name: fnName,
          isAsync: false,
          params,
          startLine: lineNum,
          endLine: Math.min(lineNum + 20, lines.length),
          sourceCode: line,
          conditions: [],
          returns: [],
          variablesCreated: [],
          variablesUsed: []
        });
        result.exports.push({
          name: fnName,
          type: 'named',
          kind: 'function',
          loc: { start: { line: lineNum, column: 0 }, end: { line: lineNum, column: line.length } }
        });
      }
    }
    return result;
  }

  // 4. Ruby Files
  if (lang === 'ruby') {
    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const line = lines[i].trim();

      // require 'sinatra' or require_relative 'helpers'
      const reqMatch = line.match(/^(?:require|require_relative)\s+['"]([^'"]+)['"]/);
      if (reqMatch) {
        result.imports.push({
          source: reqMatch[1],
          specifiers: [{ imported: 'default', local: reqMatch[1], type: 'default' }],
          kind: 'ruby_require',
          loc: { start: { line: lineNum, column: 0 }, end: { line: lineNum, column: line.length } }
        });
      }

      // Sinatra / Rails routes: get '/weather' do or post '/login' do
      const sinatraRoute = line.match(/^(get|post|put|delete|patch)\s+['"]([^'"]+)['"]/i);
      if (sinatraRoute) {
        result.routes.push({
          file: relativePath,
          method: sinatraRoute[1].toUpperCase(),
          path: sinatraRoute[2],
          handler: `route_${lineNum}`,
          startLine: lineNum,
          endLine: lineNum
        });
      }

      // def method_name(arg1, arg2)
      const defMatch = line.match(/^def\s+([a-zA-Z0-9_!?]+)(?:\(([^)]*)\))?/);
      if (defMatch) {
        const fnName = defMatch[1];
        const rawParams = defMatch[2] || '';
        const params = rawParams.split(',').map((p) => p.trim()).filter(Boolean);
        result.functions.push({
          name: fnName,
          isAsync: false,
          params,
          startLine: lineNum,
          endLine: Math.min(lineNum + 20, lines.length),
          sourceCode: line,
          conditions: [],
          returns: [],
          variablesCreated: [],
          variablesUsed: []
        });
        result.exports.push({
          name: fnName,
          type: 'named',
          kind: 'function',
          loc: { start: { line: lineNum, column: 0 }, end: { line: lineNum, column: line.length } }
        });
      }
    }
    return result;
  }

  // 5. Shell / Scripting Files (.sh, .bash, .ps1)
  if (lang === 'shell') {
    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const line = lines[i].trim();

      // function name() { or name() {
      const fnMatch = line.match(/^(?:function\s+)?([a-zA-Z0-9_-]+)\s*\(\)\s*\{?/);
      if (fnMatch && !['if', 'for', 'while'].includes(fnMatch[1])) {
        const fnName = fnMatch[1];
        result.functions.push({
          name: fnName,
          isAsync: false,
          params: ['$@'],
          startLine: lineNum,
          endLine: Math.min(lineNum + 20, lines.length),
          sourceCode: line,
          conditions: [],
          returns: [],
          variablesCreated: [],
          variablesUsed: []
        });
        result.exports.push({
          name: fnName,
          type: 'named',
          kind: 'function',
          loc: { start: { line: lineNum, column: 0 }, end: { line: lineNum, column: line.length } }
        });
      }
    }
    return result;
  }

  // 6. Generic code / text / configuration files:
  // Extract key high-level identifiers or section titles
  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i].trim();

    // Markdown headers: # Title
    if (lang === 'docs' && line.startsWith('#')) {
      const title = line.replace(/^#+\s*/, '');
      result.exports.push({
        name: title,
        type: 'heading',
        kind: 'doc_section',
        loc: { start: { line: lineNum, column: 0 }, end: { line: lineNum, column: line.length } }
      });
    }

    // Dockerfile instructions: FROM node:18, EXPOSE 3000, CMD [...]
    if (lang === 'dockerfile') {
      const dockerMatch = line.match(/^(FROM|EXPOSE|ENV|RUN|CMD|ENTRYPOINT)\s+(.+)/i);
      if (dockerMatch) {
        result.exports.push({
          name: `${dockerMatch[1]} ${dockerMatch[2].slice(0, 30)}`,
          type: 'docker_instruction',
          kind: 'docker',
          loc: { start: { line: lineNum, column: 0 }, end: { line: lineNum, column: line.length } }
        });
      }
    }
  }

  return result;
}

module.exports = {
  analyzePolyglotFile
};
