import { QueryCategory, SupportedLanguage, PrimaryIntent } from './chatbotTypes';

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
  detectedIntent: PrimaryIntent;
  categories: QueryCategory[];
  primaryCategory: QueryCategory;
  detectedLanguage: SupportedLanguage;
  isCasualGreeting: boolean;
  isFollowUp: boolean;
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
   * Classifies user question into primary intent (PROVALIX, PROJECT, PROGRAMMING, ACADEMIC, GENERAL, FOLLOW_UP)
   * and maps relevant categories.
   */
  classify(
    text: string,
    activeProjectId?: string,
    activeSubmissionId?: string,
    history?: Array<{ role: string; message: string }>
  ): ClassificationResult {
    const raw = text.trim();
    const lower = raw.toLowerCase();
    const language = this.detectLanguage(raw);

    const categories: QueryCategory[] = [];
    let userContextType: UserContextType | undefined;
    let detectedIntent: PrimaryIntent = 'GENERAL';
    let isFollowUp = false;

    // 1. Casual Greetings & Social Exchanges
    const casualPatterns = [
      /^(hi|hello|hey|yo|hola|namaste|vanakkam|good morning|good afternoon|good evening|howdy|sup)\b/i,
      /^(how are you|how r u|what's up|whats up|how are things)\b/i,
      /^(thanks|thank you|thx|tq|nandri|dhanyawad|bye|goodbye|cya|see you)\b/i,
    ];
    const isCasualGreeting = casualPatterns.some((pattern) => pattern.test(lower)) && wordsCount(lower) <= 6;

    if (isCasualGreeting) {
      categories.push('CASUAL_CONVERSATION');
      return {
        detectedIntent: 'GENERAL',
        categories,
        primaryCategory: 'CASUAL_CONVERSATION',
        detectedLanguage: language,
        isCasualGreeting: true,
        isFollowUp: false,
        requiresProjectContext: false,
        requiresProvalixKB: false,
        requiresGeneralKnowledge: false,
      };
    }

    // 2. Check for FOLLOW_UP query
    // A query is a follow-up when it refers to an immediate preceding topic without introducing a standalone subject.
    const hasHistory = Array.isArray(history) && history.length > 0;
    const isExplicitFollowUpPhrase =
      /\b(its|it|their)\s+(advantages|disadvantages|benefits|features|pros|cons|limitation|limitations|syntax|use cases?|working|architecture|applications)\b/i.test(lower) ||
      /\b(what are its|what is its|what's its|why is it|how does it work|how is it used)\b/i.test(lower) ||
      /\b(give\s+(me\s+)?(an?\s+)?example|give\s+(me\s+)?(an?\s+)?udharanam|can you give an example|give example)\b/i.test(lower) ||
      /\b(sql\s+(la\s+)?(explain|sollu|kudu)|python\s+(la\s+)?(explain|sollu|kudu)|tamil\s+la\s+sollu)\b/i.test(lower) ||
      /\b(tell me more|explain more|elaborate|further details|what else|and what about|how to fix (this|it)|how to implement (this|it))\b/i.test(lower);

    // If query has its own explicit standalone topic (e.g., "What is normalization in DBMS?", "What is TCP?", "Explain Python decorators", "What is my project score?"),
    // it is NOT a follow-up, even if there is prior history!
    const hasStandaloneSubject =
      /\b(what is react|what is normalization|what is dbms|what is tcp|explain python decorators|python decorators|what is my project score|explain my score|why did i lose marks)\b/i.test(lower) ||
      (/\b(react|dbms|normalization|tcp|udp|osi|python decorator|cloud computing)\b/i.test(lower) && wordsCount(lower) >= 3);

    if (hasHistory && isExplicitFollowUpPhrase && !hasStandaloneSubject) {
      isFollowUp = true;
      detectedIntent = 'FOLLOW_UP';
    }

    // 3. User Personal Project Queries (PROJECT)
    const personalProjectPatterns = [
      /\b(my project|our project|en project|enga project|project-ku|project la)\b/i,
      /\b(my submission|en submission|my report|project report status|summarize my (latest\s+)?report)\b/i,
      /\b(my score|my marks?|en score|en marks?|my evaluation|current evaluation status|what is my project score|what is my ai score)\b/i,
      /\b(why did i (get|lose)|lose marks?|lost marks?|where did i lose|deducted marks?|why plagiarism)\b/i,
      /\b(why did i lose marks in code quality|code quality marks?|lose marks in code quality)\b/i,
      /\b(what feedback did i get|what should i improve|weakness|improvement plan|improve my project)\b/i,
      /\b(why is my evaluation incomplete|is my result published)\b/i,
      /\b(viva status|start viva practice|give me viva questions|viva questions for my project|viva practice)\b/i,
      /\b(deadlines?|when is my deadline|upcoming deadline|what should i submit next|due this week|submission date|when to submit)\b/i,
      /\b(my team|team captain|who is my captain|who is my team captain|team members|who are my team members|my teammates)\b/i,
      /\b(which classroom am i enrolled in|my classroom|enrolled classroom|classrooms am i in)\b/i,
      /\b(what's my rank|what is my rank|my rank|my ranking|where do i stand|class rank|leaderboard)\b/i,
      /\b(pending notifications|do i have any pending notifications|unread notifications|why did i receive this notification)\b/i,
      /\b(plagiarism status|plagiarism similarity|plagiarism report|similarity percentage|plagiarism deduction)\b/i,
    ];

    const isProjectQuery = personalProjectPatterns.some((pattern) => pattern.test(lower));

    if (isProjectQuery && !isFollowUp) {
      detectedIntent = 'PROJECT';
      categories.push('PROJECT');

      if (lower.includes('deadline') || lower.includes('last date') || lower.includes('submit next')) {
        categories.push('DEADLINE');
        userContextType = 'deadline';
      } else if (lower.includes('team') || lower.includes('captain') || lower.includes('teammate')) {
        categories.push('TEAM');
        userContextType = 'team';
      } else if (lower.includes('classroom')) {
        categories.push('CLASSROOM');
        userContextType = 'classroom';
      } else if (lower.includes('rank') || lower.includes('standing') || lower.includes('leaderboard')) {
        categories.push('RANKING');
        userContextType = 'ranking';
      } else if (lower.includes('notification') || lower.includes('alert')) {
        categories.push('NOTIFICATION');
        userContextType = 'notification';
      } else if (lower.includes('viva') || lower.includes('defense') || lower.includes('oral')) {
        categories.push('VIVA');
        userContextType = 'viva';
      } else if (lower.includes('plagiarism') || lower.includes('similarity')) {
        categories.push('PLAGIARISM');
        userContextType = 'plagiarism';
      } else if (lower.includes('report')) {
        categories.push('PROJECT_REPORT');
        userContextType = 'project_report';
      } else {
        categories.push('EVALUATION');
        userContextType = 'evaluation';
      }
    }

    // 4. Provalix Platform & Rubric Queries (PROVALIX)
    const provalixKeywords = [
      'provalix', 'project checker', 'classroom evaluation', 'viva voce guidelines', 'viva defense guidelines',
      'viva defense', 'viva guidelines', 'viva', 'oral defense',
      'rubric', 'prv-', 'verification status', 'how does provalix evaluate',
      'criteria breakdown', 'marks distribution', 'marks epdi divide', 'evaluation guidelines',
      'score calculated', 'evaluation system', 'evaluation rules'
    ];
    const isProvalixPlatform =
      !isProjectQuery &&
      provalixKeywords.some((k) => lower.includes(k)) &&
      !lower.includes('my project') &&
      !lower.includes('my score');

    if (isProvalixPlatform && !isFollowUp) {
      detectedIntent = 'PROVALIX';
      categories.push('PROVALIX_PLATFORM');
    }

    // 5. Programming & Code Questions (PROGRAMMING)
    const programmingKeywords = [
      'react', 'react.js', 'vue', 'angular', 'next.js', 'node', 'nodejs', 'express',
      'python', 'java', 'c++', 'javascript', 'typescript', 'golang', 'rust',
      'decorator', 'decorators', 'closure', 'closures', 'promise', 'async', 'await',
      'recursion', 'recursive', 'loop', 'loops', 'array', 'arrays', 'pointer', 'pointers',
      'palindrome', 'function', 'class', 'object', 'inheritance', 'polymorphism',
      'syntax', 'compile', 'debugging', 'code', 'program', 'program kudu', 'code kudu',
      'algorithm', 'binary search', 'bubble sort', 'quicksort', 'merge sort',
      'git', 'github', 'frontend', 'backend', 'rest api', 'rest', 'api', 'apis',
      'microservice', 'microservices', 'docker', 'kubernetes', 'cloud'
    ];
    const isProgramming =
      !isProjectQuery &&
      !isProvalixPlatform &&
      programmingKeywords.some((k) => lower.includes(k));

    if (isProgramming && !isFollowUp) {
      detectedIntent = 'PROGRAMMING';
      categories.push('PROGRAMMING');
      categories.push('TECHNICAL');
    }

    // 6. Academic & Theoretical Questions (ACADEMIC)
    const academicKeywords = [
      'dbms', 'sql', 'database', 'normalization', 'normal form', '1nf', '2nf', '3nf', 'bcnf',
      'acid', 'transaction', 'primary key', 'foreign key', 'join', 'joins', 'indexing',
      'relational', 'rdbms', 'tcp', 'udp', 'ip', 'tcp/ip', 'osi model', 'osi 7 layers',
      'computer networks', 'socket', 'handshake', 'routing', 'dns', 'http', 'https',
      'operating system', 'os', 'deadlock', 'paging', 'segmentation', 'virtual memory',
      'process scheduling', 'semaphore', 'mutex', 'cryptography', 'rsa', 'theory',
      'derivation', 'theorem', 'syllabus', 'semester', 'exam', 'machine learning',
      'overfitting', 'underfitting', 'neural network', 'deep learning', 'cnn', 'rnn'
    ];
    const isAcademic =
      !isProjectQuery &&
      !isProvalixPlatform &&
      !isProgramming &&
      academicKeywords.some((k) => lower.includes(k));

    if (isAcademic && !isFollowUp) {
      detectedIntent = 'ACADEMIC';
      if (lower.includes('dbms') || lower.includes('database') || lower.includes('normalization') || lower.includes('sql') || lower.includes('acid') || lower.includes('join')) {
        categories.push('DATABASE');
      } else if (/\b(ai|ml)\b/i.test(lower) || lower.includes('machine learning') || lower.includes('overfitting') || lower.includes('neural')) {
        categories.push('AI_ML');
      } else {
        categories.push('ACADEMIC');
        categories.push('TECHNICAL');
      }
    }

    // 7. Fallback to GENERAL if still unassigned
    if (detectedIntent === 'GENERAL' && !isCasualGreeting && !isFollowUp) {
      if (lower.includes('career') || lower.includes('resume') || lower.includes('interview') || lower.includes('job')) {
        categories.push('CAREER');
      } else if (lower.includes('api') || lower.includes('cloud') || lower.includes('docker') || lower.includes('microservice')) {
        categories.push('TECHNICAL');
        detectedIntent = 'PROGRAMMING';
      } else {
        categories.push('GENERAL');
      }
    }

    // Determine context needs
    // CRITICAL RULE: Project context is ONLY required if detectedIntent is PROJECT or FOLLOW_UP to a project question!
    // For "What is React?", "What is TCP?", "What is normalization in DBMS?", requiresProjectContext is strictly FALSE!
    const requiresProjectContext = detectedIntent === 'PROJECT' || Boolean(userContextType);
    const requiresProvalixKB = detectedIntent === 'PROVALIX' || categories.includes('PROVALIX_PLATFORM');
    const requiresGeneralKnowledge = ['PROGRAMMING', 'ACADEMIC', 'GENERAL'].includes(detectedIntent);

    const primaryCategory = categories[0] || 'GENERAL';

    return {
      detectedIntent,
      categories,
      primaryCategory,
      detectedLanguage: language,
      isCasualGreeting,
      isFollowUp,
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

export const queryClassifier = new QueryClassifier();
