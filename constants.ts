
import { User, Persona, Project, Document, CalendarEvent, Agreement } from './types';

export const MOCK_USERS: User[] = [
  { id: 'user-1', name: 'Alice Chen', avatar: 'https://picsum.photos/id/64/100/100', color: 'bg-blue-500' },
  { id: 'user-2', name: 'Marcus Johnson', avatar: 'https://picsum.photos/id/91/100/100', color: 'bg-emerald-500' },
  { id: 'user-3', name: 'Elena Rodriguez', avatar: 'https://picsum.photos/id/129/100/100', color: 'bg-purple-500' },
];

export const DEFAULT_PERSONAS: Persona[] = [
  {
    id: 'agent-1',
    name: 'Nexus Assistant',
    description: 'A helpful, general-purpose project assistant.',
    systemInstruction: 'You are Nexus, a smart collaborative project assistant. You help the team manage tasks, schedule events, and answer questions based on the provided knowledge base. Always distinguish between different users.',
    tone: 'Professional, friendly, and concise.',
    theme: 'blue'
  },
  {
    id: 'agent-2',
    name: 'Creative Director',
    description: 'Focuses on ideation, design feedback, and creative writing.',
    systemInstruction: 'You are a Creative Director. Critique ideas, offer bold suggestions, and focus on aesthetics and user experience.',
    tone: 'Inspirational, critical, and visionary.',
    theme: 'rose'
  },
  {
    id: 'agent-3',
    name: 'Tech Lead',
    description: 'Helps with technical architecture and code.',
    systemInstruction: 'You are a Senior Tech Lead. Focus on scalability, security, and code quality. Provide technical solutions.',
    tone: 'Technical, precise, and direct.',
    theme: 'cyan'
  },
  {
    id: 'agent-4',
    name: 'Mediator',
    description: 'Helps resolve conflicts and formalize agreements.',
    systemInstruction: 'You are a skilled Mediator. Listen to all parties, identify common ground, and help users formalize their consensus into clear, written agreements. Use the "proposeAgreement" tool when users reach a consensus.',
    tone: 'Diplomatic, neutral, and clear.',
    theme: 'indigo'
  }
];

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'Website Redesign',
    description: 'Overhaul the corporate website with new branding.',
    status: 'active',
    activePersonaId: 'agent-2',
    theme: 'rose',
    files: [],
    chatHistory: [
        { id: 'msg-p1', userId: 'gemini', role: 'model', content: 'Welcome to the Website Redesign project workspace. I am ready to help with creative direction.', timestamp: new Date() }
    ],
    tasks: [
      { 
        id: 't-1', 
        title: 'Design Homepage Mockup', 
        description: 'Create high-fidelity mockups for the new homepage using Figma. Focus on the hero section and value propositions.', 
        status: 'done', 
        priority: 'high',
        assigneeId: 'user-2', 
        createdAt: new Date(Date.now() - 86400000 * 5),
        subtasks: [
            { id: 'st-1', title: 'Hero Section', completed: true },
            { id: 'st-2', title: 'Footer', completed: true },
            { id: 'st-3', title: 'Mobile View', completed: true }
        ],
        comments: [
            { id: 'c-1', userId: 'user-1', content: 'Looks great! Can we adjust the primary blue?', createdAt: new Date(Date.now() - 86400000 * 2) }
        ],
        assigneeHistory: [
            { userId: 'user-2', assignedAt: new Date(Date.now() - 86400000 * 5) }
        ]
      },
      { 
        id: 't-2', 
        title: 'Implement React Components', 
        status: 'in-progress', 
        priority: 'high',
        assigneeId: 'user-1', 
        dueDate: new Date(Date.now() + 86400000 * 2), 
        createdAt: new Date(Date.now() - 86400000 * 2),
        subtasks: [],
        comments: []
      },
      { 
        id: 't-3', 
        title: 'SEO Audit', 
        status: 'todo', 
        priority: 'low',
        assigneeId: 'user-3', 
        createdAt: new Date(Date.now() - 86400000 * 1),
        subtasks: [],
        comments: []
      },
    ]
  },
  {
    id: 'proj-2',
    name: 'Q3 Marketing Campaign',
    description: 'Launch the new product line marketing blitz.',
    status: 'active',
    activePersonaId: 'agent-1',
    theme: 'violet',
    files: [],
    chatHistory: [
        { id: 'msg-p2', userId: 'gemini', role: 'model', content: 'Q3 Marketing Workspace initialized. Let\'s plan the campaign.', timestamp: new Date() }
    ],
    tasks: [
      { id: 't-4', title: 'Draft Email Copy', status: 'todo', priority: 'medium', assigneeId: 'user-2', createdAt: new Date(Date.now() - 86400000 * 3) },
      { id: 't-5', title: 'Social Media Assets', status: 'in-progress', priority: 'medium', assigneeId: 'user-3', createdAt: new Date(Date.now() - 86400000 * 4) },
    ]
  },
  {
    id: 'proj-3',
    name: 'Mobile App Beta',
    description: 'Prepare the iOS and Android builds for beta testers.',
    status: 'active',
    activePersonaId: 'agent-3',
    theme: 'cyan',
    files: [],
    chatHistory: [
        { id: 'msg-p3', userId: 'gemini', role: 'model', content: 'Technical workspace ready. Awaiting build instructions.', timestamp: new Date() }
    ],
    tasks: [
       { id: 't-6', title: 'Setup TestFlight', status: 'done', priority: 'high', assigneeId: 'user-1', createdAt: new Date() },
       { id: 't-7', title: 'Fix Crash on Login', status: 'todo', priority: 'high', assigneeId: 'user-1', createdAt: new Date() }
    ]
  }
];

export const MOCK_DOCS: Document[] = [
  {
    id: 'doc-1',
    name: 'Brand_Guidelines_2024.pdf',
    content: 'Our brand colors are #FF5733 (Orange) and #33FF57 (Green). Tone of voice should be exciting and youthful.',
    source: 'upload',
    isActive: true,
  },
  {
    id: 'doc-2',
    name: 'Q3_Goals.gdoc',
    content: 'Primary goal: Increase user acquisition by 20%. Secondary goal: Improve retention by 5%.',
    source: 'gdrive',
    isActive: false,
  }
];

export const MOCK_EVENTS: CalendarEvent[] = [
  { id: 'evt-1', title: 'Daily Standup', start: new Date(new Date().setHours(10, 0, 0, 0)), end: new Date(new Date().setHours(10, 15, 0, 0)), type: 'meeting', projectId: 'proj-1' },
  { id: 'evt-2', title: 'Client Review', start: new Date(new Date().setHours(14, 0, 0, 0)), end: new Date(new Date().setHours(15, 0, 0, 0)), type: 'meeting', projectId: 'proj-1' },
  { id: 'evt-3', title: 'Marketing Sync', start: new Date(new Date().setHours(11, 0, 0, 0)), end: new Date(new Date().setHours(12, 0, 0, 0)), type: 'meeting', projectId: 'proj-2' },
];

export const MOCK_AGREEMENTS: Agreement[] = [
  {
    id: 'agr-1',
    title: 'Core Working Hours',
    content: 'All team members agree to be available for synchronous communication between 10:00 AM and 3:00 PM EST. Flexible hours are permitted outside this window.',
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 10),
    signatories: ['user-1', 'user-2', 'user-3']
  },
  {
    id: 'agr-2',
    title: 'Code Review Standards',
    content: 'All pull requests must have at least one approval from a senior engineer. No PRs to be merged on Fridays after 4 PM.',
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 5),
    signatories: ['user-1', 'user-3']
  }
];
