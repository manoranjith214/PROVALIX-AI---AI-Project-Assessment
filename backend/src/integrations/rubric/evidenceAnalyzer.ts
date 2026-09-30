import { EvidenceClassification } from './rubricTypes';
import { validateMeaningfulText, isValidGitHubUrl } from '../../validators/inputValidationUtils';

export interface ValidationCheckResult {
  isValid: boolean;
  reason?: string;
  evidenceQuality: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';
  missingEvidence?: string[];
}

export class EvidenceAnalyzer {
  /**
   * Strict validation layer before any AI evaluation is invoked.
   * Enforces that projects must contain title, category, target users,
   * description, problem statement, proposed solution, AND verifiable source-code evidence.
   *
   * AI evaluation must NOT start merely because project metadata exists.
   */
  validateProjectSubmission(project: any): ValidationCheckResult {
    const title = project.title;
    const category = project.category;
    const targetUsers = project.targetUsers;
    const description = project.description;
    const problemStatement = project.problemStatement;
    const proposedSolution = project.proposedSolution;

    // Check if submission is empty / name-only with no substantive project evidence
    const hasSubstance = Boolean(
      (description && description.trim().length > 0) ||
      (problemStatement && problemStatement.trim().length > 0) ||
      (proposedSolution && proposedSolution.trim().length > 0) ||
      (Array.isArray(project.resources) && project.resources.length > 0) ||
      (project.githubUrl && project.githubUrl.trim().length > 0)
    );

    if (!hasSubstance) {
      return {
        isValid: false,
        reason: 'Insufficient project evidence for evaluation.',
        evidenceQuality: 'INSUFFICIENT',
      };
    }

    // 1. Strict metadata checks
    const titleCheck = validateMeaningfulText(title, 5, 'Project Title', 200);
    if (!titleCheck.isValid) {
      return { isValid: false, reason: titleCheck.error, evidenceQuality: 'INSUFFICIENT' };
    }

    const catCheck = validateMeaningfulText(category, 3, 'Category / Domain', 100);
    if (!catCheck.isValid) {
      return { isValid: false, reason: catCheck.error, evidenceQuality: 'INSUFFICIENT' };
    }

    const descCheck = validateMeaningfulText(description, 30, 'Description / Abstract', 5000);
    if (!descCheck.isValid) {
      return { isValid: false, reason: descCheck.error, evidenceQuality: 'INSUFFICIENT' };
    }

    const probCheck = validateMeaningfulText(problemStatement, 30, 'Problem Statement', 5000);
    if (!probCheck.isValid) {
      return { isValid: false, reason: probCheck.error, evidenceQuality: 'INSUFFICIENT' };
    }

    const solCheck = validateMeaningfulText(proposedSolution, 30, 'Proposed Solution / Architecture', 5000);
    if (!solCheck.isValid) {
      return { isValid: false, reason: solCheck.error, evidenceQuality: 'INSUFFICIENT' };
    }

    // Optional target users check if present
    if (targetUsers) {
      const usersCheck = validateMeaningfulText(targetUsers, 3, 'Target Users', 200);
      if (!usersCheck.isValid) {
        return { isValid: false, reason: usersCheck.error, evidenceQuality: 'INSUFFICIENT' };
      }
    }

    // 2. EVIDENCE GATE:
    // AI evaluation must NOT start merely because metadata exists.
    // Must have at least one real source-code evidence source:
    // - uploaded source code archive, OR
    // - valid GitHub repository
    const resources = Array.isArray(project.resources) ? project.resources : [];
    const hasSourceCodeResource = resources.some((r: any) => {
      const type = (r.type || '').toLowerCase();
      const name = (r.name || '').toLowerCase();
      return (
        type === 'sourcecode' ||
        name.endsWith('.zip') ||
        name.endsWith('.tar.gz') ||
        name.endsWith('.tgz') ||
        name.endsWith('.ts') ||
        name.endsWith('.py') ||
        name.endsWith('.js') ||
        name.endsWith('.cpp') ||
        name.endsWith('.java')
      );
    });

    const hasValidGithub = isValidGitHubUrl(project.githubUrl);

    if (!hasSourceCodeResource && !hasValidGithub) {
      return {
        isValid: false,
        reason:
          'AI evaluation blocked: Insufficient evidence. Please provide at least one real source-code evidence source (uploaded source code archive or valid GitHub repository).',
        evidenceQuality: 'INSUFFICIENT',
        missingEvidence: ['sourceCode'],
      };
    }

    // Classify initial evidence quality
    const hasReport = resources.some((r: any) => {
      const type = (r.type || '').toLowerCase();
      const name = (r.name || '').toLowerCase();
      return (
        type === 'projectreport' ||
        type === 'ppt' ||
        name.endsWith('.pdf') ||
        name.endsWith('.docx') ||
        name.endsWith('.doc') ||
        name.endsWith('.pptx')
      );
    });

    const hasDemo = Boolean(project.liveDemoUrl && project.liveDemoUrl.trim().length > 8);

    let quality: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    if ((hasSourceCodeResource || hasValidGithub) && hasReport && hasDemo) {
      quality = 'HIGH';
    } else if (hasSourceCodeResource || hasValidGithub) {
      quality = 'MEDIUM';
    }

    return {
      isValid: true,
      evidenceQuality: quality,
    };
  }

