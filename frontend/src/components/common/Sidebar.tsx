import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ScanSearch, 
  FileText, 
  Users, 
  School, 
  Bell, 
  UserCircle, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { notificationService } from '../../services/notificationService';
import { LogoutDialog } from '../auth/LogoutDialog';
import { ProvalixLogo } from './ProvalixLogo';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    if (user?.id) {
      notificationService.getUnreadCount().then((count) => {
        if (isMounted) setUnreadCount(count);
      }).catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const navItems = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Project Checker', to: '/project-checker', icon: ScanSearch },
    { label: 'Project Reports', to: '/project-reports', icon: FileText },
    { label: 'Team Management', to: '/teams', icon: Users },
    { label: 'Classrooms', to: '/classrooms', icon: School },
    { label: 'Notifications', to: '/notifications', icon: Bell, badge: unreadCount > 0 ? unreadCount : undefined },
    { label: 'Profile', to: '/profile', icon: UserCircle },
    { label: 'Settings', to: '/settings', icon: Settings },
  ];

  const handleConfirmLogout = async () => {
    setLogoutModalOpen(false);
    await logout();
    navigate('/login');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0F172A] border-r border-[#1E293B] select-none text-[#F8FAFC]">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#1E293B]">
        <NavLink 
          to="/dashboard" 
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2.5 overflow-hidden group focus:outline-none focus:ring-2 focus:ring-[#7C3AED] rounded-xl p-1"
          aria-label="Provalix AI Dashboard"
        >
          {collapsed ? (
            <ProvalixLogo variant="icon-only" size="sm" />
          ) : (
            <ProvalixLogo variant="compact" size="sm" subtitle="AI PROJECT ASSESSMENT" />
          )}
        </NavLink>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#172033] transition-colors"
          aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#172033]"
          aria-label="Close Mobile Sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[rgba(124,58,237,0.12)] border border-[rgba(167,139,250,0.15)] text-[#F8FAFC] font-semibold shadow-xs'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#172033] border border-transparent'
                } ${collapsed ? 'justify-center' : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? 'text-[#A78BFA]' : 'text-[#94A3B8]'}`} />
                  {!collapsed && <span className="truncate flex-1">{item.label}</span>}
                  {!collapsed && item.badge !== undefined && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-[#7C3AED] text-white shrink-0">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Info & Logout footer */}
      <div className="p-3 border-t border-[#1E293B] bg-[#0B1120]/40">
        {!collapsed && (
          <div className="px-2.5 py-2 mb-2 rounded-xl bg-[#111827] border border-[#243047]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#7C3AED]/20 text-[#A78BFA] font-bold text-xs flex items-center justify-center shrink-0 border border-[#7C3AED]/30 overflow-hidden">
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
                <p className="text-[11px] font-mono text-[#94A3B8] truncate font-semibold">{user.permanentId}</p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => setLogoutModalOpen(true)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors cursor-pointer ${
            collapsed ? 'justify-center' : ''
          }`}
          title="Logout"
        >
          <LogOut className="w-5 h-5 shrink-0 text-[#EF4444]" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Logout Confirmation Dialog */}
      <LogoutDialog
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
      />
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside
        className={`hidden md:block fixed top-0 left-0 bottom-0 z-30 transition-all duration-200 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-brand-dark/40 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] h-full z-10 shadow-dropdown">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
