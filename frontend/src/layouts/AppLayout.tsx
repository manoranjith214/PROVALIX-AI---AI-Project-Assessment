import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/common/Sidebar';
import { AIAssistantDrawer } from '../components/ai/AIAssistantDrawer';
import { useAuth } from '../context/AuthContext';
import { useAI } from '../context/AIContext';
import { notificationService } from '../services/notificationService';
import { Menu, Bell, Plus, User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { LogoutDialog } from '../components/auth/LogoutDialog';

export const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { setContextCategory } = useAI();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileMenuOpen]);

  const handleConfirmLogout = async () => {
    setLogoutDialogOpen(false);
    await logout();
    navigate('/login');
  };

  // Dynamically set AI Context based on route
  useEffect(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('leaderboard')) {
      setContextCategory('leaderboard');
    } else if (path.includes('project-checker')) {
      setContextCategory('projectChecker');
    } else if (path.includes('project-reports') || path.includes('project-report')) {
      setContextCategory('projectReport');
    } else if (path.includes('viva')) {
      setContextCategory('viva');
    } else if (path.includes('evaluations') || path.includes('evaluation')) {
      setContextCategory('evaluation');
    } else if (path.includes('classrooms') || path.includes('classroom')) {
      setContextCategory('classroom');
    } else if (path.includes('teams') || path.includes('team')) {
      setContextCategory('teams');
    } else if (path.includes('notifications')) {
      setContextCategory('notifications');
    } else {
      setContextCategory('dashboard');
    }
  }, [location.pathname, setContextCategory]);

  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    if (user.id) {
      notificationService.getUnreadCount().then((count: number) => {
        if (isMounted) setUnreadCount(count);
      }).catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [location.pathname === '/notifications', user.id]);

  return (
    <div className="min-h-screen bg-brand-bg flex">
      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
          collapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-20 bg-[#0B1120]/90 backdrop-blur-md border-b border-[#1E293B] h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#172033] transition-colors"
              aria-label="Open Navigation Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs font-mono bg-[#0F172A] text-[#94A3B8] px-2.5 py-1 rounded-lg border border-[#243047] font-semibold">
                ID: {user.permanentId}
              </span>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            <Link to="/project-checker/new" className="hidden sm:inline-flex">
              <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                New Check
              </Button>
            </Link>

            <Link
              to="/notifications"
              className="relative p-2 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#172033] transition-colors"
              aria-label="View Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#7C3AED] ring-2 ring-[#0B1120]" />
              )}
            </Link>

            {/* User Profile Dropdown Menu */}
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen(prev => !prev)}
                aria-expanded={profileMenuOpen}
                aria-haspopup="true"
                aria-label="User profile menu"
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[#172033] transition-colors focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/40 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-[#7C3AED]/20 text-[#A78BFA] font-bold text-xs flex items-center justify-center border border-[#7C3AED]/30 overflow-hidden shrink-0">
                  {user.avatar || user.profileImage ? (
                    <img 
                      src={user.avatar || user.profileImage} 
                      alt={user.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    user.name.charAt(0)
                  )}
                </div>
                <span className="hidden lg:inline text-xs font-bold text-[#F8FAFC]">
                  {user.name}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#94A3B8] transition-transform duration-200 ${
                    profileMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#111827] border border-[#243047] rounded-xl shadow-2xl py-1.5 z-50 text-left animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3.5 py-2.5 border-b border-[#1E293B] flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#7C3AED]/20 text-[#A78BFA] font-bold text-xs flex items-center justify-center border border-[#7C3AED]/30 overflow-hidden shrink-0">
                      {user.avatar || user.profileImage ? (
                        <img 
                          src={user.avatar || user.profileImage} 
                          alt={user.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        user.name.charAt(0)
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-[#F8FAFC] truncate">{user.name}</p>
                      <p className="text-[11px] font-mono text-[#94A3B8] truncate font-semibold">
                        {user.permanentId}
                      </p>
                    </div>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/profile"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-[#172033] transition-colors"
                    >
                      <User className="w-4 h-4 text-[#94A3B8]" />
                      <span>Profile</span>
                    </Link>

                    <Link
                      to="/settings"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-[#172033] transition-colors"
                    >
                      <Settings className="w-4 h-4 text-[#94A3B8]" />
                      <span>Settings</span>
                    </Link>

                    <Link
                      to="/notifications"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-[#172033] transition-colors"
                    >
                      <Bell className="w-4 h-4 text-[#94A3B8]" />
                      <span>Notifications</span>
                      {unreadCount > 0 && (
                        <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#7C3AED] text-white">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-[#1E293B]">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        setLogoutDialogOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-red-400" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Global Context-Aware AI Assistant Drawer */}
        <AIAssistantDrawer />

        {/* Standardized Logout Confirmation Dialog */}
        <LogoutDialog
          isOpen={logoutDialogOpen}
          onClose={() => setLogoutDialogOpen(false)}
          onConfirm={handleConfirmLogout}
        />
      </div>
    </div>
  );
};
