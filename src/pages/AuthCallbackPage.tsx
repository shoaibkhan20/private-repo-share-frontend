import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Check for error from backend redirect
    const error = searchParams.get('error');
    if (error) {
      toast.error('GitHub authentication failed. Please try again.');
      navigate('/');
      return;
    }

    // The backend redirects here with ?token=xxx&user=base64_encoded_json
    const token = searchParams.get('token');
    const userBase64 = searchParams.get('user');

    if (!token) {
      toast.error('Authentication failed — no token received.');
      navigate('/');
      return;
    }

    // Store the Sanctum token
    localStorage.setItem('owner_token', token);

    // Decode and store the user data if present
    if (userBase64) {
      try {
        const userData = JSON.parse(atob(userBase64));
        localStorage.setItem('owner_user', JSON.stringify(userData));
      } catch (e) {
        // User data decode failed — not critical, dashboard will fetch via /auth/me
        console.warn('Failed to decode user data from callback', e);
      }
    }

    toast.success('Successfully logged in!');
    navigate('/dashboard');
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 relative overflow-hidden bg-grid-pattern">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
      <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mb-4 relative z-10" />
      <h2 className="text-lg font-bold tracking-tight text-zinc-100 relative z-10">Authenticating...</h2>
      <p className="text-xs text-zinc-400 mt-2 relative z-10">Please wait while we verify your credentials.</p>
    </div>
  );
}
