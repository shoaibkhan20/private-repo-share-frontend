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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Github className="h-6 w-6 text-gray-900" />
            <h1 className="text-xl font-bold text-gray-900">Private Repo Share</h1>
          </div>
          <div className="flex items-center gap-4">
            {profile && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-1.5 focus:outline-none hover:opacity-80 transition-opacity"
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="true"
                >
                  <img src={profile.avatar_url} alt={profile.name} className="h-8 w-8 rounded-full border border-gray-200" />
                  <ChevronDown className="h-4 w-4 text-gray-500 hidden sm:block" />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none z-50 animate-in fade-in slide-in-from-top-1 duration-100">
                    <div className="px-4 py-3">
                      <p className="text-xs text-gray-500">Signed in as</p>
                      <p className="text-sm font-semibold text-gray-900 truncate mt-0.5">{profile.name}</p>
                      {profile.github_username && (
                        <p className="text-xs text-gray-600 flex items-center gap-1 mt-1 font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200 w-fit">
                          <Github className="h-3 w-3" />
                          {profile.github_username}
                        </p>
                      )}
                      {profile.email && (
                        <p className="text-xs text-gray-500 truncate mt-1.5">{profile.email}</p>
                      )}
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Repositories Section */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Book className="h-5 w-5 text-gray-500" />
              Your Private Repositories
            </h2>
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-md shadow-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          <div className="overflow-y-auto p-4 flex-1">
            {repos.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No private repositories found.</p>
            ) : (
              <ul className="space-y-3">
                {repos.map(repo => {
                  const isExpanded = expandedRepoId === repo.id;
                  return (
                    <li key={repo.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate" title={repo.name || repo.full_name}>
                            {repo.name || repo.full_name}
                          </h3>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{repo.full_name}</p>
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2" title={repo.description}>
                            {repo.description || 'No description'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-4">
                          <button
                            type="button"
                            onClick={() => setExpandedRepoId(isExpanded ? null : repo.id)}
                            className="flex items-center justify-center p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                            title="Toggle Repository Details"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setSelectedRepo(repo); setIsModalOpen(true); }}
                            className="flex items-center gap-1.5 bg-gray-900 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                            Share
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-y-2 gap-x-4 text-xs text-gray-600 bg-gray-50 p-3 rounded-md">
                          <div>
                            <span className="font-semibold block text-gray-500">Default Branch</span>
                            <span>{repo.default_branch || 'main'}</span>
                          </div>
                          <div>
                            <span className="font-semibold block text-gray-500">Visibility</span>
                            <span className="px-2 py-0.5 inline-flex text-[10px] leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              {repo.is_private ? 'Private' : 'Public'}
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold block text-gray-500">GitHub Repo ID</span>
                            <span>{repo.github_repo_id}</span>
                          </div>
                          {repo.synced_at && (
                            <div>
                              <span className="font-semibold block text-gray-500">Synced At</span>
                              <span>{format(new Date(repo.synced_at), 'MMM d, yyyy h:mm a')}</span>
                            </div>
                          )}
                          <div className="col-span-2 mt-2 pt-2 border-t border-gray-200/50 flex justify-end">
                            <button
                              type="button"
                              onClick={() => navigate(`/repos/${repo.id}/view`)}
                              className="flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-md text-xs font-semibold shadow-sm transition-colors"
                            >
                              <Book className="h-3.5 w-3.5" />
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
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
          <div className="p-4 border-b border-gray-200 bg-gray-50/50">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-gray-500" />
              Active Share Links
            </h2>
          </div>
          <div className="overflow-y-auto p-4 flex-1">
            {links.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No active share links.</p>
            ) : (
              <ul className="space-y-4">
                {links.map(link => (
                  <li key={link.id} className="border border-gray-200 rounded-lg p-4 relative group">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">{link.repo_name}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          {link.expires_at ? (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              Expires: {format(new Date(link.expires_at), 'MMM d, yyyy')}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              Never expires
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full font-medium ${link.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {link.is_active ? 'Active' : 'Expired'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRevoke(link.id)}
                        className="text-gray-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors"
                        title="Revoke Link"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {link.allowed_emails && link.allowed_emails.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-gray-500 mb-1">Restricted to:</p>
                        <div className="flex flex-wrap gap-1">
                          {link.allowed_emails.map((email, idx) => (
                            <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              {email}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}/s/${link.slug}`}
                        className="block w-full text-sm border-gray-300 rounded-md bg-gray-50 px-3 py-1.5 text-gray-500 focus:ring-0 focus:border-gray-300"
                      />
                      <button
                        onClick={() => copyToClipboard(link.slug)}
                        className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors shrink-0"
                      >
                        <Copy className="h-4 w-4" />
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
            <div className="fixed inset-0 transition-opacity bg-gray-900/50 backdrop-blur-sm" onClick={closeModal} />

            <div className="relative inline-block w-full max-w-md p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  {generatedSlug ? 'Link Generated!' : 'Share Repository'}
                </h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-500">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-sm font-medium text-gray-900">{selectedRepo?.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{selectedRepo?.full_name}</p>
              </div>

              {generatedSlug ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Your secure repository sharing link is ready. Anyone who has this link will need to verify their email via OTP before viewing.
                  </p>
                  <div className="flex items-center gap-2 mt-2 bg-gray-50 p-2 border border-gray-200 rounded-md">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/s/${generatedSlug}`}
                      className="block w-full text-sm border-0 bg-transparent p-0 text-gray-700 focus:ring-0"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/s/${generatedSlug}`);
                        toast.success('Link copied to clipboard!');
                      }}
                      className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-gray-50 shadow-sm transition-colors shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </button>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 focus:outline-none"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleGenerateLink} className="space-y-4">
                  <div>
                    <label htmlFor="emails" className="block text-sm font-medium text-gray-700">
                      Allowed Emails
                    </label>
                    <p className="text-xs text-gray-500 mb-1">Comma-separated list of emails.</p>
                    <input
                      type="text"
                      id="emails"
                      required
                      value={emails}
                      onChange={(e) => setEmails(e.target.value)}
                      placeholder="user1@example.com, user2@example.com"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm p-2 border"
                    />
                  </div>

                  <div>
                    <label htmlFor="expires" className="block text-sm font-medium text-gray-700">
                      Expiry Date (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      id="expires"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm p-2 border"
                    />
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={generating}
                      className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-gray-900 border border-transparent rounded-md hover:bg-gray-800 focus:outline-none disabled:opacity-70"
                    >
                      {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
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
