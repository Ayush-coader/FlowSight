const path = require('path');

/**
 * Normalizes relative import paths to match discovered repository file paths
 * @param {string} sourceFile - Relative path of the importing file (e.g. 'src/controllers/authController.js')
 * @param {string} importPath - Relative import target (e.g. '../services/authService')
 * @param {Set<string>} allFiles - Set of all relative file paths in repo
 * @returns {string|null} Resolved file relative path
 */
function resolveImportPath(sourceFile, importPath, allFiles) {
  if (!importPath) return null;

  const sourceDir = path.dirname(sourceFile);
  const extensions = [
    '', '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.py', '.go', '.rs',
    '.java', '.cs', '.cpp', '.c', '.h', '.hpp', '.php', '.rb', '.vue', '.svelte'
  ];

  // 1. Relative imports starting with . or /
  if (importPath.startsWith('.') || importPath.startsWith('/')) {
    const potentialBase = path.normalize(path.join(sourceDir, importPath)).replace(/\\/g, '/');

    for (const ext of extensions) {
      const candidate = `${potentialBase}${ext}`;
      if (allFiles.has(candidate)) return candidate;
      const indexCandidate = `${potentialBase}/index${ext}`;
      if (allFiles.has(indexCandidate)) return indexCandidate;
      const pyInitCandidate = `${potentialBase}/__init__.py`;
      if (allFiles.has(pyInitCandidate)) return pyInitCandidate;
    }
  }

  // 2. Python / Java / Rust style dotted or path module imports (e.g., 'src.services.auth', 'models.user')
  const convertedPath = importPath.replace(/\./g, '/');
  for (const ext of extensions) {
    const candidate1 = `${convertedPath}${ext}`;
    if (allFiles.has(candidate1)) return candidate1;

    const candidate2 = `src/${convertedPath}${ext}`;
    if (allFiles.has(candidate2)) return candidate2;

    const relCandidate = path.normalize(path.join(sourceDir, convertedPath)).replace(/\\/g, '/') + ext;
    if (allFiles.has(relCandidate)) return relCandidate;
  }

  // 3. Exact matching in allFiles
  for (const file of allFiles) {
    if (file.endsWith(`/${importPath}`) || file === importPath) {
      return file;
    }
  }

  return null;
}

/**
 * Builds cross-file lookup maps for imports, exports, and function references
 * @param {Array<Object>} analyzedFiles - Results of per-file AST analyses
 * @returns {Object} Resolution index
 */
function buildSymbolIndex(analyzedFiles) {
  const allFilesSet = new Set(analyzedFiles.map((f) => f.file));
  const fileExports = new Map(); // file -> Array<{ name, local, type, kind }>
  const fileImports = new Map(); // file -> Array<{ sourceFile, resolvedFile, specifiers }>
  const functionRegistry = new Map(); // `${file}:${fnName}` -> FunctionNode

  for (const fileData of analyzedFiles) {
    fileExports.set(fileData.file, fileData.exports || []);

    const resolvedImports = [];
    for (const imp of fileData.imports || []) {
      const resolved = resolveImportPath(fileData.file, imp.source, allFilesSet);
      resolvedImports.push({
        source: imp.source,
        resolvedFile: resolved,
        specifiers: imp.specifiers,
        kind: imp.kind
      });
    }
    fileImports.set(fileData.file, resolvedImports);

    for (const fn of fileData.functions || []) {
      const key = `${fileData.file}:${fn.name}`;
      functionRegistry.set(key, { ...fn, file: fileData.file });
    }
  }

  return {
    allFilesSet,
    fileExports,
    fileImports,
    functionRegistry
  };
}

/**
 * Resolves where a called symbol is defined (local function vs imported function)
 * @param {string} currentFile
 * @param {string} calleeName (e.g. 'loginUser' or 'authService.loginUser')
 * @param {Object} index - Symbol index from buildSymbolIndex
 * @returns {{ targetFile: string, targetFunction: string, confidence: Object }|null}
 */
function resolveCalleeTarget(currentFile, calleeName, index) {
  if (!calleeName) return null;

  // 1. Check if defined in current file
  const localKey = `${currentFile}:${calleeName}`;
  if (index.functionRegistry.has(localKey)) {
    return {
      targetFile: currentFile,
      targetFunction: calleeName,
      confidence: {
        level: 'CONFIRMED',
        score: 0.99,
        reason: 'Direct intra-file function definition'
      }
    };
  }

  // 2. Check imports in current file
  const imports = index.fileImports.get(currentFile) || [];

  // Check direct named import: import { loginUser } from './service'
  for (const imp of imports) {
    if (!imp.resolvedFile) continue;

    for (const spec of imp.specifiers || []) {
      if (spec.local === calleeName) {
        const targetFnName = spec.imported === 'default' ? spec.local : spec.imported;
        const targetKey = `${imp.resolvedFile}:${targetFnName}`;

        if (index.functionRegistry.has(targetKey)) {
          return {
            targetFile: imp.resolvedFile,
            targetFunction: targetFnName,
            confidence: {
              level: 'CONFIRMED',
              score: 0.95,
              reason: 'Cross-file resolved via explicit import'
            }
          };
        } else {
          // Exported under default or re-exported
          return {
            targetFile: imp.resolvedFile,
            targetFunction: targetFnName,
            confidence: {
              level: 'INFERRED',
              score: 0.85,
              reason: 'Imported symbol matched file export target'
            }
          };
        }
      }
    }

    // Check namespace or object import: import * as authService from './service'; authService.loginUser()
    if (calleeName.includes('.')) {
      const [objName, propName] = calleeName.split('.');
      for (const spec of imp.specifiers || []) {
        if (spec.local === objName) {
          return {
            targetFile: imp.resolvedFile,
            targetFunction: propName,
            confidence: {
              level: 'CONFIRMED',
              score: 0.92,
              reason: 'Cross-file resolved via object member import'
            }
          };
        }
      }
    }
  }

  return null;
}

module.exports = {
  resolveImportPath,
  buildSymbolIndex,
  resolveCalleeTarget
};
