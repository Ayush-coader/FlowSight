const fs = require('fs');
const path = require('path');
const os = require('os');
const simpleGit = require('simple-git');

const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.github',
  'dist',
  'build',
  'coverage',
  '.next',
  '.nuxt',
  'vendor',
  '.turbo',
  '.cache',
  'out',
  '.vscode',
  '.idea',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  '.venv',
  'venv',
  'env',
  'target',
  'bin',
  'obj',
  '.gradle',
  '.cargo',
  'pkg',
  '.svn',
  '.hg'
]);

// Binary, media, and archive extensions to skip
const IGNORED_BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp', '.bmp', '.tiff',
  '.mp3', '.mp4', '.wav', '.ogg', '.avi', '.mov', '.flv', '.mkv',
  '.zip', '.tar', '.gz', '.7z', '.rar', '.bz2', '.xz',
  '.exe', '.dll', '.so', '.dylib', '.class', '.pyc', '.pyo', '.jar', '.war', '.ear',
  '.bin', '.iso', '.dmg', '.pkg', '.deb', '.rpm',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.lock', '.wasm', '.db', '.sqlite', '.sqlite3', '.suo', '.pdb'
]);

const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1MB per file
const MAX_TOTAL_FILES = 800; // Multi-language repo support limit

/**
 * Parses and normalizes GitHub repository and subdirectory URLs
 * Supports:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - https://github.com/owner/repo/tree/branch
 * - https://github.com/owner/repo/tree/branch/subfolder/path
 * - https://github.com/owner/repo/blob/branch/path/file
 *
 * @param {string} url
 * @returns {{ owner: string, repo: string, cloneUrl: string, branch: string|null, subpath: string|null, displayName: string } | null}
 */
function parseGitHubUrl(url) {
  if (!url || typeof url !== 'string') return null;
  let clean = url.trim();
  if (!/^https?:\/\//i.test(clean)) {
    clean = 'https://' + clean;
  }

  try {
    const parsed = new URL(clean);
    if (!parsed.hostname.toLowerCase().includes('github.com')) return null;

    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;

    const owner = parts[0];
    const rawRepo = parts[1];
    const repo = rawRepo.replace(/\.git$/i, '');
    const cloneUrl = `https://github.com/${owner}/${repo}.git`;

    let branch = null;
    let subpath = null;

    if (parts.length >= 4 && (parts[2] === 'tree' || parts[2] === 'blob')) {
      branch = decodeURIComponent(parts[3]);
      if (parts.length > 4) {
        subpath = parts.slice(4).map(decodeURIComponent).join('/');
      }
    }

    const displayName = subpath ? `${repo}/${subpath}` : repo;

    return {
      owner,
      repo,
      cloneUrl,
      branch,
      subpath,
      displayName
    };
  } catch {
    return null;
  }
}

/**
 * Validates a GitHub repository URL
 * @param {string} url
 * @returns {boolean}
 */
function isValidGitHubUrl(url) {
  return parseGitHubUrl(url) !== null;
}

/**
 * Fast recursive fetch for subdirectories via GitHub Contents API
 */
async function fetchViaGitHubApi({ owner, repo, branch, subpath, targetDir }) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${subpath || ''}${branch ? `?ref=${encodeURIComponent(branch)}` : ''}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'FlowSight-App',
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!res.ok) {
    throw new Error(`GitHub API 
      HTTP ${res.status}: ${res.statusText}`);
  }

  const items = await res.json();
  const list = Array.isArray(items) ? items : [items];

  for (const item of list) {
    const destPath = path.join(targetDir, item.name);
    if (item.type === 'dir') {
      if (IGNORED_DIRECTORIES.has(item.name)) continue;
      await fs.promises.mkdir(destPath, { recursive: true });
      await fetchViaGitHubApi({
        owner,
        repo,
        branch,
        subpath: `${subpath ? subpath + '/' : ''}${item.name}`,
        targetDir: destPath
      });
    } else if (item.type === 'file' && item.download_url) {
      const ext = path.extname(item.name).toLowerCase();
      if (!IGNORED_BINARY_EXTENSIONS.has(ext)) {
        const fileRes = await fetch(item.download_url);
        if (fileRes.ok) {
          const text = await fileRes.text();
          await fs.promises.writeFile(destPath, text, 'utf8');
        }
      }
    }
  }
}

/**
 * Clones a public GitHub repository (or subfolder/branch) or uses a local path
 * @param {Object} params
 * @param {string} [params.repoUrl]
 * @param {string} [params.localPath]
 * @returns {Promise<{ repoPath: string, repoName: string, cleanup: () => Promise<void> }>}
 */
