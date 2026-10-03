import { useState, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  Search,
  ChevronRight,
  ChevronDown,
  Layers,
  Boxes,
  FileText
} from 'lucide-react';

export default function RepositoryExplorer({
  graphData,
  selectedNodeId,
  selectedModule,
  onSelectModule,
  onSelectNode,
  onSelectFile,
  onOpenReadme
}) {

  const [search, setSearch] = useState('');
  const [collapsedFolders, setCollapsedFolders] = useState({});

  const toggleFolder = (folderKey) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderKey]: !prev[folderKey]
    }));
  };

  // Build recursive directory & file tree from real graphData
  const tree = useMemo(() => {
    if (!graphData || !graphData.nodes) return null;

    const root = { name: graphData.repositoryName || 'repository', isDir: true, children: {} };

    // 1. Group files into directory tree
    const fileNodes = graphData.nodes.filter((n) => n.type === 'file');
    const childNodes = graphData.nodes.filter((n) => n.type !== 'file' && n.type !== 'module');

    for (const f of fileNodes) {
      const parts = f.file.split('/');
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;

        if (isFile) {
          // Attach child functions/routes/db_ops
          const items = childNodes.filter((c) => c.file === f.file);
          current.children[part] = {
            name: part,
            path: f.file,
            isFile: true,
            node: f,
            items
          };
        } else {
          if (!current.children[part]) {
            current.children[part] = {
              name: part,
              isDir: true,
              children: {}
            };
          }
          current = current.children[part];
        }
      }
    }

    return root;
  }, [graphData]);

  if (!graphData) return null;

  const renderTree = (node, path = '', depth = 0) => {
    if (!node) return null;

    const query = search.trim().toLowerCase();

    return Object.entries(node.children || {}).map(([key, item]) => {
      const currentPath = `${path}/${key}`;
      const isCollapsed = collapsedFolders[currentPath];

      if (item.isDir) {
        const isCurrentModule = selectedModule === item.name;
        // Check if any child matches search
        return (
          <div key={currentPath} className="select-none">
            <div
              onClick={() => toggleFolder(currentPath)}
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
              className={`flex items-center gap-1.5 py-1 px-2 hover:bg-slate-800/60 rounded-md cursor-pointer text-xs font-mono transition-colors group ${
                isCurrentModule ? 'bg-sky-500/10 text-sky-300 font-bold' : 'text-slate-300'
              }`}
            >
              {isCollapsed ? (
                <ChevronRight size={13} className="text-slate-500 group-hover:text-slate-300" />
              ) : (
                <ChevronDown size={13} className="text-slate-500 group-hover:text-slate-300" />
              )}
              {isCollapsed ? (
                <Folder size={14} className="text-indigo-400 shrink-0" />
              ) : (
                <FolderOpen size={14} className="text-indigo-400 shrink-0" />
              )}
              <span className="truncate flex-1">{item.name}</span>
              {onSelectModule && depth <= 2 && item.name !== 'src' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectModule(item.name);
                  }}
                  className={`p-1 rounded hover:bg-slate-700 text-[10px] transition-all flex items-center gap-0.5 ${
                    isCurrentModule
                      ? 'bg-sky-500/20 text-sky-400 font-bold border border-sky-500/30'
                      : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-sky-300'
                  }`}
                  title={`View Data Flow for ${item.name}`}
                >
                  <Boxes size={11} />
                </button>
              )}
            </div>

            {!isCollapsed && <div>{renderTree(item, currentPath, depth + 1)}</div>}
          </div>
        );
      }

      if (item.isFile) {
        const matchesFileSearch = query ? item.name.toLowerCase().includes(query) : true;
        const matchingItems = item.items.filter((it) =>
          query ? it.name.toLowerCase().includes(query) : true
        );

        if (query && !matchesFileSearch && matchingItems.length === 0) {
          return null;
        }

        const isFileSelected = selectedNodeId === item.node?.id;

        return (
          <div key={currentPath} className="select-none">
            <div
              onClick={() => {
                toggleFolder(currentPath);
                onSelectFile && onSelectFile(item.node);
              }}
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
              className={`flex items-center gap-1.5 py-1 px-2 rounded-md cursor-pointer text-xs font-mono transition-colors group ${
                isFileSelected
                  ? 'bg-sky-500/20 text-sky-300 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              {isCollapsed ? (
                <ChevronRight size={13} className="text-slate-500" />
              ) : (
                <ChevronDown size={13} className="text-slate-500" />
              )}
              <FileCode size={14} className="text-cyan-400 shrink-0" />
              <span className="truncate flex-1">{item.name}</span>
              <span className="text-[10px] text-slate-500">{item.items.length}</span>
            </div>

            {!isCollapsed && (
              <div className="space-y-0.5">
                {(query ? matchingItems : item.items).map((child) => {
                  const isChildSelected = selectedNodeId === child.id;

                  const iconColor = {
                    function: 'text-purple-400',
                    route: 'text-rose-400',
                    db_operation: 'text-amber-400',
                    component: 'text-indigo-400',
                    data: 'text-cyan-400',
                    response: 'text-blue-400'
                  }[child.type] || 'text-slate-400';

                  const badgeLetter = {
                    function: 'ƒ',
                    route: '◎',
                    db_operation: '◉',
                    component: '⚛',
                    data: '▣',
                    response: '▣'
                  }[child.type] || '•';

                  return (
                    <div
                      key={child.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectNode(child);
                      }}
                      style={{ paddingLeft: `${(depth + 1) * 12 + 16}px` }}
                      className={`flex items-center gap-1.5 py-0.5 px-2 rounded cursor-pointer text-[11px] font-mono transition-colors ${
                        isChildSelected
                          ? 'bg-purple-500/20 text-purple-300 font-bold border-l-2 border-purple-400'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                      }`}
                    >
                      <span className={`text-[10px] ${iconColor} shrink-0 font-bold`}>{badgeLetter}</span>
                      <span className="truncate">{child.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      }

      return null;
    });
  };

  return (
    <aside className="w-72 sm:w-80 max-w-[85vw] h-full bg-[#0b0f19] border-r border-slate-800/80 flex flex-col z-20 shrink-0 select-none safe-pb">
      {/* Header */}
      <div className="p-3 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers size={15} className="text-sky-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Repository Explorer
          </span>
        </div>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
          {graphData.nodes.filter((n) => n.type === 'file').length} files
        </span>
      </div>

      {/* Search Filter */}
      <div className="p-2 border-b border-slate-800/60">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files, functions..."
            className="w-full bg-slate-900/80 text-[11px] text-slate-200 pl-7 pr-2 py-1.5 rounded-md border border-slate-800 focus:border-sky-500 outline-none transition-all placeholder:text-slate-500 font-mono"
          />
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin">
        {renderTree(tree)}
      </div>

      {/* Project README & Guide Quick Button */}
      {onOpenReadme && (
        <div className="p-2 border-t border-slate-800/80 bg-slate-950/60 shrink-0">
          <button
            onClick={onOpenReadme}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 hover:text-sky-200 border border-sky-500/30 text-xs font-semibold transition-all cursor-pointer shadow-sm group"
            title="View & Download Plain English Project README"
          >
            <FileText size={13} className="text-sky-400 group-hover:scale-110 transition-transform" />
            <span>Project README & Guide</span>
          </button>
        </div>
      )}
    </aside>
  );
}

