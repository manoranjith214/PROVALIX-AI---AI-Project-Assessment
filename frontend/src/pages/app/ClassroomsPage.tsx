import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { classroomService } from '../../services/classroomService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Classroom } from '../../types';
import { 
  School, 
  Plus, 
  Search, 
  ArrowRight, 
  Calendar, 
  Loader2, 
  LogIn, 
  Copy, 
  Check,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';

export const ClassroomsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Join modal state (2-step verification flow)
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinStep, setJoinStep] = useState<1 | 2>(1);
  const [joinCode, setJoinCode] = useState('');
  const [teamIdentifier, setTeamIdentifier] = useState('');
  const [verifiedClassroom, setVerifiedClassroom] = useState<any | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [joining, setJoining] = useState(false);

  const loadClassrooms = useCallback(async () => {
    setLoading(true);
    try {
      const data = await classroomService.getClassrooms();
      setClassrooms(data);
    } catch (err) {
      console.error('[ClassroomsPage] Failed to load classrooms:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClassrooms();
  }, [loadClassrooms]);

  const handleCopyCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    success(`Classroom Code ${code} copied!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleResetJoinModal = () => {
    setJoinModalOpen(false);
    setJoinStep(1);
    setJoinCode('');
    setTeamIdentifier('');
    setVerifiedClassroom(null);
    setSelectedTeam(null);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      error('Please enter a classroom join code.');
      return;
    }

    setVerifying(true);
    try {
      const res = await classroomService.verifyCode(joinCode.trim());
      if (res.success && res.data) {
        setVerifiedClassroom(res.data);
        setJoinStep(2);
        success('Classroom verified');
        // Auto-select user's first team if available in Team mode
        if (res.data.submissionMode === 'Team' && res.data.userTeams?.length > 0) {
          const first = res.data.userTeams[0];
          setSelectedTeam(first);
          setTeamIdentifier(first.code || first.id);
        }
      } else {
        error(res.message || 'Invalid Classroom Code');
      }
    } catch (err: any) {
      error(err.message || 'Invalid Classroom Code');
    } finally {
      setVerifying(false);
    }
  };

  const handleJoinClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedClassroom) return;

    if (verifiedClassroom.submissionMode === 'Team' && !teamIdentifier.trim()) {
      error('Enter your Team ID / Team Code to continue.');
      return;
    }

    setJoining(true);
    try {
      const res = await classroomService.joinByCode(
        verifiedClassroom.code,
        verifiedClassroom.submissionMode === 'Team' ? teamIdentifier.trim() : undefined
      );

      if (res.success) {
        success(res.message);
        handleResetJoinModal();
        if (res.classroomId) {
          navigate(`/classrooms/${res.classroomId}`);
        } else {
          await loadClassrooms();
        }
      } else {
        error(res.message);
      }
    } catch (err: any) {
      error(err.message || 'Failed to submit classroom join request');
    } finally {
      setJoining(false);
    }
  };

  const filtered = classrooms.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const anyDemo = classrooms.some(c => !c.isBackend);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Classrooms & Cohorts"
        subtitle="Contextual evaluation cohorts with customizable submission modes, resource mandates, faculty viva scoring, and owner verification."
        showDemoBadge={anyDemo}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              leftIcon={<LogIn className="w-4 h-4" />}
              onClick={() => {
                handleResetJoinModal();
                setJoinModalOpen(true);
              }}
            >
              Join via Code
            </Button>
            <Link to="/classrooms/create">
              <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
                Create Classroom
              </Button>
            </Link>
          </div>
        }
      />

      <div className="max-w-md">
        <Input
          placeholder="Search classrooms by name or code..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-4" />
          <p className="text-sm font-medium text-slate-400">Loading your classroom cohorts...</p>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#0F172A] border border-[#243047] flex items-center justify-center mx-auto text-purple-400">
            <School className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-100">No Classrooms Found</h3>
          <p className="text-xs text-slate-400">
            {searchQuery
              ? `No classrooms matching "${searchQuery}". Try a different keyword.`
              : 'You are not currently enrolled in or managing any classroom cohorts.'}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => { handleResetJoinModal(); setJoinModalOpen(true); }}>
              Join with Code
            </Button>
            <Link to="/classrooms/create">
              <Button variant="primary" size="sm">
                Create New Classroom
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(cls => {
            const isOwner = cls.ownerId === user?.id || cls.currentUserRole === 'OWNER';
            const isEvaluator = cls.currentUserRole === 'EVALUATOR';
            const subCount = cls.submissionCount ?? 0;
            const memberCount = cls.participantCount ?? 1;

            return (
              <Card key={cls.id} className="p-6 flex flex-col justify-between hoverable space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold bg-[#0F172A] text-purple-300 px-2.5 py-1 rounded-lg border border-[#243047]">
                        {cls.code}
                      </span>
                      <button
                        onClick={e => handleCopyCode(cls.code, e)}
                        className="p-1 hover:bg-[#172033] rounded text-slate-400 hover:text-slate-100 transition-colors"
                        title="Copy Code"
                      >
                        {copiedCode === cls.code ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isOwner ? (
                        <Badge variant="primary" size="sm">Owner / Admin</Badge>
                      ) : isEvaluator ? (
                        <Badge variant="amber" size="sm">Faculty Evaluator</Badge>
                      ) : (
                        <Badge variant="slate" size="sm">Participant</Badge>
                      )}
                      {cls.status && (
                        <Badge variant={cls.status === 'Active' ? 'success' : 'slate'} size="sm">
                          {cls.status}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    {cls.logo ? (
                      <img
                        src={cls.logo}
                        alt={cls.name}
                        className="w-11 h-11 rounded-xl object-cover border border-[#243047] shrink-0 bg-[#0F172A]"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-purple-950/40 border border-purple-800/40 flex items-center justify-center text-purple-300 font-bold shrink-0">
                        {cls.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-100 leading-tight">{cls.name}</h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{cls.description}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-[#0F172A] rounded-xl space-y-1.5 text-xs text-slate-300 border border-[#243047]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Owner:</span>
                      <span className="font-semibold text-slate-100 truncate max-w-[150px]">{cls.ownerName || 'Classroom Owner'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Submission Mode:</span>
                      <span className="font-semibold text-purple-300">
                        {cls.submissionMode} Mode
                        {cls.submissionMode === 'Team' && (
                          <span className="text-slate-400 font-normal ml-1">
                            ({cls.minTeamSize === cls.maxTeamSize ? `${cls.minTeamSize} members` : `${cls.minTeamSize ?? 2}–${cls.maxTeamSize ?? 4} members`})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Participants:</span>
                      <span className="font-semibold text-slate-100">{memberCount} Enrolled</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Submissions:</span>
                      <span className="font-semibold text-slate-100">{subCount} Submissions</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Deadline:</span>
                      <span className="font-medium text-slate-200">{cls.submissionDeadline}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#243047] flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Started {cls.startDate}
                  </span>
                  <Link to={`/classrooms/${cls.id}`}>
                    <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                      Enter Classroom
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 2-Step Join Classroom Modal */}
      <Modal
        isOpen={joinModalOpen}
        onClose={handleResetJoinModal}
        title={joinStep === 1 ? 'Join Classroom Cohort' : `Join "${verifiedClassroom?.name}"`}
        description={
          joinStep === 1
            ? 'Enter the unique alphanumeric classroom join code distributed by your instructor or coordinator.'
            : verifiedClassroom?.submissionMode === 'Team'
            ? 'Select or enter your Team ID / Code to submit your squad participation request.'
            : 'Confirm your individual enrollment and send a join request for admin approval.'
        }
      >
        {joinStep === 1 ? (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <Input
              label="Classroom Code"
              placeholder="e.g. CLS-10492"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              helperText="Format: CLS-XXXXX. If joining a team classroom, your squad will be verified in Step 2."
              required
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={handleResetJoinModal}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={verifying} leftIcon={<LogIn className="w-4 h-4" />}>
                {verifying ? 'Verifying Code...' : 'Verify Classroom Code'}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleJoinClassroom} className="space-y-4">
            {/* Verified Classroom Summary Card */}
            <div className="p-3.5 rounded-xl bg-[#0F172A] border border-[#243047] flex items-center gap-3">
              {verifiedClassroom?.logo ? (
                <img
                  src={verifiedClassroom.logo}
                  alt={verifiedClassroom.name}
                  className="w-12 h-12 rounded-xl object-cover border border-[#243047] shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-purple-950/40 border border-purple-800/40 flex items-center justify-center text-purple-300 font-bold shrink-0">
                  {verifiedClassroom?.name?.slice(0, 2).toUpperCase() || 'CL'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-100 truncate">{verifiedClassroom?.name}</h4>
                  <Badge variant="ai" size="sm">{verifiedClassroom?.submissionMode} Mode</Badge>
                </div>
                <p className="text-xs text-slate-400 truncate mt-0.5">{verifiedClassroom?.description || 'Evaluation Cohort'}</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Code: <strong className="text-purple-300">{verifiedClassroom?.code}</strong> • Deadline: {verifiedClassroom?.deadline ? new Date(verifiedClassroom.deadline).toLocaleDateString() : 'Active'}
                </p>
              </div>
            </div>

            {/* Already enrolled notice */}
            {verifiedClassroom?.isEnrolled && (
              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/50 flex items-center gap-2 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>You are already enrolled in this classroom as <strong>{verifiedClassroom.memberRole || 'Member'}</strong> (Status: {verifiedClassroom.memberStatus || 'Approved'}).</span>
              </div>
            )}

            {/* Individual Mode Details */}
            {verifiedClassroom?.submissionMode === 'Individual' && (
              <div className="p-3 rounded-lg bg-[#0F172A] border border-[#243047] text-xs text-slate-300 space-y-1.5">
                <p className="font-semibold text-slate-100">Individual Participant Enrollment</p>
                <p className="text-slate-400">
                  Clicking "Send Join Request" registers your account with status <strong>Pending Approval</strong>. The Classroom Admin will be notified to review and approve your participation.
                </p>
              </div>
            )}

            {/* Team Mode Details & Verification */}
            {verifiedClassroom?.submissionMode === 'Team' && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-purple-950/20 border border-purple-800/30 text-xs text-purple-300">
                  <span>
                    Classroom Team Rule: <strong>
                      {verifiedClassroom.minTeamSize === verifiedClassroom.maxTeamSize
                        ? `Exactly ${verifiedClassroom.minTeamSize} members required`
                        : `${verifiedClassroom.minTeamSize} to ${verifiedClassroom.maxTeamSize} members allowed`}
                    </strong>.
                  </span>
                </div>

                {/* Pre-select from user's active squads if any exist */}
                {verifiedClassroom?.userTeams?.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Select From Your Teams
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {verifiedClassroom.userTeams.map((t: any) => {
                        const isSelected = teamIdentifier === t.code || teamIdentifier === t.id;
                        return (
                          <div
                            key={t.id}
                            onClick={() => {
                              setSelectedTeam(t);
                              setTeamIdentifier(t.code || t.id);
                            }}
                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                              isSelected
                                ? 'border-purple-500 bg-purple-950/40 shadow-xs'
                                : 'border-[#243047] bg-[#0F172A] hover:bg-[#172033]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              {t.logo ? (
                                <img src={t.logo} alt={t.name} className="w-8 h-8 rounded-lg object-cover" />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-slate-800 text-purple-300 font-bold flex items-center justify-center text-xs">
                                  {t.name.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <span className="text-xs font-bold text-slate-100">{t.name}</span>
                                <span className="text-[11px] text-slate-400 block font-mono">{t.code}</span>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                                t.isValidSize ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40' : 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                              }`}>
                                {t.memberCount} Members
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <Input
                  label="Enter Team ID / Team Code"
                  placeholder="e.g. TM-10492 or Team UUID"
                  value={teamIdentifier}
                  onChange={e => {
                    setTeamIdentifier(e.target.value.toUpperCase());
                    const matched = verifiedClassroom.userTeams?.find(
                      (t: any) => t.code === e.target.value.toUpperCase() || t.id === e.target.value
                    );
                    setSelectedTeam(matched || null);
                  }}
                  helperText="The backend verifies that you belong to this team and that its member count satisfies the classroom's size rules."
                  required
                />

                {/* Live validation feedback for selected team */}
                {selectedTeam && (
                  <div>
                    {selectedTeam.isIncomplete ? (
                      <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-xs text-amber-300 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>Incomplete Team – {selectedTeam.memberCount}/{verifiedClassroom.minTeamSize} Members</span>
                        </div>
                        <p className="text-amber-200/90">
                          Your team needs at least {verifiedClassroom.minTeamSize} members to join this classroom. Add members to your team before joining this classroom.
                        </p>
                      </div>
                    ) : selectedTeam.isTooLarge ? (
                      <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-xs text-red-300">
                        <span>Your team exceeds the maximum team size of {verifiedClassroom.maxTeamSize} (Current: {selectedTeam.memberCount} members).</span>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Team verified — {selectedTeam.memberCount}/{verifiedClassroom.maxTeamSize} members</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setJoinStep(1)}
                leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              >
                Back
              </Button>

              <div className="flex gap-2">
                <Button variant="outline" type="button" onClick={handleResetJoinModal}>
                  Cancel
                </Button>

                {selectedTeam?.isIncomplete ? (
                  <Link to={`/teams/${selectedTeam.id}`}>
                    <Button variant="primary" type="button">
                      Add Members to Continue
                    </Button>
                  </Link>
                ) : (
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={joining || selectedTeam?.isTooLarge}
                    leftIcon={<LogIn className="w-4 h-4" />}
                  >
                    {joining
                      ? 'Submitting Request...'
                      : verifiedClassroom?.submissionMode === 'Team'
                      ? 'Submit Team Join Request'
                      : 'Join Classroom'}
                  </Button>
                )}
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

