# PROVALIX AI — SYSTEM AUDIT & SUPABASE RECOVERY REPORT

**Project Name:** PROVALIX AI: AI-Based Automated Student Project Evaluation Platform  
**Audit Date:** October 2026  
**Auditor Roles:** Senior Full-Stack Engineer, Database Administrator, QA Engineer, Security Auditor, Deployment Specialist  
**Repository Working Directory:** `c:\Users\Manoranjith\Downloads\PROVALIX-AI`

---

## 1. Executive Summary

PROVALIX AI is a full-stack, enterprise-grade automated academic evaluation system combining a React (Vite + TypeScript) single-page application, an Express/Node.js backend, a PostgreSQL database managed via Prisma ORM hosted on Supabase, and a Google Gemini AI integration.

The system was inactive for approximately seven days, resulting in two verified root problems:
1. **Supabase Inactivity Pause (Critical - P0):** Supabase automatically pauses free-tier projects after 7 days of inactivity. Project reference `tbclerczuvetkaaljdhh` was paused. Its DNS endpoint (`tbclerczuvetkaaljdhh.supabase.co`) was removed (`ENOTFOUND`), and its connection pooler rejected database connections with `FATAL: (ENOTFOUND) tenant/user postgres.tbclerczuvetkaaljdhh not found`. Because all user sessions, classrooms, teams, and chatbot message histories require database queries, the application failed across authentication, database reads/writes, and chatbot conversation creation.
2. **AI Chatbot Model Availability (High - P1):** The configured Google Gemini model `gemini-3.8-flash` encountered temporary Google server capacity spikes (`HTTP 503: This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.` and `HTTP 504: DEADLINE_EXCEEDED`). The provider had no standby model fallback, causing requests to fail completely even though compatible Gemini models (such as `gemini-3.5-flash`) were active and responsive under the user's API key.

---

## 2. Architecture & Integration Overview

```
                                      +--------------------------------------------+
                                      |         PROVALIX-AI FRONTEND SPA           |
                                      |   (React 18 + Vite + TypeScript + Tailwind)  |
                                      +--------------------------------------------+
                                             /                              \
                           Client Auth & Storage                 REST API via ApiClient
                                           /                                  \
                                          v                                    v
+---------------------------------------------+       +--------------------------------------------+
|         SUPABASE CLOUD INFRASTRUCTURE       |       |            PROVALIX BACKEND API            |
|       Project Ref: tbclerczuvetkaaljdhh     |       |       (Node.js 20 + Express 4.21 + TS)     |
|                                             |       +--------------------------------------------+
| 1. Supabase Auth (JWT & session tokens)     |         | - Auth Middleware (JWT & Supabase verify) |
| 2. Supabase Storage (Upload buckets)        |         | - Source Analyzer (Zip bomb & traversal)  |
| 3. PostgreSQL Database (aws-0-ap-southeast-2)         | - Plagiarism Engine (Local TF-IDF / API)  |
+---------------------------------------------+         | - PDFKit Vector Dynamic Report Generator  |
                      ^                                 | - Google GenAI SDK (Gemini AI Engine)     |
                      |                                 +--------------------------------------------+
                      |                                       /                     \
                      +------------ Prisma ORM ---------------+                      \
                            (Connection Pooler :5432)                           Gemini API Calls
                                                                                       \
                                                                                        v
                                                                +--------------------------------------------+
                                                                |              GOOGLE GEMINI AI              |
                                                                |       Primary: gemini-3.8-flash            |
                                                                |       Standby Failover: gemini-3.5-flash   |
                                                                +--------------------------------------------+
```

### Components & Technologies:
- **Frontend:** React 18, Vite 8.3, TypeScript 5.7, TailwindCSS, Lucide React, Recharts.
- **Backend API:** Node.js 20, Express 4.21, TypeScript, Zod schema validation, Helmet, CORS, Express-Rate-Limit.
- **Database & Persistence:** PostgreSQL via Prisma ORM (`@prisma/client` 5.22.0) hosted on Supabase (`tbclerczuvetkaaljdhh`).
- **File Upload Security:** Multer with magic-byte signature validation (blocks Windows PE `.exe`, Linux ELF, macOS Mach-O, `.bat`, `.sh`, `.php`).
- **Archive Extraction:** `adm-zip` with zip bomb protection (max 2000 entries, 100MB uncompressed limit, 5MB max entry) and path traversal defense (`..`, `/`, `\0` sanitized).
- **AI Engine:** Google GenAI SDK (`@google/genai` 2.24.0) with structured JSON schemas and RAG context filtering.

