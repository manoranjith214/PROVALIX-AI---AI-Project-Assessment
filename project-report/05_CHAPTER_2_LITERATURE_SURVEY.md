# CHAPTER 2 — LITERATURE SURVEY

---

## 2.1 Introduction

The automated assessment of student programming submissions and academic software projects has been an active area of empirical research in computer science education for over five decades. Early systems in the 1960s and 1970s focused primarily on batch execution of punched cards against punched test inputs. Over time, these primitive scripts evolved into sophisticated automated grading systems, web-based assignment management platforms, static code analyzers, and program similarity detectors.

With the emergence of advanced Large Language Models (LLMs) and transformer-based artificial intelligence architectures, academic evaluation has entered a transformative paradigm shift. However, bridging the gap between automated single-function grading and the comprehensive multi-dimensional evaluation of complex engineering capstone projects requires synthesizing multiple disparate domains of computer science: static program analysis, natural language processing, code similarity algorithms, prompt engineering, and educational psychometrics.

This chapter presents a systematic, rigorous literature review of landmark academic research, established methodologies, and current state-of-the-art platforms governing:
1. Automated Assessment Systems (AAS) in computing education,
2. Artificial Intelligence and Large Language Models applied to educational grading,
3. Source-code plagiarism detection and program similarity techniques,
4. Static code quality analysis, software metrics, and architectural smell detection,
5. Comparative analysis of existing commercial and academic tools, and
6. Critical research gaps that Provalix AI is designed to resolve.

---

## 2.2 Related Research and Existing Approaches

The pedagogical motivation for automating programming evaluation was comprehensively surveyed by Douce, Livingstone, and Orwell (2005) in their seminal taxonomy of automated assessment systems. The authors categorized assessment tools into three historical generations:
- **First Generation (1960s–1980s)**: Mainframe batch processors that compiled code and compared text output against expected output files.
- **Second Generation (1990s)**: Tool-assisted environments that integrated basic static metrics (such as line counts and cyclomatic complexity) with dynamic test runners.
- **Third Generation (2000s–Present)**: Web-based, service-oriented platforms that incorporate security sandboxing, web interfaces, and automated feedback loops.

Ihantola et al. (2010) expanded upon this taxonomy in their comprehensive multi-institutional review of automated assessment tools in computing education. They analyzed over thirty platforms (including Web-CAT, CourseMarker, and BOSS) and identified critical recurring challenges: security vulnerabilities during student code execution, brittle test harness dependencies, poor pedagogical feedback, and the near-total neglect of holistic software engineering deliverables such as documentation quality, architectural design, and student oral comprehension.

In modern engineering curricula, projects are rarely isolated algorithmic functions; they are multi-tiered software systems comprising frontend interfaces, backend APIs, relational databases, third-party libraries, and deployment documentation. Consequently, evaluating modern capstone projects requires advancing beyond conventional input/output test matching toward multi-dimensional assessment frameworks.

---

## 2.3 Automated Assessment Systems in Engineering Education

A foundational milestone in automated grading was the development of **Web-CAT** (Web-based Center for Automated Testing) by Edwards and Perez-Quinones (2008). Web-CAT introduced the transformative concept of *test-driven grading*, where student grades are determined not merely by whether their code passes instructor-provided tests, but primarily by how thoroughly student-authored unit tests achieve code coverage over their own implementation. Edwards demonstrated that requiring students to write automated tests significantly improved software robustness, reduced defect density, and cultivated professional software engineering discipline.

Following Web-CAT, modern cloud-native systems such as **Gradescope** (Singh et al., 2017) revolutionized assignment grading in university environments. Gradescope combines dynamic autograding containers (Docker) with machine learning-assisted rubric grouping for manual grading. Empirical studies by Singh et al. demonstrated that rubric-based autograding reduced faculty grading workloads by over 60% while dramatically improving grading consistency across large student sections.

However, existing automated grading platforms like Gradescope, Web-CAT, and HackerRank exhibit fundamental structural limitations when applied to final-year engineering capstone projects:
1. They require instructors to pre-author rigid, deterministic test suites beforehand—an impossible requirement for open-ended capstone projects where each student team designs an entirely unique problem statement, architecture, and technology stack.
2. They operate strictly on binary functional correctness (pass/fail assertions) and are incapable of assessing qualitative dimensions such as innovation, architectural modularity, design patterns, or documentation clarity.
3. They provide no integrated mechanisms for conducting or standardizing the oral defense (*viva voce*) examination.

