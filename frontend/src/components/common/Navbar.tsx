import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Menu, X } from 'lucide-react';
import { ProvalixLogo } from './ProvalixLogo';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = (sectionId: string, path: string) => {
    setMobileMenuOpen(false);
    if (location.pathname === '/') {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    navigate(path);
  };

  const navLinks = [
    { label: 'Home', sectionId: 'hero', path: '/' },
    { label: 'About', sectionId: 'about', path: '/about' },
    { label: 'Solution', sectionId: 'solution', path: '/solution' },
    { label: 'Features', sectionId: 'features', path: '/features' },
    { label: 'How It Works', sectionId: 'how-it-works', path: '/how-it-works' },
    { label: 'Benefits', sectionId: 'benefits', path: '/benefits' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0B1120]/95 backdrop-blur-md border-b border-[#1E293B] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        {/* Brand Wordmark */}
        <ProvalixLogo
          to="/"
          variant="compact"
          size="md"
          subtitle="AI PROJECT ASSESSMENT"
        />

        {/* Desktop Nav Items */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {navLinks.map(link => (
            <button
              key={link.label}
              onClick={() => handleNavClick(link.sectionId, link.path)}
              className="px-3.5 py-2 rounded-xl text-sm font-medium text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#172033] transition-colors cursor-pointer"
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Desktop Auth Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Login
            </Button>
          </Link>
          <Link to="/register">
            <Button variant="primary" size="sm">
              Get Started
            </Button>
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#172033] transition-colors"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#1E293B] bg-[#0F172A] px-4 pt-2 pb-6 space-y-2 animate-in slide-in-from-top-2 duration-150">
          {navLinks.map(link => (
            <button
              key={link.label}
              onClick={() => handleNavClick(link.sectionId, link.path)}
              className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#172033] transition-colors"
            >
              {link.label}
            </button>
          ))}
          <div className="pt-3 mt-2 border-t border-[#1E293B] flex flex-col gap-2">
            <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="w-full">
              <Button variant="outline" size="md" className="w-full">
                Login
              </Button>
            </Link>
            <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="w-full">
              <Button variant="primary" size="md" className="w-full">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
