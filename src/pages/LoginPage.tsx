import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Github, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    const token = localStorage.getItem('owner_token');
    if (token) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/auth/github/redirect');
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error('Failed to get redirect URL');
        setIsLoading(false);
      }
    } catch (error) {
      toast.error('Authentication service unavailable');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden bg-grid-pattern">
      {/* Decorative backdrop glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 -translate-x-1/2 w-[350px] h-[350px] bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="h-20 w-20 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/10 backdrop-blur-md">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
              <Github className="relative h-11 w-11 text-zinc-100" />
            </div>
          </div>
        </div>
        <h2 className="mt-8 text-center text-4xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-100 via-indigo-200 to-zinc-100 bg-clip-text text-transparent">
          Private Repo Share
        </h2>
        <p className="mt-3 text-center text-sm text-zinc-400 max-w-xs mx-auto">
          Securely share your private GitHub repositories with anyone via time-restricted links.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="glass-card py-8 px-6 sm:px-10 rounded-2xl">
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="btn-glow w-full flex justify-center items-center py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-zinc-900 disabled:opacity-75 disabled:cursor-not-allowed transition-all duration-300 transform active:scale-[0.98]"
          >
            {isLoading ? (
              <Loader2 className="animate-spin h-5 w-5 mr-2.5" />
            ) : (
              <Github className="h-5 w-5 mr-2.5" />
            )}
            Authorize with GitHub
          </button>
        </div>
      </div>
    </div>
  );
}
