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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <Loader2 className="h-12 w-12 text-gray-900 animate-spin mb-4" />
      <h2 className="text-xl font-semibold text-gray-900">Authenticating...</h2>
      <p className="text-gray-500 mt-2">Please wait while we verify your credentials.</p>
    </div>
  );
}
