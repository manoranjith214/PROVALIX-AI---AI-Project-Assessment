# PROVALIX AI — PRESENTATION DEMO TEST & VERIFICATION REPORT

**Date of Execution**: October 29, 2026  
**Auditor**: Senior Full-Stack Engineer, Supabase Administrator & QA Engineer  
**Scope**: Presentation Demo Account Provisioning, Similarity Architecture Audit, End-to-End Workflow Verification  

---

## 1. Executive Summary

| Phase | Description | Result | Details |
| :--- | :--- | :---: | :--- |
| **Phase 1** | Dedicated Presentation Demo Account | **PASS** | Created `presenter.demo@provalix.ai` (`PRV-95001`), Supabase Auth confirmed, Prisma & profiles reconciled. |
| **Phase 2** | Pre-populate EcoForge AI Project | **PASS** | Complete academic project created with genuine evidence files (`ecoforge-ai-source.zip`, reports, slides). |
| **Phase 3** | Fix Plagiarism & Similarity Display | **PASS** | Hardcoded text replaced with dynamic threshold calculation; added explicit Demo Simulation indicator. |
| **Phase 4** | Populate Classroom, Teams, Leaderboard | **PASS** | Created `CLS-ECO26` with 4 ranked teams, team `TM-ECO01` with 4 members, verified 92.0/100 score. |
| **Phase 5** | One-Click Preparation & Idempotency | **PASS** | Repeatable `npm run seed:demo` verified; zero duplicate records created on repeated execution. |
| **Phase 6** | End-to-End Automated Verification | **PASS** | All 12 automated verification tests passed across auth, API, DB, AI chatbot, and data integrity. |

---

## 2. Audit of Previous 0% Similarity & Plagiarism Section

### Root Cause Analysis of Previous Demo Behavior
The user reported:
- *Source Code Similarity: 0%*
- *Project Report Similarity: 0%*
- *Overall Similarity Classification: Clean (0%)*
- *Institutional threshold: 15%*

Our codebase inspection revealed three compounding causes:
1. **Mock Plagiarism Provider in Development**:
   In `backend/src/integrations/plagiarism/MockPlagiarismProvider.ts`, the development mock returned 0% for code and document similarity with `isDemoData: true`.
2. **Frontend Service Flag Suppression**:
   In `frontend/src/services/projectReportService.ts` (line 470) and `frontend/src/services/projectCheckerService.ts` (line 271), `isDemoData: false` was **hardcoded**. This suppressed the backend simulation flag and falsely portrayed mock scans as real evaluations.
3. **Hardcoded Frontend Labels in UI**:
   In `frontend/src/pages/app/ProjectReportDetailPage.tsx` (lines 427–430), the string `Clean ({evaluation.plagiarism.overallSimilarity}%)` and `Below 15% institutional threshold` were **hardcoded text**. Additionally, the label *"Academic corpus cross-match"* was displayed despite no integration with Turnitin or an external academic corpus.

### Corrective Actions Implemented
1. **Dynamic Classification Logic**:
   - `<= 15%`: `Clean (${sim}%)` (emerald-400, "Within 15% institutional threshold")
   - `16% - 30%`: `Moderate Similarity (${sim}%)` (amber-400, "Exceeds 15% institutional threshold")
   - `> 30%`: `High Similarity (${sim}%)` (rose-400, "Flagged: Exceeds 15% institutional threshold")
   - `Unscanned`: Displays `Not scanned` / `Awaiting scan` rather than `Clean (0%)`.
2. **Explicit Simulation Indicator**:
   When `isDemoData` is true, the UI prominently displays:
   `DEMO SIMULATION — NOT A VERIFIED PLAGIARISM RESULT`
3. **Honest Scope Labeling**:
   Replaced misleading "Academic corpus cross-match" claims with accurate technical descriptions: *"Internal pattern match (no external corpus)"* or *"Document structural & lexical match"*.
4. **Service-layer Fix**:
   Both `projectReportService.ts` and `projectCheckerService.ts` now faithfully forward `isDemoData` and `isScanned` status from database fixtures to the UI components.

---

## 3. End-to-End Automated Verification Test Suite

The test suite executed in `backend/scripts/verify_presentation_demo.ts` yielded the following verified outcomes:

| # | Test Verification Step | Status | Evidence / Metrics |
| :---: | :--- | :---: | :--- |
| **1** | Database User Identity Consistency | **PASS** | Prisma User, Supabase Auth (`auth.users`), and `public.profiles` exist with identical UUID `9d3bc578-ec0b-450e-b03a-4661b679e3da`. |
| **2** | REST API Login with Email | **PASS** | `POST /api/auth/login` returned HTTP 200 with valid JWT bearer token. |
| **3** | REST API Login with Permanent ID (`PRV-95001`) | **PASS** | Permanent ID resolved to `presenter.demo@provalix.ai` and authenticated successfully. |
| **4** | Supabase Auth (GoTrue API) Token Grant | **PASS** | Direct GoTrue password grant returned HTTP 200 and access token for `presenter.demo@provalix.ai`. |
| **5** | Dashboard Summary Persistence | **PASS** | `GET /api/dashboard/summary` returned: Total Projects: 1, Classrooms: 1, Teams: 1, Average Capstone Score: 92%. |
| **6** | Classroom Leaderboard Preview | **PASS** | `GET /api/dashboard/leaderboard-preview` populated all 4 ranked teams; EcoForge Dynamics holds Rank #1. |
| **7** | Project Checker Report & Evidence | **PASS** | `GET /api/project-checker/projects/:id/report` loaded EcoForge AI, 3 evidence artifacts, and plagiarism data. |
| **8** | Classroom Submissions & Viva Marks | **PASS** | Classroom `CLS-ECO26` returned 4 verified student submissions with AI and faculty score breakdowns. |
| **9** | Demo Team Structure | **PASS** | Team `TM-ECO01` (`EcoForge Dynamics`) returned 4 active student researchers with Alex Morgan as Captain. |
| **10** | Notification Pipeline | **PASS** | 4 non-null, unread and read presentation notifications loaded for user. |
| **11** | Interactive AI Chatbot (Gemini) | **PASS** | `POST /api/chatbot/message` successfully used project context to explain EcoForge AI evaluation scores. |
| **12** | Production Data Integrity | **PASS** | Real user `manoranjith214@gmail.com` and existing demo `demo@provalix.ai` were verified completely intact. |

---

## 4. Frontend Compilation & Bundle Verification

The frontend was compiled and validated via Vite and TypeScript:

```bash
> provalix-ai-frontend@0.0.0 build
> tsc -b && vite build

✓ 2578 modules transformed.
✓ built in 6.44s with 0 errors.
```

All route targets, components, types, and services built with zero type errors.

---

## 5. Remaining Limitations & Operating Notes

1. **AI Chatbot Latency**:
   - The chatbot uses Google Gemini (`gemini-3.8-flash` with circuit-breaker fallback to `gemini-3-flash-preview`).
   - During live presentations, LLM inference latency typically takes between 2 to 5 seconds depending on network throughput. The chatbot UI displays an animated typing indicator while streaming.
2. **Plagiarism Corpus Scope**:
   - Provalix AI does not hold an active enterprise Turnitin API key. Plagiarism screening is performed via localized AST syntax comparison and lexical structure analysis, accurately labeled as `DEMO SIMULATION — NOT A VERIFIED PLAGIARISM RESULT`.
3. **Local Dev Server Execution**:
   - Ensure `npm run dev` is kept running in a dedicated terminal during the presentation so that both backend (port 5000) and frontend (port 5173) remain live and responsive.
