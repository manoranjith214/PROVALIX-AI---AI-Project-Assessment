import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Progress } from '../../components/ui/Progress';
import { projectCheckerService } from '../../services/projectCheckerService';
import { projectReportService } from '../../services/projectReportService';
import { StandaloneAIEvaluation } from '../../types';
import { validateMeaningfulText, isValidGitHubUrl } from '../../utils/validationUtils';
import { useToast } from '../../context/ToastContext';
import { 
  FileCode, 
  FileText, 
  Presentation, 
  GitBranch, 
  Video, 
  Image as ImageIcon, 
  Database, 
  Files, 
  Check, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  UploadCloud, 
  CheckCircle2,
  Loader2
} from 'lucide-react';

const safeParseJsonArray = (val: any): string => {
  if (Array.isArray(val)) return val.join(', ');
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.join(', ');
    } catch {
      return val;
    }
  }
  return '';
};

export const NewProjectCheckPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId: routeProjectId } = useParams<{ projectId?: string }>();
  const { success, info, error } = useToast();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(() => {
    if (routeProjectId && location.pathname.includes('/resources')) return 2;
    return 1;
  });
  const [backendProjectId, setBackendProjectId] = useState<string | null>(routeProjectId || null);
  const [isLoadingProject, setIsLoadingProject] = useState<boolean>(false);
  const [isCreatingProject, setIsCreatingProject] = useState<boolean>(false);
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
  const [isSavingReport, setIsSavingReport] = useState<boolean>(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeUploadCategory = useRef<string>('other');

  // Form State - Starts completely empty
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    problemStatement: '',
    proposedSolution: '',
    objectives: '',
    innovation: '',
    features: '',
    targetUsers: '',
    technologies: '',
    programmingLanguages: '',
    testingApproach: '',
    limitations: '',
    futureEnhancements: '',
    githubUrl: '',
    liveDemoUrl: '',
  });

  // Resource Upload States - Starts completely empty
  const [uploadedResources, setUploadedResources] = useState<Record<string, { uploaded: boolean; name: string; size: string }>>({
    sourceCode: { uploaded: false, name: '', size: '' },
    projectReport: { uploaded: false, name: '', size: '' },
    ppt: { uploaded: false, name: '', size: '' },
    github: { uploaded: false, name: '', size: '' },
    demoVideo: { uploaded: false, name: '', size: '' },
    screenshots: { uploaded: false, name: '', size: '' },
    dataset: { uploaded: false, name: '', size: '' },
    other: { uploaded: false, name: '', size: '' },
  });

  // Scanning simulation state
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStage, setScanStage] = useState('Scanning Source Code & Dependencies...');

  // Evaluation results state
  const [generatedEvaluation, setGeneratedEvaluation] = useState<StandaloneAIEvaluation | null>(null);

  // Restore project state from database if route contains projectId or on page refresh
  const loadProject = useCallback(async (id: string) => {
    setIsLoadingProject(true);
    try {
      const project = await projectCheckerService.getProjectById(id);
      if (!project) {
        error('Project could not be found.');
        navigate('/project-checker/new', { replace: true });
        return;
      }

      setBackendProjectId(project.id);
      sessionStorage.setItem('current_project_checker_id', project.id);

      setFormData({
        title: project.title || '',
        category: project.category || '',
        description: project.description || '',
        problemStatement: project.problemStatement || '',
        proposedSolution: project.proposedSolution || '',
        objectives: project.objectives || '',
        innovation: project.innovation || '',
        features: project.features || '',
        targetUsers: project.targetUsers || '',
        technologies: safeParseJsonArray(project.technologies),
        programmingLanguages: safeParseJsonArray(project.programmingLanguages),
        testingApproach: project.testingApproach || '',
        limitations: project.limitations || '',
        futureEnhancements: project.futureEnhancements || '',
        githubUrl: project.githubUrl || '',
        liveDemoUrl: project.liveDemoUrl || '',
      });

      if (Array.isArray(project.resources) && project.resources.length > 0) {
        setUploadedResources(prev => {
          const next = { ...prev };
          for (const r of project.resources) {
            const key = r.type && r.type in next ? r.type : 'other';
            next[key] = {
              uploaded: true,
              name: r.name || `${key}-file`,
              size: r.size || '1.0 MB',
            };
          }
          if (project.githubUrl) {
            next.github = { uploaded: true, name: project.githubUrl, size: 'Repo URL' };
          }
          return next;
        });
      } else if (project.githubUrl) {
        setUploadedResources(prev => ({
          ...prev,
          github: { uploaded: true, name: project.githubUrl, size: 'Repo URL' },
        }));
      }

      if (project.aiEvaluation) {
        const mapped = projectCheckerService.mapBackendReport(project);
        setGeneratedEvaluation(mapped.evaluation);
        setCurrentStep(4);
      } else if (location.pathname.includes('/resources')) {
        setCurrentStep(2);
      }
    } catch (err: any) {
      const status = err?.status || err?.statusCode;
      if (status === 404) {
        error('Project could not be found.');
        navigate('/project-checker/new', { replace: true });
      } else if (status === 401) {
        error('Please sign in again.');
      } else {
        error(err?.message || 'Project could not be found.');
      }
    } finally {
      setIsLoadingProject(false);
    }
  }, [navigate, location.pathname, error]);

  useEffect(() => {
    if (routeProjectId) {
      loadProject(routeProjectId);
    } else {
      const savedId = sessionStorage.getItem('current_project_checker_id');
      if (savedId && location.pathname.includes('/resources')) {
        navigate(`/project-checker/new/${savedId}/resources`, { replace: true });
      }
    }
  }, [routeProjectId, loadProject, location.pathname, navigate]);

  const triggerFileInput = (key: string) => {
    activeUploadCategory.current = key;
    fileInputRef.current?.click();
  };

  const handleResourceToggle = (key: string, label: string) => {
    setUploadedResources(prev => {
      const isCurrentlyUploaded = prev[key]?.uploaded;
      if (isCurrentlyUploaded) {
        info(`Removed resource attachment for ${label}`);
        return {
          ...prev,
          [key]: { uploaded: false, name: '', size: '' }
        };
      } else {
        triggerFileInput(key);
        return prev;
      }
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const key = activeUploadCategory.current;

    // Enforce persisted project ID before uploading
    if (!backendProjectId) {
      error('Please save the project before uploading resources.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploadingKey(key);
    try {
      const res = await projectCheckerService.uploadResource(backendProjectId, file, key);
      setUploadedResources(prev => ({
        ...prev,
        [key]: {
          uploaded: true,
          name: res.name || file.name,
          size: res.size || `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        },
      }));
      success(`Uploaded ${file.name}`);
    } catch (err: any) {
      const status = err?.status || err?.statusCode;
      if (status === 401) {
        error('Please sign in again.');
      } else if (status === 404) {
        error('Project could not be found.');
      } else {
        error(err?.message || `Failed to upload ${file.name} to server.`);
      }
    } finally {
      setUploadingKey(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const saveProjectDetails = async (proceedToStep2: boolean = true): Promise<string | null> => {
    const titleVal = validateMeaningfulText(formData.title, 5, 'Project Title');
    if (!titleVal.isValid) {
      error(titleVal.error || 'Please provide a valid project title.');
      return null;
    }

    const categoryVal = validateMeaningfulText(formData.category, 3, 'Category / Domain');
    if (!categoryVal.isValid) {
      error(categoryVal.error || 'Please provide a valid project category.');
      return null;
    }

    const targetUsersVal = validateMeaningfulText(formData.targetUsers, 5, 'Target Users');
    if (!targetUsersVal.isValid) {
      error(targetUsersVal.error || 'Please provide a valid target users definition.');
      return null;
    }

    const descVal = validateMeaningfulText(formData.description, 30, 'Description / Abstract');
    if (!descVal.isValid) {
      error(descVal.error || 'Please provide a meaningful description of at least 30 characters.');
      return null;
    }

    const problemVal = validateMeaningfulText(formData.problemStatement, 30, 'Problem Statement');
    if (!problemVal.isValid) {
      error(problemVal.error || 'Please provide a meaningful problem statement of at least 30 characters.');
      return null;
    }

    const solutionVal = validateMeaningfulText(formData.proposedSolution, 30, 'Proposed Solution');
    if (!solutionVal.isValid) {
      error(solutionVal.error || 'Please provide a meaningful proposed solution of at least 30 characters.');
      return null;
    }

    if (formData.githubUrl && formData.githubUrl.trim()) {
      if (!isValidGitHubUrl(formData.githubUrl)) {
        error('Please provide a valid GitHub repository URL (e.g. https://github.com/owner/repo)');
        return null;
      }
    }

    if (proceedToStep2) {
      setIsCreatingProject(true);
    } else {
      setIsSavingDraft(true);
    }

    try {
      const payload = {
        draftId: backendProjectId || undefined,
        title: formData.title.trim(),
        category: formData.category.trim(),
        description: formData.description.trim(),
        problemStatement: formData.problemStatement.trim(),
        proposedSolution: formData.proposedSolution.trim(),
        objectives: formData.objectives.trim(),
        innovation: formData.innovation.trim(),
        features: formData.features.trim(),
        targetUsers: formData.targetUsers.trim(),
        technologies: formData.technologies ? formData.technologies.split(',').map(s => s.trim()).filter(Boolean) : [],
        programmingLanguages: formData.programmingLanguages ? formData.programmingLanguages.split(',').map(s => s.trim()).filter(Boolean) : [],
        testingApproach: formData.testingApproach.trim(),
        limitations: formData.limitations.trim(),
        futureEnhancements: formData.futureEnhancements.trim(),
        githubUrl: formData.githubUrl.trim() || undefined,
        liveDemoUrl: formData.liveDemoUrl.trim() || undefined,
      };

      let savedId: string;
      if (!backendProjectId) {
        const created = await projectCheckerService.createProject(payload);
        if (!created || !created.id) {
          throw new Error('Database did not return a valid project ID.');
        }
        savedId = String(created.id);
        setBackendProjectId(savedId);
        sessionStorage.setItem('current_project_checker_id', savedId);
        success('Project details saved to database.');
      } else {
        savedId = backendProjectId;
        await projectCheckerService.updateProject(savedId, payload);
        sessionStorage.setItem('current_project_checker_id', savedId);
        success('Project details updated in database.');
      }

      if (proceedToStep2 && savedId) {
        navigate(`/project-checker/new/${savedId}/resources`, { replace: true });
        setCurrentStep(2);
      }
      return savedId;
    } catch (err: any) {
      const status = err?.status || err?.statusCode;
      if (status === 401) {
        error('Please sign in again.');
      } else {
        error(err?.message || 'Please save the project before uploading resources.');
      }
      // Do not navigate to Step 2 if save fails
      return null;
    } finally {
      setIsCreatingProject(false);
      setIsSavingDraft(false);
    }
  };

  const handleStepClick = async (targetStep: 1 | 2 | 3 | 4) => {
    if (targetStep === currentStep) return;

    if (targetStep === 1) {
      setCurrentStep(1);
      return;
    }

    if (targetStep === 2) {
      if (backendProjectId) {
        setCurrentStep(2);
      } else {
        const savedId = await saveProjectDetails(true);
        if (!savedId) {
          error('Please save the project before uploading resources.');
        }
      }
      return;
    }

    if (targetStep === 3) {
      if (!backendProjectId) {
        error('Please save the project before starting analysis.');
        return;
      }
      setCurrentStep(2);
      return;
    }

    if (targetStep === 4) {
      if (generatedEvaluation) {
        setCurrentStep(4);
      } else {
        info('Please complete evaluation to view report.');
      }
    }
  };

  const startEvaluationScan = async () => {
    // 1. Persisted project ID check
    if (!backendProjectId) {
      error('Project could not be saved. Please return to Project Details and save again.');
      setCurrentStep(1);
      return;
    }

    // 2. Meaningful text check
    const titleCheck = validateMeaningfulText(formData.title, 5, 'Project Title');
    const descCheck = validateMeaningfulText(formData.description, 30, 'Description / Abstract');
    const probCheck = validateMeaningfulText(formData.problemStatement, 30, 'Problem Statement');
    const solCheck = validateMeaningfulText(formData.proposedSolution, 30, 'Proposed Solution');
    if (!titleCheck.isValid) {
      error(titleCheck.error || 'Project Title must contain meaningful text.');
      return;
    }
    if (!descCheck.isValid) {
      error(descCheck.error || 'Description must contain meaningful text.');
      return;
    }
    if (!probCheck.isValid) {
      error(probCheck.error || 'Problem Statement must contain meaningful text.');
      return;
    }
    if (!solCheck.isValid) {
      error(solCheck.error || 'Proposed Solution must contain meaningful text.');
      return;
    }

    // 3. Evidence Gate: Require at least one verified source-code evidence source
    const hasSourceArchive = Boolean(uploadedResources.sourceCode?.uploaded && uploadedResources.sourceCode?.name);
    const hasGithub = isValidGitHubUrl(formData.githubUrl);

    if (!hasSourceArchive && !hasGithub) {
      error('Required project evidence is missing.');
      return;
    }

    // 4. Verify project actually exists in backend before starting AI analysis
    try {
      await projectCheckerService.getProjectById(backendProjectId);
    } catch (err: any) {
      const status = err?.status || err?.statusCode;
      if (status === 404) {
        error('Project could not be found.');
      } else if (status === 401) {
        error('Please sign in again.');
      } else {
        error(err?.message || 'Project could not be found.');
      }
      return;
    }

    setCurrentStep(3);
    setScanProgress(15);
    setScanStage('Parsing AST & Scanning Source Code for syntax and licensing...');

    try {
      setScanProgress(30);
      setScanStage('Scanning Technical Project Report and checking academic similarity...');
      await projectCheckerService.runPlagiarismCheck(backendProjectId);

      setScanProgress(60);
      setScanStage('Executing Multi-Criteria Rubric Scoring across all 7 criteria (/100)...');
      await projectCheckerService.runAIEvaluation(backendProjectId);

      setScanProgress(90);
      setScanStage('Finalizing Actionable Phased Improvement Plan and compiling report...');
      const report = await projectCheckerService.getReport(backendProjectId);

      const mapped = projectCheckerService.mapBackendReport(report);
      setGeneratedEvaluation(mapped.evaluation);
      setScanProgress(100);
      setCurrentStep(4);
      success('AI Evaluation & Plagiarism analysis completed successfully!');
    } catch (err: any) {
      setCurrentStep(2);
      setScanProgress(0);
      const status = err?.status || err?.statusCode;
      const msg = (err?.message || '').toLowerCase();

      if (status === 401 || msg.includes('unauthorized') || msg.includes('sign in')) {
        error('Please sign in again.');
      } else if (status === 404 || msg.includes('not found')) {
        error('Project could not be found.');
      } else if (
        status === 400 &&
        (msg.includes('evidence') || msg.includes('insufficient') || msg.includes('source code') || msg.includes('missing'))
      ) {
        error('Required project evidence is missing.');
      } else if (
        status === 503 ||
        status === 500 ||
        msg.includes('unavailable') ||
        msg.includes('ai provider') ||
        msg.includes('gemini')
      ) {
        error('AI evaluation service is currently unavailable.');
      } else {
        error(err?.message || 'AI evaluation service is currently unavailable.');
      }
    }
  };

  const handleSaveAndGenerateReport = async () => {
    if (!generatedEvaluation || typeof generatedEvaluation.overallScore !== 'number') {
      error('No valid AI evaluation score available to save.');
      return;
    }

    setIsSavingReport(true);
    try {
      const title = formData.title.trim() || 'Untitled Project';
      const category = formData.category || 'General Computing & AI';
      const score = generatedEvaluation.overallScore;
      const similarity = generatedEvaluation.plagiarism?.overallSimilarity ?? 0;

      const attachedResources = Object.entries(uploadedResources)
        .filter(([_, r]) => r.uploaded && r.name)
        .map(([type, r]) => ({
          type,
          name: r.name,
          size: r.size || '1.0 MB',
          uploadedAt: new Date().toISOString(),
          status: 'uploaded',
        }));

      const reportPayload = {
        project_title: title,
        category,
        status: 'Evaluated',
        score,
        similarity,
        report_data: {
          project: {
            title,
            category,
            description: formData.description,
            problemStatement: formData.problemStatement,
            proposedSolution: formData.proposedSolution,
            objectives: formData.objectives,
            innovation: formData.innovation,
            features: formData.features,
            targetUsers: formData.targetUsers,
            technologies: formData.technologies ? formData.technologies.split(',').map(s => s.trim()).filter(Boolean) : [],
            programmingLanguages: formData.programmingLanguages ? formData.programmingLanguages.split(',').map(s => s.trim()).filter(Boolean) : [],
            testingApproach: formData.testingApproach,
            limitations: formData.limitations,
            futureEnhancements: formData.futureEnhancements,
            githubUrl: formData.githubUrl,
            liveDemoUrl: formData.liveDemoUrl,
            resources: attachedResources,
            status: 'Evaluated',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          evaluation: generatedEvaluation,
        },
      };

      const savedReport = await projectReportService.createReport(reportPayload);
      success('Project Report generated and saved to Supabase Project Reports archive!');
      navigate(`/project-reports/${savedReport.id}`);
    } catch (err: any) {
      console.error('[NewProjectCheckPage] Failed to save report to Supabase:', err);
      error(err?.message || 'Failed to save report to Supabase database.');
    } finally {
      setIsSavingReport(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <PageHeader
        title="New AI Project Evaluation"
        subtitle="Independent multi-criteria AI assessment with dual-pass plagiarism screening. Not linked to classroom grading."
        breadcrumbs={
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
            <span>Project Checker</span>
            <span>/</span>
            <span className="text-slate-100 font-medium">New Evaluation</span>
          </div>
        }
      />

      {/* Stepper Wizard Bar */}
      <div className="grid grid-cols-4 gap-2 border-b border-[#1E293B] pb-4">
        {[
          { num: 1, label: '1. Project Details' },
          { num: 2, label: '2. Upload Resources' },
          { num: 3, label: '3. Plagiarism & Scan' },
          { num: 4, label: '4. AI Score & Report' },
        ].map(step => (
          <button
            key={step.num}
            type="button"
            onClick={() => handleStepClick(step.num as 1 | 2 | 3 | 4)}
            className={`text-center pb-1 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              currentStep === step.num
                ? 'border-[#7C3AED] text-[#7C3AED]'
                : currentStep > step.num
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-[#94A3B8] hover:text-slate-300'
            }`}
          >
            {step.label}
          </button>
        ))}
      </div>

      {/* Loading state when restoring project from database */}
      {isLoadingProject && (
        <Card className="p-12 text-center space-y-4 border-[#243047]">
          <Loader2 className="w-8 h-8 animate-spin text-[#7C3AED] mx-auto" />
          <p className="text-sm text-[#94A3B8]">Restoring saved project submission from database...</p>
        </Card>
      )}

      {/* STEP 1: PROJECT DETAILS */}
      {!isLoadingProject && currentStep === 1 && (
        <Card className="p-6 sm:p-8 space-y-8 border-[#243047]">
          <div className="border-b border-[#1E293B] pb-4">
            <h3 className="text-lg font-bold text-[#F8FAFC]">Project Overview & Metadata</h3>
            <p className="text-xs text-[#94A3B8]">Provide descriptive details for contextual AI rubric benchmarking</p>
          </div>

          {/* Section A: Core Identity */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
              Section A: Core Identity
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Project Title"
                  placeholder="Enter project title (e.g. Smart Campus Attendance System)"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <Input
                label="Category / Domain"
                placeholder="e.g. Artificial Intelligence, Web Development, IoT"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                required
              />
              <Input
                label="Target Users / Audience"
                placeholder="e.g. University Faculty, Healthcare Workers, Students"
                value={formData.targetUsers}
                onChange={e => setFormData({ ...formData, targetUsers: e.target.value })}
                required
              />
              <div className="sm:col-span-2">
                <Textarea
                  label="Executive Summary / Abstract"
                  placeholder="Provide a comprehensive summary of your project..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  required
                />
              </div>
            </div>
          </div>

          {/* Section B: Problem & Proposed Solution */}
          <div className="space-y-4 pt-4 border-t border-[#1E293B]">
            <h4 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
              Section B: Problem & Proposed Solution
            </h4>
            <div className="grid grid-cols-1 gap-4">
              <Textarea
                label="Problem Statement & Pain Points"
                placeholder="Describe the real-world problem and user pain points being solved..."
                value={formData.problemStatement}
                onChange={e => setFormData({ ...formData, problemStatement: e.target.value })}
                rows={2}
                required
              />
              <Textarea
                label="Proposed Solution & Architecture"
                placeholder="Describe the proposed technical solution and system architecture..."
                value={formData.proposedSolution}
                onChange={e => setFormData({ ...formData, proposedSolution: e.target.value })}
                rows={2}
                required
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Textarea
                  label="Key Project Objectives"
                  placeholder="e.g. Real-time processing under 100ms, 99% accuracy..."
                  value={formData.objectives}
                  onChange={e => setFormData({ ...formData, objectives: e.target.value })}
                  rows={2}
                />
                <Textarea
                  label="Novelty & Innovation Factor"
                  placeholder="What makes your approach novel or technically distinct?"
                  value={formData.innovation}
                  onChange={e => setFormData({ ...formData, innovation: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Section C: Technical Stack & Testing */}
          <div className="space-y-4 pt-4 border-t border-[#1E293B]">
            <h4 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
              Section C: Technical Implementation & Testing
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Technologies & Frameworks"
                placeholder="e.g. React, Node.js, PostgreSQL, Docker"
                value={formData.technologies}
                onChange={e => setFormData({ ...formData, technologies: e.target.value })}
              />
              <Input
                label="Programming Languages"
                placeholder="e.g. TypeScript, Python, Go"
                value={formData.programmingLanguages}
                onChange={e => setFormData({ ...formData, programmingLanguages: e.target.value })}
              />
              <div className="sm:col-span-2">
                <Textarea
                  label="Testing & Verification Approach"
                  placeholder="e.g. Unit tests, integration tests, end-to-end verification..."
                  value={formData.testingApproach}
                  onChange={e => setFormData({ ...formData, testingApproach: e.target.value })}
                  rows={2}
                />
              </div>
              <Textarea
                label="Current Known Limitations"
                placeholder="e.g. Requires active internet connection, high memory usage..."
                value={formData.limitations}
                onChange={e => setFormData({ ...formData, limitations: e.target.value })}
                rows={2}
              />
              <Textarea
                label="Future Enhancements"
                placeholder="e.g. Mobile application, edge deployment, offline sync..."
                value={formData.futureEnhancements}
                onChange={e => setFormData({ ...formData, futureEnhancements: e.target.value })}
                rows={2}
              />
              <Input
                label="GitHub Repository URL"
                placeholder="https://github.com/username/project"
                value={formData.githubUrl}
                onChange={e => setFormData({ ...formData, githubUrl: e.target.value })}
              />
              <Input
                label="Live Demo / Deployment URL"
                placeholder="https://yourproject.com"
                value={formData.liveDemoUrl}
                onChange={e => setFormData({ ...formData, liveDemoUrl: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#1E293B]">
            <Button
              variant="outline"
              size="md"
              isLoading={isSavingDraft}
              onClick={() => saveProjectDetails(false)}
            >
              Save Project
            </Button>
            <Button
              variant="primary"
              size="md"
              isLoading={isCreatingProject}
              onClick={() => saveProjectDetails(true)}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Save & Continue to Resource Upload
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 2: RESOURCE UPLOAD */}
      {!isLoadingProject && currentStep === 2 && (
        <Card className="p-6 sm:p-8 space-y-6 border-[#243047]">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="border-b border-[#1E293B] pb-4">
            <h3 className="text-lg font-bold text-[#F8FAFC]">Upload Submission Artifacts</h3>
            <p className="text-xs text-[#94A3B8]">
              Attach the required source code files and reports for comprehensive code analysis and plagiarism checks.
            </p>
          </div>

          {/* 8 Upload Areas Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { key: 'sourceCode', label: 'Source Code Archive', icon: FileCode, desc: '.zip, .tar.gz containing complete source repository' },
              { key: 'projectReport', label: 'Project Report (PDF)', icon: FileText, desc: 'Complete final manuscript or proposal document' },
              { key: 'ppt', label: 'Presentation Deck (PPT)', icon: Presentation, desc: 'Slide presentation deck for defense review' },
              { key: 'github', label: 'GitHub Repository', icon: GitBranch, desc: 'Public or authenticated GitHub repo link' },
              { key: 'demoVideo', label: 'Demo Video', icon: Video, desc: 'MP4 walkthrough showcasing core user flow' },
              { key: 'screenshots', label: 'Screenshots / Diagrams', icon: ImageIcon, desc: 'Architecture schemas or UI screenshots' },
              { key: 'dataset', label: 'Dataset / Fixtures', icon: Database, desc: 'Evaluation dataset, CSVs, or validation sets' },
              { key: 'other', label: 'Other Documents', icon: Files, desc: 'Supplemental ethical clearance or test logs' },
            ].map(item => {
              const Icon = item.icon;
              const res = uploadedResources[item.key];
              return (
                <div
                  key={item.key}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    res.uploaded
                      ? 'border-[#7C3AED]/40 bg-[#7C3AED]/10'
                      : 'border-[#243047] bg-[#0F172A]/50 hover:bg-[#0F172A]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-lg ${res.uploaded ? 'bg-[#7C3AED] text-white' : 'bg-[#111827] text-[#94A3B8] border border-[#243047]'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {res.uploaded ? (
                        <Badge variant="success" size="sm" icon={<Check className="w-3 h-3" />}>
                          Uploaded
                        </Badge>
                      ) : (
                        <Badge variant="slate" size="sm">Optional</Badge>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#F8FAFC]">{item.label}</h4>
                      <p className="text-[11px] text-[#94A3B8] leading-relaxed mt-0.5">{item.desc}</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-[#1E293B]">
                    {res.uploaded ? (
                      <div className="text-[11px] space-y-1">
                        <span className="font-mono text-[#F8FAFC] font-medium truncate block">{res.name}</span>
                        <span className="text-[#94A3B8] block">{res.size}</span>
                        <button
                          onClick={() => handleResourceToggle(item.key, item.label)}
                          className="text-[10px] font-semibold text-red-400 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        isLoading={uploadingKey === item.key}
                        leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
                        onClick={() => triggerFileInput(item.key)}
                      >
                        Attach File
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#1E293B]">
            <Button
              variant="outline"
              onClick={() => {
                if (backendProjectId) {
                  navigate(`/project-checker/new/${backendProjectId}`, { replace: true });
                }
                setCurrentStep(1);
              }}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to Details
            </Button>
            <Button
              variant="primary"
              onClick={startEvaluationScan}
              rightIcon={<Sparkles className="w-4 h-4" />}
            >
              Start Analysis
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 3: SCANNING SIMULATION */}
      {currentStep === 3 && (
        <Card className="p-8 sm:p-12 text-center space-y-6 border-[#243047]">
          <div className="w-16 h-16 rounded-2xl bg-[#7C3AED]/20 border border-[#7C3AED]/30 text-[#A78BFA] flex items-center justify-center mx-auto animate-pulse">
            <Sparkles className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-xl font-bold text-[#F8FAFC]">Evaluating Project Submission</h3>
            <p className="text-xs text-[#CBD5E1]">{scanStage}</p>
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <Progress value={scanProgress} max={100} variant="primary" size="lg" />
            <div className="flex justify-between text-xs text-[#94A3B8] font-mono">
              <span>Deterministic AI Engine</span>
              <span>{scanProgress}%</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 max-w-2xl mx-auto pt-4 text-xs text-left">
            <div className={`p-3 rounded-xl border ${scanProgress >= 25 ? 'bg-[#7C3AED]/10 border-[#7C3AED]/30 text-[#F8FAFC]' : 'bg-[#0F172A] border-[#243047] text-[#94A3B8]'}`}>
              <div className="font-bold flex items-center gap-1.5">
                {scanProgress >= 25 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7C3AED]" />}
                AST Code Scan
              </div>
              <span className="text-[10px] text-[#94A3B8]">Syntax & cyclomatic depth</span>
            </div>

            <div className={`p-3 rounded-xl border ${scanProgress >= 50 ? 'bg-[#7C3AED]/10 border-[#7C3AED]/30 text-[#F8FAFC]' : 'bg-[#0F172A] border-[#243047] text-[#94A3B8]'}`}>
              <div className="font-bold flex items-center gap-1.5">
                {scanProgress >= 50 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <span className="w-3.5 h-3.5 rounded-full border border-[#334155]" />}
                Report Similarity
              </div>
              <span className="text-[10px] text-[#94A3B8]">Cross-corpus text match</span>
            </div>

            <div className={`p-3 rounded-xl border ${scanProgress >= 75 ? 'bg-[#7C3AED]/10 border-[#7C3AED]/30 text-[#F8FAFC]' : 'bg-[#0F172A] border-[#243047] text-[#94A3B8]'}`}>
              <div className="font-bold flex items-center gap-1.5">
                {scanProgress >= 75 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <span className="w-3.5 h-3.5 rounded-full border border-[#334155]" />}
                Rubric Matrix
              </div>
              <span className="text-[10px] text-[#94A3B8]">7 criteria assessment</span>
            </div>

            <div className={`p-3 rounded-xl border ${scanProgress === 100 ? 'bg-[#7C3AED]/10 border-[#7C3AED]/30 text-[#F8FAFC]' : 'bg-[#0F172A] border-[#243047] text-[#94A3B8]'}`}>
              <div className="font-bold flex items-center gap-1.5">
                {scanProgress === 100 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <span className="w-3.5 h-3.5 rounded-full border border-[#334155]" />}
                Actionable Plan
              </div>
              <span className="text-[10px] text-[#94A3B8]">Priority recommendations</span>
            </div>
          </div>
        </Card>
      )}

      {/* STEP 4: AI EVALUATION PREVIEW & REPORT SAVE */}
      {currentStep === 4 && generatedEvaluation && (
        <div className="space-y-6">
          {/* Top Score Banner */}
          <Card className="p-6 sm:p-8 bg-gradient-to-br from-[#111827] to-[#0F172A] border-[#243047]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center sm:text-left">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <Badge variant="ai" size="md" icon={<Sparkles className="w-3.5 h-3.5" />}>
                    AI EVALUATION COMPLETE
                  </Badge>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#F8FAFC]">
                  {formData.title}
                </h2>
                <p className="text-xs text-[#94A3B8]">
                  Category: {formData.category} • Evaluated on {new Date().toLocaleDateString()}
                </p>
              </div>

              {/* Large Score Indicator */}
              <div className="flex flex-col items-center bg-[#0F172A] p-5 rounded-2xl border border-[#243047] shadow-xl shrink-0">
                <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
                  Overall Score
                </span>
                <span className="text-5xl font-black text-[#7C3AED] my-1">
                  {generatedEvaluation.overallScore}
                </span>
                <span className="text-xs font-semibold text-[#94A3B8]">
                  out of 100 Marks
                </span>
              </div>
            </div>

            {/* Plagiarism Bar */}
            <div className="mt-6 pt-6 border-t border-[#1E293B] grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 bg-[#0F172A] rounded-xl border border-[#243047]">
                <span className="text-[11px] font-semibold text-[#94A3B8] block">Code Similarity</span>
                <span className="text-lg font-bold text-emerald-400">{generatedEvaluation.plagiarism.codeSimilarity}%</span>
              </div>
              <div className="p-3 bg-[#0F172A] rounded-xl border border-[#243047]">
                <span className="text-[11px] font-semibold text-[#94A3B8] block">Report Similarity</span>
                <span className="text-lg font-bold text-emerald-400">{generatedEvaluation.plagiarism.reportSimilarity}%</span>
              </div>
              <div className="p-3 bg-[#0F172A] rounded-xl border border-[#243047]">
                <span className="text-[11px] font-semibold text-[#94A3B8] block">Overall Similarity Status</span>
                <span className="text-lg font-bold text-emerald-400">Low (Clean)</span>
              </div>
            </div>
          </Card>

          {/* Criteria Breakdown Grid */}
          <Card className="p-6 border-[#243047]">
            <h3 className="text-base font-bold text-[#F8FAFC] mb-4">
              Detailed Criteria Breakdown (100 Marks Total)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(generatedEvaluation.criteria).map(([key, crit]) => (
                <div key={key} className="p-4 rounded-xl border border-[#243047] bg-[#0F172A] space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[#F8FAFC]">{crit.name}</span>
                    <span className="font-bold text-[#7C3AED]">{crit.obtainedScore} / {crit.maxScore}</span>
                  </div>
                  <Progress value={crit.obtainedScore} max={crit.maxScore} variant="primary" size="sm" />
                  <p className="text-[11px] text-[#94A3B8] mt-1 leading-relaxed">{crit.feedback}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Actionable Improvement Plan Preview */}
          <Card className="p-6 border-[#243047]">
            <h3 className="text-base font-bold text-[#F8FAFC] mb-4">
              Actionable Improvement Plan
            </h3>
            <div className="space-y-2.5">
              {generatedEvaluation.improvementPlan.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-[#243047] bg-[#0F172A] flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-[#F8FAFC] block">{item.area}</span>
                    <p className="text-[11px] text-[#CBD5E1] mt-0.5">{item.suggestion}</p>
                  </div>
                  <Badge
                    variant={item.priority === 'High' ? 'error' : item.priority === 'Medium' ? 'amber' : 'slate'}
                    size="sm"
                  >
                    {item.priority} Priority
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Save Action Bar */}
          <div className="p-4 bg-[#111827] rounded-2xl border border-[#243047] flex items-center justify-between gap-4">
            <Button variant="outline" onClick={() => setCurrentStep(1)}>
              Edit Submission
            </Button>
            <Button
              variant="primary"
              size="lg"
              isLoading={isSavingReport}
              onClick={handleSaveAndGenerateReport}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Save & View Final Project Report
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
