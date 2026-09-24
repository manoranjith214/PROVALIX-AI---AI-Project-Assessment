import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { teamService } from '../../services/teamService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';
import { 
  Users, 
  UserPlus, 
  ArrowLeft, 
  Copy, 
  Check, 
  Crown, 
  LogOut, 
  FolderGit2, 
  School, 
  Activity, 
  Settings,
  Loader2,
  MailCheck,
  CheckCircle2,
  XCircle,
  Edit2,
  Archive,
  Trash2,
  AlertTriangle,
  Upload,
  X,
  Image as ImageIcon,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Team, ClassroomTeamParticipation } from '../../types';

export const TeamDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error, info } = useToast();
  const editLogoInputRef = useRef<HTMLInputElement>(null);

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('members');
  const [copiedCode, setCopiedCode] = useState(false);

  // Invite modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteId, setInviteId] = useState('');
  const [inviting, setInviting] = useState(false);

  // Transfer modal
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedNewCaptain, setSelectedNewCaptain] = useState('');
  const [transferring, setTransferring] = useState(false);

  // Leaving state
  const [leaving, setLeaving] = useState(false);

  // Edit Team modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editMaxSize, setEditMaxSize] = useState(4);
  const [editLogoPreview, setEditLogoPreview] = useState<string>('');
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Archive / Deactivate modals
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Classroom Participations
  const [participations, setParticipations] = useState<ClassroomTeamParticipation[]>([]);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestTarget, setRequestTarget] = useState('');
  const [requestingParticipation, setRequestingParticipation] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  const loadTeam = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await teamService.getTeamById(id);
      setTeam(data || null);
      if (data) {
        setEditName(data.name);
        setEditMaxSize(data.maxSize);
        setEditLogoPreview(data.logo || '');
        const parts = await teamService.getTeamClassroomParticipations(data.id);
        setParticipations(parts);
      }
    } catch (err) {
      console.error('[TeamDetailPage] Error loading team:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const submissions = (team as any)?.submissions || [];

  const isCaptain = team ? (team.captainId === user?.id || team.members.find(m => m.role === 'Captain')?.userId === user?.id) : false;
  const isMember = team ? team.members.some(m => m.userId === user?.id || (user?.permanentId && m.permanentId === user?.permanentId)) : false;
  const pendingUserInvite = team?.invitations?.find(
    inv => inv.status === 'Pending' && (inv.userId === user?.id || (user?.permanentId && inv.permanentId === user?.permanentId) || (user?.email && inv.userEmail === user?.email))
  );

  const handleCopyCode = () => {
    if (!team) return;
    navigator.clipboard.writeText(team.code);
    setCopiedCode(true);
    success(`Team Code ${team.code} copied to clipboard.`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteId.trim() || !team) return;

    setInviting(true);
    try {
      const res = await teamService.inviteMember(team.id, inviteId.trim());
      if (res.success) {
        success(res.message);
        setInviteId('');
        setInviteModalOpen(false);
        await loadTeam();
      } else {
        error(res.message);
      }
    } catch (err: any) {
      error(err.message || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberUserId: string, memberName: string) => {
    if (!team) return;
    if (memberUserId === team.captainId) {
      error('Captain cannot be removed. Transfer captainship first.');
      return;
    }
    try {
      const ok = await teamService.removeMember(team.id, memberUserId);
      if (ok) {
        success(`Removed ${memberName} from team.`);
        await loadTeam();
      } else {
        error(`Failed to remove ${memberName}.`);
      }
    } catch (err: any) {
      error(err.message || 'Error removing member');
    }
  };

  const handleTransferCaptain = async () => {
    if (!team || !selectedNewCaptain) return;
    setTransferring(true);
    try {
      const ok = await teamService.transferCaptainship(team.id, selectedNewCaptain);
      if (ok) {
        setTransferModalOpen(false);
        setSelectedNewCaptain('');
        success('Captainship successfully transferred.');
        await loadTeam();
      } else {
        error('Failed to transfer captainship.');
      }
    } catch (err: any) {
      error(err.message || 'Error transferring captainship');
    } finally {
      setTransferring(false);
    }
  };

  const handleLeaveTeam = async () => {
    if (!team) return;
    if (isCaptain && team.members.length > 1) {
      error('Please transfer captainship before leaving the team.');
      return;
    }
    setLeaving(true);
    try {
      const ok = await teamService.leaveTeam(team.id);
      if (ok) {
        success('You have left the team.');
        navigate('/teams');
      } else {
        error('Failed to leave team.');
      }
    } catch (err: any) {
      error(err.message || 'Error leaving team');
    } finally {
      setLeaving(false);
    }
  };

  // Edit Team Handlers
  const handleEditLogoSelect = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      error('Invalid file type. Please upload a PNG, JPG, WEBP, or GIF image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      error('Image size exceeds 5MB limit.');
      return;
    }
    setEditLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setEditLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveEditTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;

    if (!editName.trim()) {
      error('Please enter a valid team name.');
      return;
    }

    if (editMaxSize < 2 || editMaxSize > 20) {
      error('Team Max Size must be between 2 and 20.');
      return;
    }

    if (editMaxSize < team.members.length) {
      error(`Cannot reduce team size below current member count (${team.members.length}).`);
      return;
    }

    setSavingEdit(true);
    try {
      let finalLogoUrl = editLogoPreview;
      if (editLogoFile) {
        try {
          finalLogoUrl = await teamService.uploadLogo(editLogoFile, team.id);
        } catch {
          finalLogoUrl = editLogoPreview;
        }
      }

      await teamService.updateTeam(team.id, {
        name: editName.trim(),
        logo: finalLogoUrl || undefined,
        maxSize: editMaxSize,
      });

      success('Team updated successfully.');
      setEditModalOpen(false);
      setEditLogoFile(null);
      await loadTeam();
    } catch (err: any) {
      error(err.message || 'Failed to update team.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Archive Team Handler
  const handleArchiveTeam = async () => {
    if (!team) return;
    setArchiving(true);
    try {
      const res = await teamService.archiveTeam(team.id);
      if (res.success) {
        success('Team archived successfully. Historical submissions and grades preserved.');
        setArchiveModalOpen(false);
        await loadTeam();
      } else {
        error(res.message);
      }
    } catch (err: any) {
      error(err.message || 'Failed to archive team');
    } finally {
      setArchiving(false);
    }
  };

  // Delete Team Handler
  const handleDeleteTeam = async () => {
    if (!team) return;
    setDeleting(true);
    try {
      const res = await teamService.deleteTeam(team.id);
      if (res.success) {
        success('Team permanently deleted.');
        navigate('/teams');
      } else {
        error(res.message);
      }
    } catch (err: any) {
      error(err.message || 'Failed to delete team.');
    } finally {
      setDeleting(false);
    }
  };

  // Classroom Participation Request Handler
  const handleRequestParticipation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team || !requestTarget.trim()) return;

    setRequestingParticipation(true);
    try {
      const res = await teamService.requestClassroomParticipation(team.id, requestTarget.trim());
      if (res.success) {
        success(res.message);
        setRequestTarget('');
        setRequestModalOpen(false);
        await loadTeam();
      } else {
        error(res.message);
      }
    } catch (err: any) {
      error(err.message || 'Failed to request classroom participation.');
    } finally {
      setRequestingParticipation(false);
    }
  };

  // Withdraw Participation Request Handler
  const handleWithdrawParticipation = async () => {
    if (!team || !selectedPartId) return;
    setWithdrawing(true);
    try {
      const res = await teamService.withdrawClassroomParticipation(team.id, selectedPartId);
      if (res.success) {
        success('Participation request withdrawn.');
        setWithdrawModalOpen(false);
        setSelectedPartId('');
        await loadTeam();
      } else {
        error(res.message);
      }
    } catch (err: any) {
      error(err.message || 'Failed to withdraw participation');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-sm font-medium text-brand-muted">Loading team roster and details...</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-4">
        <p className="text-base font-semibold text-slate-100">Team not found.</p>
        <p className="text-xs text-slate-400">The squad may have been removed or you do not have permission to view it.</p>
        <Link to="/teams">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Teams
          </Button>
        </Link>
      </div>
    );
  }

  const tabs = [
    { id: 'members', label: 'Members & Invites', icon: <Users className="w-4 h-4" />, badge: `${team.members.length}/${team.maxSize}` },
    { id: 'classrooms', label: 'Classroom Participation', icon: <School className="w-4 h-4" />, badge: participations.length },
    { id: 'projects', label: 'Team Projects', icon: <FolderGit2 className="w-4 h-4" />, badge: submissions.length },
    { id: 'activity', label: 'Recent Activity', icon: <Activity className="w-4 h-4" /> },
    { id: 'settings', label: 'Team Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#243047]">
        <Link to="/teams" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Teams
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          {isCaptain && (
            <>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Edit2 className="w-4 h-4" />}
                onClick={() => setEditModalOpen(true)}
              >
                Edit Team
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<UserPlus className="w-4 h-4" />}
                onClick={() => setInviteModalOpen(true)}
                disabled={team.members.length >= team.maxSize}
              >
                Invite Member ({team.members.length}/{team.maxSize})
              </Button>
            </>
          )}
          {isMember && !isCaptain && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<LogOut className="w-4 h-4 text-error" />}
              onClick={handleLeaveTeam}
              disabled={leaving}
            >
              {leaving ? 'Leaving...' : 'Leave Team'}
            </Button>
          )}
        </div>
      </div>

      {/* Pending Invite Banner */}
      {pendingUserInvite && !isMember && (
        <div className="p-4 rounded-xl bg-[#0F172A] border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-950/70 flex items-center justify-center text-purple-400">
              <MailCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-100">You have been invited to join this team!</p>
              <p className="text-xs text-slate-400">Accept to join the roster and collaborate on project submissions.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              size="sm"
              variant="primary"
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
              onClick={async () => {
                const ok = await teamService.acceptInvite(pendingUserInvite.id);
                if (ok) {
                  success('Joined team successfully!');
                  await loadTeam();
                } else {
                  error('Failed to accept invitation.');
                }
              }}
            >
              Accept Invite
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-error hover:bg-error/10"
              leftIcon={<XCircle className="w-4 h-4" />}
              onClick={async () => {
                const ok = await teamService.rejectInvite(pendingUserInvite.id);
                if (ok) {
                  info('Invitation declined.');
                  navigate('/teams');
                } else {
                  error('Failed to decline invitation.');
                }
              }}
            >
              Decline
            </Button>
          </div>
        </div>
      )}

      {/* Team Header Banner */}
      <div className="p-6 sm:p-8 rounded-saas bg-[#111827] border border-[#243047] shadow-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          {/* Team Logo */}
          <div className="relative w-16 h-16 rounded-2xl bg-[#0F172A] border border-[#243047] flex items-center justify-center font-bold text-xl text-purple-300 overflow-hidden shrink-0 group">
            {team.logo ? (
              <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
            ) : (
              team.name.charAt(0)
            )}
            {isCaptain && (
              <button
                type="button"
                onClick={() => setEditModalOpen(true)}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs"
                title="Change Logo"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-100">{team.name}</h1>
              {isCaptain && <Badge variant="primary" size="sm" icon={<Crown className="w-3.5 h-3.5" />}>You are Captain</Badge>}
              <Badge variant={team.status === 'ARCHIVED' ? 'slate' : team.status === 'DEACTIVATED' ? 'amber' : 'success'} size="sm">
                {team.status || 'ACTIVE'}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Roster: <strong className="text-slate-200">{team.members.length} / {team.maxSize} Members</strong> • Created on {new Date(team.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Team Code Display */}
        <div className="bg-[#0F172A] border border-[#243047] p-3.5 rounded-xl flex items-center gap-3 shrink-0">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Team Code</span>
            <span className="font-mono text-base font-bold text-slate-100">{team.code}</span>
          </div>
          <button
            onClick={handleCopyCode}
            className="p-2 bg-[#111827] rounded-lg border border-[#243047] hover:bg-[#172033] transition-colors text-slate-300"
            title="Copy Team Code"
          >
            {copiedCode ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* TAB 1: MEMBERS */}
      {activeTab === 'members' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-100">Squad Roster ({team.members.length}/{team.maxSize})</h3>
              <p className="text-xs text-slate-400">Collaborators authorized to submit classroom deliverables</p>
            </div>
            {isCaptain && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<UserPlus className="w-4 h-4" />}
                onClick={() => setInviteModalOpen(true)}
                disabled={team.members.length >= team.maxSize}
              >
                Invite Peer
              </Button>
            )}
          </div>

          <div className="divide-y divide-[#243047]">
            {team.members.map(member => {
              const isCurrentUser = member.userId === user?.id;
              const isMemberCaptain = member.role === 'Captain' || member.userId === team.captainId;

              return (
                <div key={member.userId} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0F172A] border border-[#243047] flex items-center justify-center font-bold text-xs text-purple-300 shrink-0 overflow-hidden">
                      {member.avatar ? (
                        <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                      ) : (
                        member.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-100">{member.name}</span>
                        {isMemberCaptain && (
                          <Badge variant="primary" size="sm" icon={<Crown className="w-3 h-3" />}>Captain</Badge>
                        )}
                        {isCurrentUser && <span className="text-[11px] text-purple-400">(You)</span>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="font-mono text-purple-300 font-semibold">{member.permanentId}</span>
                        {member.email && <span>• {member.email}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isCaptain && !isMemberCaptain && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-error hover:bg-error/10 text-xs"
                        onClick={() => handleRemoveMember(member.userId, member.name)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pending Outgoing Invites */}
          {team.invitations && team.invitations.filter(i => i.status === 'Pending').length > 0 && (
            <div className="mt-6 pt-4 border-t border-[#243047]">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Pending Outgoing Invitations ({team.invitations.filter(i => i.status === 'Pending').length})
              </h4>
              <div className="space-y-2">
                {team.invitations.filter(i => i.status === 'Pending').map(inv => (
                  <div key={inv.id} className="p-3 bg-[#0F172A] rounded-xl border border-[#243047] flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-200">{inv.userName}</span>
                      <span className="font-mono text-purple-300 ml-2">({inv.permanentId})</span>
                    </div>
                    <Badge variant="amber" size="sm" icon={<Clock className="w-3 h-3" />}>Pending Response</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* TAB 2: CLASSROOM PARTICIPATION & HISTORY */}
      {activeTab === 'classrooms' && (
        <Card className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-100">Classroom Participation & Academic History</h3>
              <p className="text-xs text-slate-400">Classroom cohorts this squad participates in, approval gates, and evaluation records</p>
            </div>
            {isCaptain && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<School className="w-4 h-4" />}
                onClick={() => setRequestModalOpen(true)}
              >
                Join Classroom Cohort
              </Button>
            )}
          </div>

          {/* Participation list */}
          {participations.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#0F172A] text-purple-400 border border-[#243047] mx-auto flex items-center justify-center">
                <School className="w-6 h-6" />
              </div>
              <p>This team has not enrolled or requested participation in any academic classrooms yet.</p>
              {isCaptain && (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<School className="w-4 h-4" />}
                  onClick={() => setRequestModalOpen(true)}
                >
                  Request Classroom Participation
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {participations.map(part => {
                const isIncomplete = part.status.includes('Incomplete');
                const isReady = part.status === 'Ready for Approval';
                const isApproved = part.status === 'Approved';
                const isRejected = part.status === 'Rejected';
                const isWithdrawn = part.status === 'Withdrawn';

                return (
                  <div key={part.id} className="p-5 bg-[#0F172A] rounded-xl border border-[#243047] space-y-4 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#243047]/60">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-100">{part.classroomName || 'Classroom Cohort'}</h4>
                          <span className="font-mono text-xs text-purple-300 font-semibold bg-[#111827] px-2 py-0.5 rounded border border-[#243047]">
                            {part.classroomCode}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Mode: {part.classroomMode || 'Team'} • Requested: {new Date(part.requestedAt).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center gap-2">
                        {isIncomplete ? (
                          <Badge variant="amber" size="sm" icon={<Clock className="w-3.5 h-3.5" />}>
                            {part.displayStatus || `Incomplete Team – ${team.members.length}/${team.maxSize} Members`}
                          </Badge>
                        ) : isReady ? (
                          <Badge variant="primary" size="sm" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
                            Ready for Approval ({team.members.length}/{team.maxSize})
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

                    {/* Explanatory rules for Classroom Participation */}
                    {isIncomplete && (
                      <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-lg text-xs text-amber-300/90 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-amber-200">Approval Gate Blocked:</strong> Classroom Admin cannot approve this squad until the team reaches full capacity of exactly {team.maxSize}/{team.maxSize} members. Current members: {team.members.length}/{team.maxSize}.
                        </div>
                      </div>
                    )}

                    {isReady && (
                      <div className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-lg text-xs text-purple-300 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-purple-200">Ready for Approval:</strong> Team has reached required capacity ({team.members.length}/{team.maxSize} Members). Classroom Admin can now approve the squad into the cohort.
                        </div>
                      </div>
                    )}

                    {/* Submission / Evaluation record if any */}
                    {part.submission ? (
                      <div className="p-3 bg-[#111827] rounded-xl border border-[#243047] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Submitted Project</span>
                          <span className="font-bold text-slate-100">{part.submission.title}</span>
                          <span className="text-slate-400 ml-2">({part.submission.status})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-purple-400 font-bold">
                            Score: {part.submission.finalTotalScore !== null && part.submission.finalTotalScore !== undefined ? `${part.submission.finalTotalScore}/100` : 'In Evaluation'}
                          </span>
                          <Link to={`/classrooms/${part.classroomId}/evaluations`}>
                            <Button variant="outline" size="sm">
                              Inspect Report
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                        <span>Submission: Not submitted yet</span>
                        {isApproved && (
                          <Link to={`/classrooms/${part.classroomId}/submit`}>
                            <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                              Submit Project
                            </Button>
                          </Link>
                        )}
                        {!isApproved && !isWithdrawn && isCaptain && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-error hover:bg-error/10 text-xs"
                            onClick={() => {
                              setSelectedPartId(part.id);
                              setWithdrawModalOpen(true);
                            }}
                          >
                            Withdraw Request
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: PROJECTS */}
      {activeTab === 'projects' && (
        <Card className="p-6">
          <h3 className="text-base font-bold text-slate-100 mb-4">Team Project Submissions</h3>
          {submissions.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <FolderGit2 className="w-8 h-8 text-slate-600 mx-auto" />
              <p>No project submissions have been uploaded under this squad roster yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub: any) => (
                <div key={sub.id} className="p-4 bg-[#0F172A] rounded-xl border border-[#243047] flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">{sub.project?.title || (sub as any).title}</h4>
                    <span className="text-xs text-purple-400">
                      Score: {sub.finalTotalScore || 'In Evaluation'} / 100 • Status: {sub.status}
                    </span>
                  </div>
                  <Link to={`/classrooms/${sub.classroomId}/evaluations`}>
                    <Button variant="outline" size="sm">
                      View Status
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* TAB 4: ACTIVITY */}
      {activeTab === 'activity' && (
        <Card className="p-6">
          <h3 className="text-base font-bold text-slate-100 mb-4">Team Audit Log</h3>
          <div className="space-y-3 text-xs text-slate-300">
            <div className="p-3 bg-[#0F172A] rounded-xl border border-[#243047] flex justify-between">
              <span>Final verification approved for Capstone Project 2026</span>
              <span className="text-slate-400">Mar 17</span>
            </div>
            <div className="p-3 bg-[#0F172A] rounded-xl border border-[#243047] flex justify-between">
              <span>Faculty viva defense scored by Dr. Ronald Vance (45/50)</span>
              <span className="text-slate-400">Mar 16</span>
            </div>
            <div className="p-3 bg-[#0F172A] rounded-xl border border-[#243047] flex justify-between">
              <span>Submission uploaded by Captain {team.name}</span>
              <span className="text-slate-400">Mar 13</span>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 5: SETTINGS */}
      {activeTab === 'settings' && (
        <Card className="p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-100">Team Administration</h3>
            <p className="text-xs text-slate-400">Manage captain privileges, squad preferences, and lifecycle status</p>
          </div>

          {isCaptain ? (
            <div className="space-y-4 pt-2">
              {/* Edit Details */}
              <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-100">Edit Team Details</h4>
                  <p className="text-[11px] text-slate-400">Update team name, custom logo, or max capacity</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setEditModalOpen(true)}>
                  Edit Team
                </Button>
              </div>

              {/* Transfer Captainship */}
              <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-100">Transfer Captainship</h4>
                  <p className="text-[11px] text-slate-400">Delegate administrative submission authority to another member</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setTransferModalOpen(true)}>
                  Transfer Role
                </Button>
              </div>

              {/* Archive / Deactivate Team */}
              <div className="p-4 bg-[#0F172A] rounded-xl border border-amber-500/30 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-amber-300">Archive or Deactivate Squad</h4>
                  <p className="text-[11px] text-slate-400">Preserves historical academic submissions, evaluations, and classroom records</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-amber-500/40 text-amber-300 hover:bg-amber-950/30"
                  leftIcon={<Archive className="w-4 h-4" />}
                  onClick={() => setArchiveModalOpen(true)}
                >
                  Archive Squad
                </Button>
              </div>

              {/* Delete Team */}
              <div className="p-4 bg-[#0F172A] rounded-xl border border-red-500/30 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-red-400">Permanently Delete Team</h4>
                  <p className="text-[11px] text-slate-400">Permanently removes the squad. Blocked if team has active classroom records.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-500/40 text-red-400 hover:bg-red-950/30"
                  leftIcon={<Trash2 className="w-4 h-4" />}
                  onClick={() => setDeleteModalOpen(true)}
                >
                  Delete Team
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Only the team captain can modify administrative settings.</p>
          )}
        </Card>
      )}

      {/* Invite Member Modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite Team Member"
        description="Search for a student using their unique Permanent User ID (e.g. PRV-10484)"
      >
        <form onSubmit={handleSendInvite} className="space-y-4">
          <Input
            label="Permanent User ID"
            placeholder="e.g. PRV-10484"
            value={inviteId}
            onChange={e => setInviteId(e.target.value)}
            helperText="Check recipient's profile or institutional directory for their PRV-XXXXX code."
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={inviting} leftIcon={<UserPlus className="w-4 h-4" />}>
              {inviting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT TEAM MODAL */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Team Details"
        description="Update team name, custom logo, or max team capacity (2 - 20 members)."
      >
        <form onSubmit={handleSaveEditTeam} className="space-y-5">
          <Input
            label="Team Name"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            required
          />

          {/* Logo upload in Edit */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Team Logo
            </label>
            <div className="flex items-center gap-4 p-3 bg-[#0F172A] rounded-xl border border-[#243047]">
              <div className="relative w-14 h-14 rounded-xl bg-[#111827] border border-[#243047] flex items-center justify-center overflow-hidden shrink-0 group">
                {editLogoPreview ? (
                  <>
                    <img src={editLogoPreview} alt="Logo Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setEditLogoPreview('');
                        setEditLogoFile(null);
                        if (editLogoInputRef.current) editLogoInputRef.current.value = '';
                      }}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"
                      title="Remove"
                    >
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  </>
                ) : (
                  <ImageIcon className="w-5 h-5 text-slate-600" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <input
                  ref={editLogoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) handleEditLogoSelect(e.target.files[0]);
                  }}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Upload className="w-3.5 h-3.5 text-purple-400" />}
                  onClick={() => editLogoInputRef.current?.click()}
                >
                  {editLogoPreview ? 'Change Logo' : 'Upload Logo'}
                </Button>
                <p className="text-[11px] text-slate-400">PNG, JPG, or WEBP up to 5MB.</p>
              </div>
            </div>
          </div>

          {/* Max Size in Edit */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Max Team Size (2 - 20)
              </label>
              <span className="font-mono text-xs text-purple-300">
                Min required: {team.members.length} members
              </span>
            </div>
            <div className="p-3 bg-[#0F172A] rounded-xl border border-[#243047] flex items-center gap-4">
              <input
                type="range"
                min={Math.max(2, team.members.length)}
                max={20}
                value={editMaxSize}
                onChange={e => setEditMaxSize(parseInt(e.target.value, 10))}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <span className="font-mono text-sm font-bold text-purple-300 w-8 text-center">{editMaxSize}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Classroom Admin approval requires the team to reach exactly {editMaxSize}/{editMaxSize} members.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#243047]">
            <Button variant="outline" type="button" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={savingEdit}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* REQUEST CLASSROOM PARTICIPATION MODAL */}
      <Modal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        title="Request Classroom Participation"
        description="Enroll this squad in an academic classroom cohort. You can send a request even if your roster is incomplete."
      >
        <form onSubmit={handleRequestParticipation} className="space-y-4">
          <Input
            label="Classroom Code or ID"
            placeholder="e.g. CLS-82910"
            value={requestTarget}
            onChange={e => setRequestTarget(e.target.value)}
            helperText="Enter the Classroom Code provided by your instructor or coordinator."
            required
          />

          <div className="p-3 bg-[#0F172A] rounded-xl border border-[#243047] text-xs text-slate-300 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-100">Current Squad Roster:</span>
              <Badge variant={team.members.length < team.maxSize ? 'amber' : 'success'} size="sm">
                {team.members.length} / {team.maxSize} Members
              </Badge>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              {team.members.length < team.maxSize ? (
                <span>
                  <strong>Notice:</strong> Your team will have status <span className="text-amber-300 font-semibold">"Incomplete Team – {team.members.length}/{team.maxSize} Members"</span>. Classroom Admin can only approve once exactly {team.maxSize}/{team.maxSize} members have joined.
                </span>
              ) : (
                <span>
                  <strong>Roster Full:</strong> Your team has reached {team.maxSize}/{team.maxSize} members and will immediately be <span className="text-purple-300 font-semibold">"Ready for Approval"</span>!
                </span>
              )}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setRequestModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={requestingParticipation} leftIcon={<School className="w-4 h-4" />}>
              Send Participation Request
            </Button>
          </div>
        </form>
      </Modal>

      {/* WITHDRAW PARTICIPATION MODAL */}
      <Modal
        isOpen={withdrawModalOpen}
        onClose={() => setWithdrawModalOpen(false)}
        title="Withdraw Participation Request"
        description="Are you sure you want to withdraw this team's participation request for this classroom?"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            You can re-request participation at any time as long as the classroom submission deadline has not passed.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setWithdrawModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" isLoading={withdrawing} onClick={handleWithdrawParticipation}>
              Confirm Withdrawal
            </Button>
          </div>
        </div>
      </Modal>

      {/* ARCHIVE TEAM MODAL */}
      <Modal
        isOpen={archiveModalOpen}
        onClose={() => setArchiveModalOpen(false)}
        title="Archive Team"
        description="Archive this completed or inactive project squad."
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl text-xs text-amber-300 space-y-1">
            <span className="font-bold block">Historical Records Preserved:</span>
            <span>All classroom submissions, faculty viva scores, and evaluation history remain safely intact for audit.</span>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setArchiveModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" isLoading={archiving} onClick={handleArchiveTeam} leftIcon={<Archive className="w-4 h-4" />}>
              Archive Team
            </Button>
          </div>
        </div>
      </Modal>

      {/* DELETE TEAM CONFIRMATION MODAL */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Team Confirmation"
        description="Are you sure you want to delete this team?"
      >
        <div className="space-y-4">
          <div className="p-3 bg-red-950/20 border border-red-500/30 rounded-xl text-xs text-red-300 space-y-1">
            <span className="font-bold flex items-center gap-1.5 text-red-200">
              <AlertTriangle className="w-4 h-4 text-red-400" /> Permanent Action
            </span>
            <span>
              If this team has submitted projects or classroom evaluations, deletion will be blocked to safeguard academic audit records. Consider archiving instead.
            </span>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              className="border-red-500 text-red-400 hover:bg-red-950/30"
              isLoading={deleting}
              onClick={handleDeleteTeam}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Permanently Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Transfer Captainship Modal */}
      <Modal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        title="Transfer Captainship"
        description="Select an enrolled member to become the new Captain of this squad"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            {team.members.filter(m => m.userId !== user?.id).map(m => (
              <label
                key={m.userId}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  selectedNewCaptain === m.userId
                    ? 'border-purple-500 bg-purple-950/40'
                    : 'border-[#243047] bg-[#0F172A] hover:bg-[#172033]'
                }`}
              >
                <div>
                  <span className="text-xs font-bold text-slate-100 block">{m.name}</span>
                  <span className="font-mono text-[11px] text-slate-400">{m.permanentId}</span>
                </div>
                <input
                  type="radio"
                  name="newCaptain"
                  checked={selectedNewCaptain === m.userId}
                  onChange={() => setSelectedNewCaptain(m.userId)}
                  className="text-purple-600 focus:ring-purple-500"
                />
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setTransferModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!selectedNewCaptain || transferring}
              onClick={handleTransferCaptain}
            >
              {transferring ? 'Transferring...' : 'Confirm Transfer'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
