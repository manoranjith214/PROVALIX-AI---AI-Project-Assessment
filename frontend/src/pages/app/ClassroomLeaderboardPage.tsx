import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { classroomService } from '../../services/classroomService';
import { evaluationService } from '../../services/evaluationService';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Classroom, ClassroomSubmission } from '../../types';
import { 
  Trophy, 
  ArrowLeft, 
  Sparkles, 
  Lock, 
  Eye,
  Loader2
} from 'lucide-react';


export const ClassroomLeaderboardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [submissions, setSubmissions] = useState<ClassroomSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDetails, setExpandedDetails] = useState<boolean>(true);

  const loadLeaderboardData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [cls, subs] = await Promise.all([
        classroomService.getClassroomById(id),
        classroomService.getSubmissionsByClassroom(id),
      ]);
      setClassroom(cls || null);

      // Try fetching official leaderboard
      const lb = await evaluationService.getLeaderboard(id);
      if (lb && Array.isArray(lb.standings) && lb.standings.length > 0) {
        // Map backend standings
        const mappedSubs: ClassroomSubmission[] = lb.standings.map((st: any) => ({
          id: st.submissionId,
          classroomId: id,
          submitterId: st.isOwnSubmission ? (user?.id || '') : 'other',
          submitterName: st.teamOrSubmitterName || 'Student Submitter',
          teamName: st.teamOrSubmitterName,
          finalTotalScore: st.finalTotalScore,
          status: 'Verified',
          submittedAt: new Date().toISOString(),
          project: {
            id: st.submissionId,
            title: st.projectTitle,
            category: 'Classroom Project',
            description: '',
            problemStatement: '',
            proposedSolution: '',
            objectives: '',
            innovation: '',
            features: '',
            targetUsers: '',
            technologies: [],
            programmingLanguages: [],
            testingApproach: '',
            limitations: '',
            futureEnhancements: '',
            resources: [],
            createdAt: new Date().toISOString(),
          },
          aiComponent: st.detailedEvaluation ? {
            rawScore: st.detailedEvaluation.aiScore || 0,
            codeSimilarity: st.detailedEvaluation.codeSimilarity || 0,
            reportSimilarity: st.detailedEvaluation.reportSimilarity || 0,
            deduction: st.detailedEvaluation.aiDeduction || 0,
            finalScore: st.detailedEvaluation.aiScore || 0,
            isDemoData: false,
          } : undefined,
          facultyEvaluation: st.detailedEvaluation?.facultyEvaluation ? {
            evaluatorId: 'evaluator',
            evaluatorName: 'Faculty Evaluator',
            pptDemoScore: st.detailedEvaluation.facultyEvaluation.pptDemoScore || 0,
            vivaQuestions: [],
            vivaTotalScore: st.detailedEvaluation.facultyEvaluation.vivaTotalScore || 0,
            totalFacultyScore: st.detailedEvaluation.facultyEvaluation.totalFacultyScore || 0,
            status: st.detailedEvaluation.facultyEvaluation.status || 'Completed',
            feedback: st.detailedEvaluation.facultyEvaluation.feedback || '',
            evaluatedAt: new Date().toISOString(),
          } : undefined,
        }));
        setSubmissions(mappedSubs);
      } else {
        setSubmissions(subs);
      }
    } catch (err) {
      console.error('[ClassroomLeaderboardPage] Error loading leaderboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    loadLeaderboardData();
  }, [loadLeaderboardData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-sm font-medium text-brand-muted">Loading official classroom standings...</p>
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

  // Sort submissions by final total score descending
  const sortedSubmissions = [...submissions].sort((a, b) => (b.finalTotalScore || 0) - (a.finalTotalScore || 0));

  // Determine user's own submission authentically
  const mySubmission = sortedSubmissions.find(s => s.submitterId === user?.id);
  const myRank = mySubmission ? sortedSubmissions.findIndex(s => s.id === mySubmission.id) + 1 : null;

  const topThree = sortedSubmissions.slice(0, 3);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Breadcrumbs */}
      <div className="flex items-center justify-between pb-2 border-b border-[#243047]">
        <Link to={`/classrooms/${classroom.id}`} className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Classroom Dashboard
        </Link>
        <span className="text-xs font-semibold text-slate-300">
          {sortedSubmissions.length} Published Standings
        </span>
      </div>

      <PageHeader
        title="Official Classroom Leaderboard & Results"
        subtitle={`Cohort: ${classroom.name}. Top standings celebrated. For student privacy, detailed evaluations are isolated to authorized squad members.`}
        showDemoBadge={false}
      />

      {sortedSubmissions.length === 0 ? (
        <Card className="p-12 text-center max-w-md mx-auto space-y-3">
          <Trophy className="w-8 h-8 text-amber-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-100">No Published Standings Yet</h3>
          <p className="text-xs text-slate-400">
            Submissions will appear here once verified and approved by the Classroom Owner.
          </p>
          <Link to={`/classrooms/${classroom.id}`}>
            <Button variant="outline" size="sm">
              Return to Classroom
            </Button>
          </Link>
        </Card>
      ) : (
        <>
          {/* PODIUM (1st, 2nd, 3rd) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-6 pb-2">
            {/* 2nd Place */}
            {topThree[1] && (
              <div className="order-2 md:order-1 flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-[#111827] border-2 border-slate-600 text-slate-300 font-bold text-lg flex items-center justify-center mb-3 shadow-xs">
                  2
                </div>
                <Card className="w-full p-4 text-center bg-[#111827] border-[#243047] shadow-subtle space-y-1">
                  <span className="text-xs font-bold text-slate-100 block line-clamp-1">
                    {topThree[1].project.title}
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    {topThree[1].teamName || topThree[1].submitterName}
                  </span>
                  <span className="text-xl font-bold text-slate-100 block pt-2">
                    {topThree[1].finalTotalScore !== undefined ? `${topThree[1].finalTotalScore} / 100` : 'Evaluating...'}
                  </span>
                </Card>
              </div>
            )}

            {/* 1st Place - Tallest */}
            {topThree[0] && (
              <div className="order-1 md:order-2 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-amber-500 text-slate-950 font-black text-2xl flex items-center justify-center mb-3 shadow-card ring-4 ring-amber-500/30">
                  1
                </div>
                <Card className="w-full p-6 text-center bg-gradient-to-b from-amber-950/30 via-[#111827] to-[#111827] border-amber-500/40 shadow-card space-y-1.5">
                  <Badge variant="amber" size="sm" icon={<Trophy className="w-3.5 h-3.5" />}>
                    1st Place Champion
                  </Badge>
                  <h4 className="text-sm font-bold text-slate-100 block line-clamp-1 pt-1">
                    {topThree[0].project.title}
                  </h4>
                  <span className="text-xs text-slate-400 block">
                    {topThree[0].teamName || topThree[0].submitterName}
                  </span>
                  <span className="text-3xl font-black text-purple-400 block pt-2">
                    {topThree[0].finalTotalScore !== undefined ? topThree[0].finalTotalScore : '--'} <span className="text-xs text-slate-400 font-normal">/ 100</span>
                  </span>
                </Card>
              </div>
            )}

            {/* 3rd Place */}
            {topThree[2] && (
              <div className="order-3 flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-amber-950/60 border-2 border-amber-600/50 text-amber-400 font-bold text-lg flex items-center justify-center mb-3 shadow-xs">
                  3
                </div>
                <Card className="w-full p-4 text-center bg-[#111827] border-[#243047] shadow-subtle space-y-1">
                  <span className="text-xs font-bold text-slate-100 block line-clamp-1">
                    {topThree[2].project.title}
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    {topThree[2].teamName || topThree[2].submitterName}
                  </span>
                  <span className="text-xl font-bold text-slate-100 block pt-2">
                    {topThree[2].finalTotalScore !== undefined ? `${topThree[2].finalTotalScore} / 100` : 'Evaluating...'}
                  </span>
                </Card>
              </div>
            )}
          </div>

          {/* PRIVACY-AWARE FULL LEADERBOARD TABLE */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-100">Cohort Rankings</h3>
                <p className="text-xs text-slate-400">
                  Privacy enforced: Detailed evaluation rubric feedback is visible only to authorized authors and faculty
                </p>
              </div>
              {myRank !== null && (
                <Badge variant="primary" size="sm">
                  Your Standing: #{myRank}
                </Badge>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#0F172A] text-[11px] uppercase tracking-wider text-slate-400 border-y border-[#243047]">
                  <tr>
                    <th className="py-3 px-4 font-semibold w-16 text-center">Rank</th>
                    <th className="py-3 px-4 font-semibold">Project & Squad</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Total Score</th>
                    <th className="py-3 px-4 font-semibold text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#243047]">
                  {sortedSubmissions.map((sub, idx) => {
                    const isMine = sub.submitterId === user?.id || (mySubmission && sub.id === mySubmission.id);
                    return (
                      <tr
                        key={sub.id}
                        className={`transition-colors ${
                          isMine ? 'bg-purple-950/30 font-medium' : 'hover:bg-[#172033]/50'
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center font-bold text-sm text-slate-100">
                          #{idx + 1}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-100">{sub.project.title}</span>
                            {isMine && <Badge variant="primary" size="sm">Your Submission</Badge>}
                          </div>
                          <span className="text-[11px] text-slate-400 block">
                            {sub.teamName ? `${sub.submitterName} • ${sub.teamName}` : sub.submitterName}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={sub.status} />
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-sm text-purple-400">
                            {sub.finalTotalScore !== undefined ? sub.finalTotalScore : '--'} <span className="text-[10px] text-slate-400 font-normal">/ 100</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {isMine ? (
                            <button
                              onClick={() => setExpandedDetails(!expandedDetails)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-purple-400 hover:underline"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              {expandedDetails ? 'Hide My Breakdown' : 'View My Breakdown'}
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                              <Lock className="w-3.5 h-3.5" /> Private
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* DETAILED STUDENT PRIVACY BREAKDOWN */}
          {mySubmission && expandedDetails && (
            <Card className="p-6 bg-gradient-to-br from-[#0F172A] via-[#111827] to-[#111827] border-purple-500/30 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#243047]">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <h3 className="text-base font-bold text-slate-100">Your Official Evaluation Breakdown</h3>
                    <Badge variant="primary" size="sm">Private to You</Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Authorized grade audit for &quot;{mySubmission.project.title}&quot;
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Published Final Score</span>
                  <span className="text-2xl font-black text-purple-400">
                    {mySubmission.finalTotalScore !== undefined ? `${mySubmission.finalTotalScore} / 100` : 'Pending'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047] space-y-2 text-xs">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-purple-400">AI Component Evaluation</span>
                    <span className="text-purple-300 font-mono">
                      {mySubmission.aiComponent?.finalScore !== undefined ? `${mySubmission.aiComponent.finalScore} / 50` : 'Pending'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Similarity Deduction:</span>
                    <span>-{mySubmission.aiComponent?.deduction ?? 0} Marks</span>
                  </div>
                  <p className="text-slate-300 text-[11px] pt-1">
                    Multi-criteria AST syntax validation and dual-pass similarity assessment.
                  </p>
                </div>

                <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047] space-y-2 text-xs">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-slate-100">Faculty Viva Defense</span>
                    <span className="font-mono text-purple-300">
                      {mySubmission.facultyEvaluation?.totalFacultyScore !== undefined ? `${mySubmission.facultyEvaluation.totalFacultyScore} / 50` : 'Pending'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>PPT / Live Demo Defense:</span>
                    <span>{mySubmission.facultyEvaluation?.pptDemoScore !== undefined ? `${mySubmission.facultyEvaluation.pptDemoScore} / 25` : 'Pending'}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Oral Viva Voce Questions:</span>
                    <span>{mySubmission.facultyEvaluation?.vivaTotalScore !== undefined ? `${mySubmission.facultyEvaluation.vivaTotalScore} / 25` : 'Pending'}</span>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
