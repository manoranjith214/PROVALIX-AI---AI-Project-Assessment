import { 
  User, 
  ProjectDetails, 
  Team, 
  Classroom, 
  ClassroomSubmission, 
  StandaloneAIEvaluation, 
  AppNotification 
} from '../types';

const STORAGE_KEYS = {
  CURRENT_USER: 'provalix_current_user',
  USERS: 'provalix_users',
  PROJECTS: 'provalix_projects',
  TEAMS: 'provalix_teams',
  CLASSROOMS: 'provalix_classrooms',
  SUBMISSIONS: 'provalix_submissions',
  STANDALONE_EVALUATIONS: 'provalix_standalone_evals',
  NOTIFICATIONS: 'provalix_notifications',
};

function getItem<T>(key: string, defaultVal: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch (err) {
    console.warn(`Error reading localStorage key "${key}":`, err);
    return defaultVal;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error writing localStorage key "${key}":`, err);
  }
}

// Clean storage initialization: NEVER auto-seed mock data for real users
export function initializeStorage(): void {
  // If no auth token is present, clean up any unauthenticated current user
  const token = localStorage.getItem('provalix_access_token');
  if (!token) {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
}

export const Storage = {
  getCurrentUser: (): User | null => getItem<User | null>(STORAGE_KEYS.CURRENT_USER, null),
  setCurrentUser: (user: User | null): void => {
    if (user) {
      setItem(STORAGE_KEYS.CURRENT_USER, user);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  },
  
  getUsers: (): User[] => getItem<User[]>(STORAGE_KEYS.USERS, []),
  setUsers: (users: User[]): void => setItem(STORAGE_KEYS.USERS, users),
  
  getProjects: (): ProjectDetails[] => getItem<ProjectDetails[]>(STORAGE_KEYS.PROJECTS, []),
  setProjects: (projects: ProjectDetails[]): void => setItem(STORAGE_KEYS.PROJECTS, projects),
  
  getTeams: (): Team[] => getItem<Team[]>(STORAGE_KEYS.TEAMS, []),
  setTeams: (teams: Team[]): void => setItem(STORAGE_KEYS.TEAMS, teams),
  
  getClassrooms: (): Classroom[] => getItem<Classroom[]>(STORAGE_KEYS.CLASSROOMS, []),
  setClassrooms: (classrooms: Classroom[]): void => setItem(STORAGE_KEYS.CLASSROOMS, classrooms),
  
  getSubmissions: (): ClassroomSubmission[] => getItem<ClassroomSubmission[]>(STORAGE_KEYS.SUBMISSIONS, []),
  setSubmissions: (subs: ClassroomSubmission[]): void => setItem(STORAGE_KEYS.SUBMISSIONS, subs),
  
  getStandaloneEvaluations: (): StandaloneAIEvaluation[] => getItem<StandaloneAIEvaluation[]>(STORAGE_KEYS.STANDALONE_EVALUATIONS, []),
  setStandaloneEvaluations: (evals: StandaloneAIEvaluation[]): void => setItem(STORAGE_KEYS.STANDALONE_EVALUATIONS, evals),
  
  getNotifications: (): AppNotification[] => getItem<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []),
  setNotifications: (notifs: AppNotification[]): void => setItem(STORAGE_KEYS.NOTIFICATIONS, notifs),

  /**
   * Completely purge all user-specific data and caches on logout
   */
  clearAllUserData: (): void => {
    try {
      // Clear known Provalix keys
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });

      // Clear token keys
      localStorage.removeItem('provalix_access_token');
      localStorage.removeItem('provalix_refresh_token');
      localStorage.removeItem('provalix_auth_user');

      // Clear any custom team participation keys or cached items
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('provalix_') || key.startsWith('team_classroom_part_') || key.startsWith('sb-'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      sessionStorage.clear();
    } catch (err) {
      console.error('Error clearing user data:', err);
    }
  },
};
