import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import { ProvalixLogo } from '../common/ProvalixLogo';

interface AuthLayoutProps {
  children: React.ReactNode;
  activeTab?: 'login' | 'register' | 'forgot' | 'reset';
  cardMaxWidth?: string; // e.g. 'max-w-md' or 'max-w-xl'
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  cardMaxWidth = 'max-w-md',
}) => {
  const featurePoints = [
    {
      title: 'AI-powered project evaluation',
      description: 'Instant multi-dimensional code and documentation analysis',
      icon: Sparkles,
    },
    {
      title: 'Plagiarism-aware assessment',
      description: 'Comprehensive similarity detection across peer submissions',
      icon: ShieldCheck,
    },
    {
      title: 'Intelligent feedback and improvement plans',
      description: 'Actionable viva questions and personalized scoring rubrics',
      icon: Zap,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0B1120] text-[#F8FAFC] flex flex-col justify-between selection:bg-[#7C3AED]/30 selection:text-white relative overflow-hidden">
      {/* Subtle abstract background lighting & grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1E293B_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#7C3AED]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#0F766E]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex items-center justify-between">
        <ProvalixLogo
          to="/"
          variant="compact"
          size="md"
          subtitle="AI PROJECT ASSESSMENT"
        />

        <Link
          to="/"
          className="text-xs text-[#94A3B8] hover:text-[#F8FAFC] transition-colors py-1.5 px-3 rounded-lg border border-[#243047] hover:border-[#334155] bg-[#0F172A]/80 backdrop-blur-xs font-medium"
        >
          Back to Home
        </Link>
      </header>

      {/* Main Two-Column Container (Desktop) / Centered Card (Mobile) */}
      <main className="relative z-10 flex-1 flex items-center justify-center py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Side: Brand / Product Introduction (Desktop Only) */}
          <div className="hidden lg:flex lg:col-span-6 flex-col justify-center pr-6 space-y-8 text-left">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#172033] border border-[#243047] text-xs font-semibold text-[#CBD5E1] mb-6 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#7C3AED] animate-pulse" />
                Next-Gen Academic Evaluation
              </div>
              <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-[#F8FAFC] leading-[1.15]">
                Evaluate Smarter.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#A78BFA]">
                  Build Better.
                </span>
              </h1>
              <p className="mt-4 text-base text-[#94A3B8] leading-relaxed max-w-lg">
                AI-powered project evaluation, classroom assessment and intelligent feedback in one platform.
              </p>
            </div>

            {/* Feature Points */}
            <div className="space-y-4 pt-2">
              {featurePoints.map((item, idx) => {
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-3.5 p-3 rounded-xl bg-[#111827]/60 border border-[#243047]/60 backdrop-blur-xs transition-all hover:border-[#334155]"
                  >
                    <div className="p-1.5 rounded-lg bg-[#7C3AED]/10 text-[#7C3AED] shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-[#7C3AED]" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-[#F8FAFC]">
                        {item.title}
                      </h2>
                      <p className="text-xs text-[#94A3B8] mt-0.5 leading-normal">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Institutional Trust Note */}
            <div className="pt-4 flex items-center gap-4 text-xs text-[#64748B] border-t border-[#1E293B]">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                Institutional Security Standard
              </span>
              <span>•</span>
              <span>Encrypted Data Transit</span>
              <span>•</span>
              <span>Automated Verification</span>
            </div>
          </div>

          {/* Right Side: Auth Card Container */}
          <div className="col-span-1 lg:col-span-6 flex justify-center w-full">
            <div className={`w-full ${cardMaxWidth}`}>
              {children}
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 text-center text-xs text-[#64748B]">
        <p>© {new Date().getFullYear()} Provalix AI. Enterprise Academic Intelligence System.</p>
      </footer>
    </div>
  );
};
