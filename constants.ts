import { User, Persona, Project, Document, CalendarEvent } from './types';

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
    tone: 'Professional, friendly, and concise.'
  },
  {
    id: 'agent-2',
    name: 'Creative Director',
    description: 'Focuses on ideation, design feedback, and creative writing.',
    systemInstruction: 'You are a Creative Director. Critique ideas, offer bold suggestions, and focus on aesthetics and user experience.',
    tone: 'Inspirational, critical, and visionary.'
  },
  {
    id: 'agent-3',
    name: 'Tech Lead',
    description: 'Helps with technical architecture and code.',
    systemInstruction: 'You are a Senior Tech Lead. Focus on scalability, security, and code quality. Provide technical solutions.',
    tone: 'Technical, precise, and direct.'
  }
];

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'Website Redesign',
    description: 'Overhaul the corporate website with new branding.',
    status: 'active',
    tasks: [
      { id: 't-1', title: 'Design Homepage Mockup', status: 'done', assigneeId: 'user-2', createdAt: new Date(Date.now() - 86400000 * 5) },
      { id: 't-2', title: 'Implement React Components', status: 'in-progress', assigneeId: 'user-1', dueDate: new Date(Date.now() + 86400000 * 2), createdAt: new Date(Date.now() - 86400000 * 2) },
      { id: 't-3', title: 'SEO Audit', status: 'todo', assigneeId: 'user-3', createdAt: new Date(Date.now() - 86400000 * 1) },
    ]
  },
  {
    id: 'proj-2',
    name: 'Q3 Marketing Campaign',
    description: 'Launch the new product line marketing blitz.',
    status: 'active',
    tasks: [
      { id: 't-4', title: 'Draft Email Copy', status: 'todo', assigneeId: 'user-2', createdAt: new Date(Date.now() - 86400000 * 3) },
      { id: 't-5', title: 'Social Media Assets', status: 'in-progress', assigneeId: 'user-3', createdAt: new Date(Date.now() - 86400000 * 4) },
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
  { id: 'evt-1', title: 'Daily Standup', start: new Date(new Date().setHours(10, 0, 0, 0)), end: new Date(new Date().setHours(10, 15, 0, 0)), type: 'meeting' },
  { id: 'evt-2', title: 'Client Review', start: new Date(new Date().setHours(14, 0, 0, 0)), end: new Date(new Date().setHours(15, 0, 0, 0)), type: 'meeting' },
];