import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import { classroomService } from '../../services/classroomService';
import { ClassroomResourceRequirement } from '../../types';
import { School, ArrowLeft, Plus, Upload, X, Users, AlertCircle, Sparkles } from 'lucide-react';

export const CreateClassroomPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [submissionDeadline, setSubmissionDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [submissionMode, setSubmissionMode] = useState<'Individual' | 'Team'>('Team');
  const [minTeamSize, setMinTeamSize] = useState<number>(2);
  const [maxTeamSize, setMaxTeamSize] = useState<number>(4);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const [resources, setResources] = useState<ClassroomResourceRequirement[]>([
    { type: 'sourceCode', label: 'Source Code Repository / Archive', required: true },
    { type: 'projectReport', label: 'Comprehensive Technical Report (PDF)', required: true },
    { type: 'ppt', label: 'Presentation Deck Slides', required: true },
    { type: 'github', label: 'GitHub Repository URL', required: true },
    { type: 'demoVideo', label: 'Working Demonstration Video', required: false },
    { type: 'screenshots', label: 'Screenshots & UI Diagrams', required: false },
    { type: 'dataset', label: 'Evaluation Dataset / Benchmarks', required: false },
    { type: 'other', label: 'Other Supplemental Documents', required: false },
  ]);

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await classroomService.uploadLogo(file);
      setLogoPreview(base64);
      success('Classroom logo uploaded successfully.');
    } catch (err: any) {
      error(err.message || 'Failed to process logo image.');
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleRequired = (idx: number) => {
    setResources(prev =>
      prev.map((r, i) => (i === idx ? { ...r, required: !r.required } : r))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      error('Please enter a classroom name.');
      return;
    }

    if (new Date(submissionDeadline) <= new Date(startDate)) {
      error('Submission deadline must be strictly after the start date.');
      return;
    }

    if (submissionMode === 'Team') {
      if (minTeamSize < 2 || minTeamSize > 20) {
        error('Minimum team members must be between 2 and 20.');
        return;
      }
      if (maxTeamSize < 2 || maxTeamSize > 20) {
        error('Maximum team members must be between 2 and 20.');
        return;
      }
      if (minTeamSize > maxTeamSize) {
        error('Minimum team size must be less than or equal to maximum team size.');
        return;
      }
    }

    setIsLoading(true);
    try {
      const created = await classroomService.createClassroom(
        name.trim(),
        description.trim(),
        startDate,
        submissionDeadline,
        submissionMode,
        resources,
        {
          logo: logoPreview || undefined,
          minTeamSize: submissionMode === 'Team' ? minTeamSize : undefined,
          maxTeamSize: submissionMode === 'Team' ? maxTeamSize : undefined,
        }
      );
      success(`Classroom "${created.name}" created with code ${created.code}! You are assigned Owner/Admin for this classroom.`);
      navigate(`/classrooms/${created.id}`);
    } catch (err: any) {
      error(err.message || 'Failed to create classroom.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Create New Classroom"
        subtitle="Configure an evaluation cohort. The creator automatically becomes Classroom Owner/Admin with verification rights."
        breadcrumbs={
          <Link to="/classrooms" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Classrooms
          </Link>
        }
      />

      <Card className="p-6 sm:p-8 space-y-6 border-[#243047] shadow-subtle">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo Upload Section */}
          <div className="p-4 rounded-xl border border-[#243047] bg-[#0F172A] space-y-3">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Classroom Brand / Logo
            </label>
            <p className="text-xs text-slate-400">
              Upload your custom institution, hackathon, or lab logo (PNG, JPG, WEBP, GIF, max 5MB).
            </p>

            <div className="flex items-center gap-4 pt-1">
              {logoPreview ? (
                <div className="relative group">
                  <img
                    src={logoPreview}
                    alt="Classroom Logo Preview"
                    className="w-16 h-16 rounded-xl object-cover border-2 border-purple-500 shadow-md bg-[#172033]"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="absolute -top-1.5 -right-1.5 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full shadow transition-transform group-hover:scale-110"
                    title="Remove Logo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl border border-dashed border-[#334155] bg-[#172033] flex flex-col items-center justify-center text-slate-500">
                  <School className="w-6 h-6 text-purple-400/60" />
                </div>
              )}

              <div className="space-y-1.5">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoFileChange}
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Upload className="w-3.5 h-3.5" />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {logoPreview ? 'Change Custom Logo' : 'Upload Classroom Logo'}
                </Button>
                <p className="text-[11px] text-slate-500">
                  Recommended: Square aspect ratio (512x512) with transparent or dark background.
                </p>
              </div>
            </div>
          </div>

          <Input
            label="Classroom / Course Title"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Distributed Systems Capstone 2026"
            leftIcon={<School className="w-4 h-4" />}
            required
          />

          <Textarea
            label="Classroom Description & Evaluation Scope"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Explain course guidelines, milestones, and evaluation standards..."
            rows={3}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              required
            />
            <Input
              label="Submission Deadline"
              type="date"
              value={submissionDeadline}
              onChange={e => setSubmissionDeadline(e.target.value)}
              required
            />
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Submission Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSubmissionMode('Individual')}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    submissionMode === 'Individual'
                      ? 'border-purple-500 bg-purple-950/40 text-purple-300 shadow-2xs'
                      : 'border-[#243047] bg-[#0F172A] text-slate-300 hover:bg-[#172033]'
                  }`}
                >
                  Individual
                </button>
                <button
                  type="button"
                  onClick={() => setSubmissionMode('Team')}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    submissionMode === 'Team'
                      ? 'border-purple-500 bg-purple-950/40 text-purple-300 shadow-2xs'
                      : 'border-[#243047] bg-[#0F172A] text-slate-300 hover:bg-[#172033]'
                  }`}
                >
                  Team Mode
                </button>
              </div>
            </div>
          </div>

          {/* Team Size Configuration (When Submission Mode = Team) */}
          {submissionMode === 'Team' && (
            <div className="p-4 rounded-xl border border-purple-500/30 bg-[#0F172A] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                    Team Size Rules (2 to 20 Members)
                  </h4>
                </div>
                <span className="text-[11px] font-semibold text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/40">
                  {minTeamSize === maxTeamSize
                    ? `Exact Squad Size: ${minTeamSize}`
                    : `Allowed: ${minTeamSize} to ${maxTeamSize} Members`}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Minimum Team Members (Min: 2)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={2}
                      max={20}
                      value={minTeamSize}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        setMinTeamSize(val);
                        if (val > maxTeamSize) setMaxTeamSize(val);
                      }}
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                    <input
                      type="number"
                      min={2}
                      max={20}
                      value={minTeamSize}
                      onChange={e => {
                        const val = Math.max(2, Math.min(20, parseInt(e.target.value) || 2));
                        setMinTeamSize(val);
                        if (val > maxTeamSize) setMaxTeamSize(val);
                      }}
                      className="w-16 px-2 py-1 text-center font-bold text-sm bg-[#172033] border border-[#243047] rounded-lg text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Maximum Team Members (Max: 20)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={2}
                      max={20}
                      value={maxTeamSize}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        setMaxTeamSize(val);
                        if (val < minTeamSize) setMinTeamSize(val);
                      }}
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                    <input
                      type="number"
                      min={2}
                      max={20}
                      value={maxTeamSize}
                      onChange={e => {
                        const val = Math.max(2, Math.min(20, parseInt(e.target.value) || 2));
                        setMaxTeamSize(val);
                        if (val < minTeamSize) setMinTeamSize(val);
                      }}
                      className="w-16 px-2 py-1 text-center font-bold text-sm bg-[#172033] border border-[#243047] rounded-lg text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] text-slate-400 mr-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-400" /> Presets:
                </span>
                {[
                  { label: 'Pair (2)', min: 2, max: 2 },
                  { label: 'Trio (3)', min: 3, max: 3 },
                  { label: 'Standard (2–4)', min: 2, max: 4 },
                  { label: 'Strict 4', min: 4, max: 4 },
                  { label: 'Medium (4–6)', min: 4, max: 6 },
                  { label: 'Large (5–10)', min: 5, max: 10 },
                  { label: 'Enterprise (2–20)', min: 2, max: 20 },
                ].map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setMinTeamSize(p.min);
                      setMaxTeamSize(p.max);
                    }}
                    className={`px-2 py-1 text-[11px] font-medium rounded border transition-colors ${
                      minTeamSize === p.min && maxTeamSize === p.max
                        ? 'border-purple-500 bg-purple-900/40 text-purple-200'
                        : 'border-[#243047] bg-[#172033] text-slate-300 hover:bg-[#1E293B]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="p-2.5 rounded-lg bg-[#172033] border border-[#243047] flex items-start gap-2 text-[11px] text-slate-300">
                <AlertCircle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  {minTeamSize === maxTeamSize ? (
                    <span>
                      Teams must have <strong>exactly {minTeamSize} members</strong>. Incomplete teams cannot join or be approved.
                    </span>
                  ) : (
                    <span>
                      Teams with between <strong>{minTeamSize} and {maxTeamSize} members</strong> are permitted to join. Teams with fewer than {minTeamSize} or more than {maxTeamSize} members will be blocked.
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Resource Configuration Checklist */}
          <div className="space-y-3 pt-4 border-t border-[#243047]">
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Submission Resource Requirements
            </h4>
            <p className="text-xs text-slate-400">
              Select which artifacts students/teams are required to provide when submitting projects.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {resources.map((res, idx) => (
                <div
                  key={res.type}
                  onClick={() => toggleRequired(idx)}
                  className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    res.required
                      ? 'border-purple-500/50 bg-purple-950/30'
                      : 'border-[#243047] bg-[#0F172A] hover:bg-[#172033]'
                  }`}
                >
                  <span className="text-xs font-medium text-slate-200">{res.label}</span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                      res.required
                        ? 'bg-purple-600 text-white'
                        : 'bg-[#111827] text-slate-400 border border-[#243047]'
                    }`}
                  >
                    {res.required ? 'Required' : 'Optional'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-[#243047] flex items-center justify-end gap-3">
            <Link to="/classrooms">
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create Classroom & Generate Code
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