---

## 3. Verified Issues, Root Causes, and Severity Matrix

| ID | Issue Description | Root Cause | Severity | Affected Files | Status |
|---|---|---|---|---|---|
| **ISSUE-01** | Website authentication, session restoration, and database queries failing with `tenant/user not found` and `ENOTFOUND` | Supabase project `tbclerczuvetkaaljdhh` paused due to 7 days of inactivity on the free tier. | **P0 (Critical)** | `backend/.env`, `frontend/.env`, Prisma client, Supabase client | **Action required in Supabase Dashboard (Unpause)** |
| **ISSUE-02** | AI Chatbot returns HTTP 503 / 504 / server errors | `gemini-3.8-flash` is experiencing temporary capacity spikes on Google's servers. The provider lacked fallback to alternative active Flash models. | **P1 (High)** | `backend/src/integrations/ai/GeminiProvider.ts` | **FIXED** (Added standby failover to `gemini-3.5-flash`) |
| **ISSUE-03** | Chatbot messages fail before AI invocation | `ChatbotService` mandates persistence to `prisma.conversation` and `prisma.chatMessage`. Paused DB blocked chatbot controller before sending prompt to Gemini. | **P1 (High)** | `backend/src/integrations/chatbot/ChatbotService.ts`, `backend/src/controllers/chatbotController.ts` | **Diagnosed; will auto-resolve once Supabase is unpaused** |
| **ISSUE-04** | Chatbot architecture test timeouts in Jest | Jest default timeout was 5000ms, while real Gemini API network calls with backoff take 6-10s. | **P2 (Medium)** | `backend/tests/chatbot_architecture.test.ts` | **FIXED** (Added `jest.setTimeout(45000)`) |
| **ISSUE-05** | Missing root environment template | Only subfolder `.env.example` files existed; workspace root lacked a unified environment template. | **P3 (Low)** | `.env.example` | **FIXED** (Created root `.env.example`) |

---

## 4. Phase-by-Phase Audit Findings

### Phase 2 — Supabase Recovery Audit

#### Runtime Connectivity Evidence:
1. **Public REST & Auth Endpoint:**
   - URL: `https://tbclerczuvetkaaljdhh.supabase.co`
   - Node DNS lookup: `DNS tbclerczuvetkaaljdhh.supabase.co: getaddrinfo ENOTFOUND tbclerczuvetkaaljdhh.supabase.co`
   - HTTP Status: `FetchError: fetch failed (ENOTFOUND)`
2. **Postgres Connection Pooler:**
   - Host: `aws-0-ap-southeast-2.pooler.supabase.com:5432`
   - Database: `postgres`
   - User: `postgres.tbclerczuvetkaaljdhh`
   - Prisma query test result: `PrismaClientInitializationError: Error querying the database: FATAL: (ENOTFOUND) tenant/user postgres.tbclerczuvetkaaljdhh not found`

#### Explanation of Supabase Pausing Behavior:
Supabase automatically pauses projects on the Free Plan that have not received incoming traffic or API requests for seven consecutive days. When paused:
- The sub-domain DNS record (`[project-ref].supabase.co`) is deleted from public DNS.
- The PostgreSQL database Docker container is stopped to conserve compute resources.
- The pooler gateway returns `tenant not found`.
- **CRITICAL NOTE:** All database schemas, tables (`User`, `Team`, `Classroom`, `Submission`, `ProjectCheckerProject`, `ChatConversation`, `ChatMessage`), migrations, and stored data are **100% intact and preserved in cold storage**.