async function fetchRepository({ repoUrl, localPath }) {
  if (localPath) {
    const resolvedPath = path.resolve(localPath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Local path does not exist: ${resolvedPath}`);
    }
    const repoName = path.basename(resolvedPath);
    return {
      repoPath: resolvedPath,
      repoName,
      cleanup: async () => {} // Local folders don't need cleanup
    };
  }

  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) {
    throw new Error('Invalid GitHub repository URL. Must be in format https://github.com/owner/repo or a subpath like https://github.com/owner/repo/tree/branch/subfolder');
  }

  const repoId = `${parsed.repo}-${Date.now()}`;
  const tempDir = path.join(os.tmpdir(), 'flowsight-repos', repoId);

  await fs.promises.mkdir(tempDir, { recursive: true });

  // If a subpath is requested (e.g. tree/master/Project-49), try fast GitHub Contents API first
  if (parsed.subpath) {
    try {
      await fetchViaGitHubApi({
        owner: parsed.owner,
        repo: parsed.repo,
        branch: parsed.branch,
        subpath: parsed.subpath,
        targetDir: tempDir
      });

      return {
        repoPath: tempDir,
        repoName: parsed.displayName,
        cleanup: async () => {
          try {
            await fs.promises.rm(tempDir, { recursive: true, force: true });
          } catch (e) {
            console.warn('Failed to cleanup temp repo directory:', e.message);
          }
        }
      };
    } catch (apiErr) {
      console.warn('GitHub API download failed, falling back to Git clone:', apiErr.message);
      // Clean temp dir before git clone fallback
      await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      await fs.promises.mkdir(tempDir, { recursive: true });
    }
  }

  // Git clone fallback or full repo clone
  const git = simpleGit({
    timeout: { block: 45000 },
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
  });

  try {
    const cloneArgs = ['--depth', '1'];
    if (parsed.branch) {
      cloneArgs.push('--branch', parsed.branch);
    }
    cloneArgs.push('--single-branch');

    try {
      await git.clone(parsed.cloneUrl, tempDir, cloneArgs);
    } catch (branchErr) {
      if (parsed.branch) {
        // Fallback to cloning default branch in case branch was nested or renamed
        console.warn(`Branch clone failed (${branchErr.message}), falling back to default branch clone`);
        await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
        await fs.promises.mkdir(tempDir, { recursive: true });
        await git.clone(parsed.cloneUrl, tempDir, ['--depth', '1', '--single-branch']);
      } else {
        throw branchErr;
      }
    }
  } catch (err) {
    // Cleanup if clone failed
    await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    throw new Error(`Failed to clone GitHub repository: ${err.message}`);
  }

  let targetPath = tempDir;
  if (parsed.subpath) {
    const candidatePath = path.join(tempDir, parsed.subpath);
    if (fs.existsSync(candidatePath)) {
      targetPath = candidatePath;
    } else {
      console.warn(`Subpath "${parsed.subpath}" not found in repository root, scanning root.`);
    }
  }

  return {
    repoPath: targetPath,
    repoName: parsed.displayName,
    cleanup: async () => {
      try {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      } catch (e) {
        console.warn('Failed to cleanup temp repo directory:', e.message);
      }
    }
  };
}

/**
 * Recursively discovers all source and project files in the repository
 * @param {string} rootDir
 * @returns {Promise<Array<{ relativePath: string, fullPath: string, content: string, extension: string, size: number }>>}
 */
async function discoverSourceFiles(rootDir) {
  const discoveredFiles = [];

  async function walk(currentDir) {
    if (discoveredFiles.length >= MAX_TOTAL_FILES) return;

    let entries;
    try {
      entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (discoveredFiles.length >= MAX_TOTAL_FILES) break;

      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(entry.name) && !entry.name.startsWith('.')) {
          await walk(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        // Skip known binary, image, and build artifacts
        if (!IGNORED_BINARY_EXTENSIONS.has(ext)) {
          try {
            const stats = await fs.promises.stat(fullPath);
            if (stats.size <= MAX_FILE_SIZE_BYTES && stats.size > 0) {
              const content = await fs.promises.readFile(fullPath, 'utf8');
              // Quick check if file contains null bytes (binary file without standard extension)
              if (!content.includes('\0')) {
                discoveredFiles.push({
                  relativePath,
                  fullPath,
                  content,
                  extension: ext || '.txt',
                  size: stats.size
                });
              }
            }
          } catch {
            // Ignore unreadable files
          }
        }
      }
    }
  }

  await walk(rootDir);
  return discoveredFiles;
}

module.exports = {
  isValidGitHubUrl,
  parseGitHubUrl,
  fetchRepository,
  discoverSourceFiles
};
