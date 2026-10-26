# PROJECT SCREENSHOT CHECKLIST & CAPTION CATALOG

This document provides the exhaustive screenshot capture catalog for **Provalix AI**. When compiling the final academic project report or presentation, capture each screen from the running application (`http://localhost:5173`) according to the precise state, route, and action specified below.

---

## 1. Screenshot Capture Matrix

| Figure Number | Figure Title / Caption | Target Route URL | Application State & Required Action | Key Elements to Showcase in Capture |
| :---: | :--- | :--- | :--- | :--- |
| **FIG 5.1** | User Interface: Modern Responsive Landing Page | `http://localhost:5173/` | Unauthenticated public visitor state. Scroll to show hero section and core feature cards. | Hero headline, "Get Started" CTA button, platform feature badges, modern SaaS light aesthetic. |
| **FIG 5.2** | User Interface: Secure Login and Register Portal | `http://localhost:5173/login` or `/register` | Registration form filled with sample student data (Department, Year, College). | Input fields, permanent ID (`PRV-XXXXX`) notice, validation cues, toggle between Login and Sign Up. |
| **FIG 5.3** | User Interface: Student and Faculty Dashboard Overview | `http://localhost:5173/dashboard` | Logged-in state with active student account. | Quick-action navigation cards, recent project submission statuses, score analytics charts (Recharts). |
| **FIG 5.4** | User Interface: Standalone Project Checker Submission Screen | `http://localhost:5173/project-checker/new` | Multi-file upload screen with ZIP, PDF, PPTX selected. | Drag-and-drop file upload zones, metadata inputs (Title, Tech Stack, GitHub URL), validation badges. |
| **FIG 5.5** | User Interface: Comprehensive AI Project Audit Report | `http://localhost:5173/project-checker/projects/:id` | Evaluated project report page. | Overall circular score badge (/100), 7-category progress bars, technical analysis narrative, improvement plan. |
| **FIG 5.6** | User Interface: Plagiarism Breakdown and Similarity Metrics | `http://localhost:5173/project-checker/projects/:id` | Plagiarism tab / section expanded. | Code similarity gauge (%), report similarity (%), risk status badge (Low/Moderate/High), deduction summary. |
| **FIG 5.7** | User Interface: Classroom Management and Cohort Details | `http://localhost:5173/classrooms/:id` | Classroom view as faculty owner. | Join code badge (`CLS-82910`), submission deadline, resource requirements checklist, student roster. |
| **FIG 5.8** | User Interface: Team Formation and Member Invitation Portal | `http://localhost:5173/teams/:id` | Squad view as team captain. | Squad code (`TM-10492`), member roster, captain controls, Permanent User ID (`PRV-XXXXX`) invite input. |
| **FIG 5.9** | User Interface: Faculty Viva Voce Grading and Oral Defense | `http://localhost:5173/classrooms/:id/evaluations` | Faculty evaluation drawer / modal open. | 5 AI-generated categorical viva questions, numerical mark inputs (0-5.0), presentation score field (/25). |
| **FIG 5.10** | User Interface: Classroom Leaderboard and Analytics | `http://localhost:5173/classrooms/:id/leaderboard` | Cohort leaderboard view. | Rank-ordered student/team list, verified total marks (/100), privacy-obscured non-authorized peer reports. |
| **FIG 5.11** | Test Execution: Jest Test Suite Terminal Output | CLI Terminal: `backend/` | Terminal after running `npm test`. | 27 passing test suites, 174 passed tests, zero errors, green execution summary banner. |
| **FIG 5.12** | API Health Probe: Browser JSON Response | `http://localhost:5000/api/health` | Browser window showing JSON response. | `{ "status": "ok", "database": "connected", "aiProvider": "active" }`. |

---

## 2. Screenshot Formatting Instructions for Word / PDF Report
1. **Dimensions**: Maintain a 16:9 or 4:3 aspect ratio. Recommended width is $14\text{ cm}$ to $16\text{ cm}$ centered on the page.
2. **Borders**: Apply a thin $0.75\text{ pt}$ subtle grey border (`#CBD5E1`) around UI screenshots to cleanly delineate white screen backgrounds from paper margins.
3. **Captions**: Every image must be accompanied by a centered caption below the figure in $10\text{ pt}$ Times New Roman / Arial:  
   *Example*: **Figure 5.4: User Interface — Standalone Project Checker Submission Screen**
4. **Resolution**: Ensure screen captures are taken at $100\%$ display scaling on a High-DPI or $1920 \times 1080$ display to prevent blurry text.
