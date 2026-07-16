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
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-16 w-16 bg-gray-900 rounded-xl flex items-center justify-center shadow-lg">
            <Github className="h-10 w-10 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Private Repo Share
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Securely share your private GitHub repositories with anyone.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-70 transition-colors"
          >
            {isLoading ? (
              <Loader2 className="animate-spin h-5 w-5 mr-2" />
            ) : (
              <Github className="h-5 w-5 mr-2" />
            )}
            Authorize with GitHub
          </button>
        </div>
      </div>
    </div>
  );
}
