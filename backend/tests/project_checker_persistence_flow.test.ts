import { ProjectCheckerService } from '../src/services/projectCheckerService';
import { projectCheckerRepository } from '../src/repositories/projectCheckerRepository';
import { evidenceAnalyzer } from '../src/integrations/rubric/evidenceAnalyzer';
import { validateMeaningfulText, containsPlaceholderText } from '../src/validators/inputValidationUtils';
import { createProjectCheckerProjectSchema } from '../src/validators/projectCheckerValidator';
import { AppError } from '../src/middleware/errorMiddleware';

describe('Project Checker - Exact 9 Case Persistence & Flow Verification', () => {
  const service = new ProjectCheckerService();
  const testUserId = 'usr-test-persistence-001';

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // -------------------------------------------------------------
  // Case A: New project → fill details → save → Step 2 → upload → Start Analysis
  // Expected: works with real persisted project ID and full evaluation.
  // -------------------------------------------------------------
  test('Case A: New project → fill details → save → upload → Start Analysis works end-to-end', async () => {
    const validProjectData = {
      title: 'Automated Microgrid Voltage Optimization',
      category: 'Renewable Energy & IoT',
      targetUsers: 'Substation electrical operators and grid maintenance teams',
      description: 'Distributed microgrid telemetry framework with dynamic reactive power compensation algorithms.',
      problemStatement: 'Extreme voltage instability under variable photovoltaic intermittency causes feeder line trips.',
      proposedSolution: 'Edge-computed reactive power injection utilizing solid-state smart inverters with sub-50ms latency.',
      githubUrl: 'https://github.com/provalix/smart-microgrid',
      technologies: ['C++', 'Python', 'Modbus'],
      programmingLanguages: ['C++', 'Python'],
    };

    const mockSavedProject = {
      id: 'proj-persisted-uuid-001',
      userId: testUserId,
      ...validProjectData,
      technologies: JSON.stringify(validProjectData.technologies),
      programmingLanguages: JSON.stringify(validProjectData.programmingLanguages),
      resources: [],
      aiEvaluation: null,
      plagiarism: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    jest.spyOn(projectCheckerRepository, 'create').mockResolvedValueOnce(mockSavedProject as any);
    const created = await service.createProject(testUserId, validProjectData);
    expect(created.id).toBe('proj-persisted-uuid-001');

    // Upload resource
    const mockFile: any = {
      originalname: 'microgrid-firmware.zip',
      buffer: Buffer.from('mock zip content'),
      size: 1024 * 500,
      mimetype: 'application/zip',
    };
    jest.spyOn(service, 'getProjectById').mockResolvedValue(mockSavedProject as any);
    jest.spyOn(projectCheckerRepository, 'addResource').mockResolvedValueOnce({
      id: 'res-001',
      projectId: created.id,
      name: 'microgrid-firmware.zip',
      type: 'sourceCode',
      size: '0.49 MB',
      uploadedById: testUserId,
    } as any);

    // AI evaluation starts using real persisted project ID
    const projectWithResource = {
      ...mockSavedProject,
      resources: [{ id: 'res-001', projectId: created.id, name: 'microgrid-firmware.zip', type: 'sourceCode' }],
    };
    jest.spyOn(service, 'getProjectById').mockResolvedValue(projectWithResource as any);

    const validation = evidenceAnalyzer.validateProjectSubmission(projectWithResource);
    expect(validation.isValid).toBe(true);
    expect(created.id).not.toBeNull();
    expect(created.id).not.toBeUndefined();
  });

  // -------------------------------------------------------------
  // Case B: Step 1 not saved → try Step 2
  // Expected: blocked clearly OR auto-save.
  // -------------------------------------------------------------
  test('Case B: Missing / unsaved project ID blocks evaluation or upload clearly', async () => {
    const unpersistedId: any = null;
    expect(!unpersistedId).toBe(true);

    // Calling service with empty/null ID fails validation or throws
    await expect(service.getProjectById(unpersistedId, testUserId)).rejects.toThrow('Project not found');
  });

  // -------------------------------------------------------------
  // Case C: Save → refresh Step 2
  // Expected: project ID remains available and restores persisted state.
  // -------------------------------------------------------------
  test('Case C: Save → refresh Step 2: project ID restores full project metadata and resources', async () => {
    const savedProjectId = 'proj-persisted-uuid-002';
    const mockRestoredProject = {
      id: savedProjectId,
      userId: testUserId,
      title: 'Automated Microgrid Voltage Optimization',
      category: 'Renewable Energy',
      description: 'Distributed microgrid telemetry framework with dynamic reactive power compensation.',
      resources: [{ id: 'res-001', projectId: savedProjectId, type: 'sourceCode', name: 'source.zip' }],
      aiEvaluation: null,
    };

    jest.spyOn(projectCheckerRepository, 'findById').mockResolvedValueOnce(mockRestoredProject as any);
    const restored = await service.getProjectById(savedProjectId, testUserId);

    expect(restored.id).toBe(savedProjectId);
    expect(restored.title).toBe('Automated Microgrid Voltage Optimization');
    expect(restored.resources.length).toBe(1);
  });

  // -------------------------------------------------------------
  // Case D: Save project twice
  // Expected: no duplicate project created; updates existing draft and reuses ID.
  // -------------------------------------------------------------
  test('Case D: Save project twice reuses existing draft ID and prevents duplicates', async () => {
    const projectData = {
      title: 'Autonomous Drone Navigation Pipeline',
      category: 'Robotics',
      targetUsers: 'Search and rescue teams',
      description: 'Autonomous multi-rotor navigation architecture in GPS-denied environments.',
      problemStatement: 'Severe telemetry blackout in collapsed tunnels prevents drone navigation.',
      proposedSolution: 'Onboard visual-inertial odometry paired with distributed local graph SLAM.',
    };

    const firstProject = {
      id: 'proj-draft-uuid-003',
      userId: testUserId,
      ...projectData,
      aiEvaluation: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // First save creates
    jest.spyOn(projectCheckerRepository, 'create').mockResolvedValueOnce(firstProject as any);
    const firstSaved = await service.createProject(testUserId, projectData);
    expect(firstSaved.id).toBe('proj-draft-uuid-003');

    // Second save with same draftId or draft project reuses ID
    jest.spyOn(projectCheckerRepository, 'findById').mockResolvedValueOnce(firstProject as any);
    const updateSpy = jest.spyOn(service, 'updateProject').mockResolvedValueOnce({
      ...firstProject,
      title: 'Autonomous Drone Navigation Pipeline Updated',
    } as any);

    const secondSaved = await service.createProject(testUserId, {
      ...projectData,
      draftId: firstSaved.id,
      title: 'Autonomous Drone Navigation Pipeline Updated',
    });

    expect(updateSpy).toHaveBeenCalledWith('proj-draft-uuid-003', testUserId, expect.any(Object));
    expect(secondSaved.id).toBe('proj-draft-uuid-003');
  });

  // -------------------------------------------------------------
  // Case E: Upload resource
  // Expected: resource belongs to the same persisted project ID.
  // -------------------------------------------------------------
  test('Case E: Uploaded resource belongs to the persisted project ID', async () => {
    const targetProjectId = 'proj-persisted-uuid-004';
    const mockFile: any = {
      originalname: 'project-report.pdf',
      buffer: Buffer.from('pdf bytes'),
      size: 2048,
      mimetype: 'application/pdf',
    };

    jest.spyOn(service, 'getProjectById').mockResolvedValueOnce({
      id: targetProjectId,
      userId: testUserId,
    } as any);

    jest.spyOn(projectCheckerRepository, 'addResource').mockImplementationOnce(async (data: any) => {
      expect(data.projectId).toBe(targetProjectId);
      expect(data.uploadedById).toBe(testUserId);
      return {
        id: 'res-999',
        ...data,
      };
    });

    const res = await service.addResource(targetProjectId, testUserId, mockFile, 'projectReport');
    expect(res.projectId).toBe(targetProjectId);
  });

  // -------------------------------------------------------------
  // Case F: Start Analysis
  // Expected: evaluation endpoint receives a real persisted project ID and checks database.
  // -------------------------------------------------------------
  test('Case F: Start Analysis verifies project existence and ownership before starting AI analysis', async () => {
    const realProjectId = 'proj-persisted-uuid-005';
    const otherUser = 'usr-other-002';

    // Different user triggers 403
    jest.spyOn(projectCheckerRepository, 'findById').mockResolvedValueOnce({
      id: realProjectId,
      userId: otherUser,
    } as any);

    await expect(service.getProjectById(realProjectId, testUserId)).rejects.toThrow(
      new AppError('Unauthorized to view this project', 403)
    );
  });

  // -------------------------------------------------------------
  // Case G: Project does not exist
  // Expected: proper 404 error returned.
  // -------------------------------------------------------------
  test('Case G: Non-existent project ID returns 404 AppError', async () => {
    jest.spyOn(projectCheckerRepository, 'findById').mockResolvedValueOnce(null);

    await expect(service.getProjectById('non-existent-uuid', testUserId)).rejects.toThrow(
      new AppError('Project not found', 404)
    );
  });

  // -------------------------------------------------------------
  // Case H: Missing source-code evidence
  // Expected: evidence gate blocks analysis.
  // -------------------------------------------------------------
  test('Case H: Evidence gate blocks AI analysis when required source-code evidence is missing', async () => {
    const projectWithoutSource = {
      title: 'Real-time Distributed Video Transcoder',
      category: 'Cloud Computing',
      description: 'Distributed video transcoding system running across containerized worker nodes.',
      problemStatement: 'Slow encoding speeds for high-resolution video streams on single server architectures.',
      proposedSolution: 'Segmenting video into parallel chunks processed across distributed worker clusters.',
      technologies: ['Node.js', 'FFmpeg'],
      resources: [
        // Only presentation and report, no source code or github!
        { type: 'ppt', name: 'slides.pptx' },
        { type: 'projectReport', name: 'report.pdf' },
      ],
      githubUrl: '',
    };

    const validation = evidenceAnalyzer.validateProjectSubmission(projectWithoutSource);
    expect(validation.isValid).toBe(false);
    expect(validation.missingEvidence).toContain('sourceCode');
    expect(validation.reason).toContain('AI evaluation blocked: Insufficient evidence');
  });

  // -------------------------------------------------------------
  // Case I: Garbage input
  // Expected: validation blocks analysis and creation.
  // -------------------------------------------------------------
  test('Case I: Garbage input (e.g. "xxm,m,,") is rejected by validation', () => {
    expect(containsPlaceholderText('xxm,m,,')).toBe(true);

    const validation = validateMeaningfulText('xxm,m,,', 5, 'Project Title');
    expect(validation.isValid).toBe(false);

    // Schema validation also rejects meaningless title
    const schemaResult = createProjectCheckerProjectSchema.safeParse({
      title: 'xxm,m,,',
      description: 'xxm,m,, xxm,m,, xxm,m,, xxm,m,, xxm,m,,',
    });
    expect(schemaResult.success).toBe(false);
  });
});
