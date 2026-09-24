export interface UserSkills {
  languages?: string[];
  technologies?: string[];
  frameworks?: string[];
  interests?: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  permanentId: string; // e.g. "PRV-10482"
  department: string;
  year: string;
  college: string;
  avatar?: string;
  profileImage?: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
  authProvider?: string;

  // Personal Information
  phone?: string;
  dob?: string;
  location?: string;
  bio?: string;

  // Academic Information
  degree?: string;
  section?: string;
  registerNumber?: string;
  expectedGraduationYear?: string;

  // Skills & Interests
  skills?: UserSkills;
}

export type ResourceType = 
  | 'sourceCode'
  | 'projectReport'
  | 'ppt'
  | 'github'
  | 'demoVideo'
  | 'screenshots'
  | 'dataset'
  | 'other';

export interface ProjectResource {
  type: ResourceType;
  name: string;
  url?: string;
  size?: string;
  uploadedAt: string;
  status: 'uploaded' | 'pending';
}

export interface ProjectDetails {
  id: string;
  title: string;
  category: string;
  description: string;
  problemStatement: string;
  proposedSolution: string;
  objectives: string;
  innovation: string;
  features: string;
  targetUsers: string;
  technologies: string[];
  programmingLanguages: string[];
  testingApproach: string;
  limitations: string;
  futureEnhancements: string;
  githubUrl?: string;
  liveDemoUrl?: string;
  resources: ProjectResource[];
  status?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CriteriaScore {
  name: string;
  maxScore: number;
  obtainedScore: number;
  feedback: string;
}

export interface ImprovementItem {
  area: string;
  suggestion: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface PlagiarismResult {
  codeSimilarity: number;
  reportSimilarity: number;
  overallSimilarity: number;
  status: 'Low' | 'Moderate' | 'High';
  isDemoData: boolean;
}

export interface StandaloneAIEvaluation {
  id: string;
  projectId: string;
  overallScore: number; // /100
  criteria: {
    problemDefinition: CriteriaScore; // max 15
    innovationNovelty: CriteriaScore; // max 20
    technicalImplementation: CriteriaScore; // max 20
    functionality: CriteriaScore; // max 15
    codeQuality: CriteriaScore; // max 10
    documentation: CriteriaScore; // max 10
    overallQuality: CriteriaScore; // max 10
  };
  plagiarism: PlagiarismResult;
  strengths: string[];
  weaknesses: string[];
  technicalAnalysis: string;
  codeAnalysis: string;
  documentationAnalysis: string;
  actionableSuggestions: string[];
  improvementPlan: ImprovementItem[];
  summary: string;
  evaluatedAt: string;
  status?: string;
  isDemoData: boolean;
}

export interface TeamMember {
  userId: string;
  permanentId: string;
  name: string;
  email: string;
  role: 'Captain' | 'Member';
  joinedAt: string;
  avatar?: string;
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  userId: string;
  permanentId: string;
  userName: string;
  userEmail: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
  invitedAt: string;
}

export interface Team {
  id: string;
  name: string;
  logo?: string;
  code: string;
  maxSize: number;
  captainId: string;
  captainName?: string;
  captainEmail?: string;
  captainPermanentId?: string;
  members: TeamMember[];
  invitations: TeamInvitation[];
  status?: string;
  createdAt: string;
  isBackend?: boolean;
  submissions?: any[];
}

export interface ClassroomTeamParticipation {
  id: string;
  classroomId: string;
  classroomName?: string;
  classroomCode?: string;
  classroomDeadline?: string;
  classroomMode?: string;
  classroomStatus?: string;
  classroomOwnerName?: string;
  teamId: string;
  teamName?: string;
  teamCode?: string;
  teamLogo?: string;
  teamMaxSize?: number;
  captainName?: string;
  captainEmail?: string;
  captainPermanentId?: string;
  status: 'Incomplete Team' | 'Ready for Approval' | 'Approved' | 'Rejected' | 'Withdrawn' | string;
  displayStatus?: string;
  canApprove?: boolean;
  currentMembers?: number;
  maxSize?: number;
  requestedAt: string;
  reviewedAt?: string;
  submission?: {
    id: string;
    title: string;
    status: string;
    finalTotalScore?: number | null;
    submittedAt: string;
    evaluationStatus?: string;
  } | null;
}

export interface ClassroomResourceRequirement {
  type: ResourceType;
  label: string;
  required: boolean;
}

export interface Classroom {
  id: string;
  name: string;
  description: string;
  code: string;
  logo?: string;
  ownerId: string;
  ownerName?: string;
  ownerEmail?: string;
  startDate: string;
  submissionDeadline: string;
  submissionMode: 'Individual' | 'Team';
  minTeamSize?: number;
  maxTeamSize?: number;
  resources: ClassroomResourceRequirement[];
  createdAt: string;
  status?: string;
  participantCount?: number;
  submissionCount?: number;
  isBackend?: boolean;
  currentUserRole?: 'OWNER' | 'EVALUATOR' | 'MEMBER';
  members?: any[];
  evaluators?: any[];
  invitations?: any[];
}

export interface VivaQuestionScore {
  questionNumber: number;
  questionText: string;
  maxScore: number; // 5
  score: number; // 0-5
  feedback: string;
}

export interface ClassroomAIComponent {
  rawScore: number; // /50
  codeSimilarity: number;
  reportSimilarity: number;
  deduction: number; // deduction inside /50
  finalScore: number; // /50
  isDemoData: boolean;
}

export interface FacultyEvaluation {
  evaluatorId: string;
  evaluatorName: string;
  pptDemoScore: number; // /25
  vivaQuestions: VivaQuestionScore[]; // 5 questions x 5 marks = 25
  vivaTotalScore: number; // /25
  totalFacultyScore: number; // /50
  status: 'Completed' | 'Incomplete' | 'Absent';
  reason?: string; // mandatory if incomplete or absent
  feedback: string;
  evaluatedAt: string;
}

export interface ClassroomVerification {
  status: 'Pending' | 'Approved' | 'Returned';
  returnReason?: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface ClassroomSubmission {
  id: string;
  classroomId: string;
  submitterId: string;
  submitterName: string;
  teamId?: string;
  teamName?: string;
  project: ProjectDetails;
  aiComponent?: ClassroomAIComponent;
  facultyEvaluation?: FacultyEvaluation;
  assignedEvaluatorId?: string;
  assignedEvaluatorName?: string;
  verification?: ClassroomVerification;
  finalTotalScore?: number; // /100 (AI /50 + PPT/Demo /25 + Viva /25)
  status: 'Submitted' | 'AI_Evaluated' | 'Faculty_Evaluated' | 'Verified' | 'Returned';
  submittedAt: string;
}

export type NotificationType =
  | 'team_invitation'
  | 'classroom_invitation'
  | 'join_approval'
  | 'submission_success'
  | 'deadline_reminder'
  | 'ai_evaluated'
  | 'faculty_evaluated'
  | 'viva_assigned'
  | 'verification'
  | 'result_published'
  | 'evaluator_assignment'
  | 'new_submission'
  | 'evaluation_deadline'
  | 'returned_evaluation';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  link: string;
}
