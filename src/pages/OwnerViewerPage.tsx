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
      <ul className="space-y-1">
        {nodes.map(node => (
          <li key={node.path}>
            <div 
              className={`flex items-center gap-2 py-1.5 px-2.5 rounded-lg cursor-pointer transition-all text-xs font-medium ${
                currentFilePath === node.path 
                  ? 'bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 font-semibold shadow-sm shadow-indigo-500/5' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 border border-transparent'
              }`}
              style={{ paddingLeft: `${depth * 12 + 10}px` }}
              onClick={() => node.type === 'tree' ? handleFolderClick(node, nodes) : handleFileClick(node)}
            >
              {node.type === 'tree' ? (
                <>
                  {node.isOpen ? <ChevronDown className="h-3.5 w-3.5 text-zinc-500" /> : <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />}
                  <Folder className="h-4 w-4 text-indigo-400 fill-indigo-950/40" />
                </>
              ) : (
                <>
                  <span className="w-3.5" /> {/* Spacer for alignment */}
                  <FileIcon className={`h-4 w-4 ${currentFilePath === node.path ? 'text-indigo-400' : 'text-zinc-500'}`} />
                </>
              )}
              <span className="truncate">{node.name}</span>
            </div>
            {node.type === 'tree' && node.isOpen && node.children && (
              renderTree(node.children, depth + 1)
            )}
          </li>
        ))}
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 relative overflow-hidden bg-grid-pattern">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mb-4" />
        <p className="text-zinc-400 font-medium tracking-wide">Loading repository...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 relative overflow-hidden bg-grid-pattern">
      {/* Decorative background overlay */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="h-14 border-b border-zinc-850 flex items-center justify-between px-4 sm:px-6 bg-zinc-950/80 backdrop-blur-md shrink-0 relative z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-zinc-100 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-lg px-3 py-1.5 shadow-sm font-semibold transition-all active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
          </button>
          <div className="h-4 w-px bg-zinc-800"></div>
          <div className="flex items-center gap-2 text-zinc-100 font-bold text-sm">
            <Github className="h-4 w-4 text-zinc-400" />
            {repoInfo?.name || 'Repository'}
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-950/50 border border-indigo-900/40 text-indigo-400 text-[10px] font-semibold flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> Owner View
          </span>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {/* Sidebar Tree */}
        <aside className="w-64 border-r border-zinc-850 bg-zinc-900/10 flex flex-col shrink-0 overflow-hidden hidden md:flex backdrop-blur-sm">
          <div className="p-3 border-b border-zinc-850 font-semibold text-xs tracking-wider uppercase text-zinc-400 flex items-center gap-2">
            <Folder className="h-3.5 w-3.5 text-indigo-400" /> Files
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {renderTree(fileTree)}
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-950/20 backdrop-blur-sm">
          {currentView === 'overview' ? (
            <div className="flex-1 overflow-y-auto p-6 lg:p-10">
              <div className="max-w-4xl mx-auto">
                <div className="mb-8 pb-6 border-b border-zinc-850">
                  <h1 className="text-3xl font-extrabold text-zinc-100 tracking-tight mb-2">{repoInfo?.name}</h1>
                  {repoInfo?.description && (
                    <p className="text-base text-zinc-400 leading-relaxed">{repoInfo.description}</p>
                  )}
                </div>
                
                <div className="prose prose-invert max-w-none prose-pre:p-0 prose-pre:bg-transparent prose-headings:text-zinc-100 prose-a:text-indigo-400 hover:prose-a:text-indigo-300">
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
                              customStyle={{ borderRadius: '0.75rem', fontSize: '0.875rem', border: '1px solid #27272a', background: '#09090b', padding: '1.25rem' }}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          ) : (
                            <code className={className} {...props}>{children}</code>
                          );
                        }
                      }}
                    >{readmeContent}</ReactMarkdown>
                  ) : (
                    <div className="text-center py-16 text-zinc-500 italic border-2 border-dashed border-zinc-800/80 bg-zinc-900/10 rounded-2xl max-w-lg mx-auto">
                      No README.md found in the root directory.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* File Header */}
              <div className="h-12 border-b border-zinc-850 flex items-center px-4 gap-4 bg-zinc-900/30 shrink-0">
                <button 
                  onClick={() => { setCurrentView('overview'); setCurrentFilePath(null); }}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors font-semibold"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Overview
                </button>
                <div className="h-4 w-px bg-zinc-800"></div>
                <div className="text-xs font-mono text-zinc-400 truncate flex-1">
                  {currentFilePath}
                </div>
              </div>
              
              {/* Code Viewer */}
              <div className="flex-1 overflow-auto bg-[#09090b] border-t border-zinc-900">
                {fileLoading ? (
                  <div className="h-full flex items-center justify-center bg-zinc-950">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                  </div>
                ) : (
                  <SyntaxHighlighter
                    language={currentFilePath ? getLanguageFromPath(currentFilePath) : 'text'}
                    style={vscDarkPlus}
                    customStyle={{ margin: 0, minHeight: '100%', borderRadius: 0, fontSize: '13px', background: '#09090b' }}
                    showLineNumbers={true}
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
