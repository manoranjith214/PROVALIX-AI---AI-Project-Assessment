import { 
  User, 
  ProjectDetails, 
  Team, 
  Classroom, 
  ClassroomSubmission, 
  StandaloneAIEvaluation, 
  AppNotification 
} from '../types';

export const mockCurrentUser: User = {
  id: '',
  name: '',
  email: '',
  permanentId: '',
  department: '',
  year: '',
  college: '',
  avatar: '',
};

export const mockUsers: User[] = [];
export const mockProjects: ProjectDetails[] = [];
export const mockEvaluations: Record<string, StandaloneAIEvaluation> = {};
export const mockTeams: Team[] = [];
export const mockClassrooms: Classroom[] = [];
export const mockSubmissions: ClassroomSubmission[] = [];
export const mockNotifications: AppNotification[] = [];
