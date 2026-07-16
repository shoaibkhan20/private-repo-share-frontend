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
    <div className="min-h-screen bg-gradient-to-br from-silver-50 via-white to-modernGray-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-silver-300 to-modernGray-400 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative h-20 w-20 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-silver-100">
              <Github className="h-10 w-10 text-modernGray-900" />
            </div>
          </div>
        </div>
        <h2 className="text-center text-4xl font-extrabold text-modernGray-900 tracking-tight">
          Private Repo Share
        </h2>
        <p className="mt-3 text-center text-base text-modernGray-500 max-w-xs mx-auto">
          The elegant way to share your private GitHub repositories securely.
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="premium-card py-10 px-6 sm:px-10 rounded-3xl">
          <div className="space-y-6">
            <p className="text-sm text-center text-modernGray-500 px-2">
              Sign in with your GitHub account to manage and share your private repositories.
            </p>
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full modern-button-primary py-4 text-base shadow-lg"
            >
              {isLoading ? (
                <Loader2 className="animate-spin h-5 w-5 mr-3" />
              ) : (
                <Github className="h-5 w-5 mr-3" />
              )}
              {isLoading ? 'Connecting...' : 'Continue with GitHub'}
            </button>
            <div className="flex items-center justify-center gap-2 text-xs text-silver-400 font-medium pt-2">
              <div className="h-px w-8 bg-silver-200"></div>
              <span>SECURE & ENCRYPTED</span>
              <div className="h-px w-8 bg-silver-200"></div>
            </div>
          </div>
        </div>
        <p className="mt-8 text-center text-xs text-silver-400">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
