import React from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { Sparkles, ClipboardCheck, CheckCheck, ArrowRight, ShieldCheck, FileText } from 'lucide-react';

export const SolutionPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-16">
      <PageHeader
        title="The Provalix AI Solution"
        subtitle="Two dedicated evaluation models engineered to serve both independent student research and institutional classroom cohorts."
        badge={<Badge variant="primary" size="md">ARCHITECTURE & METHODOLOGY</Badge>}
      />

      {/* Two Core Evaluation Engines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Model 1: Standalone Project Checker */}
        <Card className="p-6 sm:p-8 space-y-5 border-t-4 border-t-[#7C3AED]">
          <div className="flex items-center justify-between">
            <Badge variant="ai" size="md" icon={<Sparkles className="w-3.5 h-3.5" />}>
              MODEL 1: INDEPENDENT CHECKER
            </Badge>
            <span className="text-xs font-bold text-[#94A3B8] uppercase">100 MARKS TOTAL</span>
          </div>

          <h3 className="text-xl font-bold text-[#F8FAFC]">Standalone AI Project Checker</h3>
          <p className="text-sm text-[#CBD5E1] leading-relaxed">
            Designed for students and independent researchers looking to benchmark and refine projects before formal university submission.
          </p>

          <div className="space-y-2.5 pt-2">
            <div className="flex justify-between text-xs py-1.5 border-b border-[#1E293B]">
              <span className="text-[#CBD5E1] font-medium">Problem Definition & Scope</span>
              <span className="font-bold text-[#F8FAFC]">15 Marks</span>
            </div>
            <div className="flex justify-between text-xs py-1.5 border-b border-[#1E293B]">
              <span className="text-[#CBD5E1] font-medium">Innovation & Novelty</span>
              <span className="font-bold text-[#F8FAFC]">20 Marks</span>
            </div>
            <div className="flex justify-between text-xs py-1.5 border-b border-[#1E293B]">
              <span className="text-[#CBD5E1] font-medium">Technical Implementation</span>
              <span className="font-bold text-[#F8FAFC]">20 Marks</span>
            </div>
            <div className="flex justify-between text-xs py-1.5 border-b border-[#1E293B]">
              <span className="text-[#CBD5E1] font-medium">System Functionality & Testing</span>
              <span className="font-bold text-[#F8FAFC]">15 Marks</span>
            </div>
            <div className="flex justify-between text-xs py-1.5 border-b border-[#1E293B]">
              <span className="text-[#CBD5E1] font-medium">Code Quality & Architecture</span>
              <span className="font-bold text-[#F8FAFC]">10 Marks</span>
            </div>
            <div className="flex justify-between text-xs py-1.5 border-b border-[#1E293B]">
              <span className="text-[#CBD5E1] font-medium">Documentation & Schemas</span>
              <span className="font-bold text-[#F8FAFC]">10 Marks</span>
            </div>
            <div className="flex justify-between text-xs py-1.5 border-b border-[#1E293B]">
              <span className="text-[#CBD5E1] font-medium">Overall Project Maturity</span>
              <span className="font-bold text-[#F8FAFC]">10 Marks</span>
            </div>
          </div>

          <div className="p-3.5 bg-[#0F172A] border border-[#243047] rounded-xl text-xs text-[#94A3B8]">
            <strong className="text-[#F8FAFC] font-semibold">Strict Separation:</strong> Standalone Project Reports do NOT include classroom grades, viva scoring, faculty comments, or classroom ranking.
          </div>
        </Card>

        {/* Model 2: Classroom Evaluation Framework */}
        <Card className="p-6 sm:p-8 space-y-5 border-t-4 border-t-[#7C3AED]">
          <div className="flex items-center justify-between">
            <Badge variant="primary" size="md" icon={<ClipboardCheck className="w-3.5 h-3.5" />}>
              MODEL 2: CLASSROOM COHORT
            </Badge>
            <span className="text-xs font-bold text-[#94A3B8] uppercase">50 + 50 = 100 MARKS</span>
          </div>

          <h3 className="text-xl font-bold text-[#F8FAFC]">Institutional Classroom Evaluation</h3>
          <p className="text-sm text-[#CBD5E1] leading-relaxed">
            A balanced hybrid framework combining automated AI technical analysis with qualitative faculty presentation defense and viva interrogation.
          </p>

          <div className="space-y-4 pt-2">
            {/* Component A */}
            <div className="p-4 bg-[#7C3AED]/10 rounded-xl border border-[#7C3AED]/30 space-y-2">
              <div className="flex justify-between text-xs font-bold text-[#A78BFA]">
                <span>Component A: Final AI Evaluation</span>
                <span>/ 50 Marks</span>
              </div>
              <p className="text-xs text-[#CBD5E1] leading-relaxed">
                Scaled technical assessment. Plagiarism is NOT a separate mark category; high similarity incurs a configurable point deduction inside the 50-mark AI boundary.
              </p>
            </div>

            {/* Component B */}
            <div className="p-4 bg-[#0F172A] rounded-xl border border-[#243047] space-y-2">
              <div className="flex justify-between text-xs font-bold text-[#F8FAFC]">
                <span>Component B: Faculty / Coordinator Evaluation</span>
                <span>/ 50 Marks</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-[#CBD5E1] pt-1">
                <div className="p-2 bg-[#111827] rounded-lg border border-[#243047]">
                  <span className="block font-bold text-[#F8FAFC]">PPT & Demo</span>
                  <span>25 Marks</span>
                </div>
                <div className="p-2 bg-[#111827] rounded-lg border border-[#243047]">
                  <span className="block font-bold text-[#F8FAFC]">Viva Defense</span>
                  <span>5 Qs × 5 Marks = 25</span>
                </div>
              </div>
            </div>

            {/* Component C: Verification */}
            <div className="p-3.5 bg-[#0F172A] border border-[#243047] rounded-xl text-xs text-[#94A3B8] flex items-start gap-2">
              <CheckCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#F8FAFC] font-semibold">Verification Gate:</strong> Classroom Owner/Admin conducts final review with mandatory justification if returning a submission.
              </span>
            </div>
          </div>
        </Card>
      </div>

      <div className="text-center pt-6">
        <Link to="/register">
          <Button variant="primary" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
            Start Evaluating Projects Now
          </Button>
        </Link>
      </div>
    </div>
  );
};
