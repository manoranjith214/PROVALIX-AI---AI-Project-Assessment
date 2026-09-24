import { GoogleGenAI } from '@google/genai';
import {
  AIProvider,
  ProjectCheckerEvaluationResult,
  ClassroomAIEvaluationResult,
  ImprovementItem,
  GeneratedVivaQuestion,
} from './AIProvider.interface';
import { MockAIProvider } from './MockAIProvider';
import { config } from '../../config/env';

export class GeminiProvider implements AIProvider {
  private client: GoogleGenAI | null = null;
  private modelName: string;
  private fallbackProvider: MockAIProvider;

  constructor(apiKey?: string, modelName?: string) {
    const key = apiKey || config.ai.geminiApiKey;
    this.modelName = modelName || config.ai.geminiModel || 'gemini-1.5-flash';
    this.fallbackProvider = new MockAIProvider();

    if (key && key.trim().length > 0) {
      try {
        this.client = new GoogleGenAI({ apiKey: key.trim() });
      } catch (err) {
        console.warn('⚠️ [GeminiProvider]: Failed to initialize GoogleGenAI client. Using MockAIProvider fallback.');
        this.client = null;
      }
    }
  }

  /**
   * Generates a conversational assistant response using Gemini with RAG context and bounded history
   */
  async generateResponse(
    userMessage: string,
    context?: string,
    conversationHistory?: Array<{ role: string; message: string }>,
    detectedLanguage?: string
  ): Promise<string> {
    const raw = userMessage.trim();
    const lang = (detectedLanguage || this.detectLanguageFallback(raw)).toLowerCase();

    if (!this.client) {
      return this.fallbackProvider.generateResponse(userMessage, context, conversationHistory, lang);
    }

    try {
      let languageDirective = '';
      if (lang === 'tamil') {
        languageDirective = `CRITICAL MANDATORY LANGUAGE DIRECTIVE:
- The user has requested the response in TAMIL ("தமிழ்ல" or Tamil script).
- You MUST formulate your entire response in TAMIL script (தமிழ்).
- Do NOT switch to English sentences.
- Preserve core technical terms, acronyms, and keywords (e.g. DBMS, SQL, ACID, Primary Key, Foreign Key, Normalization, Python, API, Table) in English where standard in engineering education (e.g., "DBMS (Database Management System) என்பது..."), but ALL explanation, sentences, headings, and grammar MUST be in TAMIL.`;
      } else if (lang === 'tanglish') {
        languageDirective = `CRITICAL MANDATORY LANGUAGE DIRECTIVE:
- The user has requested the response in TANGLISH (Tamil written in English/Latin letters).
- You MUST formulate your response in natural, fluent, friendly Tanglish (e.g., "DBMS na Database Management System. Idhu database-la data-va store panni, manage panra software system...").
- Do NOT output formal English paragraphs.
- Keep standard technical terms (DBMS, SQL, ACID, etc.) in English as natural in engineering Tanglish discussions.`;
      } else if (lang === 'hindi') {
        languageDirective = `CRITICAL MANDATORY LANGUAGE DIRECTIVE:
- The user has requested the response in HINDI.
- Respond in clear Hindi. Technical terms (DBMS, SQL, ACID, etc.) can remain in English.`;
      } else {
        languageDirective = `LANGUAGE DIRECTIVE:
- Respond in clear, educational, beginner-friendly English with practical examples and code where relevant.`;
      }

      const systemInstruction = `You are Provalix AI Assistant V2, the intelligent assistant for the Provalix AI student project evaluation and learning platform.

${languageDirective}

CORE CAPABILITIES & RULES:
1. Language Fidelity: Adhere strictly to the language directive above. Never switch to another language unless explicitly requested.
2. Context Integrity: Use the provided [Retrieved Authorized Context & Guidelines] accurately and truthfully.
   - For evaluations, scores, feedback, deadlines, teams, classrooms, rankings, and notifications: cite actual details from the context.
   - NEVER invent or hallucinate scores, deadlines, ranks, project titles, team names, or member lists.
   - If the context indicates that information is not available (e.g. no evaluation yet, no deadlines, no team), clearly inform the user that the information is currently not available.
3. Viva Voce Preparation: When the user asks for viva practice or viva questions, generate 5 targeted practice questions covering core dimensions (Problem Understanding, Technical Implementation, Technology/Algorithm Choice, Feature/Internal Working, Scenario/Failure Handling) tailored to their project if available. Guide them through practice answers and feedback without claiming to assign official grades.
4. Technical & Academic Depth: Provide educational, step-by-step explanations followed by practical examples and clean syntax-highlighted markdown code blocks where applicable.
5. Security & Privacy: Never disclose other students' private evaluations, passwords, JWT secrets, or environment credentials. Politely refuse unauthorized queries.`;

      // Build conversation contents including history
      const contents: any[] = [];

      // Append recent conversation turns
      if (conversationHistory && conversationHistory.length > 0) {
        for (const item of conversationHistory.slice(-8)) {
          contents.push({
            role: item.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: item.message }],
          });
        }
      }

