import React from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { ShieldCheck, Target, Award, Users } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      <PageHeader
        title="About Provalix AI"
        subtitle="Transforming student project assessments with intelligent, deterministic evaluation systems and qualitative defense tools."
        badge={<Badge variant="primary" size="md">OUR MISSION</Badge>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div className="space-y-4 text-brand-slate text-sm sm:text-base leading-relaxed">
          <p>
            Provalix AI was founded to address one of higher education’s greatest bottlenecks: evaluating student engineering projects fairly, thoroughly, and consistently.
          </p>
          <p>
            As software systems expand into deep learning, distributed ledgers, and edge microservices, traditional single-faculty code reviews cannot keep pace. Evaluators are forced to skim massive source repositories and hundred-page thesis reports, leaving students with opaque letter grades and zero growth feedback.
          </p>
          <p>
            Provalix AI automates the tedious mechanical evaluation tasks—static analysis, architecture validation, documentation completeness, and plagiarism screening—while providing structured viva assessment frameworks for evaluators to conduct thorough defenses.
          </p>
        </div>

        <Card className="p-6 sm:p-8 space-y-6 border-[#243047]">
          <h3 className="text-lg font-bold text-[#F8FAFC]">Our Guiding Principles</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/20 border border-[#7C3AED]/30 flex items-center justify-center text-[#A78BFA] shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#F8FAFC]">Deterministic Objectivity</h4>
                <p className="text-xs text-[#CBD5E1] mt-0.5">Scoring rubrics are transparent, auditable, and free from subjective grading variance.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/20 border border-[#7C3AED]/30 flex items-center justify-center text-[#A78BFA] shrink-0">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#F8FAFC]">Actionable Student Growth</h4>
                <p className="text-xs text-[#CBD5E1] mt-0.5">Every evaluation generates a concrete improvement plan to accelerate technical maturity.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-[#0F172A] border border-[#243047] flex items-center justify-center text-[#94A3B8] shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#F8FAFC]">Contextual Collaboration</h4>
                <p className="text-xs text-[#CBD5E1] mt-0.5">Flexible roles that adapt per classroom without bureaucratic administrative lockouts.</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="pt-8 border-t border-[#1E293B] flex items-center justify-between flex-wrap gap-4">
        <div>
          <h4 className="text-base font-bold text-[#F8FAFC]">Ready to experience Provalix AI?</h4>
          <p className="text-xs text-[#94A3B8]">Try out a standalone project evaluation in minutes.</p>
        </div>
        <Link to="/register">
          <Button variant="primary">Get Started</Button>
        </Link>
      </div>
    </div>
  );
};
