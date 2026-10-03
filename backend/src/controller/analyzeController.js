const { fetchRepository, discoverSourceFiles } = require('../services/repositoryService');
const { buildRepositoryGraph } = require('../services/graphService');
const { explainNode, chatWithCodebase } = require('../services/aiService');

/**
 * Controller to trigger repository analysis
 */
async function analyzeRepository(req, res) {
  let cleanupFn = null;
  try {
    const { repoUrl, localPath } = req.body;

    if (!repoUrl && !localPath) {
      return res.status(400).json({
        success: false,
        error: 'Please provide either a valid GitHub repository URL or a local folder path.'
      });
    }

    // Ingest repo (clone or local read)
    const { repoPath, repoName, cleanup } = await fetchRepository({ repoUrl, localPath });
    cleanupFn = cleanup;

    // Discover all source and project files
    const sourceFiles = await discoverSourceFiles(repoPath);

    if (sourceFiles.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No source or code files were found in this repository.'
      });
    }

    // Execute AST pipeline and build IR Graph
    const graph = buildRepositoryGraph(sourceFiles, repoName);

    return res.json({
      success: true,
      graph
    });
  } catch (err) {
    console.error('Analysis error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'An error occurred during repository analysis.'
    });
  } finally {
    if (cleanupFn) {
      await cleanupFn().catch(() => {});
    }
  }
}

/**
 * Controller to explain a node using AI / deterministic heuristics
 */
async function explain(req, res) {
  try {
    const { node, incomingEdges, outgoingEdges } = req.body;
    const result = await explainNode({ node, incomingEdges, outgoingEdges });
    return res.json({
      success: true,
      ...result
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to generate explanation.'
    });
  }
}

/**
 * Controller for AI Codebase Chatbot queries
 */
async function chat(req, res) {
  try {
    const { message, history, graphData, selectedNode } = req.body;
    const result = await chatWithCodebase({ message, history, graphData, selectedNode });
    return res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error('Chat error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to process chat query.'
    });
  }
}

/**
 * Controller to generate comprehensive plain-English README
 */
async function generateReadme(req, res) {
  try {
    const { graphData } = req.body;
    const result = await generateReadmeContent(graphData);
    return res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error('README generation error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to generate README.'
    });
  }
}

module.exports = {
  analyzeRepository,
  explain,
  chat,
  generateReadme
};