---

## 2.4 AI-Assisted Evaluation and LLM Reasoning

The advent of the Transformer architecture by Vaswani et al. (2017) and subsequent breakthroughs in Generative Pre-trained Transformers (GPT) and Google Gemini models have fundamentally altered the landscape of automated evaluation and code comprehension. Large Language Models (LLMs) trained on billions of lines of source code and technical literature possess advanced zero-shot and few-shot reasoning capabilities across programming syntax, algorithmic efficiency, architectural patterns, and natural language explanations.

Recent research has extensively examined the application of LLMs in academic code assessment:
- **Finnie-Ansley et al. (2022)** investigated the performance of OpenAI Codex on introductory computer science (CS1) exams, revealing that modern code LLMs outperform the median student on code generation, debugging, and code explanation tasks.
- **Sarsa et al. (2022)** evaluated the pedagogical efficacy of LLMs in automatically synthesizing code explanations and generating tailored programming exercises. Their findings indicated that LLMs produce novel, pedagogically sound explanations that assist students in understanding complex programming concepts.
- **MacNeil et al. (2023)** explored student interactions with AI-generated code explanations in interactive e-books, concluding that contextual, inline AI explanations substantially reduce cognitive overload and facilitate self-directed remediation.

Despite these advancements, deploying LLMs for formal academic grading introduces serious technical risks:
1. **Model Hallucination and Schema Drift**: Unconstrained LLMs frequently invent nonexistent criteria, output unparseable text responses, or produce mathematical inconsistencies (e.g., criteria scores that do not sum to the declared total).
2. **Evaluation Inconsistency (Non-Determinism)**: Identical code evaluated across multiple prompts can yield disparate numerical marks due to stochastic decoding temperatures.
3. **Lack of Grounded Evidence**: Generic LLM prompts often praise or penalize student projects based on vague impressions rather than concrete, verifiable evidence extracted from the actual codebase.

To overcome these vulnerabilities, Provalix AI implements **structured JSON schema validation** using Google GenAI SDK (`@google/genai`) with Gemini 3.8 Flash, strict evidence pre-extraction via static code analysis, and deterministic server-side aggregation where criteria weights are mathematically enforced by the backend rather than calculated by the generative model.

---

## 2.5 Plagiarism Detection and Code Similarity Analysis

Academic dishonesty through unauthorized source-code reuse, uncredited copying, and internet repository cloning poses an existential threat to the integrity of engineering education. The detection of source-code plagiarism is fundamentally distinct from natural language plagiarism detection:
- Natural language plagiarism tools (e.g., Turnitin, Grammarly) rely on word n-grams, string matching, and sentence-level semantic embeddings.
- Source code contains rigid syntactical constraints, variable name malleability, and functional equivalence across radically altered lexical representations.

### Seminal Approaches in Code Plagiarism Detection:
1. **String-Based and Token-Based Detection (MOSS and JPlag)**:
   - **MOSS** (Measure of Software Similarity), formulated by Aiken (2003) and Schleimer, Wilkerson, and Aiken (2003), introduced the **Winnowing algorithm**—a local fingerprinting algorithm for document similarity. Winnowing tokenizes code, discards whitespace and comments, computes hashes over sliding windows of k-grams, and selects minimum hash values to create an invariant fingerprint robust against whitespace modification and identifier renaming.
   - **JPlag**, developed by Prechelt, Malpohl, and Philippsen (2002), utilizes Greedy String Tiling (GST) on token streams generated from programming language lexical parsers. JPlag converts source files into token sequences (e.g., `VAR_DEF`, `IF`, `ASSIGN`, `LOOP`) and identifies maximal shared contiguous substrings, rendering it highly resilient to variable renaming, statement reordering, and comment insertion.
