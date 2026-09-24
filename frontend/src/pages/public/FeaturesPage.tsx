import React from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { 
  Sparkles, 
  ShieldCheck, 
  FileText, 
  Users, 
  School, 
  ClipboardCheck, 
  HelpCircle, 
  CheckCheck, 
  BarChart3, 
  TrendingUp, 
  Bell, 
  Bot 
} from 'lucide-react';

export const FeaturesPage: React.FC = () => {
  const features = [
    {
      icon: Sparkles,
      color: 'text-[#A78BFA]',
      title: 'AI Project Evaluation',
      desc: 'Deterministic rubric engine assessing problem formulation, architectural elegance, code cleanliness, test coverage, and documentation depth.',
    },
    {
      icon: ShieldCheck,
      color: 'text-[#7C3AED]',
      title: 'Plagiarism Detection',
      desc: 'Dual-phase scanning analyzing both compiled/interpreted source syntax patterns and academic manuscript text similarity against online corpora.',
    },
    {
      icon: FileText,
      color: 'text-[#94A3B8]',
      title: 'Project Reports',
      desc: 'Clean standalone documentation reports highlighting key strengths, pinpointing vulnerabilities, and offering downloadable PDF summaries.',
    },
    {
      icon: Users,
      color: 'text-[#7C3AED]',
      title: 'Team Management',
      desc: 'Create and collaborate within project teams. Send invitations via Permanent User IDs (PRV-XXXXX), transfer captain privileges, and manage roster sizes.',
    },
    {
      icon: School,
      color: 'text-[#94A3B8]',
      title: 'Classroom Management',
      desc: 'Launch academic cohorts supporting both team-based capstones and individual laboratory assignments with customizable resource requirements.',
    },
    {
      icon: ClipboardCheck,
      color: 'text-[#7C3AED]',
      title: 'Faculty Evaluation',
      desc: 'Standardized grading portal for coordinators and evaluators to record presentation slides, live system demonstrations, and defense notes.',
    },
    {
      icon: HelpCircle,
      color: 'text-[#94A3B8]',
      title: 'Viva Assessment',
      desc: 'Structured oral examination interface featuring 5 predefined domain questions (0–5 marks each) with required evaluator commentary.',
    },
    {
      icon: CheckCheck,
      color: 'text-emerald-400',
      title: 'Verification Workflow',
      desc: 'Classroom owner moderation gate to audit calculated scores, verify rubric alignment, and either approve grades or return with revision notes.',
    },
    {
      icon: BarChart3,
      color: 'text-[#7C3AED]',
      title: 'Classroom Leaderboard',
      desc: 'Official ranking podium celebrating top-performing submissions while preserving student privacy by hiding detailed feedback from peers.',
    },
    {
      icon: TrendingUp,
      color: 'text-[#A78BFA]',
      title: 'Actionable Improvement Plans',
      desc: 'Every evaluated submission generates priority-ranked recommendations spanning high, medium, and low urgency enhancements.',
    },
    {
      icon: Bell,
      color: 'text-[#94A3B8]',
      title: 'Notification System',
      desc: 'Timely in-app alerts for team invitations, classroom deadlines, completed evaluations, and verification approvals.',
    },
    {
      icon: Bot,
      color: 'text-[#A78BFA]',
      title: 'AI Assistant',
      desc: 'Contextually aware conversational copilot present on every screen to answer questions regarding grading rubrics and defense preparations.',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      <PageHeader
        title="Comprehensive Platform Features"
        subtitle="Explore the complete suite of capabilities built for modern academic and hackathon project evaluations."
        badge={<Badge variant="primary" size="md">FULL CAPABILITIES</Badge>}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map(f => {
          const Icon = f.icon;
          return (
            <Card key={f.title} className="p-6 space-y-3.5 hoverable border-[#243047]">
              <div className="w-11 h-11 rounded-xl bg-[#0F172A] border border-[#243047] flex items-center justify-center">
                <Icon className={`w-5 h-5 ${f.color}`} />
              </div>
              <h3 className="text-base font-bold text-[#F8FAFC]">{f.title}</h3>
              <p className="text-xs text-[#CBD5E1] leading-relaxed">{f.desc}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
