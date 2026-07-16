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
      const { data } = await api.post(`/s/${slug}/verify-email`, { email });

      // Direct access token bypass
      if (data.access_token) {
        localStorage.setItem('visitor_token', data.access_token);
        toast.success('Access granted');
        navigate(`/s/${slug}/view`);
      } else {
        /*
        setStatus('otp_entry');
        toast.success('Verification code sent to your email');
        */
      }
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
      <div className="min-h-screen bg-gradient-to-br from-silver-50 to-modernGray-100 flex flex-col items-center justify-center p-4">
        <div className="premium-card p-12 rounded-3xl flex flex-col items-center max-w-xs w-full">
          <div className="relative h-16 w-16 mb-6">
            <div className="absolute inset-0 bg-silver-200 rounded-2xl animate-pulse"></div>
            <div className="relative h-full w-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-modernGray-900 animate-spin" />
            </div>
          </div>
          <p className="text-modernGray-800 font-semibold tracking-tight">Validating Access</p>
          <p className="text-silver-500 text-sm mt-1">Please wait a moment...</p>
        </div>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-silver-50 to-modernGray-100 flex flex-col items-center justify-center p-4">
        <div className="premium-card p-10 rounded-3xl max-w-md w-full text-center">
          <div className="mx-auto h-16 w-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 border border-red-100 shadow-sm shadow-red-100/50">
            <Shield className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-modernGray-900 mb-2 tracking-tight">Access Denied</h2>
          <p className="text-modernGray-500 mb-8 px-4">This secure link has expired, been revoked, or is no longer valid.</p>
          <button 
            onClick={() => navigate('/')}
            className="modern-button-secondary w-full py-3"
          >
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-silver-50 via-white to-modernGray-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-silver-300 to-modernGray-400 rounded-2xl blur opacity-25"></div>
            <div className="relative h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-silver-100">
              <Shield className="h-8 w-8 text-modernGray-900" />
            </div>
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-modernGray-900 tracking-tight px-4">
          Secure Repository Access
        </h2>
        <p className="mt-3 text-center text-sm text-modernGray-500 max-w-xs mx-auto">
          {status === 'email_entry'
            ? 'Verify your identity to proceed to the repository.'
            : `We've sent a 6-digit code to ${email}`}
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="premium-card py-10 px-6 sm:px-10 rounded-3xl">
          {status === 'email_entry' && (
            <form onSubmit={handleSendCode} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-modernGray-700 mb-2 ml-1">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-silver-400 group-focus-within:text-modernGray-600 transition-colors" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-silver-50 border border-silver-200 rounded-xl text-modernGray-900 placeholder-silver-400 focus:bg-white focus:ring-2 focus:ring-modernGray-900/5 focus:border-modernGray-900 transition-all outline-none"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full modern-button-primary py-4 shadow-lg shadow-modernGray-900/10"
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5 mr-3" /> : <ArrowRight className="h-5 w-5 mr-3" />}
                Access Repository
              </button>
            </form>
          )}

          {status === 'otp_entry' && (
            <form onSubmit={handleVerify} className="space-y-6">
              <div>
                <label htmlFor="otp" className="block text-sm font-semibold text-modernGray-700 mb-2 ml-1">
                  6-Digit Verification Code
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-silver-400 group-focus-within:text-modernGray-600 transition-colors" />
                  </div>
                  <input
                    id="otp"
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="block w-full pl-11 pr-4 py-3 bg-silver-50 border border-silver-200 rounded-xl text-modernGray-900 tracking-[0.5em] text-center font-mono text-xl focus:bg-white focus:ring-2 focus:ring-modernGray-900/5 focus:border-modernGray-900 transition-all outline-none"
                    placeholder="000000"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full modern-button-primary py-4 shadow-lg shadow-modernGray-900/10"
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5 mr-3" /> : <Shield className="h-5 w-5 mr-3" />}
                Verify & Access
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setStatus('email_entry')}
                  className="text-sm text-silver-500 hover:text-modernGray-900 font-medium transition-colors"
                >
                  Use a different email address
                </button>
              </div>
            </form>
          )}
        </div>
        
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-silver-400 font-medium uppercase tracking-widest">
          <Shield className="h-3 w-3" />
          <span>Secure Point-to-Point View</span>
        </div>
      </div>
    </div>
  );
}
