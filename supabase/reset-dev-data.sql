-- ==============================================================================
-- Provalix AI - Database & Authentication Fresh-Start Reset Script
-- File: supabase/reset-dev-data.sql
--
-- Objective:
-- Safely delete all existing application users, auth users, and user data.
-- Does NOT drop tables, schemas, indexes, constraints, triggers, or RLS policies.
-- ==============================================================================

BEGIN;

-- 1. Clean legacy Prisma application tables in dependency order
DELETE FROM public."AuditLog";
DELETE FROM public."Notification";
DELETE FROM public."ChatMessage";
DELETE FROM public."ChatConversation";
DELETE FROM public."VivaResponse";
DELETE FROM public."VivaQuestionResponse";
DELETE FROM public."VivaQuestion";
DELETE FROM public."PlagiarismResult";
DELETE FROM public."AIEvaluationCriterion";
DELETE FROM public."ImprovementPlan";
DELETE FROM public."Verification";
DELETE FROM public."FacultyEvaluation";
DELETE FROM public."ClassroomAIEvaluation";
DELETE FROM public."SubmissionResource";
DELETE FROM public."Submission";
DELETE FROM public."ClassroomEvaluator";
DELETE FROM public."ClassroomInvitation";
DELETE FROM public."ClassroomMember";
DELETE FROM public."ClassroomTeamParticipation";
DELETE FROM public."Classroom";
DELETE FROM public."TeamInvitation";
DELETE FROM public."TeamMember";
DELETE FROM public."Team";
DELETE FROM public."ProjectCheckerPlagiarism";
DELETE FROM public."ProjectCheckerAIEvaluation";
DELETE FROM public."ProjectCheckerResource";
DELETE FROM public."ProjectCheckerProject";
DELETE FROM public."PasswordResetToken";
DELETE FROM public."RefreshToken";
DELETE FROM public."User";

-- 2. Clean Supabase application persistence tables
DELETE FROM public.user_settings;
DELETE FROM public.classrooms;
DELETE FROM public.teams;
DELETE FROM public.projects;
DELETE FROM public.profiles;

-- 3. Clean Supabase Auth schema (delete all OAuth/Google/test users and sessions)
-- Deleting from auth.users cascades to auth.identities, auth.sessions, auth.refresh_tokens, etc.
DELETE FROM auth.users;

COMMIT;

-- Verification Queries:
-- SELECT count(*) FROM auth.users; -- Expected: 0
-- SELECT count(*) FROM public.profiles; -- Expected: 0
-- SELECT count(*) FROM public."User"; -- Expected: 0
