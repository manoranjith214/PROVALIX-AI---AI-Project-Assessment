import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { projectCheckerService } from '../../services/projectCheckerService';
import { useToast } from '../../context/ToastContext';
import { Plus, FileText, ArrowRight, Sparkles, Loader2, Trash2 } from 'lucide-react';

interface EvaluationRow {
  id: string;
  projectId: string;
  title: string;
  category: string;
  date: string;
  overallScore: number | string;
  similarity: number | string;
  codeSimilarity?: number | string;
  status: string;
  isBackend: boolean;
}

export const ProjectCheckerPage: React.FC = () => {
  const { success, error: toastError } = useToast();
  const [rows, setRows] = useState<EvaluationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<EvaluationRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadProjects() {
      setIsLoading(true);
      try {
        const backendProjects = await projectCheckerService.listProjects();
        if (isMounted && Array.isArray(backendProjects)) {
          const mapped: EvaluationRow[] = backendProjects.map(p => ({
            id: p.id,
            projectId: p.id,
            title: p.title,
            category: (p as any).category || p.domain || 'General Engineering',
            date: p.createdAt,
            overallScore: (p as any).aiEvaluation?.totalScore ?? p.overallScore ?? '-',
            similarity: (p as any).plagiarism?.overallSimilarity ?? p.similarityScore ?? '-',
            status: p.status === 'EVALUATED' ? 'Evaluated' : p.status,
            isBackend: true,
          }));
          setRows(mapped);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn('[ProjectCheckerPage] Failed to load projects:', err);
      }

      if (isMounted) {
        setRows([]);
        setIsLoading(false);
      }
    }

    loadProjects();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.isBackend) {
        await projectCheckerService.deleteProject(deleteTarget.id);
      }
      setRows(prev => prev.filter(r => r.id !== deleteTarget.id));
      success('Project evaluation deleted successfully.');
      setDeleteTarget(null);
    } catch (err: any) {
      toastError(err?.message || 'Failed to delete evaluation.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Project Checker"
        subtitle="Analyze a student project independently using AI-powered evaluation and plagiarism analysis. This is a standalone evaluation engine separate from classroom grading."
        showDemoBadge={false}
        actions={
          <Link to="/project-checker/new">
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
              Start New Evaluation
            </Button>
          </Link>
        }
      />

      {/* Workflow Explainer Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#111827] border border-[#243047] flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/20 border border-[#7C3AED]/30 text-[#A78BFA] flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#F8FAFC]">
              How Standalone Evaluation Operates
            </h4>
            <p className="text-xs text-[#CBD5E1] mt-0.5">
              Project Details → Upload Resources → Plagiarism Scan → Multi-Criteria AI Scoring (/100) → Comprehensive Project Report
            </p>
          </div>
        </div>
        <Link to="/project-checker/new">
          <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
            Run Analysis
          </Button>
        </Link>
      </div>

      {/* Previous Evaluations Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-[#F8FAFC]">Previous Evaluations</h3>
            <p className="text-xs text-[#94A3B8]">History of all standalone project audits and similarity reports</p>
          </div>
          <span className="text-xs font-semibold text-[#94A3B8] bg-[#0F172A] border border-[#243047] px-2.5 py-1 rounded-lg">
            {rows.length} Reports Archived
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-[#94A3B8] gap-2 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-[#7C3AED]" />
            Loading project evaluations...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#94A3B8] bg-[#0F172A] rounded-xl border border-[#243047] m-4">
            No projects analyzed yet. Click &quot;Start New Evaluation&quot; to begin your first project check.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#CBD5E1]">
              <thead className="bg-[#0F172A] text-[11px] uppercase tracking-wider text-[#94A3B8] border-y border-[#1E293B]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Project Title</th>
                  <th className="py-3 px-4 font-semibold">Submitted Date</th>
                  <th className="py-3 px-4 font-semibold">AI Score</th>
                  <th className="py-3 px-4 font-semibold">Similarity</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]">
                {rows.map(ev => {
                  const numScore = typeof ev.overallScore === 'number' ? ev.overallScore : null;
                  const numSim = typeof ev.similarity === 'number' ? ev.similarity : null;

                  return (
                    <tr key={ev.id} className="hover:bg-[#172033] transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-[#F8FAFC] max-w-xs truncate">
                        {ev.title}
                        <span className="block text-[11px] font-normal text-[#94A3B8]">
                          {ev.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#CBD5E1] whitespace-nowrap">
                        {new Date(ev.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {numScore !== null ? (
                          <span className="font-bold text-sm text-[#7C3AED]">
                            {numScore} <span className="text-[11px] text-[#94A3B8] font-normal">/ 100</span>
                          </span>
                        ) : (
                          <span className="text-[#94A3B8]">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {numSim !== null ? (
                          <div className="flex items-center gap-1.5">
                            <span className={`font-semibold ${numSim > 15 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {numSim}%
                            </span>
                            {ev.codeSimilarity !== undefined && (
                              <span className="text-[10px] text-[#94A3B8]">
                                (Code: {ev.codeSimilarity}%)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#94A3B8]">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge
                          variant={ev.status === 'Evaluated' || ev.status === 'EVALUATED' ? 'success' : 'primary'}
                          size="sm"
                        >
                          {ev.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/project-reports/${ev.id}`}>
                            <Button variant="outline" size="sm" leftIcon={<FileText className="w-3.5 h-3.5" />}>
                              View Report
                            </Button>
                          </Link>
                          <button
                            title="Delete evaluation"
                            onClick={() => setDeleteTarget(ev)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete this report?"
        description="This action cannot be undone."
        maxWidth="md"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
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
          Are you sure you want to permanently delete <strong className="text-[#F8FAFC]">{deleteTarget?.title || 'this project check'}</strong>? The associated evaluation and similarity metrics will be permanently removed.
        </p>
      </Modal>
    </div>
  );
};
