# TABLE OF CONTENTS

---

### **TABLE OF CONTENTS**

| CHAPTER NO. | TITLE | PAGE NO. |
| :---: | :--- | :---: |
| | **BONAFIDE CERTIFICATE** | **ii** |
| | **DECLARATION** | **iii** |
| | **ACKNOWLEDGEMENT** | **iv** |
| | **ABSTRACT** | **v** |
| | **TABLE OF CONTENTS** | **vi** |
| | **LIST OF FIGURES** | **ix** |
| | **LIST OF TABLES** | **xi** |
| | **LIST OF ABBREVIATIONS** | **xiii** |
| **1.** | **INTRODUCTION** | **1** |
| | 1.1 Introduction | 1 |
| | 1.2 Background of the Project | 2 |
| | 1.3 Problem Statement | 4 |
| | 1.4 Existing System | 6 |
| | 1.5 Limitations of the Existing System | 7 |
| | 1.6 Proposed System | 8 |
| | 1.7 Objectives | 10 |
| | 1.8 Scope of the Project | 11 |
| | 1.9 Significance and Expected Benefits | 12 |
| | 1.10 Organization of the Report | 13 |
| **2.** | **LITERATURE SURVEY** | **15** |
| | 2.1 Introduction | 15 |
| | 2.2 Related Research and Existing Approaches | 16 |
| | 2.3 Automated Assessment Systems in Engineering Education | 17 |
| | 2.4 AI-Assisted Evaluation and LLM Reasoning | 19 |
| | 2.5 Plagiarism Detection and Code Similarity Analysis | 21 |
| | 2.6 Program Analysis and Static Code Quality Assessment | 23 |
| | 2.7 Related Tools and Academic Platforms | 25 |
| | 2.8 Comparative Analysis of Existing Approaches | 27 |
| | 2.9 Research Gaps Identified | 29 |
| | 2.10 Summary | 30 |
| **3.** | **MATERIALS AND METHODOLOGY** | **31** |
| | 3.1 Introduction | 31 |
| | 3.2 Hardware Requirements | 31 |
| | 3.3 Software Requirements | 32 |
| | 3.4 Programming Languages and Frameworks | 33 |
| | 3.5 Libraries, SDKs, and Development Tools | 34 |
| | 3.6 Requirement Analysis | 36 |
| | 3.7 Functional Requirements | 37 |
| | 3.8 Non-Functional Requirements | 39 |
| | 3.9 System Architecture | 40 |
| | 3.10 Module Design | 42 |
| | 3.11 Database Design and Entity Relationships | 45 |
| | 3.12 Data Flow Design | 48 |
| | 3.13 Use Case Design | 50 |
| | 3.14 Implementation Methodology | 51 |
| | 3.15 AI Evaluation Methodology and Prompt Engineering | 53 |
| | 3.16 Plagiarism Detection and Normalization Pipeline | 55 |
| | 3.17 Viva-Voce Question Generation Methodology | 57 |
| | 3.18 Authentication, Authorization, and Security Controls | 58 |
| | 3.19 Testing and Quality Assurance Methodology | 60 |
| | 3.20 Complete End-to-End System Workflow | 61 |
| **4.** | **PROPOSED WORK AND IMPLEMENTATION** | **63** |
| | 4.1 Proposed System Overview | 63 |
| | 4.2 Overall System Architecture Implementation | 64 |
| | 4.3 Authentication and User Management Module | 66 |
| | 4.4 Standalone Project Checker Module | 68 |
| | 4.5 Language-Agnostic Source Code Static Analyzer | 70 |
| | 4.6 AI Evaluation Micro-Service and Rubric Enforcement | 73 |
| | 4.7 Plagiarism Detection and Similarity Scorer | 76 |
| | 4.8 Classroom Cohort Management Module | 78 |
| | 4.9 Team and Squad Formation Module | 80 |
| | 4.10 Viva Voce Examination Generation Engine | 82 |
| | 4.11 Faculty Evaluation and Grading Formula Integration | 84 |
| | 4.12 Dual-Stage Submission Verification Workflow | 86 |
| | 4.13 Dynamic Vector PDF Report Generation | 88 |
| | 4.14 Interactive Multilingual AI Assistant and Chatbot | 90 |
| | 4.15 Database and API Integration Layer | 92 |
| | 4.16 Security, Rate Limiting, and Error Handling | 94 |
| | 4.17 Production Deployment Configuration | 96 |
| **5.** | **RESULTS AND DISCUSSION** | **98** |
| | 5.1 Experimental Setup and Development Environment | 98 |
| | 5.2 User Interface and Screen Flow Presentation | 100 |
| | 5.3 Module-Wise Functional Test Execution Results | 105 |
| | 5.4 Unit and Integration Testing Analysis | 108 |
| | 5.5 API Latency and Endpoint Health Verification | 110 |
| | 5.6 Static Code Analysis Output and Smells Detection | 112 |
| | 5.7 AI Evaluation Output Quality and Rubric Consistency | 114 |
| | 5.8 Plagiarism Pipeline Performance and Detection Sensitivity | 116 |
| | 5.9 Viva Voce Question Generation Quality Analysis | 118 |
| | 5.10 Security, Zip Bomb, and Traversal Defense Verification | 120 |
| | 5.11 Comparative Analysis of Existing vs. Proposed System | 122 |
| | 5.12 Sociotechnical and Educational Impact Narrative | 124 |
| | 5.13 Current Limitations and Discussion | 125 |
| **6.** | **CONCLUSION AND FUTURE ENHANCEMENTS** | **127** |
| | 6.1 Conclusion | 127 |
| | 6.2 Objectives Achieved | 128 |
| | 6.3 Technical Contributions of the Project | 129 |
| | 6.4 Current System Limitations | 130 |
| | 6.5 Future Enhancements and Extensions | 131 |
| | 6.6 Final Remarks | 133 |
| | **REFERENCES** | **134** |
| | **APPENDIX A: PROGRAM OUTCOMES (PO) AND PSO MAPPING** | **138** |
| | **APPENDIX B: COMPLETE SYSTEM API ROUTE CATALOG** | **140** |
| | **APPENDIX C: COMPREHENSIVE TEST EXECUTION MATRIX** | **143** |

