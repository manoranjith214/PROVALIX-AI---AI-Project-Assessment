import { QueryCategory, SupportedLanguage } from './chatbotTypes';

export type UserContextType =
  | 'evaluation'
  | 'deadline'
  | 'team'
  | 'classroom'
  | 'notification'
  | 'ranking'
  | 'viva'
  | 'plagiarism'
  | 'project_report';

export interface ClassificationResult {
  categories: QueryCategory[];
  primaryCategory: QueryCategory;
  detectedLanguage: SupportedLanguage;
  isCasualGreeting: boolean;
  requiresProjectContext: boolean;
  requiresProvalixKB: boolean;
  requiresGeneralKnowledge?: boolean;
  userContextType?: UserContextType;
}

export class QueryClassifier {
  /**
   * Detects the language of the incoming query.
   * Supports: English, Tamil (Script & Tanglish), Hindi, Telugu, Malayalam, Kannada, Bengali, Marathi.
   */
  detectLanguage(text: string): SupportedLanguage {
    const raw = text.trim();
    const lower = raw.toLowerCase();

    // 1. Explicit user language override requests (Highest Priority)
    if (
      lower.includes('in english') ||
      lower.includes('english-la') ||
      lower.includes('english la') ||
      lower.includes('simple english') ||
      /\b(in english|explain in english|only english|pure english)\b/i.test(lower)
    ) {
      return 'english';
    }

    if (
      lower.includes('தமிழ்ல') ||
      lower.includes('தமிழில்') ||
      lower.includes('tamil-la') ||
      lower.includes('tamil la') ||
      lower.includes('in tamil') ||
      lower.includes('tamilil')
    ) {
      return 'tamil';
    }

    if (
      lower.includes('tanglish') ||
      lower.includes('tanglish-la') ||
      lower.includes('tanglish la') ||
      lower.includes('in tanglish')
    ) {
      return 'tanglish';
    }

    if (
      lower.includes('hindi me') ||
      lower.includes('hindi-me') ||
      lower.includes('hindi mai') ||
      lower.includes('in hindi')
    ) {
      return 'hindi';
    }

    // 2. Script-based Unicode detection
    if (/[\u0B80-\u0BFF]/.test(raw)) {
      return 'tamil';
    }
    if (/[\u0C00-\u0C7F]/.test(raw)) {
      return 'telugu';
    }
    if (/[\u0D00-\u0D7F]/.test(raw)) {
      return 'malayalam';
    }
    if (/[\u0C80-\u0CFF]/.test(raw)) {
      return 'kannada';
    }
    if (/[\u0980-\u09FF]/.test(raw)) {
      return 'bengali';
    }
    if (/[\u0900-\u097F]/.test(raw)) {
      // Check for Marathi-specific patterns, else Hindi
      if (/\b(आहे|नाही|कसा|कसे|झाले)\b/.test(raw)) {
        return 'marathi';
      }
      return 'hindi';
    }

    // 3. Tanglish detection (Tamil written in Latin script)
    const tanglishTokens = [
      'na', 'enna', 'epdi', 'eppadi', 'solla', 'sollu', 'sollunga', 'panrathu',
      'pannu', 'pannunga', 'panlam', 'pannalam', 'kudu', 'thanga', 'irukku',
      'iruku', 'theriyuma', 'engalukku', 'enaku', 'unakku', 'ungalluku',
      'pannirukinga', 'pannuranga', 'evalo', 'evlo', 'romba', 'nalla',
      'illai', 'illana', 'mattum', 'yen', 'edhuku', 'apdi', 'appadi',
      'ippadi', 'oru', 'ethavathu', 'parunga', 'pannanum', 'panniten',
      'theriyala', 'solren', 'mudiyuma', 'seri', 'vanakkam', 'aama'
    ];

    const words = lower.split(/[^a-z0-9_-]+/).filter(Boolean);
    let tanglishWordCount = 0;

    for (const w of words) {
      if (tanglishTokens.includes(w)) {
        tanglishWordCount++;
      } else if (w.endsWith('-ku') || w.endsWith('-la') || w.endsWith('-oda') || (w.endsWith('la') && w.length > 3)) {
        tanglishWordCount++;
      }
    }

    if (tanglishWordCount >= 1 || /\b(na enna|epdi|panrathu|kudu|solla|evlo)\b/.test(lower)) {
      return 'tanglish';
    }

    // 4. Hinglish detection
    const hindiTokens = ['kya', 'kaise', 'hai', 'batao', 'kare', 'karna', 'samjhao', 'mujhe', 'mera', 'hota', 'kahiye', 'namaste'];
    let hindiCount = 0;
    for (const w of words) {
      if (hindiTokens.includes(w)) {
        hindiCount++;
      }
    }
    if (hindiCount >= 2 || /\b(kya hai|kaise kare|batao)\b/.test(lower)) {
      return 'hindi';
    }

    return 'english';
  }

