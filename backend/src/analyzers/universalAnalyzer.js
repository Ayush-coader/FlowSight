/**
 * FlowSight Universal Analyzer Dispatcher
 * Automatically detects language and routes source files to appropriate AST / static analyzers:
 * - JavaScript & TypeScript (Full AST via Babel)
 * - Python (Full AST-like structural parser: Flask, FastAPI, Django, SQLAlchemy, PyMongo, classes, defs)
 * - Go (Packages, Imports, Structs, Gin/Echo/NetHTTP routes, GORM/SQL)
 * - Rust (Modules, Crates, Structs, Actix/Axum/Rocket, SQLx)
 * - Java, Kotlin, Scala, C# (Spring Boot, ASP.NET, JPA, Classes, Methods)
 * - Polyglot & Universal (C/C++, PHP, Ruby, Swift, Dart, Shell, SQL, Templates, Configs, Docs)
 */

const path = require('path');
const { analyzeJavaScriptFile } = require('./javascriptAnalyzer');
const { analyzePythonFile } = require('./pythonAnalyzer');
const { analyzeGoFile } = require('./goAnalyzer');
const { analyzeRustFile } = require('./rustAnalyzer');
const { analyzeJavaOrCSharpFile } = require('./javaAnalyzer');
const { analyzePolyglotFile } = require('./polyglotUniversalAnalyzer');
const { analyzeExpressFile } = require('./expressAnalyzer');
const { analyzeMongooseFile } = require('./mongooseAnalyzer');
const { analyzeReactFile } = require('./reactAnalyzer');

/**
 * Dispatches analysis to the specialized analyzer based on extension and content
 * @param {Object} file - { relativePath: string, content: string, extension: string, size: number }
 * @returns {Object} Normalized AST-like analysis result
 */
function analyzeSourceFile(file) {
  const ext = (file.extension || path.extname(file.relativePath) || '').toLowerCase();
  const baseName = path.basename(file.relativePath).toLowerCase();

  // 1. JavaScript & TypeScript
  if (['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.mts', '.cts'].includes(ext)) {
    const jsResult = analyzeJavaScriptFile(file);

    // Framework specific additions for JS/TS
    const expressData = analyzeExpressFile(file);
    const mongooseData = analyzeMongooseFile(file);
    const reactData = analyzeReactFile(file);

    return {
      ...jsResult,
      routes: expressData.routes || [],
      mounts: expressData.mounts || [],
      dbModels: mongooseData.models || [],
      dbOperations: mongooseData.operations || [],
      components: reactData.components || [],
      reactApiCalls: reactData.apiCalls || [],
      reactNavigations: reactData.navigations || [],
      reactUserActions: reactData.userActions || []
    };
  }

  // 2. Python
  if (['.py', '.pyw'].includes(ext) || baseName === 'wsgi.py' || baseName === 'asgi.py') {
    return analyzePythonFile(file);
  }

  // 3. Go
  if (ext === '.go') {
    return analyzeGoFile(file);
  }

  // 4. Rust
  if (ext === '.rs') {
    return analyzeRustFile(file);
  }

  // 5. Java, Kotlin, Scala, C#
  if (['.java', '.kt', '.kts', '.scala', '.cs'].includes(ext)) {
    return analyzeJavaOrCSharpFile({ ...file, extension: ext });
  }

  // 6. Polyglot Universal (C/C++, PHP, Ruby, Swift, Dart, Shell, SQL, HTML, JSON, YAML, etc.)
  return analyzePolyglotFile({ ...file, extension: ext });
}

module.exports = {
  analyzeSourceFile
};