  /**
   * Validates classroom submission tasks/answers before evaluation.
   */
  validateClassroomSubmission(submission: any, requiredResources?: string[]): ValidationCheckResult {
    const title = submission.title;
    const category = submission.category;
    const description = submission.description;
    const problemStatement = submission.problemStatement;
    const proposedSolution = submission.proposedSolution;

    const titleCheck = validateMeaningfulText(title, 5, 'Project Title', 200);
    if (!titleCheck.isValid) {
      return { isValid: false, reason: titleCheck.error, evidenceQuality: 'INSUFFICIENT' };
    }

    const catCheck = validateMeaningfulText(category, 3, 'Category / Domain', 100);
    if (!catCheck.isValid) {
      return { isValid: false, reason: catCheck.error, evidenceQuality: 'INSUFFICIENT' };
    }

    const descCheck = validateMeaningfulText(description, 30, 'Description / Abstract', 5000);
    if (!descCheck.isValid) {
      return { isValid: false, reason: descCheck.error, evidenceQuality: 'INSUFFICIENT' };
    }

    const probCheck = validateMeaningfulText(problemStatement, 30, 'Problem Statement', 5000);
    if (!probCheck.isValid) {
      return { isValid: false, reason: probCheck.error, evidenceQuality: 'INSUFFICIENT' };
    }

    const solCheck = validateMeaningfulText(proposedSolution, 30, 'Proposed Solution / Architecture', 5000);
    if (!solCheck.isValid) {
      return { isValid: false, reason: solCheck.error, evidenceQuality: 'INSUFFICIENT' };
    }

    // Check specific required resources if configured by classroom
    if (requiredResources && requiredResources.length > 0) {
      const resources = Array.isArray(submission.resources) ? submission.resources : [];
      const missing: string[] = [];

      for (const reqType of requiredResources) {
        if (reqType === 'github') {
          if (!isValidGitHubUrl(submission.githubUrl)) {
            missing.push('github');
          }
        } else {
          const hasIt = resources.some((r: any) => (r.type || '').toLowerCase() === reqType.toLowerCase());
          if (!hasIt) {
            missing.push(reqType);
          }
        }
      }

      if (missing.length > 0) {
        return {
          isValid: false,
          reason: `AI evaluation blocked: Missing required evidence resources (${missing.join(', ')}).`,
          evidenceQuality: 'INSUFFICIENT',
          missingEvidence: missing,
        };
      }
    }

    return {
      isValid: true,
      evidenceQuality: 'HIGH',
    };
  }

