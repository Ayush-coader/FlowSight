const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const BABEL_PARSER_OPTIONS = {
  sourceType: 'unambiguous',
  allowReturnOutsideFunction: true,
  allowAwaitOutsideFunction: true,
  allowImportExportEverywhere: true,
  plugins: ['jsx', 'classProperties', 'objectRestSpread', 'dynamicImport', 'optionalChaining', 'nullishCoalescingOperator']
};

const MONGOOSE_METHODS = new Set([
  'find',
  'findone',
  'findbyid',
  'findbyidandupdate',
  'findbyidanddelete',
  'findoneandupdate',
  'findoneanddelete',
  'create',
  'save',
  'insertmany',
  'updatemany',
  'updateone',
  'deletemany',
  'deleteone',
  'aggregate',
  'countdocuments'
]);

/**
 * Analyzes Mongoose models and database operations
 * @param {Object} fileInfo
 * @param {string} fileInfo.relativePath
 * @param {string} fileInfo.content
 * @returns {{ models: Array<Object>, operations: Array<Object> }}
 */
function analyzeMongooseFile({ relativePath, content }) {
  const result = {
    models: [],
    operations: []
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

  try {
    traverse(ast, {
      CallExpression(path) {
        const { callee, arguments: args } = path.node;
        if (!callee || callee.type !== 'MemberExpression') return;

        const methodName = callee.property?.name?.toLowerCase();
        const objectName = callee.object?.name || (callee.object?.property?.name);

        // 1. Model Definition: mongoose.model('User', schema)
        if (
          (callee.object?.name === 'mongoose' || callee.object?.name === 'model') &&
          methodName === 'model' &&
          args.length > 0
        ) {
          const modelName = args[0].type === 'StringLiteral' ? args[0].value : 'DynamicModel';
          result.models.push({
            name: modelName,
            file: relativePath,
            startLine: path.node.loc?.start.line,
            endLine: path.node.loc?.end.line
          });
        }

        // 2. Query Operation: User.findOne({ email }) or instance.save()
        if (MONGOOSE_METHODS.has(methodName) && objectName) {
          // Find enclosing function
          const enclosingFn = path.findParent((p) =>
            p.isFunctionDeclaration() ||
            p.isFunctionExpression() ||
            p.isArrowFunctionExpression() ||
            p.isClassMethod()
          );

          let enclosingFnName = null;
          if (enclosingFn) {
            if (enclosingFn.node.id?.name) {
              enclosingFnName = enclosingFn.node.id.name;
            } else if (enclosingFn.parent?.type === 'VariableDeclarator' && enclosingFn.parent.id?.name) {
              enclosingFnName = enclosingFn.parent.id.name;
            } else if (enclosingFn.node.key?.name) {
              enclosingFnName = enclosingFn.node.key.name;
            } else if (enclosingFn.node.loc?.start?.line) {
              enclosingFnName = `inlineHandler_L${enclosingFn.node.loc.start.line}`;
            }
          }

          result.operations.push({
            model: objectName,
            operation: callee.property?.name || methodName,
            enclosingFunction: enclosingFnName,
            file: relativePath,
            startLine: path.node.loc?.start.line,
            endLine: path.node.loc?.end.line,
            queryArgs: args.map((a) => {
              if (!a) return 'arg';
              if (a.type === 'Identifier') return a.name;
              if (a.type === 'StringLiteral') return a.value;
              if (a.type === 'ObjectExpression') {
                const keys = (a.properties || [])
                  .map((p) => p.key?.name || p.key?.value || (p.value?.name ? p.value.name : ''))
                  .filter(Boolean);
                return keys.length > 0 ? keys.join(', ') : '{...}';
              }
              return 'arg';
            })
          });
        }
      }
    });
  } catch (err) {
    console.warn(`Mongoose analysis error in ${relativePath}:`, err.message);
  }

  return result;
}

module.exports = {
  analyzeMongooseFile
};