  /**
   * Classifies the query into one or more categories and evaluates context requirements.
   */
  classify(text: string, activeProjectId?: string, activeSubmissionId?: string): ClassificationResult {
    const raw = text.trim();
    const lower = raw.toLowerCase();
    const language = this.detectLanguage(raw);

    const categories: QueryCategory[] = [];
    let userContextType: UserContextType | undefined;

    // 1. Casual Greetings & Conversation
    const casualPatterns = [
      /^(hi|hello|hey|yo|hola|namaste|vanakkam|good morning|good afternoon|good evening|howdy|sup)\b/i,
      /^(how are you|how r u|what's up|whats up|how are things)\b/i,
      /^(thanks|thank you|thx|tq|nandri|dhanyawad|bye|goodbye|cya|see you)\b/i,
    ];
    const isCasualGreeting = casualPatterns.some((pattern) => pattern.test(lower)) && wordsCount(lower) <= 6;

    if (isCasualGreeting) {
      categories.push('CASUAL_CONVERSATION');
      return {
        categories,
        primaryCategory: 'CASUAL_CONVERSATION',
        detectedLanguage: language,
        isCasualGreeting: true,
        requiresProjectContext: false,
        requiresProvalixKB: false,
        requiresGeneralKnowledge: false,
      };
    }

    // 2. Deadlines & Schedule
    const deadlineKeywords = [
      'deadline', 'deadlines', 'when is my deadline', 'what is the deadline',
      'upcoming deadline', 'what should i submit next', 'what is due', 'due this week',
      'last date', 'submission date', 'kadisi thethi', 'eppo submit pannanum'
    ];
    if (deadlineKeywords.some((k) => lower.includes(k))) {
      categories.push('DEADLINE');
      userContextType = 'deadline';
    }

    // 3. Team Management
    const teamKeywords = [
      'my team', 'team captain', 'who is my captain', 'who is my team captain',
      'team members', 'who are my team members', 'my teammates', 'team code',
      'what is my team', 'what classrooms is my team', 'submissions are pending for my team',
      'team invitation', 'en team', 'enga team'
    ];
    if (teamKeywords.some((k) => lower.includes(k))) {
      categories.push('TEAM');
      userContextType = userContextType || 'team';
    }

    // 4. Classroom Enrollment & Status
    const classroomKeywords = [
      'which classroom am i enrolled in', 'my classroom', 'enrolled classroom',
      'classroom status', 'classrooms am i in', 'my classes', 'classroom code',
      'which classroom'
    ];
    if (classroomKeywords.some((k) => lower.includes(k))) {
      categories.push('CLASSROOM');
      userContextType = userContextType || 'classroom';
    }

    // 5. Ranking & Leaderboard
    const rankingKeywords = [
      'what\'s my rank', 'what is my rank', 'my rank', 'my ranking',
      'leaderboard', 'where do i stand', 'class rank', 'rank list'
    ];
    if (rankingKeywords.some((k) => lower.includes(k))) {
      categories.push('RANKING');
      userContextType = userContextType || 'ranking';
    }

    // 6. Notifications
    const notificationKeywords = [
      'notification', 'notifications', 'pending notifications', 'do i have any pending notifications',
      'unread notifications', 'why did i receive this notification', 'alerts', 'my alerts'
    ];
    if (notificationKeywords.some((k) => lower.includes(k))) {
      categories.push('NOTIFICATION');
      userContextType = userContextType || 'notification';
    }

    // 7. Viva Voce & Defense
    const vivaKeywords = [
      'viva status', 'start viva practice', 'viva practice', 'give me viva questions',
      'viva questions for my project', 'viva questions', 'viva defense', 'viva preparation',
      'oral defense', 'viva test', 'practice viva'
    ];
    if (vivaKeywords.some((k) => lower.includes(k))) {
      categories.push('VIVA');
      userContextType = userContextType || 'viva';
    }

    // 8. Plagiarism
    const plagiarismKeywords = [
      'plagiarism status', 'plagiarism similarity', 'plagiarism report',
      'similarity percentage', 'plagiarism deduction', 'why plagiarism',
      'code similarity', 'report similarity'
    ];
    if (plagiarismKeywords.some((k) => lower.includes(k))) {
      categories.push('PLAGIARISM');
      userContextType = userContextType || 'plagiarism';
    }

    // 9. Project Reports
    const reportKeywords = [
      'show my project report status', 'project report status', 'my report status',
      'summarize my latest report', 'summarize my report', 'download report',
      'evaluation report', 'my report'
    ];
    if (reportKeywords.some((k) => lower.includes(k))) {
      categories.push('PROJECT_REPORT');
      userContextType = userContextType || 'project_report';
    }

    // 10. Evaluation & Scores
    const evalKeywords = [
      'current evaluation status', 'explain my current evaluation status', 'my evaluation',
      'what is my project score', 'what is my ai score', 'what is pending in my evaluation',
      'what feedback did i get', 'what should i improve', 'why did i get', 'explain my score',
      'why is my evaluation incomplete', 'is my result published', 'evaluation incomplete',
      'my score', 'my mark', 'my marks', 'en score', 'weakness', 'improvement plan'
    ];
    if (evalKeywords.some((k) => lower.includes(k))) {
      categories.push('EVALUATION');
      userContextType = userContextType || 'evaluation';
    }

    // 11. Personal Project Queries
    const projectKeywords = [
      'my project', 'en project', 'enga project', 'our project', 'project-ku', 'project la',
      'my submission', 'improve my project', 'my project details'
    ];
    if (projectKeywords.some((pk) => lower.includes(pk)) || ((activeProjectId || activeSubmissionId) && (lower.includes('project') || lower.includes('score') || lower.includes('improve')))) {
      if (!categories.includes('PROJECT')) {
        categories.push('PROJECT');
      }
      userContextType = userContextType || 'evaluation';
    }

    // 12. Provalix Platform & Rubric Queries
    const provalixKeywords = [
      'provalix', 'project checker', 'classroom evaluation', 'viva voce', 'faculty evaluation', 'ai evaluation',
      'rubric', 'evaluator', 'prv-', 'verification status', 'how does provalix evaluate',
      'criteria breakdown', 'marks distribution', 'marks epdi divide', 'evaluation guidelines',
      'viva defense guidelines', 'viva guidelines', 'score calculated', 'evaluation system', 'evaluation rules'
    ];
    if (provalixKeywords.some((k) => lower.includes(k))) {
      categories.push('PROVALIX_PLATFORM');
    }

    // 13. Programming & Code Questions
    const programmingKeywords = [
      'python', 'java', 'c++', 'javascript', 'typescript', 'recursion', 'loop', 'loops',
      'array', 'arrays', 'pointer', 'pointers', 'palindrome', 'function', 'class',
      'object', 'inheritance', 'polymorphism', 'syntax', 'compile', 'debugging', 'code',
      'program', 'program kudu', 'code kudu', 'algorithm', 'binary search', 'bubble sort'
    ];
    if (programmingKeywords.some((k) => lower.includes(k))) {
      categories.push('PROGRAMMING');
    }

    // 14. Database / SQL Questions
    const dbKeywords = [
      'dbms', 'sql', 'database', 'normalization', 'normal form', '1nf', '2nf', '3nf',
      'bcnf', 'acid', 'transaction', 'primary key', 'foreign key', 'join', 'joins',
      'indexing', 'query', 'mongodb', 'postgresql', 'mysql', 'relational'
    ];
    if (dbKeywords.some((k) => lower.includes(k))) {
      categories.push('DATABASE');
    }

    // 15. AI / ML Questions
    const aimlKeywords = [
      'ai', 'artificial intelligence', 'machine learning', 'deep learning', 'neural network',
      'overfitting', 'underfitting', 'transformer', 'llm', 'rag', 'dataset', 'nlp',
      'computer vision', 'gradient descent', 'supervised', 'unsupervised', 'cnn', 'rnn'
    ];
    if (aimlKeywords.some((k) => lower.includes(k))) {
      categories.push('AI_ML');
    }

    // 16. Academic / Theoretical Questions
    const academicKeywords = [
      'syllabus', 'semester', 'exam', 'theory', 'definition', 'derivation', 'theorem',
      'operating system', 'os', 'deadlock', 'paging', 'computer networks', 'tcp', 'ip',
      'osi model', 'cryptography'
    ];
    if (academicKeywords.some((k) => lower.includes(k))) {
      categories.push('ACADEMIC');
    }

    // 17. Career & Learning Questions
    const careerKeywords = [
      'career', 'resume', 'cv', 'interview', 'job', 'internship', 'roadmap',
      'how to become', 'salary', 'placement', 'preparation'
    ];
    if (careerKeywords.some((k) => lower.includes(k))) {
      categories.push('CAREER');
    }

    // 18. Technical Concepts
    const technicalKeywords = [
      'api', 'rest', 'graphql', 'microservice', 'docker', 'kubernetes', 'git', 'github',
      'cloud', 'aws', 'azure', 'devops', 'ci/cd', 'frontend', 'backend', 'full stack'
    ];
    if (technicalKeywords.some((k) => lower.includes(k))) {
      categories.push('TECHNICAL');
    }

    // Fallback if none matched
    if (categories.length === 0) {
      categories.push('GENERAL');
    }

    const primaryCategory = categories[0];
    const requiresProjectContext = Boolean(userContextType) || categories.includes('PROJECT') || categories.includes('EVALUATION');
    const requiresProvalixKB = categories.includes('PROVALIX_PLATFORM') ||
      (categories.includes('PROJECT') && !hasSpecificPersonalKeywords(lower));
    const requiresGeneralKnowledge = categories.some((c) =>
      ['TECHNICAL', 'PROGRAMMING', 'DATABASE', 'AI_ML', 'ACADEMIC', 'CAREER', 'GENERAL'].includes(c)
    );

    return {
      categories,
      primaryCategory,
      detectedLanguage: language,
      isCasualGreeting: false,
      requiresProjectContext,
      requiresProvalixKB,
      requiresGeneralKnowledge,
      userContextType,
    };
  }
}

function wordsCount(str: string): number {
  return str.split(/\s+/).filter(Boolean).length;
}

function hasSpecificPersonalKeywords(lower: string): boolean {
  return lower.includes('my score') || lower.includes('my mark') || lower.includes('why did i get') || lower.includes('my evaluation');
}

export const queryClassifier = new QueryClassifier();
