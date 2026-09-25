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

  // Extract potential errors from both query string and hash fragment
  const parseErrors = () => {
    const queryErr = searchParams.get('error_description') || searchParams.get('error');
    if (queryErr) return queryErr;
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const hashErr = hashParams.get('error_description') || hashParams.get('error');
      if (hashErr) return hashErr;
    }
    return '';
  };

  const initialError = parseErrors();
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>(() => initialError ? 'error' : 'loading');
  const [errorMessage, setErrorMessage] = useState<string>(() => initialError);
  const processedRef = useRef(Boolean(initialError));

  useEffect(() => {
    if (initialError) {
      toastError(initialError);
      return;
    }

    let isCancelled = false;
    let authSubscription: { unsubscribe: () => void } | null = null;

    const processAuth = async () => {
      if (processedRef.current || isCancelled) return;

      try {
        // 1. If PKCE ?code= parameter is present, exchange it for session
        const code = searchParams.get('code');
        if (code) {
          try {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) {
              console.warn('[OAuth] exchangeCodeForSession notice:', exchangeError.message);
            }
          } catch (exchangeErr: any) {
            console.warn('[OAuth] exchangeCodeForSession threw:', exchangeErr?.message || exchangeErr);
          }
        }

        // 2. If implicit #access_token is present in hash fragment, set session
        let hashAccessToken: string | null = null;
        let hashRefreshToken: string | null = null;
        if (typeof window !== 'undefined' && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
          hashAccessToken = hashParams.get('access_token');
          hashRefreshToken = hashParams.get('refresh_token');

          if (hashAccessToken) {
            try {
              const { error: setSessionErr } = await supabase.auth.setSession({
                access_token: hashAccessToken,
                refresh_token: hashRefreshToken || '',
              });
              if (setSessionErr) {
                console.warn('[OAuth] setSession with hash token notice:', setSessionErr.message);
              }
            } catch (setErr: any) {
              console.warn('[OAuth] setSession threw:', setErr?.message || setErr);
            }
          }
        }

        // 3. After authentication exchange/set, retrieve the session with supabase.auth.getSession()
        let session = null;
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.warn('[OAuth] getSession error:', sessionError.message);
        } else {
          session = sessionData?.session;
        }

        // If session is still resolving, retry briefly
        if (!session && !hashAccessToken) {
          for (let attempt = 0; attempt < 3; attempt++) {
            await new Promise((r) => setTimeout(r, 400));
            if (isCancelled || processedRef.current) return;
            const { data: retryData } = await supabase.auth.getSession();
            if (retryData?.session) {
              session = retryData.session;
              break;
            }
          }
        }

        const accessToken = session?.access_token || hashAccessToken;

        if (accessToken) {
          if (processedRef.current || isCancelled) return;
          processedRef.current = true;

          // Obtain user info from session or query Supabase user
          let sbUser: any = session?.user;
          if (!sbUser) {
            const { data: userData } = await supabase.auth.getUser(accessToken).catch(() => ({ data: { user: null } }));
            sbUser = userData?.user ?? undefined;
          }

          // 4. Sync the Supabase user/profile into the existing application AuthContext/storage
          const user = await handleOAuthCallback(accessToken, sbUser);
          if (isCancelled) return;

          // 5. Navigate to /dashboard after successful authentication
          setStatus('success');
          success(`Welcome to Provalix AI, ${user.name || 'User'}!`);
          navigate('/dashboard', { replace: true });
          return;
        }

        // 6. Fallback: Listen to auth state change if Supabase client is exchanging asynchronously
        const { data: listenerData } = supabase.auth.onAuthStateChange(
          async (event, currentSession) => {
            if (processedRef.current || isCancelled) return;

            if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && currentSession?.access_token) {
              processedRef.current = true;
              try {
                const user = await handleOAuthCallback(currentSession.access_token, currentSession.user);
                if (isCancelled) return;

                setStatus('success');
                success(`Welcome to Provalix AI, ${user.name || 'User'}!`);
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
            setErrorMessage('Google authentication timed out or could not establish an active session. Please try signing in again.');
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

    processAuth();

    return () => {
      isCancelled = true;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [handleOAuthCallback, initialError, navigate, searchParams, success, toastError]);

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
