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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-silver-50 to-modernGray-100 pb-12">
      {/* Header */}
      <header className="glass-bg border-b border-silver-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-modernGray-900 rounded-xl flex items-center justify-center shadow-md shadow-modernGray-900/20">
              <Github className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-modernGray-900 tracking-tight">Private Repo Share</h1>
              <p className="text-[10px] font-bold text-silver-400 uppercase tracking-widest leading-none mt-0.5">Management Console</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {profile && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2.5 p-1.5 pl-3 rounded-2xl border border-silver-200 bg-white/50 hover:bg-white hover:border-silver-300 transition-all focus:outline-none"
                  aria-expanded={isDropdownOpen}
                >
                  <div className="hidden sm:block text-right">
                    <p className="text-xs font-bold text-modernGray-900 truncate max-w-[120px]">{profile.name}</p>
                    <p className="text-[10px] text-silver-500 font-medium">Owner</p>
                  </div>
                  <img src={profile.avatar_url} alt={profile.name} className="h-9 w-9 rounded-xl border border-silver-100 shadow-sm" />
                  <ChevronDown className={`h-4 w-4 text-silver-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-64 rounded-2xl shadow-xl bg-white ring-1 ring-black ring-opacity-5 divide-y divide-silver-100 focus:outline-none z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-5 py-4">
                      <p className="text-[10px] font-bold text-silver-400 uppercase tracking-widest mb-2">Account</p>
                      <p className="text-sm font-bold text-modernGray-900 truncate">{profile.name}</p>
                      {profile.github_username && (
                        <p className="text-xs text-modernGray-500 flex items-center gap-1.5 mt-1 font-medium italic">
                          @{profile.github_username}
                        </p>
                      )}
                      {profile.email && (
                        <p className="text-xs text-silver-500 truncate mt-1">{profile.email}</p>
                      )}
                    </div>
                    <div className="py-2">
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-3 px-5 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors text-left"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Repositories Section */}
        <section className="lg:col-span-7 flex flex-col h-[calc(100vh-12rem)]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-silver-100 flex items-center justify-center border border-silver-200">
                <Book className="h-4 w-4 text-modernGray-600" />
              </div>
              <h2 className="text-lg font-bold text-modernGray-900 tracking-tight">Your Repositories</h2>
              <span className="bg-silver-200 text-silver-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{repos.length}</span>
            </div>
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 text-xs font-bold text-silver-500 hover:text-modernGray-900 bg-white border border-silver-200 px-3 py-2 rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
            {repos.length === 0 ? (
              <div className="premium-card p-12 rounded-3xl text-center">
                <div className="h-12 w-12 bg-silver-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-silver-200">
                  <Book className="h-6 w-6 text-silver-400" />
                </div>
                <h3 className="text-modernGray-900 font-bold">No Repositories Found</h3>
                <p className="text-silver-500 text-sm mt-1">Check your GitHub permissions or try refreshing.</p>
              </div>
            ) : (
              repos.map(repo => {
                const isExpanded = expandedRepoId === repo.id;
                return (
                  <div key={repo.id} className={`premium-card rounded-2xl overflow-hidden transition-all duration-300 ${isExpanded ? 'ring-2 ring-modernGray-900/5 shadow-md' : ''}`}>
                    <div className="p-5">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-modernGray-900 truncate text-base leading-tight">
                              {repo.name || repo.full_name}
                            </h3>
                            {repo.is_private && (
                              <span className="px-1.5 py-0.5 rounded-md bg-silver-100 text-silver-500 text-[9px] font-bold uppercase tracking-wider border border-silver-200">
                                Private
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-silver-400 font-medium truncate mb-2">{repo.full_name}</p>
                          <p className="text-sm text-modernGray-500 line-clamp-1 italic" title={repo.description}>
                            {repo.description || 'No description provided.'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setExpandedRepoId(isExpanded ? null : repo.id)}
                            className={`flex items-center justify-center h-9 w-9 rounded-xl border transition-all ${isExpanded ? 'bg-modernGray-900 border-modernGray-900 text-white shadow-lg shadow-modernGray-900/20' : 'bg-white border-silver-200 text-silver-400 hover:text-modernGray-900 hover:border-silver-300'}`}
                          >
                            <Info className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => { setSelectedRepo(repo); setIsModalOpen(true); }}
                            className="modern-button-primary h-9 px-4 text-xs shadow-md shadow-modernGray-900/10"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                            Share
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-5 pt-5 border-t border-silver-100 grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                          <div className="bg-silver-50/50 p-3 rounded-xl border border-silver-100">
                            <span className="text-[10px] font-bold text-silver-400 uppercase tracking-widest block mb-1">Default Branch</span>
                            <span className="text-xs font-bold text-modernGray-700 flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-silver-400"></span>
                              {repo.default_branch || 'main'}
                            </span>
                          </div>
                          <div className="bg-silver-50/50 p-3 rounded-xl border border-silver-100">
                            <span className="text-[10px] font-bold text-silver-400 uppercase tracking-widest block mb-1">Visibility</span>
                            <span className="text-xs font-bold text-modernGray-700 flex items-center gap-1.5">
                               <Shield className="h-3 w-3 text-red-400" />
                               {repo.is_private ? 'Private Repository' : 'Public Repository'}
                            </span>
                          </div>
                          <div className="bg-silver-50/50 p-3 rounded-xl border border-silver-100 col-span-2 flex justify-between items-center">
                            <div>
                              <span className="text-[10px] font-bold text-silver-400 uppercase tracking-widest block mb-1">Last Synced</span>
                              <span className="text-xs font-medium text-modernGray-600 flex items-center gap-1.5">
                                <Clock className="h-3 w-3" />
                                {repo.synced_at ? format(new Date(repo.synced_at), 'MMM d, h:mm a') : 'Not synced'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => navigate(`/repos/${repo.id}/view`)}
                              className="modern-button-secondary h-8 px-3 text-[11px] font-bold rounded-lg"
                            >
                              <Book className="h-3.5 w-3.5 mr-1.5" />
                              Browse Files
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Active Links Section */}
        <section className="lg:col-span-5 flex flex-col h-[calc(100vh-12rem)]">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-8 w-8 rounded-lg bg-silver-100 flex items-center justify-center border border-silver-200">
              <LinkIcon className="h-4 w-4 text-modernGray-600" />
            </div>
            <h2 className="text-lg font-bold text-modernGray-900 tracking-tight">Active Share Links</h2>
            <span className="bg-silver-200 text-silver-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{links.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
            {links.length === 0 ? (
              <div className="premium-card p-10 rounded-3xl border-dashed bg-transparent border-silver-300 flex flex-col items-center justify-center">
                <p className="text-silver-400 text-sm font-medium italic">No active sharing links found.</p>
                <p className="text-xs text-silver-400 mt-1">Links you generate will appear here.</p>
              </div>
            ) : (
              links.map(link => (
                <div key={link.id} className="premium-card rounded-2xl p-5 border-l-4 border-l-modernGray-900 transition-all hover:shadow-md">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-modernGray-900 text-sm mb-1">{link.repo_name}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-[10px] font-bold uppercase tracking-wider text-silver-400">
                        {link.expires_at ? (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Expires: {format(new Date(link.expires_at), 'MMM d, yyyy')}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Permanent Access
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-md ${link.is_active ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                          {link.is_active ? 'Active' : 'Expired'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevoke(link.id)}
                      className="h-8 w-8 flex items-center justify-center rounded-lg text-silver-400 hover:text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
                      title="Revoke Link"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {link.allowed_emails && link.allowed_emails.length > 0 && (
                    <div className="mb-4 bg-silver-50/50 rounded-xl p-3 border border-silver-100">
                      <p className="text-[9px] font-bold text-silver-400 uppercase tracking-widest mb-2">Restricted To</p>
                      <div className="flex flex-wrap gap-1.5">
                        {link.allowed_emails.map((email, idx) => (
                          <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white border border-silver-200 text-modernGray-700 shadow-sm">
                            {email}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 group">
                    <div className="relative flex-1 group">
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}/s/${link.slug}`}
                        className="block w-full text-xs border border-silver-200 rounded-xl bg-silver-50 px-4 py-2.5 text-silver-500 font-medium group-hover:border-silver-300 transition-all focus:ring-0 focus:border-silver-200 outline-none truncate"
                      />
                    </div>
                    <button
                      onClick={() => copyToClipboard(link.slug)}
                      className="modern-button-secondary h-9 px-4 text-xs font-bold shadow-sm"
                    >
                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                      Copy
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Generate Link Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-modernGray-900/40 backdrop-blur-sm" onClick={closeModal} />

            <div className="relative inline-block w-full max-w-md p-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-2xl rounded-3xl border border-silver-100">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold leading-tight text-modernGray-900 tracking-tight">
                    {generatedSlug ? 'Access Link Ready' : 'Share Repository'}
                  </h3>
                  <p className="text-xs font-medium text-silver-400 mt-1 uppercase tracking-widest">Secure Distribution</p>
                </div>
                <button onClick={closeModal} className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-silver-50 text-silver-400 hover:text-modernGray-900 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-6 p-4 bg-silver-50/50 rounded-2xl border border-silver-100 flex items-center gap-3">
                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center border border-silver-200 shadow-sm shrink-0">
                  <Github className="h-5 w-5 text-modernGray-900" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-modernGray-900 truncate">{selectedRepo?.name}</p>
                  <p className="text-[10px] font-medium text-silver-400 truncate tracking-tight">{selectedRepo?.full_name}</p>
                </div>
              </div>

              {generatedSlug ? (
                <div className="space-y-6">
                  <div className="bg-green-50 border border-green-100 p-4 rounded-2xl">
                    <p className="text-sm font-medium text-green-700 leading-relaxed">
                      Link generated successfully. Visitors will be required to verify their email before they can access the repository content.
                    </p>
                  </div>
                  <div className="relative group">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/s/${generatedSlug}`}
                      className="block w-full text-sm border border-silver-200 bg-silver-50/50 px-4 py-3.5 rounded-2xl text-modernGray-700 font-medium pr-24 outline-none"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/s/${generatedSlug}`);
                        toast.success('Link copied to clipboard!');
                      }}
                      className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-modernGray-900 text-white rounded-xl text-xs font-bold shadow-lg shadow-modernGray-900/20 hover:bg-modernGray-800 transition-all active:scale-95"
                    >
                      Copy Link
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="w-full modern-button-secondary py-4 font-bold"
                  >
                    Close & Finish
                  </button>
                </div>
              ) : (
                <form onSubmit={handleGenerateLink} className="space-y-6">
                  <div>
                    <label htmlFor="emails" className="block text-sm font-bold text-modernGray-700 mb-1 ml-1">
                      Restrict to Emails
                    </label>
                    <p className="text-[11px] text-silver-500 mb-2 ml-1 italic font-medium">Comma-separated list (e.g. user1@gmail.com, user2@me.com)</p>
                    <textarea
                      id="emails"
                      required
                      value={emails}
                      onChange={(e) => setEmails(e.target.value)}
                      placeholder="Enter emails allowed to access..."
                      className="block w-full rounded-2xl border border-silver-200 bg-silver-50 px-4 py-3.5 text-sm text-modernGray-900 placeholder-silver-300 focus:bg-white focus:ring-2 focus:ring-modernGray-900/5 focus:border-modernGray-900 transition-all outline-none min-h-[100px] resize-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="expires" className="block text-sm font-bold text-modernGray-700 mb-2 ml-1">
                      Link Expiration (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      id="expires"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="block w-full rounded-2xl border border-silver-200 bg-silver-50 px-4 py-3.5 text-sm text-modernGray-900 focus:bg-white focus:ring-2 focus:ring-modernGray-900/5 focus:border-modernGray-900 transition-all outline-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 modern-button-secondary py-4 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={generating}
                      className="flex-[2] modern-button-primary py-4 font-bold shadow-lg shadow-modernGray-900/20"
                    >
                      {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LinkIcon className="h-4 w-4 mr-2" />}
                      Generate Secure Link
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
