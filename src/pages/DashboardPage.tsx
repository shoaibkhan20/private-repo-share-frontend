import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  LogOut, RefreshCw, Link as LinkIcon, Trash2,
  Copy, Plus, X, Github, Book, Clock, Loader2,
  ChevronDown, ChevronUp, Info
} from 'lucide-react';

interface UserProfile {
  name: string;
  avatar_url: string;
  email?: string;
  github_username?: string;
}

interface Repository {
  id: number;
  github_repo_id: number;
  name: string;
  full_name: string;
  description: string;
  is_private: boolean;
  default_branch: string;
  synced_at: string | null;
}

interface ShareLink {
  id: number;
  repo_id: number;
  repo_name: string;
  slug: string;
  allowed_emails: string[] | null;
  expires_at: string | null;
  is_active: boolean;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const cached = localStorage.getItem('owner_user');
    try {
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [repos, setRepos] = useState<Repository[]>([]);
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedRepoId, setExpandedRepoId] = useState<number | null>(null);

  // Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [emails, setEmails] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [generatedSlug, setGeneratedSlug] = useState<string | null>(null);

  const fetchData = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);

      const [profileRes, reposRes, linksRes] = await Promise.all([
        api.get('/auth/me'),
        api.get(`/repos${refresh ? '?refresh=true' : ''}`),
        api.get('/share-links')
      ]);

      const userProfile = profileRes.data.user || profileRes.data;
      setProfile(userProfile);
      localStorage.setItem('owner_user', JSON.stringify(userProfile));
      setRepos(reposRes.data.data || reposRes.data); // Adjust based on actual API response structure
      setLinks(linksRes.data.data || linksRes.data);
    } catch (error: any) {
      if (error.response?.status === 401) {
        localStorage.removeItem('owner_token');
        navigate('/');
      } else {
        toast.error('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const hasFetched = useRef(false);
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchData();
  }, []);

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRepo(null);
    setEmails('');
    setExpiresAt('');
    setGeneratedSlug(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('owner_token');
    localStorage.removeItem('owner_user');
    localStorage.removeItem('visitor_token');
    navigate('/');
  };

  const handleGenerateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepo) return;

    try {
      setGenerating(true);
      const emailList = emails.split(',').map(e => e.trim()).filter(e => e);

      const payload = {
        repo_id: selectedRepo.id,
        allowed_emails: emailList.length > 0 ? emailList : null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null
      };

      const { data } = await api.post('/share-links', payload);
      const newLink = data.data || data; // Unwrap Laravel resource wrapper
      setLinks([newLink, ...links]);

      // Auto copy to clipboard
      const shareUrl = `${window.location.origin}/s/${newLink.slug}`;
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Share link generated and copied to clipboard!');
      } catch (err) {
        toast.success('Share link generated successfully!');
      }

      setGeneratedSlug(newLink.slug);
      setEmails('');
      setExpiresAt('');
    } catch (error) {
      toast.error('Failed to generate link');
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (id: number) => {
    if (!confirm('Are you sure you want to revoke this link?')) return;

    try {
      await api.delete(`/share-links/${id}`);
      setLinks(links.filter(l => l.id !== id));
      toast.success('Link revoked');
    } catch (error) {
      toast.error('Failed to revoke link');
    }
  };

  const copyToClipboard = (slug: string) => {
    const url = `${window.location.origin}/s/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 relative overflow-hidden bg-grid-pattern">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mb-4" />
        <p className="text-zinc-400 font-medium tracking-wide">Loading workspace...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col relative overflow-hidden bg-grid-pattern">
      {/* Header */}
      <header className="bg-zinc-950/70 backdrop-blur-md border-b border-zinc-800/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-tr from-indigo-500 to-violet-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
              <Github className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-zinc-100 to-indigo-200 bg-clip-text text-transparent">
              Private Repo Share
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {profile && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 transition-all focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="true"
                >
                  <img src={profile.avatar_url} alt={profile.name} className="h-7 w-7 rounded-lg border border-zinc-800" />
                  <span className="text-xs text-zinc-300 font-medium hidden sm:block max-w-[100px] truncate">{profile.name}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-zinc-400 hidden sm:block" />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-2xl bg-zinc-900 border border-zinc-800 divide-y divide-zinc-800/80 focus:outline-none z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3.5">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Signed in as</p>
                      <p className="text-sm font-bold text-zinc-100 truncate mt-0.5">{profile.name}</p>
                      {profile.github_username && (
                        <p className="text-xs text-indigo-400 flex items-center gap-1 mt-1.5 font-mono bg-indigo-950/40 border border-indigo-900/50 px-2 py-0.5 rounded-lg w-fit">
                          <Github className="h-3 w-3" />
                          {profile.github_username}
                        </p>
                      )}
                      {profile.email && (
                        <p className="text-xs text-zinc-400 truncate mt-2 font-mono">{profile.email}</p>
                      )}
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-colors text-left font-medium"
                      >
                        <LogOut className="h-4 w-4" />
                        Log out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10 w-full">
        {/* Repositories Section */}
        <section className="glass-card rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
          <div className="p-4 border-b border-zinc-850 flex items-center justify-between bg-zinc-900/30">
            <h2 className="text-md font-semibold text-zinc-100 flex items-center gap-2">
              <Book className="h-4.5 w-4.5 text-indigo-400" />
              Private Repositories
            </h2>
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-zinc-100 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 px-3 py-2 rounded-lg shadow-sm transition-all disabled:opacity-50 font-medium active:scale-95"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          <div className="overflow-y-auto p-4 flex-1 space-y-3">
            {repos.length === 0 ? (
              <p className="text-zinc-500 text-center py-8 text-sm">No private repositories found.</p>
            ) : (
              <ul className="space-y-3">
                {repos.map(repo => {
                  const isExpanded = expandedRepoId === repo.id;
                  return (
                    <li key={repo.id} className="border border-zinc-850 rounded-xl p-4 hover:border-zinc-700/80 bg-zinc-900/20 hover:bg-zinc-900/40 transition-all duration-300">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-zinc-100 truncate text-sm" title={repo.name || repo.full_name}>
                            {repo.name || repo.full_name}
                          </h3>
                          <p className="text-xs text-zinc-500 mt-0.5 truncate font-mono">{repo.full_name}</p>
                          <p className="text-xs text-zinc-400 mt-2 line-clamp-2" title={repo.description}>
                            {repo.description || 'No description'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-4">
                          <button
                            type="button"
                            onClick={() => setExpandedRepoId(isExpanded ? null : repo.id)}
                            className={`flex items-center justify-center p-2 rounded-lg transition-all ${isExpanded ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'}`}
                            title="Toggle Repository Details"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setSelectedRepo(repo); setIsModalOpen(true); }}
                            className="btn-glow flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all duration-300"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Share
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-zinc-800/80 grid grid-cols-2 gap-y-3 gap-x-4 text-xs text-zinc-300 bg-zinc-950/40 p-3 rounded-lg border border-zinc-900">
                          <div>
                            <span className="font-medium block text-zinc-500">Default Branch</span>
                            <span className="font-mono text-zinc-200">{repo.default_branch || 'main'}</span>
                          </div>
                          <div>
                            <span className="font-medium block text-zinc-500">Visibility</span>
                            <span className="px-2 py-0.5 inline-flex text-[10px] leading-5 font-semibold rounded-full bg-red-950/40 text-red-400 border border-red-900/50">
                              {repo.is_private ? 'Private' : 'Public'}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium block text-zinc-500">GitHub Repo ID</span>
                            <span className="font-mono text-zinc-200">{repo.github_repo_id}</span>
                          </div>
                          {repo.synced_at && (
                            <div>
                              <span className="font-medium block text-zinc-500">Synced At</span>
                              <span className="text-zinc-200">{format(new Date(repo.synced_at), 'MMM d, yyyy h:mm a')}</span>
                            </div>
                          )}
                          <div className="col-span-2 mt-2 pt-3 border-t border-zinc-800/50 flex justify-end">
                            <button
                              type="button"
                              onClick={() => navigate(`/repos/${repo.id}/view`)}
                              className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-200 px-3 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all"
                            >
                              <Book className="h-3.5 w-3.5 text-indigo-400" />
                              Browse Files & Code
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Active Links Section */}
        <section className="glass-card rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
          <div className="p-4 border-b border-zinc-850 bg-zinc-900/30">
            <h2 className="text-md font-semibold text-zinc-100 flex items-center gap-2">
              <LinkIcon className="h-4.5 w-4.5 text-indigo-400" />
              Active Share Links
            </h2>
          </div>
          <div className="overflow-y-auto p-4 flex-1">
            {links.length === 0 ? (
              <p className="text-zinc-500 text-center py-8 text-sm">No active share links.</p>
            ) : (
              <ul className="space-y-4">
                {links.map(link => (
                  <li key={link.id} className="border border-zinc-850 rounded-xl p-4 bg-zinc-900/20 hover:border-zinc-700/80 transition-all duration-300">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-zinc-100 text-sm">{link.repo_name}</h3>
                        <div className="flex items-center gap-3 mt-1.5 text-xs">
                          {link.expires_at ? (
                            <span className="flex items-center gap-1 text-zinc-400 font-mono">
                              <Clock className="h-3.5 w-3.5 text-zinc-500" />
                              Expires: {format(new Date(link.expires_at), 'MMM d, yyyy')}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-zinc-400 font-mono">
                              <Clock className="h-3.5 w-3.5 text-zinc-500" />
                              Never expires
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${link.is_active ? 'bg-green-950/40 text-green-400 border-green-900/50' : 'bg-red-950/40 text-red-400 border-red-900/50'}`}>
                            {link.is_active ? 'Active' : 'Expired'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRevoke(link.id)}
                        className="text-zinc-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-950/30 border border-transparent hover:border-red-900/30 transition-all"
                        title="Revoke Link"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {link.allowed_emails && link.allowed_emails.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1">Restricted to:</p>
                        <div className="flex flex-wrap gap-1">
                          {link.allowed_emails.map((email, idx) => (
                            <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-950 text-zinc-300 border border-zinc-850">
                              {email}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-3.5">
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}/s/${link.slug}`}
                        className="block w-full text-xs font-mono rounded-lg bg-zinc-950/50 border border-zinc-800 text-zinc-450 px-3 py-2 focus:ring-0 focus:border-zinc-800 cursor-default"
                      />
                      <button
                        onClick={() => copyToClipboard(link.slug)}
                        className="flex items-center gap-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-200 px-3.5 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all shrink-0 active:scale-95"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>

      {/* Generate Link Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-black/60 backdrop-blur-sm" onClick={closeModal} />

            <div className="relative inline-block w-full max-w-md p-6 overflow-hidden text-left align-middle transition-all transform bg-zinc-900 border border-zinc-800 shadow-2xl rounded-2xl text-zinc-100">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-bold leading-6 text-zinc-100 bg-gradient-to-r from-zinc-100 to-indigo-200 bg-clip-text text-transparent">
                  {generatedSlug ? 'Link Generated!' : 'Share Repository'}
                </h3>
                <button onClick={closeModal} className="text-zinc-400 hover:text-zinc-200 transition-colors p-1 hover:bg-zinc-800 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-5 p-3.5 bg-zinc-950/60 rounded-xl border border-zinc-850">
                <p className="text-sm font-semibold text-zinc-200">{selectedRepo?.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5 font-mono">{selectedRepo?.full_name}</p>
              </div>

              {generatedSlug ? (
                <div className="space-y-4">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Your secure repository sharing link is ready. Anyone who has this link will need to verify their email via OTP before viewing.
                  </p>
                  <div className="flex items-center gap-2 mt-2 bg-zinc-950 p-2 border border-zinc-800 rounded-lg">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/s/${generatedSlug}`}
                      className="block w-full text-xs font-mono border-0 bg-transparent p-1 text-zinc-300 focus:ring-0"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/s/${generatedSlug}`);
                        toast.success('Link copied to clipboard!');
                      }}
                      className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all shrink-0 active:scale-95"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </button>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md transition-all active:scale-95"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleGenerateLink} className="space-y-5">
                  <div>
                    <label htmlFor="emails" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Allowed Emails
                    </label>
                    <p className="text-[10px] text-zinc-500 mb-1.5">Comma-separated list of email addresses.</p>
                    <input
                      type="text"
                      id="emails"
                      required
                      value={emails}
                      onChange={(e) => setEmails(e.target.value)}
                      placeholder="user1@example.com, user2@example.com"
                      className="glass-input block w-full p-2.5 text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="expires" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                      Expiry Date (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      id="expires"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="glass-input block w-full p-2.5 text-sm color-scheme-dark"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>

                  <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-zinc-800/80">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 text-xs font-semibold text-zinc-300 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 rounded-lg transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={generating}
                      className="inline-flex justify-center items-center px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md disabled:opacity-70 transition-all active:scale-95"
                    >
                      {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : null}
                      Generate Link
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
