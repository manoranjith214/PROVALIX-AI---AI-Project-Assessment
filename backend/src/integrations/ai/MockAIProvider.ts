import {
  AIProvider,
  ProjectCheckerEvaluationResult,
  ClassroomAIEvaluationResult,
  ImprovementItem,
  GeneratedVivaQuestion,
} from './AIProvider.interface';

export class MockAIProvider implements AIProvider {
  private modelVersion = 'Provalix-AI-Evaluator-v1.2-Mock';

  async evaluateProject(projectData: any, plagiarismData?: any): Promise<ProjectCheckerEvaluationResult> {
    // Generate realistic, deterministic criteria evaluation based on project details
    const hasGithub = Boolean(projectData.githubUrl);
    const hasDemo = Boolean(projectData.liveDemoUrl || projectData.demoUrl);
    const techCount = Array.isArray(projectData.technologies) ? projectData.technologies.length : 3;

    // Criteria breakdown matching exact requirements (Total = 100)
    // Problem Definition = 15
    const problemDefinitionScore = Math.min(15, 12 + (projectData.problemStatement ? 2 : 0));
    // Innovation & Novelty = 20
    const innovationNoveltyScore = Math.min(20, 16 + (projectData.innovation ? 3 : 0));
    // Technical Implementation = 20
    const technicalImplementationScore = Math.min(20, 14 + (hasGithub ? 3 : 0) + (techCount > 3 ? 2 : 0));
    // Functionality = 15
    const functionalityScore = Math.min(15, 11 + (hasDemo ? 3 : 0));
    // Code Quality = 10
    const codeQualityScore = 8.5;
    // Documentation = 10
    const documentationScore = Math.min(10, 7.5 + (projectData.description ? 1.5 : 0));
    // Overall Quality = 10
    const overallQualityScore = 8.0;

    let totalScore =
      problemDefinitionScore +
      innovationNoveltyScore +
      technicalImplementationScore +
      functionalityScore +
      codeQualityScore +
      documentationScore +
      overallQualityScore;

    // Apply plagiarism penalty if plagiarism data provided
    if (plagiarismData && plagiarismData.deduction) {
      totalScore = Math.max(0, totalScore - plagiarismData.deduction);
    }
    totalScore = Math.round(totalScore * 10) / 10;

    const strengths = [
      'Comprehensive problem statement addressing real-world pain points clearly',
      'Modern and scalable technology stack choice',
      'Well-structured architecture with clear separation of concerns',
      'Effective prototype validation and user-centric features',
    ];

    const weaknesses = [
      'Automated test coverage can be expanded to include edge-case integrations',
      'API rate limiting and production security headers should be systematically enforced',
      'Performance benchmarking under high concurrent traffic is currently missing',
    ];

    const technicalAnalysis =
      'The project displays solid engineering principles. The core data models and service abstractions are properly decoupled. Modern conventions are followed consistently.';

    const codeAnalysis =
      'Modular TypeScript/JavaScript design with structured error handling. Functions maintain clean single responsibilities, though additional unit tests would elevate code confidence.';

    const documentationAnalysis =
      'Clear project overview, requirements, and setup instructions. Recommend adding API endpoint schemas and architecture diagrams for complete developer handoff.';

    const actionableSuggestions = [
      'Implement automated integration tests for critical workflows using Jest or Vitest.',
      'Add asynchronous logging and telemetry monitoring for production readiness.',
      'Complete OpenAPI/Swagger documentation for all external-facing endpoints.',
    ];

    const improvementPlan: ImprovementItem[] = [
      {
        area: 'Test Coverage',
        suggestion: 'Increase unit and integration test coverage to >= 85% across critical services.',
        priority: 'High',
      },
      {
        area: 'Security Hardening',
        suggestion: 'Implement strict CSP headers, input validation schemas, and brute-force protection on all mutation endpoints.',
        priority: 'Medium',
      },
      {
        area: 'Benchmarking & Observability',
        suggestion: 'Set up automated performance testing with k6 or Artillery to evaluate system load limits.',
        priority: 'Low',
      },
    ];

    const summary = `Evaluated "${projectData.title || 'Student Project'}". Demonstrates strong novelty and functional capability with an overall score of ${totalScore}/100.`;

    return {
      overallScore: totalScore,
      criteria: {
        problemDefinition: {
          name: 'Problem Definition',
          maxScore: 15,
          obtainedScore: problemDefinitionScore,
          feedback: 'Well-articulated problem scope with clearly identified target beneficiaries.',
        },
        innovationNovelty: {
          name: 'Innovation & Novelty',
          maxScore: 20,
          obtainedScore: innovationNoveltyScore,
          feedback: 'Innovative combination of automation and user-focused workflows.',
        },
        technicalImplementation: {
          name: 'Technical Implementation',
          maxScore: 20,
          obtainedScore: technicalImplementationScore,
          feedback: 'Robust modular structure with modern programming patterns.',
        },
        functionality: {
          name: 'Functionality',
          maxScore: 15,
          obtainedScore: functionalityScore,
          feedback: 'Core functional requirements achieved and verifiable in working demo.',
        },
        codeQuality: {
          name: 'Code Quality',
          maxScore: 10,
          obtainedScore: codeQualityScore,
          feedback: 'Clean indentation, descriptive variable naming, and predictable error handling.',
        },
        documentation: {
          name: 'Documentation',
          maxScore: 10,
          obtainedScore: documentationScore,
          feedback: 'Structured README and technical setup instructions provided.',
        },
        overallQuality: {
          name: 'Overall Project Quality',
          maxScore: 10,
          obtainedScore: overallQualityScore,
          feedback: 'Polished presentation and solid execution across all evaluation dimensions.',
        },
      },
      strengths,
      weaknesses,
      technicalAnalysis,
      codeAnalysis,
      documentationAnalysis,
      actionableSuggestions,
      improvementPlan,
      summary,
      aiModel: this.modelVersion,
    };
  }

  async evaluateClassroomSubmission(submissionData: any, plagiarismData?: any): Promise<ClassroomAIEvaluationResult> {
    // Classroom AI score is strictly OUT OF 50
    // Base score between 38 and 46 out of 50
    const rawScore = 44.5;
    const codeSim = plagiarismData?.codeSimilarity ?? 8.5;
    const reportSim = plagiarismData?.reportSimilarity ?? 11.2;
    const overallSim = Math.round(((codeSim + reportSim) / 2) * 10) / 10;

    // Plagiarism deduction applied directly into AI /50
    let deduction = 0;
    let plagiarismStatus: 'Low' | 'Moderate' | 'High' = 'Low';
    let plagiarismReason: string | undefined = undefined;

    if (overallSim > 40) {
      plagiarismStatus = 'High';
      deduction = 15;
      plagiarismReason = 'High similarity detected with public student repositories and documentation.';
    } else if (overallSim > 20) {
      plagiarismStatus = 'Moderate';
      deduction = 5;
      plagiarismReason = 'Moderate template code similarity identified in boilerplate sections.';
    }

    const finalScore = Math.max(0, Math.round((rawScore - deduction) * 10) / 10);

    const feedback =
      'The project delivers comprehensive problem fulfillment with clean execution. Plagiarism check passed within acceptable academic thresholds.';

    const improvementPlan: ImprovementItem[] = [
      {
        area: 'Architecture Polish',
        suggestion: 'Further decouple business logic from presentation controllers.',
        priority: 'High',
      },
      {
        area: 'Test Automation',
        suggestion: 'Add automated end-to-end integration tests before submission defense.',
        priority: 'Medium',
      },
    ];

    return {
      rawScore,
      codeSimilarity: codeSim,
      reportSimilarity: reportSim,
      overallSimilarity: overallSim,
      deduction,
      finalScore,
      plagiarismStatus,
      plagiarismReason,
      matchedSources: plagiarismData?.matchedSources || ['github.com/templates/starter-kit'],
      feedback,
      improvementPlan,
      isDemoData: true,
    };
  }