\pagebreak

---

### **LIST OF FIGURES**

| FIGURE NO. | FIGURE NAME | PAGE NO. |
| :---: | :--- | :---: |
| **FIG 3.1** | Provalix AI 3-Tier Layered System Architecture | 41 |
| **FIG 3.2** | Relational Database Entity-Relationship (ER) Diagram | 46 |
| **FIG 3.3** | Level-0 Context Level Data Flow Diagram (DFD) | 48 |
| **FIG 3.4** | Level-1 Detailed Process Data Flow Diagram (DFD) | 49 |
| **FIG 3.5** | Comprehensive System Use Case Diagram | 50 |
| **FIG 3.6** | Dual-Token JWT Authentication and Rotation Workflow | 59 |
| **FIG 3.7** | End-to-End Project Submission and Assessment Workflow | 62 |
| **FIG 4.1** | Static Source Code Analyzer In-Memory Parsing Pipeline | 71 |
| **FIG 4.2** | Multi-Stage Code Normalization and Plagiarism Detection Pipeline | 77 |
| **FIG 4.3** | Categorical Viva Voce Question Generation Flow | 83 |
| **FIG 4.4** | Authoritative 100-Mark Composite Scoring Formula Architecture | 85 |
| **FIG 4.5** | Dynamic Vector PDF Report Generation Engine | 89 |
| **FIG 5.1** | User Interface: Modern Responsive Landing Page | 100 |
| **FIG 5.2** | User Interface: Secure Login and Register Portal | 101 |
| **FIG 5.3** | User Interface: Student and Faculty Dashboard Overview | 101 |
| **FIG 5.4** | User Interface: Standalone Project Checker Submission Screen | 102 |
| **FIG 5.5** | User Interface: Comprehensive AI Project Audit Report and Score Visualizer | 102 |
| **FIG 5.6** | User Interface: Plagiarism Breakdown and Similarity Metrics Screen | 103 |
| **FIG 5.7** | User Interface: Classroom Management and Cohort Details | 103 |
| **FIG 5.8** | User Interface: Team Formation and Member Invitation Portal | 104 |
| **FIG 5.9** | User Interface: Faculty Viva Voce Grading and Oral Defense Screen | 104 |
| **FIG 5.10** | User Interface: Classroom Leaderboard and Performance Analytics | 105 |
| **FIG 5.11** | Jest Test Suite Execution Terminal Output (27 Test Suites Passing) | 109 |
| **FIG 5.12** | API Health Probe and Route Verification Latency Graph | 111 |

