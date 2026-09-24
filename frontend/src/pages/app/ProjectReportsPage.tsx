import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { projectCheckerService } from '../../services/projectCheckerService';
import { tokenStorage } from '../../services/api/tokenStorage';
import { useToast } from '../../context/ToastContext';
import { 
  Search, 
  Plus, 
  ArrowRight, 
  Loader2, 
  Lock, 
  AlertTriangle, 
  FileQuestion, 
  RefreshCw, 
  Filter, 
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Trash2,
  Edit3
} from 'lucide-react';

interface ReportCardItem {
  id: string;
  projectId: string;
  title: string;
  category: string;
  status: string;
  overallScore: number | string;
  similarity: number | string;
  plagiarismStatus: string;
  createdAt: string;
  updatedAt: string;
  isBackend: boolean;
}

export const ProjectReportsPage: React.FC = () => {
  const { success, error: toastError } = useToast();
  const [reports, setReports] = useState<ReportCardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  // Delete & Rename states
  const [deleteTarget, setDeleteTarget] = useState<ReportCardItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ReportCardItem | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  // Search, Filter, Sort & Pagination states
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title_asc' | 'title_desc'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 9;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsUnauthorized(false);

    const token = tokenStorage.getAccessToken();

    // Map sort dropdown to backend parameters
    let backendSortBy = 'createdAt';
    let backendSortOrder: 'asc' | 'desc' = 'desc';
    if (sortBy === 'oldest') {
      backendSortOrder = 'asc';
    } else if (sortBy === 'title_asc') {
      backendSortBy = 'title';
      backendSortOrder = 'asc';
    } else if (sortBy === 'title_desc') {
      backendSortBy = 'title';
      backendSortOrder = 'desc';
    }

    try {
      if (token) {
        const result = await projectCheckerService.listProjectsWithMeta({
          page: currentPage,
          limit: pageSize,
          search: debouncedSearch || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          sortBy: backendSortBy,
          sortOrder: backendSortOrder,
        });

        if (result && Array.isArray(result.projects)) {
          const mapped: ReportCardItem[] = result.projects.map(p => {
            const numScore = (p as any).aiEvaluation?.totalScore ?? p.overallScore ?? null;
            const numSim = (p as any).plagiarism?.overallSimilarity ?? p.similarityScore ?? null;
            const pStatus = (p as any).plagiarism?.status || (numSim !== null ? (numSim <= 15 ? 'Clean' : 'Elevated') : 'Verified');

            return {
              id: p.id,
              projectId: p.id,
              title: p.title,
              category: (p as any).category || p.domain || 'General Computing',
              status: p.status || 'EVALUATED',
              overallScore: numScore !== null ? numScore : 'Pending',
              similarity: numSim !== null ? `${numSim}%` : 'Pending',
              plagiarismStatus: pStatus,
              createdAt: p.createdAt,
              updatedAt: p.updatedAt || p.createdAt,
              isBackend: true,
            };
          });

          setReports(mapped);
          setTotalCount(result.pagination?.total ?? mapped.length);
          setTotalPages(result.pagination?.totalPages ?? Math.max(1, Math.ceil(mapped.length / pageSize)));
          setIsLoading(false);
          return;
        }
      }
    } catch (err: any) {
      if (err?.status === 401) {
        setIsUnauthorized(true);
        setIsLoading(false);
        return;
      }
      setErrorMessage(err?.message || 'Failed to connect to reports API server.');
    }

    setReports([]);
    setTotalCount(0);
    setTotalPages(1);
    setIsLoading(false);
  }, [debouncedSearch, statusFilter, sortBy, currentPage]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.isBackend) {
        await projectCheckerService.deleteProject(deleteTarget.id);
      }
      setReports(prev => prev.filter(r => r.id !== deleteTarget.id));
      setTotalCount(c => Math.max(0, c - 1));
      success('Report deleted successfully.');
      setDeleteTarget(null);
    } catch (err: any) {
      toastError(err?.message || 'Failed to delete report.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmRename = async () => {
    if (!renameTarget || !renameTitle.trim()) return;
    setIsRenaming(true);
    try {
      if (renameTarget.isBackend) {
        await projectCheckerService.updateProject(renameTarget.id, { title: renameTitle.trim() });
      }
      setReports(prev => prev.map(r => r.id === renameTarget.id ? { ...r, title: renameTitle.trim() } : r));
      success('Report renamed successfully.');
      setRenameTarget(null);
    } catch (err: any) {
      toastError(err?.message || 'Failed to rename report.');
    } finally {
      setIsRenaming(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Project Reports"
        subtitle="Archived evaluation reports generated exclusively by the standalone AI Project Checker. Classroom and viva metrics are strictly isolated from this registry."
        showDemoBadge={false}
        actions={
          <Link to="/project-checker/new">
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
              New Project Check
            </Button>
          </Link>
        }
      />

      {/* Control Bar: Search, Status Filter, Sort By */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search reports by title or category..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
            <Filter className="w-3.5 h-3.5 text-[#94A3B8]" />
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#0F172A] border border-[#243047] rounded-lg px-3 py-2 text-xs font-medium text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] shadow-sm"
            >
              <option value="ALL">All Statuses</option>
              <option value="EVALUATED">Evaluated</option>
              <option value="EVALUATING">Evaluating</option>
              <option value="RESOURCES_UPLOADED">Resources Uploaded</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#94A3B8]" />
            <select
              value={sortBy}
              onChange={e => {
                setSortBy(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-[#0F172A] border border-[#243047] rounded-lg px-3 py-2 text-xs font-medium text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] shadow-sm"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title_asc">Title (A-Z)</option>
              <option value="title_desc">Title (Z-A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* State 1: Unauthorized State */}
      {isUnauthorized && (
        <Card className="p-12 text-center space-y-4 max-w-md mx-auto my-8 border-[#243047]">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center border border-amber-500/30">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#F8FAFC]">Authentication Required</h3>
          <p className="text-xs text-[#CBD5E1] leading-relaxed">
            Please sign in to your Provalix AI account to access your private Project Checker evaluation archives.
          </p>
          <div className="pt-2">
            <Link to="/login">
              <Button variant="primary" size="sm">
                Sign In to Provalix AI
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* State 2: API Error State (with Retry) */}
      {!isUnauthorized && errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between text-xs text-red-400">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage} (Displaying offline demo records as fallback)</span>
          </div>
          <Button variant="outline" size="sm" onClick={loadReports} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Retry API
          </Button>
        </div>
      )}

      {/* State 3: Loading State */}
      {isLoading && !isUnauthorized ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#94A3B8] gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#7C3AED]" />
          <p className="text-xs font-medium">Fetching verified project reports...</p>
        </div>
      ) : !isUnauthorized && reports.length === 0 ? (
        /* State 4: Empty State */
        <Card className="p-12 text-center space-y-4 max-w-md mx-auto my-8 border-[#243047]">
          <div className="w-12 h-12 rounded-full bg-[#0F172A] border border-[#243047] text-[#94A3B8] mx-auto flex items-center justify-center">
            <FileQuestion className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#F8FAFC]">No Project Reports Found</h3>
          <p className="text-xs text-[#CBD5E1] leading-relaxed">
            {debouncedSearch || statusFilter !== 'ALL'
              ? 'No evaluations matched your search criteria. Try modifying your filter or query.'
              : 'You have not evaluated any projects yet. Run your first autonomous AI check now.'}
          </p>
          <div className="pt-2">
            <Link to="/project-checker/new">
              <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                Start New Project Check
              </Button>
            </Link>
          </div>
        </Card>
      ) : !isUnauthorized && (
        /* State 5: Reports Grid */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.map(report => {
              const isScoreNumber = typeof report.overallScore === 'number';
              const isEvaluated = report.status === 'EVALUATED' || report.status === 'Evaluated';

              return (
                <Card key={report.id} className="p-6 flex flex-col justify-between hoverable space-y-4 border-[#243047]">
                  <div className="space-y-3">
                    {/* Header Row: Meaningful Domain/Category & Score */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold bg-[#7C3AED]/10 border border-[#7C3AED]/30 text-[#A78BFA] px-2.5 py-0.5 rounded-full truncate max-w-[170px]">
                          {report.category || 'Independent Audit'}
                        </span>
                      </div>
                      <Badge variant={isEvaluated ? 'primary' : 'slate'} size="sm">
                        {isScoreNumber ? `Score: ${report.overallScore}/100` : 'Not Evaluated'}
                      </Badge>
                    </div>

                    {/* Project Title & Category */}
                    <div>
                      <h3 className="text-base font-bold text-[#F8FAFC] line-clamp-2" title={report.title}>
                        {report.title || 'Untitled Project'}
                      </h3>
                      <p className="text-xs text-[#94A3B8] mt-1">
                        {report.category || 'General Computing'}
                      </p>
                    </div>

                    {/* Required Metrics Grid: Status, Plagiarism, Created & Updated Dates */}
                    <div className="p-3 bg-[#0F172A] rounded-xl space-y-2 text-xs text-[#CBD5E1] border border-[#243047]">
                      {/* Evaluation Status */}
                      <div className="flex justify-between items-center">
                        <span className="text-[#94A3B8]">Evaluation Status:</span>
                        <Badge
                          variant={isEvaluated ? 'success' : report.status === 'EVALUATING' ? 'amber' : 'slate'}
                          size="sm"
                        >
                          {report.status}
                        </Badge>
                      </div>

                      {/* Plagiarism Status */}
                      <div className="flex justify-between items-center">
                        <span className="text-[#94A3B8]">Plagiarism Status:</span>
                        <div className="flex items-center gap-1.5 font-medium">
                          <span className={report.plagiarismStatus === 'Clean' ? 'text-emerald-400' : 'text-amber-400'}>
                            {report.plagiarismStatus}
                          </span>
                          <span className="text-[10px] text-[#94A3B8] font-mono">
                            ({report.similarity})
                          </span>
                        </div>
                      </div>

                      {/* Created Date */}
                      <div className="flex justify-between items-center pt-1 border-t border-[#1E293B] text-[11px]">
                        <span className="text-[#94A3B8] flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Created:
                        </span>
                        <span className="text-[#CBD5E1] font-medium">
                          {new Date(report.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>

                      {/* Updated Date */}
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-[#94A3B8] flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Updated:
                        </span>
                        <span className="text-[#CBD5E1] font-medium">
                          {new Date(report.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Footer: Rename, Delete, View */}
                  <div className="pt-3 border-t border-[#1E293B] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        title="Rename report"
                        onClick={() => {
                          setRenameTarget(report);
                          setRenameTitle(report.title || '');
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        title="Delete report"
                        onClick={() => setDeleteTarget(report)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <Link to={`/project-reports/${report.id}`}>
                      <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                        View Report
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-[#1E293B] text-xs text-[#94A3B8]">
              <span>
                Showing page <strong className="text-[#F8FAFC]">{currentPage}</strong> of <strong className="text-[#F8FAFC]">{totalPages}</strong> ({totalCount} total reports)
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

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
          Are you sure you want to permanently delete <strong className="text-[#F8FAFC]">{deleteTarget?.title || 'this report'}</strong>? The associated evaluation and similarity metrics will be permanently removed.
        </p>
      </Modal>

      {/* Rename Modal */}
      <Modal
        isOpen={Boolean(renameTarget)}
        onClose={() => setRenameTarget(null)}
        title="Rename Report"
        description="Update the project or report title."
        maxWidth="md"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRenameTarget(null)}
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
