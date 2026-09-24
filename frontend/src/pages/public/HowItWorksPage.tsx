import React from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { ArrowRight, UploadCloud, Cpu, ShieldCheck, CheckCircle2, Award } from 'lucide-react';

export const HowItWorksPage: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Submit Artifacts & Metadata',
      desc: 'Students or team captains submit project documentation, Git repository links, architecture diagrams, datasets, and presentation decks directly through the submission portal.',
      icon: UploadCloud,
    },
    {
      num: '02',
      title: 'Automated Multi-Pass Analysis',
      desc: 'Provalix AI runs static code analysis, validates dependencies, calculates test coverage ratios, and checks document structure against objective criteria.',
      icon: Cpu,
    },
    {
      num: '03',
      title: 'Dual Plagiarism Screening',
      desc: 'The platform concurrently analyzes source code similarity and manuscript text against institutional archives and public web sources.',
      icon: ShieldCheck,
    },
    {
      num: '04',
      title: 'Faculty Oral Defense & Viva',
      desc: 'Assigned evaluators review automated insights, evaluate slide presentations, and conduct structured 5-question viva examinations.',
      icon: CheckCircle2,
    },
    {
      num: '05',
      title: 'Verification & Leaderboard Publication',
      desc: 'The classroom owner audits the unified 100-mark evaluation, verifies marks, and publishes final standings with private student improvement plans.',
      icon: Award,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-16">
      <PageHeader
        title="How Provalix AI Works"
        subtitle="A step-by-step walkthrough of the automated evaluation lifecycle from initial repository submission to published results."
        badge={<Badge variant="primary" size="md">EVALUATION LIFECYCLE</Badge>}
      />

      <div className="space-y-6">
        {steps.map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.num} className="p-6 sm:p-8 flex flex-col sm:flex-row items-start gap-6 border-[#243047] hoverable">
              <div className="w-14 h-14 rounded-2xl bg-[#7C3AED]/20 border border-[#7C3AED]/30 text-[#A78BFA] font-black text-xl flex items-center justify-center shrink-0">
                {s.num}
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-[#F8FAFC]">{s.title}</h3>
                  <Icon className="w-5 h-5 text-[#7C3AED]" />
                </div>
                <p className="text-sm text-[#CBD5E1] leading-relaxed">{s.desc}</p>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="text-center pt-4">
        <Link to="/register">
          <Button variant="primary" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
            Start Your First Evaluation
          </Button>
        </Link>
      </div>
    </div>
  );
};