2. **Structure-Based and AST Clone Detection**:
   - Baxter et al. (1998) introduced Abstract Syntax Tree (AST) subtree hashing for detecting software clones. By parsing source code into concrete syntax trees and comparing subtrees using hash comparisons, structural clones can be identified regardless of surface formatting.
   - Roy, Cordy, and Koschke (2009) established the formal academic classification of software clones into four distinct types:
     - **Type-1 (Identical)**: Code fragments identical except for variations in whitespace, layout, and comments.
     - **Type-2 (Lexical)**: Syntactically identical fragments except for variations in identifier names, literal values, and types.
     - **Type-3 (Syntactic / Gapped)**: Copied fragments with added, modified, or deleted statements.
     - **Type-4 (Semantic)**: Functionally identical code that implements the same logic using completely different syntactical structures and algorithms.

### Limitations in Existing Tools and Provalix AI Integration:
While MOSS and JPlag remain gold standards for batch academic competition, they suffer from critical operational limitations: MOSS is a closed, remote Stanford-hosted service that frequently throttles university requests, while JPlag is a standalone CLI tool that lacks native web integration, database storage, and support for multi-modal project reports.

Provalix AI incorporates a multi-stage plagiarism pipeline: it extracts source code from multi-language archives, applies AST-inspired code normalization (stripping syntactic trivia, normalizing keywords, and hashing token sequences), performs similarity analysis, and integrates an extensible architecture supporting both internal heuristic similarity matching and external commercial APIs (such as Copyleaks).

---

## 2.6 Program Analysis and Static Code Quality Assessment

Software engineering industry standards emphasize that working code is not necessarily quality code. A student submission may execute without immediate crash while containing severe architectural antipatterns, hardcoded API secrets, monolithic classes, zero automated tests, and excessive cyclomatic complexity.

Static program analysis examines software without executing it, evaluating structural properties against established engineering best practices:
- **McCabe (1976)** formulated **Cyclomatic Complexity** ($V(G) = E - N + 2P$), measuring the number of linearly independent paths through a program's control flow graph. High cyclomatic complexity directly correlates with defect frequency, test failure, and unmaintainable code.
- **Fowler and Beck (1999)** cataloged foundational **Code Smells**—surface indicators in code that correspond to deeper architectural problems, such as Long Method, Large Class, Duplicated Code, and Speculative Generality.
- **Martin (2008)** articulated the **SOLID** design principles and Clean Code paradigms, advocating for single-responsibility modules, loose coupling, and defensive programming.
- **SonarQube (Campbell & Papapetrou, 2013)** demonstrated the enterprise viability of combining static rule checkers (linters, AST matchers) with quality gates to measure technical debt, code duplications, and security vulnerabilities.

Provalix AI embeds a dedicated, language-agnostic **Source Code Static Analyzer** (`SourceCodeAnalyzer.ts`). Engineered to parse 16+ programming languages in memory without executing untrusted code, the analyzer extracts LOC, detects test suite presence (`jest`, `pytest`, `unittest`), scans dependency manifests (`package.json`, `requirements.txt`), flags monolithic files (>300 LOC), detects excessive nesting (>5 levels), identifies duplicated line blocks through non-empty line hashing, and identifies exposed API credentials and secret tokens using regular expression heuristic signatures.

---

## 2.7 Related Tools and Academic Platforms

A critical review of currently available educational platforms reveals how the academic technology landscape is distributed:

1. **Gradescope (Turnitin LLC)**: Highly effective for standard homework and exam autograding. Relies on Docker containers running instructor-defined unit tests. Does not perform generative qualitative code audits, capstone team governance, or oral viva question generation.
2. **Turnitin / Feedback Studio**: The global market leader in natural language text plagiarism detection. Highly effective for essay and thesis documents, but structurally ill-suited for source-code AST inspection or multi-language engineering repository analysis.
3. **SonarQube**: Enterprise-grade continuous code inspection tool. Provides world-class static analysis and technical debt calculations, but lacks academic LMS features: it has no student team formation, no faculty grading rubrics, no viva voce examination engines, and no student mark attribution.
4. **Moodle / Canvas LMS**: Powerful course management and assignment submission platforms. However, they lack native static code analysis, intelligent code smell detection, code plagiarism scanning, and AI evaluation reasoning, functioning merely as file storage repositories.

