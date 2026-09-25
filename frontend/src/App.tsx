import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AIProvider } from './context/AIContext';

// Layouts
import { PublicLayout } from './layouts/PublicLayout';
import { AppLayout } from './layouts/AppLayout';
import { ProvalixLogo } from './components/common/ProvalixLogo';

// Public Pages (Lazy Loaded)
const LandingPage = React.lazy(() => import('./pages/public/LandingPage').then(m => ({ default: m.LandingPage })));
const AboutPage = React.lazy(() => import('./pages/public/AboutPage').then(m => ({ default: m.AboutPage })));
const SolutionPage = React.lazy(() => import('./pages/public/SolutionPage').then(m => ({ default: m.SolutionPage })));
const FeaturesPage = React.lazy(() => import('./pages/public/FeaturesPage').then(m => ({ default: m.FeaturesPage })));
const HowItWorksPage = React.lazy(() => import('./pages/public/HowItWorksPage').then(m => ({ default: m.HowItWorksPage })));
const BenefitsPage = React.lazy(() => import('./pages/public/BenefitsPage').then(m => ({ default: m.BenefitsPage })));

// Auth Pages (Lazy Loaded)
const LoginPage = React.lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = React.lazy(() => import('./pages/auth/RegisterPage').then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage = React.lazy(() => import('./pages/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = React.lazy(() => import('./pages/auth/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const AuthVerifyPage = React.lazy(() => import('./pages/auth/AuthVerifyPage').then(m => ({ default: m.AuthVerifyPage })));

// App Pages (Lazy Loaded)
const DashboardPage = React.lazy(() => import('./pages/app/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ProjectCheckerPage = React.lazy(() => import('./pages/app/ProjectCheckerPage').then(m => ({ default: m.ProjectCheckerPage })));
const NewProjectCheckPage = React.lazy(() => import('./pages/app/NewProjectCheckPage').then(m => ({ default: m.NewProjectCheckPage })));
const ProjectReportsPage = React.lazy(() => import('./pages/app/ProjectReportsPage').then(m => ({ default: m.ProjectReportsPage })));
const ProjectReportDetailPage = React.lazy(() => import('./pages/app/ProjectReportDetailPage').then(m => ({ default: m.ProjectReportDetailPage })));
const TeamsPage = React.lazy(() => import('./pages/app/TeamsPage').then(m => ({ default: m.TeamsPage })));
const CreateTeamPage = React.lazy(() => import('./pages/app/CreateTeamPage').then(m => ({ default: m.CreateTeamPage })));
const TeamDetailPage = React.lazy(() => import('./pages/app/TeamDetailPage').then(m => ({ default: m.TeamDetailPage })));
const ClassroomsPage = React.lazy(() => import('./pages/app/ClassroomsPage').then(m => ({ default: m.ClassroomsPage })));
const CreateClassroomPage = React.lazy(() => import('./pages/app/CreateClassroomPage').then(m => ({ default: m.CreateClassroomPage })));
const ClassroomDetailPage = React.lazy(() => import('./pages/app/ClassroomDetailPage').then(m => ({ default: m.ClassroomDetailPage })));
const ClassroomSubmitPage = React.lazy(() => import('./pages/app/ClassroomSubmitPage').then(m => ({ default: m.ClassroomSubmitPage })));
const ClassroomEvaluationsPage = React.lazy(() => import('./pages/app/ClassroomEvaluationsPage').then(m => ({ default: m.ClassroomEvaluationsPage })));
const ClassroomVerificationPage = React.lazy(() => import('./pages/app/ClassroomVerificationPage').then(m => ({ default: m.ClassroomVerificationPage })));
const ClassroomLeaderboardPage = React.lazy(() => import('./pages/app/ClassroomLeaderboardPage').then(m => ({ default: m.ClassroomLeaderboardPage })));
const NotificationsPage = React.lazy(() => import('./pages/app/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const ProfilePage = React.lazy(() => import('./pages/app/ProfilePage').then(m => ({ default: m.ProfilePage })));
const SettingsPage = React.lazy(() => import('./pages/app/SettingsPage').then(m => ({ default: m.SettingsPage })));
const NotFoundPage = React.lazy(() => import('./pages/app/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

// Page Loading Suspense Fallback
const PageLoadingFallback: React.FC = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center p-8">
    <div className="flex flex-col items-center gap-3">
      <ProvalixLogo variant="icon-only" size="lg" animated />
      <span className="text-xs text-slate-400 font-medium tracking-wide">Loading workspace...</span>
    </div>
  </div>
);

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <ProvalixLogo variant="icon-only" size="lg" animated />
          <p className="text-xs text-[#94A3B8] font-medium">Verifying credentials...</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Public Auth Guard (Redirects already authenticated users to /dashboard)
const PublicAuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center">
        <ProvalixLogo variant="icon-only" size="lg" animated />
      </div>
    );
  }
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

export function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <AIProvider>
              <Suspense fallback={<PageLoadingFallback />}>
                <Routes>
                  {/* Public Marketing Routes */}
                  <Route element={<PublicLayout />}>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/solution" element={<SolutionPage />} />
                    <Route path="/features" element={<FeaturesPage />} />
                    <Route path="/how-it-works" element={<HowItWorksPage />} />
                    <Route path="/benefits" element={<BenefitsPage />} />
                  </Route>

                  {/* Authentication Routes (Guarded from authenticated sessions) */}
                  <Route
                    path="/login"
                    element={
                      <PublicAuthRoute>
                        <LoginPage />
                      </PublicAuthRoute>
                    }
                  />
                  <Route
                    path="/register"
                    element={
                      <PublicAuthRoute>
                        <RegisterPage />
                      </PublicAuthRoute>
                    }
                  />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/auth/verify" element={<AuthVerifyPage />} />

                  {/* Protected SaaS App Routes */}
                  <Route
                    element={
                      <ProtectedRoute>
                        <AppLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route path="/dashboard" element={<DashboardPage />} />
                    
                    {/* Project Checker */}
                    <Route path="/project-checker" element={<ProjectCheckerPage />} />
                    <Route path="/project-checker/new" element={<NewProjectCheckPage />} />
                    
                    {/* Standalone Project Reports */}
                    <Route path="/project-reports" element={<ProjectReportsPage />} />
                    <Route path="/project-reports/:id" element={<ProjectReportDetailPage />} />
                    
                    {/* Teams */}
                    <Route path="/teams" element={<TeamsPage />} />
                    <Route path="/teams/create" element={<CreateTeamPage />} />
                    <Route path="/teams/:id" element={<TeamDetailPage />} />
                    
                    {/* Classrooms */}
                    <Route path="/classrooms" element={<ClassroomsPage />} />
                    <Route path="/classrooms/create" element={<CreateClassroomPage />} />
                    <Route path="/classrooms/:id" element={<ClassroomDetailPage />} />
                    <Route path="/classrooms/:id/submit" element={<ClassroomSubmitPage />} />
                    <Route path="/classrooms/:id/evaluations" element={<ClassroomEvaluationsPage />} />
                    <Route path="/classrooms/:id/verification" element={<ClassroomVerificationPage />} />
                    <Route path="/classrooms/:id/leaderboard" element={<ClassroomLeaderboardPage />} />
                    
                    {/* Personal & Settings */}
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/settings" element={<SettingsPage />} />

                    {/* 404 inside authenticated layout */}
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>

                  {/* Fallback 404 */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </AIProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;

