import React from 'react';
import { Link } from 'react-router-dom';
import { ProvalixLogo } from './ProvalixLogo';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#0B1120] text-[#94A3B8] border-t border-[#1E293B] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand & Description */}
          <div className="md:col-span-1 space-y-4">
            <ProvalixLogo to="/" variant="compact" size="md" showSubtitle={false} />
            <p className="text-xs text-[#94A3B8] leading-relaxed font-normal">
              Intelligent Evaluation. Better Projects.
            </p>
            <p className="text-xs text-[#94A3B8] leading-relaxed font-normal">
              Provalix AI automates student project assessment through AI-powered project analysis, plagiarism detection, structured evaluation, team management, classroom assessment, and actionable feedback.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-xs font-semibold text-[#F8FAFC] uppercase tracking-wider mb-4">
              Product
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/project-checker" className="hover:text-[#A78BFA] transition-colors">
                  Project Checker
                </Link>
              </li>
              <li>
                <Link to="/project-reports" className="hover:text-[#A78BFA] transition-colors">
                  Project Reports
                </Link>
              </li>
              <li>
                <Link to="/teams" className="hover:text-[#A78BFA] transition-colors">
                  Teams
                </Link>
              </li>
              <li>
                <Link to="/classrooms" className="hover:text-[#A78BFA] transition-colors">
                  Classrooms
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-xs font-semibold text-[#F8FAFC] uppercase tracking-wider mb-4">
              Company
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/about" className="hover:text-[#A78BFA] transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link to="/solution" className="hover:text-[#A78BFA] transition-colors">
                  Solution
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-[#A78BFA] transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/benefits" className="hover:text-[#A78BFA] transition-colors">
                  Benefits
                </Link>
              </li>
            </ul>
          </div>

          {/* Account Links */}
          <div>
            <h4 className="text-xs font-semibold text-[#F8FAFC] uppercase tracking-wider mb-4">
              Account
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/login" className="hover:text-[#A78BFA] transition-colors">
                  Login
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-[#A78BFA] transition-colors">
                  Get Started
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-[#1E293B] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#94A3B8]">
          <p>© {new Date().getFullYear()} PROVALIX AI Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>ISO/IEC 27001 Certified Standards</span>
            <span>GDPR & FERPA Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