#### Safe Recovery Instructions:
To restore the existing database WITHOUT deleting or replacing anything:
1. Open your browser and navigate to: **[https://supabase.com/dashboard](https://supabase.com/dashboard)**.
2. Sign in with the account owning the Provalix project.
3. Locate project **`tbclerczuvetkaaljdhh`** in your project list.
4. You will see a banner stating: *"This project is paused"*.
5. Click the green button: **"Restore project"** (or **"Unpause project"**).
6. Wait 1 to 2 minutes for Supabase to provision compute containers, attach disk volumes, and rebind DNS.
7. Run the non-destructive verification script in `backend`:
   ```bash
   cd backend
   npx ts-node scripts/verify_db_connection.ts
   ```
   Expected output: `✅ Prisma connected to Supabase successfully!`

---

### Phase 3 & 4 — Complete Website & End-to-End Audit

#### A. Authentication
- **Registration:** Implemented in `frontend/src/pages/auth/RegisterPage.tsx` and `AuthContext.tsx`. Performs email duplicate check, generates `PRV-XXXXX` permanent ID, creates Supabase user with metadata, and records in database.
- **Login:** Supports both Institutional Email and Permanent User ID (`PRV-XXXXX`). Verified in `AuthContext.login()`.
- **Session Persistence:** Dual storage: Supabase Auth session in LocalStorage + JWT Access/Refresh tokens via `tokenStorage.ts`. Token auto-refresh implemented with 60-second expiry buffer.
- **Backend Auth Middleware:** `backend/src/middleware/authMiddleware.ts` verifies local JWTs first, checks in-memory token cache (60s TTL), and falls back to Supabase Auth token validation. Automatically provisions local user records to satisfy foreign key constraints.

#### B. AI Chatbot
- **Provider & Engine:** Google GenAI SDK (`@google/genai`) using Gemini.
- **RAG & Intent Classification:** `QueryClassifier.ts` classifies intents (`CASUAL`, `PROGRAMMING`, `ACADEMIC`, `PROJECT`, `RUBRIC`, `DEADLINE`, `TEAM`, `CLASSROOM`).
- **Context Isolation:** Casual or general questions (e.g., "What is React?") do NOT inject project data, preventing hallucinated grades. Project questions (e.g., "What is my score?") query authorized user submissions.
- **Model Availability:** `gemini-3.8-flash` was intermittently failing with 503 high demand. Repaired by implementing bounded retry with model failover to `gemini-3.5-flash`.
- **Security:** Error logs redact all API keys (`replace(/key=[^&]+/gi, 'key=[REDACTED]')`). Keys are never sent to the browser bundle.

#### C. Project Checker
- **Routes & Controller:** `POST /api/project-checker/projects`, `POST /api/project-checker/projects/:id/resources`, `POST /api/project-checker/projects/:id/ai-evaluate`.
- **7-Criteria Evaluation Rubric (/100):**
  1. Problem Definition (15 marks)
  2. Innovation & Novelty (20 marks)
  3. Technical Implementation (20 marks)
  4. Functionality (15 marks)
  5. Code Quality (10 marks)
  6. Documentation (10 marks)
  7. Overall Quality (10 marks)
- **Code Quality Evidence Gate:** If source code is absent or unverified, Code Quality is scored 0 with status `INSUFFICIENT_EVIDENCE`.
- **Vector PDF Report:** Dynamically generated using `pdfkit` at `GET /api/project-checker/projects/:id/report/pdf`.

#### D. Classrooms & Evaluation Cohorts
- **Creation & Codes:** Auto-generates unique 6-character alphanumeric classroom join codes.
- **Roles:** `OWNER`, `EVALUATOR`, `MEMBER`.
- **Submission Modes:** Supports both `Individual` and `Team` cohorts with configurable minimum and maximum team sizes.
- **Evaluation Gate:** Evaluators score viva questions (/25) and PPT/Demo (/25); AI evaluates submission (/50). Final score calculated out of 100 with official verification workflow.

#### E. Teams & Squads
- **Capabilities:** Independent team formation with reusable join codes (`TM-XXXXX`), captain ownership transfer, and participation approval gate per classroom.

#### F. Dashboard & Analytics
- **Live Data:** Fetches active submissions, recent reports, upcoming deadlines, and leaderboard rankings using non-blocking `Promise.allSettled`.
- **Graceful Degradation:** Displays clean empty states and network retry options when backend is unreachable.

---

## 5. Security & Deployment Audit

1. **Secret Leakage:**
   - Scanned `frontend/src` for `GEMINI_API_KEY`, `JWT_SECRET`, and `SUPABASE_SERVICE_ROLE_KEY`. **Zero leaks detected.** Frontend only contains public Supabase URL and anon key.
2. **File Upload Security:**
   - Magic bytes inspection prevents disguised `.exe`, `.bat`, `.sh`, `.php`, `.dll`. Validates `%PDF`, PNG header, JPEG header, and GIF header.
3. **Archive Security:**
   - Path traversal (`../`, `\0`, leading `/`) blocked in `sourceCodeAnalyzer.ts`. Maximum 2,000 entries and 100MB uncompressed limit prevents zip bombs.
4. **CORS:** Strict origin checks configured against `FRONTEND_URL` and `CORS_ORIGIN`.
5. **Rate Limiting:** Distinct rate limits applied for general API (`150 req/15min`), authentication, and AI evaluation endpoints.
