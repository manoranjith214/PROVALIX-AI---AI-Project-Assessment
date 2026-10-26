# CHAPTER 6 — CONCLUSION AND FUTURE ENHANCEMENTS

---

## 6.1 Conclusion

The assessment of undergraduate engineering capstone projects represents a critical benchmark of student competency, faculty mentoring, and institutional accreditation. However, traditional manual evaluation workflows have long been compromised by evaluator fatigue, subjective grading inconsistencies, superficial code inspection, undetected source code plagiarism, and unstandardized oral examinations.

This project successfully designed, engineered, and verified **Provalix AI — Automated Student Project Assessment Platform with Plagiarism Detection**. Provalix AI transforms the academic evaluation paradigm by uniting deep in-memory static code analysis across 16+ programming languages, schema-constrained Generative Artificial Intelligence (Google Gemini 3.8 Flash), an automated tokenized plagiarism detection pipeline, an intelligent categorical viva-voce question generator, and a secure multi-tenant classroom governance architecture into a unified, cloud-native web ecosystem.

Through 27 automated unit, integration, and security test suites, the platform demonstrated high API responsiveness, sub-second static code parsing, strict resilience against adversarial file uploads (zip bombs and path traversals), objective 100-mark rubric enforcement, and verifiable evaluation consistency. Provalix AI empowers engineering faculties to conduct transparent, equitable, and thorough project assessments while delivering students actionable diagnostic feedback that elevates the quality of higher engineering education.

---

## 6.2 Objectives Achieved

All primary engineering and pedagogical objectives defined at the inception of this capstone project were successfully accomplished:
1. **Multi-Tenant Full-Stack Architecture**: Realized a high-performance web platform combining a React 18 / TypeScript single-page application built on Vite and styled with TailwindCSS, backed by an Express.js / Node.js 20 REST API and a PostgreSQL database managed via Prisma ORM.
2. **Language-Agnostic Static Code Inspection**: Implemented an in-memory extraction engine capable of analyzing source code across 16+ programming languages, extracting LOC counts, language distributions, configuration files, test suite presence (`jest`, `pytest`, `unittest`), duplication ratios, and architectural code smells.
3. **Structured Generative AI Evaluation**: Integrated Google Gemini 3.8 Flash through the official `@google/genai` SDK with strict JSON schema enforcement, eliminating hallucinated responses and executing consistent, multi-criteria rubric evaluations.
4. **Plagiarism Pipeline with Direct Mark Deductions**: Formulated a multi-stage code normalization and n-gram token hashing pipeline that calculates code and report similarity indices, automatically applying proportional deductions to the AI evaluation score.
5. **Standardized Oral Defense (Viva Voce) Generation**: Developed an AI-powered question generator that synthesizes exactly five tailored technical questions distributed across five core academic pillars, standardizing oral defense examinations (max 25 marks).
6. **Authoritative Server-Side Mark Aggregation**: Established an unalterable backend scoring formula synthesizing AI evaluation (50 marks), presentation/demo marks (25 marks), and oral viva defense marks (25 marks) into an authoritative 100-mark final grade.
7. **Vector PDF Certificate Synthesis**: Built a high-performance server-side PDF generator (`pdfkit`) streaming official academic evaluation certificates featuring verification seals, score breakdowns, and actionable student improvement roadmaps.
8. **Comprehensive Quality Assurance**: Verified all functional modules across 27 automated test suites spanning 174 test cases with a 100% pass rate.

---

## 6.3 Technical Contributions of the Project

