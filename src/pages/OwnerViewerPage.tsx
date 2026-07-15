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
              className={`flex items-center gap-1.5 py-1 px-2 rounded-md cursor-pointer hover:bg-gray-100 text-sm ${currentFilePath === node.path ? 'bg-gray-100 text-blue-600 font-medium' : 'text-gray-700'}`}
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
              onClick={() => node.type === 'tree' ? handleFolderClick(node, nodes) : handleFileClick(node)}
            >
              {node.type === 'tree' ? (
                <>
                  {node.isOpen ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
                  <Folder className="h-4 w-4 text-blue-400 fill-blue-100" />
                </>
              ) : (
                <>
                  <span className="w-3.5" /> {/* Spacer for alignment */}
                  <FileIcon className="h-4 w-4 text-gray-400" />
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="h-14 border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 bg-gray-50 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors mr-2 border border-gray-300 bg-white rounded-md px-2.5 py-1.5 shadow-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </button>
          <div className="flex items-center gap-2 text-gray-900 font-semibold">
            <Github className="h-5 w-5" />
            {repoInfo?.name || 'Repository'}
          </div>
          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> Owner View
          </span>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar Tree */}
        <aside className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col shrink-0 overflow-hidden hidden md:flex">
          <div className="p-3 border-b border-gray-200 font-medium text-sm text-gray-700 flex items-center gap-2">
            <Folder className="h-4 w-4" /> Files
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {renderTree(fileTree)}
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white">
          {currentView === 'overview' ? (
            <div className="flex-1 overflow-y-auto p-6 lg:p-10">
              <div className="max-w-4xl mx-auto">
                <div className="mb-8 pb-6 border-b border-gray-200">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{repoInfo?.name}</h1>
                  {repoInfo?.description && (
                    <p className="text-lg text-gray-600">{repoInfo.description}</p>
                  )}
                </div>
                
                <div className="prose prose-blue max-w-none prose-pre:p-0 prose-pre:bg-transparent">
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
                              customStyle={{ borderRadius: '0.5rem', fontSize: '0.875rem' }}
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
                    <div className="text-center py-12 text-gray-500 italic border-2 border-dashed border-gray-200 rounded-lg">
                      No README.md found in the root directory.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* File Header */}
              <div className="h-12 border-b border-gray-200 flex items-center px-4 gap-4 bg-gray-50 shrink-0">
                <button 
                  onClick={() => { setCurrentView('overview'); setCurrentFilePath(null); }}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Overview
                </button>
                <div className="h-4 w-px bg-gray-300"></div>
                <div className="text-sm font-mono text-gray-600 truncate flex-1">
                  {currentFilePath}
                </div>
              </div>
              
              {/* Code Viewer */}
              <div className="flex-1 overflow-auto bg-[#1e1e1e]">
                {fileLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <SyntaxHighlighter
                    language={currentFilePath ? getLanguageFromPath(currentFilePath) : 'text'}
                    style={vscDarkPlus}
                    customStyle={{ margin: 0, minHeight: '100%', borderRadius: 0, fontSize: '14px' }}
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
