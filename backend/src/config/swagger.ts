export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Provalix AI REST API',
    version: '1.0.0',
    description: 'Automated Student Project Evaluation Platform API Documentation',
  },
  servers: [
    {
      url: '/api',
      description: 'API Base Server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Health Check',
        tags: ['System'],
        security: [],
        responses: {
          200: {
            description: 'API is running',
          },
        },
      },
    },
    '/auth/register': {
      post: {
        summary: 'Register User',
        tags: ['Authentication'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Alex Morgan' },
                  email: { type: 'string', format: 'email', example: 'alex@apex.edu' },
                  password: { type: 'string', example: 'Password123!' },
                  department: { type: 'string', example: 'Computer Science & Engineering' },
                  year: { type: 'string', example: '3rd Year' },
                  college: { type: 'string', example: 'Apex Institute of Technology' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User registered successfully' },
          400: { description: 'Validation error' },
          409: { description: 'Email already registered' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Login User',
        tags: ['Authentication'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'User logged in successfully' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Get Current Authenticated User',
        tags: ['Authentication'],
        responses: {
          200: { description: 'Authenticated user profile' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/classrooms': {
      get: {
        summary: 'List Classrooms',
        tags: ['Classrooms'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'Classrooms retrieved' } },
      },
      post: {
        summary: 'Create Classroom (Creator becomes OWNER)',
        tags: ['Classrooms'],
        responses: { 201: { description: 'Classroom created' } },
      },
    },
    '/classrooms/{id}/leaderboard': {
      get: {
        summary: 'Get Classroom Leaderboard (Rankings visible after verification)',
        tags: ['Classrooms'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Leaderboard retrieved' } },
      },
    },
    '/project-checker/projects': {
      post: {
        summary: 'Create Project for Standalone Evaluation (100 Marks)',
        tags: ['Project Checker'],
        responses: { 201: { description: 'Project created' } },
      },
      get: {
        summary: 'List Project Checker Projects',
        tags: ['Project Checker'],
        responses: { 200: { description: 'Projects retrieved' } },
      },
    },
    '/chatbot/message': {
      post: {
        summary: 'Send Message to Contextual RAG Chatbot',
        tags: ['AI Chatbot'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['message'],
                properties: {
                  message: { type: 'string', example: 'Explain my Technical Implementation score' },
                  conversationId: { type: 'string', format: 'uuid' },
                  projectId: { type: 'string', format: 'uuid' },
                  submissionId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Chatbot response with citations and contextual answers',
          },
          403: { description: 'Forbidden - Cannot access another student private project context' },
        },
      },
    },
    '/chatbot/conversations': {
      get: {
        summary: 'List User Chatbot Conversations',
        tags: ['AI Chatbot'],
        responses: {
          200: { description: 'User conversations retrieved' },
        },
      },
    },
    '/submissions/{id}/viva/generate': {
      post: {
        summary: 'Generate 5 Project-Specific Viva Questions (Faculty/Owner only)',
        description: 'Generates exactly 5 tailored questions across the 5 standard categories (Problem Understanding, Technical Implementation, Technology / Algorithm Choice, Feature / Internal Working, Scenario / Challenge / Failure Handling). AI generates questions only and does NOT award marks.',
        tags: ['Viva Evaluation'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          201: { description: 'Viva questions generated successfully' },
          403: { description: 'Forbidden - Only assigned evaluators or classroom owners can generate questions' },
          404: { description: 'Submission not found' },
        },
      },
    },
    '/submissions/{id}/viva': {
      get: {
        summary: 'Get Viva Questions for Submission',
        tags: ['Viva Evaluation'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: '5 Viva questions retrieved' },
          403: { description: 'Forbidden' },
          404: { description: 'Submission not found' },
        },
      },
    },
    '/submissions/{id}/viva/marks': {
      post: {
        summary: 'Submit Viva Marks (0-5 marks per question, total <= 25) (Faculty/Owner only)',
        description: 'Faculty manually records awarded marks (0 to 5) for each of the 5 viva questions. Updates the authoritative final classroom score: AI (/50) + PPT/Demo (/25) + Viva (/25) = Final (/100).',
        tags: ['Viva Evaluation'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['vivaQuestions', 'feedback'],
                properties: {
                  pptDemoScore: { type: 'number', minimum: 0, maximum: 25, example: 20 },
                  vivaQuestions: {
                    type: 'array',
                    minItems: 5,
                    maxItems: 5,
                    items: {
                      type: 'object',
                      required: ['questionNumber', 'questionText', 'score'],
                      properties: {
                        questionNumber: { type: 'integer', minimum: 1, maximum: 5 },
                        questionText: { type: 'string' },
                        category: { type: 'string' },
                        score: { type: 'number', minimum: 0, maximum: 5, example: 4.5 },
                        feedback: { type: 'string' },
                      },
                    },
                  },
                  status: { type: 'string', enum: ['Completed', 'Incomplete', 'Absent'], default: 'Completed' },
                  reason: { type: 'string' },
                  feedback: { type: 'string', example: 'Comprehensive answers demonstrated deep system understanding.' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Viva marks recorded and final score updated' },
          400: { description: 'Validation error (marks > 5, count != 5, or total > 25)' },
          403: { description: 'Forbidden' },
        },
      },
    },
    '/submissions/{id}/viva/result': {
      get: {
        summary: 'Get Viva Evaluation Results',
        description: 'Retrieves completed viva evaluation breakdown. Students can access only their own evaluated submission.',
        tags: ['Viva Evaluation'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Viva result with question marks, categories, evaluator feedback, and total scores' },
          400: { description: 'Viva evaluation not yet completed' },
          403: { description: 'Forbidden' },
          404: { description: 'Evaluation not found' },
        },
      },
    },
  },
};
