-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "permanentId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "year" TEXT,
    "college" TEXT,
    "profileImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "logo" TEXT,
    "maxSize" INTEGER NOT NULL DEFAULT 4,
    "captainId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamInvitation" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "TeamInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Classroom" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "code" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "submissionMode" TEXT NOT NULL DEFAULT 'Individual',
    "resourcesConfig" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Classroom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomMember" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomInvitation" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomEvaluator" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "evaluatorId" TEXT NOT NULL,
    "submissionId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomEvaluator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "submitterId" TEXT NOT NULL,
    "teamId" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "problemStatement" TEXT,
    "proposedSolution" TEXT,
    "objectives" TEXT,
    "innovation" TEXT,
    "features" TEXT,
    "targetUsers" TEXT,
    "technologies" TEXT,
    "programmingLanguages" TEXT,
    "testingApproach" TEXT,
    "limitations" TEXT,
    "futureEnhancements" TEXT,
    "githubUrl" TEXT,
    "liveDemoUrl" TEXT,
    "assignedEvaluatorId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Submitted',
    "finalTotalScore" DOUBLE PRECISION,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionResource" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "path" TEXT,
    "size" TEXT,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomAIEvaluation" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "rawScore" DOUBLE PRECISION NOT NULL,
    "codeSimilarity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reportSimilarity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overallSimilarity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalScore" DOUBLE PRECISION NOT NULL,
    "plagiarismStatus" TEXT NOT NULL DEFAULT 'Low',
    "plagiarismReason" TEXT,
    "matchedSources" TEXT,
    "feedback" TEXT NOT NULL,
    "improvementPlan" TEXT,
    "isDemoData" BOOLEAN NOT NULL DEFAULT false,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomAIEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacultyEvaluation" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "evaluatorId" TEXT NOT NULL,
    "pptDemoScore" DOUBLE PRECISION NOT NULL,
    "vivaTotalScore" DOUBLE PRECISION NOT NULL,
    "totalFacultyScore" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Completed',
    "reason" TEXT,
    "feedback" TEXT NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacultyEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VivaQuestionResponse" (
    "id" TEXT NOT NULL,
    "facultyEvaluationId" TEXT NOT NULL,
    "questionNumber" INTEGER NOT NULL,
    "questionText" TEXT NOT NULL,
    "category" TEXT,
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "score" DOUBLE PRECISION NOT NULL,
    "feedback" TEXT,

    CONSTRAINT "VivaQuestionResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "verifiedById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "returnReason" TEXT,
    "feedback" TEXT,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCheckerProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "problemStatement" TEXT,
    "proposedSolution" TEXT,
    "objectives" TEXT,
    "innovation" TEXT,
    "features" TEXT,
    "targetUsers" TEXT,
    "technologies" TEXT,
    "programmingLanguages" TEXT,
    "testingApproach" TEXT,
    "limitations" TEXT,
    "futureEnhancements" TEXT,
    "githubUrl" TEXT,
    "liveDemoUrl" TEXT,
    "externalLinks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectCheckerProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCheckerResource" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "path" TEXT,
    "size" TEXT,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectCheckerResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCheckerAIEvaluation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "problemDefinitionScore" DOUBLE PRECISION NOT NULL,
    "problemDefinitionFeedback" TEXT,
    "innovationNoveltyScore" DOUBLE PRECISION NOT NULL,
    "innovationNoveltyFeedback" TEXT,
    "technicalImplementationScore" DOUBLE PRECISION NOT NULL,
    "technicalImplementationFeedback" TEXT,
    "functionalityScore" DOUBLE PRECISION NOT NULL,
    "functionalityFeedback" TEXT,
    "codeQualityScore" DOUBLE PRECISION NOT NULL,
    "codeQualityFeedback" TEXT,
    "documentationScore" DOUBLE PRECISION NOT NULL,
    "documentationFeedback" TEXT,
    "overallQualityScore" DOUBLE PRECISION NOT NULL,
    "overallQualityFeedback" TEXT,
    "totalScore" DOUBLE PRECISION NOT NULL,
    "strengths" TEXT NOT NULL,
    "weaknesses" TEXT NOT NULL,
    "technicalAnalysis" TEXT NOT NULL,
    "codeAnalysis" TEXT NOT NULL,
    "documentationAnalysis" TEXT NOT NULL,
    "actionableSuggestions" TEXT,
    "improvementPlan" TEXT NOT NULL,
    "summary" TEXT,
    "aiModel" TEXT NOT NULL DEFAULT 'Provalix-AI-Evaluator-v1',
    "isDemoData" BOOLEAN NOT NULL DEFAULT false,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectCheckerAIEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCheckerPlagiarism" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "codeSimilarity" DOUBLE PRECISION NOT NULL,
    "reportSimilarity" DOUBLE PRECISION NOT NULL,
    "overallSimilarity" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "matchedSources" TEXT,
    "deduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" TEXT,
    "feedback" TEXT,
    "isDemoData" BOOLEAN NOT NULL DEFAULT false,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectCheckerPlagiarism_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performedById" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "projectId" TEXT,
    "submissionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sources" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeDocument" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" TEXT,

    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dataset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fileType" TEXT NOT NULL,
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dataset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatasetRecord" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "metadata" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Valid',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DatasetRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIEvaluationCriterion" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT,
    "criterionName" TEXT NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "obtainedScore" DOUBLE PRECISION NOT NULL,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIEvaluationCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlagiarismResult" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT,
    "projectId" TEXT,
    "codeSimilarity" DOUBLE PRECISION NOT NULL,
    "reportSimilarity" DOUBLE PRECISION NOT NULL,
    "overallSimilarity" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "deduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" TEXT,
    "feedback" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlagiarismResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VivaQuestion" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT,
    "questionNumber" INTEGER NOT NULL,
    "questionText" TEXT NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VivaQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VivaResponse" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "questionNumber" INTEGER NOT NULL,
    "questionText" TEXT NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "score" DOUBLE PRECISION NOT NULL,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VivaResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImprovementPlan" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT,
    "projectId" TEXT,
    "area" TEXT NOT NULL,
    "suggestion" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImprovementPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_permanentId_key" ON "User"("permanentId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_permanentId_idx" ON "User"("permanentId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Team_code_key" ON "Team"("code");

