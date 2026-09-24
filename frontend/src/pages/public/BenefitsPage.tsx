import React from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { CheckCircle2, Award, Clock, FileCheck, Shield, Users } from 'lucide-react';

export const BenefitsPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-16">
      <PageHeader
        title="Institutional & Academic Benefits"
        subtitle="Discover how Provalix AI delivers measurable time savings, eliminates grading discrepancies, and enhances student learning outcomes."
        badge={<Badge variant="primary" size="md">MEASURABLE VALUE</Badge>}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="p-6 sm:p-8 space-y-6 border-[#243047]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/20 border border-[#7C3AED]/30 text-[#A78BFA] flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#F8FAFC]">Massive Velocity Acceleration</h3>
          </div>
          <p className="text-sm text-[#CBD5E1] leading-relaxed">
            Faculty review times plunge by up to 70%. Routine code formatting, dependency auditing, and plagiarism screening are completely offloaded to the automated engine.
          </p>
          <ul className="space-y-2.5 text-xs text-[#CBD5E1]">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Instantaneous preliminary score calculation upon upload</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Automated cross-check of report claims against actual code</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Pre-generated viva questions tailored to project architecture</span>
            </li>
          </ul>
        </Card>

        <Card className="p-6 sm:p-8 space-y-6 border-[#243047]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/20 border border-[#7C3AED]/30 text-[#A78BFA] flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#F8FAFC]">Elimination of Grading Variance</h3>
          </div>
          <p className="text-sm text-[#CBD5E1] leading-relaxed">
            Standardized ABET and NAAC aligned evaluation rubrics ensure student projects are judged against objective engineering standards, not individual evaluator temperament.
          </p>
          <ul className="space-y-2.5 text-xs text-[#CBD5E1]">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Universal 7-criteria matrix for technical analysis</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Balanced 50-mark AI + 50-mark Faculty defense split</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Transparent audit logs for accreditation review panels</span>
            </li>
          </ul>
        </Card>
      </div>

      <div className="text-center pt-4">
        <Link to="/register">
          <Button variant="primary" size="lg">
            Start Evaluating with Provalix AI
          </Button>
        </Link>
      </div>
    </div>
  );
};
