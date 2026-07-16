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
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center relative overflow-hidden bg-grid-pattern">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
        <Loader2 className="h-12 w-12 text-indigo-500 animate-spin mb-4" />
        <p className="text-zinc-400 font-medium tracking-wide">Validating secure link...</p>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden bg-grid-pattern">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-red-900/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="glass-card p-8 rounded-2xl max-w-md w-full text-center relative z-10 border-red-900/30">
          <div className="mx-auto h-16 w-16 bg-red-950/50 border border-red-500/30 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-red-500/10 animate-pulse">
            <Shield className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-100 mb-2">Access Denied</h2>
          <p className="text-zinc-400 text-sm">This link has expired, been revoked, or does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden bg-grid-pattern">
      {/* Decorative backdrop glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 -translate-x-1/2 w-[350px] h-[350px] bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="h-16 w-16 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/10 backdrop-blur-md">
            <Shield className="h-8 w-8 text-indigo-400" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-100 via-indigo-200 to-zinc-100 bg-clip-text text-transparent">
          Secure Repository Access
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-400 max-w-xs mx-auto">
          {status === 'email_entry' 
            ? 'Verify your identity to view this repository.'
            : `Enter the code sent to ${email}`}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="glass-card py-8 px-6 sm:px-10 rounded-2xl">
          
          {status === 'email_entry' && (
            <form onSubmit={handleSendCode} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
                  Email address
                </label>
                <div className="mt-1.5 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-zinc-500" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="glass-input block w-full pl-10 sm:text-sm p-3"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="btn-glow w-full flex justify-center items-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-zinc-900 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 transform active:scale-[0.98]"
              >
                {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                Access Repository
              </button>
            </form>
          )}

          {status === 'otp_entry' && (
            <form onSubmit={handleVerify} className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="otp" className="block text-sm font-medium text-zinc-300">
                    6-Digit Code
                  </label>
                  {attemptsLeft < 5 && (
                    <span className="text-xs text-amber-500 font-semibold animate-pulse">
                      {attemptsLeft} attempts remaining
                    </span>
                  )}
                </div>
                <div className="mt-1.5 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <KeyRound className="h-4 w-4 text-zinc-500" />
                  </div>
                  <input
                    id="otp"
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="glass-input block w-full pl-10 sm:text-lg tracking-widest text-center font-mono p-3 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="000000"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="btn-glow w-full flex justify-center items-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-zinc-900 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 transform active:scale-[0.98]"
              >
                {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                Verify & Access
              </button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setStatus('email_entry')}
                  className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors font-medium"
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