      // Prepare current message with RAG context if present
      let userPrompt = userMessage;
      if (context && context.trim().length > 0) {
        userPrompt = `[Retrieved Authorized Context & Guidelines]\n${context}\n\n[User Question]\n${userMessage}`;
      }

      userPrompt = `[Target Response Language: ${lang.toUpperCase()}]\n${userPrompt}`;

      contents.push({
        role: 'user',
        parts: [{ text: userPrompt }],
      });

      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents,
        config: {
          systemInstruction,
          temperature: 0.6,
        },
      });

      const responseText = response.text;
      if (responseText && responseText.trim().length > 0) {
        return responseText.trim();
      }

      // Fallback if response text empty
      return this.fallbackProvider.generateResponse(userMessage, context, conversationHistory, lang);
    } catch (err: any) {
      console.warn('⚠️ [GeminiProvider]: Error during generateResponse, invoking fallback:', err?.message || 'Unknown error');
      return this.fallbackProvider.generateResponse(userMessage, context, conversationHistory, lang);
    }
  }

  private detectLanguageFallback(raw: string): string {
    const lower = raw.toLowerCase();
    if (lower.includes('in english') || lower.includes('english-la') || lower.includes('english la') || lower.includes('simple english')) {
      return 'english';
    }
    if (lower.includes('தமிழ்ல') || lower.includes('தமிழில்') || lower.includes('tamil-la') || lower.includes('tamil la') || lower.includes('in tamil') || /[\u0B80-\u0BFF]/.test(raw)) {
      return 'tamil';
    }
    if (lower.includes('tanglish') || lower.includes('tanglish-la') || lower.includes('tanglish la') || lower.includes('in tanglish') || /\b(na|enna|epdi|panrathu|pannu|kudu|solla|sollu|irukku|evlo)\b/i.test(lower)) {
      return 'tanglish';
    }
    if (lower.includes('hindi') || /[\u0900-\u097F]/.test(raw)) {
      return 'hindi';
    }
    return 'english';
  }

  async evaluateProject(projectData: any, plagiarismData?: any): Promise<ProjectCheckerEvaluationResult> {
    if (!this.client) {
      return this.fallbackProvider.evaluateProject(projectData, plagiarismData);
    }

    try {
      const prompt = `Evaluate the following student engineering project across the 7 Provalix AI criteria:
1. Problem Definition (Max 15)
2. Innovation & Novelty (Max 20)
3. Technical Implementation (Max 20)
4. Functionality (Max 15)
5. Code Quality (Max 10)
6. Documentation (Max 10)
7. Overall Quality (Max 10)

Project Data:
${JSON.stringify(projectData, null, 2)}

Plagiarism Data:
${JSON.stringify(plagiarismData || {}, null, 2)}

Respond ONLY with a valid JSON matching this schema:
{
  "overallScore": number,
  "criteria": {
    "problemDefinition": { "name": "Problem Definition", "maxScore": 15, "obtainedScore": number, "feedback": string },
    "innovationNovelty": { "name": "Innovation & Novelty", "maxScore": 20, "obtainedScore": number, "feedback": string },
    "technicalImplementation": { "name": "Technical Implementation", "maxScore": 20, "obtainedScore": number, "feedback": string },
    "functionality": { "name": "Functionality", "maxScore": 15, "obtainedScore": number, "feedback": string },
    "codeQuality": { "name": "Code Quality", "maxScore": 10, "obtainedScore": number, "feedback": string },
    "documentation": { "name": "Documentation", "maxScore": 10, "obtainedScore": number, "feedback": string },
    "overallQuality": { "name": "Overall Quality", "maxScore": 10, "obtainedScore": number, "feedback": string }
  },
  "strengths": string[],
  "weaknesses": string[],
  "technicalAnalysis": string,
  "codeAnalysis": string,
  "documentationAnalysis": string,
  "actionableSuggestions": string[],
  "improvementPlan": [{ "area": string, "suggestion": string, "priority": "High" | "Medium" | "Low" }],
  "summary": string,
  "aiModel": "${this.modelName}"
}`;

      const res = await this.client.models.generateContent({
        model: this.modelName,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' },
      });

      const text = res.text;
      if (text) {
        const parsed = JSON.parse(text);
        if (parsed.overallScore && parsed.criteria) {
          return parsed;
        }
      }
      return this.fallbackProvider.evaluateProject(projectData, plagiarismData);
    } catch {
      return this.fallbackProvider.evaluateProject(projectData, plagiarismData);
    }
  }

  async evaluateClassroomSubmission(submissionData: any, plagiarismData?: any): Promise<ClassroomAIEvaluationResult> {
    return this.fallbackProvider.evaluateClassroomSubmission(submissionData, plagiarismData);
  }

  async generateFeedback(context: string, score: number): Promise<string> {
    if (!this.client) {
      return this.fallbackProvider.generateFeedback(context, score);
    }
    try {
      const res = await this.client.models.generateContent({
        model: this.modelName,
        contents: `Provide a concise 2-sentence evaluation feedback for score ${score}/100. Context: ${context.slice(0, 300)}`,
      });
      return res.text || this.fallbackProvider.generateFeedback(context, score);
    } catch {
      return this.fallbackProvider.generateFeedback(context, score);
    }
  }

  async generateImprovementPlan(weaknesses: string[]): Promise<ImprovementItem[]> {
    return this.fallbackProvider.generateImprovementPlan(weaknesses);
  }

  async summarizeReport(reportData: any): Promise<string> {
    if (!this.client) {
      return this.fallbackProvider.summarizeReport(reportData);
    }
    try {
      const res = await this.client.models.generateContent({
        model: this.modelName,
        contents: `Summarize the project evaluation report in 2-3 concise sentences: ${JSON.stringify(reportData).slice(0, 600)}`,
      });
      return res.text || this.fallbackProvider.summarizeReport(reportData);
    } catch {
      return this.fallbackProvider.summarizeReport(reportData);
    }
  }

  async generateVivaQuestions(submissionData: any): Promise<GeneratedVivaQuestion[]> {
    if (!this.client) {
      return this.fallbackProvider.generateVivaQuestions(submissionData);
    }
    try {
      const prompt = `Generate exactly 5 targeted viva defense questions for this student project submission across these exact 5 categories:
1. Problem Understanding
2. Technical Implementation
3. Technology / Algorithm Choice
4. Feature / Internal Working
5. Scenario / Challenge / Failure Handling

Submission: ${JSON.stringify(submissionData).slice(0, 800)}

Respond ONLY as a JSON array:
[
  { "questionNumber": 1, "category": "Problem Understanding", "questionText": "...", "maxScore": 5.0 },
  { "questionNumber": 2, "category": "Technical Implementation", "questionText": "...", "maxScore": 5.0 },
  { "questionNumber": 3, "category": "Technology / Algorithm Choice", "questionText": "...", "maxScore": 5.0 },
  { "questionNumber": 4, "category": "Feature / Internal Working", "questionText": "...", "maxScore": 5.0 },
  { "questionNumber": 5, "category": "Scenario / Challenge / Failure Handling", "questionText": "...", "maxScore": 5.0 }
]`;

      const res = await this.client.models.generateContent({
        model: this.modelName,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' },
      });

      const text = res.text;
      if (text) {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.length === 5) {
          return parsed;
        }
      }
      return this.fallbackProvider.generateVivaQuestions(submissionData);
    } catch {
      return this.fallbackProvider.generateVivaQuestions(submissionData);
    }
  }
}
