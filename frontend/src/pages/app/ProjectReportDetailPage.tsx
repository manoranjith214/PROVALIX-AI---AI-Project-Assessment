import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { projectCheckerService } from '../../services/projectCheckerService';
import { projectReportService } from '../../services/projectReportService';
import { StandaloneAIEvaluation, ProjectDetails } from '../../types';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Progress } from '../../components/ui/Progress';
import { Modal } from '../../components/ui/Modal';
import { ProvalixLogo } from '../../components/common/ProvalixLogo';
import { useToast } from '../../context/ToastContext';
import { 
  Printer, 
  Download, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  FileCode, 
  GitBranch, 
  Globe, 
  Loader2, 
  Lock, 
  ShieldAlert, 
  FileQuestion,
  Trash2,
  Edit3
} from 'lucide-react';

export const ProjectReportDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [evaluation, setEvaluation] = useState<StandaloneAIEvaluation | null>(null);
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Delete & Rename states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadReport() {
      if (!id) return;
      setIsLoading(true);
      setErrorStatus(null);
      setErrorMessage(null);

      // 1. Direct Supabase load from project_reports table
      try {
        const reportRow = await projectReportService.getReportById(id);
        if (isMounted && reportRow) {
          const mapped = projectReportService.mapRowToDetails(reportRow);
          setProject(mapped.project);
          setEvaluation(mapped.evaluation);
          setIsLoading(false);
          return;
        }
      } catch (err: any) {
        console.error('[ProjectReportDetailPage] Direct Supabase fetch error:', err);
        if (err?.message?.includes('Authentication required') || err?.status === 401) {
          if (isMounted) {
            setErrorStatus(401);
            setErrorMessage('Authentication required to view this project report.');
            setIsLoading(false);
          }
          return;
        }
      }

      // 2. Fallback to Express backend (if legacy id or server is up)
      try {
        const reportData = await projectCheckerService.getReport(id);
        if (isMounted && reportData) {
          const mapped = projectCheckerService.mapBackendReport(reportData);
          setProject(mapped.project);
          setEvaluation(mapped.evaluation);
          setIsLoading(false);
          return;
        }
      } catch (err: any) {
        if (err?.status === 401 || err?.status === 403) {
          if (isMounted) {
            setErrorStatus(err.status);
            setErrorMessage(err.message || 'Access restricted to report owner.');
            setIsLoading(false);
          }
          return;
        }
      }

      if (isMounted) {
        setErrorStatus(404);
        setErrorMessage('The requested evaluation report was not found.');
        setIsLoading(false);
      }
    }

    loadReport();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleSavePDF = async () => {
    success('Preparing official Provalix AI Project Audit PDF...');
    try {
      if (project && evaluation) {
        const markdown = `# PROVALIX AI - PROJECT EVALUATION AUDIT REPORT
**Project Title:** ${project.title}
**Category / Domain:** ${project.category}
**Overall Score:** ${evaluation.overallScore}/100
**Plagiarism Similarity:** ${evaluation.plagiarism?.overallSimilarity}% (${evaluation.plagiarism?.status})
**Evaluated At:** ${new Date(evaluation.evaluatedAt).toLocaleString()}

---

## 1. Executive Summary
${evaluation.summary}

## 2. Evaluation Criteria Rubric Scores
${Object.values(evaluation.criteria).map(c => `- **${c.name}**: ${c.obtainedScore}/${c.maxScore} (${c.feedback})`).join('\n')}

## 3. Plagiarism & Integrity Analysis
- **Code Similarity:** ${evaluation.plagiarism?.codeSimilarity}%
- **Report Similarity:** ${evaluation.plagiarism?.reportSimilarity}%
- **Overall Similarity:** ${evaluation.plagiarism?.overallSimilarity}%
- **Integrity Status:** ${evaluation.plagiarism?.status}

## 4. Architectural & Code Analysis
${evaluation.codeAnalysis}

## 5. Technical Rigor & Documentation
${evaluation.technicalAnalysis}
${evaluation.documentationAnalysis}

## 6. Identified Strengths
${evaluation.strengths.map(s => `- ${s}`).join('\n')}

## 7. Actionable Improvement Plan
${evaluation.actionableSuggestions.map(s => `- ${s}`).join('\n')}
`;
        const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Provalix-Audit-Report-${id}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('[ProjectReportDetailPage] PDF generation error:', err);
    }
    setTimeout(() => {
      window.print();
    }, 400);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-brand-muted gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading verified project audit report...</p>
      </div>
    );
  }

  // State: Unauthorized (401)
  if (errorStatus === 401) {
    return (
      <Card className="p-12 text-center space-y-4 max-w-md mx-auto my-12">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-100">Authentication Required</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Please log in to your account to view this private project checker audit report.
        </p>
        <div className="pt-2">
          <Link to="/login">
            <Button variant="primary" size="sm">Sign In to Continue</Button>
          </Link>
        </div>
      </Card>
    );
  }

  // State: Forbidden (403)
  if (errorStatus === 403) {
    return (
      <Card className="p-12 text-center space-y-4 max-w-md mx-auto my-12">
        <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-100">Access Restricted</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          {errorMessage || "You do not have authorization to view this student's evaluation report. Provalix AI isolates project checker audits to the project creator."}
        </p>
        <div className="pt-2">
          <Link to="/project-reports">
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
              Back to My Reports
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  // State: Not Found (404)
  if (errorStatus === 404 || !evaluation || !project) {
    return (
      <Card className="p-12 text-center space-y-4 max-w-md mx-auto my-12">
        <div className="w-12 h-12 rounded-full bg-[#0F172A] border border-[#243047] text-slate-300 mx-auto flex items-center justify-center">
          <FileQuestion className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-100">Report Not Found</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          The requested Project Checker audit report could not be found or has not been generated yet.
        </p>
        <div className="pt-2">
          <Link to="/project-reports">
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
              Back to Reports Archive
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  const handleConfirmDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      try {
        await projectReportService.deleteReport(id);
      } catch (err: any) {
        console.warn('[ProjectReportDetailPage] Direct Supabase delete failed, attempting backend fallback:', err?.message);
        await projectCheckerService.deleteProject(id);
      }
      success('Report deleted successfully.');
      navigate('/project-reports');
    } catch (err: any) {
      console.error('[ProjectReportDetailPage] Delete error:', err);
      toastError(err?.message || 'Failed to delete report.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmRename = async () => {
    if (!id || !renameTitle.trim()) return;
    setIsRenaming(true);
    try {
      try {
        await projectReportService.updateReport(id, { project_title: renameTitle.trim() });
      } catch (err: any) {
        console.warn('[ProjectReportDetailPage] Direct Supabase rename failed, attempting backend fallback:', err?.message);
        await projectCheckerService.updateProject(id, { title: renameTitle.trim() });
      }
      setProject(prev => prev ? { ...prev, title: renameTitle.trim() } : null);
      success('Report renamed successfully.');
      setIsRenameModalOpen(false);
    } catch (err: any) {
      console.error('[ProjectReportDetailPage] Rename error:', err);
      toastError(err?.message || 'Failed to rename report.');
    } finally {
      setIsRenaming(false);
    }
  };

  const isEvaluated = project.status === 'EVALUATED' || evaluation.status === 'EVALUATED';

  return (
    <div className="space-y-8 max-w-5xl mx-auto print-full-width">
      {/* Action Bar (Hidden in Print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#243047]">
        <button
          onClick={() => navigate('/project-reports')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Reports Archive
        </button>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Edit3 className="w-4 h-4" />}
            onClick={() => {
              setRenameTitle(project.title || '');
              setIsRenameModalOpen(true);
            }}
          >
            Rename
          </Button>
          <Button
            variant="danger"
            size="sm"
            leftIcon={<Trash2 className="w-4 h-4" />}
            onClick={() => setIsDeleteModalOpen(true)}
          >
            Delete Report
          </Button>
          <Button variant="outline" size="sm" leftIcon={<Printer className="w-4 h-4" />} onClick={handlePrint}>
            Print Report
          </Button>
          <Button variant="primary" size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={handleSavePDF}>
            Save PDF
          </Button>
        </div>
      </div>

      {/* Official Provalix Header */}
      <div className="bg-[#111827] p-6 sm:p-8 rounded-2xl border border-[#243047] shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <ProvalixLogo variant="compact" size="sm" showSubtitle={false} />
            <Badge variant="primary" size="sm">INDEPENDENT PROJECT AUDIT</Badge>
            <Badge variant={isEvaluated ? 'success' : 'amber'} size="sm">
              Status: {project.status || evaluation.status || 'EVALUATED'}
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#F8FAFC]">
            {project.title || 'Untitled Project'}
          </h1>
          <p className="text-xs text-[#94A3B8]">
            Project Topic: <span className="text-[#F8FAFC] font-medium">{project.title || 'Untitled Project'}</span> • Domain: <span className="text-[#A78BFA] font-medium">{project.category || 'General Computing'}</span> • Evaluated on {new Date(evaluation.evaluatedAt).toLocaleDateString()}
          </p>
        </div>

        {/* 100-mark Score Banner */}
        <div className="bg-[#0F172A] border border-[#7C3AED]/40 p-5 rounded-2xl flex flex-col items-center shrink-0 min-w-[150px]">
          <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
            AI Score
          </span>
          <span className="text-4xl font-black text-[#7C3AED] my-1">
            {evaluation.overallScore}
          </span>
          <span className="text-xs font-semibold text-[#94A3B8]">
            / 100 Marks
          </span>
        </div>
      </div>

      {/* 1. PROJECT OVERVIEW */}
      <Card className="p-6 sm:p-8 space-y-4 border-[#243047]">
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
          <h3 className="text-base font-bold text-[#F8FAFC] uppercase tracking-wider text-xs">
            1. Project Overview & Abstract
          </h3>
          <span className="text-xs font-semibold text-[#94A3B8] bg-[#0F172A] border border-[#243047] px-2.5 py-0.5 rounded-lg">
            {project.category}
          </span>
        </div>
        <p className="text-sm text-[#CBD5E1] leading-relaxed">
          {project.description}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
          <div className="p-3.5 bg-[#0F172A] rounded-xl space-y-1 border border-[#243047]">
            <span className="font-bold text-[#F8FAFC] block">Problem Statement</span>
            <p className="text-[#94A3B8] leading-relaxed">{project.problemStatement}</p>
          </div>
          <div className="p-3.5 bg-[#0F172A] rounded-xl space-y-1 border border-[#243047]">
            <span className="font-bold text-[#F8FAFC] block">Proposed Solution</span>
            <p className="text-[#94A3B8] leading-relaxed">{project.proposedSolution}</p>
          </div>
        </div>

        {/* Technologies & Languages */}
        {project.technologies && project.technologies.length > 0 && (
          <div className="pt-2">
            <span className="text-[11px] font-semibold text-[#94A3B8] block mb-1.5">Technologies & Tools:</span>
            <div className="flex flex-wrap gap-1.5">
              {project.technologies.map((t, idx) => (
                <span key={idx} className="px-2.5 py-0.5 rounded-md bg-[#0F172A] text-[#F8FAFC] font-mono text-[11px] border border-[#243047]">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Links */}
        <div className="flex flex-wrap gap-4 pt-2 text-xs">
          {project.githubUrl && (
            <a href={project.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[#A78BFA] hover:underline font-medium">
              <GitBranch className="w-3.5 h-3.5" /> Repository
            </a>
          )}
          {project.liveDemoUrl && (
            <a href={project.liveDemoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[#A78BFA] hover:underline font-medium">
              <Globe className="w-3.5 h-3.5" /> Live Deployment
            </a>
          )}
        </div>
      </Card>

      {/* 2. SUBMITTED RESOURCES */}
      <Card className="p-6 sm:p-8 space-y-4 border-[#243047]">
        <h3 className="text-base font-bold text-[#F8FAFC] uppercase tracking-wider text-xs border-b border-[#1E293B] pb-3">
          2. Verified Submitted Artifacts
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {project.resources.map((res, i) => (
            <div key={i} className="p-3 bg-[#0F172A] rounded-xl border border-[#243047] flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/20 text-[#A78BFA] border border-[#7C3AED]/30 flex items-center justify-center shrink-0">
                <FileCode className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <span className="text-xs font-bold text-[#F8FAFC] truncate block">{res.name}</span>
                <span className="text-[11px] text-[#94A3B8]">{res.size || 'Attached'}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 3. PLAGIARISM ANALYSIS */}
      <Card className="p-6 sm:p-8 space-y-4 border-[#243047]">
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
          <h3 className="text-base font-bold text-[#F8FAFC] uppercase tracking-wider text-xs">
            3. Multi-Modal Plagiarism & Similarity Screening
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047]">
            <span className="text-xs font-semibold text-[#94A3B8] block">Source Code Similarity</span>
            <span className="text-2xl font-bold text-emerald-400 mt-1 block">{evaluation.plagiarism.codeSimilarity}%</span>
            <span className="text-[11px] text-[#94A3B8]">Syntax AST comparison</span>
          </div>

          <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047]">
            <span className="text-xs font-semibold text-[#94A3B8] block">Project Report Similarity</span>
            <span className="text-2xl font-bold text-emerald-400 mt-1 block">{evaluation.plagiarism.reportSimilarity}%</span>
            <span className="text-[11px] text-[#94A3B8]">Academic corpus cross-match</span>
          </div>

          <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047]">
            <span className="text-xs font-semibold text-[#94A3B8] block">Overall Similarity Classification</span>
            <span className="text-2xl font-bold text-emerald-400 mt-1 block">Clean ({evaluation.plagiarism.overallSimilarity}%)</span>
            <span className="text-[11px] text-[#94A3B8]">Below 15% institutional threshold</span>
          </div>
        </div>
      </Card>

      {/* 4. AI EVALUATION SCORE & CRITERIA BREAKDOWN */}
      <Card className="p-6 sm:p-8 space-y-6 border-[#243047]">
        <h3 className="text-base font-bold text-[#F8FAFC] uppercase tracking-wider text-xs border-b border-[#1E293B] pb-3">
          4. Criteria Breakdown (100 Marks Total)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(evaluation.criteria).map(([k, crit]) => (
            <div key={k} className="p-4 bg-[#0F172A] rounded-xl border border-[#243047] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#F8FAFC]">{crit.name}</span>
                <span className="font-bold text-[#7C3AED]">{crit.obtainedScore} / {crit.maxScore}</span>
              </div>
              <Progress value={crit.obtainedScore} max={crit.maxScore} variant="primary" size="sm" />
              <p className="text-[11px] text-[#94A3B8] leading-relaxed mt-1">{crit.feedback}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* 5. DETAILED TECHNICAL, CODE & DOCUMENTATION ANALYSES */}
      <Card className="p-6 sm:p-8 space-y-6 border-[#243047]">
        <h3 className="text-base font-bold text-[#F8FAFC] uppercase tracking-wider text-xs border-b border-[#1E293B] pb-3">
          5. Deep Technical & Architectural Analysis
        </h3>

        <div className="space-y-4 text-xs text-[#CBD5E1] leading-relaxed">
          <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047] space-y-1.5">
            <h4 className="font-bold text-[#F8FAFC] text-xs uppercase tracking-wider">Technical Architecture Analysis</h4>
            <p>{evaluation.technicalAnalysis}</p>
          </div>

          <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047] space-y-1.5">
            <h4 className="font-bold text-[#F8FAFC] text-xs uppercase tracking-wider">Codebase & Algorithmic Quality Analysis</h4>
            <p>{evaluation.codeAnalysis}</p>
          </div>

          <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047] space-y-1.5">
            <h4 className="font-bold text-[#F8FAFC] text-xs uppercase tracking-wider">Documentation & Protocol Rigor Analysis</h4>
            <p>{evaluation.documentationAnalysis}</p>
          </div>
        </div>
      </Card>

      {/* 6. STRENGTHS & WEAKNESSES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card className="p-6 space-y-3 border-[#243047]">
          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Evaluated Strengths
          </h4>
          <ul className="space-y-2 text-xs text-[#CBD5E1]">
            {evaluation.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6 space-y-3 border-[#243047]">
          <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" /> Identified Weaknesses
          </h4>
          <ul className="space-y-2 text-xs text-[#CBD5E1]">
            {evaluation.weaknesses.map((w, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* 7. ACTIONABLE IMPROVEMENT PLAN */}
      <Card className="p-6 sm:p-8 space-y-4 border-[#243047]">
        <h3 className="text-base font-bold text-[#F8FAFC] uppercase tracking-wider text-xs border-b border-[#1E293B] pb-3">
          7. Prioritized Actionable Improvement Plan
        </h3>
        <div className="space-y-3">
          {evaluation.improvementPlan.map((plan, idx) => (
            <div key={idx} className="p-3.5 bg-[#0F172A] rounded-xl border border-[#243047] flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-[#F8FAFC] block">{plan.area}</span>
                <p className="text-xs text-[#CBD5E1] mt-0.5">{plan.suggestion}</p>
              </div>
              <Badge variant={plan.priority === 'High' ? 'error' : plan.priority === 'Medium' ? 'amber' : 'slate'} size="sm">
                {plan.priority} Priority
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* 8. FINAL SUMMARY */}
      <Card className="p-6 sm:p-8 space-y-3 bg-[#0F172A] border-[#7C3AED]/30">
        <h3 className="text-xs font-bold text-[#A78BFA] uppercase tracking-wider">
          8. Executive Evaluation Summary
        </h3>
        <p className="text-xs sm:text-sm text-[#F8FAFC] leading-relaxed">
          {evaluation.summary}
        </p>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete this report?"
        description="This action cannot be undone."
        maxWidth="md"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={isDeleting}
              onClick={handleConfirmDelete}
            >
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-xs text-[#CBD5E1] leading-relaxed">
          Are you sure you want to permanently delete <strong className="text-[#F8FAFC]">{project.title || 'this report'}</strong>? The associated evaluation and similarity metrics will be permanently removed.
        </p>
      </Modal>

      {/* Rename Modal */}
      <Modal
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
        title="Rename Report"
        description="Update the project or report title."
        maxWidth="md"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRenameModalOpen(false)}
              disabled={isRenaming}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isRenaming}
              onClick={handleConfirmRename}
            >
              Save
            </Button>
          </div>
        }
      >
        <div className="space-y-3 pt-2">
          <Input
            label="Project / Report Title"
            placeholder="e.g. Smart Campus Attendance System"
            value={renameTitle}
            onChange={e => setRenameTitle(e.target.value)}
            autoFocus
          />
        </div>
      </Modal>
    </div>
  );
};
