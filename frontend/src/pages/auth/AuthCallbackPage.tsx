import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { ProvalixLogo } from '../../components/common/ProvalixLogo';

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleOAuthCallback } = useAuth();
  const { success, error: toastError } = useToast();

  const oauthError = searchParams.get('error_description') || searchParams.get('error');
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>(() => oauthError ? 'error' : 'loading');
  const [errorMessage, setErrorMessage] = useState<string>(() => oauthError || '');
  const processedRef = useRef(Boolean(oauthError));

  useEffect(() => {
    if (oauthError) {
      toastError(oauthError);
      return;
    }

    let isCancelled = false;
    let authSubscription: { unsubscribe: () => void } | null = null;

    const processSession = async () => {
      if (processedRef.current || isCancelled) return;

      try {
        // 1. Try to get active session from Supabase client
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        let accessToken = data.session?.access_token;

        // 2. Fallback check URL hash if session is still resolving from implicit redirect
        if (!accessToken && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          accessToken = hashParams.get('access_token') || undefined;
          const hashError = hashParams.get('error_description') || hashParams.get('error');
          if (hashError) {
            throw new Error(hashError);
          }
        }

        if (accessToken) {
          if (processedRef.current) return;
          processedRef.current = true;

          // Send verified token to Provalix backend
          const user = await handleOAuthCallback(accessToken);
          if (isCancelled) return;

          setStatus('success');
          success(`Welcome to Provalix AI, ${user.name}!`);
          navigate('/dashboard', { replace: true });
          return;
        }

        // 3. Fallback: Listen to auth state change if Supabase client is exchanging code/token
        const { data: listenerData } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (processedRef.current || isCancelled) return;

            if (event === 'SIGNED_IN' && session?.access_token) {
              processedRef.current = true;
              try {
                const user = await handleOAuthCallback(session.access_token);
                if (isCancelled) return;

                setStatus('success');
                success(`Welcome to Provalix AI, ${user.name}!`);
                navigate('/dashboard', { replace: true });
              } catch (err: any) {
                if (isCancelled) return;
                setStatus('error');
                const msg = err?.message || 'Failed to sync Google account with Provalix backend';
                setErrorMessage(msg);
                toastError(msg);
              }
            }
          }
        );
        authSubscription = listenerData.subscription;

        // Timeout fallback after 7 seconds if no session is captured
        const timer = setTimeout(() => {
          if (!processedRef.current && !isCancelled) {
            if (authSubscription) {
              authSubscription.unsubscribe();
            }
            setStatus('error');
            setErrorMessage('Google authentication timed out or could not find an active session. Please try again.');
          }
        }, 7000);

        return () => {
          clearTimeout(timer);
          if (authSubscription) {
            authSubscription.unsubscribe();
          }
        };
      } catch (err: any) {
        if (isCancelled) return;
        processedRef.current = true;
        setStatus('error');
        const msg = err?.message || 'Failed to complete Google authentication';
        setErrorMessage(msg);
        toastError(msg);
      }
    };

    processSession();

    return () => {
      isCancelled = true;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [handleOAuthCallback, navigate, oauthError, success, toastError]);

  return (
    <div className="min-h-screen bg-[#0B1120] text-[#F8FAFC] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#7C3AED]/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        <ProvalixLogo variant="compact" size="md" className="mb-6" />
        <div className="w-full bg-[#111827] border border-[#243047] rounded-2xl p-8 shadow-2xl text-center">
          {status === 'loading' && (
            <div className="flex flex-col items-center py-6">
              <div className="w-16 h-16 rounded-2xl bg-[#7C3AED]/15 border border-[#7C3AED]/30 flex items-center justify-center mb-6 shadow-inner">
                <Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white mb-2">
                Authenticating with Google
              </h2>
              <p className="text-sm text-[#94A3B8] max-w-xs leading-relaxed">
                Verifying your identity with Supabase and synchronizing your Provalix AI account...
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center py-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-6 text-emerald-400">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white mb-2">
                Authentication Successful
              </h2>
              <p className="text-sm text-[#94A3B8]">
                Redirecting to your dashboard...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mb-6 text-red-400">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white mb-2">
                Authentication Failed
              </h2>
              <p className="text-sm text-red-300 bg-red-950/40 border border-red-900/50 rounded-xl px-4 py-3 mb-6 w-full text-left leading-relaxed">
                {errorMessage}
              </p>
              <Link
                to="/login"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-[#7C3AED] hover:bg-[#6D28D9] active:bg-[#5B21B6] transition-colors shadow-lg shadow-[#7C3AED]/20"
              >
                <ArrowLeft className="w-4 h-4" />
                Return to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
