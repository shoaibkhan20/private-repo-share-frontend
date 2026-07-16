import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Folder, File as FileIcon, ChevronRight, ChevronDown,
  Loader2, ArrowLeft, ShieldCheck, Github
} from 'lucide-react';
import toast from 'react-hot-toast';

// Types
interface RepoNode {
  path: string;
  type: 'blob' | 'tree';
  sha: string;
  name: string;
  children?: RepoNode[];
  isOpen?: boolean;
}

export default function OwnerViewerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [repoInfo, setRepoInfo] = useState<{ name: string; description: string } | null>(null);
  const [fileTree, setFileTree] = useState<RepoNode[]>([]);
  const [readmeContent, setReadmeContent] = useState<string | null>(null);

  // View State
  const [currentView, setCurrentView] = useState<'overview' | 'file'>('overview');
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [fileLoading, setFileLoading] = useState(false);
  const [loadingFolders, setLoadingFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!id) return;

    const controller = new AbortController();

    const fetchOverview = async () => {
      try {
        const { data } = await api.get(`/repos/${id}/view?type=overview`, {
          signal: controller.signal,
        });
        setRepoInfo({ name: data.repo.full_name, description: data.repo.description });
        setReadmeContent(data.readme ? data.readme.content : null);

        // Format root tree
        const rootNodes: RepoNode[] = data.contents.map((item: any) => ({
          path: item.path,
          type: item.type === 'dir' ? 'tree' : 'blob',
          sha: item.sha,
          name: item.name,
        }));

        // Sort: folders first, then files
        rootNodes.sort((a, b) => {
          if (a.type === b.type) return a.name.localeCompare(b.name);
          return a.type === 'tree' ? -1 : 1;
        });

        setFileTree(rootNodes);
      } catch (error: any) {
        if (error?.name === 'CanceledError' || controller.signal.aborted) return;
        if (error.response?.status === 401 || error.response?.status === 403) {
          toast.error('Session expired or unauthorized');
          navigate('/');
        } else {
          toast.error('Failed to load repository overview');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchOverview();

    return () => {
      controller.abort();
    };
  }, [id]);

  const handleFolderClick = async (node: RepoNode, pathArray: RepoNode[]) => {
    // Toggle logic
    const toggleNode = (nodes: RepoNode[]): RepoNode[] => {
      return nodes.map(n => {
        if (n.path === node.path) {
          return { ...n, isOpen: !n.isOpen };
        }
        if (n.children) {
          return { ...n, children: toggleNode(n.children) };
        }
        return n;
      });
    };

    // If already has children, just toggle
    if (node.children) {
      setFileTree(toggleNode(fileTree));
      return;
    }

    // Otherwise fetch children
    setLoadingFolders(prev => new Set(prev).add(node.path));
    try {
      const { data } = await api.get(`/repos/${id}/view?type=tree&path=${encodeURIComponent(node.path)}`);

      const newChildren: RepoNode[] = data.contents.map((item: any) => ({
        path: item.path,
        type: item.type === 'dir' ? 'tree' : 'blob',
        sha: item.sha,
        name: item.name,
      })).sort((a: RepoNode, b: RepoNode) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'tree' ? -1 : 1;
      });

      const appendChildren = (nodes: RepoNode[]): RepoNode[] => {
        return nodes.map(n => {
          if (n.path === node.path) {
            return { ...n, children: newChildren, isOpen: true };
          }
          if (n.children) {
            return { ...n, children: appendChildren(n.children) };
          }
          return n;
        });
      };

      setFileTree(appendChildren(fileTree));
    } catch (error) {
      toast.error('Failed to load folder contents');
    } finally {
      setLoadingFolders(prev => {
        const next = new Set(prev);
        next.delete(node.path);
        return next;
      });
    }
  };

  const handleFileClick = async (node: RepoNode) => {
    try {
      setFileLoading(true);
      setCurrentView('file');
      setCurrentFilePath(node.path);

      const { data } = await api.get(`/repos/${id}/view?type=file&path=${encodeURIComponent(node.path)}`);
      setFileContent(data.file.content);
    } catch (error) {
      toast.error('Failed to load file content');
      setCurrentView('overview');
    } finally {
      setFileLoading(false);
    }
  };

  const renderTree = (nodes: RepoNode[], depth = 0) => {
    return (
      <ul className="space-y-0.5">
        {nodes.map(node => {
          const isActive = currentFilePath === node.path;
          return (
            <li key={node.path}>
              <div
                className={`flex items-center gap-2 py-1.5 px-3 rounded-lg cursor-pointer transition-all text-sm group ${isActive ? 'bg-modernGray-900 text-white shadow-sm' : 'text-modernGray-600 hover:bg-silver-100 hover:text-modernGray-900'}`}
                style={{ paddingLeft: `${depth * 12 + 12}px` }}
                onClick={() => node.type === 'tree' ? handleFolderClick(node, nodes) : handleFileClick(node)}
              >
                <div className="flex items-center justify-center w-4">
                  {node.type === 'tree' ? (
                    loadingFolders.has(node.path) ? (
                      <Loader2 className={`h-3.5 w-3.5 animate-spin ${isActive ? 'text-white' : 'text-silver-400'}`} />
                    ) : node.isOpen ? (
                      <ChevronDown className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-silver-400 group-hover:text-modernGray-500'}`} />
                    ) : (
                      <ChevronRight className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-silver-400 group-hover:text-modernGray-500'}`} />
                    )
                  ) : (
                    <FileIcon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-silver-400 group-hover:text-modernGray-500'}`} />
                  )}
                </div>
                {node.type === 'tree' && (
                  <Folder className={`h-4 w-4 ${isActive ? 'text-white/80' : 'text-silver-400 group-hover:text-modernGray-500'}`} />
                )}
                <span className="truncate font-medium">{node.name}</span>
              </div>
              {node.type === 'tree' && node.isOpen && node.children && (
                renderTree(node.children, depth + 1)
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  const getLanguageFromPath = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
      js: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx',
      py: 'python', rb: 'ruby', php: 'php', html: 'html', css: 'css',
      json: 'json', md: 'markdown', yml: 'yaml', yaml: 'yaml',
      go: 'go', rs: 'rust', java: 'java', c: 'c', cpp: 'cpp'
    };
    return map[ext || ''] || 'text';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-silver-50">
        <Loader2 className="h-10 w-10 animate-spin text-modernGray-900 mb-4" />
        <p className="text-silver-500 font-bold uppercase tracking-widest text-xs">Loading Repository...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="h-20 glass-bg border-b border-silver-200/50 flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="modern-button-secondary h-10 px-4 text-xs font-bold shadow-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Dashboard
          </button>
          <div className="h-8 w-px bg-silver-200 hidden sm:block"></div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-modernGray-900 rounded-xl flex items-center justify-center shadow-md">
              <Github className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-modernGray-900 tracking-tight leading-none">
                  {repoInfo?.name || 'Repository'}
                </h1>
                <span className="px-2 py-0.5 rounded-lg bg-modernGray-100 text-modernGray-500 text-[10px] font-bold uppercase tracking-widest border border-silver-200">
                  <ShieldCheck className="h-3 w-3 inline mr-1" /> Owner View
                </span>
              </div>
              <p className="text-[10px] text-silver-400 font-bold uppercase tracking-widest mt-1">Private Content Explorer</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">

        {/* Sidebar Tree */}
        <aside className="w-72 border-r border-silver-200 bg-silver-50/30 flex flex-col shrink-0 overflow-hidden hidden md:flex">
          <div className="p-4 border-b border-silver-200 flex items-center justify-between bg-white/50">
             <div className="flex items-center gap-2 font-bold text-[10px] text-silver-400 uppercase tracking-widest">
               <Folder className="h-3.5 w-3.5" /> Explorer
             </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
            {renderTree(fileTree)}
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white">
          {currentView === 'overview' ? (
            <div className="flex-1 overflow-y-auto p-8 lg:p-12 custom-scrollbar bg-silver-50/10">
              <div className="max-w-4xl mx-auto">
                <div className="mb-10 pb-8 border-b border-silver-200">
                  <h1 className="text-4xl font-extrabold text-modernGray-900 mb-4 tracking-tight">{repoInfo?.name}</h1>
                  {repoInfo?.description && (
                    <p className="text-xl text-modernGray-500 leading-relaxed font-medium">{repoInfo.description}</p>
                  )}
                </div>

                <div className="prose prose-silver max-w-none prose-pre:p-0 prose-pre:bg-transparent">
                  {readmeContent ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ node, className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || '');
                          const inline = !match && !String(children).includes('\n');
                          return !inline ? (
                            <SyntaxHighlighter
                              style={vscDarkPlus}
                              language={match ? match[1] : 'text'}
                              PreTag="div"
                              customStyle={{ borderRadius: '1rem', fontSize: '0.875rem', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          ) : (
                            <code className="bg-silver-100 text-modernGray-800 px-1.5 py-0.5 rounded-md font-mono text-sm" {...props}>{children}</code>
                          );
                        }
                      }}
                    >{readmeContent}</ReactMarkdown>
                  ) : (
                    <div className="text-center py-20 bg-white border-2 border-dashed border-silver-200 rounded-3xl">
                      <FileIcon className="h-10 w-10 text-silver-200 mx-auto mb-4" />
                      <p className="text-silver-400 italic font-medium">No README.md found in the root directory.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden bg-[#1e1e1e]">
              {/* File Header */}
              <div className="h-14 border-b border-white/5 flex items-center px-6 gap-6 bg-[#1a1a1a] shrink-0">
                <button
                  onClick={() => { setCurrentView('overview'); setCurrentFilePath(null); }}
                  className="flex items-center gap-2 text-xs font-bold text-silver-400 hover:text-white transition-colors uppercase tracking-widest"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <div className="h-5 w-px bg-white/10"></div>
                <div className="text-xs font-mono text-silver-300 truncate flex-1 tracking-tight">
                  <span className="text-silver-500 font-bold mr-2 uppercase text-[10px]">Path</span>
                  {currentFilePath}
                </div>
              </div>

              {/* Code Viewer */}
              <div className="flex-1 overflow-auto custom-scrollbar">
                {fileLoading ? (
                  <div className="h-full flex flex-col items-center justify-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-silver-600" />
                    <p className="text-silver-600 text-[10px] font-bold uppercase tracking-widest">Fetching Content...</p>
                  </div>
                ) : (
                  <SyntaxHighlighter
                    language={currentFilePath ? getLanguageFromPath(currentFilePath) : 'text'}
                    style={vscDarkPlus}
                    customStyle={{ margin: 0, minHeight: '100%', borderRadius: 0, fontSize: '14px', background: 'transparent' }}
                    showLineNumbers={true}
                    lineNumberStyle={{ color: 'rgba(255,255,255,0.2)', paddingRight: '1.5rem' }}
                  >
                    {fileContent}
                  </SyntaxHighlighter>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