---

## 2.8 Comparative Analysis of Existing Approaches

To clearly demonstrate the architectural positioning of Provalix AI relative to existing academic and industry solutions, Table 2.1 provides a detailed comparative evaluation across eleven essential technical criteria.

### **TABLE 2.1: Comparative Evaluation of Academic Project Assessment Systems**

| Feature / Capability | Gradescope | MOSS / JPlag | SonarQube | Turnitin | Moodle / Canvas | **Provalix AI (Proposed)** |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Open-Ended Capstone Evaluation** | Poor | None | Poor | None | Moderate | **Exceptional** |
| **Generative AI Rubric Reasoning** | None | None | None | None | None | **Integrated (Gemini 3.8)** |
| **Multi-Language Static Inspection** | None | None | High | None | None | **Integrated (16+ Langs)** |
| **Source Code Plagiarism Detection** | None | **High** | None | Low | None | **Integrated Pipeline** |
| **Report / Document Plagiarism** | None | None | None | **High** | None | **Integrated Pipeline** |
| **Oral Defense (Viva Voce) Engine** | None | None | None | None | None | **Integrated (5 Categories)** |
| **Security Zip-Bomb Defense** | Low | Low | High | None | Low | **Hardened In-Memory** |
| **Multi-Member Squad Management** | None | None | None | None | Moderate | **Integrated (Permanent IDs)** |
| **Authoritative 3-Way Mark Formula** | None | None | None | None | Manual | **Automated Backend** |
| **Vector PDF Audit Certificates** | Low | None | Moderate | Low | Low | **Vector Stream (PDFKit)** |
| **Multilingual AI Student Guidance** | None | None | None | None | None | **Yes (EN, TA, Tanglish, HI)** |

---

## 2.9 Research Gaps Identified

The literature review and comparative analysis reveal four critical research and architectural gaps that remain unaddressed in modern educational technology:

1. **Gap 1: Disconnection Between Static Code Metrics and Qualitative AI Reasoning**:
   Existing systems either execute pure static analysis without understanding architectural context (SonarQube) or apply unconstrained LLM prompts without grounding them in verified static code facts. There is an absence of architectures that pre-extract concrete static metrics (LOC, test coverage, dependencies, smells) and inject them into schema-constrained LLM evaluation prompts.
2. **Gap 2: Neglect of the Oral Defense (Viva Voce) in Automated Assessment**:
   While code submission and report grading have been automated, the viva-voce oral defense has been entirely neglected by automated platforms. No existing educational software systematically inspects a submitted codebase to automatically generate categorized, project-tailored oral defense questions for faculty evaluators.
3. **Gap 3: Isolation of Plagiarism Detection from Rubric Mark Attribution**:
   Traditional plagiarism scanners generate a standalone percentage score on an external dashboard. Faculty are left to manually decide how to penalize the student, resulting in arbitrary, unstandardized grade deductions. There is a lack of automated pipelines that calculate similarity and directly apply justifiable, proportional deductions into an authoritative grading rubric.
4. **Gap 4: Absence of Unified Multi-Tenant Cohort Governance for Capstone Teams**:
   Available tools are either strictly individual assignment submitters (Gradescope, LeetCode) or administrative enterprise platforms (Moodle). There is no dedicated platform supporting permanent student IDs, reusable cross-classroom student squads, captain controls, faculty review committees, and dual-stage submission verification.

---

## 2.10 Summary

This chapter reviewed the historical progression of automated assessment systems, the emergence of generative AI and LLMs in computing pedagogy, the mathematical foundations of code plagiarism detection (Winnowing, GST, AST subtree comparison), and static software quality metrics. A thorough comparative evaluation confirmed that existing tools remain fragmented, addressing narrow sub-problems while failing to provide a unified solution for engineering capstone assessment.

Provalix AI directly bridges these identified research gaps by coupling security-hardened static code analysis with schema-constrained Google Gemini evaluation, integrating an automated code/report plagiarism pipeline with direct rubric mark deductions, standardizing oral defense examinations through automated categorical viva generation, and providing enterprise-grade classroom cohort governance. The materials, architectural methodology, and engineering models underlying this platform are documented in Chapter 3.
