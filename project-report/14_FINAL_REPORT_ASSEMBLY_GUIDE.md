# FINAL ACADEMIC REPORT ASSEMBLY AND EXPORT GUIDE

This comprehensive guide explains how to compile the modular Markdown files into a unified academic thesis document, convert it to **Microsoft Word (`.docx`)** and **publication-grade PDF (`.pdf`)**, format it according to university thesis guidelines, and print the hardbound copies for institutional submission.

---

## 1. Document Architecture and File Organization

All generated project report chapters and preliminary documents are structured inside the `project-report/` directory:

```
project-report/
├── PROJECT_AUDIT.md                     # Verified technical audit
├── MISSING_INFORMATION.md               # Institutional placeholder catalog
├── 01_FRONT_MATTER.md                   # Cover Page, Certificate, Declaration, Acknowledgement
├── 02_ABSTRACT.md                       # Comprehensive Academic Abstract
├── 03_TABLE_OF_CONTENTS.md              # TOC, List of Figures, Tables, Abbreviations
├── 04_CHAPTER_1_INTRODUCTION.md         # Chapter 1: Introduction, Problem, Objectives, Scope
├── 05_CHAPTER_2_LITERATURE_SURVEY.md    # Chapter 2: Literature Review, Comparison, Gaps
├── 06_CHAPTER_3_MATERIALS_AND_METHODOLOGY.md # Chapter 3: Requirements, Architecture, ER, DFD, Rubrics
├── 07_CHAPTER_4_IMPLEMENTATION.md       # Chapter 4: Module Implementation, Code Flows, APIs
├── 08_CHAPTER_5_RESULTS_AND_DISCUSSION.md # Chapter 5: Test Execution, Latencies, UI Screens
├── 09_CHAPTER_6_CONCLUSION_AND_FUTURE_WORK.md # Chapter 6: Achievements, Contributions, Future Work
├── 10_REFERENCES.md                     # Chapter 7: Verifiable Academic References
├── 11_PROJECT_OUTCOME.md                # Appendix A: NBA/ABET PO & PSO Mappings
├── 12_TEST_CASES_AND_EVIDENCE.md        # Appendix B: Test Execution Matrices
├── 13_SCREENSHOT_CHECKLIST.md           # Visual Screenshot Capture Guide
├── 14_FINAL_REPORT_ASSEMBLY_GUIDE.md    # This Compilation and Export Guide
└── COMPLETE_PROJECT_REPORT.md           # Consolidated Single-File Project Report
```

---

## 2. Institutional Academic Formatting Standards

When formatting the document in Microsoft Word or LibreOffice Writer, configure the document layout to match standard university regulations:

| Formatting Attribute | Standard Academic Specification |
| :--- | :--- |
| **Paper Size** | Standard **A4** ($210\text{ mm} \times 297\text{ mm}$) |
| **Page Margins** | **Left Margin:** $1.25\text{ inches}$ ($31.75\text{ mm}$) (allows binding margin)<br>**Right, Top, Bottom:** $1.0\text{ inch}$ ($25.4\text{ mm}$) |
| **Primary Font** | **Times New Roman** |
| **Body Text** | **12 pt**, Regular, **Justified Alignment** |
| **Line Spacing** | **1.5 Lines** throughout the body text |
| **Chapter Headings (H1)** | **16 pt, Bold, Centered / Left, ALL CAPS** (e.g., `CHAPTER 1 — INTRODUCTION`) |
| **Section Headings (H2)** | **14 pt, Bold, Left-Aligned, Title Case** (e.g., `1.3 Problem Statement`) |
| **Subsection Headings (H3)** | **12 pt, Bold, Left-Aligned** (e.g., `3.2.1 Static Code Analyzer`) |
| **Paragraph Indentation** | $0.5\text{ inches}$ ($1.27\text{ cm}$) first-line indent, or 6 pt paragraph spacing |
| **Page Numbering** | **Preliminary Pages:** Lowercase Roman numerals (`ii`, `iii`, `iv`, `v`...) centered at bottom.<br>**Main Chapters:** Arabic numerals (`1`, `2`, `3`...) at bottom center or top right.<br>Cover page carries no printed page number. |
| **Captions** | Figures and Tables must have centered captions: Table captions *above* table; Figure captions *below* figure. |

---

## 3. How to Convert Markdown to Microsoft Word (DOCX)

You can convert the consolidated report (`COMPLETE_PROJECT_REPORT.md`) into a formatted Microsoft Word document using either Python or Pandoc:

### Method A: Automated Generation via Python (Installed in Workspace)
An automated Python generation script has been provided in the project workspace. To execute:
```bash
python generate_academic_report_docx.py
```
This script reads the consolidated report and generates `Provalix_AI_Academic_Project_Report.docx` with Times New Roman typography, 1.5 line spacing, and formatted tables.

### Method B: Conversion via Pandoc (Universal CLI)
If Pandoc is installed on your workstation:
```bash
pandoc project-report/COMPLETE_PROJECT_REPORT.md -o Provalix_AI_Project_Report.docx --toc --number-sections
```

### Method C: Direct Import into Microsoft Word
1. Open Microsoft Word.
2. Click **File $\rightarrow$ Open** and select `COMPLETE_PROJECT_REPORT.md` (or copy-paste the contents of `COMPLETE_PROJECT_REPORT.md` into a new document).
3. Apply Word Styles:
   - Select all body text $\rightarrow$ Set Font to **Times New Roman**, Size **12 pt**, Spacing **1.5**, Alignment **Justified**.
   - Set Chapter Titles to **Heading 1** (16 pt Bold).
   - Set Section Titles to **Heading 2** (14 pt Bold).
   - Insert Page Breaks before each Chapter.

---

## 4. Final Review and Institutional Submission Checklist

Before submitting the report to your college department:
1. **Replace All Placeholders**: Search for `[...]` brackets across the entire document and insert:
   - Your Full Name & University Registration Number,
   - Department Name & College Name,
   - Project Supervisor Name & Designation,
   - HOD Name & Principal Name,
   - Final Viva Examination Month & Year.
2. **Embed Screenshots**: Insert crisp UI screenshots according to the figures defined in `13_SCREENSHOT_CHECKLIST.md`.
3. **Verify Table of Contents**: In Microsoft Word, right-click the Table of Contents and select **Update Field $\rightarrow$ Update Entire Table** to reflect final pagination.
4. **Obtain Signatures**: Print the Bonafide Certificate and Declaration pages and obtain original signatures from your Project Guide and Head of Department.
5. **Hardbound Printing & Archival**: Print on 80 GSM / 100 GSM bond paper and bind in the institutional color mandated by your university (e.g., Black / Navy Blue hardbound with golden embossed lettering).
