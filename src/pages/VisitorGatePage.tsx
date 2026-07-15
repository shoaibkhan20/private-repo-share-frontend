import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { Loader2, Shield, Mail, KeyRound, ArrowRight } from 'lucide-react';

export default function VisitorGatePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState<'checking' | 'invalid' | 'email_entry' | 'otp_entry'>('checking');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  useEffect(() => {
    if (!slug) return;

    const controller = new AbortController();

    const validateLink = async () => {
      try {
        const { data } = await api.get(`/s/${slug}`, {
          signal: controller.signal,
        });
        if (data.valid === false) {
          setStatus('invalid');
        } else {
          setStatus('email_entry');
        }
      } catch (error: any) {
        // Don't update state if the request was aborted
        if (error?.name === 'CanceledError' || controller.signal.aborted) return;
        setStatus('invalid');
      }
    };

    validateLink();

    return () => {
      controller.abort();
    };
  }, [slug]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || loading) return;
    
    try {
      setLoading(true);
      await api.post(`/s/${slug}/request-otp`, { email });
      setStatus('otp_entry');
      toast.success('Verification code sent to your email');
    } catch (error: any) {
      if (error.response?.status === 429) {
        toast.error('Too many requests. Please try again later.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to send code. You may not have access.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || loading) return;

    try {
      setLoading(true);
      const { data } = await api.post(`/s/${slug}/verify-otp`, { email, code: otp });
      
      if (data.access_token) {
        localStorage.setItem('visitor_token', data.access_token);
        toast.success('Access granted');
        navigate(`/s/${slug}/view`);
      }
    } catch (error: any) {
      const remaining = error.response?.data?.attempts_left ?? (attemptsLeft - 1);
      setAttemptsLeft(remaining);
      
      if (remaining <= 0) {
        toast.error('Maximum attempts reached. Please request a new code.');
        setStatus('email_entry');
        setOtp('');
      } else {
        toast.error(`Invalid code. ${remaining} attempts remaining.`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 text-gray-900 animate-spin" />
        <p className="mt-4 text-gray-500 font-medium">Validating secure link...</p>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 max-w-md w-full text-center">
          <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500">This link has expired, been revoked, or does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-14 w-14 bg-gray-900 rounded-xl flex items-center justify-center shadow-lg">
            <Shield className="h-7 w-7 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Secure Repository Access
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {status === 'email_entry' 
            ? 'Verify your identity to view this repository.'
            : `Enter the code sent to ${email}`}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          
          {status === 'email_entry' && (
            <form onSubmit={handleSendCode} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 sm:text-sm border-gray-300 rounded-md focus:ring-gray-900 focus:border-gray-900 p-3 border"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none disabled:opacity-70 transition-colors"
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : null}
                Send Verification Code
              </button>
            </form>
          )}

          {status === 'otp_entry' && (
            <form onSubmit={handleVerify} className="space-y-6">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                  6-Digit Code
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="otp"
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="block w-full pl-10 sm:text-lg tracking-widest border-gray-300 rounded-md focus:ring-gray-900 focus:border-gray-900 p-3 border text-center font-mono"
                    placeholder="000000"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none disabled:opacity-70 transition-colors"
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <ArrowRight className="h-5 w-5 mr-2" />}
                Verify & Access
              </button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setStatus('email_entry')}
                  className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                >
                  Use a different email
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
