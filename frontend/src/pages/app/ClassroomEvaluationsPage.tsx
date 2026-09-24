import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { evaluationService } from '../../services/evaluationService';
import { classroomService } from '../../services/classroomService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Classroom, ClassroomSubmission, VivaQuestionScore } from '../../types';
import { 
  ArrowLeft, 
  UserCheck, 
  Save, 
  Loader2,
  ShieldCheck
} from 'lucide-react';

export const ClassroomEvaluationsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [submissions, setSubmissions] = useState<ClassroomSubmission[]>([]);
  const [selectedSubId, setSelectedSubId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Evaluator assignment modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [evaluatorIdentifier, setEvaluatorIdentifier] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Viva evaluation form state - starts empty
  const [pptDemoScore, setPptDemoScore] = useState<number>(0);
  const [vivaStatus, setVivaStatus] = useState<'Completed' | 'Incomplete' | 'Absent'>('Completed');
  const [mandatoryReason, setMandatoryReason] = useState('');
  const [overallFeedback, setOverallFeedback] = useState('');
  
  const [vivaQuestions, setVivaQuestions] = useState<VivaQuestionScore[]>([
    { questionNumber: 1, questionText: 'Technical Architecture & Methodology', maxScore: 5, score: 0, feedback: '' },
    { questionNumber: 2, questionText: 'System Implementation & Performance', maxScore: 5, score: 0, feedback: '' },
    { questionNumber: 3, questionText: 'Testing Strategy & Validation', maxScore: 5, score: 0, feedback: '' },
    { questionNumber: 4, questionText: 'Fault Tolerance & Error Handling', maxScore: 5, score: 0, feedback: '' },
    { questionNumber: 5, questionText: 'Individual Contribution & Mastery', maxScore: 5, score: 0, feedback: '' },
  ]);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [cls, subs] = await Promise.all([
        classroomService.getClassroomById(id),
        classroomService.getSubmissionsByClassroom(id),
      ]);
      setClassroom(cls || null);
      setSubmissions(subs);
      if (subs.length > 0) {
        setSelectedSubId(prev => (prev && subs.some(s => s.id === prev) ? prev : subs[0].id));
      }
    } catch (err) {
      console.error('[ClassroomEvaluationsPage] Error loading evaluation data:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedSubmission = submissions.find(s => s.id === selectedSubId) || submissions[0];

  // Sync form when selectedSubmission changes
  useEffect(() => {
    if (selectedSubmission?.facultyEvaluation) {
      const fe = selectedSubmission.facultyEvaluation;
      setPptDemoScore(fe.pptDemoScore ?? 0);
      setVivaStatus(fe.status ?? 'Completed');
      setMandatoryReason(fe.reason ?? '');
      setOverallFeedback(fe.feedback ?? '');
      if (fe.vivaQuestions && fe.vivaQuestions.length > 0) {
        setVivaQuestions(fe.vivaQuestions);
      }
    }
  }, [selectedSubmission]);

  const isOwner = classroom?.ownerId === user?.id || classroom?.currentUserRole === 'OWNER';

  const handleScoreChange = (qNum: number, score: number) => {
    setVivaQuestions(prev =>
      prev.map(q => (q.questionNumber === qNum ? { ...q, score: Math.min(5, Math.max(0, score)) } : q))
    );
  };

  const handleFeedbackChange = (qNum: number, feedback: string) => {
    setVivaQuestions(prev =>
      prev.map(q => (q.questionNumber === qNum ? { ...q, feedback } : q))
    );
  };

  const handleSaveFacultyEvaluation = async () => {
    if (!selectedSubmission) return;

    if (vivaStatus !== 'Completed' && (!mandatoryReason.trim() || !overallFeedback.trim())) {
      error('Reason and Feedback are mandatory when marking evaluation as Incomplete or Absent.');
      return;
    }

    const vivaTotal = vivaQuestions.reduce((acc, q) => acc + q.score, 0);

    setSaving(true);
    try {
      await evaluationService.submitFacultyEvaluation(selectedSubmission.id, {
        evaluatorId: user?.id || 'evaluator',
        evaluatorName: `${user?.name || 'Evaluator'} (Faculty)`,
        pptDemoScore,
        vivaQuestions,
        vivaTotalScore: vivaTotal,
        status: vivaStatus,
        reason: mandatoryReason,
        feedback: overallFeedback,
        evaluatedAt: new Date().toISOString(),
      });

      success(`Faculty evaluation saved for "${selectedSubmission.project.title}"! Total Faculty Score: ${pptDemoScore + vivaTotal}/50.`);
      await loadData();
    } catch (err: any) {
      error(err.message || 'Failed to record faculty evaluation.');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignEvaluator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission || !classroom || !evaluatorIdentifier.trim()) return;

    setAssigning(true);
    try {
      const res = await classroomService.assignEvaluator(
        classroom.id, 
        evaluatorIdentifier.trim(), 
        selectedSubmission.id
      );
      if (res.success) {
        setAssignModalOpen(false);
        setEvaluatorIdentifier('');
        success(`Assigned evaluator to ${selectedSubmission.project.title}!`);
        await loadData();
      } else {
        error(res.message);
      }
    } catch (err: any) {
      error(err.message || 'Failed to assign evaluator');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-sm font-medium text-brand-muted">Loading evaluation workspace...</p>
      </div>
    );
  }

  if (!classroom || !selectedSubmission) {
    return (
      <div className="p-12 text-center max-w-md mx-auto space-y-4">
        <p className="text-base font-semibold text-slate-100">No submissions available for evaluation.</p>
        <p className="text-xs text-slate-400">No student or squad has submitted a project to this classroom cohort yet.</p>
        <Link to={`/classrooms/${classroom?.id || ''}`}>
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Classroom
          </Button>
        </Link>
      </div>
    );
  }

  const vivaTotalScore = vivaQuestions.reduce((acc, q) => acc + q.score, 0);
  const totalFacultyScore = vivaStatus === 'Completed' ? pptDemoScore + vivaTotalScore : 0;
  const aiScore = selectedSubmission.aiComponent?.finalScore || 0;
  const grandTotal = aiScore + totalFacultyScore;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#243047]">
        <Link to={`/classrooms/${classroom.id}`} className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Classroom Dashboard
        </Link>
        <div className="flex items-center gap-2">
          {isOwner && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<UserCheck className="w-4 h-4" />}
              onClick={() => setAssignModalOpen(true)}
            >
              Assign Evaluator
            </Button>
          )}
          <Link to={`/classrooms/${classroom.id}/verification`}>
            <Button variant="primary" size="sm">
              Proceed to Verification
            </Button>
          </Link>
        </div>
      </div>

      <PageHeader
        title="Classroom Evaluation Workspace"
        subtitle="50 Marks AI Component + 50 Marks Faculty/Coordinator Evaluation (25 PPT/Demo + 25 Viva Defense) = 100 Final Total."
        showDemoBadge={!classroom.isBackend}
      />

      {/* Select Project to Evaluate Dropdown bar */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider shrink-0">
          Submissions ({submissions.length}):
        </span>
        {submissions.map(sub => (
          <button
            key={sub.id}
            onClick={() => setSelectedSubId(sub.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
              selectedSubmission.id === sub.id
                ? 'bg-purple-600 text-white border-purple-500 shadow-2xs'
                : 'bg-[#0F172A] text-slate-300 border-[#243047] hover:bg-[#172033]'
            }`}
          >
            {sub.project.title.split(':')[0]}
          </button>
        ))}
      </div>

      {/* Project Banner */}
      <div className="p-6 bg-[#111827] rounded-saas border border-[#243047] shadow-subtle flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-slate-100">{selectedSubmission.project.title}</h2>
            <StatusBadge status={selectedSubmission.status} />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Submitted by: <strong className="text-slate-200">{selectedSubmission.submitterName}</strong> • {selectedSubmission.teamName ? `Team: ${selectedSubmission.teamName}` : 'Individual'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Assigned Evaluator: <strong className="text-purple-400">{selectedSubmission.assignedEvaluatorName || 'Unassigned (Owner evaluation permitted)'}</strong>
          </p>
        </div>

        {/* Unified Score Snapshot */}
        <div className="flex items-center gap-4 bg-[#0F172A] border border-[#243047] p-3.5 rounded-2xl shrink-0">
          <div className="text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">AI Component</span>
            <span className="text-xl font-bold text-purple-300">{aiScore}/50</span>
          </div>
          <span className="text-slate-500 font-bold">+</span>
          <div className="text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Faculty Defense</span>
            <span className="text-xl font-bold text-slate-100">{totalFacultyScore}/50</span>
          </div>
          <span className="text-slate-500 font-bold">=</span>
          <div className="text-center bg-purple-950/60 border border-purple-500/40 px-3 py-1 rounded-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 block">Unified Total</span>
            <span className="text-xl font-bold text-purple-200">{grandTotal}/100</span>
          </div>
        </div>
      </div>

      {/* Evaluation Rubric Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Component 1: Presentation & Demo (25 Marks) */}
        <Card className="p-6 space-y-6">
          <div>
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-100">1. PPT & Demo Defense</h3>
              <Badge variant="primary" size="sm">Max 25 Marks</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Evaluate presentation clarity, live demo execution, and UI/UX responsiveness.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-300">Awarded PPT / Demo Score</label>
                <span className="font-bold text-slate-100 text-sm">{pptDemoScore} / 25</span>
              </div>
              <input
                type="range"
                min={0}
                max={25}
                value={pptDemoScore}
                onChange={e => setPptDemoScore(Number(e.target.value))}
                className="w-full accent-purple-600 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Defense Status</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Completed', 'Incomplete', 'Absent'] as const).map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setVivaStatus(st)}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      vivaStatus === st
                        ? 'border-purple-500 bg-purple-950/40 text-purple-300'
                        : 'border-[#243047] bg-[#0F172A] text-slate-300 hover:bg-[#172033]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {vivaStatus !== 'Completed' && (
              <div>
                <Textarea
                  label="Mandatory Reason for Incomplete/Absent"
                  value={mandatoryReason}
                  onChange={e => setMandatoryReason(e.target.value)}
                  placeholder="State justification..."
                  rows={2}
                  required
                />
              </div>
            )}
          </div>
        </Card>

        {/* Component 2: Viva Voce Defense (25 Marks - 5 Questions x 5 Marks) */}
        <Card className="p-6 space-y-6">
          <div>
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-100">2. Project Viva Voce Examination</h3>
              <Badge variant="primary" size="sm">{vivaTotalScore} / 25 Marks</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              5 project-specific questions generated dynamically based on student architecture and codebase.
            </p>
          </div>

          <div className="space-y-4 max-h-[460px] overflow-y-auto pr-2">
            {vivaQuestions.map((q) => (
              <div key={q.questionNumber} className="p-4 rounded-xl border border-[#243047] bg-[#0F172A] space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-500/40 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {q.questionNumber}
                    </span>
                    <span className="text-xs font-medium text-slate-200 leading-snug">
                      {q.questionText}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <select
                      value={q.score}
                      onChange={e => handleScoreChange(q.questionNumber, Number(e.target.value))}
                      className="text-xs font-bold px-2 py-1 bg-[#111827] text-slate-200 rounded-lg border border-[#243047]"
                    >
                      {[0, 1, 2, 3, 4, 5].map(m => (
                        <option key={m} value={m}>{m} / 5</option>
                      ))}
                    </select>
                  </div>
                </div>

                <Input
                  placeholder="Add oral feedback notes..."
                  value={q.feedback}
                  onChange={e => handleFeedbackChange(q.questionNumber, e.target.value)}
                  className="bg-[#111827] text-xs"
                />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Overall Feedback & Save Action */}
      <Card className="p-6 space-y-4">
        <Textarea
          label="Comprehensive Faculty Feedback & Recommendation"
          value={overallFeedback}
          onChange={e => setOverallFeedback(e.target.value)}
          rows={3}
          placeholder="Detailed synthesis of student defense, code architectural strengths, and suggestions..."
        />

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="primary"
            onClick={handleSaveFacultyEvaluation}
            disabled={saving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            {saving ? 'Saving...' : `Save Faculty Evaluation (${totalFacultyScore}/50)`}
          </Button>
        </div>
      </Card>

      {/* Evaluator Assignment Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Submission Evaluator"
        description="Assign a designated faculty reviewer to evaluate oral defense for this specific project."
      >
        <form onSubmit={handleAssignEvaluator} className="space-y-4">
          <Input
            label="Faculty Permanent ID or UUID"
            placeholder="e.g. PRV-10484"
            value={evaluatorIdentifier}
            onChange={e => setEvaluatorIdentifier(e.target.value)}
            helperText="Check institutional directory for faculty member's permanent PRV code."
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={assigning} leftIcon={<ShieldCheck className="w-4 h-4" />}>
              {assigning ? 'Assigning...' : 'Assign Evaluator'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