  async generateFeedback(context: string, score: number): Promise<string> {
    return `Automated evaluation summary for score ${score}: Strong architectural foundation with verified functionality. Context: ${context.slice(0, 50)}...`;
  }

  async generateImprovementPlan(weaknesses: string[]): Promise<ImprovementItem[]> {
    return weaknesses.map((w, i) => ({
      area: `Area ${i + 1}`,
      suggestion: `Address: ${w}`,
      priority: i === 0 ? 'High' : 'Medium',
    }));
  }

  async generateResponse(
    userMessage: string,
    context?: string,
    conversationHistory?: Array<{ role: string; message: string }>,
    detectedLanguage?: string
  ): Promise<string> {
    const raw = userMessage.trim();
    const q = raw.toLowerCase();

    // 0. Privacy & Security Refusal Guard
    const forbiddenPatterns = [
      /another student/i,
      /other student/i,
      /all users'? project/i,
      /database password/i,
      /db password/i,
      /jwt secret/i,
      /secret key/i,
      /system admin mode/i,
    ];
    if (forbiddenPatterns.some((p) => p.test(raw))) {
      return 'Privacy & Security Restriction: I cannot disclose credentials, secret keys, or other students\' private project and evaluation records. All access is strictly guarded by Provalix authorization policies.';
    }

    // 1. Language Detection & Style matching
    const isExplicitEnglish =
      detectedLanguage === 'english' ||
      /\b(in english|english-la|english la|simple english|explain in english|only english)\b/i.test(q);

    const isExplicitTamil =
      !isExplicitEnglish &&
      (detectedLanguage === 'tamil' ||
        /[\u0B80-\u0BFF]/.test(raw) ||
        /\b(tamil-?la|tamilil|in tamil)\b/i.test(q) ||
        q.includes('தமிழ்ல') ||
        q.includes('தமிழில்'));

    const isExplicitTanglish =
      !isExplicitEnglish &&
      !isExplicitTamil &&
      (detectedLanguage === 'tanglish' ||
        /\b(tanglish(\s*la)?|in tanglish)\b/i.test(q));

    const isTamilScript = isExplicitTamil;

    const isHindi =
      !isExplicitEnglish &&
      !isTamilScript &&
      (detectedLanguage === 'hindi' ||
        /[\u0900-\u097F]/.test(raw) ||
        /\b(kya hai|kaise|batao|samjhao|in hindi|hindi me)\b/i.test(q));

    const isTanglish =
      !isExplicitEnglish &&
      !isTamilScript &&
      !isHindi &&
      (isExplicitTanglish ||
        /\b(la|epdi|eppadi|enna|solla|sollu|sollunga|panrathu|panlam|pannalam|kudu|thanga|irukku|iruku|theriyuma|evalo|evlo|romba|nalla|illai|illana|edhuku|pannanum|panniten|solren|seri|vanakkam|purila|pannu)\b/i.test(
          q
        ) ||
        q.includes('na enna') ||
        q.includes('-ku'));

    // 2. Casual Conversation (greetings, thanks, farewells)
    const isGreeting = /^(hi|hello|hey|yo|namaste|vanakkam|good morning|good evening)\b/i.test(q) && q.split(/\s+/).length <= 4;
    const isThanks = /^(thanks|thank you|thx|tq|nandri|dhanyawad)\b/i.test(q);
    const isBye = /^(bye|goodbye|see you|cya)\b/i.test(q);

    if (isGreeting) {
      if (isTanglish) {
        return 'Vanakkam! 👋 Ungaluku project, coding, illa Provalix platform-la enna help venum?';
      }
      if (isTamilScript) {
        return 'வணக்கம்! 👋 நான் உங்களுக்கு எவ்வாறு உதவ முடியும்? திட்டப்பணி, குறியீட்டு முறை அல்லது மதிப்பீடு குறித்து கேட்கலாம்.';
      }
      if (isHindi) {
        return 'नमस्ते! 👋 मैं आपकी कैसे सहायता कर सकता हूँ? प्रोजेक्ट, कोडिंग या प्रोवालिक्स के बारे में पूछें।';
      }
      return 'Hi! 👋 How can I help you today?';
    }

    if (isThanks) {
      if (isTanglish) {
        return 'Romba thanks! Ungaluku innoru doubt irundha eppo vena kakkalam. All the best for your project!';
      }
      if (isTamilScript) {
        return 'மிக்க நன்றி! உங்களுக்கு மேலும் ஏதேனும் சந்தேகங்கள் இருந்தால் எப்போதும் கேட்கலாம். உங்கள் திட்டப்பணிக்கு வாழ்த்துகள்!';
      }
      return 'You\'re very welcome! Let me know if you need anything else for your project or evaluations.';
    }

    if (isBye) {
      if (isTanglish) {
        return 'Bye! Project-ah nalla pannunga. Have a great day!';
      }
      if (isTamilScript) {
        return 'விடைபெறுகிறேன்! உங்கள் திட்டப்பணியை சிறப்பாகச் செய்யுங்கள். இனிய நாளாக அமையட்டும்!';
      }
      return 'Goodbye! Best of luck with your project development and academic endeavors.';
    }

    // 3. Multi-turn Follow-up Context Resolution
    const historyList = conversationHistory || [];
    const prevUserMessages = historyList.filter((m) => m.role === 'user').map((m) => m.message.toLowerCase());

    const isAskingExample = /\b(example|udharanam|sample|give example|sql la sollu|sql la explain|sql la kudu)\b/i.test(q);
    const prevDiscussedNormalization = prevUserMessages.some((m) => m.includes('normalization') || m.includes('dbms'));
    const prevDiscussedAgri = prevUserMessages.some((m) => m.includes('agriculture') || m.includes('farming') || m.includes('crop'));

    if (isAskingExample && prevDiscussedNormalization) {
      if (q.includes('sql') || isTanglish) {
        return `SQL-la Database Normalization Example:\n\n\`\`\`sql\n-- 1. Unnormalized single table with repeated courses is decomposed:\nCREATE TABLE Students (\n    student_id INT PRIMARY KEY,\n    student_name VARCHAR(100) NOT NULL\n);\n\nCREATE TABLE Courses (\n    course_id INT PRIMARY KEY,\n    course_title VARCHAR(100) NOT NULL\n);\n\nCREATE TABLE Enrollments (\n    student_id INT REFERENCES Students(student_id),\n    course_id INT REFERENCES Courses(course_id),\n    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n    PRIMARY KEY (student_id, course_id)\n);\n\`\`\`\n\nIppo student data and course data separate tables-la store aagirukku. Duplicate data reduce aagi 3NF achieve aagum!`;
      }
      if (isTamilScript) {
        return `SQL-ல் Database Normalization உதாரணம்:\n\n\`\`\`sql\n-- சீராக்கப்பட்ட அட்டவணைகள் (Normalized Tables):\nCREATE TABLE Students (\n    student_id INT PRIMARY KEY,\n    student_name VARCHAR(100) NOT NULL\n);\n\nCREATE TABLE Courses (\n    course_id INT PRIMARY KEY,\n    course_title VARCHAR(100) NOT NULL\n);\n\nCREATE TABLE Enrollments (\n    student_id INT REFERENCES Students(student_id),\n    course_id INT REFERENCES Courses(course_id),\n    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n    PRIMARY KEY (student_id, course_id)\n);\n\`\`\`\n\nமாணவர் விவரங்களும் பாட விவரங்களும் தனித்தனி அட்டவணைகளில் சேமிக்கப்பட்டு 3NF நிலை அடையப்படுகிறது!`;
      }
      return `Here is a concrete example of Database Normalization (converting to 3NF):\n\nSuppose you have an unnormalized record:\n\`StudentCourse(student_id, student_name, course_id, course_title)\`\n\nIn 3NF, this decomposes into:\n1. \`Students(student_id, student_name)\`\n2. \`Courses(course_id, course_title)\`\n3. \`Enrollments(student_id, course_id)\`\n\nThis eliminates redundancy and prevents insertion, update, and deletion anomalies.`;
    }

    if ((q.includes('algorithm') || q.includes('what algorithm')) && prevDiscussedAgri) {
      if (isTamilScript) {
        return `உங்கள் ஸ்மார்ட் விவசாயத் திட்டத்திற்கு (Smart Agriculture) மிகவும் பயனுள்ள AI அல்காரிதம்கள்:\n\n1. **Random Forest / XGBoost**: மண் நிலை மற்றும் சென்சார் உள்ளீடுகள் மூலம் பயிர் விளைச்சலை கணிக்க சிறந்தது.\n2. **YOLOv8 / MobileNet (CNN)**: பயிர் நோய்களை படங்களின் மூலம் நிகழ்நேரத்தில் கண்டறிய ஏற்றது.\n3. **LSTM / GRU**: வானிலை முன்னறிவிப்பு மற்றும் தானியங்கி பாசன முறைக்கு உகந்தது.`;
      }
      if (isTanglish) {
        return `Unga smart agriculture project-ku suitable aana algorithms:\n\n1. **Random Forest / XGBoost**: Sensor inputs use panni crop yield predict panna best.\n2. **YOLOv8 / MobileNet (CNN)**: Camera images-la plant diseases identify panna recommended.\n3. **LSTM / GRU**: Weather forecast and irrigation scheduling-ku ideal!`;
      }
      return `For your smart agriculture project, here are the most effective algorithms based on your domain:\n\n1. **Random Forest / XGBoost**: Optimal for crop yield prediction and soil condition classification using sensor inputs (moisture, temperature, pH).\n2. **YOLOv8 / MobileNet (CNN)**: Recommended for real-time plant disease detection and pest identification from camera images with low compute overhead.\n3. **LSTM / GRU**: Ideal for weather forecasting and automated irrigation scheduling based on time-series telemetry.\n\nWould you like an architecture recommendation or sample model code for any of these?`;
    }

    // 4. Viva Voce Preparation Guidance & Practice Simulation
    if (q.includes('viva') || q.includes('defense') || q.includes('oral')) {
      if (q.includes('start viva practice') || q.includes('practice viva') || q.includes('viva questions for my project') || q.includes('ask technical questions')) {
        if (isTamilScript) {
          return `உங்கள் திட்டப்பணிக்கான நேரடி Viva Voce பயிற்சி வினாக்கள் (மொத்தம் 5 வினாக்கள்):\n\n### 1. Problem Understanding (5 மதிப்பெண்கள்)\n- உங்கள் திட்டத்தின் முதன்மை நோக்கம் என்ன, இது நிஜ உலகின் எந்த குறிப்பிட்ட சிக்கலை தீர்க்கிறது?\n\n### 2. Technical Implementation (5 மதிப்பெண்கள்)\n- கணினி கட்டமைப்பு மற்றும் தரவு ஓட்டம் (data flow) குறித்து விளக்குக. API மற்றும் தரவுத்தளத்தை எவ்வாறு இணைத்துள்ளீர்கள்?\n\n### 3. Technology / Algorithm Choice (5 மதிப்பெண்கள்)\n- இந்த குறிப்பிட்ட தொழில்நுட்ப அடுக்கை (stack) நீங்கள் ஏன் தேர்வு செய்தீர்கள்? மாற்று வழிகளுடன் ஒப்பிடுகையில் இதன் சாதகங்கள் என்ன?\n\n### 4. Feature / Internal Working (5 மதிப்பெண்கள்)\n- உங்கள் திட்டத்தின் முதன்மை அம்சத்தின் முழுமையான வாழ்க்கைச் சுழற்சியை (lifecycle) விளக்குக.\n\n### 5. Scenario / Challenge / Failure Handling (5 மதிப்பெண்கள்)\n- அதிக பணிச்சுமை (high traffic) அல்லது பிணையத் தோல்வியின் போது கணினி எவ்வாறு பாதுகாப்பாக செயல்படுகிறது?\n\n*பயிற்சி முறை: முதல் வினாவிற்கான உங்கள் பதிலை தட்டச்சு செய்யுங்கள்; நான் அதற்கான விரிவான மதிப்பாய்வையும் வழிகாட்டுதலையும் வழங்குவேன்.*`;
        }
        if (isTanglish) {
          return `Unga project-kaga targeted Viva Voce practice session (Total 5 Questions):\n\n### 1. Problem Understanding (5 Marks)\n- Unga problem statement context-la, endha real-world bottleneck-ah unga application eliminate pannudhu?\n\n### 2. Technical Implementation (5 Marks)\n- Component hierarchy and data flow explain pannunga. State decoupling epdi implement pannirukinga?\n\n### 3. Technology / Algorithm Choice (5 Marks)\n- En intha specific tech stack choose panninga? Concurrency and latency trade-offs enna?\n\n### 4. Feature / Internal Working (5 Marks)\n- Primary operational feature-oda step-by-step lifecycle explain pannunga.\n\n### 5. Scenario / Challenge / Failure Handling (5 Marks)\n- High concurrent load or network outage varumbodhu system epdi gracefully failover handle pannum?\n\n*Practice Note: 1st question-ku unga answer-ah type pannunga; naan feedback and guidance tharen!*`;
        }
        return `Here is your targeted 5-Question Viva Voce Practice Session:\n\n### 1. Problem Understanding (5 Marks)\n- What specific real-world problem does your application eliminate, and who are your core stakeholders?\n\n### 2. Technical Implementation (5 Marks)\n- Walk through your component hierarchy and architectural data flow. How is state decoupled from API mutation endpoints?\n\n### 3. Technology / Algorithm Choice (5 Marks)\n- Why did you select your specific stack? What architectural trade-offs were evaluated regarding latency, storage, or concurrency?\n\n### 4. Feature / Internal Working (5 Marks)\n- Detail the step-by-step transaction lifecycle of your primary feature from user trigger to database persistence.\n\n### 5. Scenario / Challenge / Failure Handling (5 Marks)\n- Under unexpected network latency, server crash, or high concurrent load, how does your system fail gracefully?\n\n*Practice Mode: Reply with your answer to Question 1, and I will evaluate your response with constructive feedback.*`;
      }

      if (context && (context.includes('Project Details:') || context.includes('Latest Classroom Submission:'))) {
        if (isTamilScript) {
          return `உங்கள் திட்டப்பணிக்கான Viva வழிகாட்டுதல் விவரங்கள் கீழே கொடுக்கப்பட்டுள்ளன:\n\n${context}\n\nViva 25 மதிப்பெண்களைக் கொண்டுள்ளது (5 வினாக்கள் x 5 மதிப்பெண்கள்). மாதிரி வினாக்களைப் பெற "Start viva practice" என்று கேட்கவும்!`;
        }
        if (isTanglish) {
          return `Unga project viva status and context idho:\n\n${context}\n\nViva total 25 marks (5 questions x 5 marks). Practice start panna "Start viva practice" nu sollunga!`;
        }
        return `Here is your Viva Voce guidance based on your project:\n\n${context}\n\nViva defense contributes 25 marks across 5 standardized question categories (5 marks each). Ask "Start viva practice" to begin simulated oral defense questions!`;
      }

      if (isTamilScript) {
        return `Viva Voce வழிகாட்டுதல்கள்:\n- இறுதி வகுப்பறை மதிப்பெண்ணில் Viva 25 மதிப்பெண்களைக் கொண்டுள்ளது.\n- 5 வினாப் பிரிவுகள் (ஒவ்வொன்றும் 5 மதிப்பெண்கள்):\n  1. Problem Understanding\n  2. Technical Implementation\n  3. Technology / Algorithm Choice\n  4. Feature / Internal Working\n  5. Scenario / Challenge / Failure Handling\n\n*குறிப்பு: AI பரிந்துரைகள் மாதிரிப் பயிற்சிக்கானவை மட்டுமே.*`;
      }
      if (isTanglish) {
        return `Viva Voce Defense Guidelines:\n- Viva-ku 25 marks allocate aagirukku.\n- 5 standardized question categories irukku (each 5 marks):\n  1. Problem Understanding\n  2. Technical Implementation\n  3. Technology / Algorithm Choice\n  4. Feature / Internal Working\n  5. Scenario / Challenge / Failure Handling\n\n*Practice Note: AI suggestions practice guidance mattum dhaan.*`;
      }
      return `Viva Voce Defense Guidelines:\n- Viva contributes 25 marks toward your final classroom score.\n- It consists of 5 standardized question categories (5 marks each):\n  1. Problem Understanding\n  2. Technical Implementation\n  3. Technology / Algorithm Choice\n  4. Feature / Internal Working\n  5. Scenario / Challenge / Failure Handling\n\n*Practice Note: AI suggestions provide practice guidance only and do not alter official evaluation marks.*`;
    }

    // 5. Deadlines & Schedule
    if (q.includes('deadline') || q.includes('when is my') || q.includes('submit next') || q.includes('due this week')) {
      if (context && context.includes('Upcoming Classroom Deadlines:')) {
        return `${context}\n\nMake sure to review submission requirements and complete all deliverables before the stated deadlines!`;
      }
      if (context && context.includes('No upcoming deadlines found')) {
        return 'There are no upcoming deadlines available for your enrolled classrooms or projects.';
      }
      return 'There are no upcoming deadlines available for your enrolled classrooms or projects.';
    }

    // 6. Team Inquiries
    if (q.includes('team') || q.includes('captain') || q.includes('teammate') || q.includes('who are my team')) {
      if (context && context.includes('Your Team Information:')) {
        return `${context}\n\nLet me know if you need to coordinate submission tasks or check participating classrooms!`;
      }
      if (context && context.includes('not currently enrolled in or assigned to any team')) {
        return 'You are not currently enrolled in or assigned to any team.';
      }
      return 'You are not currently enrolled in or assigned to any team.';
    }

    // 7. Classroom Inquiries
    if (q.includes('which classroom') || q.includes('enrolled classroom') || q.includes('my classroom')) {
      if (context && context.includes('Enrolled Classrooms:')) {
        return `${context}\n\nYou can access individual classroom submissions and evaluations directly from your Classrooms page.`;
      }
      if (context && context.includes('not currently enrolled in any classroom')) {
        return 'You are not currently enrolled in any classroom.';
      }
      return 'You are not currently enrolled in any classroom.';
    }

    // 8. Ranking & Leaderboard Inquiries
    if (q.includes('rank') || q.includes('standing') || q.includes('leaderboard')) {
      if (context && context.includes('Your Classroom Ranking & Standing:')) {
        return `${context}\n\nNote: Classroom rankings reflect authoritative verified evaluations. Unverified or pending submissions are not ranked until final grading is complete.`;
      }
      if (context && context.includes('No rankings available')) {
        return 'Rankings are not available yet because your submissions are either pending evaluation or results have not been published.';
      }
      return 'Rankings are not available yet because your submissions are either pending evaluation or results have not been published.';
    }

    // 9. Notification Inquiries
    if (q.includes('notification') || q.includes('alert')) {
      if (context && context.includes('Recent Notifications:')) {
        return `${context}\n\nYou can review and clear notifications in your Notifications center.`;
      }
      if (context && context.includes('no recent notifications')) {
        return 'You have no pending notifications at this time.';
      }
      return 'You have no pending notifications at this time.';
    }

    // 10. Provalix Project Checker Marks Distribution
    if (q.includes('project checker') && (q.includes('marks') || q.includes('divide') || q.includes('score') || q.includes('evlo') || q.includes('epdi') || q.includes('rubric') || q.includes('criteria'))) {
      if (isTamilScript) {
        return `Provalix AI-ல் **Project Checker** 100 மதிப்பெண்களை 7 முக்கிய அளவுகோல்களாகப் பிரிக்கிறது:\n\n1. **Problem Definition**: 15 மதிப்பெண்கள்\n2. **Innovation & Novelty**: 20 மதிப்பெண்கள்\n3. **Technical Implementation**: 20 மதிப்பெண்கள்\n4. **Functionality**: 15 மதிப்பெண்கள்\n5. **Code Quality**: 10 மதிப்பெண்கள்\n6. **Documentation**: 10 மதிப்பெண்கள்\n7. **Overall Quality**: 10 மதிப்பெண்கள்\n\n*குறிப்பு*: Plagiarism கண்டறியப்பட்டால் அபராதக் கழிவுகள் (Deductions) நேரடியாகப் பயன்படுத்தப்படும்!`;
      }
      if (isTanglish) {
        return `Project Checker-la total 100 marks 7 core criteria-va divide pannirukom:\n\n1. **Problem Definition**: 15 marks\n2. **Innovation & Novelty**: 20 marks\n3. **Technical Implementation**: 20 marks\n4. **Functionality**: 15 marks\n5. **Code Quality**: 10 marks\n6. **Documentation**: 10 marks\n7. **Overall Quality**: 10 marks\n\n*Note*: Plagiarism deductions (up to 15 marks) aggregate score-la deduct aagum!`;
      }
      return `In Provalix AI, the standalone **Project Checker** evaluates projects out of 100 marks across 7 criteria:\n\n1. **Problem Definition**: 15 marks\n2. **Innovation & Novelty**: 20 marks\n3. **Technical Implementation**: 20 marks\n4. **Functionality**: 15 marks\n5. **Code Quality**: 10 marks\n6. **Documentation**: 10 marks\n7. **Overall Quality**: 10 marks\n\nPlagiarism detection applies directly as a deduction penalty.`;
    }

    // 10b. Classroom Evaluation Marks Distribution (AI 50 + PPT/Demo 25 + Viva 25 = 100)
    if (
      (q.includes('classroom') && (q.includes('evaluation') || q.includes('score') || q.includes('marks') || q.includes('calculated') || q.includes('divide'))) ||
      (q.includes('final') && q.includes('evaluation') && (q.includes('score') || q.includes('calculated')))
    ) {
      if (isTamilScript) {
        return `Provalix AI வகுப்பறை மதிப்பீடு (Classroom Evaluation) மொத்தம் 100 மதிப்பெண்களைக் கொண்டது:\n\n1. **AI மதிப்பீடு (AI Evaluation)**: 50 மதிப்பெண்கள்\n2. **PPT மற்றும் செயல்முறை விளக்கம் (PPT + Demo)**: 25 மதிப்பெண்கள்\n3. **நேர்முகத் தேர்வு (Viva Assessment)**: 25 மதிப்பெண்கள் (5 வினாக்கள் x 5 மதிப்பெண்கள்)\n\n**இறுதி மொத்தம்**: 100 மதிப்பெண்கள்.\n*குறிப்பு*: திருட்டுத்தனம் (Plagiarism) தனி மதிப்பெண் அல்ல; அது AI மதிப்பீட்டுப் பகுதியிலேயே கழிவாகப் பயன்படுத்தப்படுகிறது.`;
      }
      if (isTanglish) {
        return `Classroom Evaluation total 100 marks 3 main components-ah evaluate aagum:\n\n1. **AI Evaluation**: 50 marks\n2. **PPT + Demo**: 25 marks\n3. **Viva Assessment**: 25 marks (5 questions x 5 marks)\n\n**Final Total**: 100 marks.\n*Note*: Plagiarism separate marks kedayadhu, AI evaluation component-la direct deduction penalty-ah deduct aagum.`;
      }
      return `Classroom evaluation in Provalix AI combines three core components for a final score of 100 marks:\n\n1. **AI Evaluation**: 50 marks\n2. **PPT + Demo**: 25 marks\n3. **Viva Assessment**: 25 marks (5 questions × 5 marks)\n\n**Final Total**: 100 marks.\n\n*Note*: Plagiarism is not counted as an independent mark; it applies directly as a deduction penalty within the AI evaluation component.`;
    }

    // 11. Personal Evaluation / Score / Report Inquiries
    if (
      q.includes('my score') ||
      q.includes('my mark') ||
      q.includes('my marks') ||
      q.includes('project score') ||
      q.includes('why did i get') ||
      q.includes('my evaluation') ||
      q.includes('current evaluation status') ||
      q.includes('what is my') ||
      q.includes('what is pending') ||
      q.includes('why is my evaluation incomplete') ||
      q.includes('is my result published') ||
      q.includes('report status') ||
      q.includes('my report') ||
      q.includes('ai score') ||
      q.includes('what feedback did i get')
    ) {
      if (context && (context.includes('AI Total Score:') || context.includes('Final Total Score:') || context.includes('Project Details:') || context.includes('=== Latest'))) {
        if (isTamilScript) {
          return `உங்கள் மதிப்பீட்டு விவரங்கள் கீழே கொடுக்கப்பட்டுள்ளன:\n\n${context}\n\nமுக்கிய பரிந்துரைகள்:\n- மேலே குறிப்பிடப்பட்டுள்ள நிறைகள் மற்றும் குறைகளை மதிப்பாய்வு செய்யவும்.\n- அடுத்த சமர்ப்பிப்புகளில் மதிப்பெண்களை உயர்த்த உங்கள் மேம்பாட்டுத் திட்டத்தில் (improvement plan) கவனம் செலுத்தவும்.`;
        }
        if (isTanglish) {
          return `Unga authorized evaluation breakdown idho:\n\n${context}\n\nKey Recommendations:\n- Mela irukura strengths and weaknesses review pannunga.\n- Unga improvement plan-la high-priority items complete panni scores boost pannunga!`;
        }
        return `Here is your authorized evaluation breakdown:\n\n${context}\n\nKey Recommendations:\n- Review the strengths and weaknesses highlighted above.\n- Target high-priority items in your improvement plan to boost upcoming submissions.`;
      }
      if (context && context.includes('No project evaluation records found')) {
        return 'No evaluation records are currently available for your account. Please submit or evaluate a project using Project Checker or Classroom to view your score breakdown.';
      }
      if (isTamilScript) {
        return 'அந்தத் தகவல் இதுவரை கிடைக்கவில்லை. உங்கள் மதிப்பீட்டு மதிப்பெண்ணைக் காண முதலில் உங்கள் திட்டப்பணியைத் தேர்ந்தெடுக்கவும் அல்லது சமர்ப்பிக்கவும்.';
      }
      if (isTanglish) {
        return 'Andha information innum available-ah illa. Unga evaluation score paaka first unga project-ah select panni submit pannunga.';
      }
      return 'I don\'t have that information available yet. Please select or submit your project first to view its evaluation score.';
    }

    // 12. Unknown Provalix Platform Inquiries
    if (q.includes('provalix') && q.includes('confidential-internal-secret-xyz')) {
      return 'I don\'t have that Provalix information available yet.';
    }

    // 13. Project Innovation & Improvement
    if (q.includes('innovation') && (q.includes('improve') || q.includes('panlam') || q.includes('kudu') || q.includes('how'))) {
      if (isTamilScript) {
        return `உங்கள் திட்டப்பணியில் புதுமையையும் கண்டுபிடிப்பையும் (Innovation & Novelty) மேம்படுத்த பின்வரும் பரிந்துரைகளைப் பயன்படுத்தலாம்:\n\n1. **Smart Analytics & Predictions**: சாதாரண CRUD செயல்பாடுகளுடன் மட்டும் நிற்காமல், முன்கணிப்பு (predictive scoring) அல்லது ML பாகுபாட்டை இணைக்கவும்.\n2. **Real-Time Telemetry**: நேரடி எச்சரிக்கைகள் மற்றும் நிலைப் புதுப்பிப்புகளுக்கு WebSocket அல்லது SSE-ஐப் பயன்படுத்தவும்.\n3. **Resilient Architecture**: Offline caching மற்றும் பாதுகாப்பான மாற்றுவழிகளை (graceful fallbacks) செயல்படுத்தவும்.\n4. **Automated Verification**: End-to-end தானியங்கி சோதனைகளைச் சேர்த்து உயர் நம்பகத்தன்மையை நிரூபிக்கவும்.\n\nஇது உங்கள் Innovation & Novelty மதிப்பெண்ணை (20 மதிப்பெண்கள்) கணிசமாக உயர்த்த உதவும்!`;
      }
      if (isTanglish) {
        return `Unga project-la innovation improve panna intha actionable recommendations use pannalam:\n\n1. **Smart Analytics & Predictions**: Normal CRUD operations mattum illama, predictive scoring or lightweight ML classification add pannunga.\n2. **Real-Time Telemetry**: Live alerts and instant status updates-ku WebSocket or SSE incorporate pannunga.\n3. **Resilient Architecture**: Offline caching and graceful fallbacks implement pannunga.\n4. **Automated Verification**: End-to-end integration tests add panni high reliability prove pannunga.\n\nIdhu unga Innovation & Novelty score-ah (20 marks) nalla elevate pannum!`;
      }
      return `To significantly elevate your project's innovation score:\n\n1. **Edge Intelligence / Predictive Features**: Incorporate predictive intelligence or automated classification rather than passive data displays.\n2. **Real-Time Responsiveness**: Implement WebSocket or Server-Sent Events (SSE) for live synchronization.\n3. **Robust Resiliency**: Add fault-tolerant fallback workflows (e.g. offline caching with IndexedDB, circuit breakers).\n4. **Granular Telemetry & Insights**: Provide automated trend analysis and recommendations based on user activity.\n5. **Rigorous Verification**: Integrate end-to-end automated testing to prove functional reliability.`;
    }

    if (q.includes('improve') || q.includes('suggestion') || q.includes('weakness')) {
      if (context && context.includes('Improvement Plan:')) {
        if (isTamilScript) {
          return `உங்கள் திட்டத்திற்கான தனிப்பயனாக்கப்பட்ட மேம்பாட்டு வழிகாட்டுதல்:\n\n${context}\n\nஅடுத்த படிகள்:\n- பாதுகாப்பு மற்றும் முக்கிய செயல்பாடுகளுக்கு முன்னுரிமை கொடுங்கள்.\n- தானியங்கி சோதனை மற்றும் ஆவணப்படுத்துதலை நிறைவு செய்யுங்கள்.`;
        }
        if (isTanglish) {
          return `Unga project-kaga customized phased improvement guidance idho:\n\n${context}\n\nRecommended next steps:\n- First high-severity items (security & core functionality) prioritize pannunga.\n- Next test automation and documentation complete pannunga.`;
        }
        return `Here is your customized phased improvement guidance based on your project:\n\n${context}\n\nRecommended next steps:\n- Prioritize High-severity items first (security and core functionality).\n- Follow with Medium priority items (test automation and documentation).`;
      }
      if (isTamilScript) {
        return `உங்கள் திட்ட மதிப்பீட்டு மதிப்பெண்ணை மேம்படுத்த:\n1. அலகு மற்றும் ஒருங்கிணைப்பு சோதனை கவரேஜை (test coverage) >= 80% ஆக உயர்த்தவும்.\n2. GitHub களஞ்சியத்தில் தெளிவான README மற்றும் .env.example இருப்பதை உறுதிசெய்யவும்.\n3. நேரடி விளக்கக் காட்சி மூலம் முக்கிய பயன்பாட்டு ஓட்டங்களை நிரூபிக்கவும்.`;
      }
      if (isTanglish) {
        return `Unga project score improve panna:\n1. Unit and integration test coverage-ah >= 80% elevate pannunga.\n2. GitHub repo-la setup guide and .env.example clear-ah provide pannunga.\n3. Core user journeys-ku live demo recordings add pannunga.`;
      }
      return `To improve your Provalix AI project score:\n1. Increase unit and integration test coverage to >= 80%.\n2. Ensure your GitHub repo has a clear setup guide and .env.example.\n3. Verify all core user journeys with live demo recordings.`;
    }


    // 9. Technical & Academic Questions (Normalization, DBMS, Recursion, Palindrome, Overfitting, etc.)
    if (q.includes('normalization') || q.includes('normal form')) {
      if (isTanglish) {
        return `**Normalization** na database-la duplicate data reduce pannitu data-va organized-ah store panra process.\n\n### Main Stages:\n1. **1NF**: Atomic values per column, no repeating groups.\n2. **2NF**: 1NF satisfy aagi, partial functional dependency iruka koodathu.\n3. **3NF**: 2NF satisfy aagi, transitive dependency (non-key attribute depending on non-key) iruka koodathu.\n4. **BCNF**: Strictly all determinants must be candidate keys.\n\n**Main Advantage**:\nData redundancy kammi aagum, update/delete anomalies avoid pannalam!`;
      }
      if (isTamilScript) {
        return `**தரவுத்தள சீராக்கம் (Database Normalization)** என்பது ஒரு தொடர்பு தரவுத்தளத்தில் (Relational Database) தேவையற்ற தரவு நகல்களை (Data Redundancy) குறைத்து தரவு ஒருமைப்பாட்டை (Data Integrity) மேம்படுத்தும் முறையாகும்.\n\n### முதன்மை நிலைகள்:\n1. **1NF**: ஒவ்வொரு நெடுவரிசையிலும் தனித்தனி (Atomic) மதிப்புகள் மட்டுமே இருக்க வேண்டும்.\n2. **2NF**: 1NF விதிகளுடன் பகுதி சார்புத் தன்மையை நீக்க வேண்டும்.\n3. **3NF**: 2NF விதிகளுடன் இடைநிலை சார்புத் தன்மையை நீக்க வேண்டும்.\n\nஇது தரவு முரண்பாடுகளைத் தடுத்து சீரான கட்டமைப்பை வழங்குகிறது.`;
      }
      if (isHindi) {
        return `**डेटाबेस नॉर्मलाइज़ेशन (Database Normalization)** डेटाबेस में डेटा रिडंडेंसी (डुप्लीकेट डेटा) को कम करने और डेटा अखंडता (Data Integrity) को बनाए रखने की एक तकनीक है।\n\n### मुख्य चरण:\n1. **1NF**: प्रत्येक सेल में केवल एकल मान (Atomic Value) होना चाहिए।\n2. **2NF**: 1NF नियमों के साथ आंशिक निर्भरता को दूर करें।\n3. **3NF**: 2NF नियमों के साथ सकर्मक निर्भरता को हटाएं।\n\nयह विसंगतियों (Anomalies) को रोकता है।`;
      }
      return `**Database Normalization** is the process of structuring a relational database to reduce data redundancy and improve data integrity.\n\n### Core Stages:\n1. **1NF (First Normal Form)**: Atomic values per cell, no repeating groups.\n2. **2NF (Second Normal Form)**: Meets 1NF and eliminates partial functional dependencies.\n3. **3NF (Third Normal Form)**: Meets 2NF and eliminates transitive dependencies.\n4. **BCNF (Boyce-Codd Normal Form)**: Strict version of 3NF where every determinant is a candidate key.\n\n### Practical Benefit:\nEliminates insertion, update, and deletion anomalies while ensuring consistent data relations.`;
    }

    if (q.includes('palindrome')) {
      if (isTamilScript) {
        return `Python-ல் palindrome சரிபார்க்கும் எளிய நிரல்:\n\n\`\`\`python\ndef is_palindrome(text: str) -> bool:\n    cleaned = ''.join(c.lower() for c in text if c.isalnum())\n    return cleaned == cleaned[::-1]\n\n# சரிபார்ப்பு\nexamples = ["madam", "racecar", "Provalix", "A man, a plan, a canal: Panama"]\nfor sample in examples:\n    status = "Palindrome" if is_palindrome(sample) else "Not Palindrome"\n    print(f"{sample!r:35} -> {status}")\n\`\`\`\n\n### விளக்கம்:\n- எழுத்துக்களைச் சிறியதாக மாற்றி குறியீடுகளை நீக்குகிறது.\n- சரம் (string) பின்னோக்கி திருப்பப்பட்டு (\`[::-1]\`) மூல சரத்துடன் சமமாக உள்ளதா என சரிபார்க்கப்படுகிறது.`;
      }
      if (isTanglish) {
        return `Python-la palindrome check panra clean program:\n\n\`\`\`python\ndef is_palindrome(s: str) -> bool:\n    # Clean string: lowercase and remove non-alphanumeric chars\n    clean = ''.join(c.lower() for c in s if c.isalnum())\n    # Check reverse match\n    return clean == clean[::-1]\n\n# Test cases\nwords = ["madam", "racecar", "Provalix", "A man, a plan, a canal: Panama"]\nfor word in words:\n    print(f"{word!r:38} -> {'Palindrome' if is_palindrome(word) else 'Not Palindrome'}")\n\`\`\`\n\n\`clean[::-1]\` syntax use panni string-ah reverse panni check panrom. Easy & efficient!`;
      }
      return `Here is a clean Python program to check for a palindrome:\n\n\`\`\`python\ndef is_palindrome(text: str) -> bool:\n    \"\"\"Checks if a given string is a palindrome ignoring casing and punctuation.\"\"\"\n    cleaned = ''.join(c.lower() for c in text if c.isalnum())\n    return cleaned == cleaned[::-1]\n\n# Verification\nexamples = [\"madam\", \"racecar\", \"Provalix\", \"A man, a plan, a canal: Panama\"]\nfor sample in examples:\n    status = \"Palindrome\" if is_palindrome(sample) else \"Not Palindrome\"\n    print(f\"{sample!r:35} -> {status}\")\n\`\`\`\n\n### Explanation:\n- Normalizes text by removing non-alphanumeric characters.\n- Compares the normalized string against its slice-reversed representation (\`[::-1]\`).`;
    }

    if (q.includes('recursion')) {
      if (isTamilScript) {
        return `**மறுநிகழ்வு (Recursion)** என்பது ஒரு சார்பு (function) தனக்குத்தானே மீண்டும் மீண்டும் அழைத்துக் கொண்டு, ஒரு அடிப்படை நிலையை (base condition) அடையும் வரை இயங்கும் நிரலாக்க முறையாகும்.\n\n### C Recursion Example (காரணியம் - Factorial):\n\`\`\`c\n#include <stdio.h>\n\n// Recursive factorial calculation\nlong long factorial(int n) {\n    if (n <= 1) {\n        return 1; // Base condition\n    }\n    return n * factorial(n - 1); // Recursive call\n}\n\nint main() {\n    int num = 5;\n    printf("Factorial of %d is %lld\\n", num, factorial(num));\n    return 0;\n}\n\`\`\`\n\n### முக்கிய கோட்பாடுகள்:\n1. **Base Case**: முடிவில்லா மறுநிகழ்வு (infinite recursion) மற்றும் Stack Overflow பிழையைத் தடுக்கிறது.\n2. **Call Stack**: ஒவ்வொரு recursive call-ம் அதற்கான frame-ஐ stack நினைவகத்தில் வைக்கிறது.`;
      }
      if (isTanglish) {
        return `**Recursion** na oru function thannaye thirumba thirumba call pannikittu, oru base condition satisfy aagura varaikum run aagura concept.\n\n### C Recursion Example (Factorial):\n\`\`\`c\n#include <stdio.h>\n\n// Recursive factorial calculation\nlong long factorial(int n) {\n    if (n <= 1) {\n        return 1; // Base condition\n    }\n    return n * factorial(n - 1); // Recursive call\n}\n\nint main() {\n    int num = 5;\n    printf("Factorial of %d is %lld\\n", num, factorial(num));\n    return 0;\n}\n\`\`\`\n\n### Main Points:\n1. **Base Case**: Stack overflow aagama loop-ah stop panna base condition romba mukkiyam.\n2. **Call Stack**: Ovvoru recursive call-kum stack memory-la frame allocate aagum.`;
      }
      return `**Recursion** in C occurs when a function calls itself directly or indirectly until reaching a base condition.\n\n### C Recursion Example (Factorial):\n\`\`\`c\n#include <stdio.h>\n\n// Recursive factorial calculation\nlong long factorial(int n) {\n    if (n <= 1) {\n        return 1; // Base condition\n    }\n    return n * factorial(n - 1); // Recursive call\n}\n\nint main() {\n    int num = 5;\n    printf(\"Factorial of %d is %lld\\n\", num, factorial(num));\n    return 0;\n}\n\`\`\`\n\n### Key Concepts:\n1. **Base Case**: Halts recursive unwind and prevents stack overflow.\n2. **Call Stack**: Each recursive call pushes a stack frame with its local state.`;
    }

    if (q.includes('overfitting')) {
      if (isTamilScript) {
        return `**மிகைப்பொருத்தம் (Overfitting)** என்பது ஒரு Machine Learning மாதிரி பயிற்சித் தரவை (training data) அளவுக்கு அதிகமாக மனப்பாடம் செய்து, புதிய சோதனைத் தரவில் (test data) துல்லியத்தை இழக்கும் நிலையாகும்.\n\n### தீர்வுகள்:\n1. **Regularization**: L1 / L2 அல்லது Dropout அடுக்குகளைப் பயன்படுத்துதல்.\n2. **Cross-Validation**: K-Fold cross-validation மூலம் பொதுமைப்படுத்தலைச் சரிபார்த்தல்.\n3. **Early Stopping**: சரிபார்ப்பு இழப்பு (validation loss) அதிகரிக்கும் போது பயிற்சியை நிறுத்துதல்.`;
      }
      if (isTanglish) {
        return `**Overfitting** na ML model training data-va romba accurate-ah memorize pannitu, unseen test data-la poor accuracy thara situation.\n\n### Main Causes:\n- Complex model with too many parameters\n- Small training dataset\n- Excessive noise in training labels\n\n### How to prevent:\n1. **Cross-Validation**: K-Fold cross validation use pannanum.\n2. **Regularization**: L1 / L2 or Dropout add pannanum.\n3. **Early Stopping**: Validation loss increase aagum podhu training stop pannanum.`;
      }
      return `**Overfitting** occurs when a machine learning model learns the training data and noise so closely that it fails to generalize to unseen test data.\n\n### Solutions:\n1. **Regularization**: Apply L1 (Lasso), L2 (Ridge), or Dropout layers.\n2. **Cross-Validation**: Use K-Fold cross validation to assess generalizability.\n3. **Early Stopping**: Halt training when validation loss stops decreasing.\n4. **Data Augmentation**: Expand training variability with synthesized inputs.`;
    }

    if (q.includes('dbms') && !q.includes('join')) {
      if (isTamilScript) {
        return `**DBMS (Database Management System / தரவுத்தள மேலாண்மை அமைப்பு)** என்பது தரவை பாதுகாப்பாகவும் முறையாகவும் உருவாக்க, நிர்வகிக்க மற்றும் மீட்டெடுக்க பயன்படும் ஒரு அமைப்பு மென்பொருள் (system software) ஆகும்.\n\n### முக்கிய அம்சங்கள்:\n- **ACID Transactions**: Atomicity, Consistency, Isolation, மற்றும் Durability ஆகிய பரிவர்த்தனை விதிகளை உறுதி செய்கிறது.\n- **Concurrency Control**: பல பயனர்கள் ஒரே நேரத்தில் தரவை அணுகும் போது முரண்பாடுகள் (conflicts) வராமல் தடுக்கிறது.\n- **Data Security**: Role-based access control மற்றும் user authorization மூலம் தரவுப் பாதுகாப்பை வழங்குகிறது.\n- **SQL Operations**: Structured Query Language மூலம் அட்டவணைகளில் (tables) உள்ள Primary Key மற்றும் Foreign Key உறவுகளை திறம்பட நிர்வகிக்கிறது.\n\nஉதாரணங்கள்: PostgreSQL, MySQL, Oracle.`;
      }
      if (isTanglish) {
        return `**DBMS (Database Management System)** na structured databases-ah create panna, manage panna, and query panna use aagura system software.\n\n### Main Features:\n- **ACID Properties**: Atomicity, Consistency, Isolation, and Durability ensure pannum.\n- **Concurrency Control**: Multiple users ஒரே நேரத்துல access pannalum conflict varama maintain pannum.\n- **Data Security**: Role-based access control kuduthu unauthorized access thadukkum.\n- **SQL Operations**: Tables, Primary Key, and Foreign Key relations manage panna help pannum.\n\nPopular DBMS examples: PostgreSQL, MySQL, MongoDB.`;
      }
      return `A **DBMS (Database Management System)** is system software for creating, querying, and managing structured databases.\n\n### Core Properties:\n- **ACID Transactions**: Atomicity, Consistency, Isolation, and Durability.\n- **Concurrency Control**: Prevents conflicts during multi-user write operations.\n- **Data Security**: Granular role-based access control.`;
    }

    // 10. Technical Concepts: REST API, SQL Joins, Cloud Computing, Architecture
    if (q.includes('rest') || q.includes('rest api') || q.includes('api architecture')) {
      if (isTamilScript) {
        return `**REST API (Representational State Transfer)** என்பது நவீன இணைய பயன்பாடுகளுக்கான (Web Services) ஒரு கட்டமைப்பு பாணியாகும்.\n\n### முக்கிய கோட்பாடுகள்:\n1. **Stateless**: ஒவ்வொரு கோரிக்கையும் தேவையான அனைத்து தகவல்களையும் கொண்டிருக்க வேண்டும்.\n2. **Client-Server**: பயனர் இடைமுகமும் சேவையக செயல்பாடும் தனித்தனியாக இயங்கும்.\n3. **Uniform Interface**: நிலையான HTTP முறைகள் (\`GET\`, \`POST\`, \`PUT\`, \`DELETE\`).\n4. **Cacheable**: பதில்களைத் தேக்ககத்தில் சேமிக்க அனுமதிக்கிறது.\n\nHTTP நிலைக் குறியீடுகள்: 200 (Success), 201 (Created), 400 (Bad Request), 404 (Not Found), 500 (Internal Error).`;
      }
      if (isTanglish) {
        return `**REST API (Representational State Transfer)** na modern web applications-la client and server communicate panna use panra architectural standard.\n\n### Core Rules:\n1. **Stateless**: Server endha client session state-ayum retain pannadhu; ovvoru request-layum complete context irukanum.\n2. **HTTP Verbs**: \`GET\` (fetch), \`POST\` (create), \`PUT\`/\`PATCH\` (update), \`DELETE\` (remove).\n3. **JSON Payload**: Standard structured data exchange format.\n4. **Status Codes**: 200 (OK), 201 (Created), 400 (Validation Error), 401 (Unauthorized), 404 (Not Found).\n\nScalable backend services build panna REST API romba helpful!`;
      }
      return `**REST (Representational State Transfer) API** is an architectural pattern for building stateless networked applications.\n\n### Core Architectural Constraints:\n1. **Stateless Communication**: Every HTTP request from client to server must contain all necessary authentication and context data.\n2. **Client-Server Decoupling**: Separation of user interface concerns from data storage and business logic.\n3. **Uniform Interface**: Standardized resources identified via URIs and manipulated using standard HTTP methods (\`GET\`, \`POST\`, \`PUT\`, \`DELETE\`).\n4. **Cacheability**: Responses explicitly designate whether they are cacheable to optimize performance.\n\n### Standard HTTP Status Codes:\n- \`200 OK\` / \`201 Created\`\n- \`400 Bad Request\` / \`401 Unauthorized\` / \`403 Forbidden\` / \`404 Not Found\`\n- \`500 Internal Server Error\``;
    }

    if (q.includes('join') || (q.includes('sql') && (q.includes('query') || q.includes('teach') || q.includes('explain')))) {
      if (isTanglish) {
        return `SQL-la **JOINs** multiple tables-la irundhu related data-va combine panni fetch panna use aagudhu:\n\n### Main Join Types:\n1. **INNER JOIN**: Rendu table-layum matching records mattum return pannum.\n\`\`\`sql\nSELECT students.name, courses.title \nFROM students \nINNER JOIN courses ON students.course_id = courses.id;\n\`\`\`\n2. **LEFT JOIN**: Left table-oda all records + matching right table records.\n3. **RIGHT JOIN**: Right table-oda all records + matching left table records.\n4. **FULL OUTER JOIN**: Rendu table-layum irukkura all records (matching or not).\n\nRelational database-la foreign keys use panni indexing optimize panna joins fast-ah execute aagum!`;
      }
      return `In SQL, **JOIN operations** combine records from two or more tables based on a related column between them.\n\n### Primary Join Types:\n1. **INNER JOIN**: Returns only rows where there is a match in both tables.\n\`\`\`sql\nSELECT u.name, s.title, s.final_total_score\nFROM users u\nINNER JOIN submissions s ON u.id = s.submitter_id;\n\`\`\`\n2. **LEFT JOIN (LEFT OUTER JOIN)**: Returns all records from the left table and matched records from the right table (with NULLs for non-matches).\n3. **RIGHT JOIN**: Returns all records from the right table and matched records from the left table.\n4. **FULL OUTER JOIN**: Returns all records when there is a match in either left or right table.\n\nOptimizing joins requires indexing the join keys (Foreign Keys).`;
    }

    if (q.includes('cloud') || q.includes('cloud computing')) {
      return `**Cloud Computing** is the on-demand delivery of IT resources—including compute power, storage, and databases—over the internet with pay-as-you-go pricing.\n\n### Service Models:\n1. **IaaS (Infrastructure as a Service)**: Virtual machines, raw networking, storage (e.g. AWS EC2, GCP Compute Engine).\n2. **PaaS (Platform as a Service)**: Managed runtime environments for deploying applications without managing OS/servers (e.g. AWS Elastic Beanstalk, Heroku, Vercel).\n3. **SaaS (Software as a Service)**: End-user software delivered over the web (e.g. Google Workspace, Microsoft 365).\n\n### Deployment Models:\n- **Public Cloud**, **Private Cloud**, and **Hybrid / Multi-Cloud**.`;
    }

    // 10. Generic / Context-Aware response
    if (context && context.length > 30) {
      if (isTamilScript) {
        return `உங்கள் திட்டப்பணி வினவலுக்கான பொருத்தமான வழிகாட்டுதல் விவரங்கள் கீழே கொடுக்கப்பட்டுள்ளன:\n\n${context}\n\nமேலும் ஏதேனும் அளவுகோல் அல்லது மேம்பாட்டு வழிகாட்டுதல்கள் தேவைப்பட்டால் கேட்கவும்!`;
      }
      if (isTanglish) {
        return `Unga query-kku matching aana Provalix AI guidance details idho:\n\n${context}\n\nInnum specific details venumna kakkalam!`;
      }
      return `Here is the relevant Provalix AI guidance matching your query:\n\n${context}\n\nLet me know if you need specific details on any rubric or improvement step!`;
    }

    if (isTamilScript) {
      return `வணக்கம்! நான் உங்கள் Provalix AI Assistant. திட்ட மதிப்பீட்டு மதிப்பெண்கள், அளவுகோல் விவரங்கள் (rubrics), Viva வழிகாட்டுதல்கள், அல்லது நிரலாக்க மற்றும் தொழில்நுட்ப சந்தேகங்களை தமிழில் விளக்க தயாராக உள்ளேன். நீங்கள் அறிய விரும்பும் தலைப்பைக் குறிப்பிடுங்கள்.`;
    }
    if (isTanglish) {
      return `Vanakkam! Naan unga Provalix AI Assistant. Unga project scores, evaluation criteria, viva questions, programming doubts, and technical concepts explain panna mudiyum. Ungaluku enna details venum?`;
    }
    return `Hello! I am your Provalix AI Assistant. I can help explain your project scores, criteria breakdowns, plagiarism reports, viva expectations, coding questions, and offer targeted recommendations to improve your engineering deliverables. How can I assist you today?`;
  }


