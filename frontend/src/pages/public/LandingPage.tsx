import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { 
  Sparkles, 
  ShieldCheck, 
  ClipboardCheck, 
  FileText, 
  Users, 
  School, 
  BarChart3, 
  CheckCircle2, 
  ArrowRight, 
  Layers, 
  Clock, 
  FileWarning, 
  TrendingUp, 
  HelpCircle, 
  CheckCheck, 
  ShieldAlert,
  Bot
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="space-y-24 sm:space-y-32 py-8 sm:py-16">
      {/* 1. HERO SECTION */}
      <section id="hero" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column - Copy */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex">
              <Badge variant="primary" size="md" icon={<Sparkles className="w-3.5 h-3.5" />}>
                AI-POWERED PROJECT EVALUATION
              </Badge>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-5xl font-extrabold text-brand-dark tracking-tight leading-[1.15]">
              From Project Submission to{' '}
              <span className="text-primary underline decoration-primary-light decoration-4 underline-offset-4">
                Intelligent Evaluation
              </span>
            </h1>

            <p className="text-base sm:text-lg text-brand-slate leading-relaxed">
              Provalix AI helps institutions evaluate student projects with AI-powered analysis, plagiarism detection, structured assessment, and actionable feedback.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link to="/register">
                <Button variant="primary" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Start Evaluating
                </Button>
              </Link>
              <Link to="/solution">
                <Button variant="outline" size="lg">
                  Explore Platform
                </Button>
              </Link>
            </div>

            {/* Quick trust metrics */}
            <div className="pt-4 flex items-center gap-6 text-xs text-slate-400 border-t border-[#243047]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                <span>Standardized Rubrics</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                <span>Multi-Modal Plagiarism</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                <span>Viva & PPT Defense</span>
              </div>
            </div>
          </div>

          {/* Right Column - Product Dashboard Preview */}
          <div className="lg:col-span-6">
            <div className="relative mx-auto max-w-lg lg:max-w-none">
              {/* Subtle background glow */}
              <div className="absolute -inset-1 bg-gradient-to-r from-[#7C3AED]/20 to-[#6D28D9]/20 rounded-3xl blur-xl opacity-60" />

              <Card className="relative p-6 sm:p-7 border-[#243047] shadow-2xl bg-[#111827]">
                {/* Header bar */}
                <div className="flex items-center justify-between pb-5 border-b border-[#1E293B] mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                    <img src="/provalix-icon.png" alt="Provalix AI" className="w-4 h-4 object-contain ml-2" />
                    <span className="text-xs font-semibold text-[#94A3B8]">
                      Provalix Evaluation Cockpit
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    Production Engine
                  </span>
                </div>

                {/* Dashboard preview metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                  <div className="bg-[#0F172A] p-3 rounded-xl border border-[#243047]">
                    <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider block">Total Projects</span>
                    <span className="text-xl font-bold text-[#F8FAFC]">428</span>
                  </div>
                  <div className="bg-[#0F172A] p-3 rounded-xl border border-[#243047]">
                    <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider block">AI Evaluations</span>
                    <span className="text-xl font-bold text-[#A78BFA]">1,290</span>
                  </div>
                  <div className="bg-[#0F172A] p-3 rounded-xl border border-[#243047]">
                    <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider block">Classrooms</span>
                    <span className="text-xl font-bold text-[#F8FAFC]">18</span>
                  </div>
                  <div className="bg-[#0F172A] p-3 rounded-xl border border-[#243047]">
                    <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider block">Active Teams</span>
                    <span className="text-xl font-bold text-[#F8FAFC]">94</span>
                  </div>
                  <div className="bg-[#0F172A] p-3 rounded-xl border border-[#243047]">
                    <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider block">Avg AI Score</span>
                    <span className="text-xl font-bold text-[#7C3AED]">92<span className="text-xs text-[#94A3B8] font-normal">/100</span></span>
                  </div>
                  <div className="bg-[#0F172A] p-3 rounded-xl border border-[#243047]">
                    <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider block">Eval Progress</span>
                    <span className="text-xl font-bold text-emerald-400">88%</span>
                  </div>
                </div>

                {/* Live project sample preview card */}
                <div className="p-4 rounded-xl border border-[#7C3AED]/30 bg-[#7C3AED]/10 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#F8FAFC]">Real-Time Multimodal Vision Pipeline</span>
                      <Badge variant="primary" size="sm">Score: 92/100</Badge>
                    </div>
                    <p className="text-[11px] text-[#94A3B8]">
                      Plagiarism: 4% Code • 6% Report • Status: Verified
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full border-2 border-[#7C3AED] flex items-center justify-center font-bold text-[#A78BFA] text-xs shrink-0 bg-[#7C3AED]/20">
                    92%
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#1E293B] flex items-center justify-between text-[11px] text-[#94A3B8]">
                  <span>Evaluation Platform Engine</span>
                  <span className="text-[#A78BFA] font-medium">All systems operational</span>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* 2. TRUSTED / CAPABILITY STRIP */}
      <section className="bg-[#0F172A] border-y border-[#1E293B] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-[#94A3B8] mb-6">
            Institutional Standards & Enterprise Review Architecture
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-3">
              <span className="text-lg font-bold text-[#F8FAFC] block">ABET & NAAC</span>
              <span className="text-xs text-[#94A3B8]">Accreditation Rubrics</span>
            </div>
            <div className="p-3">
              <span className="text-lg font-bold text-[#A78BFA] block">Zero Hallucination</span>
              <span className="text-xs text-[#94A3B8]">Deterministic AI Criteria</span>
            </div>
            <div className="p-3">
              <span className="text-lg font-bold text-[#7C3AED] block">Multi-Modal Scan</span>
              <span className="text-xs text-[#94A3B8]">Code, PDFs & Slides</span>
            </div>
            <div className="p-3">
              <span className="text-lg font-bold text-[#F8FAFC] block">Role Isolation</span>
              <span className="text-xs text-[#94A3B8]">Contextual Permissions</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. ABOUT PROVALIX AI */}
      <section id="about" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <Badge variant="slate" size="md">ABOUT THE PLATFORM</Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[#F8FAFC] tracking-tight">
            Designed for Rigorous Academic & Technical Evaluation
          </h2>
          <p className="text-base text-[#CBD5E1] leading-relaxed">
            Provalix AI eliminates the guesswork and friction in project reviews. Built specifically for universities, hackathons, and technical panels, it bridges automated code assessment with faculty qualitative defenses.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="p-6 sm:p-8 space-y-4 hoverable">
            <div className="w-12 h-12 rounded-xl bg-[#0F172A] border border-[#243047] flex items-center justify-center text-[#94A3B8]">
              <School className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#F8FAFC]">For Universities & Colleges</h3>
            <p className="text-sm text-[#CBD5E1] leading-relaxed">
              Standardize grading rubrics across departments, archive verifiable submissions, and generate departmental outcome analytics effortlessly.
            </p>
          </Card>

          <Card className="p-6 sm:p-8 space-y-4 hoverable">
            <div className="w-12 h-12 rounded-xl bg-[#7C3AED]/20 border border-[#7C3AED]/30 flex items-center justify-center text-[#A78BFA]">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#F8FAFC]">For Faculty & Evaluators</h3>
            <p className="text-sm text-[#CBD5E1] leading-relaxed">
              Cut review time by 75% with automated preliminary code quality checks, viva prompt generation, and instant plagiarism alerts.
            </p>
          </Card>

          <Card className="p-6 sm:p-8 space-y-4 hoverable">
            <div className="w-12 h-12 rounded-xl bg-[#7C3AED]/20 border border-[#7C3AED]/30 flex items-center justify-center text-[#A78BFA]">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#F8FAFC]">For Students & Teams</h3>
            <p className="text-sm text-[#CBD5E1] leading-relaxed">
              Receive comprehensive, actionable feedback with specific code-level improvement plans before final semester presentation defense.
            </p>
          </Card>
        </div>
      </section>

      {/* 4. THE PROBLEM SECTION */}
      <section className="bg-[#0F172A] border-y border-[#1E293B] py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <Badge variant="amber" size="md">CHALLENGES IN ACADEMIC EVALUATION</Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#F8FAFC] tracking-tight">
              Why Traditional Project Evaluation Fails
            </h2>
            <p className="text-base text-[#CBD5E1]">
              Faculty and institutions face systematic challenges that degrade educational outcomes and overburden evaluators.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#0F172A] border border-[#243047] flex items-center justify-center text-[#94A3B8]">
                <Clock className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-[#F8FAFC]">Manual evaluation takes time</h4>
              <p className="text-sm text-[#CBD5E1] leading-relaxed">
                Manually inspecting hundreds of thousands of lines of code across tens of teams leads to severe review fatigue and delayed grade publication.
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#0F172A] border border-[#243047] flex items-center justify-center text-[#94A3B8]">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-[#F8FAFC]">Evaluation consistency can vary</h4>
              <p className="text-sm text-[#CBD5E1] leading-relaxed">
                Different evaluators apply subjective grading metrics, resulting in discrepancies between student sections and grievance disputes.
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#0F172A] border border-[#243047] flex items-center justify-center text-[#94A3B8]">
                <FileWarning className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-[#F8FAFC]">Large submissions are difficult to review</h4>
              <p className="text-sm text-[#CBD5E1] leading-relaxed">
                Reviewing full-stack codebases, machine learning models, and 100-page thesis PDFs concurrently exceeds traditional evaluators' bandwidth.
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#0F172A] border border-[#243047] flex items-center justify-center text-[#94A3B8]">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-[#F8FAFC]">Plagiarism checking is often separate</h4>
              <p className="text-sm text-[#CBD5E1] leading-relaxed">
                Stand-alone plagiarism tools only check reports, missing borrowed GitHub repositories and uncredited online boilerplate code.
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#0F172A] border border-[#243047] flex items-center justify-center text-[#94A3B8]">
                <HelpCircle className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-[#F8FAFC]">Students receive limited feedback</h4>
              <p className="text-sm text-[#CBD5E1] leading-relaxed">
                Students often only receive a numeric grade without actionable insights on architectural flaws, security gaps, or testing deficits.
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#0F172A] border border-[#243047] flex items-center justify-center text-[#94A3B8]">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-[#F8FAFC]">Evaluation records become fragmented</h4>
              <p className="text-sm text-[#CBD5E1] leading-relaxed">
                Spreadsheets, email attachments, and paper viva rubrics become scattered, creating compliance nightmares during accreditation audits.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* 5. THE SOLUTION / WORKFLOW SECTION */}
      <section id="solution" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <Badge variant="primary" size="md">END-TO-END SAAS PIPELINE</Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[#F8FAFC] tracking-tight">
            The Provalix Unified Evaluation Pipeline
          </h2>
          <p className="text-base text-[#CBD5E1]">
            A structured sequence linking automated multi-criteria AI verification with authenticated faculty defense.
          </p>
        </div>

        {/* Desktop Horizontal Workflow & Mobile Vertical */}
        <div className="hidden lg:grid grid-cols-8 gap-2 items-stretch">
          {[
            { step: '1', title: 'Project Submission', desc: 'Code & Reports' },
            { step: '2', title: 'Resource Analysis', desc: 'Multi-modal Parsing' },
            { step: '3', title: 'Plagiarism Detection', desc: 'Code & Report' },
            { step: '4', title: 'AI Evaluation', desc: 'Deterministic /50' },
            { step: '5', title: 'Faculty Viva', desc: 'Defense & PPT /50' },
            { step: '6', title: 'Verification', desc: 'Admin Approval' },
            { step: '7', title: 'Final Results', desc: 'Secure Leaderboard' },
            { step: '8', title: 'Improvement Plan', desc: 'Actionable Steps' },
          ].map((item) => (
            <div key={item.step} className="relative flex flex-col">
              <Card className="p-3 text-center h-full flex flex-col justify-between border-[#243047]">
                <div className="w-7 h-7 rounded-full bg-[#7C3AED] text-white text-xs font-bold mx-auto flex items-center justify-center mb-2">
                  {item.step}
                </div>
                <div>
                  <h5 className="text-xs font-bold text-[#F8FAFC] leading-snug">{item.title}</h5>
                  <p className="text-[10px] text-[#94A3B8] mt-1">{item.desc}</p>
                </div>
              </Card>
            </div>
          ))}
        </div>

        {/* Mobile Vertical Workflow */}
        <div className="lg:hidden space-y-3">
          {[
            { step: '1', title: 'Project Submission', desc: 'Upload code repositories, technical reports, presentation decks, and datasets.' },
            { step: '2', title: 'Resource Analysis', desc: 'Automated artifact ingestion, linting, dependency analysis, and document validation.' },
            { step: '3', title: 'Plagiarism Detection', desc: 'Parallel cross-referencing against internal institutional repositories and web sources.' },
            { step: '4', title: 'AI Evaluation', desc: 'Deterministic scoring across 7 objective criteria, providing balanced /50 initial score.' },
            { step: '5', title: 'Faculty Viva', desc: 'Structured 5-question defense rubric and PPT evaluation contributing /50 faculty marks.' },
            { step: '6', title: 'Verification', desc: 'Classroom owner review to inspect score anomalies, approve, or return with remarks.' },
            { step: '7', title: 'Final Results', desc: 'Publication to classroom leaderboard with private student grade breakdowns.' },
            { step: '8', title: 'Improvement Plan', desc: 'Comprehensive actionable recommendations prioritizing high-impact enhancements.' },
          ].map(item => (
            <div key={item.step} className="flex items-start gap-3 p-4 bg-[#111827] rounded-xl border border-[#243047]">
              <div className="w-7 h-7 rounded-full bg-[#7C3AED] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {item.step}
              </div>
              <div>
                <h5 className="text-sm font-bold text-[#F8FAFC]">{item.title}</h5>
                <p className="text-xs text-[#94A3B8] mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. CORE FEATURES GRID */}
      <section id="features" className="bg-[#0F172A] border-y border-[#1E293B] py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <Badge variant="slate" size="md">COMPREHENSIVE CAPABILITIES</Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#F8FAFC] tracking-tight">
              Twelve Built-in Capabilities for Enterprise Evaluation
            </h2>
            <p className="text-base text-[#CBD5E1]">
              Engineered to meet all evaluation requirements out of the box with zero third-party dependencies required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Sparkles, color: 'text-[#A78BFA]', title: 'AI Project Evaluation', desc: 'Objective multi-criteria evaluation analyzing problem statement, innovation, code, and documentation.' },
              { icon: ShieldCheck, color: 'text-[#7C3AED]', title: 'Plagiarism Detection', desc: 'Dual-pass analysis assessing source code syntax and technical PDF report similarity.' },
              { icon: FileText, color: 'text-[#94A3B8]', title: 'Project Reports', desc: 'Standalone evaluation reports with detailed strengths, weaknesses, and downloadable PDF summaries.' },
              { icon: Users, color: 'text-[#7C3AED]', title: 'Team Management', desc: 'Collaborative team spaces with permanent user ID invitations, captain transfer, and size limits.' },
              { icon: School, color: 'text-[#94A3B8]', title: 'Classroom Management', desc: 'Contextual classroom environments supporting both individual and team submission cohorts.' },
              { icon: ClipboardCheck, color: 'text-[#7C3AED]', title: 'Faculty Evaluation', desc: 'Integrated faculty portal for PPT presentations, live demonstrations, and rubric notes.' },
              { icon: HelpCircle, color: 'text-[#94A3B8]', title: 'Viva Assessment', desc: 'Predefined 5-question structured oral defense with 0–5 marks per question and notes.' },
              { icon: CheckCheck, color: 'text-emerald-400', title: 'Verification Workflow', desc: 'Classroom owner review gate allowing approval or mandatory revision returns.' },
              { icon: BarChart3, color: 'text-[#7C3AED]', title: 'Classroom Leaderboard', desc: 'Podium ranking with strict privacy preservation preventing grade exposure to peers.' },
              { icon: TrendingUp, color: 'text-[#A78BFA]', title: 'Actionable Improvement Plans', desc: 'Categorized priority recommendations spanning technical, code, and documentation enhancements.' },
              { icon: CheckCircle2, color: 'text-[#94A3B8]', title: 'Real-time Notifications', desc: 'Audited alert system keeping students and coordinators informed of milestones and reviews.' },
              { icon: Bot, color: 'text-[#A78BFA]', title: 'AI Assistant', desc: 'Context-aware conversational copilot available on every page to explain rubrics and scores.' },
            ].map(f => {
              const Icon = f.icon;
              return (
                <Card key={f.title} className="p-6 hoverable space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0F172A] border border-[#243047] flex items-center justify-center">
                    <Icon className={`w-5 h-5 ${f.color}`} />
                  </div>
                  <h4 className="text-base font-bold text-[#F8FAFC]">{f.title}</h4>
                  <p className="text-xs text-[#CBD5E1] leading-relaxed">{f.desc}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. BENEFITS SECTION */}
      <section id="benefits" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <Badge variant="primary" size="md">IMPACT & METRICS</Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[#F8FAFC] tracking-tight">
            Tangible Benefits for All Academic Stakeholders
          </h2>
          <p className="text-base text-[#CBD5E1]">
            Proven enhancements across evaluation velocity, scoring objectivity, and student growth.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-[#111827] rounded-2xl border border-[#243047] shadow-xl space-y-4">
            <span className="text-4xl font-black text-[#7C3AED] block">70%</span>
            <h4 className="text-lg font-bold text-[#F8FAFC]">Reduction in Faculty Review Time</h4>
            <p className="text-xs text-[#CBD5E1] leading-relaxed">
              Automate code static checks, formatting audits, and similarity comparisons so evaluators can focus entirely on viva defense.
            </p>
          </div>

          <div className="p-6 bg-[#111827] rounded-2xl border border-[#243047] shadow-xl space-y-4">
            <span className="text-4xl font-black text-[#A78BFA] block">100%</span>
            <h4 className="text-lg font-bold text-[#F8FAFC]">Audit & Accreditation Compliance</h4>
            <p className="text-xs text-[#CBD5E1] leading-relaxed">
              Maintain immutable electronic records of submissions, evaluator rubrics, and committee approvals for seamless accreditation verification.
            </p>
          </div>

          <div className="p-6 bg-[#111827] rounded-2xl border border-[#243047] shadow-xl space-y-4">
            <span className="text-4xl font-black text-emerald-400 block">3.4x</span>
            <h4 className="text-lg font-bold text-[#F8FAFC]">Improvement in Resubmission Quality</h4>
            <p className="text-xs text-[#CBD5E1] leading-relaxed">
              Clear actionable improvement plans empower students to address specific architectural flaws before capstone graduation showcases.
            </p>
          </div>
        </div>
      </section>

      {/* 8. FINAL CALL TO ACTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#111827] rounded-3xl p-8 sm:p-14 text-center text-white space-y-6 relative overflow-hidden border border-[#243047]">
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <Badge variant="primary" size="md">GET STARTED TODAY</Badge>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[#F8FAFC]">
              Ready to Modernize Your Project Evaluation?
            </h2>
            <p className="text-sm text-[#CBD5E1] leading-relaxed">
              Create your institution account in seconds. Test standalone evaluations with the Project Checker or launch a complete classroom cohort.
            </p>
            <div className="pt-4 flex flex-wrap justify-center gap-4">
              <Link to="/register">
                <Button variant="primary" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Start Evaluating
                </Button>
              </Link>
              <Link to="/solution">
                <Button variant="outline" size="lg" className="border-[#243047] text-[#F8FAFC] bg-[#0F172A] hover:bg-[#172033]">
                  Explore Platform
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