-- CreateIndex
CREATE INDEX "Team_code_idx" ON "Team"("code");

-- CreateIndex
CREATE INDEX "Team_captainId_idx" ON "Team"("captainId");

-- CreateIndex
CREATE INDEX "TeamMember_userId_idx" ON "TeamMember"("userId");

-- CreateIndex
CREATE INDEX "TeamMember_teamId_idx" ON "TeamMember"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");

-- CreateIndex
CREATE INDEX "TeamInvitation_teamId_idx" ON "TeamInvitation"("teamId");

-- CreateIndex
CREATE INDEX "TeamInvitation_userId_idx" ON "TeamInvitation"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Classroom_code_key" ON "Classroom"("code");

-- CreateIndex
CREATE INDEX "Classroom_code_idx" ON "Classroom"("code");

-- CreateIndex
CREATE INDEX "Classroom_ownerId_idx" ON "Classroom"("ownerId");

-- CreateIndex
CREATE INDEX "ClassroomMember_classroomId_idx" ON "ClassroomMember"("classroomId");

-- CreateIndex
CREATE INDEX "ClassroomMember_userId_idx" ON "ClassroomMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassroomMember_classroomId_userId_key" ON "ClassroomMember"("classroomId", "userId");

-- CreateIndex
CREATE INDEX "ClassroomInvitation_classroomId_idx" ON "ClassroomInvitation"("classroomId");

-- CreateIndex
CREATE INDEX "ClassroomEvaluator_classroomId_idx" ON "ClassroomEvaluator"("classroomId");

-- CreateIndex
CREATE INDEX "ClassroomEvaluator_evaluatorId_idx" ON "ClassroomEvaluator"("evaluatorId");

-- CreateIndex
CREATE INDEX "Submission_classroomId_idx" ON "Submission"("classroomId");

-- CreateIndex
CREATE INDEX "Submission_submitterId_idx" ON "Submission"("submitterId");

-- CreateIndex
CREATE INDEX "Submission_teamId_idx" ON "Submission"("teamId");

-- CreateIndex
CREATE INDEX "Submission_status_idx" ON "Submission"("status");

-- CreateIndex
CREATE INDEX "SubmissionResource_submissionId_idx" ON "SubmissionResource"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassroomAIEvaluation_submissionId_key" ON "ClassroomAIEvaluation"("submissionId");

-- CreateIndex
CREATE INDEX "ClassroomAIEvaluation_submissionId_idx" ON "ClassroomAIEvaluation"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "FacultyEvaluation_submissionId_key" ON "FacultyEvaluation"("submissionId");

-- CreateIndex
CREATE INDEX "FacultyEvaluation_submissionId_idx" ON "FacultyEvaluation"("submissionId");

-- CreateIndex
CREATE INDEX "FacultyEvaluation_evaluatorId_idx" ON "FacultyEvaluation"("evaluatorId");