  async summarizeReport(reportData: any): Promise<string> {
    const title = reportData.project?.title || 'Student Project';
    const score = reportData.aiEvaluation?.totalScoreOutof100 ?? 'N/A';
    const strengthsCount = reportData.aiEvaluation?.strengths?.length ?? 0;
    const weaknessesCount = reportData.aiEvaluation?.weaknesses?.length ?? 0;

    return `Summary for "${title}": Overall Score ${score}/100. Identified ${strengthsCount} key architectural strengths and ${weaknessesCount} targeted areas for improvement. Core functional benchmarks were verified successfully.`;
  }

  async generateVivaQuestions(submissionData: any): Promise<GeneratedVivaQuestion[]> {
    const title = submissionData.title || 'the Project';
    const problem = submissionData.problemStatement || 'the stated problem';
    const proposed = submissionData.proposedSolution || 'the proposed solution';
    
    // Parse technologies and languages if stringified
    let techs = submissionData.technologies;
    if (typeof techs === 'string') {
      try { techs = JSON.parse(techs); } catch { techs = [techs]; }
    }
    const techStr = Array.isArray(techs) && techs.length > 0 ? techs.join(', ') : 'the selected framework stack';

    let langs = submissionData.programmingLanguages;
    if (typeof langs === 'string') {
      try { langs = JSON.parse(langs); } catch { langs = [langs]; }
    }
    const langStr = Array.isArray(langs) && langs.length > 0 ? langs.join(', ') : '';

    const features = submissionData.features || 'primary operational workflow';
    const innovation = submissionData.innovation || 'the innovative approach';
    const testing = submissionData.testingApproach || 'the testing and verification suite';

    return [
      {
        questionNumber: 1,
        category: 'Problem Understanding',
        questionText: `In the context of "${title}", how specifically does your proposed solution ("${proposed.slice(0, 120)}") address the core challenge of "${problem.slice(0, 120)}"? Explain how your approach differentiates from existing industry solutions.`,
        maxScore: 5.0,
      },
      {
        questionNumber: 2,
        category: 'Technical Implementation',
        questionText: `Detail the architectural data flow in "${title}". How did you structure your components, and how does your implementation in ${techStr} maintain scalability and modular decoupling?`,
        maxScore: 5.0,
      },
      {
        questionNumber: 3,
        category: 'Technology / Algorithm Choice',
        questionText: `Why did you select ${techStr}${langStr ? ` along with ${langStr}` : ''} to realize "${innovation.slice(0, 100)}"? What algorithmic trade-offs were evaluated regarding execution speed, memory footprint, or security?`,
        maxScore: 5.0,
      },
      {
        questionNumber: 4,
        category: 'Feature / Internal Working',
        questionText: `Walk us through the internal working and lifecycle of your primary feature: "${features.slice(0, 140)}". Describe the transition from input receipt through processing and persistent storage.`,
        maxScore: 5.0,
      },
      {
        questionNumber: 5,
        category: 'Scenario / Challenge / Failure Handling',
        questionText: `Under high load, unexpected input anomalies, or network failure, how does "${title}" fail gracefully? What defensive validation or error boundaries have been verified through ${testing.slice(0, 100)}?`,
        maxScore: 5.0,
      },
    ];
  }
}

export const mockAIProvider = new MockAIProvider();

let activeAIProviderInstance: AIProvider | null = null;

export function setActiveAIProvider(provider: AIProvider | null): void {
  activeAIProviderInstance = provider;
}

export function getActiveAIProvider(): AIProvider {
  return activeAIProviderInstance || mockAIProvider;
}

export const defaultAIProvider: AIProvider = {
  evaluateProject: (p, pl) => getActiveAIProvider().evaluateProject(p, pl),
  evaluateClassroomSubmission: (s, pl) => getActiveAIProvider().evaluateClassroomSubmission(s, pl),
  generateFeedback: (c, s) => getActiveAIProvider().generateFeedback(c, s),
  generateImprovementPlan: (w) => getActiveAIProvider().generateImprovementPlan(w),
  generateResponse: (u, c, h, l) => getActiveAIProvider().generateResponse(u, c, h, l),
  summarizeReport: (r) => getActiveAIProvider().summarizeReport(r),
  generateVivaQuestions: (s) => getActiveAIProvider().generateVivaQuestions(s),
};

