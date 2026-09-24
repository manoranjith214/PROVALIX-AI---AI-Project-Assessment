import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import { teamService } from '../../services/teamService';
import { Users, ArrowLeft, Plus, Upload, X, Image as ImageIcon, Check } from 'lucide-react';

export const CreateTeamPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [maxSize, setMaxSize] = useState(4);
  const [isLoading, setIsLoading] = useState(false);

  // Validate and handle file upload
  const handleLogoSelect = (file: File) => {
    // Validate image MIME type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      error('Invalid file type. Please upload a PNG, JPG, WEBP, or GIF image.');
      return;
    }

    // Validate size (max 5MB)
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      error('Image size exceeds 5MB limit. Please choose a smaller image.');
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleLogoSelect(e.target.files[0]);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSizeChange = (val: number) => {
    if (isNaN(val)) return;
    const clamped = Math.min(20, Math.max(2, val));
    setMaxSize(clamped);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      error('Please enter a valid team name.');
      return;
    }

    if (maxSize < 2 || maxSize > 20) {
      error('Team Max Size must be between 2 and 20.');
      return;
    }

    setIsLoading(true);
    try {
      let finalLogoUrl: string | undefined = undefined;

      // If user selected a custom logo file, upload it
      if (logoFile) {
        try {
          finalLogoUrl = await teamService.uploadLogo(logoFile);
        } catch {
          finalLogoUrl = logoPreview;
        }
      }

      const created = await teamService.createTeam(name.trim(), finalLogoUrl, maxSize);
      success(`Team "${created.name}" created successfully with code ${created.code}!`);
      navigate(`/teams/${created.id}`);
    } catch (err: any) {
      error(err?.message || 'Failed to create team. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const sizePresets = [2, 4, 6, 8, 10, 15, 20];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Create New Team"
        subtitle="Form a reusable project squad. A unique Team Code will be automatically generated."
        breadcrumbs={
          <Link to="/teams" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Teams
          </Link>
        }
      />

      <Card className="p-6 sm:p-8 shadow-subtle border-[#243047]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Team Name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Apex Quantum Dynamics"
            leftIcon={<Users className="w-4 h-4" />}
            required
          />

          {/* TEAM LOGO UPLOAD */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Team Logo
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-[#0F172A] border border-[#243047]">
              {/* Logo Preview or Placeholder */}
              <div className="relative w-20 h-20 rounded-2xl bg-[#111827] border border-[#243047] flex items-center justify-center overflow-hidden shrink-0 group">
                {logoPreview ? (
                  <>
                    <img src={logoPreview} alt="Team Logo Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"
                      title="Remove Logo"
                    >
                      <X className="w-5 h-5 text-red-400" />
                    </button>
                  </>
                ) : (
                  <div className="text-center p-2 text-slate-500 flex flex-col items-center">
                    <ImageIcon className="w-6 h-6 mb-1 text-slate-600" />
                    <span className="text-[10px] font-mono">No Logo</span>
                  </div>
                )}
              </div>

              {/* Upload Action */}
              <div className="flex-1 space-y-2 text-center sm:text-left">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleFileChange}
                  className="hidden"
                  id="team-logo-upload"
                />
                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    leftIcon={<Upload className="w-4 h-4 text-purple-400" />}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {logoPreview ? 'Change Logo' : 'Upload Team Logo'}
                  </Button>
                  {logoPreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-error hover:bg-error/10"
                      onClick={handleRemoveLogo}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  PNG, JPG, or WEBP up to 5MB. Custom logo will represent your squad across all classrooms and cards.
                </p>
              </div>
            </div>
          </div>

          {/* MAXIMUM TEAM SIZE (2 to 20) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Maximum Team Size (2 - 20)
              </label>
              <span className="font-mono text-xs font-bold bg-[#0F172A] text-purple-300 px-2 py-0.5 rounded border border-[#243047]">
                Required for Classroom Approval: {maxSize} Members
              </span>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-3">
              {sizePresets.map(sz => (
                <button
                  type="button"
                  key={sz}
                  onClick={() => setMaxSize(sz)}
                  className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                    maxSize === sz
                      ? 'border-purple-500 bg-purple-950/40 text-purple-300 shadow-2xs'
                      : 'border-[#243047] bg-[#0F172A] text-slate-300 hover:bg-[#172033]'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>

            {/* Custom slider and direct input */}
            <div className="p-3 bg-[#0F172A] rounded-xl border border-[#243047] flex items-center gap-4">
              <input
                type="range"
                min="2"
                max="20"
                value={maxSize}
                onChange={e => handleSizeChange(parseInt(e.target.value, 10))}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <div className="flex items-center gap-1 shrink-0">
                <input
                  type="number"
                  min="2"
                  max="20"
                  value={maxSize}
                  onChange={e => handleSizeChange(parseInt(e.target.value, 10))}
                  className="w-14 px-2 py-1 text-xs text-center font-mono font-bold bg-[#111827] text-purple-300 border border-[#243047] rounded-lg focus:outline-hidden focus:border-purple-500"
                />
                <span className="text-xs text-slate-400">members</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-2">
              Teams can request classroom entry when partially filled, but Classroom Admin can only approve once exactly {maxSize}/{maxSize} members have enrolled.
            </p>
          </div>

          <div className="pt-4 border-t border-[#243047] flex items-center justify-end gap-3">
            <Link to="/teams">
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
              Create Team & Generate Code
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
