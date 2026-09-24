import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { classroomService } from '../../services/classroomService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Classroom, ClassroomSubmission, ClassroomTeamParticipation, ClassroomResourceRequirement } from '../../types';
import { teamService } from '../../services/teamService';
import { 
  School, 
  ArrowLeft, 
  Plus, 
  Users, 
  CheckCheck, 
  ClipboardCheck,
  Trophy, 
  Settings, 
  Copy, 
  Check, 
  ArrowRight,
  FileCode,
  Loader2,
  UserPlus,
  ShieldCheck,
  Crown,
  Clock,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Upload,
  X,
  Sparkles,
  Trash2
} from 'lucide-react';

export const ClassroomDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [submissions, setSubmissions] = useState<ClassroomSubmission[]>([]);
  const [teamParticipations, setTeamParticipations] = useState<ClassroomTeamParticipation[]>([]);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [copiedCode, setCopiedCode] = useState(false);

  // Settings Tab State
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLogo, setEditLogo] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editSubmissionMode, setEditSubmissionMode] = useState<'Individual' | 'Team'>('Individual');
  const [editMinTeamSize, setEditMinTeamSize] = useState<number>(2);
  const [editMaxTeamSize, setEditMaxTeamSize] = useState<number>(4);
  const [editResources, setEditResources] = useState<ClassroomResourceRequirement[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Invite member modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'MEMBER' | 'EVALUATOR'>('MEMBER');
  const [inviting, setInviting] = useState(false);

  // Assign evaluator modal
  const [evaluatorModalOpen, setEvaluatorModalOpen] = useState(false);
  const [evaluatorIdentifier, setEvaluatorIdentifier] = useState('');
  const [assigningEvaluator, setAssigningEvaluator] = useState(false);

  const loadClassroomData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const cls = await classroomService.getClassroomById(id);
      setClassroom(cls || null);

      if (cls) {
        setEditName(cls.name);
        setEditDescription(cls.description || '');
        setEditLogo(cls.logo || '');
        setEditStartDate(cls.startDate);
        setEditDeadline(cls.submissionDeadline);
        setEditSubmissionMode(cls.submissionMode);
        setEditMinTeamSize(cls.minTeamSize ?? 2);
        setEditMaxTeamSize(cls.maxTeamSize ?? 4);
        setEditResources(cls.resources || []);

        const [subs, parts] = await Promise.all([
          classroomService.getSubmissionsByClassroom(cls.id),
          teamService.getClassroomTeamParticipations(cls.id),
        ]);
        setSubmissions(subs);
        setTeamParticipations(parts);
      }
    } catch (err) {
      console.error('[ClassroomDetailPage] Error loading classroom data:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadClassroomData();
  }, [loadClassroomData]);

  const isOwner = classroom?.ownerId === user?.id || classroom?.currentUserRole === 'OWNER';
  const isEvaluator = classroom?.currentUserRole === 'EVALUATOR' || classroom?.evaluators?.some(e => e.evaluatorId === user?.id);

  const handleCopyCode = () => {
    if (!classroom) return;
    navigator.clipboard.writeText(classroom.code);
    setCopiedCode(true);
    success(`Classroom Code ${classroom.code} copied to clipboard.`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classroom || !inviteEmail.trim()) return;

    setInviting(true);
    try {
      const res = await classroomService.inviteUser(classroom.id, inviteEmail.trim(), inviteRole);
      if (res.success) {
        success(res.message);
        setInviteEmail('');
        setInviteModalOpen(false);
        await loadClassroomData();
      } else {
        error(res.message);
      }
    } catch (err: any) {
      error(err.message || 'Failed to dispatch invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleAssignEvaluator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classroom || !evaluatorIdentifier.trim()) return;

    setAssigningEvaluator(true);
    try {
      const res = await classroomService.assignEvaluator(classroom.id, evaluatorIdentifier.trim());
      if (res.success) {
        success(res.message);
        setEvaluatorIdentifier('');
        setEvaluatorModalOpen(false);
        await loadClassroomData();
      } else {
        error(res.message);
      }
    } catch (err: any) {
      error(err.message || 'Failed to assign evaluator');
    } finally {
      setAssigningEvaluator(false);
    }
  };

  const handleApproveTeam = async (part: ClassroomTeamParticipation) => {
    const current = part.currentMembers ?? 0;
    const max = part.maxSize ?? 4;
    if (current < max) {
      error(`Cannot approve incomplete team (${current}/${max} Members). Approval requires exactly ${max}/${max} members.`);
      return;
    }

    setApprovingId(part.id);
    try {
      const res = await teamService.approveClassroomParticipation(classroom!.id, part.id);
      if (res.success) {
        success(`Team "${part.teamName}" approved for classroom cohort!`);
        await loadClassroomData();
      } else {
        error(res.message);
      }
    } catch (err: any) {
      error(err.message || 'Failed to approve team');
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectTeam = async (part: ClassroomTeamParticipation) => {
    try {
      const res = await teamService.rejectClassroomParticipation(classroom!.id, part.id);
      if (res.success) {
        success(`Team "${part.teamName}" participation request rejected.`);
        await loadClassroomData();
      } else {
        error(res.message);
      }
    } catch (err: any) {
      error(err.message || 'Failed to reject team participation');
    }
  };

  const handleApproveMember = async (memberUserId: string) => {
    try {
      const res = await classroomService.approveMember(classroom!.id, memberUserId);
      if (res.success) {
        success('Participant approved!');
        await loadClassroomData();
      } else {
        error(res.message);
      }
    } catch (err: any) {
      error(err.message || 'Failed to approve participant');
    }
  };

  const handleRejectMember = async (memberUserId: string) => {
    try {
      const res = await classroomService.rejectMember(classroom!.id, memberUserId);
      if (res.success) {
        success('Participant rejected.');
        await loadClassroomData();
      } else {
        error(res.message);
      }
    } catch (err: any) {
      error(err.message || 'Failed to reject participant');
    }
  };

  const handleSettingsLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !classroom) return;
    try {
      const base64 = await classroomService.uploadLogo(file, classroom.id);
      setEditLogo(base64);
      success('Classroom logo updated successfully.');
      await loadClassroomData();
    } catch (err: any) {
      error(err.message || 'Failed to upload classroom logo.');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classroom) return;
    if (!editName.trim()) {
      error('Classroom title is required.');
      return;
    }
    if (new Date(editDeadline) <= new Date(editStartDate)) {
      error('Submission deadline must be strictly after the start date.');
      return;
    }
    if (editSubmissionMode === 'Team') {
      if (editMinTeamSize < 2 || editMinTeamSize > 20 || editMaxTeamSize < 2 || editMaxTeamSize > 20) {
        error('Team size must be between 2 and 20.');
        return;
      }
      if (editMinTeamSize > editMaxTeamSize) {
        error('Minimum team size must be less than or equal to maximum team size.');
        return;
      }
    }

    setSavingSettings(true);
    try {
      await classroomService.updateClassroom(classroom.id, {
        name: editName.trim(),
        description: editDescription.trim(),
        logo: editLogo || undefined,
        startDate: editStartDate,
        submissionDeadline: editDeadline,
        submissionMode: editSubmissionMode,
        minTeamSize: editSubmissionMode === 'Team' ? editMinTeamSize : undefined,
        maxTeamSize: editSubmissionMode === 'Team' ? editMaxTeamSize : undefined,
        resources: editResources,
      });
      success('Classroom configuration updated successfully!');
      await loadClassroomData();
    } catch (err: any) {
      error(err.message || 'Failed to save classroom settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDeleteClassroom = async () => {
    if (!classroom) return;
    if (submissions.length > 0) {
      error(`Cannot delete classroom: ${submissions.length} submission(s) have already been submitted. Please archive the classroom instead.`);
      return;
    }

    setDeleting(true);
    try {
      await classroomService.deleteClassroom(classroom.id);
      success(`Classroom "${classroom.name}" deleted successfully.`);
      navigate('/classrooms');
    } catch (err: any) {
      error(err.message || 'Failed to delete classroom.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-sm font-medium text-brand-muted">Loading classroom cohorts and submissions...</p>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="p-12 text-center max-w-md mx-auto space-y-4">
        <p className="text-base font-semibold text-slate-100">Classroom not found.</p>
        <p className="text-xs text-slate-400">This cohort may not exist or you do not have permission to view it.</p>
        <Link to="/classrooms">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Classrooms
          </Button>
        </Link>
      </div>
    );
  }

  const completedCount = submissions.filter(s => s.status === 'Verified').length;
  const pendingCount = submissions.filter(s => s.status !== 'Verified').length;
  const avgScore = submissions.length > 0
    ? Math.round(submissions.reduce((acc, s) => acc + (s.finalTotalScore || 0), 0) / submissions.length)
    : 0;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <School className="w-4 h-4" /> },
    { id: 'submissions', label: 'Submissions', icon: <FileCode className="w-4 h-4" />, badge: submissions.length },
    { id: 'members', label: 'Members & Evaluators', icon: <Users className="w-4 h-4" />, badge: classroom.participantCount ?? classroom.members?.length },
    { id: 'evaluations', label: 'Evaluations (50/50)', icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 'verification', label: 'Verification Gate', icon: <CheckCheck className="w-4 h-4" /> },
    { id: 'results', label: 'Results & Leaderboard', icon: <Trophy className="w-4 h-4 text-amber" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#243047]">
        <Link to="/classrooms" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Classrooms
        </Link>

        <div className="flex items-center gap-2.5">
          <Link to={`/classrooms/${classroom.id}/submit`}>
            <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
              Submit Project
            </Button>
          </Link>
          <Link to={`/classrooms/${classroom.id}/leaderboard`}>
            <Button variant="outline" size="sm" leftIcon={<Trophy className="w-4 h-4 text-amber" />}>
              Leaderboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Classroom Banner */}
      <div className="p-6 sm:p-8 rounded-saas bg-[#111827] border border-[#243047] shadow-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          {classroom.logo ? (
            <img
              src={classroom.logo}
              alt={classroom.name}
              className="w-16 h-16 rounded-2xl object-cover border border-[#243047] shadow-md shrink-0 bg-[#0F172A]"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-purple-950/50 border border-purple-800/40 flex items-center justify-center text-purple-300 font-bold text-xl shrink-0">
              {classroom.name.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-100">{classroom.name}</h1>
              {isOwner ? (
                <Badge variant="primary" size="sm" icon={<Crown className="w-3.5 h-3.5" />}>Classroom Owner / Admin</Badge>
              ) : isEvaluator ? (
                <Badge variant="amber" size="sm" icon={<ShieldCheck className="w-3.5 h-3.5" />}>Faculty Evaluator</Badge>
              ) : (
                <Badge variant="slate" size="sm">Enrolled Participant</Badge>
              )}
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              {classroom.description}
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-300 pt-1 flex-wrap">
              <span>Owner: <strong className="text-slate-100">{classroom.ownerName || 'Classroom Owner'}</strong></span>
              <span>•</span>
              <span>
                Mode: <strong className="text-purple-300">{classroom.submissionMode} Mode</strong>
                {classroom.submissionMode === 'Team' && (
                  <span className="text-slate-400 ml-1">
                    ({classroom.minTeamSize === classroom.maxTeamSize ? `Exact ${classroom.minTeamSize} members` : `${classroom.minTeamSize ?? 2}–${classroom.maxTeamSize ?? 4} members`})
                  </span>
                )}
              </span>
              <span>•</span>
              <span>Deadline: <strong className="text-slate-100">{classroom.submissionDeadline}</strong></span>
            </div>
          </div>
        </div>

        {/* Code Box */}
        <div className="bg-[#0F172A] border border-[#243047] p-3.5 rounded-xl flex items-center gap-3 shrink-0">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Classroom Code</span>
            <span className="font-mono text-base font-bold text-slate-100">{classroom.code}</span>
          </div>
          <button
            onClick={handleCopyCode}
            className="p-2 bg-[#111827] rounded-lg border border-[#243047] hover:bg-[#172033] transition-colors text-slate-300"
            title="Copy Classroom Code"
          >
            {copiedCode ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 4 Overview Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Submissions</span>
          <span className="text-2xl font-bold text-slate-100 mt-1 block">{submissions.length}</span>
        </Card>
        <Card className="p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Pending Evaluations</span>
          <span className="text-2xl font-bold text-amber-400 mt-1 block">{pendingCount}</span>
        </Card>
        <Card className="p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Completed & Verified</span>
          <span className="text-2xl font-bold text-emerald-400 mt-1 block">{completedCount}</span>
        </Card>
        <Card className="p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Average Cohort Score</span>
          <span className="text-2xl font-bold text-purple-400 mt-1 block">{avgScore} / 100</span>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-base font-bold text-slate-100 mb-3">Evaluation Rubric & Model Split</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-[#0F172A] rounded-xl border border-purple-500/30 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">AI Component</span>
                  <span className="font-bold text-purple-400">/ 50 Marks</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Automated code and report analysis. Plagiarism acts as a point deduction modifier inside this 50-mark boundary, not as a standalone category.
                </p>
              </div>

              <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047] space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Faculty Component</span>
                  <span className="font-bold text-slate-100">/ 50 Marks</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Presentation & Demonstration (25 Marks) + Structured 5-question Viva examination (25 Marks at 5 marks per question).
                </p>
              </div>
            </div>
          </Card>

          {/* Required Resources List */}
          <Card className="p-6">
            <h3 className="text-base font-bold text-slate-100 mb-4">Required Artifacts for Submissions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {classroom.resources.map(res => (
                <div key={res.type} className="p-3 bg-[#0F172A] rounded-xl border border-[#243047] flex items-center justify-between">
                  <span className="text-xs text-slate-200 font-medium">{res.label}</span>
                  <Badge variant={res.required ? 'primary' : 'slate'} size="sm">
                    {res.required ? 'Required' : 'Optional'}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: SUBMISSIONS */}
      {activeTab === 'submissions' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-100">Classroom Project Submissions</h3>
              <p className="text-xs text-slate-400">All submissions enrolled under this cohort</p>
            </div>
            <Link to={`/classrooms/${classroom.id}/submit`}>
              <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                Submit Project
              </Button>
            </Link>
          </div>

          {submissions.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-3">
              <p>No project submissions received for this classroom cohort yet.</p>
              <Link to={`/classrooms/${classroom.id}/submit`}>
                <Button variant="outline" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                  Submit the First Project
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#243047]">
              {submissions.map(sub => (
                <div key={sub.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-100">{sub.project.title}</h4>
                      <StatusBadge status={sub.status} />
                    </div>
                    <p className="text-xs text-slate-400">
                      Submitted by {sub.teamName ? `${sub.submitterName} (${sub.teamName})` : sub.submitterName} • {new Date(sub.submittedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-bold text-purple-400">
                      {sub.finalTotalScore !== undefined ? `${sub.finalTotalScore} / 100` : 'Evaluating...'}
                    </span>
                    <Link to={`/classrooms/${classroom.id}/evaluations`}>
                      <Button variant="outline" size="sm">
                        Inspect
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: MEMBERS & EVALUATORS */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          {/* Team Participation & Approval Gate */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-100">Team Participation & Approval Gate</h3>
                <p className="text-xs text-slate-400">
                  Project squads requesting participation. Admin approval requires the team to reach exactly full capacity.
                </p>
              </div>
              <Badge variant="primary" size="sm">
                {teamParticipations.length} {teamParticipations.length === 1 ? 'Squad' : 'Squads'}
              </Badge>
            </div>

            {teamParticipations.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 space-y-1 bg-[#0F172A] rounded-xl border border-[#243047] p-4">
                <Users className="w-6 h-6 text-slate-600 mx-auto mb-1" />
                <p>No project squads have requested entry into this classroom yet.</p>
                <p className="text-[11px] text-slate-500">Squad captains can request participation from their Team Dashboard.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {teamParticipations.map(part => {
                  const current = part.currentMembers ?? 0;
                  const max = part.maxSize ?? 4;
                  const isIncomplete = current < max;
                  const isReady = current >= max && part.status !== 'Approved' && part.status !== 'Rejected' && part.status !== 'Withdrawn';
                  const isApproved = part.status === 'Approved';
                  const isRejected = part.status === 'Rejected';
                  const isWithdrawn = part.status === 'Withdrawn';

                  return (
                    <div
                      key={part.id}
                      className="p-4 bg-[#0F172A] rounded-xl border border-[#243047] space-y-3 shadow-2xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {/* Logo */}
                          <div className="w-11 h-11 rounded-xl bg-[#111827] border border-[#243047] flex items-center justify-center font-bold text-base text-purple-300 overflow-hidden shrink-0">
                            {part.teamLogo ? (
                              <img src={part.teamLogo} alt={part.teamName} className="w-full h-full object-cover" />
                            ) : (
                              (part.teamName || 'T').charAt(0)
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-slate-100">{part.teamName || 'Project Squad'}</span>
                              <span className="font-mono text-xs font-semibold bg-[#111827] text-purple-300 px-2 py-0.5 rounded border border-[#243047]">
                                {part.teamCode}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                              <span>Captain: <strong className="text-slate-200">{part.captainName || 'Captain'}</strong></span>
                              {part.captainPermanentId && <span className="font-mono text-purple-300">({part.captainPermanentId})</span>}
                              <span>• Roster: <strong className="text-slate-100">{current}/{max} Members</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isIncomplete ? (
                            <Badge variant="amber" size="sm" icon={<Clock className="w-3.5 h-3.5" />}>
                              Incomplete Team – {current}/{max} Members
                            </Badge>
                          ) : isReady ? (
                            <Badge variant="primary" size="sm" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
                              Ready for Approval ({current}/{max})
                            </Badge>
                          ) : isApproved ? (
                            <Badge variant="success" size="sm" icon={<Check className="w-3.5 h-3.5" />}>
                              Approved
                            </Badge>
                          ) : isRejected ? (
                            <Badge variant="error" size="sm" icon={<XCircle className="w-3.5 h-3.5" />}>
                              Rejected
                            </Badge>
                          ) : (
                            <Badge variant="slate" size="sm">
                              {part.status}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Approval Rule Explanation & Admin Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#243047]/60">
                        <div>
                          {isIncomplete ? (
                            <p className="text-[11px] text-amber-300/90 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              Approval blocked: Team is incomplete ({current}/{max} members). Approval unlocks once team reaches exactly {max}/{max} members.
                            </p>
                          ) : isReady ? (
                            <p className="text-[11px] text-purple-300 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                              Full roster reached ({current}/{max})! Team is ready for Classroom Admin approval.
                            </p>
                          ) : isApproved ? (
                            <p className="text-[11px] text-emerald-400 flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 shrink-0" />
                              Team approved. All {current} squad members are enrolled in this cohort.
                            </p>
                          ) : isRejected ? (
                            <p className="text-[11px] text-red-400">
                              Participation request was declined by Classroom Admin.
                            </p>
                          ) : (
                            <p className="text-[11px] text-slate-400">Participation request withdrawn by team captain.</p>
                          )}
                        </div>

                        {/* Admin Action Buttons */}
                        {isOwner && !isApproved && !isWithdrawn && (
                          <div className="flex items-center gap-2 shrink-0">
                            {isIncomplete ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled
                                className="opacity-50 cursor-not-allowed text-xs"
                                title="Cannot approve incomplete team. Team must reach full capacity."
                              >
                                Approve Squad ({current}/{max})
                              </Button>
                            ) : (
                              <Button
                                variant="primary"
                                size="sm"
                                isLoading={approvingId === part.id}
                                onClick={() => handleApproveTeam(part)}
                                leftIcon={<Check className="w-3.5 h-3.5" />}
                              >
                                Approve Squad
                              </Button>
                            )}

                            {!isRejected && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-error hover:bg-error/10 text-xs"
                                onClick={() => handleRejectTeam(part)}
                              >
                                Reject
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Active Participants */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-100">Cohort Members & Evaluators</h3>
                <p className="text-xs text-slate-400">Enrolled participants, students, and designated faculty</p>
              </div>
              {isOwner && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<ShieldCheck className="w-4 h-4" />}
                    onClick={() => setEvaluatorModalOpen(true)}
                  >
                    Assign Evaluator
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<UserPlus className="w-4 h-4" />}
                    onClick={() => setInviteModalOpen(true)}
                  >
                    Invite User
                  </Button>
                </div>
              )}
            </div>

            <div className="divide-y divide-[#243047]">
              {/* Owner row */}
              <div className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-purple-950/80 text-purple-300 font-bold text-xs flex items-center justify-center shrink-0 border border-[#243047] overflow-hidden">
                    {((user && (classroom.ownerId === user.id || classroom.ownerEmail === user.email)) ? (user.avatar || user.profileImage) : (classroom as any).ownerAvatar) ? (
                      <img 
                        src={(user && (classroom.ownerId === user.id || classroom.ownerEmail === user.email)) ? (user.avatar || user.profileImage) : (classroom as any).ownerAvatar} 
                        alt={classroom.ownerName}
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      (classroom.ownerName || 'O').charAt(0)
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-100">{classroom.ownerName || 'Classroom Owner'}</span>
                      <Badge variant="primary" size="sm" icon={<Crown className="w-3 h-3" />}>Owner</Badge>
                    </div>
                    <span className="text-xs text-slate-400">{classroom.ownerEmail || 'Primary Administrator'}</span>
                  </div>
                </div>
              </div>

              {/* Members */}
              {Array.isArray(classroom.members) && classroom.members.map((m: any) => {
                if (m.userId === classroom.ownerId) return null;
                const memberUser = m.user || {};
                const memberAvatar = (user && (m.userId === user.id || memberUser.id === user.id))
                  ? (user.avatar || user.profileImage)
                  : (memberUser.avatar || memberUser.profileImage);
                const memberSub = submissions.find(s => s.submitterId === m.userId);
                const joinStatus = m.status || 'Approved';
                const isPending = joinStatus === 'Pending Approval';
                const isApproved = joinStatus === 'Approved';

                return (
                  <div key={m.id || m.userId} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#0F172A] text-purple-300 border border-[#243047] font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                        {memberAvatar ? (
                          <img src={memberAvatar} alt={memberUser.name || 'Member'} className="w-full h-full object-cover" />
                        ) : (
                          (memberUser.name || 'M').charAt(0)
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-100">{memberUser.name || 'Student Member'}</span>
                          <Badge variant={m.role === 'EVALUATOR' ? 'amber' : 'slate'} size="sm">
                            {m.role || 'MEMBER'}
                          </Badge>
                          <Badge
                            variant={isApproved ? 'success' : isPending ? 'amber' : 'error'}
                            size="sm"
                          >
                            {joinStatus}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                          {memberUser.permanentId && (
                            <span className="font-mono font-semibold text-purple-300">{memberUser.permanentId}</span>
                          )}
                          {memberUser.email && <span>{memberUser.email}</span>}
                          <span>•</span>
                          <span>
                            Submission: {memberSub ? (
                              <strong className="text-emerald-400">Submitted</strong>
                            ) : (
                              <span className="text-slate-400">Not Submitted</span>
                            )}
                          </span>
                          {memberSub && (
                            <>
                              <span>•</span>
                              <span>
                                Score: {memberSub.finalTotalScore !== null && memberSub.finalTotalScore !== undefined ? (
                                  <strong className="text-purple-300">{memberSub.finalTotalScore}/100</strong>
                                ) : (
                                  <span className="text-amber-400">Pending Evaluation</span>
                                )}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Admin Approval Actions for Pending Individual Participants */}
                    {isOwner && isPending && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleApproveMember(m.userId)}
                          leftIcon={<Check className="w-3.5 h-3.5" />}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-error hover:bg-error/10 text-xs"
                          onClick={() => handleRejectMember(m.userId)}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: EVALUATIONS */}
      {activeTab === 'evaluations' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100">Faculty Viva & AI Evaluations</h3>
              <p className="text-xs text-slate-400">Detailed scoring portal for faculty coordinators and reviewers</p>
            </div>
            <Link to={`/classrooms/${classroom.id}/evaluations`}>
              <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Open Evaluation Workspace
              </Button>
            </Link>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Access the structured 5-question viva scoring matrix (0-5 marks per question) and presentation/demo defense evaluation interface.
          </p>
        </Card>
      )}

      {/* TAB 5: VERIFICATION */}
      {activeTab === 'verification' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100">Verification & Moderation Gate</h3>
              <p className="text-xs text-slate-400">Classroom Owner / Admin approval portal</p>
            </div>
            <Link to={`/classrooms/${classroom.id}/verification`}>
              <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Open Verification Portal
              </Button>
            </Link>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {isOwner
              ? 'As the Classroom Owner/Admin, you can audit unified scores (AI /50 + Faculty /50 = /100) and choose to Approve or Return submissions with mandatory revision notes.'
              : 'Only the designated Classroom Owner/Admin has authority to approve final verification marks.'}
          </p>
        </Card>
      )}

      {/* TAB 6: RESULTS & LEADERBOARD */}
      {activeTab === 'results' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100">Official Classroom Leaderboard</h3>
              <p className="text-xs text-slate-400">Podium standings with private student feedback isolation</p>
            </div>
            <Link to={`/classrooms/${classroom.id}/leaderboard`}>
              <Button variant="primary" size="sm" leftIcon={<Trophy className="w-4 h-4 text-amber" />}>
                View Official Leaderboard
              </Button>
            </Link>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Students and teams see their own full grade breakdown and improvement suggestions, while competitor rankings show only overall score and rank for academic privacy.
          </p>
        </Card>
      )}

      {/* TAB 7: SETTINGS & CLASSROOM CONFIGURATION */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <Card className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-[#243047] pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-100">Classroom Cohort Settings</h3>
                <p className="text-xs text-slate-400">Update cohort information, custom logo branding, deadlines, and submission parameters.</p>
              </div>
              <Badge variant="ai" size="sm">{classroom.submissionMode} Mode</Badge>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* Logo Management */}
              <div className="p-4 rounded-xl border border-[#243047] bg-[#0F172A] space-y-3">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Classroom Brand Logo
                </label>
                <div className="flex items-center gap-4">
                  {editLogo ? (
                    <div className="relative group">
                      <img
                        src={editLogo}
                        alt="Classroom Logo"
                        className="w-16 h-16 rounded-xl object-cover border-2 border-purple-500 shadow-md bg-[#172033]"
                      />
                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => setEditLogo('')}
                          className="absolute -top-1.5 -right-1.5 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full shadow"
                          title="Remove Logo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl border border-dashed border-[#334155] bg-[#172033] flex items-center justify-center text-slate-500">
                      <School className="w-6 h-6 text-purple-400/60" />
                    </div>
                  )}

                  {isOwner && (
                    <div className="space-y-1.5">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          onChange={handleSettingsLogoUpload}
                          className="hidden"
                        />
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#243047] bg-[#172033] text-slate-200 hover:bg-[#1E293B] transition-colors">
                          <Upload className="w-3.5 h-3.5" /> {editLogo ? 'Change Custom Logo' : 'Upload Custom Logo'}
                        </span>
                      </label>
                      <p className="text-[11px] text-slate-500">PNG, JPG, WEBP, or GIF up to 5MB.</p>
                    </div>
                  )}
                </div>
              </div>

              <Input
                label="Classroom Name"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                disabled={!isOwner}
                required
              />

              <Textarea
                label="Classroom Description"
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                disabled={!isOwner}
                rows={3}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Start Date"
                  type="date"
                  value={editStartDate}
                  onChange={e => setEditStartDate(e.target.value)}
                  disabled={!isOwner}
                  required
                />
                <Input
                  label="Submission Deadline"
                  type="date"
                  value={editDeadline}
                  onChange={e => setEditDeadline(e.target.value)}
                  disabled={!isOwner}
                  required
                />
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Submission Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!isOwner || submissions.length > 0}
                      onClick={() => setEditSubmissionMode('Individual')}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        editSubmissionMode === 'Individual'
                          ? 'border-purple-500 bg-purple-950/40 text-purple-300'
                          : 'border-[#243047] bg-[#0F172A] text-slate-300 hover:bg-[#172033]'
                      } ${submissions.length > 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      Individual
                    </button>
                    <button
                      type="button"
                      disabled={!isOwner || submissions.length > 0}
                      onClick={() => setEditSubmissionMode('Team')}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        editSubmissionMode === 'Team'
                          ? 'border-purple-500 bg-purple-950/40 text-purple-300'
                          : 'border-[#243047] bg-[#0F172A] text-slate-300 hover:bg-[#172033]'
                      } ${submissions.length > 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      Team Mode
                    </button>
                  </div>
                  {submissions.length > 0 && (
                    <span className="text-[10px] text-amber-400 mt-1 block">
                      Locked: {submissions.length} submission(s) exist.
                    </span>
                  )}
                </div>
              </div>

              {/* Team Size Rules in Settings */}
              {editSubmissionMode === 'Team' && (
                <div className="p-4 rounded-xl border border-purple-500/30 bg-[#0F172A] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-400" />
                      <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                        Team Size Configuration (2 to 20 Members)
                      </h4>
                    </div>
                    <span className="text-[11px] font-semibold text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/40">
                      {editMinTeamSize === editMaxTeamSize
                        ? `Exact: ${editMinTeamSize} Members`
                        : `${editMinTeamSize} to ${editMaxTeamSize} Members`}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Minimum Team Members (Min: 2)
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={2}
                          max={20}
                          value={editMinTeamSize}
                          disabled={!isOwner}
                          onChange={e => {
                            const val = parseInt(e.target.value);
                            setEditMinTeamSize(val);
                            if (val > editMaxTeamSize) setEditMaxTeamSize(val);
                          }}
                          className="w-full accent-purple-500 cursor-pointer"
                        />
                        <input
                          type="number"
                          min={2}
                          max={20}
                          value={editMinTeamSize}
                          disabled={!isOwner}
                          onChange={e => {
                            const val = Math.max(2, Math.min(20, parseInt(e.target.value) || 2));
                            setEditMinTeamSize(val);
                            if (val > editMaxTeamSize) setEditMaxTeamSize(val);
                          }}
                          className="w-16 px-2 py-1 text-center font-bold text-sm bg-[#172033] border border-[#243047] rounded-lg text-slate-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Maximum Team Members (Max: 20)
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={2}
                          max={20}
                          value={editMaxTeamSize}
                          disabled={!isOwner}
                          onChange={e => {
                            const val = parseInt(e.target.value);
                            setEditMaxTeamSize(val);
                            if (val < editMinTeamSize) setEditMinTeamSize(val);
                          }}
                          className="w-full accent-purple-500 cursor-pointer"
                        />
                        <input
                          type="number"
                          min={2}
                          max={20}
                          value={editMaxTeamSize}
                          disabled={!isOwner}
                          onChange={e => {
                            const val = Math.max(2, Math.min(20, parseInt(e.target.value) || 2));
                            setEditMaxTeamSize(val);
                            if (val < editMinTeamSize) setEditMinTeamSize(val);
                          }}
                          className="w-16 px-2 py-1 text-center font-bold text-sm bg-[#172033] border border-[#243047] rounded-lg text-slate-100"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Presets */}
                  {isOwner && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[11px] text-slate-400 mr-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-purple-400" /> Presets:
                      </span>
                      {[
                        { label: 'Pair (2)', min: 2, max: 2 },
                        { label: 'Trio (3)', min: 3, max: 3 },
                        { label: 'Standard (2–4)', min: 2, max: 4 },
                        { label: 'Strict 4', min: 4, max: 4 },
                        { label: 'Medium (4–6)', min: 4, max: 6 },
                        { label: 'Large (5–10)', min: 5, max: 10 },
                        { label: 'Enterprise (2–20)', min: 2, max: 20 },
                      ].map(p => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => {
                            setEditMinTeamSize(p.min);
                            setEditMaxTeamSize(p.max);
                          }}
                          className={`px-2 py-1 text-[11px] font-medium rounded border transition-colors ${
                            editMinTeamSize === p.min && editMaxTeamSize === p.max
                              ? 'border-purple-500 bg-purple-900/40 text-purple-200'
                              : 'border-[#243047] bg-[#172033] text-slate-300 hover:bg-[#1E293B]'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Resource Requirements */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                  Submission Resource Requirements
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {editResources.map((res, idx) => (
                    <div
                      key={res.type}
                      onClick={() => {
                        if (!isOwner) return;
                        setEditResources(prev =>
                          prev.map((r, i) => (i === idx ? { ...r, required: !r.required } : r))
                        );
                      }}
                      className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                        isOwner ? 'cursor-pointer' : ''
                      } ${
                        res.required
                          ? 'border-purple-500/50 bg-purple-950/30'
                          : 'border-[#243047] bg-[#0F172A]'
                      }`}
                    >
                      <span className="text-xs font-medium text-slate-200">{res.label}</span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          res.required
                            ? 'bg-purple-600 text-white'
                            : 'bg-[#111827] text-slate-400 border border-[#243047]'
                        }`}
                      >
                        {res.required ? 'Required' : 'Optional'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {isOwner && (
                <div className="flex justify-end pt-4 border-t border-[#243047]">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={savingSettings}
                    leftIcon={<Check className="w-4 h-4" />}
                  >
                    Save Classroom Configuration
                  </Button>
                </div>
              )}
            </form>
          </Card>

          {/* Danger Zone */}
          {isOwner && (
            <Card className="p-6 border-red-900/40 bg-red-950/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-red-300 flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-red-400" /> Danger Zone
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Deleting a classroom is permanent. Deletions are safely blocked if submissions already exist.
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-800 text-red-300 hover:bg-red-900/30"
                  onClick={() => setDeleteModalOpen(true)}
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                >
                  Delete Classroom
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Classroom Cohort"
        description="Are you sure you want to delete this classroom cohort? This action cannot be undone."
      >
        <div className="space-y-4">
          {submissions.length > 0 ? (
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-300 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Deletion Blocked By Academic Data Safeguard</span>
              </div>
              <p className="text-amber-200/90">
                This classroom contains <strong>{submissions.length} submission(s)</strong> with evaluations and marks. To preserve academic integrity, delete is prohibited. Please set status to <strong>Archived</strong> instead.
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-300">
              No submissions exist for "{classroom.name}". Deleting will permanently remove this cohort and all enrolled member records.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="button"
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleting || submissions.length > 0}
              onClick={handleDeleteClassroom}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              {deleting ? 'Deleting...' : 'Confirm Deletion'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Invite Modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite Classroom Participant"
        description="Invite a student or faculty member to join this classroom cohort via email."
      >
        <form onSubmit={handleSendInvite} className="space-y-4">
          <Input
            label="Recipient Email Address"
            placeholder="student@institution.edu"
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Assigned Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setInviteRole('MEMBER')}
                className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                  inviteRole === 'MEMBER'
                    ? 'border-purple-500 bg-purple-950/40 text-purple-300'
                    : 'border-[#243047] bg-[#0F172A] text-slate-300 hover:bg-[#172033]'
                }`}
              >
                Student / Member
              </button>
              <button
                type="button"
                onClick={() => setInviteRole('EVALUATOR')}
                className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                  inviteRole === 'EVALUATOR'
                    ? 'border-purple-500 bg-purple-950/40 text-purple-300'
                    : 'border-[#243047] bg-[#0F172A] text-slate-300 hover:bg-[#172033]'
                }`}
              >
                Faculty Evaluator
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={inviting} leftIcon={<UserPlus className="w-4 h-4" />}>
              {inviting ? 'Dispatching...' : 'Send Invitation'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign Evaluator Modal */}
      <Modal
        isOpen={evaluatorModalOpen}
        onClose={() => setEvaluatorModalOpen(false)}
        title="Assign Faculty Evaluator"
        description="Search for a faculty member or coordinator using their Permanent User ID (e.g. PRV-10484) or registered User ID."
      >
        <form onSubmit={handleAssignEvaluator} className="space-y-4">
          <Input
            label="Evaluator Permanent ID or UUID"
            placeholder="e.g. PRV-10484"
            value={evaluatorIdentifier}
            onChange={e => setEvaluatorIdentifier(e.target.value)}
            helperText="Faculty evaluators can examine submissions and score oral viva defenses."
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setEvaluatorModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={assigningEvaluator} leftIcon={<ShieldCheck className="w-4 h-4" />}>
              {assigningEvaluator ? 'Assigning...' : 'Confirm Assignment'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
