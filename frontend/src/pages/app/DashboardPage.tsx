import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { projectCheckerService, ProjectCheckerProject } from '../../services/projectCheckerService';
import { classroomService } from '../../services/classroomService';
import { teamService } from '../../services/teamService';
import { notificationService } from '../../services/notificationService';
import { apiClient } from '../../services/api/apiClient';
import { Classroom, Team, AppNotification } from '../../types';
import { 
  ScanSearch, 
  Users, 
  School, 
  Plus, 
  ArrowRight, 
  FileText, 
  Clock, 
  Trophy, 
  Sparkles,
  Award,
  Calendar,
  Loader2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  AreaChart, 
  Area
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectCheckerProject[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [currentEvaluations, setCurrentEvaluations] = useState<any[]>([]);
  const [leaderboardPreview, setLeaderboardPreview] = useState<{
    classroomId?: string;
    classroomName?: string;
    topRanked: any[];
  }>({ topRanked: [] });

  useEffect(() => {
    let isMounted = true;
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [projRes, teamRes, classRes, notifRes, evalsRes, leaderRes] = await Promise.allSettled([
          projectCheckerService.listProjects({ limit: 10 }),
          teamService.getTeams(),
          classroomService.getClassrooms(),
          notificationService.getNotifications(user.id),
          apiClient.get<any[]>('/dashboard/current-evaluations'),
          apiClient.get<any>('/dashboard/leaderboard-preview'),
        ]);

        if (isMounted) {
          if (projRes.status === 'fulfilled' && Array.isArray(projRes.value)) {
            setProjects(projRes.value);
          }
          if (teamRes.status === 'fulfilled' && Array.isArray(teamRes.value)) {
            setTeams(teamRes.value);
          }
          if (classRes.status === 'fulfilled' && Array.isArray(classRes.value)) {
            setClassrooms(classRes.value);
          }
          if (notifRes.status === 'fulfilled' && Array.isArray(notifRes.value)) {
            setNotifications(notifRes.value);
          }
          if (evalsRes.status === 'fulfilled' && Array.isArray(evalsRes.value)) {
            setCurrentEvaluations(evalsRes.value);
          }
          if (leaderRes.status === 'fulfilled' && leaderRes.value) {
            setLeaderboardPreview(leaderRes.value);
          }
        }
      } catch (err) {
        console.warn('Dashboard real data load warning:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (user.id) {
      loadDashboardData();
    }
    return () => {
      isMounted = false;
    };
  }, [user.id]);

  // Evaluated projects
  const evaluatedProjects = useMemo(() => {
    return projects.filter(p => (p as any).aiEvaluation?.totalScore != null || p.overallScore != null || p.status === 'EVALUATED');
  }, [projects]);

  const avgScore = useMemo(() => {
    if (evaluatedProjects.length === 0) return null;
    const total = evaluatedProjects.reduce((acc, p) => {
      const s = (p as any).aiEvaluation?.totalScore ?? p.overallScore ?? 0;
      return acc + s;
    }, 0);
    return Math.round(total / evaluatedProjects.length);
  }, [evaluatedProjects]);

  // Upcoming deadlines from classrooms
  const upcomingDeadlines = useMemo(() => {
    return classrooms.slice(0, 3);
  }, [classrooms]);

  // Dynamic Score distribution data calculated from real evaluated projects
  const scoreDistributionData = useMemo(() => {
    const bins = [
      { range: '50-60', count: 0 },
      { range: '61-70', count: 0 },
      { range: '71-80', count: 0 },
      { range: '81-90', count: 0 },
      { range: '91-100', count: 0 },
    ];
    evaluatedProjects.forEach(p => {
      const score = (p as any).aiEvaluation?.totalScore ?? p.overallScore;
      if (score != null) {
        if (score >= 91) bins[4].count++;
        else if (score >= 81) bins[3].count++;
        else if (score >= 71) bins[2].count++;
        else if (score >= 61) bins[1].count++;
        else if (score >= 50) bins[0].count++;
      }
    });
    return bins;
  }, [evaluatedProjects]);

  // Dynamic Monthly submissions trend
  const submissionTrendData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIdx = new Date().getMonth();
    const trend: { month: string; submissions: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const mIdx = (currentMonthIdx - i + 12) % 12;
      trend.push({ month: monthNames[mIdx], submissions: 0 });
    }
    projects.forEach(p => {
      if (p.createdAt) {
        const d = new Date(p.createdAt);
        const m = monthNames[d.getMonth()];
        const target = trend.find(item => item.month === m);
        if (target) target.submissions++;
      }
    });
    return trend;
  }, [projects]);

  return (
    <div className="space-y-8">
      {/* 1. TOP HEADER WITH USER INFO & ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-[#1E293B]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#7C3AED]/20 text-[#A78BFA] font-bold text-base sm:text-lg flex items-center justify-center shrink-0 border border-[#7C3AED]/30 overflow-hidden shadow-lg shadow-purple-900/10">
            {user.avatar || user.profileImage ? (
              <img
                src={user.avatar || user.profileImage}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              user.name ? user.name.charAt(0) : 'U'
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
                Good day, {user.name || 'Student'}
              </h1>
              {user.permanentId && (
                <span className="text-xs font-mono font-bold bg-[#7C3AED]/20 text-[#A78BFA] px-2.5 py-1 rounded-lg border border-[#7C3AED]/30">
                  User ID: {user.permanentId}
                </span>
              )}
            </div>
            <p className="text-sm text-[#94A3B8] mt-1">
              {user.department || 'Computer Science'} • {user.college || 'Engineering Institute'}
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/project-checker/new">
            <Button variant="primary" size="sm" leftIcon={<ScanSearch className="w-4 h-4" />}>
              New Project Check
            </Button>
          </Link>
          <Link to="/teams/create">
            <Button variant="outline" size="sm" leftIcon={<Users className="w-4 h-4" />}>
              Create Team
            </Button>
          </Link>
          <Link to="/classrooms/create">
            <Button variant="outline" size="sm" leftIcon={<School className="w-4 h-4" />}>
              Create Classroom
            </Button>
          </Link>
        </div>
      </div>

      {loading && (
        <div className="p-8 text-center bg-[#111827] rounded-2xl border border-[#243047]">
          <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED] mx-auto mb-2" />
          <p className="text-xs text-[#94A3B8] font-medium">Loading live dashboard metrics...</p>
        </div>
      )}

      {/* 2. KEY STATISTICS CARDS (6 STATS) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <Card className="p-4">
          <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider block">
            Projects Submitted
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-[#F8FAFC]">{projects.length}</span>
            <FileText className="w-4 h-4 text-[#94A3B8] opacity-60" />
          </div>
          <span className="text-[11px] text-emerald-400 font-medium block mt-1">
            {projects.length > 0 ? `${projects.length} active checks` : 'No checks yet'}
          </span>
        </Card>

        <Card className="p-4">
          <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider block">
            AI Evaluations
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-[#A78BFA]">
              {evaluatedProjects.length}
            </span>
            <Sparkles className="w-4 h-4 text-[#A78BFA] opacity-70" />
          </div>
          <span className="text-[11px] text-[#A78BFA] font-medium block mt-1">
            {evaluatedProjects.length > 0 ? 'Verified reports' : 'None yet'}
          </span>
        </Card>

        <Card className="p-4">
          <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider block">
            Active Classrooms
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-[#F8FAFC]">{classrooms.length}</span>
            <School className="w-4 h-4 text-[#94A3B8] opacity-60" />
          </div>
          <span className="text-[11px] text-[#94A3B8] font-medium block mt-1">
            {classrooms.length > 0 
              ? `${classrooms.filter(c => c.currentUserRole === 'OWNER').length} Owner / ${classrooms.filter(c => c.currentUserRole !== 'OWNER').length} Member`
              : 'Not enrolled'}
          </span>
        </Card>

        <Card className="p-4">
          <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider block">
            My Teams
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-[#F8FAFC]">{teams.length}</span>
            <Users className="w-4 h-4 text-[#94A3B8] opacity-60" />
          </div>
          <span className="text-[11px] text-[#94A3B8] font-medium block mt-1">
            {teams.length > 0 ? `${teams.filter(t => t.captainId === user.id).length} Captain` : 'No squads'}
          </span>
        </Card>

        <Card className="p-4">
          <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider block">
            Average Score
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-emerald-400">
              {avgScore != null ? avgScore : '—'}
              {avgScore != null && <span className="text-xs text-[#94A3B8] font-normal">/100</span>}
            </span>
            <Award className="w-4 h-4 text-emerald-400 opacity-70" />
          </div>
          <span className="text-[11px] text-emerald-400 font-medium block mt-1">
            {avgScore != null ? 'Verified performance' : 'Awaiting grades'}
          </span>
        </Card>

        <Card className="p-4">
          <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider block">
            Alerts & Tasks
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-amber-400">
              {notifications.filter(n => !n.read).length}
            </span>
            <Clock className="w-4 h-4 text-amber-400 opacity-70" />
          </div>
          <span className="text-[11px] text-amber-400 font-medium block mt-1">Unread notices</span>
        </Card>
      </div>

      {/* 3. CURRENT EVALUATIONS (LIVE SUBMISSIONS) */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-[#F8FAFC]">Current Evaluations</h3>
            <p className="text-xs text-[#94A3B8]">Classroom submissions undergoing automated or faculty defense</p>
          </div>
          <Link to="/classrooms">
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              View All Classrooms
            </Button>
          </Link>
        </div>

        {currentEvaluations.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#94A3B8] bg-[#0F172A] rounded-xl border border-[#243047]">
            No active classroom submissions found. Join a classroom and submit your project to begin.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentEvaluations.slice(0, 3).map(sub => (
              <div key={sub.id} className="p-4 rounded-xl border border-[#243047] bg-[#0F172A]/50 hover:bg-[#0F172A] transition-colors space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-[#F8FAFC] line-clamp-1">{sub.title || sub.classroom?.name || 'Classroom Project'}</span>
                  <StatusBadge status={sub.status} />
                </div>
                <div className="text-xs text-[#CBD5E1] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#94A3B8]">Classroom:</span>
                    <span className="font-medium">{sub.classroom?.name || 'Assigned'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#94A3B8]">AI Score:</span>
                    <span className="font-bold text-[#A78BFA]">{sub.aiEvaluationScore ?? 'Pending'} / 50</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#94A3B8]">Total Score:</span>
                    <span className="font-bold text-[#7C3AED]">{sub.finalTotalScore ? `${sub.finalTotalScore} / 100` : 'In Progress'}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-[#1E293B] flex items-center justify-between">
                  <span className="text-[11px] text-[#94A3B8] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {sub.verification?.status || 'Active'}
                  </span>
                  <Link to={`/classrooms/${sub.classroom?.id || sub.classroomId}/evaluations`} className="text-xs font-semibold text-[#A78BFA] hover:underline">
                    View Defense
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 4. EVALUATION ANALYTICS (RECHARTS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Score Distribution Bar Chart */}
        <Card className="p-6 lg:col-span-7">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#F8FAFC]">Score Distribution</h3>
              </div>
              <p className="text-xs text-[#94A3B8]">Evaluation score distribution across your assessed projects</p>
            </div>
            <Badge variant="slate" size="sm">
              {evaluatedProjects.length > 0 ? `${evaluatedProjects.length} Evaluated` : 'No Data'}
            </Badge>
          </div>
          {evaluatedProjects.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center p-6 text-center text-xs text-[#94A3B8] bg-[#0F172A] rounded-xl border border-[#243047]">
              <Sparkles className="w-8 h-8 text-[#64748B] mb-2" />
              <p className="font-semibold text-[#CBD5E1]">No evaluations recorded yet</p>
              <p className="mt-1 max-w-sm">Submit your project to the Project Checker or a Classroom to generate score analytics.</p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="range" stroke="#64748B" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={12} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', borderRadius: '8px', color: '#F8FAFC', fontSize: '12px', border: '1px solid #243047' }}
                    cursor={{ fill: '#172033' }}
                  />
                  <Bar dataKey="count" fill="#7C3AED" radius={[6, 6, 0, 0]} name="Evaluations" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Monthly Submissions Area Chart */}
        <Card className="p-6 lg:col-span-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#F8FAFC]">Monthly Activity Trend</h3>
              </div>
              <p className="text-xs text-[#94A3B8]">Cumulative project check intake over time</p>
            </div>
            <span className="text-xs font-bold text-[#A78BFA]">{projects.length} Total</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={submissionTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#64748B" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '8px', color: '#F8FAFC', fontSize: '12px', border: '1px solid #243047' }}
                />
                <Area type="monotone" dataKey="submissions" stroke="#7C3AED" strokeWidth={2} fillOpacity={1} fill="url(#colorSub)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* 5. RECENT PROJECT REPORTS & MY TEAMS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Standalone Reports */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-[#F8FAFC]">Recent Project Reports</h3>
              <p className="text-xs text-[#94A3B8]">Independent Project Checker evaluation reports</p>
            </div>
            <Link to="/project-reports">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                View All
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {projects.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#94A3B8] bg-[#0F172A] rounded-xl border border-[#243047]">
                No project checker reports generated yet. Start a new check to evaluate code & reports.
              </div>
            ) : (
              projects.slice(0, 3).map(proj => (
                <div key={proj.id} className="p-3.5 rounded-xl border border-[#243047] bg-[#0F172A] hover:bg-[#172033] transition-colors flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-[#F8FAFC] line-clamp-1">{proj.title}</h4>
                    <span className="text-[11px] text-[#94A3B8]">
                      Created {new Date(proj.createdAt).toLocaleDateString()} • {proj.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold text-[#7C3AED]">
                      {proj.overallScore != null ? `${proj.overallScore}/100` : 'Pending'}
                    </span>
                    <Link to={`/project-reports/${proj.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* My Teams Preview */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-[#F8FAFC]">My Teams</h3>
              <p className="text-xs text-[#94A3B8]">Squad rosters for collaborative classroom submissions</p>
            </div>
            <Link to="/teams/create">
              <Button variant="ghost" size="sm" rightIcon={<Plus className="w-4 h-4" />}>
                New Team
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {teams.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#94A3B8] bg-[#0F172A] rounded-xl border border-[#243047]">
                You have not created or joined any teams yet. Create a team to submit squad projects.
              </div>
            ) : (
              teams.slice(0, 2).map(team => (
                <div key={team.id} className="p-3.5 rounded-xl border border-[#243047] bg-[#0F172A] hover:bg-[#172033] transition-colors flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-[#F8FAFC]">{team.name}</h4>
                      <span className="font-mono text-[10px] bg-[#111827] text-[#94A3B8] px-1.5 py-0.5 rounded font-bold border border-[#243047]">
                        {team.code}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#94A3B8]">
                      {team.members?.length || 1}/{team.maxSize} Members • Captain: {team.captainId === user.id ? 'You' : 'Peer'}
                    </p>
                  </div>
                  <Link to={`/teams/${team.id}`}>
                    <Button variant="outline" size="sm">
                      Manage
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* 6. UPCOMING DEADLINES & LEADERBOARD PREVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deadlines */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-[#F8FAFC]">Upcoming Deadlines</h3>
            <Badge variant="amber" size="sm">
              {upcomingDeadlines.length} Active
            </Badge>
          </div>
          <div className="space-y-3">
            {upcomingDeadlines.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#94A3B8] bg-[#0F172A] rounded-xl border border-[#243047]">
                No impending classroom deadlines found.
              </div>
            ) : (
              upcomingDeadlines.map(c => (
                <div key={c.id} className="p-3.5 rounded-xl border border-[#243047] bg-[#0F172A] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#F8FAFC]">{c.name}</h4>
                      <p className="text-[11px] text-[#94A3B8]">Deadline: {c.submissionDeadline}</p>
                    </div>
                  </div>
                  <Link to={`/classrooms/${c.id}/submit`}>
                    <Button variant="outline" size="sm">
                      Submit
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Leaderboard Preview */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-[#F8FAFC]">Cohort Leaderboard Standings</h3>
              <p className="text-xs text-[#94A3B8]">
                {leaderboardPreview.classroomName 
                  ? `Classroom: ${leaderboardPreview.classroomName}`
                  : 'Verified top standings (Protected privacy)'}
              </p>
            </div>
            {leaderboardPreview.classroomId && (
              <Link to={`/classrooms/${leaderboardPreview.classroomId}/leaderboard`}>
                <Button variant="ghost" size="sm" rightIcon={<Trophy className="w-4 h-4 text-amber-400" />}>
                  Full Board
                </Button>
              </Link>
            )}
          </div>

          <div className="space-y-2.5">
            {leaderboardPreview.topRanked.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#94A3B8] bg-[#0F172A] rounded-xl border border-[#243047]">
                No cohort leaderboard standings yet. Join an active classroom and submit evaluations to see ranks.
              </div>
            ) : (
              leaderboardPreview.topRanked.slice(0, 5).map((s, idx) => (
                <div key={s.id || idx} className="p-3 rounded-xl border border-[#243047] bg-[#0F172A] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-slate-500 text-white' : 'bg-amber-800/60 text-amber-300'
                    }`}>
                      #{idx + 1}
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-[#F8FAFC]">{s.projectTitle || 'Submission'}</h5>
                      <span className="text-[11px] text-[#94A3B8]">{s.name || 'Participant'}</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#7C3AED]">
                    {s.finalTotalScore ? `${s.finalTotalScore} / 100` : 'Pending'}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