The core technical contributions of this project to the domain of educational software engineering include:
1. **Grounded AI Evaluation via Evidence Envelopes**: Unlike existing AI grading experiments that feed raw student prompts directly to LLMs, Provalix AI pioneers a two-stage pipeline where static code metrics (LOC, smells, test coverage, dependencies) are pre-extracted and injected into schema-constrained prompts, eliminating AI hallucinations.
2. **In-Memory Adversarial Archive Defense**: Formulated an in-memory ZIP inspection engine enforcing entry ceilings (2,000 files), decompression thresholds (100 MB), and path traversal sanitation, ensuring complete server runtime safety without writing untrusted archives to disk.
3. **Automated Oral Defense Question Categorization**: Introduced the first automated system to analyze candidate codebases and generate structured oral viva-voce questions mapped across five specific engineering competencies (Problem Understanding, Technical Implementation, Technology Choice, Feature Mechanics, Scenario Handling).
4. **Unified Multi-Tier Capstone Governance**: Synthesized standalone project audits, permanent student identifiers (`PRV-XXXXX`), cross-classroom reusable student squads (`TM-XXXXX`), classroom join codes (`CLS-XXXXX`), and dual-stage faculty verification into a single cohesive platform.

---

## 6.4 Current System Limitations

The current release of Provalix AI operates within the following technical boundaries:
1. **Static Analysis vs. Sandboxed Dynamic Execution**: The platform currently analyzes software statically without executing student test suites inside isolated Docker containers. Consequently, dynamic runtime performance, memory leaks, and runtime edge-case crashes are inferred from code smells rather than observed directly.
2. **Plagiarism Corpus Scope**: The native plagiarism detection engine computes similarity against internal student cohorts and submitted archives. Deep cross-referencing against global internet repositories and commercial journal databases requires external commercial API credentials (e.g., Copyleaks).
3. **Storage Tier Fallback**: In development environments lacking Supabase cloud storage credentials, the system falls back to local server disk storage, requiring manual file backup routines.

---

## 6.5 Future Enhancements and Extensions

To expand the platform's utility across international universities and autonomous engineering colleges, the following future enhancements are planned:

### 6.5.1 Containerized Dynamic Runtime Code Execution (Docker Sandbox)
Integrate lightweight Docker/gVisor sandboxed execution containers allowing the backend to dynamically execute student test suites (`npm test`, `pytest`, `mvn test`), measure actual code coverage percentages, profile memory consumption, and detect infinite loops or runtime crashes.

### 6.5.2 Git Repository Webhook Integration
Expand project ingestion beyond ZIP archives by integrating GitHub and GitLab webhooks, allowing the system to analyze commit histories, individual student commit distributions, pull request reviews, and continuous integration (CI) build statuses.

### 6.5.3 Native Web-Scale Plagiarism Crawling
Incorporate an automated open-source repository crawler that searches GitHub, GitLab, and Hugging Face public repositories for matching AST clone fingerprints, identifying open-source project clones without relying on external commercial APIs.

### 6.5.4 Automated Audio/Video Viva Voce Transcription and Analysis
Incorporate speech-to-text models (such as Whisper) and video emotion/confidence analysis to transcribe oral defense sessions in real-time, verifying whether the student who speaks matches the enrolled student's biometric identity.

### 6.5.5 Seamless Campus ERP and LMS Integrations
Develop LTI (Learning Tools Interoperability) v1.3 compliance modules enabling one-click integration with enterprise institutional LMS platforms including Moodle, Canvas, Blackboard, and Google Classroom.

### 6.5.6 AI-Powered Code Refactoring Recommendations
Extend the interactive AI assistant to generate interactive inline code diffs (`git diff` format), demonstrating to students exactly how to refactor monolithic functions, eliminate cyclomatic nesting, and introduce design patterns.

---

## 6.6 Final Remarks

**Provalix AI** demonstrates that combining static program analysis, structured Generative AI reasoning, and secure full-stack software architecture can solve the chronic challenges of academic capstone project evaluation. By eliminating evaluator fatigue, establishing objective grading rubrics, detecting source code plagiarism, and standardizing the oral viva examination, Provalix AI upholds academic integrity and equips engineering institutions with a state-of-the-art platform for cultivating the next generation of software engineers.
