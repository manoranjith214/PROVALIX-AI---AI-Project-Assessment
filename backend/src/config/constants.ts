export const APP_CONSTANTS = {
  // Score allocations
  SCORES: {
    PROJECT_CHECKER_MAX: 100,
    PROJECT_CHECKER_CRITERIA: {
      PROBLEM_DEFINITION: 15,
      INNOVATION_NOVELTY: 20,
      TECHNICAL_IMPLEMENTATION: 20,
      FUNCTIONALITY: 15,
      CODE_QUALITY: 10,
      DOCUMENTATION: 10,
      OVERALL_QUALITY: 10,
    },
    CLASSROOM: {
      AI_MAX: 50,
      PPT_DEMO_MAX: 25,
      VIVA_MAX: 25,
      TOTAL_MAX: 100,
      VIVA_QUESTION_COUNT: 5,
      VIVA_QUESTION_MAX_SCORE: 5,
    },
  },

  // Contextual Classroom Roles (NO global roles)
  ROLES: {
    OWNER: 'OWNER',
    EVALUATOR: 'EVALUATOR',
    MEMBER: 'MEMBER',
  } as const,

  // Submission modes
  SUBMISSION_MODE: {
    INDIVIDUAL: 'Individual',
    TEAM: 'Team',
  } as const,

  // Submission Statuses
  SUBMISSION_STATUS: {
    SUBMITTED: 'Submitted',
    AI_EVALUATED: 'AI_Evaluated',
    FACULTY_EVALUATED: 'Faculty_Evaluated',
    VERIFIED: 'Verified',
    RETURNED: 'Returned',
  } as const,

  // Verification Statuses
  VERIFICATION_STATUS: {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    RETURNED: 'Returned',
  } as const,

  // Faculty Evaluation Statuses
  EVALUATION_STATUS: {
    COMPLETED: 'Completed',
    INCOMPLETE: 'Incomplete',
    ABSENT: 'Absent',
  } as const,

  // Notification Types
  NOTIFICATION_TYPES: {
    TEAM_INVITATION: 'team_invitation',
    CLASSROOM_INVITATION: 'classroom_invitation',
    JOIN_APPROVAL: 'join_approval',
    SUBMISSION_SUCCESS: 'submission_success',
    DEADLINE_REMINDER: 'deadline_reminder',
    AI_EVALUATED: 'ai_evaluated',
    FACULTY_EVALUATED: 'faculty_evaluated',
    VIVA_ASSIGNED: 'viva_assigned',
    VERIFICATION: 'verification',
    RESULT_PUBLISHED: 'result_published',
    EVALUATOR_ASSIGNMENT: 'evaluator_assignment',
    NEW_SUBMISSION: 'new_submission',
    EVALUATION_DEADLINE: 'evaluation_deadline',
    RETURNED_EVALUATION: 'returned_evaluation',
  } as const,
};