  /**
   * Extracts and separates:
   * A. User claims
   * B. Verified evidence
   * C. Unverified claims
   * D. Missing evidence
   * E. Contradictory evidence
   *
   * Never assumes user claims are verified facts.
   * If a technology is claimed (e.g. YOLOv8) but evidence does not contain it:
   * mark as "Unverified claim: Claim not verified from submitted evidence."
   */
  extractAndClassifyEvidence(projectData: any): EvidenceClassification {
    const userClaims: string[] = [];
    const verifiedEvidence: string[] = [];
    const unverifiedClaims: string[] = [];
    const missingEvidence: string[] = [];
    const inconsistencies: string[] = [];

    // Parse claimed technologies
    let claimedTechs: string[] = [];
    if (Array.isArray(projectData.technologies)) {
      claimedTechs = projectData.technologies;
    } else if (typeof projectData.technologies === 'string') {
      try {
        claimedTechs = JSON.parse(projectData.technologies);
      } catch {
        claimedTechs = projectData.technologies.split(',').map((t: string) => t.trim()).filter(Boolean);
      }
    }

    // Parse claimed programming languages
    let claimedLangs: string[] = [];
    if (Array.isArray(projectData.programmingLanguages)) {
      claimedLangs = projectData.programmingLanguages;
    } else if (typeof projectData.programmingLanguages === 'string') {
      try {
        claimedLangs = JSON.parse(projectData.programmingLanguages);
      } catch {
        claimedLangs = projectData.programmingLanguages.split(',').map((t: string) => t.trim()).filter(Boolean);
      }
    }

    const allClaimed = Array.from(new Set([...claimedTechs, ...claimedLangs]));
    for (const tech of allClaimed) {
      userClaims.push(`Claims implementation with ${tech}`);
    }

    if (projectData.problemStatement) {
      userClaims.push(`Claims problem address: "${projectData.problemStatement.slice(0, 100)}..."`);
    }
    if (projectData.innovation) {
      userClaims.push(`Claims innovation: "${projectData.innovation.slice(0, 100)}..."`);
    }

    // Gather available evidence artifacts
    const resources = Array.isArray(projectData.resources) ? projectData.resources : [];
    const resourceTypes = resources.map((r: any) => (r.type || '').toLowerCase());
    const resourceNames = resources.map((r: any) => (r.name || '').toLowerCase());
    const githubUrl = (projectData.githubUrl || '').trim();
    const hasGithub = isValidGitHubUrl(githubUrl);
    const description = `${projectData.description || ''} ${projectData.problemStatement || ''} ${projectData.proposedSolution || ''}`.toLowerCase();

    // Verify code presence
    const hasSourceCodeResource =
      resourceTypes.includes('sourcecode') ||
      resourceNames.some((n: string) =>
        n.endsWith('.zip') ||
        n.endsWith('.tar.gz') ||
        n.endsWith('.ts') ||
        n.endsWith('.py') ||
        n.endsWith('.js') ||
        n.endsWith('.cpp') ||
        n.endsWith('.html') ||
        n.endsWith('.jsx') ||
        n.endsWith('.tsx')
      );

    if (hasGithub) {
      verifiedEvidence.push(`Verified code repository link: ${githubUrl}`);
    }
    if (hasSourceCodeResource) {
      verifiedEvidence.push('Source code package archive attached');
    }
    if (!hasGithub && !hasSourceCodeResource) {
      missingEvidence.push('Source code archive or repository not attached');
    }

    // Verify documentation / report presence
    const hasReport =
      resourceTypes.includes('projectreport') ||
      resourceTypes.includes('ppt') ||
      resourceNames.some((n: string) =>
        n.endsWith('.pdf') ||
        n.endsWith('.doc') ||
        n.endsWith('.docx') ||
        n.endsWith('.pptx')
      );

    if (hasReport) {
      verifiedEvidence.push('Project report or presentation documentation attached');
    } else {
      missingEvidence.push('Comprehensive project report or architectural documentation not attached');
    }

    // Verify functionality / demo presence
    const hasLiveDemo = Boolean(projectData.liveDemoUrl && projectData.liveDemoUrl.trim().length > 8);
    const hasDemoVideo = resourceTypes.includes('demovideo') || resourceNames.some((n: string) => n.endsWith('.mp4') || n.endsWith('.webm'));
    if (hasLiveDemo || hasDemoVideo) {
      verifiedEvidence.push(hasLiveDemo ? `Live deployment: ${projectData.liveDemoUrl}` : 'Demo walkthrough video attached');
    } else {
      missingEvidence.push('Live demo deployment URL or walkthrough video not provided');
    }

    // Inspect technology claims against actual submitted evidence
    for (const tech of allClaimed) {
      const techLower = tech.toLowerCase();

      // Check if evidence mentions or supports it
      const inCodeNames = resourceNames.some((n: string) => n.includes(techLower));
      const inGithub = hasGithub && githubUrl.toLowerCase().includes(techLower);
      const inDetailedContext = description.includes(techLower) && description.length > 200;

      // Special check for high-complexity claims: e.g. claiming YOLOv8, PyTorch, Kubernetes while evidence is just basic HTML
      const isAdvancedTech = [
        'yolo',
        'yolov8',
        'cnn',
        'pytorch',
        'tensorflow',
        'kubernetes',
        'solidity',
        'blockchain',
        'quantum',
        'cuda',
        'ros2',
      ].some(k => techLower.includes(k));

      const isSimpleHtmlOnly =
        resourceNames.some((n: string) => n.endsWith('.html') || n.includes('basic') || n.includes('index.html')) &&
        !resourceNames.some((n: string) => n.includes('model') || n.includes('pt') || n.includes('weights') || n.includes('py'));

      if (isAdvancedTech && (isSimpleHtmlOnly || (resourceNames.length === 1 && resourceNames[0].endsWith('.html')))) {
        unverifiedClaims.push(`Unverified claim: Claim not verified from submitted evidence: ${tech}. Submitted implementation does not provide evidence for the claimed technologies.`);
        inconsistencies.push(`Discrepancy: Project claims advanced capability (${tech}) but submitted evidence only contains basic web markup.`);
      } else if (inCodeNames || inGithub || (inDetailedContext && hasSourceCodeResource)) {
        verifiedEvidence.push(`Verified usage indicator for ${tech}`);
      } else {
        unverifiedClaims.push(`Unverified claim: Claim not verified from submitted evidence: ${tech}.`);
      }
    }

    // Check for contradictions: e.g. claiming Native Mobile Android app, but repository is React web app
    const fullCategoryDesc = `${projectData.category || ''} ${projectData.title || ''} ${description}`.toLowerCase();
    if (fullCategoryDesc.includes('android') || fullCategoryDesc.includes('ios') || fullCategoryDesc.includes('mobile')) {
      const isWebArtifact = resourceNames.some((n: string) => n.includes('react') || n.includes('html') || n.endsWith('.jsx') || n.endsWith('.tsx') || n.includes('package.json'));
      const isMobileArtifact = resourceNames.some((n: string) => n.includes('apk') || n.includes('gradle') || n.includes('swift') || n.endsWith('.kt') || n.endsWith('.java'));
      if (isWebArtifact && !isMobileArtifact) {
        inconsistencies.push('Contradictory information: Project description or category specifies a Native Mobile application, but attached files indicate a standard web frontend.');
      }
    }

    // Determine evidence quality
    let quality: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT' = 'LOW';
    if (verifiedEvidence.length >= 3 && missingEvidence.length === 0 && inconsistencies.length === 0) {
      quality = 'HIGH';
    } else if (verifiedEvidence.length >= 1 && inconsistencies.length === 0) {
      quality = 'MEDIUM';
    } else if (verifiedEvidence.length === 0) {
      quality = 'INSUFFICIENT';
    }

    const summary = `Evidence analysis: ${verifiedEvidence.length} verified item(s), ${unverifiedClaims.length} unverified claim(s), ${missingEvidence.length} missing requirement(s), ${inconsistencies.length} contradiction flag(s).`;

    return {
      userClaims,
      verifiedEvidence,
      unverifiedClaims,
      missingEvidence,
      inconsistencies,
      evidenceQuality: quality,
      summary,
    };
  }
}

export const evidenceAnalyzer = new EvidenceAnalyzer();
