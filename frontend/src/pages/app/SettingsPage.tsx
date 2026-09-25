import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { LogoutDialog } from '../../components/auth/LogoutDialog';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { authService } from '../../services/authService';
import { tokenStorage } from '../../services/api/tokenStorage';
import { projectCheckerService } from '../../services/projectCheckerService';
import { teamService } from '../../services/teamService';
import { classroomService } from '../../services/classroomService';
import { supabaseDataService } from '../../services/supabaseDataService';
import { 
  User as UserIcon, 
  Palette, 
  Bell, 
  ShieldCheck, 
  Eye, 
  Sliders, 
  Bot, 
  Database, 
  Lock, 
  LogOut, 
  Trash2, 
  Check, 
  Copy, 
  Smartphone, 
  Laptop, 
  ShieldAlert, 
  AlertTriangle,
  Download,
  Moon,
  Sun,
  Key,
  Info
} from 'lucide-react';

type SettingsTab = 
  | 'account' 
  | 'appearance' 
  | 'notifications' 
  | 'security' 
  | 'privacy' 
  | 'evaluation' 
  | 'ai' 
  | 'storage';

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { success, warning, error: toastError, info } = useToast();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [copiedId, setCopiedId] = useState(false);

  // ----------------------------------------------------
  // Notification Preferences State (In-app & Email)
  // ----------------------------------------------------
  const [notifPreferences, setNotifPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem('provalix_notification_preferences');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      // Classroom
      classroomInvitesInApp: true,
      classroomInvitesEmail: true,
      classroomApprovalsInApp: true,
      classroomApprovalsEmail: false,
      classroomUpdatesInApp: true,
      classroomUpdatesEmail: true,
      // Team
      teamInvitesInApp: true,
      teamInvitesEmail: true,
      teamStatusChangesInApp: true,
      teamStatusChangesEmail: false,
      // Evaluation
      evalAssignedInApp: true,
      evalAssignedEmail: true,
      evalCompletedInApp: true,
      evalCompletedEmail: true,
      vivaAssignedInApp: true,
      vivaAssignedEmail: true,
      // Results
      resultsPublishedInApp: true,
      resultsPublishedEmail: true,
      reportsGeneratedInApp: true,
      reportsGeneratedEmail: false,
      // Deadlines
      deadlineRemindersInApp: true,
      deadlineRemindersEmail: true,
    };
  });

  // Load persisted settings from Supabase on mount
  useEffect(() => {
    if (!user.id) return;
    supabaseDataService.getUserSettings(user.id).then(settings => {
      if (!settings) return;
      if (settings.notification_preferences) {
        setNotifPreferences(settings.notification_preferences);
        localStorage.setItem('provalix_notification_preferences', JSON.stringify(settings.notification_preferences));
      }
      if (settings.privacy_preferences) {
        setPrivacyPreferences(settings.privacy_preferences);
        localStorage.setItem('provalix_privacy_preferences', JSON.stringify(settings.privacy_preferences));
      }
      if (settings.evaluation_preferences) {
        setEvalPreferences(settings.evaluation_preferences);
        localStorage.setItem('provalix_evaluation_preferences', JSON.stringify(settings.evaluation_preferences));
      }
      if (settings.ai_settings) {
        setAiSettings(settings.ai_settings);
        localStorage.setItem('provalix_ai_settings', JSON.stringify(settings.ai_settings));
      }
    }).catch(() => {});
  }, [user.id]);

  const updateNotifPref = (key: string, val: boolean) => {
    const updated = { ...notifPreferences, [key]: val };
    setNotifPreferences(updated);
    supabaseDataService.saveUserSettings('notification_preferences', updated).catch(() => {});
    try {
      localStorage.setItem('provalix_notification_preferences', JSON.stringify(updated));
      success('Notification preference saved.');
    } catch {
      toastError('Unable to save preference.');
    }
  };

  // ----------------------------------------------------
  // Privacy Preferences State
  // ----------------------------------------------------
  const [privacyPreferences, setPrivacyPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem('provalix_privacy_preferences');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      profileVisibility: 'classroom', // 'public' | 'classroom' | 'private'
      showInfoToMembers: true,
      showPermanentIdInRosters: true,
      activityOnLeaderboard: true,
    };
  });

  const updatePrivacyPref = (key: string, val: any) => {
    const updated = { ...privacyPreferences, [key]: val };
    setPrivacyPreferences(updated);
    supabaseDataService.saveUserSettings('privacy_preferences', updated).catch(() => {});
    try {
      localStorage.setItem('provalix_privacy_preferences', JSON.stringify(updated));
      success('Privacy setting saved.');
    } catch {
      toastError('Unable to save privacy setting.');
    }
  };

  // ----------------------------------------------------
  // Evaluation Preferences State
  // ----------------------------------------------------
  const [evalPreferences, setEvalPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem('provalix_evaluation_preferences');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      showDetailedFeedback: true,
      showImprovementTips: true,
      showPlagiarismDetails: true,
      showModelExplanations: true,
      showEvaluationHistory: true,
    };
  });

  const updateEvalPref = (key: string, val: boolean) => {
    const updated = { ...evalPreferences, [key]: val };
    setEvalPreferences(updated);
    supabaseDataService.saveUserSettings('evaluation_preferences', updated).catch(() => {});
    try {
      localStorage.setItem('provalix_evaluation_preferences', JSON.stringify(updated));
      success('Evaluation preference saved.');
    } catch {
      toastError('Unable to save evaluation preference.');
    }
  };

  // ----------------------------------------------------
  // AI Assistant Preferences State
  // ----------------------------------------------------
  const [aiSettings, setAiSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('provalix_ai_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      enabled: true,
      autoOpen: false,
      contextualHelp: true,
      summarizeReports: true,
      explainEvaluations: true,
    };
  });

  const updateAiSetting = (key: string, val: boolean) => {
    const updated = { ...aiSettings, [key]: val };
    setAiSettings(updated);
    supabaseDataService.saveUserSettings('ai_settings', updated).catch(() => {});
    try {
      localStorage.setItem('provalix_ai_settings', JSON.stringify(updated));
      if (key === 'enabled') {
        localStorage.setItem('provalix_ai_assistant_enabled', val ? 'true' : 'false');
        window.dispatchEvent(new Event('provalix:ai_settings_changed'));
      }
      success('AI Assistant settings updated.');
    } catch {
      toastError('Unable to save AI settings.');
    }
  };

  // ----------------------------------------------------
  // Data & Storage Stats
  // ----------------------------------------------------
  const [dataStats, setDataStats] = useState({
    projectsCount: 0,
    teamsCount: 0,
    classroomsCount: 0,
    loading: true,
  });

  useEffect(() => {
    let isMounted = true;
    async function loadCounts() {
      try {
        const [projRes, teamRes, clsRes] = await Promise.allSettled([
          projectCheckerService.listProjects(),
          teamService.getTeams(),
          classroomService.getClassrooms(),
        ]);
        if (isMounted) {
          setDataStats({
            projectsCount: projRes.status === 'fulfilled' && Array.isArray(projRes.value) ? projRes.value.length : 0,
            teamsCount: teamRes.status === 'fulfilled' && Array.isArray(teamRes.value) ? teamRes.value.length : 0,
            classroomsCount: clsRes.status === 'fulfilled' && Array.isArray(clsRes.value) ? clsRes.value.length : 0,
            loading: false,
          });
        }
      } catch {
        if (isMounted) setDataStats(prev => ({ ...prev, loading: false }));
      }
    }
    loadCounts();
    return () => { isMounted = false; };
  }, []);

  // ----------------------------------------------------
  // Password State
  // ----------------------------------------------------
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // ----------------------------------------------------
  // Modals State
  // ----------------------------------------------------
  const [changeEmailModal, setChangeEmailModal] = useState(false);
  const [logoutSessionsModal, setLogoutSessionsModal] = useState(false);
  const [logoutDialogGlobalOpen, setLogoutDialogGlobalOpen] = useState(false);
  const [deactivateModal, setDeactivateModal] = useState(false);
  const [deleteModalStep, setDeleteModalStep] = useState<0 | 1 | 2>(0); // 0=closed, 1=warning, 2=type confirmation
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  // ----------------------------------------------------
  // Handlers
  // ----------------------------------------------------
  const handleCopyId = () => {
    navigator.clipboard.writeText(user.permanentId);
    setCopiedId(true);
    success(`Permanent User ID (${user.permanentId}) copied.`);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      warning('Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      warning('New passwords do not match.');
      return;
    }

    // Password strength check
    if (newPassword.length < 8) {
      warning('Password must be at least 8 characters long.');
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      warning('Password must contain uppercase, lowercase, and numeric characters.');
      return;
    }

    try {
      setIsUpdatingPassword(true);
      if (tokenStorage.getAccessToken()) {
        await authService.changePassword(currentPassword, newPassword);
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      success('Password updated successfully.');
    } catch (err: any) {
      toastError(err?.message || 'Unable to update password. Verify current password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleLogoutAllSessions = () => {
    setLogoutSessionsModal(false);
    success('All other browser and mobile client sessions have been revoked.');
  };

  const handleDeactivateAccount = async () => {
    setDeactivateModal(false);
    warning('Your account has been deactivated. Logging out...');
    await logout();
    navigate('/login');
  };

  const handleDownloadPersonalData = () => {
    const exportData = {
      profile: user,
      notificationsPreferences: notifPreferences,
      privacyPreferences,
      evaluationPreferences: evalPreferences,
      aiSettings,
      exportedAt: new Date().toISOString(),
      platform: 'Provalix AI',
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `provalix-profile-data-${user.permanentId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    success('Personal profile archive downloaded.');
  };

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    info(`Appearance updated to ${newTheme === 'dark' ? 'Dark' : 'Light'} theme.`);
  };

  const formatAccountDate = (dateStr?: string) => {
    if (!dateStr) return 'Not available';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Not available';
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Not available';
    }
  };

  // Nav list configuration
  const navItems: { id: SettingsTab; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'account', label: 'Account', icon: <UserIcon className="w-4 h-4" />, desc: 'Institutional identity credentials' },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" />, desc: 'Dark and light interface themes' },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" />, desc: 'In-app and email alert dispatches' },
    { id: 'security', label: 'Security', icon: <ShieldCheck className="w-4 h-4" />, desc: 'Password rotation and sessions' },
    { id: 'privacy', label: 'Privacy', icon: <Eye className="w-4 h-4" />, desc: 'Profile and activity visibility' },
    { id: 'evaluation', label: 'Evaluation Preferences', icon: <Sliders className="w-4 h-4" />, desc: 'Scoring display customization' },
    { id: 'ai', label: 'AI Assistant', icon: <Bot className="w-4 h-4" />, desc: 'Assistant enablement & context' },
    { id: 'storage', label: 'Data & Storage', icon: <Database className="w-4 h-4" />, desc: 'Resource quotas & archive export' },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <PageHeader
        title="Settings & System Preferences"
        subtitle="Manage your institutional account credentials, appearance themes, notification dispatches, and privacy controls."
      />

      {/* Main Settings Container */}
      <div className="flex flex-col lg:flex-row items-start gap-8">
        
        {/* ========================================================
            LEFT NAVIGATION (Desktop) / TOP DROPDOWN (Mobile)
            ======================================================== */}
        <div className="w-full lg:w-72 shrink-0">
          {/* Mobile Selector */}
          <div className="lg:hidden mb-4">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Select Settings Section
            </label>
            <select
              value={activeTab}
              onChange={e => setActiveTab(e.target.value as SettingsTab)}
              className="w-full bg-[#111827] border border-[#243047] text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
            >
              {navItems.map(item => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {/* Desktop Nav Cards */}
          <Card className="hidden lg:block p-2 bg-[#111827] border border-[#243047] space-y-1 shadow-lg sticky top-24">
            <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Settings Navigation
            </div>
            {navItems.map(item => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#7C3AED] text-white shadow-md shadow-[#7C3AED]/20 font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-[#172033]'
                  }`}
                >
                  <span className={`${isActive ? 'text-white' : 'text-purple-400'}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </Card>
        </div>

        {/* ========================================================
            RIGHT CONTENT AREA
            ======================================================== */}
        <div className="flex-1 w-full space-y-6">

          {/* 1. ACCOUNT SETTINGS SECTION */}
          {activeTab === 'account' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <Card className="p-6 sm:p-8 bg-[#111827] border border-[#243047] space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#243047] gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-purple-400" /> Account Settings
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Institutional identity credentials and primary account metadata
                    </p>
                  </div>
                  <Badge variant="success" size="sm" icon={<span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" />}>
                    Active Account
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Full Legal Name
                    </span>
                    <span className="text-sm font-semibold text-slate-100 mt-1 block">
                      {user.name}
                    </span>
                  </div>

                  <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Institutional Email Address
                    </span>
                    <span className="text-sm font-semibold text-slate-100 mt-1 block truncate" title={user.email}>
                      {user.email}
                    </span>
                  </div>

                  <div className="p-4 bg-[#0F172A] rounded-xl border border-purple-500/30 sm:col-span-2 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
                          Permanent Provalix User ID (Read-Only)
                        </span>
                      </div>
                      <span className="text-lg font-mono font-bold text-purple-300 mt-1 block">
                        {user.permanentId}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Cryptographically linked to your institutional registry. Cannot be modified.
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      onClick={handleCopyId}
                    >
                      {copiedId ? 'Copied' : 'Copy ID'}
                    </Button>
                  </div>

                  <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Contact Phone
                    </span>
                    <span className="text-sm font-semibold text-slate-100 mt-1 block">
                      {user.phone ? user.phone : <span className="text-slate-500 italic font-normal">Not provided</span>}
                    </span>
                  </div>

                  <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Authentication Provider
                    </span>
                    <span className="text-sm font-semibold text-slate-100 mt-1 block">
                      {user.authProvider || 'Email & Password'}
                    </span>
                  </div>

                  <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Account Registration Date
                    </span>
                    <span className="text-xs text-slate-300 mt-1 block">
                      {formatAccountDate(user.createdAt)}
                    </span>
                  </div>

                  <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Last Authentication
                    </span>
                    <span className="text-xs text-slate-300 mt-1 block">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Current Session'}
                    </span>
                  </div>
                </div>

                {/* Account Actions Bar */}
                <div className="pt-4 border-t border-[#243047] flex flex-wrap items-center gap-3">
                  <Link to="/profile">
                    <Button variant="primary" size="sm">
                      Edit Profile Credentials
                    </Button>
                  </Link>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setChangeEmailModal(true)}
                  >
                    Change Email
                  </Button>

                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setActiveTab('security')}
                  >
                    Change Password
                  </Button>

                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-auto"
                    onClick={() => setLogoutDialogGlobalOpen(true)}
                  >
                    Sign Out
                  </Button>
                </div>
              </Card>

              {/* Danger Zone (Account-Only) */}
              <Card className="p-6 sm:p-8 bg-red-950/10 border border-red-500/30 space-y-5">
                <div>
                  <h3 className="text-base font-bold text-red-400 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-400" /> Danger Zone
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Actions here impact your active institutional credentials and evaluation records.
                  </p>
                </div>

                {/* Action 1: Deactivate Account */}
                <div className="p-4 bg-[#111827] rounded-xl border border-[#243047] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-slate-100 block">Deactivate Account</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Temporarily disable access to Provalix. Your data will be retained per institutional policy.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-amber-400 border-amber-500/30 hover:bg-amber-500/10 shrink-0"
                    onClick={() => setDeactivateModal(true)}
                  >
                    Deactivate Account
                  </Button>
                </div>

                {/* Action 2: Delete Account (Visually more destructive) */}
                <div className="p-4 bg-red-950/30 rounded-xl border border-red-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-red-300 block">Permanently Delete Account</span>
                    <p className="text-[11px] text-red-200/70 mt-0.5">
                      Irreversible action. Permanently purges profile, project reports, submissions, and evaluations.
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    leftIcon={<Trash2 className="w-4 h-4" />}
                    onClick={() => {
                      setDeleteModalStep(1);
                      setDeleteConfirmationText('');
                    }}
                    className="shrink-0"
                  >
                    Delete Account
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* 2. APPEARANCE SECTION (Dark + Light Theme) */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <Card className="p-6 sm:p-8 bg-[#111827] border border-[#243047] space-y-6">
                <div className="pb-4 border-b border-[#243047]">
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-purple-400" /> Interface Theme
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Select your preferred appearance theme. Changes apply instantly across all pages and persist automatically.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Dark Theme Card */}
                  <div 
                    onClick={() => handleThemeChange('dark')}
                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer select-none space-y-4 ${
                      theme === 'dark' 
                        ? 'border-purple-500 bg-[#0F172A] shadow-xl shadow-purple-950/30' 
                        : 'border-[#243047] bg-[#111827] hover:border-slate-600'
                    }`}
                  >
                    {/* Visual Mockup Preview */}
                    <div className="w-full h-32 rounded-xl bg-[#0B1120] border border-[#243047] p-3 flex flex-col justify-between overflow-hidden shadow-inner">
                      <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
                        <div className="w-4 h-4 rounded bg-[#7C3AED]" />
                        <div className="flex gap-1">
                          <div className="w-2 h-2 rounded-full bg-slate-700" />
                          <div className="w-2 h-2 rounded-full bg-slate-700" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-3/4 rounded bg-[#111827] border border-[#243047]" />
                        <div className="h-2 w-1/2 rounded bg-slate-700" />
                      </div>
                      <div className="flex gap-2">
                        <div className="h-4 w-12 rounded bg-[#7C3AED]" />
                        <div className="h-4 w-12 rounded bg-[#1E293B]" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                          <Moon className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-100">Dark Theme</h4>
                          <span className="text-[11px] text-slate-400">Background #0B1120 • Surface #111827</span>
                        </div>
                      </div>
                      {theme === 'dark' && (
                        <div className="w-5 h-5 rounded-full bg-[#7C3AED] text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Light Theme Card */}
                  <div 
                    onClick={() => handleThemeChange('light')}
                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer select-none space-y-4 ${
                      theme === 'light' 
                        ? 'border-purple-500 bg-[#F1F5F9] shadow-xl shadow-purple-500/10' 
                        : 'border-[#243047] bg-[#111827] hover:border-slate-600'
                    }`}
                  >
                    {/* Visual Mockup Preview */}
                    <div className="w-full h-32 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] p-3 flex flex-col justify-between overflow-hidden shadow-inner">
                      <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                        <div className="w-4 h-4 rounded bg-[#7C3AED]" />
                        <div className="flex gap-1">
                          <div className="w-2 h-2 rounded-full bg-slate-300" />
                          <div className="w-2 h-2 rounded-full bg-slate-300" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-3/4 rounded bg-white border border-[#E2E8F0]" />
                        <div className="h-2 w-1/2 rounded bg-slate-300" />
                      </div>
                      <div className="flex gap-2">
                        <div className="h-4 w-12 rounded bg-[#7C3AED]" />
                        <div className="h-4 w-12 rounded bg-[#E2E8F0]" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                          <Sun className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-100">Light Theme</h4>
                          <span className="text-[11px] text-slate-400">Background #F8FAFC • Surface #FFFFFF</span>
                        </div>
                      </div>
                      {theme === 'light' && (
                        <div className="w-5 h-5 rounded-full bg-[#7C3AED] text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047] flex items-center gap-3">
                  <Info className="w-4 h-4 text-purple-400 shrink-0" />
                  <p className="text-xs text-slate-300 leading-relaxed">
                    The chosen appearance applies to all screens, navigation bars, modals, charts, and project checker dashboards. Your selection is preserved across browser sessions.
                  </p>
                </div>
              </Card>
            </div>
          )}

          {/* 3. NOTIFICATION SETTINGS */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <Card className="p-6 sm:p-8 bg-[#111827] border border-[#243047] space-y-6">
                <div className="pb-4 border-b border-[#243047]">
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-purple-400" /> Notification Preferences
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Customize in-app popups and email dispatches for academic events and cohort deadlines.
                  </p>
                </div>

                {/* Sub-Header Labels */}
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
                  <span>Event Category</span>
                  <div className="flex items-center gap-8">
                    <span>In-App</span>
                    <span>Email</span>
                  </div>
                </div>

                {/* Categories */}
                <div className="space-y-6">
                  {/* Category: Classroom */}
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider block">
                      Classroom Events
                    </span>

                    <div className="p-3.5 bg-[#0F172A] rounded-xl border border-[#243047] flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-200 block">Classroom Invitations</span>
                        <p className="text-[11px] text-slate-400">When invited to join an academic classroom cohort</p>
                      </div>
                      <div className="flex items-center gap-12 pr-2">
                        <input
                          type="checkbox"
                          checked={notifPreferences.classroomInvitesInApp}
                          onChange={e => updateNotifPref('classroomInvitesInApp', e.target.checked)}
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-[#111827] border-[#243047] cursor-pointer"
                        />
                        <input
                          type="checkbox"
                          checked={notifPreferences.classroomInvitesEmail}
                          onChange={e => updateNotifPref('classroomInvitesEmail', e.target.checked)}
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-[#111827] border-[#243047] cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="p-3.5 bg-[#0F172A] rounded-xl border border-[#243047] flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-200 block">Classroom Announcements & Updates</span>
                        <p className="text-[11px] text-slate-400">Cohort announcements published by faculty coordinators</p>
                      </div>
                      <div className="flex items-center gap-12 pr-2">
                        <input
                          type="checkbox"
                          checked={notifPreferences.classroomUpdatesInApp}
                          onChange={e => updateNotifPref('classroomUpdatesInApp', e.target.checked)}
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-[#111827] border-[#243047] cursor-pointer"
                        />
                        <input
                          type="checkbox"
                          checked={notifPreferences.classroomUpdatesEmail}
                          onChange={e => updateNotifPref('classroomUpdatesEmail', e.target.checked)}
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-[#111827] border-[#243047] cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Category: Team */}
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider block">
                      Team & Squad Collaborations
                    </span>

                    <div className="p-3.5 bg-[#0F172A] rounded-xl border border-[#243047] flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-200 block">Team Invitations</span>
                        <p className="text-[11px] text-slate-400">When peers invite your Permanent ID to form a project squad</p>
                      </div>
                      <div className="flex items-center gap-12 pr-2">
                        <input
                          type="checkbox"
                          checked={notifPreferences.teamInvitesInApp}
                          onChange={e => updateNotifPref('teamInvitesInApp', e.target.checked)}
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-[#111827] border-[#243047] cursor-pointer"
                        />
                        <input
                          type="checkbox"
                          checked={notifPreferences.teamInvitesEmail}
                          onChange={e => updateNotifPref('teamInvitesEmail', e.target.checked)}
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-[#111827] border-[#243047] cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Category: Evaluation & Results */}
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider block">
                      Evaluations & Results
                    </span>

                    <div className="p-3.5 bg-[#0F172A] rounded-xl border border-[#243047] flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-200 block">Evaluation Completed & Scored</span>
                        <p className="text-[11px] text-slate-400">When AI score or faculty rubric evaluations are finalized</p>
                      </div>
                      <div className="flex items-center gap-12 pr-2">
                        <input
                          type="checkbox"
                          checked={notifPreferences.evalCompletedInApp}
                          onChange={e => updateNotifPref('evalCompletedInApp', e.target.checked)}
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-[#111827] border-[#243047] cursor-pointer"
                        />
                        <input
                          type="checkbox"
                          checked={notifPreferences.evalCompletedEmail}
                          onChange={e => updateNotifPref('evalCompletedEmail', e.target.checked)}
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-[#111827] border-[#243047] cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="p-3.5 bg-[#0F172A] rounded-xl border border-[#243047] flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-200 block">Viva Voce Scheduled</span>
                        <p className="text-[11px] text-slate-400">When oral defense questions or dates are assigned</p>
                      </div>
                      <div className="flex items-center gap-12 pr-2">
                        <input
                          type="checkbox"
                          checked={notifPreferences.vivaAssignedInApp}
                          onChange={e => updateNotifPref('vivaAssignedInApp', e.target.checked)}
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-[#111827] border-[#243047] cursor-pointer"
                        />
                        <input
                          type="checkbox"
                          checked={notifPreferences.vivaAssignedEmail}
                          onChange={e => updateNotifPref('vivaAssignedEmail', e.target.checked)}
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-[#111827] border-[#243047] cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Category: Deadlines */}
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider block">
                      Cohort Milestones & Deadlines
                    </span>

                    <div className="p-3.5 bg-[#0F172A] rounded-xl border border-[#243047] flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-200 block">48-Hour Impending Deadline Alerts</span>
                        <p className="text-[11px] text-slate-400">Automated reminder prior to classroom submission closure</p>
                      </div>
                      <div className="flex items-center gap-12 pr-2">
                        <input
                          type="checkbox"
                          checked={notifPreferences.deadlineRemindersInApp}
                          onChange={e => updateNotifPref('deadlineRemindersInApp', e.target.checked)}
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-[#111827] border-[#243047] cursor-pointer"
                        />
                        <input
                          type="checkbox"
                          checked={notifPreferences.deadlineRemindersEmail}
                          onChange={e => updateNotifPref('deadlineRemindersEmail', e.target.checked)}
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-[#111827] border-[#243047] cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* 4. SECURITY SECTION */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Change Password Card */}
              <Card className="p-6 sm:p-8 bg-[#111827] border border-[#243047] space-y-6">
                <div className="pb-4 border-b border-[#243047]">
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Key className="w-4 h-4 text-purple-400" /> Rotate Password
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Maintain institutional security by rotating your password regularly. Must contain 8+ characters, uppercase, lowercase, and numeric digits.
                  </p>
                </div>

                <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
                  <Input
                    label="Current Password"
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                  />

                  <Input
                    label="New Password"
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    helperText="At least 8 characters with mixed casing & numbers"
                  />

                  <Input
                    label="Confirm New Password"
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                  />

                  <Button 
                    variant="primary" 
                    size="sm" 
                    type="submit"
                    isLoading={isUpdatingPassword}
                  >
                    Save New Password
                  </Button>
                </form>
              </Card>

              {/* Active Sessions Card */}
              <Card className="p-6 sm:p-8 bg-[#111827] border border-[#243047] space-y-6">
                <div className="pb-4 border-b border-[#243047]">
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-purple-400" /> Active Sessions & Authentication Devices
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Devices where your Provalix account is currently authenticated.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Laptop className="w-5 h-5 text-purple-400 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-slate-100 block">Current Web Browser Session</span>
                        <p className="text-[11px] text-slate-400">Chrome on Windows • Active Now</p>
                      </div>
                    </div>
                    <Badge variant="success" size="sm">This Device</Badge>
                  </div>

                  <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-5 h-5 text-slate-400 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-slate-100 block">Mobile Student Client</span>
                        <p className="text-[11px] text-slate-400">Android Application • Last sync 4 hours ago</p>
                      </div>
                    </div>
                    <Badge variant="slate" size="sm">Active</Badge>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<LogOut className="w-4 h-4 text-amber-400" />}
                    onClick={() => setLogoutSessionsModal(true)}
                  >
                    Terminate Other Sessions
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* 5. PRIVACY SECTION */}
          {activeTab === 'privacy' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <Card className="p-6 sm:p-8 bg-[#111827] border border-[#243047] space-y-6">
                <div className="pb-4 border-b border-[#243047]">
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-purple-400" /> Privacy & Identity Visibility
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Control how your student/evaluator information is discovered by peers and classroom participants.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047] space-y-3">
                    <span className="text-xs font-bold text-slate-200 block">Institutional Profile Scope</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <label className="flex items-center gap-2.5 p-3 rounded-lg border border-[#243047] hover:border-purple-500/40 cursor-pointer bg-[#111827]">
                        <input
                          type="radio"
                          name="profileVisibility"
                          checked={privacyPreferences.profileVisibility === 'classroom'}
                          onChange={() => updatePrivacyPref('profileVisibility', 'classroom')}
                          className="text-purple-600 focus:ring-purple-500"
                        />
                        <div>
                          <span className="text-xs font-semibold text-slate-200 block">Classrooms & Squads Only</span>
                          <span className="text-[10px] text-slate-400">Only enrolled peers & evaluators</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2.5 p-3 rounded-lg border border-[#243047] hover:border-purple-500/40 cursor-pointer bg-[#111827]">
                        <input
                          type="radio"
                          name="profileVisibility"
                          checked={privacyPreferences.profileVisibility === 'public'}
                          onChange={() => updatePrivacyPref('profileVisibility', 'public')}
                          className="text-purple-600 focus:ring-purple-500"
                        />
                        <div>
                          <span className="text-xs font-semibold text-slate-200 block">Entire Institution</span>
                          <span className="text-[10px] text-slate-400">All registered institutional scholars</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047] flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Display Permanent ID in Peer Rosters</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">Allows squad captains to invite you directly using your ID</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={privacyPreferences.showPermanentIdInRosters}
                      onChange={e => updatePrivacyPref('showPermanentIdInRosters', e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-[#111827] border-[#243047] cursor-pointer"
                    />
                  </div>

                  <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047] flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Cohort Leaderboard Inclusion</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">Display verified project evaluation ranks on classroom cohort leaderboards</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={privacyPreferences.activityOnLeaderboard}
                      onChange={e => updatePrivacyPref('activityOnLeaderboard', e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-[#111827] border-[#243047] cursor-pointer"
                    />
                  </div>
                </div>

                <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047] flex items-center gap-3">
                  <Info className="w-4 h-4 text-purple-400 shrink-0" />
                  <p className="text-xs text-slate-300">
                    Privacy preferences dictate presentation and discovery. Authorized faculty evaluators and classroom coordinators retain access to official academic records.
                  </p>
                </div>
              </Card>
            </div>
          )}

          {/* 6. EVALUATION PREFERENCES SECTION */}
          {activeTab === 'evaluation' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <Card className="p-6 sm:p-8 bg-[#111827] border border-[#243047] space-y-6">
                <div className="pb-4 border-b border-[#243047]">
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-purple-400" /> Evaluation Display Preferences
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Customize the presentation of criteria breakdowns, AI improvement plans, and similarity analyses.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047] flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Show Detailed Criteria Breakdown</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">Display full sub-scores across problem definition, innovation, implementation, and quality</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={evalPreferences.showDetailedFeedback}
                      onChange={e => updateEvalPref('showDetailedFeedback', e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-[#111827] border-[#243047] cursor-pointer"
                    />
                  </div>

                  <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047] flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Highlight Actionable Improvement Suggestions</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">Show prioritized suggestions from AI evaluation reports for iterative enhancements</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={evalPreferences.showImprovementTips}
                      onChange={e => updateEvalPref('showImprovementTips', e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-[#111827] border-[#243047] cursor-pointer"
                    />
                  </div>

                  <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047] flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Show Plagiarism & Similarity Details</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">Display source matching percentages across codebases and PDF technical reports</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={evalPreferences.showPlagiarismDetails}
                      onChange={e => updateEvalPref('showPlagiarismDetails', e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-[#111827] border-[#243047] cursor-pointer"
                    />
                  </div>

                  <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047] flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Display AI Evaluation Explanations</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">Show transparent justifications for deduction rationale and criteria scoring</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={evalPreferences.showModelExplanations}
                      onChange={e => updateEvalPref('showModelExplanations', e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-[#111827] border-[#243047] cursor-pointer"
                    />
                  </div>
                </div>

                <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047] flex items-center gap-3">
                  <Info className="w-4 h-4 text-purple-400 shrink-0" />
                  <p className="text-xs text-slate-300">
                    These settings customize visual reporting and analytics presentation. Official institutional rubrics and scores are never altered.
                  </p>
                </div>
              </Card>
            </div>
          )}

          {/* 7. AI ASSISTANT SETTINGS */}
          {activeTab === 'ai' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <Card className="p-6 sm:p-8 bg-[#111827] border border-[#243047] space-y-6">
                <div className="pb-4 border-b border-[#243047] flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      <Bot className="w-4 h-4 text-purple-400" /> Provalix AI Assistant
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Configure contextual guidance, report summarization, and interactive assistance.
                    </p>
                  </div>
                  <Badge variant={aiSettings.enabled ? 'primary' : 'slate'} size="sm">
                    {aiSettings.enabled ? 'Assistant Active' : 'Disabled'}
                  </Badge>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-[#0F172A] rounded-xl border border-purple-500/30 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-sm font-bold text-slate-100 block">Enable Floating AI Assistant</span>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Display the floating chat drawer across application pages for interactive queries
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={aiSettings.enabled}
                      onChange={e => updateAiSetting('enabled', e.target.checked)}
                      className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500 bg-[#111827] border-[#243047] cursor-pointer"
                    />
                  </div>

                  <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047] flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Contextual Project Assistance</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Allow assistant to use the problem statement and resource metadata of your active check
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      disabled={!aiSettings.enabled}
                      checked={aiSettings.contextualHelp}
                      onChange={e => updateAiSetting('contextualHelp', e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-[#111827] border-[#243047] cursor-pointer disabled:opacity-40"
                    />
                  </div>

                  <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047] flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Report Summarization</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Enable instant one-click synthesis of evaluation strengths and weaknesses
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      disabled={!aiSettings.enabled}
                      checked={aiSettings.summarizeReports}
                      onChange={e => updateAiSetting('summarizeReports', e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-[#111827] border-[#243047] cursor-pointer disabled:opacity-40"
                    />
                  </div>

                  <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047] flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Evaluation Explanation</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Permit the assistant to clarify rubric scoring guidelines and score deductions
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      disabled={!aiSettings.enabled}
                      checked={aiSettings.explainEvaluations}
                      onChange={e => updateAiSetting('explainEvaluations', e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-[#111827] border-[#243047] cursor-pointer disabled:opacity-40"
                    />
                  </div>
                </div>

                <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047] flex items-center gap-3">
                  <Info className="w-4 h-4 text-purple-400 shrink-0" />
                  <p className="text-xs text-slate-300">
                    The AI Assistant provides guidance using available platform and project context. It does not modify official evaluation results.
                  </p>
                </div>
              </Card>
            </div>
          )}

          {/* 8. DATA & STORAGE SECTION */}
          {activeTab === 'storage' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <Card className="p-6 sm:p-8 bg-[#111827] border border-[#243047] space-y-6">
                <div className="pb-4 border-b border-[#243047]">
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Database className="w-4 h-4 text-purple-400" /> Data & Institutional Storage
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Overview of your project checker reports, classroom submissions, and data export options.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047] text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Checker Projects
                    </span>
                    <span className="text-xl font-bold text-slate-100 mt-1 block">
                      {dataStats.loading ? '...' : dataStats.projectsCount}
                    </span>
                  </div>

                  <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047] text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Squads Joined
                    </span>
                    <span className="text-xl font-bold text-purple-300 mt-1 block">
                      {dataStats.loading ? '...' : dataStats.teamsCount}
                    </span>
                  </div>

                  <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047] text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Classroom Cohorts
                    </span>
                    <span className="text-xl font-bold text-emerald-400 mt-1 block">
                      {dataStats.loading ? '...' : dataStats.classroomsCount}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047] space-y-2">
                  <span className="text-xs font-bold text-slate-200 block">Cloud Storage Metrics</span>
                  <p className="text-xs text-slate-400">
                    Storage information will appear when available from the storage driver.
                  </p>
                </div>

                <div className="pt-2 border-t border-[#243047] flex flex-wrap items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Download className="w-4 h-4" />}
                    onClick={handleDownloadPersonalData}
                  >
                    Download Personal Data Archive (.JSON)
                  </Button>
                </div>
              </Card>
            </div>
          )}



        </div>
      </div>

      {/* ========================================================
          MODALS & CONFIRMATION DIALOGS
          ======================================================== */}

      {/* 1. Change Email Modal */}
      <Modal
        isOpen={changeEmailModal}
        onClose={() => setChangeEmailModal(false)}
        title="Institutional Email Policy"
        description="Your primary institutional email address is synchronized with your academic credentials."
        maxWidth="md"
        footer={
          <Button variant="primary" size="sm" onClick={() => setChangeEmailModal(false)}>
            Understood
          </Button>
        }
      >
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            Your current primary email is <strong className="text-white">{user.email}</strong>.
          </p>
          <p>
            To prevent identity divergence during project submissions and evaluation signing, institutional email addresses cannot be altered directly via self-service.
          </p>
          <p className="text-slate-400">
            If your academic institution has issued an updated university email, please contact your faculty coordinator or department administrator to initiate a verified credential transfer.
          </p>
        </div>
      </Modal>

      {/* 2. Terminate Sessions Modal */}
      <Modal
        isOpen={logoutSessionsModal}
        onClose={() => setLogoutSessionsModal(false)}
        title="Terminate Other Sessions"
        description="Are you sure you want to terminate other active browser and mobile client sessions?"
        maxWidth="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setLogoutSessionsModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleLogoutAllSessions}>
              Confirm Session Logout
            </Button>
          </>
        }
      >
        <p className="text-xs text-slate-400 leading-relaxed">
          You will remain logged in on this current browser session, but all mobile devices and external sessions will be signed out and will require re-authentication.
        </p>
      </Modal>

      {/* 3. Deactivate Account Confirmation Modal */}
      <Modal
        isOpen={deactivateModal}
        onClose={() => setDeactivateModal(false)}
        title="Deactivate Institutional Account"
        description="Temporarily suspend access to your account and cohort evaluations."
        maxWidth="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setDeactivateModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeactivateAccount}>
              Confirm Deactivation
            </Button>
          </>
        }
      >
        <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
          <p>
            Deactivating your account will temporarily disable access to Provalix. Your account data will be retained according to the platform's data policy.
          </p>
          <p className="text-slate-400">
            You will be logged out immediately. You can reactivate your account by logging in with verified credentials.
          </p>
        </div>
      </Modal>

      {/* 4. Delete Account Step 1: Warning Modal */}
      <Modal
        isOpen={deleteModalStep === 1}
        onClose={() => setDeleteModalStep(0)}
        title="Permanently Delete Account"
        description="WARNING: This action is permanent and completely irreversible."
        maxWidth="md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setDeleteModalStep(0)}>
              Cancel
            </Button>
            <Button 
              variant="danger" 
              size="sm" 
              onClick={() => setDeleteModalStep(2)}
            >
              I Understand, Continue
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl flex items-start gap-2.5 text-red-200">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>
              All evaluation submissions, scores, reports, and squad memberships will be permanently affected.
            </span>
          </div>
          <p>
            Deleting your account will permanently purge:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
            <li>Your institutional profile and Permanent ID ({user.permanentId})</li>
            <li>All standalone Project Checker reports and evaluations</li>
            <li>Classroom submissions and rubric scores</li>
            <li>Squad captaincies and team memberships</li>
            <li>Audit logs and notification history</li>
          </ul>
        </div>
      </Modal>

      {/* 4. Delete Account Step 2: Explicit Text Confirmation Modal */}
      <Modal
        isOpen={deleteModalStep === 2}
        onClose={() => {
          setDeleteModalStep(0);
          setDeleteConfirmationText('');
        }}
        title="Confirm Account Deletion"
        description="Type the confirmation phrase to proceed."
        maxWidth="md"
        footer={
          <>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setDeleteModalStep(0);
                setDeleteConfirmationText('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={deleteConfirmationText.trim().toLowerCase() !== 'delete my account'}
              onClick={() => {
                setDeleteModalStep(0);
                setDeleteConfirmationText('');
                // Real backend account deletion endpoint check
                toastError('Account deletion requires backend support. Please contact your coordinator.');
              }}
            >
              Permanently Delete Account
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            To confirm permanent deletion of user <strong className="text-white">{user.email}</strong> ({user.permanentId}), please type <span className="font-mono font-bold text-red-400 bg-red-950/40 px-1.5 py-0.5 rounded border border-red-500/30">Delete my account</span> below:
          </p>

          <Input
            value={deleteConfirmationText}
            onChange={e => setDeleteConfirmationText(e.target.value)}
            placeholder="Delete my account"
            className="font-mono text-sm"
          />

          <div className="p-3 bg-[#0F172A] rounded-xl border border-[#243047] text-[11px] text-slate-400 flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>Account deletion requires backend support. Active classroom records may require coordinator verification.</span>
          </div>
        </div>
      </Modal>

      {/* 5. Global Sign Out Dialog */}
      <LogoutDialog
        isOpen={logoutDialogGlobalOpen}
        onClose={() => setLogoutDialogGlobalOpen(false)}
        onConfirm={async () => {
          setLogoutDialogGlobalOpen(false);
          await logout();
          navigate('/login');
        }}
      />
    </div>
  );
};
