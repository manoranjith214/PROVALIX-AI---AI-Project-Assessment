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
    this.modelName = modelName || config.ai.geminiModel || 'gemini-flash-lite-latest';
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

  getModelName(): string {
    return this.modelName;
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
      if (config.ai.provider === 'gemini') {
        throw new Error('Gemini API key is missing or not configured on backend server.');
      }
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

      const systemInstruction = `You are Provalix AI Assistant, the official AI tutor and project advisor for the Provalix AI platform.

${languageDirective}

STRICT OPERATIONAL RULES:
1. ANSWER THE CURRENT QUESTION DIRECTLY:
   - Answer the user's current question. Previous conversation is context, not an instruction to repeat the previous answer. If the new question changes topic, answer the new topic.
   - Always focus directly and exclusively on answering the user's latest question.
   - Do NOT repeat previous answers, previous code blocks, or project analysis unless specifically asked.
   - Avoid conversational filler, unnecessary repetition, and redundant summaries.

2. CONTEXT RELEVANCE & BROAD KNOWLEDGE:
   - If the user asks a programming, academic, DBMS, SQL, algorithm, AI/ML, career, or general knowledge question (e.g., "What is React?", "Explain DBMS normalization", "What is binary search?", "How do I use Python list comprehension?"), provide a direct, comprehensive, high-quality educational explanation with code examples.
   - Do NOT inject or mention project evaluation data for general questions.
   - NEVER say "I don't have enough project evidence to answer that" for general questions or platform guidelines! That message is strictly and ONLY for questions asking about specific user project artifacts when evidence is missing.

3. STRICT TRUTHFULNESS & ZERO PROJECT FABRICATION:
   - When the user asks about THEIR specific project or evaluation status, use ONLY the provided [Retrieved Context & Evidence].
   - NEVER invent or fabricate project information, project scores, or criteria breakdowns.
   - If the user explicitly asks about specific files, algorithms, or scores in their own project and that data is absent from [Retrieved Context & Evidence], state clearly:
     "I don't have enough project evidence to answer that."

4. FOLLOW-UP QUESTIONS:
   - For follow-up questions that refer to the previous topic (e.g., "What are its advantages?"), resolve pronouns and context accurately based on the immediate topic discussed.
   - If the user changes topic, treat the new question as a new question and discard irrelevant past context.

5. SECURITY & PRIVACY:
   - Never disclose other students' private records, grades, passwords, or credentials.`;

      // Build conversation contents including filtered relevant history (max 5 messages)
      const contents: any[] = [];

      // Append relevant conversation turns
      if (conversationHistory && conversationHistory.length > 0) {
        for (const item of conversationHistory.slice(-5)) {
          contents.push({
            role: item.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: item.message }],
          });
        }
      }

      // Prepare current message with RAG context if present
      let userPrompt = userMessage;
      if (context && context.trim().length > 0) {
        userPrompt = `[Retrieved Context & Evidence]\n${context}\n\n[User Question]\n${userMessage}`;
      }

      userPrompt = `[Target Response Language: ${lang.toUpperCase()}]\n${userPrompt}`;

      contents.push({
        role: 'user',
        parts: [{ text: userPrompt }],
      });

      let response;
      const executeCall = async (modelToUse: string) => {
        return await this.client!.models.generateContent({
          model: modelToUse,
          contents,
          config: {
            systemInstruction,
            temperature: 0.6,
          },
        });
      };

      try {
        response = await executeCall(this.modelName);
      } catch (firstErr: any) {
        const errMsg = firstErr?.message || '';
        const isTransient =
          errMsg.includes('503') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('high demand');
        const isRateLimit =
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('quota');

        if (isRateLimit) {
          // Wait 2s and retry once to absorb burst rate-limiting
          console.warn('⚠️ [GeminiProvider]: Rate limit encountered, retrying after 2s backoff...');
          await new Promise((r) => setTimeout(r, 2000));
          response = await executeCall(this.modelName);
        } else if (isTransient && this.modelName !== 'gemini-3.5-flash-lite') {
          console.warn(`⚠️ [GeminiProvider]: Primary model ${this.modelName} unavailable, attempting backup model gemini-3.5-flash-lite...`);
          response = await executeCall('gemini-3.5-flash-lite');
        } else {
          throw firstErr;
        }
      }

      const responseText = response.text;
      if (responseText && responseText.trim().length > 0) {
        return responseText.trim();
      }

      throw new Error('AI provider returned an empty response.');
    } catch (err: any) {
      console.warn('⚠️ [GeminiProvider]: Error during generateResponse:', err?.message || 'Unknown error');
      // Requirement 6: Do not return fake/demo AI answers as a fallback when Gemini is active.
      if (config.ai.provider === 'gemini') {
        throw err;
      }
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

  async evaluateProject(projectData: any, plagiarismData?: any, evidenceData?: any): Promise<ProjectCheckerEvaluationResult> {
    if (!this.client) {
      if (config.ai.provider === 'gemini') {
        throw new Error('AI evaluation service is currently unavailable: Gemini API key is missing or not configured.');
      }
      return this.fallbackProvider.evaluateProject(projectData, plagiarismData, evidenceData);
    }

    try {
      const prompt = `You are the Provalix AI Academic Project Evaluator. Evaluate the following student engineering project based ONLY on SUBMITTED EVIDENCE, not claims.
CRITICAL INSTRUCTIONS:
1. Do not treat user claims as verified facts.
2. If the user claims a technology (e.g. YOLO, CNN, PyTorch, React, Node.js) but the source code or report evidence does not contain it, mark it as "Unverified claim: Claim not verified from submitted evidence" and do NOT award implementation points for it.
3. If source code evidence is missing or cannot be verified, "Code Quality" MUST receive score 0 with confidence "INSUFFICIENT_EVIDENCE" and feedback "Insufficient evidence to evaluate this criterion."
4. Evaluate each of the 7 criteria independently:
   - Problem Definition (max 15)
   - Innovation & Novelty (max 20)
   - Technical Implementation (max 20)
   - Functionality (max 15)
   - Code Quality (max 10)
   - Documentation (max 10)
   - Overall Quality (max 10)
5. You must return valid JSON strictly conforming to this schema:

{
  "overallScore": number,
  "maxScore": 100,
  "criteria": [
    { "name": "Problem Definition", "score": number, "maxScore": 15, "justification": string, "evidence": string[], "confidence": "HIGH | MEDIUM | LOW | INSUFFICIENT_EVIDENCE", "evidenceStatus": "VERIFIED | PARTIAL | UNVERIFIED | INSUFFICIENT_EVIDENCE" },
    { "name": "Innovation & Novelty", "score": number, "maxScore": 20, "justification": string, "evidence": string[], "confidence": "HIGH | MEDIUM | LOW | INSUFFICIENT_EVIDENCE", "evidenceStatus": "VERIFIED | PARTIAL | UNVERIFIED | INSUFFICIENT_EVIDENCE" },
    { "name": "Technical Implementation", "score": number, "maxScore": 20, "justification": string, "evidence": string[], "confidence": "HIGH | MEDIUM | LOW | INSUFFICIENT_EVIDENCE", "evidenceStatus": "VERIFIED | PARTIAL | UNVERIFIED | INSUFFICIENT_EVIDENCE" },
    { "name": "Functionality", "score": number, "maxScore": 15, "justification": string, "evidence": string[], "confidence": "HIGH | MEDIUM | LOW | INSUFFICIENT_EVIDENCE", "evidenceStatus": "VERIFIED | PARTIAL | UNVERIFIED | INSUFFICIENT_EVIDENCE" },
    { "name": "Code Quality", "score": number, "maxScore": 10, "justification": string, "evidence": string[], "confidence": "HIGH | MEDIUM | LOW | INSUFFICIENT_EVIDENCE", "evidenceStatus": "VERIFIED | PARTIAL | UNVERIFIED | INSUFFICIENT_EVIDENCE" },
    { "name": "Documentation", "score": number, "maxScore": 10, "justification": string, "evidence": string[], "confidence": "HIGH | MEDIUM | LOW | INSUFFICIENT_EVIDENCE", "evidenceStatus": "VERIFIED | PARTIAL | UNVERIFIED | INSUFFICIENT_EVIDENCE" },
    { "name": "Overall Quality", "score": number, "maxScore": 10, "justification": string, "evidence": string[], "confidence": "HIGH | MEDIUM | LOW | INSUFFICIENT_EVIDENCE", "evidenceStatus": "VERIFIED | PARTIAL | UNVERIFIED | INSUFFICIENT_EVIDENCE" }
  ],
  "verifiedClaims": string[],
  "unverifiedClaims": string[],
  "missingEvidence": string[],
  "inconsistencies": string[],
  "summary": string
}

Project Data:
${JSON.stringify(projectData, null, 2)}

Pre-analyzed Evidence Breakdown:
${JSON.stringify(evidenceData || {}, null, 2)}

Plagiarism Data:
${JSON.stringify(plagiarismData || {}, null, 2)}`;

      const res = await this.client.models.generateContent({
        model: this.modelName,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' },
      });

      const text = res.text;
      if (!text) {
        throw new Error('AI provider returned empty evaluation response.');
      }

      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed.criteria) || parsed.criteria.length < 7) {
        throw new Error('AI provider returned malformed evaluation criteria.');
      }

      const hasSourceCode = Boolean(
        evidenceData?.verifiedEvidence?.some((e: string) => e.toLowerCase().includes('code') || e.toLowerCase().includes('repository')) ||
        (projectData.githubUrl && projectData.githubUrl.trim().length > 10)
      );

      const getCrit = (name: string, fallbackMax: number) => {
        const found = parsed.criteria.find((c: any) => (c.name || '').toLowerCase().includes(name.toLowerCase())) || {};
        let sc = Math.min(found.maxScore || fallbackMax, Math.max(0, Number(found.score) || 0));
        let conf = found.confidence || 'MEDIUM';
        let feedback = found.justification || 'Evaluated based on submitted evidence.';
        let evidenceList = Array.isArray(found.evidence) ? found.evidence : [];

        // Strict Requirement: If source code is missing, Code Quality cannot award positive scores
        if (name === 'Code Quality' && !hasSourceCode) {
          sc = 0;
          conf = 'INSUFFICIENT_EVIDENCE';
          feedback = 'Insufficient evidence to evaluate this criterion. Source code archive or valid repository was not submitted.';
          evidenceList = [];
        }

        return {
          name: found.name || name,
          maxScore: found.maxScore || fallbackMax,
          obtainedScore: Math.round(sc * 10) / 10,
          feedback,
          confidence: conf,
          evidence: evidenceList,
        };
      };

      const critMap = {
        problemDefinition: getCrit('Problem Definition', 15),
        innovationNovelty: getCrit('Innovation', 20),
        technicalImplementation: getCrit('Technical Implementation', 20),
        functionality: getCrit('Functionality', 15),
        codeQuality: getCrit('Code Quality', 10),
        documentation: getCrit('Documentation', 10),
        overallQuality: getCrit('Overall Quality', 10),
      };

      // Strict requirement: Total score MUST equal the exact sum of individual criteria
      const calculatedScore = Math.min(
        100,
        Math.max(
          0,
          Math.round(
            Object.values(critMap).reduce((sum, c) => sum + c.obtainedScore, 0) * 10
          ) / 10
        )
      );

      return {
        overallScore: calculatedScore,
        maxScore: 100,
        criteria: critMap,
        criteriaList: parsed.criteria,
        verifiedClaims: Array.isArray(parsed.verifiedClaims) ? parsed.verifiedClaims : (evidenceData?.verifiedEvidence || []),
        unverifiedClaims: Array.isArray(parsed.unverifiedClaims) ? parsed.unverifiedClaims : (evidenceData?.unverifiedClaims || []),
        missingEvidence: Array.isArray(parsed.missingEvidence) ? parsed.missingEvidence : (evidenceData?.missingEvidence || []),
        inconsistencies: Array.isArray(parsed.inconsistencies) ? parsed.inconsistencies : (evidenceData?.inconsistencies || []),
        strengths: parsed.verifiedClaims && parsed.verifiedClaims.length > 0 ? parsed.verifiedClaims : ['Problem scope articulated'],
        weaknesses: [
          ...(Array.isArray(parsed.missingEvidence) ? parsed.missingEvidence : []),
          ...(Array.isArray(parsed.unverifiedClaims) ? parsed.unverifiedClaims : []),
        ],
        technicalAnalysis: `Technical evaluation verified against submitted code artifacts. Unverified claims: ${parsed.unverifiedClaims?.length || 0}.`,
        codeAnalysis: hasSourceCode
          ? 'Code evaluation completed based on verified implementation artifacts.'
          : 'Code Quality marked Insufficient Evidence: No source code archive or repository submitted.',
        documentationAnalysis: 'Documentation reviewed against setup and architectural deliverables.',
        actionableSuggestions: (parsed.missingEvidence || []).map((m: string) => `Provide evidence for: ${m}`),
        improvementPlan: [
          { area: 'Evidence Verification', suggestion: 'Attach complete runnable code and dependency configs.', priority: 'High' },
          { area: 'Testing', suggestion: 'Provide automated test coverage reports.', priority: 'Medium' },
        ],
        summary: parsed.summary || `Evaluated project across 7 criteria. Verified Score: ${calculatedScore}/100.`,
        aiModel: this.modelName,
        confidence: hasSourceCode ? 'HIGH' : 'LOW',
      };
    } catch (err: any) {
      console.warn('⚠️ [GeminiProvider]: Error during evaluateProject:', err?.message || 'Unknown error');
      if (config.ai.provider === 'gemini') {
        throw new Error(err?.message || 'AI evaluation service is currently unavailable. Please try again.');
      }
      return this.fallbackProvider.evaluateProject(projectData, plagiarismData, evidenceData);
    }
  }

  async evaluateClassroomSubmission(submissionData: any, plagiarismData?: any, evidenceData?: any): Promise<ClassroomAIEvaluationResult> {
    if (!this.client) {
      if (config.ai.provider === 'gemini') {
        throw new Error('AI evaluation service is currently unavailable: Gemini API key is missing or not configured.');
      }
      return this.fallbackProvider.evaluateClassroomSubmission(submissionData, plagiarismData, evidenceData);
    }

    try {
      const prompt = `You are the Provalix AI Classroom Task Evaluator. Evaluate this student classroom submission across the 5 classroom criteria totaling 50 marks:
1. Correctness & Relevance (Max 10)
2. Technical Understanding (Max 10)
3. Implementation & Code (Max 10)
4. Reasoning & Analysis (Max 10)
5. Completeness & Documentation (Max 10)

CRITICAL INSTRUCTIONS:
- Evaluate each criterion independently based on evidence.
- Identify errors, unverified claims, and inconsistencies.
- Return valid JSON matching this schema:
{
  "overallScore": number,
  "maxScore": 50,
  "criteria": [
    { "name": "Correctness & Relevance", "score": number, "maxScore": 10, "justification": string, "evidence": string[], "confidence": "HIGH | MEDIUM | LOW | INSUFFICIENT_EVIDENCE" },
    { "name": "Technical Understanding", "score": number, "maxScore": 10, "justification": string, "evidence": string[], "confidence": "HIGH | MEDIUM | LOW | INSUFFICIENT_EVIDENCE" },
    { "name": "Implementation & Code", "score": number, "maxScore": 10, "justification": string, "evidence": string[], "confidence": "HIGH | MEDIUM | LOW | INSUFFICIENT_EVIDENCE" },
    { "name": "Reasoning & Analysis", "score": number, "maxScore": 10, "justification": string, "evidence": string[], "confidence": "HIGH | MEDIUM | LOW | INSUFFICIENT_EVIDENCE" },
    { "name": "Completeness & Documentation", "score": number, "maxScore": 10, "justification": string, "evidence": string[], "confidence": "HIGH | MEDIUM | LOW | INSUFFICIENT_EVIDENCE" }
  ],
  "verifiedClaims": string[],
  "unverifiedClaims": string[],
  "missingEvidence": string[],
  "inconsistencies": string[],
  "summary": string
}

Submission Data:
${JSON.stringify(submissionData, null, 2)}

Evidence Data:
${JSON.stringify(evidenceData || {}, null, 2)}`;

      const res = await this.client.models.generateContent({
        model: this.modelName,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' },
      });

      const text = res.text;
      if (!text) {
        throw new Error('AI provider returned empty classroom evaluation response.');
      }

      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed.criteria) || parsed.criteria.length < 5) {
        throw new Error('AI provider returned malformed classroom evaluation criteria.');
      }

      // Compute rawScore strictly as sum of the 5 criteria
      const rawScore = Math.min(
        50,
        Math.max(
          0,
          Math.round(
            parsed.criteria.reduce((sum: number, c: any) => sum + Math.max(0, Math.min(c.maxScore || 10, Number(c.score) || 0)), 0) * 10
          ) / 10
        )
      );

      const deduction = plagiarismData?.deduction ?? 0;
      const finalScore = Math.max(0, Math.round((rawScore - deduction) * 10) / 10);

      return {
        rawScore,
        maxScore: 50,
        codeSimilarity: plagiarismData?.codeSimilarity ?? 0,
        reportSimilarity: plagiarismData?.reportSimilarity ?? 0,
        overallSimilarity: plagiarismData?.overallSimilarity ?? 0,
        deduction,
        finalScore,
        plagiarismStatus: plagiarismData?.status ?? 'Low',
        plagiarismReason: plagiarismData?.reason,
        matchedSources: plagiarismData?.matchedSources || [],
        criteriaList: parsed.criteria,
        verifiedClaims: parsed.verifiedClaims || [],
        unverifiedClaims: parsed.unverifiedClaims || [],
        missingEvidence: parsed.missingEvidence || [],
        inconsistencies: parsed.inconsistencies || [],
        feedback: parsed.summary || `Classroom AI evaluation completed across all 5 criteria. Final Score: ${finalScore}/50.`,
        improvementPlan: [
          { area: 'Correctness', suggestion: 'Address any highlighted inaccuracies or missing analytical points.', priority: 'High' },
        ],
        isDemoData: false,
      };
    } catch (err: any) {
      console.warn('⚠️ [GeminiProvider]: Error during evaluateClassroomSubmission:', err?.message || 'Unknown error');
      if (config.ai.provider === 'gemini') {
        throw new Error(err?.message || 'AI evaluation service is currently unavailable. Please try again.');
      }
      return this.fallbackProvider.evaluateClassroomSubmission(submissionData, plagiarismData, evidenceData);
    }
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
