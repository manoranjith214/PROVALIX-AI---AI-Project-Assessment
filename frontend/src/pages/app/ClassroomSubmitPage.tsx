import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { classroomService } from '../../services/classroomService';
import { teamService } from '../../services/teamService';
import { projectService } from '../../services/projectService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ProjectDetails, Classroom, Team } from '../../types';
import { 
  ArrowLeft, 
  UploadCloud, 
  Users, 
  School, 
  AlertCircle,
  Copy,
  Loader2,
  Crown
} from 'lucide-react';

export const ClassroomSubmitPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const [userProjects, setUserProjects] = useState<ProjectDetails[]>([]);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [proposedSolution, setProposedSolution] = useState('');
  const [objectives, setObjectives] = useState('');
  const [innovation, setInnovation] = useState('');
  const [features, setFeatures] = useState('');
  const [targetUsers, setTargetUsers] = useState('');
  const [technologies, setTechnologies] = useState('');
  const [programmingLanguages, setProgrammingLanguages] = useState('');
  const [testingApproach, setTestingApproach] = useState('');
  const [limitations, setLimitations] = useState('');
  const [futureEnhancements, setFutureEnhancements] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [liveDemoUrl, setLiveDemoUrl] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  const loadInitialData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [cls, userTeams, projects] = await Promise.all([
        classroomService.getClassroomById(id),
        teamService.getTeams(),
        projectService.getAllProjects(),
      ]);
      setClassroom(cls || null);
      setTeams(userTeams);
      setUserProjects(projects);

      // In team mode, auto-select first team where user is captain
      if (cls?.submissionMode === 'Team') {
        const captainedTeam = userTeams.find(t => t.captainId === user?.id);
        if (captainedTeam) {
          setSelectedTeamId(captainedTeam.id);
        } else if (userTeams.length > 0) {
          setSelectedTeamId(userTeams[0].id);
        }
      }
    } catch (err) {
      console.error('[ClassroomSubmitPage] Error loading initial data:', err);
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Auto-fill from Project Checker
  const handleReuseProjectCheckerData = () => {
    if (userProjects.length === 0) {
      error('No existing Project Checker evaluations found to reuse.');
      return;
    }
    const sample = userProjects[0];
    setTitle(sample.title);
    setCategory(sample.category);
    setDescription(sample.description);
    setProblemStatement(sample.problemStatement);
    setProposedSolution(sample.proposedSolution);
    setObjectives(sample.objectives);
    setInnovation(sample.innovation);
    setFeatures(sample.features);
    setTargetUsers(sample.targetUsers);
    setTechnologies(sample.technologies.join(', '));
    setProgrammingLanguages(sample.programmingLanguages.join(', '));
    setTestingApproach(sample.testingApproach);
    setLimitations(sample.limitations);
    setFutureEnhancements(sample.futureEnhancements);
    setGithubUrl(sample.githubUrl || '');
    setLiveDemoUrl(sample.liveDemoUrl || '');

    success(`Reused data from "${sample.title}"! All metadata pre-filled.`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classroom) return;

    if (!title.trim()) {
      error('Please enter a project title.');
      return;
    }

    // Check resource requirements
    const isGithubRequired = classroom.resources?.some(r => r.type === 'github' && r.required);
    if (isGithubRequired && !githubUrl.trim()) {
      error('GitHub Repository URL is marked as a required resource for this classroom.');
      return;
    }

    if (classroom.submissionMode === 'Team') {
      if (!selectedTeamId) {
        error('Please select a team for this squad submission.');
        return;
      }
      const selectedTeam = teams.find(t => t.id === selectedTeamId);
      if (selectedTeam && selectedTeam.captainId !== user?.id) {
        error(`Only the Team Captain (${selectedTeam.members.find(m => m.role === 'Captain')?.name || 'Captain'}) can submit on behalf of "${selectedTeam.name}".`);
        return;
      }
    }

    setIsLoading(true);
    try {
      const selectedTeam = teams.find(t => t.id === selectedTeamId);
      const projectDetails: ProjectDetails = {
        id: `proj_${Date.now().toString().slice(-6)}`,
        title,
        category,
        description,
        problemStatement,
        proposedSolution,
        objectives,
        innovation,
        features,
        targetUsers,
        technologies: technologies ? technologies.split(',').map(s => s.trim()).filter(Boolean) : [],
        programmingLanguages: programmingLanguages ? programmingLanguages.split(',').map(s => s.trim()).filter(Boolean) : [],
        testingApproach,
        limitations,
        futureEnhancements,
        githubUrl: githubUrl.trim() || undefined,
        liveDemoUrl: liveDemoUrl.trim() || undefined,
        resources: [
          { type: 'sourceCode', name: 'submission_code.zip', size: '21.4 MB', uploadedAt: new Date().toISOString(), status: 'uploaded' },
          { type: 'projectReport', name: 'submission_thesis.pdf', size: '5.8 MB', uploadedAt: new Date().toISOString(), status: 'uploaded' },
        ],
        createdAt: new Date().toISOString(),
      };

      await classroomService.submitProject({
        classroomId: classroom.id,
        submitterId: user.id,
        submitterName: user.name,
        teamId: classroom.submissionMode === 'Team' ? selectedTeamId : undefined,
        teamName: classroom.submissionMode === 'Team' ? selectedTeam?.name : undefined,
        project: projectDetails,
      });

      success('Project successfully submitted to classroom! Automated AI evaluation (/50) initiated.');
      navigate(`/classrooms/${classroom.id}`);
    } catch (err: any) {
      error(err.message || 'Failed to submit project.');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-sm font-medium text-brand-muted">Loading classroom submission form...</p>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="p-12 text-center max-w-md mx-auto space-y-4">
        <p className="text-base font-semibold text-slate-100">Classroom not found.</p>
        <Link to="/classrooms">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Classrooms
          </Button>
        </Link>
      </div>
    );
  }

  const captainTeams = teams.filter(t => t.captainId === user?.id);
  const isTeamMode = classroom.submissionMode === 'Team';
  const canSubmitTeam = !isTeamMode || captainTeams.length > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title={`Submit Project to ${classroom.name}`}
        subtitle={`Classroom Cohort Submission. Mode: ${classroom.submissionMode}.`}
        breadcrumbs={
          <Link to={`/classrooms/${classroom.id}`} className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Classroom Dashboard
          </Link>
        }
      />

      {/* Auto-filled Cohort Header Card */}
      <Card className="p-5 bg-[#0F172A] border-purple-500/30 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <School className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">Cohort Information</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReuseProjectCheckerData}
            leftIcon={<Copy className="w-3.5 h-3.5 text-purple-400" />}
          >
            Reuse Project Checker Data
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-300">
          <div>
            <span className="text-slate-400 block">Classroom:</span>
            <span className="font-bold text-slate-100">{classroom.name}</span>
          </div>
          <div>
            <span className="text-slate-400 block">Submission Mode:</span>
            <span className="font-bold text-slate-100">{classroom.submissionMode} Mode</span>
          </div>
          <div>
            <span className="text-slate-400 block">
              {isTeamMode ? 'Submitting As:' : 'Submitter:'}
            </span>
            <span className="font-bold text-slate-100">
              {isTeamMode ? (teams.find(t => t.id === selectedTeamId)?.name || 'Select Team') : user.name}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Deadline:</span>
            <span className="font-bold text-purple-400">{classroom.submissionDeadline}</span>
          </div>
        </div>
      </Card>

      {/* Team Selection & Captaincy Warning in Team Mode */}
      {isTeamMode && (
        <Card className="p-5 border-[#243047] space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Team Mode Selection
            </h4>
          </div>

          {!canSubmitTeam ? (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                Team Captain Required
              </div>
              <p>
                In Team Mode, only the designated Team Captain can submit on behalf of the squad. You are currently not a Captain of any squad.
              </p>
              <Link to="/teams/create" className="inline-block mt-1">
                <Button variant="outline" size="sm">
                  Create a New Squad as Captain
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Select Squad for Submission:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {captainTeams.map(t => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTeamId(t.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                      selectedTeamId === t.id
                        ? 'border-purple-500 bg-purple-950/40 shadow-2xs'
                        : 'border-[#243047] bg-[#0F172A] hover:bg-[#172033]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-100">{t.name}</span>
                        <Badge variant="primary" size="sm" icon={<Crown className="w-3 h-3" />}>Captain</Badge>
                      </div>
                      <span className="font-mono text-[11px] text-slate-400">{t.code} • {t.members.length} members</span>
                    </div>
                    <input
                      type="radio"
                      name="selectedTeam"
                      checked={selectedTeamId === t.id}
                      onChange={() => setSelectedTeamId(t.id)}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Submission Form */}
      <Card className="p-6 sm:p-8 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Overview */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider">
              1. Project Title & Overview
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Project Title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Distributed Consensus Engine"
                  required
                />
              </div>
              <Input
                label="Category / Domain"
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="e.g. Cloud Systems"
                required
              />
              <Input
                label="Target Users"
                value={targetUsers}
                onChange={e => setTargetUsers(e.target.value)}
                placeholder="e.g. Enterprise Cloud Teams"
                required
              />
              <div className="sm:col-span-2">
                <Textarea
                  label="Executive Summary"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Problem & Innovation */}
          <div className="space-y-4 pt-4 border-t border-[#243047]">
            <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider">
              2. Problem Statement, Solution & Innovation
            </h3>
            <div className="space-y-4">
              <Textarea
                label="Problem Statement"
                value={problemStatement}
                onChange={e => setProblemStatement(e.target.value)}
                rows={2}
                required
              />
              <Textarea
                label="Proposed Solution"
                value={proposedSolution}
                onChange={e => setProposedSolution(e.target.value)}
                rows={2}
                required
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Textarea
                  label="Objectives"
                  value={objectives}
                  onChange={e => setObjectives(e.target.value)}
                  rows={2}
                />
                <Textarea
                  label="Innovation & Novelty"
                  value={innovation}
                  onChange={e => setInnovation(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Technical Details */}
          <div className="space-y-4 pt-4 border-t border-[#243047]">
            <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider">
              3. Technical Implementation, Stack & URLs
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Technologies & Frameworks"
                value={technologies}
                onChange={e => setTechnologies(e.target.value)}
                placeholder="e.g. Go, gRPC, Raft, Docker"
              />
              <Input
                label="Programming Languages"
                value={programmingLanguages}
                onChange={e => setProgrammingLanguages(e.target.value)}
                placeholder="e.g. Go, Rust, TypeScript"
              />
              <Input
                label="GitHub Repository URL"
                value={githubUrl}
                onChange={e => setGithubUrl(e.target.value)}
                placeholder="https://github.com/..."
                helperText={classroom.resources?.some(r => r.type === 'github' && r.required) ? 'Required by classroom configuration' : undefined}
              />
              <Input
                label="Live Demo URL"
                value={liveDemoUrl}
                onChange={e => setLiveDemoUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#243047] flex items-center justify-end gap-3">
            <Link to={`/classrooms/${classroom.id}`}>
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              disabled={isTeamMode && !canSubmitTeam}
              leftIcon={<UploadCloud className="w-4 h-4" />}
            >
              Submit Project for Evaluation
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
