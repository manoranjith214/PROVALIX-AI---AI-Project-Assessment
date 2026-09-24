import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { evaluationService } from '../../services/evaluationService';
import { classroomService } from '../../services/classroomService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Textarea } from '../../components/ui/Textarea';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Classroom, ClassroomSubmission } from '../../types';
import { 
  ArrowLeft, 
  CheckCheck, 
  RotateCcw, 
  ShieldCheck, 
  Loader2 
} from 'lucide-react';

export const ClassroomVerificationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [submissions, setSubmissions] = useState<ClassroomSubmission[]>([]);
  const [selectedSubId, setSelectedSubId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');

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
      console.error('[ClassroomVerificationPage] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedSubmission = submissions.find(s => s.id === selectedSubId) || submissions[0];
  const isOwner = classroom?.ownerId === user?.id || classroom?.currentUserRole === 'OWNER';

  const handleApprove = async () => {
    if (!selectedSubmission) return;

    setVerifying(true);
    try {
      await evaluationService.verifySubmission(selectedSubmission.id, {
        status: 'Approved',
        verifiedAt: new Date().toISOString(),
        verifiedBy: `${user?.name || 'Owner'} (Classroom Owner)`,
      });

      success(`Submission "${selectedSubmission.project.title}" verified and published to leaderboard!`);
      navigate(`/classrooms/${classroom?.id}/leaderboard`);
    } catch (err: any) {
      error(err.message || 'Failed to approve verification.');
    } finally {
      setVerifying(false);
    }
  };

  const handleReturn = async () => {
    if (!selectedSubmission) return;
    if (!returnReason.trim()) {
      error('Please state the mandatory reason for returning this submission.');
      return;
    }

    setVerifying(true);
    try {
      await evaluationService.verifySubmission(selectedSubmission.id, {
        status: 'Returned',
        returnReason: returnReason.trim(),
        verifiedAt: new Date().toISOString(),
        verifiedBy: `${user?.name || 'Owner'} (Classroom Owner)`,
      });

      setReturnModalOpen(false);
      setReturnReason('');
      success(`Submission returned to student with remarks: "${returnReason}".`);
      await loadData();
    } catch (err: any) {
      error(err.message || 'Failed to return submission.');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-sm font-medium text-brand-muted">Loading verification queue...</p>
      </div>
    );
  }

  if (!classroom || !selectedSubmission) {
    return (
      <div className="p-12 text-center max-w-md mx-auto space-y-4">
        <p className="text-base font-semibold text-slate-100">No submissions available for verification.</p>
        <p className="text-xs text-slate-400">Submissions must be received and faculty evaluated before entering the verification gate.</p>
        <Link to={`/classrooms/${classroom?.id || ''}`}>
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Classroom
          </Button>
        </Link>
      </div>
    );
  }

  const aiComponent = selectedSubmission.aiComponent || {
    rawScore: 0,
    codeSimilarity: 0,
    reportSimilarity: 0,
    deduction: 0,
    finalScore: 0,
    isDemoData: false,
  };

  const facultyEval = selectedSubmission.facultyEvaluation || {
    evaluatorName: selectedSubmission.assignedEvaluatorName || 'Assigned Faculty',
    pptDemoScore: 0,
    vivaTotalScore: 0,
    totalFacultyScore: 0,
    status: 'Pending',
    feedback: 'Pending faculty evaluation.',
  };

  const finalScore = selectedSubmission.finalTotalScore ?? (aiComponent.finalScore + (facultyEval.totalFacultyScore || 0));

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Breadcrumbs */}
      <div className="flex items-center justify-between pb-2 border-b border-[#243047]">
        <Link to={`/classrooms/${classroom.id}`} className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Classroom Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <Link to={`/classrooms/${classroom.id}/evaluations`}>
            <Button variant="outline" size="sm">
              Review Evaluations
            </Button>
          </Link>
        </div>
      </div>

      <PageHeader
        title="Classroom Verification & Moderation Gate"
        subtitle="Final institutional audit. Only the designated Classroom Owner/Admin can approve unified grades to publish them to the official leaderboard."
        showDemoBadge={false}
      />

      {/* Submissions Switcher Bar */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider shrink-0">
          Cohort Queue ({submissions.length}):
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

      {/* Main Verification Card */}
      <Card className="p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#243047]">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-slate-100">{selectedSubmission.project.title}</h2>
              <StatusBadge status={selectedSubmission.status} />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Submitter: <strong className="text-slate-200">{selectedSubmission.submitterName}</strong> • {selectedSubmission.teamName ? `Team: ${selectedSubmission.teamName}` : 'Individual'}
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Unified Authoritative Score</span>
            <span className="text-3xl font-extrabold text-purple-400">{finalScore} / 100</span>
          </div>
        </div>

        {/* Audit Breakdown Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-[#0F172A] rounded-2xl border border-purple-500/30 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">AI Automated Component</span>
              <span className="font-bold text-purple-400 text-sm">{aiComponent.finalScore} / 50</span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Raw AI Evaluation:</span>
                <span className="font-semibold text-slate-100">{aiComponent.rawScore} / 50</span>
              </div>
              <div className="flex justify-between">
                <span>Code Similarity Index:</span>
                <span className="font-mono font-medium text-purple-300">{aiComponent.codeSimilarity}%</span>
              </div>
              <div className="flex justify-between">
                <span>Report Similarity Index:</span>
                <span className="font-mono font-medium text-purple-300">{aiComponent.reportSimilarity}%</span>
              </div>
              {aiComponent.deduction > 0 && (
                <div className="flex justify-between text-error">
                  <span>Plagiarism Deduction:</span>
                  <span className="font-semibold">-{aiComponent.deduction} Marks</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 bg-[#0F172A] rounded-2xl border border-[#243047] space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Faculty Viva Defense</span>
              <span className="font-bold text-slate-100 text-sm">{facultyEval.totalFacultyScore} / 50</span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Evaluator:</span>
                <span className="font-semibold text-slate-100">{facultyEval.evaluatorName}</span>
              </div>
              <div className="flex justify-between">
                <span>PPT & Demo Presentation:</span>
                <span className="font-semibold text-slate-100">{facultyEval.pptDemoScore} / 25</span>
              </div>
              <div className="flex justify-between">
                <span>5-Question Viva Voce:</span>
                <span className="font-semibold text-slate-100">{facultyEval.vivaTotalScore} / 25</span>
              </div>
              <div className="flex justify-between">
                <span>Oral Defense Status:</span>
                <Badge variant={facultyEval.status === 'Completed' ? 'success' : 'amber'} size="sm">
                  {facultyEval.status}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {facultyEval.feedback && (
          <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047] space-y-1">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">Faculty Feedback Notes:</span>
            <p className="text-xs text-slate-300 leading-relaxed">{facultyEval.feedback}</p>
          </div>
        )}

        {/* Verification Actions (Owner Only) */}
        {isOwner ? (
          <div className="pt-4 border-t border-[#243047] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>Approving will lock marks and publish official rank on the leaderboard.</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                className="text-error hover:bg-red-950/30 hover:text-error"
                onClick={() => setReturnModalOpen(true)}
                disabled={verifying}
                leftIcon={<RotateCcw className="w-4 h-4" />}
              >
                Return for Revision
              </Button>
              <Button
                variant="primary"
                onClick={handleApprove}
                disabled={verifying}
                leftIcon={<CheckCheck className="w-4 h-4" />}
              >
                {verifying ? 'Approving...' : 'Approve & Publish Score'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-[#0F172A] border border-[#243047] rounded-xl text-center text-xs text-slate-400">
            Only the Classroom Owner / Admin ({classroom.ownerName || 'Instructor'}) has authority to approve final verification marks.
          </div>
        )}
      </Card>

      {/* Return Modal */}
      <Modal
        isOpen={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        title="Return Submission for Revision"
        description="Provide clear, actionable feedback explaining why this project was returned for student modification."
      >
        <div className="space-y-4">
          <Textarea
            label="Mandatory Return Reason / Remarks"
            value={returnReason}
            onChange={e => setReturnReason(e.target.value)}
            placeholder="e.g. Please re-upload full source code archive with testing suite..."
            rows={3}
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setReturnModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="bg-error hover:bg-error/90 text-white"
              onClick={handleReturn}
              disabled={verifying}
              leftIcon={<RotateCcw className="w-4 h-4" />}
            >
              {verifying ? 'Returning...' : 'Confirm Return'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