\pagebreak

---

### **LIST OF TABLES**

| TABLE NO. | TABLE NAME | PAGE NO. |
| :---: | :--- | :---: |
| **TABLE 2.1** | Comparative Evaluation of Academic Project Assessment Systems | 27 |
| **TABLE 3.1** | Hardware Specifications and Development Environment | 32 |
| **TABLE 3.2** | Software Stack and Tooling Versions | 33 |
| **TABLE 3.3** | Core Third-Party Libraries and SDK Dependencies | 35 |
| **TABLE 3.4** | Functional Requirements Specification Matrix | 38 |
| **TABLE 3.5** | Non-Functional Requirements and System Quality Metrics | 39 |
| **TABLE 3.6** | Database Table Entities and Primary Schema Attributes | 47 |
| **TABLE 3.7** | 100-Mark AI Project Checker Authoritative Rubric Dimensions | 54 |
| **TABLE 3.8** | 5-Category Viva Voce Oral Defense Question Rubric | 57 |
| **TABLE 4.1** | Primary System Modules and Codebase Architecture | 64 |
| **TABLE 4.2** | Supported Programming Languages in Static Code Analyzer | 72 |
| **TABLE 4.3** | Core API Endpoints and HTTP Routing Architecture | 93 |
| **TABLE 5.1** | Automated Unit and Integration Test Results Summary | 108 |
| **TABLE 5.2** | Core API Endpoint Latency and Throughput Benchmarks | 110 |
| **TABLE 5.3** | Static Code Analyzer Benchmark Across Repository Sizes | 113 |
| **TABLE 5.4** | Plagiarism Pipeline Sensitivity Benchmark Across Synthetic Clones | 117 |
| **TABLE 5.5** | Adversarial Security and File Hardening Verification Matrix | 121 |
| **TABLE 5.6** | Comprehensive Feature Comparison: Traditional vs. Provalix AI | 123 |

\pagebreak

---

### **LIST OF ABBREVIATIONS**

| ABBREVIATION | FULL FORM |
| :--- | :--- |
| **ABET** | Accreditation Board for Engineering and Technology |
| **ACID** | Atomicity, Consistency, Isolation, Durability |
| **AI** | Artificial Intelligence |
| **API** | Application Programming Interface |
| **AST** | Abstract Syntax Tree |
| **CORS** | Cross-Origin Resource Sharing |
| **CSS** | Cascading Style Sheets |
| **DFD** | Data Flow Diagram |
| **DOM** | Document Object Model |
| **DTO** | Data Transfer Object |
| **ER** | Entity-Relationship |
| **GenAI** | Generative Artificial Intelligence |
| **HMR** | Hot Module Replacement |
| **HTTP** | Hypertext Transfer Protocol |
| **JSON** | JavaScript Object Notation |
| **JWT** | JSON Web Token |
| **LLM** | Large Language Model |
| **LOC** | Lines of Code |
| **MIME** | Multipurpose Internet Mail Extensions |
| **NBA** | National Board of Accreditation |
| **ORM** | Object-Relational Mapping |
| **PDF** | Portable Document Format |
| **PO** | Program Outcome |
| **PSO** | Program Specific Outcome |
| **RAG** | Retrieval-Augmented Generation |
| **RBAC** | Role-Based Access Control |
| **REST** | Representational State Transfer |
| **RPM** | Requests Per Minute |
| **SaaS** | Software as a Service |
| **SDK** | Software Development Kit |
| **SPA** | Single Page Application |
| **SQL** | Structured Query Language |
| **TF-IDF** | Term Frequency - Inverse Document Frequency |
| **UI / UX** | User Interface / User Experience |
| **URL** | Uniform Resource Locator |
| **Vite** | Fast Frontend Build Tool |
