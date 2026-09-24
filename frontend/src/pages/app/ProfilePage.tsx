import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Modal } from '../../components/ui/Modal';
import { Progress } from '../../components/ui/Progress';
import { tokenStorage } from '../../services/api/tokenStorage';
import { classroomService } from '../../services/classroomService';
import { teamService } from '../../services/teamService';
import { projectCheckerService, ProjectCheckerProject } from '../../services/projectCheckerService';
import { notificationService } from '../../services/notificationService';
import { Classroom, Team, AppNotification, UserSkills } from '../../types';
import { 
  User as UserIcon, 
  Mail, 
  School, 
  ShieldCheck, 
  Edit3, 
  Copy, 
  Check,
  FileText,
  GraduationCap,
  Sparkles,
  BookOpen,
  Code2,
  Cpu,
  Layers,
  Compass,
  Clock,
  CheckCircle2,
  Plus,
  X,
  Users,
  BarChart3,
  Lock,
  ChevronRight,
  Camera,
  Upload,
  Loader2
} from 'lucide-react';

interface RecentActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'project' | 'team' | 'classroom' | 'notification' | 'evaluation';
}

export const ProfilePage: React.FC = () => {
  const { user, updateProfile, uploadPhoto } = useAuth();
  const { success, error: toastError } = useToast();

  const [copiedId, setCopiedId] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'personal' | 'academic' | 'skills' | 'account'>('personal');
  const [isSaving, setIsSaving] = useState(false);

  // Profile photo upload refs and state
  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Real backend metrics state
  const [_loadingData, setLoadingData] = useState(true);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<ProjectCheckerProject[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Edit form state
  const [formName, setFormName] = useState(user.name || '');
  const [formDepartment, setFormDepartment] = useState(user.department || '');
  const [formYear, setFormYear] = useState(user.year || '');
  const [formCollege, setFormCollege] = useState(user.college || '');
  const [formAvatar, setFormAvatar] = useState(user.avatar || user.profileImage || '');
  
  // Personal information edit state
  const [formPhone, setFormPhone] = useState(user.phone || '');
  const [formDob, setFormDob] = useState(user.dob || '');
  const [formLocation, setFormLocation] = useState(user.location || '');
  const [formBio, setFormBio] = useState(user.bio || '');

  // Academic information edit state
  const [formDegree, setFormDegree] = useState(user.degree || '');
  const [formSection, setFormSection] = useState(user.section || '');
  const [formRegisterNumber, setFormRegisterNumber] = useState(user.registerNumber || '');
  const [formExpectedGraduationYear, setFormExpectedGraduationYear] = useState(user.expectedGraduationYear || '');

  // Skills & Interests edit state
  const [formLanguages, setFormLanguages] = useState<string[]>(user.skills?.languages || []);
  const [formTechnologies, setFormTechnologies] = useState<string[]>(user.skills?.technologies || []);
  const [formFrameworks, setFormFrameworks] = useState<string[]>(user.skills?.frameworks || []);
  const [formInterests, setFormInterests] = useState<string[]>(user.skills?.interests || []);

  // Tag inputs state for modal
  const [inputLanguage, setInputLanguage] = useState('');
  const [inputTechnology, setInputTechnology] = useState('');
  const [inputFramework, setInputFramework] = useState('');
  const [inputInterest, setInputInterest] = useState('');

  // Synchronize form when user object updates
  useEffect(() => {
    setFormName(user.name || '');
    setFormDepartment(user.department || '');
    setFormYear(user.year || '');
    setFormCollege(user.college || '');
    setFormAvatar(user.avatar || user.profileImage || '');
    setFormPhone(user.phone || '');
    setFormDob(user.dob || '');
    setFormLocation(user.location || '');
    setFormBio(user.bio || '');
    setFormDegree(user.degree || '');
    setFormSection(user.section || '');
    setFormRegisterNumber(user.registerNumber || '');
    setFormExpectedGraduationYear(user.expectedGraduationYear || '');
    setFormLanguages(user.skills?.languages || []);
    setFormTechnologies(user.skills?.technologies || []);
    setFormFrameworks(user.skills?.frameworks || []);
    setFormInterests(user.skills?.interests || []);
  }, [user]);

  // Load real data for classrooms, teams, projects, notifications
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoadingData(true);
        const [clsRes, teamRes, projRes, notifRes] = await Promise.allSettled([
          classroomService.getClassrooms(),
          teamService.getTeams(),
          projectCheckerService.listProjects({ limit: 10 }),
          notificationService.getNotifications(user.id),
        ]);

        if (isMounted) {
          if (clsRes.status === 'fulfilled' && Array.isArray(clsRes.value)) {
            setClassrooms(clsRes.value);
          }
          if (teamRes.status === 'fulfilled' && Array.isArray(teamRes.value)) {
            setTeams(teamRes.value);
          }
          if (projRes.status === 'fulfilled' && Array.isArray(projRes.value)) {
            setProjects(projRes.value);
          }
          if (notifRes.status === 'fulfilled' && Array.isArray(notifRes.value)) {
            setNotifications(notifRes.value);
          }
        }
      } catch (err) {
        console.warn('Failed to load profile data overview:', err);
      } finally {
        if (isMounted) setLoadingData(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [user.id]);

  // Copy Permanent User ID
  const handleCopyId = () => {
    navigator.clipboard.writeText(user.permanentId);
    setCopiedId(true);
    success(`Permanent User ID (${user.permanentId}) copied to clipboard.`);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Open modal focused on specific tab
  const handleOpenEditModal = (tab: 'personal' | 'academic' | 'skills' | 'account' = 'personal') => {
    setActiveTab(tab);
    setEditModalOpen(true);
  };

  // Tag list helpers
  const handleAddTag = (
    type: 'languages' | 'technologies' | 'frameworks' | 'interests',
    value: string
  ) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    if (type === 'languages') {
      if (!formLanguages.includes(trimmed)) setFormLanguages([...formLanguages, trimmed]);
      setInputLanguage('');
    } else if (type === 'technologies') {
      if (!formTechnologies.includes(trimmed)) setFormTechnologies([...formTechnologies, trimmed]);
      setInputTechnology('');
    } else if (type === 'frameworks') {
      if (!formFrameworks.includes(trimmed)) setFormFrameworks([...formFrameworks, trimmed]);
      setInputFramework('');
    } else if (type === 'interests') {
      if (!formInterests.includes(trimmed)) setFormInterests([...formInterests, trimmed]);
      setInputInterest('');
    }
  };

  const handleRemoveTag = (
    type: 'languages' | 'technologies' | 'frameworks' | 'interests',
    tag: string
  ) => {
    if (type === 'languages') setFormLanguages(formLanguages.filter(t => t !== tag));
    if (type === 'technologies') setFormTechnologies(formTechnologies.filter(t => t !== tag));
    if (type === 'frameworks') setFormFrameworks(formFrameworks.filter(t => t !== tag));
    if (type === 'interests') setFormInterests(formInterests.filter(t => t !== tag));
  };

  // Save profile changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toastError('Full Name is required.');
      return;
    }

    try {
      setIsSaving(true);
      const skillsData: UserSkills = {
        languages: formLanguages,
        technologies: formTechnologies,
        frameworks: formFrameworks,
        interests: formInterests,
      };

      await updateProfile({
        name: formName.trim(),
        department: formDepartment.trim() || undefined,
        year: formYear.trim() || undefined,
        college: formCollege.trim() || undefined,
        avatar: formAvatar.trim() || undefined,
        profileImage: formAvatar.trim() || undefined,
        phone: formPhone.trim() || undefined,
        dob: formDob.trim() || undefined,
        location: formLocation.trim() || undefined,
        bio: formBio.trim() || undefined,
        degree: formDegree.trim() || undefined,
        section: formSection.trim() || undefined,
        registerNumber: formRegisterNumber.trim() || undefined,
        expectedGraduationYear: formExpectedGraduationYear.trim() || undefined,
        skills: skillsData,
      });

      setEditModalOpen(false);
      success('Profile updated successfully.');
    } catch (err: any) {
      toastError(err?.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    // Validate format
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExts = ['jpg', 'jpeg', 'png', 'webp'];

    if (!validTypes.includes(file.type) && (!ext || !validExts.includes(ext))) {
      toastError('Invalid image format. Supported formats: JPG, PNG, WEBP.');
      return;
    }

    // Validate size (max 5MB)
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toastError('File size exceeds 5MB limit. Please choose a smaller image.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
    setFormAvatar(previewUrl);

    try {
      setIsUploadingPhoto(true);
      await uploadPhoto(file);
      success('Profile photo updated successfully.');
    } catch (err: any) {
      setPhotoPreview(null);
      setFormAvatar(user.avatar || user.profileImage || '');
      toastError(err?.message || 'Failed to upload profile photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Dynamic Profile Completion calculation
  const profileCompletion = useMemo(() => {
    const checklist = [
      { name: 'Full Name', done: Boolean(user.name?.trim()) },
      { name: 'Institutional Email', done: Boolean(user.email?.trim()) },
      { name: 'Academic Institution', done: Boolean(user.college?.trim()) },
      { name: 'Department', done: Boolean(user.department?.trim()) },
      { name: 'Academic Standing / Year', done: Boolean(user.year?.trim()) },
      { name: 'Contact Phone Number', done: Boolean(user.phone?.trim()) },
      { name: 'Personal Bio', done: Boolean(user.bio?.trim()) },
      { name: 'Degree / Program', done: Boolean(user.degree?.trim()) },
      { name: 'Location or DOB', done: Boolean(user.location?.trim() || user.dob?.trim()) },
      { name: 'Profile Avatar', done: Boolean(user.avatar?.trim() || user.profileImage?.trim()) },
      { 
        name: 'Technical Skills & Interests', 
        done: Boolean(
          user.skills && (
            (user.skills.languages && user.skills.languages.length > 0) ||
            (user.skills.technologies && user.skills.technologies.length > 0) ||
            (user.skills.frameworks && user.skills.frameworks.length > 0) ||
            (user.skills.interests && user.skills.interests.length > 0)
          )
        ) 
      },
    ];

    const completedCount = checklist.filter(c => c.done).length;
    const percentage = Math.round((completedCount / checklist.length) * 100);
    const missing = checklist.filter(c => !c.done).map(c => c.name);

    return { percentage, missing };
  }, [user]);

  // Classroom & Role analysis
  const classroomOverview = useMemo(() => {
    const joined = classrooms.length;
    const owned = classrooms.filter(c => c.ownerId === user.id || c.currentUserRole === 'OWNER').length;
    const active = classrooms.filter(c => c.status === 'Active').length;

    const rolesList = classrooms.map(c => {
      let roleLabel = 'Member';
      let badgeVariant: 'primary' | 'slate' | 'amber' = 'slate';

      if (c.ownerId === user.id || c.currentUserRole === 'OWNER') {
        roleLabel = 'Owner / Coordinator';
        badgeVariant = 'primary';
      } else if (c.currentUserRole === 'EVALUATOR' || c.evaluators?.some(e => e.id === user.id)) {
        roleLabel = 'Faculty Evaluator';
        badgeVariant = 'amber';
      }

      return {
        id: c.id,
        name: c.name,
        code: c.code,
        role: roleLabel,
        variant: badgeVariant,
      };
    });

    return { joined, owned, active, rolesList };
  }, [classrooms, user.id]);

  // Project & Evaluation Metrics
  const projectMetrics = useMemo(() => {
    const projectsCount = projects.length;
    const teamsCount = teams.length;
    const submissionsCount = classrooms.reduce((acc, c) => acc + (c.submissionCount || 0), 0);

    // Compute average evaluation score only if evaluated submissions exist with real scores
    const evaluatedProjects = projects.filter(p => p.overallScore !== null && p.overallScore !== undefined);
    let avgScore: number | null = null;
    if (evaluatedProjects.length > 0) {
      const sum = evaluatedProjects.reduce((acc, p) => acc + (p.overallScore || 0), 0);
      avgScore = Math.round((sum / evaluatedProjects.length) * 10) / 10;
    }

    return {
      projectsSubmitted: projectsCount,
      projectCheckerReports: projectsCount,
      classroomSubmissions: submissionsCount,
      teamsJoined: teamsCount,
      averageScore: avgScore,
      evaluatedCount: evaluatedProjects.length,
    };
  }, [projects, teams, classrooms]);

  // Formatted date string helpers
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

  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Recently';
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  // Recent activity list
  const recentActivities: RecentActivityItem[] = useMemo(() => {
    const items: RecentActivityItem[] = [];

    // From notifications
    notifications.forEach(n => {
      items.push({
        id: `notif-${n.id}`,
        title: n.title,
        description: n.message,
        timestamp: n.createdAt,
        type: 'notification',
      });
    });

    // From projects
    projects.forEach(p => {
      items.push({
        id: `proj-${p.id}`,
        title: `Project Check: ${p.title}`,
        description: p.overallScore !== null && p.overallScore !== undefined 
          ? `AI Evaluation completed with score ${p.overallScore}/100` 
          : 'Standalone project report uploaded for review',
        timestamp: p.createdAt,
        type: 'project',
      });
    });

    // From teams
    teams.forEach(t => {
      items.push({
        id: `team-${t.id}`,
        title: `Joined Squad: ${t.name}`,
        description: `Team code: ${t.code} (${t.members?.length || 1} members)`,
        timestamp: t.createdAt,
        type: 'team',
      });
    });

    // Sort descending by timestamp
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return items.slice(0, 6);
  }, [notifications, projects, teams]);

  // Auth provider display
  const authMethodDisplay = useMemo(() => {
    if (user.authProvider) return user.authProvider;
    const token = tokenStorage.getAccessToken();
    if (token) return 'Email & Password';
    return 'Authenticated Session';
  }, [user.authProvider]);

  // Skills chips
  const userLanguages = user.skills?.languages || [];
  const userTechnologies = user.skills?.technologies || [];
  const userFrameworks = user.skills?.frameworks || [];
  const userInterests = user.skills?.interests || [];
  const hasSkills = userLanguages.length > 0 || userTechnologies.length > 0 || userFrameworks.length > 0 || userInterests.length > 0;

  // Initials for avatar fallback
  const initials = useMemo(() => {
    if (!user.name) return 'PR';
    const parts = user.name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [user.name]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <PageHeader
        title="Institutional Credentials & Profile"
        subtitle="Manage your Provalix institutional identity, academic standing, and contextual classroom roles. Your Permanent User ID is required for team rosters and classroom enrollments."
        showDemoBadge={false}
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              leftIcon={copiedId ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              onClick={handleCopyId}
            >
              {copiedId ? 'Copied ID' : 'Copy User ID'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Camera className="w-4 h-4 text-purple-400" />}
              onClick={() => heroFileInputRef.current?.click()}
              disabled={isUploadingPhoto}
            >
              {isUploadingPhoto ? 'Uploading...' : 'Upload Photo'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Edit3 className="w-4 h-4" />}
              onClick={() => handleOpenEditModal('personal')}
            >
              Edit Profile
            </Button>
          </div>
        }
      />

      {/* 1. PROFILE HERO */}
      <Card className="p-6 sm:p-8 bg-[#111827] border border-[#243047] relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          {/* Avatar and Primary Identity */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="relative group shrink-0">
                <input
                  ref={heroFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handlePhotoUpload(f);
                    e.target.value = '';
                  }}
                />
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-purple-950/90 to-[#0F172A] text-purple-300 font-black text-2xl sm:text-3xl flex items-center justify-center border-2 border-purple-500/30 overflow-hidden shadow-lg shadow-purple-950/40 relative">
                  {photoPreview || user.avatar || user.profileImage ? (
                    <img 
                      src={photoPreview || user.avatar || user.profileImage} 
                      alt={user.name} 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span>{initials}</span>
                  )}

                  {/* Hover overlay for instant camera upload */}
                  <button
                    type="button"
                    onClick={() => heroFileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold gap-1 backdrop-blur-xs cursor-pointer focus:opacity-100 focus:outline-none"
                    title="Upload Profile Photo (JPG, PNG, WEBP)"
                    aria-label="Upload Profile Photo"
                  >
                    {isUploadingPhoto ? (
                      <Loader2 className="w-5 h-5 text-purple-300 animate-spin" />
                    ) : (
                      <>
                        <Camera className="w-5 h-5 text-purple-300" />
                        <span>Change</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Action badge button in corner */}
                <button
                  type="button"
                  onClick={() => heroFileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="absolute -bottom-1 -right-1 bg-[#7C3AED] hover:bg-[#6D28D9] text-white p-1.5 rounded-full border-2 border-[#111827] shadow-sm transition-transform hover:scale-110 cursor-pointer"
                  title="Upload Profile Photo"
                  aria-label="Upload Profile Photo"
                >
                  {isUploadingPhoto ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Explicit text button for mobile and quick access */}
              <button
                type="button"
                onClick={() => heroFileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Camera className="w-3 h-3" />
                <span>Upload Photo</span>
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">
                  {user.name}
                </h2>
                <Badge variant="success" size="sm" icon={<span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" />}>
                  Active Account
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                <span className="flex items-center gap-1 text-slate-300">
                  <Mail className="w-3.5 h-3.5 text-purple-400" />
                  {user.email}
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1 text-slate-400">
                  <School className="w-3.5 h-3.5 text-slate-400" />
                  {user.college || 'Institution Not provided'}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1 flex-wrap">
                {user.department && (
                  <Badge variant="slate" size="sm" icon={<BookOpen className="w-3 h-3 text-slate-400" />}>
                    {user.department}
                  </Badge>
                )}
                {user.year && (
                  <Badge variant="primary" size="sm" icon={<GraduationCap className="w-3 h-3 text-purple-300" />}>
                    {user.year}
                  </Badge>
                )}
                {classroomOverview.joined > 0 ? (
                  <Badge variant="amber" size="sm" icon={<Users className="w-3 h-3 text-amber-400" />}>
                    {classroomOverview.owned > 0 ? `${classroomOverview.owned} Classroom Owned` : `${classroomOverview.joined} Classrooms Enrolled`}
                  </Badge>
                ) : (
                  <Badge variant="slate" size="sm" className="text-slate-400 border-slate-700/60">
                    Contextual Roles Active
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* PERMANENT USER ID BOX (Prominent Visual Anchor) */}
          <div className="bg-[#0F172A] border border-purple-500/40 p-4 sm:p-5 rounded-2xl flex flex-col items-start lg:items-end shrink-0 w-full lg:w-auto shadow-inner">
            <div className="flex items-center justify-between w-full lg:w-auto gap-3">
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block">
                Permanent User ID
              </span>
              <span className="text-[10px] bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded border border-purple-500/20 font-medium">
                Verified Credential
              </span>
            </div>
            
            <div className="flex items-center gap-2.5 mt-2">
              <span className="font-mono text-xl sm:text-2xl font-black text-purple-300 tracking-wider">
                {user.permanentId}
              </span>
              <button
                onClick={handleCopyId}
                className="p-2 bg-[#111827] rounded-xl border border-[#243047] hover:bg-[#1e293b] hover:border-purple-500/50 transition-all text-slate-300 active:scale-95 cursor-pointer"
                title="Copy Permanent User ID to clipboard"
                aria-label="Copy User ID"
              >
                {copiedId ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-purple-400" />}
              </button>
            </div>
            
            <span className="text-[11px] text-slate-400 mt-1.5 leading-tight">
              Share this permanent ID for squad rosters and classroom evaluation panels.
            </span>
          </div>
        </div>
      </Card>

      {/* 9. PROFILE COMPLETION CARD */}
      <Card className="p-5 sm:p-6 bg-[#111827] border border-[#243047]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100">Institutional Profile Completion</h3>
                <span className="text-xs font-mono font-bold text-purple-400 bg-purple-500/15 px-2 py-0.5 rounded-full border border-purple-500/30">
                  {profileCompletion.percentage}%
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Calculated dynamically from verified profile attributes and academic credentials.
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-purple-400 hover:text-purple-300 self-start sm:self-auto"
            onClick={() => handleOpenEditModal('personal')}
          >
            Update Missing Fields
          </Button>
        </div>

        <div className="space-y-3">
          <Progress value={profileCompletion.percentage} max={100} variant="primary" size="md" />

          {profileCompletion.missing.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 pt-1">
              <span className="text-slate-400 font-medium">Complete your profile by adding:</span>
              {profileCompletion.missing.slice(0, 4).map((field, idx) => (
                <span 
                  key={field} 
                  className="inline-flex items-center gap-1 bg-[#0F172A] border border-[#243047] text-slate-300 px-2 py-0.5 rounded-md hover:border-purple-500/40 cursor-pointer transition-colors"
                  onClick={() => handleOpenEditModal(field.includes('Skills') ? 'skills' : field.includes('Degree') || field.includes('Academic') ? 'academic' : 'personal')}
                >
                  <Plus className="w-2.5 h-2.5 text-purple-400" />
                  {field}
                  {idx < Math.min(profileCompletion.missing.length, 4) - 1 ? '' : ''}
                </span>
              ))}
              {profileCompletion.missing.length > 4 && (
                <span className="text-slate-500 text-[11px]">+{profileCompletion.missing.length - 4} more</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium pt-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>All institutional profile credentials are fully verified and up to date!</span>
            </div>
          )}
        </div>
      </Card>

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Personal Information & Academic Information */}
        <div className="space-y-8">
          
          {/* 2. PERSONAL INFORMATION */}
          <Card className="p-6 bg-[#111827] border border-[#243047] space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#243047]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Personal Information</h3>
                  <p className="text-xs text-slate-400">Institutional identity and contact credentials</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-purple-400 hover:text-purple-300"
                onClick={() => handleOpenEditModal('personal')}
              >
                Edit
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-3.5 bg-[#0F172A] rounded-xl border border-[#243047]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Full Name
                </span>
                <span className="text-sm font-semibold text-slate-100 mt-1 block">
                  {user.name || <span className="text-slate-500 italic font-normal">Not provided</span>}
                </span>
              </div>

              <div className="p-3.5 bg-[#0F172A] rounded-xl border border-[#243047]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Email Address
                </span>
                <span className="text-sm font-semibold text-slate-100 mt-1 block truncate" title={user.email}>
                  {user.email || <span className="text-slate-500 italic font-normal">Not provided</span>}
                </span>
              </div>

              <div className="p-3.5 bg-[#0F172A] rounded-xl border border-[#243047]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Phone Number
                </span>
                <span className="text-sm font-semibold text-slate-100 mt-1 block">
                  {user.phone ? user.phone : <span className="text-slate-500 italic font-normal">Not provided</span>}
                </span>
              </div>

              <div className="p-3.5 bg-[#0F172A] rounded-xl border border-[#243047]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Date of Birth
                </span>
                <span className="text-sm font-semibold text-slate-100 mt-1 block">
                  {user.dob ? user.dob : <span className="text-slate-500 italic font-normal">Not provided</span>}
                </span>
              </div>

              <div className="p-3.5 bg-[#0F172A] rounded-xl border border-[#243047] sm:col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Location / Campus
                </span>
                <span className="text-sm font-semibold text-slate-100 mt-1 block">
                  {user.location ? user.location : <span className="text-slate-500 italic font-normal">Not provided</span>}
                </span>
              </div>

              <div className="p-3.5 bg-[#0F172A] rounded-xl border border-[#243047] sm:col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Bio / Summary
                </span>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {user.bio ? user.bio : <span className="text-slate-500 italic font-normal">Not provided</span>}
                </p>
              </div>
            </div>
          </Card>

          {/* 3. ACADEMIC INFORMATION */}
          <Card className="p-6 bg-[#111827] border border-[#243047] space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#243047]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Academic Information</h3>
                  <p className="text-xs text-slate-400">Institutional standing, department, and degree track</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-purple-400 hover:text-purple-300"
                onClick={() => handleOpenEditModal('academic')}
              >
                Edit
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-3.5 bg-[#0F172A] rounded-xl border border-[#243047] sm:col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  College / Institution
                </span>
                <span className="text-sm font-semibold text-slate-100 mt-1 block">
                  {user.college || <span className="text-slate-500 italic font-normal">Not provided</span>}
                </span>
              </div>

              <div className="p-3.5 bg-[#0F172A] rounded-xl border border-[#243047]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Degree / Program
                </span>
                <span className="text-sm font-semibold text-slate-100 mt-1 block">
                  {user.degree ? user.degree : <span className="text-slate-500 italic font-normal">Not provided</span>}
                </span>
              </div>

              <div className="p-3.5 bg-[#0F172A] rounded-xl border border-[#243047]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Department
                </span>
                <span className="text-sm font-semibold text-slate-100 mt-1 block">
                  {user.department || <span className="text-slate-500 italic font-normal">Not provided</span>}
                </span>
              </div>

              <div className="p-3.5 bg-[#0F172A] rounded-xl border border-[#243047]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Academic Year
                </span>
                <span className="text-sm font-semibold text-slate-100 mt-1 block">
                  {user.year || <span className="text-slate-500 italic font-normal">Not provided</span>}
                </span>
              </div>

              <div className="p-3.5 bg-[#0F172A] rounded-xl border border-[#243047]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Section
                </span>
                <span className="text-sm font-semibold text-slate-100 mt-1 block">
                  {user.section ? user.section : <span className="text-slate-500 italic font-normal">Not provided</span>}
                </span>
              </div>

              <div className="p-3.5 bg-[#0F172A] rounded-xl border border-[#243047]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Register / Roll Number
                </span>
                <span className="text-sm font-mono font-semibold text-slate-100 mt-1 block">
                  {user.registerNumber ? user.registerNumber : <span className="text-slate-500 italic font-normal font-sans">Not provided</span>}
                </span>
              </div>

              <div className="p-3.5 bg-[#0F172A] rounded-xl border border-[#243047]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Expected Graduation
                </span>
                <span className="text-sm font-semibold text-slate-100 mt-1 block">
                  {user.expectedGraduationYear ? user.expectedGraduationYear : <span className="text-slate-500 italic font-normal">Not provided</span>}
                </span>
              </div>
            </div>
          </Card>

          {/* 8. SKILLS & INTERESTS */}
          <Card className="p-6 bg-[#111827] border border-[#243047] space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#243047]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Code2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Skills & Technical Interests</h3>
                  <p className="text-xs text-slate-400">Programming languages, toolchains, and focus areas</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-purple-400 hover:text-purple-300"
                onClick={() => handleOpenEditModal('skills')}
              >
                Edit
              </Button>
            </div>

            {hasSkills ? (
              <div className="space-y-4">
                {userLanguages.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Programming Languages
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {userLanguages.map(lang => (
                        <Badge key={lang} variant="primary" size="sm" icon={<Code2 className="w-3 h-3 text-purple-300" />}>
                          {lang}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {userTechnologies.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Technologies & Tools
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {userTechnologies.map(tech => (
                        <Badge key={tech} variant="slate" size="sm" icon={<Cpu className="w-3 h-3 text-slate-400" />}>
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {userFrameworks.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Frameworks & Libraries
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {userFrameworks.map(fw => (
                        <Badge key={fw} variant="slate" size="sm" icon={<Layers className="w-3 h-3 text-slate-400" />}>
                          {fw}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {userInterests.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Areas of Interest & Research
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {userInterests.map(interest => (
                        <Badge key={interest} variant="amber" size="sm" icon={<Compass className="w-3 h-3 text-amber-400" />}>
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 bg-[#0F172A] rounded-xl border border-dashed border-[#243047] text-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto border border-purple-500/20">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">No skills or interests added yet</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Showcase your technical stack, programming languages, and research interests for peer invitations and evaluators.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => handleOpenEditModal('skills')}
                >
                  Add Skills & Interests
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Account Information, Classroom Overview, Project Stats, Recent Activity */}
        <div className="space-y-8">
          
          {/* 4. PROVALIX ACCOUNT INFORMATION */}
          <Card className="p-6 bg-[#111827] border border-[#243047] space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#243047]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Account Information</h3>
                  <p className="text-xs text-slate-400">Security metadata, authentication provider, and system timestamps</p>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider bg-[#0F172A] px-2.5 py-1 rounded-md border border-[#243047]">
                System Managed
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-3.5 bg-[#0F172A] rounded-xl border border-[#243047]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Permanent User ID
                </span>
                <span className="text-sm font-mono font-bold text-purple-300 mt-1 block">
                  {user.permanentId}
                </span>
              </div>

              <div className="p-3.5 bg-[#0F172A] rounded-xl border border-[#243047]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Account Status
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-sm font-semibold text-emerald-400">Active Account</span>
                </div>
              </div>

              <div className="p-3.5 bg-[#0F172A] rounded-xl border border-[#243047]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Authentication Method
                </span>
                <span className="text-sm font-semibold text-slate-200 mt-1 block">
                  {authMethodDisplay}
                </span>
              </div>

              <div className="p-3.5 bg-[#0F172A] rounded-xl border border-[#243047]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Profile Completion
                </span>
                <span className="text-sm font-semibold text-purple-300 mt-1 block">
                  {profileCompletion.percentage}% Complete
                </span>
              </div>

              <div className="p-3.5 bg-[#0F172A] rounded-xl border border-[#243047]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Account Created
                </span>
                <span className="text-xs font-medium text-slate-300 mt-1 block">
                  {formatAccountDate(user.createdAt)}
                </span>
              </div>

              <div className="p-3.5 bg-[#0F172A] rounded-xl border border-[#243047]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Last Login
                </span>
                <span className="text-xs font-medium text-slate-300 mt-1 block">
                  {user.lastLoginAt ? formatRelativeTime(user.lastLoginAt) : 'Current Session'}
                </span>
              </div>
            </div>
          </Card>

          {/* 5. CLASSROOM & ROLE OVERVIEW */}
          <Card className="p-6 bg-[#111827] border border-[#243047] space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#243047]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Classroom & Role Overview</h3>
                  <p className="text-xs text-slate-400">Contextual institutional roles scoped to classrooms</p>
                </div>
              </div>
              <Link to="/classrooms">
                <Button variant="ghost" size="sm" className="text-xs text-purple-400 hover:text-purple-300" rightIcon={<ChevronRight className="w-3 h-3" />}>
                  Classrooms
                </Button>
              </Link>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-[#0F172A] rounded-xl border border-[#243047] text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Enrolled
                </span>
                <span className="text-lg font-bold text-slate-100 mt-0.5 block">
                  {classroomOverview.joined}
                </span>
              </div>

              <div className="p-3 bg-[#0F172A] rounded-xl border border-[#243047] text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Owned
                </span>
                <span className="text-lg font-bold text-purple-300 mt-0.5 block">
                  {classroomOverview.owned}
                </span>
              </div>

              <div className="p-3 bg-[#0F172A] rounded-xl border border-[#243047] text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Active
                </span>
                <span className="text-lg font-bold text-emerald-400 mt-0.5 block">
                  {classroomOverview.active}
                </span>
              </div>
            </div>

            {/* Contextual Roles List */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Active Classroom Memberships & Roles
              </span>

              {classroomOverview.rolesList.length > 0 ? (
                <div className="space-y-2">
                  {classroomOverview.rolesList.map(item => (
                    <div 
                      key={item.id} 
                      className="p-3 bg-[#0F172A] rounded-xl border border-[#243047] flex items-center justify-between gap-3 hover:border-purple-500/30 transition-colors"
                    >
                      <div className="min-w-0">
                        <Link 
                          to={`/classrooms/${item.id}`} 
                          className="text-xs font-semibold text-slate-200 hover:text-purple-300 transition-colors truncate block"
                        >
                          {item.name}
                        </Link>
                        <span className="text-[10px] font-mono text-slate-400">
                          {item.code}
                        </span>
                      </div>
                      <Badge variant={item.variant} size="sm">
                        {item.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-5 bg-[#0F172A] rounded-xl border border-dashed border-[#243047] text-center space-y-2">
                  <p className="text-xs text-slate-400">
                    No classroom memberships yet. Join with an institutional classroom code or create a new classroom.
                  </p>
                  <Link to="/classrooms">
                    <Button variant="outline" size="sm" className="text-xs mt-1">
                      Browse Classrooms
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </Card>

          {/* 6. PROJECT & EVALUATION OVERVIEW */}
          <Card className="p-6 bg-[#111827] border border-[#243047] space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#243047]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Project & Evaluation Overview</h3>
                  <p className="text-xs text-slate-400">Real performance statistics across projects and squads</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-[#0F172A] rounded-xl border border-[#243047]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Checker Projects
                </span>
                <span className="text-lg font-bold text-slate-100 mt-1 block">
                  {projectMetrics.projectCheckerReports}
                </span>
              </div>

              <div className="p-3.5 bg-[#0F172A] rounded-xl border border-[#243047]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Squads Joined
                </span>
                <span className="text-lg font-bold text-slate-100 mt-1 block">
                  {projectMetrics.teamsJoined}
                </span>
              </div>

              <div className="p-3.5 bg-[#0F172A] rounded-xl border border-[#243047]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Submissions
                </span>
                <span className="text-lg font-bold text-slate-100 mt-1 block">
                  {projectMetrics.classroomSubmissions}
                </span>
              </div>

              <div className="p-3.5 bg-[#0F172A] rounded-xl border border-[#243047] col-span-2 sm:col-span-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Average Evaluation Score
                </span>
                <div className="flex items-center justify-between mt-1">
                  {projectMetrics.averageScore !== null ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black text-purple-300">
                        {projectMetrics.averageScore}
                      </span>
                      <span className="text-xs text-slate-400">/ 100</span>
                      <span className="text-[11px] text-slate-400 ml-2">
                        ({projectMetrics.evaluatedCount} evaluation{projectMetrics.evaluatedCount === 1 ? '' : 's'} recorded)
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">
                      No evaluation data yet
                    </span>
                  )}
                  {projectMetrics.averageScore !== null && (
                    <Badge variant="success" size="sm">Verified Result</Badge>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* 7. RECENT ACTIVITY */}
          <Card className="p-6 bg-[#111827] border border-[#243047] space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#243047]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Recent Activity</h3>
                  <p className="text-xs text-slate-400">Chronological audit log of project, team, and classroom actions</p>
                </div>
              </div>
              <Link to="/notifications">
                <Button variant="ghost" size="sm" className="text-xs text-purple-400 hover:text-purple-300">
                  View All
                </Button>
              </Link>
            </div>

            {recentActivities.length > 0 ? (
              <div className="space-y-3">
                {recentActivities.map(act => {
                  let ActIcon = FileText;
                  let iconColor = 'text-purple-400';
                  if (act.type === 'team') {
                    ActIcon = Users;
                    iconColor = 'text-blue-400';
                  } else if (act.type === 'classroom') {
                    ActIcon = GraduationCap;
                    iconColor = 'text-amber-400';
                  } else if (act.type === 'notification') {
                    ActIcon = CheckCircle2;
                    iconColor = 'text-emerald-400';
                  }

                  return (
                    <div 
                      key={act.id} 
                      className="p-3 bg-[#0F172A] rounded-xl border border-[#243047] flex items-start gap-3 hover:border-purple-500/30 transition-colors"
                    >
                      <div className={`p-2 rounded-lg bg-[#111827] ${iconColor} border border-[#243047] shrink-0 mt-0.5`}>
                        <ActIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-semibold text-slate-200 truncate">
                            {act.title}
                          </h4>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {formatRelativeTime(act.timestamp)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                          {act.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 bg-[#0F172A] rounded-xl border border-dashed border-[#243047] text-center space-y-2">
                <p className="text-xs text-slate-400">
                  No activity yet. When you run evaluations, join teams, or submit classroom projects, your updates will show here.
                </p>
              </div>
            )}
          </Card>

        </div>
      </div>

      {/* 10. EDIT PROFILE MODAL */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Institutional Profile"
        description="Update personal attributes, academic standing, and skills for peer collaborations and evaluators."
        maxWidth="2xl"
      >
        <div className="space-y-6">
          {/* Modal Tabs */}
          <div className="flex items-center gap-2 border-b border-[#243047] pb-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('personal')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
                activeTab === 'personal'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]'
              }`}
            >
              Personal Info
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('academic')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
                activeTab === 'academic'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]'
              }`}
            >
              Academic Info
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('skills')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
                activeTab === 'skills'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]'
              }`}
            >
              Skills & Interests
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('account')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
                activeTab === 'account'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]'
              }`}
            >
              System Info
            </button>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-5">
            {/* Tab 1: Personal Information */}
            {activeTab === 'personal' && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-[#0F172A] rounded-xl border border-[#243047]">
                  <input
                    ref={modalFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) handlePhotoUpload(f);
                      e.target.value = '';
                    }}
                  />
                  <div className="relative group w-16 h-16 rounded-xl bg-purple-950/80 text-purple-300 font-bold text-xl flex items-center justify-center border border-purple-500/30 overflow-hidden shrink-0">
                    {photoPreview || formAvatar ? (
                      <img 
                        src={photoPreview || formAvatar} 
                        alt="Preview" 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span>{initials}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => modalFileInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                      title="Upload Photo"
                    >
                      {isUploadingPhoto ? (
                        <Loader2 className="w-4 h-4 text-purple-300 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4 text-purple-300" />
                      )}
                    </button>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <span className="text-xs font-bold text-slate-200 block">Profile Picture</span>
                    <p className="text-[11px] text-slate-400">
                      Upload JPG, PNG, or WEBP (max 5MB). Persists across all pages.
                    </p>
                    <div className="flex items-center gap-2 pt-0.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        leftIcon={<Upload className="w-3 h-3 text-purple-400" />}
                        onClick={() => modalFileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                      >
                        {isUploadingPhoto ? 'Uploading...' : 'Upload Image'}
                      </Button>
                      {(photoPreview || formAvatar) && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormAvatar('');
                            setPhotoPreview(null);
                            updateProfile({ avatar: '', profileImage: '' });
                          }}
                          className="text-[11px] text-red-400 hover:underline cursor-pointer"
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <Input
                  label="Full Legal / Institutional Name *"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  required
                />

                <Input
                  label="Profile Avatar Image URL (Optional)"
                  value={formAvatar}
                  onChange={e => setFormAvatar(e.target.value)}
                  placeholder="https://..."
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Phone Number"
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                  />
                  <Input
                    label="Date of Birth"
                    value={formDob}
                    onChange={e => setFormDob(e.target.value)}
                    placeholder="YYYY-MM-DD or DD/MM/YYYY"
                  />
                </div>

                <Input
                  label="Campus / Location"
                  value={formLocation}
                  onChange={e => setFormLocation(e.target.value)}
                  placeholder="e.g. Block C, Main Tech Campus"
                />

                <Textarea
                  label="Bio / Professional Summary"
                  value={formBio}
                  onChange={e => setFormBio(e.target.value)}
                  placeholder="Briefly state your technical background, research interests, and project focus..."
                  rows={3}
                />
              </div>
            )}

            {/* Tab 2: Academic Information */}
            {activeTab === 'academic' && (
              <div className="space-y-4">
                <Input
                  label="College / Institution *"
                  value={formCollege}
                  onChange={e => setFormCollege(e.target.value)}
                  placeholder="e.g. Apex Institute of Technology & Research"
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Degree / Academic Program"
                    value={formDegree}
                    onChange={e => setFormDegree(e.target.value)}
                    placeholder="e.g. B.Tech Computer Science"
                  />
                  <Input
                    label="Department / Division *"
                    value={formDepartment}
                    onChange={e => setFormDepartment(e.target.value)}
                    placeholder="e.g. Computer Science & Engineering"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Academic Standing / Year *"
                    value={formYear}
                    onChange={e => setFormYear(e.target.value)}
                    placeholder="e.g. 4th Year (Senior)"
                    required
                  />
                  <Input
                    label="Classroom Section"
                    value={formSection}
                    onChange={e => setFormSection(e.target.value)}
                    placeholder="e.g. Section A"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Register / Roll Number"
                    value={formRegisterNumber}
                    onChange={e => setFormRegisterNumber(e.target.value)}
                    placeholder="e.g. 2022-CSE-094"
                  />
                  <Input
                    label="Expected Graduation Year"
                    value={formExpectedGraduationYear}
                    onChange={e => setFormExpectedGraduationYear(e.target.value)}
                    placeholder="e.g. 2026"
                  />
                </div>
              </div>
            )}

            {/* Tab 3: Skills & Interests */}
            {activeTab === 'skills' && (
              <div className="space-y-5">
                {/* Languages */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider">
                    Programming Languages
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={inputLanguage}
                      onChange={e => setInputLanguage(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag('languages', inputLanguage);
                        }
                      }}
                      placeholder="e.g. Python, TypeScript, Java, C++"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleAddTag('languages', inputLanguage)}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {formLanguages.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1.5 bg-[#0F172A] border border-purple-500/30 text-purple-300 text-xs px-2.5 py-1 rounded-lg">
                        {tag}
                        <button type="button" onClick={() => handleRemoveTag('languages', tag)} className="hover:text-red-400 cursor-pointer">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {formLanguages.length === 0 && (
                      <span className="text-xs text-slate-500 italic">No programming languages added yet.</span>
                    )}
                  </div>
                </div>

                {/* Technologies */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider">
                    Technologies & Developer Tools
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={inputTechnology}
                      onChange={e => setInputTechnology(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag('technologies', inputTechnology);
                        }
                      }}
                      placeholder="e.g. React, Node.js, Docker, PostgreSQL"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleAddTag('technologies', inputTechnology)}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {formTechnologies.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1.5 bg-[#0F172A] border border-[#334155] text-slate-200 text-xs px-2.5 py-1 rounded-lg">
                        {tag}
                        <button type="button" onClick={() => handleRemoveTag('technologies', tag)} className="hover:text-red-400 cursor-pointer">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {formTechnologies.length === 0 && (
                      <span className="text-xs text-slate-500 italic">No technologies added yet.</span>
                    )}
                  </div>
                </div>

                {/* Frameworks */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider">
                    Frameworks & Libraries
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={inputFramework}
                      onChange={e => setInputFramework(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag('frameworks', inputFramework);
                        }
                      }}
                      placeholder="e.g. TailwindCSS, Prisma, Express, Next.js"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleAddTag('frameworks', inputFramework)}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {formFrameworks.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1.5 bg-[#0F172A] border border-[#334155] text-slate-200 text-xs px-2.5 py-1 rounded-lg">
                        {tag}
                        <button type="button" onClick={() => handleRemoveTag('frameworks', tag)} className="hover:text-red-400 cursor-pointer">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {formFrameworks.length === 0 && (
                      <span className="text-xs text-slate-500 italic">No frameworks added yet.</span>
                    )}
                  </div>
                </div>

                {/* Areas of Interest */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider">
                    Areas of Interest & Research Focus
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={inputInterest}
                      onChange={e => setInputInterest(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag('interests', inputInterest);
                        }
                      }}
                      placeholder="e.g. Machine Learning, Cloud Systems, Cybersecurity"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleAddTag('interests', inputInterest)}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {formInterests.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1.5 bg-[#0F172A] border border-amber-500/30 text-amber-300 text-xs px-2.5 py-1 rounded-lg">
                        {tag}
                        <button type="button" onClick={() => handleRemoveTag('interests', tag)} className="hover:text-red-400 cursor-pointer">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {formInterests.length === 0 && (
                      <span className="text-xs text-slate-500 italic">No areas of interest added yet.</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: System Information (Read-only) */}
            {activeTab === 'account' && (
              <div className="space-y-4">
                <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047] space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-purple-400">
                    <Lock className="w-4 h-4" />
                    <span>System-Managed Protected Fields</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    The following attributes are cryptographically signed or managed by your institution. They cannot be modified directly via self-service.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3 bg-[#111827] rounded-lg border border-[#243047]">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Permanent User ID
                      </span>
                      <span className="text-xs font-mono font-bold text-purple-300 mt-1 block">
                        {user.permanentId}
                      </span>
                    </div>

                    <div className="p-3 bg-[#111827] rounded-lg border border-[#243047]">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Institutional Email
                      </span>
                      <span className="text-xs font-semibold text-slate-200 mt-1 block truncate">
                        {user.email}
                      </span>
                    </div>

                    <div className="p-3 bg-[#111827] rounded-lg border border-[#243047]">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Authentication Provider
                      </span>
                      <span className="text-xs font-semibold text-slate-200 mt-1 block">
                        {authMethodDisplay}
                      </span>
                    </div>

                    <div className="p-3 bg-[#111827] rounded-lg border border-[#243047]">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Account Created
                      </span>
                      <span className="text-xs text-slate-300 mt-1 block">
                        {formatAccountDate(user.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-[#243047]">
              <div className="text-[11px] text-slate-500">
                All changes synchronize directly with your Provalix institutional record.
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  type="button" 
                  onClick={() => setEditModalOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  type="submit"
                  isLoading={isSaving}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};