-- CreateIndex
CREATE INDEX "VivaQuestionResponse_facultyEvaluationId_idx" ON "VivaQuestionResponse"("facultyEvaluationId");

-- CreateIndex
CREATE UNIQUE INDEX "Verification_submissionId_key" ON "Verification"("submissionId");

-- CreateIndex
CREATE INDEX "Verification_submissionId_idx" ON "Verification"("submissionId");

-- CreateIndex
CREATE INDEX "ProjectCheckerProject_userId_idx" ON "ProjectCheckerProject"("userId");

-- CreateIndex
CREATE INDEX "ProjectCheckerResource_projectId_idx" ON "ProjectCheckerResource"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCheckerAIEvaluation_projectId_key" ON "ProjectCheckerAIEvaluation"("projectId");

-- CreateIndex
CREATE INDEX "ProjectCheckerAIEvaluation_projectId_idx" ON "ProjectCheckerAIEvaluation"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCheckerPlagiarism_projectId_key" ON "ProjectCheckerPlagiarism"("projectId");

-- CreateIndex
CREATE INDEX "ProjectCheckerPlagiarism_projectId_idx" ON "ProjectCheckerPlagiarism"("projectId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_read_idx" ON "Notification"("read");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ChatConversation_userId_idx" ON "ChatConversation"("userId");

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_idx" ON "ChatMessage"("conversationId");

-- CreateIndex
CREATE INDEX "KnowledgeDocument_category_idx" ON "KnowledgeDocument"("category");

-- CreateIndex
CREATE INDEX "KnowledgeDocument_title_idx" ON "KnowledgeDocument"("title");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_documentId_idx" ON "KnowledgeChunk"("documentId");

-- CreateIndex
CREATE INDEX "DatasetRecord_datasetId_idx" ON "DatasetRecord"("datasetId");

-- CreateIndex
CREATE INDEX "DatasetRecord_category_idx" ON "DatasetRecord"("category");

-- CreateIndex
CREATE INDEX "AIEvaluationCriterion_evaluationId_idx" ON "AIEvaluationCriterion"("evaluationId");

-- CreateIndex
CREATE INDEX "PlagiarismResult_submissionId_idx" ON "PlagiarismResult"("submissionId");

-- CreateIndex
CREATE INDEX "PlagiarismResult_projectId_idx" ON "PlagiarismResult"("projectId");

-- CreateIndex
CREATE INDEX "VivaQuestion_submissionId_idx" ON "VivaQuestion"("submissionId");

-- CreateIndex
CREATE INDEX "VivaResponse_evaluationId_idx" ON "VivaResponse"("evaluationId");

-- CreateIndex
CREATE INDEX "ImprovementPlan_submissionId_idx" ON "ImprovementPlan"("submissionId");

-- CreateIndex
CREATE INDEX "ImprovementPlan_projectId_idx" ON "ImprovementPlan"("projectId");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamInvitation" ADD CONSTRAINT "TeamInvitation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamInvitation" ADD CONSTRAINT "TeamInvitation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomMember" ADD CONSTRAINT "ClassroomMember_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomMember" ADD CONSTRAINT "ClassroomMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomInvitation" ADD CONSTRAINT "ClassroomInvitation_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomInvitation" ADD CONSTRAINT "ClassroomInvitation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomEvaluator" ADD CONSTRAINT "ClassroomEvaluator_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomEvaluator" ADD CONSTRAINT "ClassroomEvaluator_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_assignedEvaluatorId_fkey" FOREIGN KEY ("assignedEvaluatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionResource" ADD CONSTRAINT "SubmissionResource_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomAIEvaluation" ADD CONSTRAINT "ClassroomAIEvaluation_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacultyEvaluation" ADD CONSTRAINT "FacultyEvaluation_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacultyEvaluation" ADD CONSTRAINT "FacultyEvaluation_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VivaQuestionResponse" ADD CONSTRAINT "VivaQuestionResponse_facultyEvaluationId_fkey" FOREIGN KEY ("facultyEvaluationId") REFERENCES "FacultyEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCheckerProject" ADD CONSTRAINT "ProjectCheckerProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCheckerResource" ADD CONSTRAINT "ProjectCheckerResource_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProjectCheckerProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCheckerAIEvaluation" ADD CONSTRAINT "ProjectCheckerAIEvaluation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProjectCheckerProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCheckerPlagiarism" ADD CONSTRAINT "ProjectCheckerPlagiarism_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProjectCheckerProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetRecord" ADD CONSTRAINT "DatasetRecord_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VivaQuestion" ADD CONSTRAINT "VivaQuestion_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

