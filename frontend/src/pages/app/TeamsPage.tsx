import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { teamService } from '../../services/teamService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Team } from '../../types';
import { 
  Users, 
  Plus, 
  Search, 
  ArrowRight, 
  Crown, 
  Check, 
  X, 
  Loader2, 
  Mail, 
  UserCheck,
  Calendar
} from 'lucide-react';

export const TeamsPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [teams, setTeams] = useState<Team[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [processingInviteId, setProcessingInviteId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedTeams, fetchedInvites] = await Promise.all([
        teamService.getTeams(),
        teamService.getMyInvitations(),
      ]);
      setTeams(fetchedTeams);
      setInvitations(fetchedInvites);
    } catch {
      // Handled by service fallbacks
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAcceptInvite = async (inviteId: string) => {
    setProcessingInviteId(inviteId);
    try {
      const res = await teamService.acceptInvite(inviteId);
      if (res.success) {
        success('Squad invitation accepted! You are now a team member.');
        await loadData();
      } else {
        error(res.message);
      }
    } catch (err: any) {
      error(err?.message || 'Failed to accept invitation.');
    } finally {
      setProcessingInviteId(null);
    }
  };

  const handleRejectInvite = async (inviteId: string) => {
    setProcessingInviteId(inviteId);
    try {
      const res = await teamService.rejectInvite(inviteId);
      if (res.success) {
        success('Squad invitation declined.');
        await loadData();
      } else {
        error(res.message);
      }
    } catch (err: any) {
      error(err?.message || 'Failed to decline invitation.');
    } finally {
      setProcessingInviteId(null);
    }
  };

  const filtered = teams.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Team Management"
        subtitle="Reusable project squads. Create cohorts, invite peers via Permanent User IDs (PRV-XXXXX), and submit projects collaboratively across multiple classrooms."
        showDemoBadge={teams.some(t => !t.isBackend)}
        actions={
          <Link to="/teams/create">
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
              Create Team
            </Button>
          </Link>
        }
      />

      {/* Pending Invitations Alert Banner */}
      {invitations.length > 0 && (
        <Card className="p-5 bg-[#0F172A] border-purple-500/30 space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-bold text-slate-100">
              Incoming Squad Invitations ({invitations.length})
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            You have received invitations to join the following project squads:
          </p>

          <div className="space-y-2.5 pt-1">
            {invitations.map(inv => (
              <div 
                key={inv.id} 
                className="p-3.5 bg-[#111827] rounded-xl border border-[#243047] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-100">{inv.team?.name || 'Project Squad'}</span>
                    <span className="font-mono text-xs font-semibold bg-[#0B1120] text-purple-300 px-2 py-0.5 rounded border border-[#243047]">
                      {inv.team?.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Invited by Captain <strong className="text-slate-200">{inv.team?.captain?.name || 'Captain'}</strong> ({inv.team?.captain?.permanentId || 'PRV-USER'}) • {new Date(inv.invitedAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="primary"
                    size="sm"
                    isLoading={processingInviteId === inv.id}
                    leftIcon={<Check className="w-3.5 h-3.5" />}
                    onClick={() => handleAcceptInvite(inv.id)}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={processingInviteId === inv.id}
                    leftIcon={<X className="w-3.5 h-3.5 text-error" />}
                    onClick={() => handleRejectInvite(inv.id)}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Search Bar */}
      <div className="max-w-md">
        <Input
          placeholder="Search teams by squad name or team code..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          <p className="text-xs font-medium">Fetching your project squads...</p>
        </div>
      ) : filtered.length === 0 ? (
        /* Empty State */
        <Card className="p-12 text-center space-y-4 max-w-md mx-auto my-8">
          <div className="w-12 h-12 rounded-full bg-[#0F172A] text-purple-400 border border-[#243047] mx-auto flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-100">No Teams Found</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {searchQuery 
              ? 'No squad matched your search query. Try typing another name or team code.'
              : 'You are not enrolled in any project squads yet. Form your squad or wait for an invitation.'}
          </p>
          <div className="pt-2">
            <Link to="/teams/create">
              <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                Create New Team
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        /* Teams Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(team => {
            const isMember = team.members.some(m => m.userId === user.id);
            const isCaptain = team.captainId === user.id;
            const captainObj = team.members.find(m => m.role === 'Captain' || m.userId === team.captainId);

            return (
              <Card key={team.id} className="p-6 flex flex-col justify-between hoverable space-y-4">
                <div className="space-y-3">
                  {/* Header: Code & Role */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-[#0F172A] text-purple-300 px-2.5 py-1 rounded-lg border border-[#243047]">
                        {team.code}
                      </span>
                    </div>
                    {isCaptain ? (
                      <Badge variant="primary" size="sm" icon={<Crown className="w-3 h-3" />}>Captain</Badge>
                    ) : isMember ? (
                      <Badge variant="success" size="sm" icon={<UserCheck className="w-3 h-3" />}>Member</Badge>
                    ) : (
                      <Badge variant="slate" size="sm">Roster</Badge>
                    )}
                  </div>

                  {/* Team Info */}
                  <div className="flex items-center gap-3 pt-1">
                    <div className="w-11 h-11 rounded-xl bg-[#0F172A] border border-[#243047] flex items-center justify-center font-bold text-base text-purple-300 shrink-0 overflow-hidden">
                      {team.logo ? (
                        <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
                      ) : (
                        team.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-100 leading-tight">{team.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Captain: <strong className="text-slate-200">{captainObj?.name || 'Assigned'}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Roster & Size Metrics */}
                  <div className="p-3 bg-[#0F172A] rounded-xl space-y-1.5 text-xs text-slate-300 border border-[#243047]">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Squad Capacity:</span>
                      <span className="font-semibold text-slate-100">
                        {team.members.length} / {team.maxSize} Members
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Squad Status:</span>
                      <Badge
                        variant={
                          team.status === 'ARCHIVED'
                            ? 'slate'
                            : team.status === 'DEACTIVATED'
                            ? 'amber'
                            : team.members.length >= team.maxSize
                            ? 'success'
                            : 'primary'
                        }
                        size="sm"
                      >
                        {team.status || (team.members.length >= team.maxSize ? 'Roster Full' : 'Active')}
                      </Badge>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center gap-1.5">
                    {team.members.map(m => {
                      const avatarUrl = (user && (m.userId === user.id || m.permanentId === user.permanentId))
                        ? (user.avatar || user.profileImage)
                        : m.avatar;
                      return (
                        <div
                          key={m.userId}
                          title={`${m.name} (${m.role}) - ${m.permanentId}`}
                          className="w-7 h-7 rounded-full bg-purple-950/80 border-2 border-[#111827] text-[10px] font-bold text-purple-300 flex items-center justify-center shrink-0 overflow-hidden"
                        >
                          {avatarUrl ? (
                            <img src={avatarUrl} alt={m.name} className="w-full h-full object-cover" />
                          ) : (
                            m.name.charAt(0)
                          )}
                        </div>
                      );
                    })}
                    {team.invitations.filter(i => i.status === 'Pending').length > 0 && (
                      <span className="text-[11px] text-amber-400 font-semibold ml-1">
                        +{team.invitations.filter(i => i.status === 'Pending').length} pending
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-4 border-t border-[#243047] flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(team.createdAt).toLocaleDateString()}
                  </span>
                  <Link to={`/teams/${team.id}`}>
                    <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                      View Team
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
