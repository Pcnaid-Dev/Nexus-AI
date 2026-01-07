
export interface User {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

export interface Message {
  id: string;
  userId: string; // 'gemini' or user.id
  content: string;
  timestamp: Date;
  role: 'user' | 'model';
  attachments?: Attachment[];
  isThinking?: boolean; // Track if this was a thinking model response
  agreementProposal?: {
    title: string;
    content: string;
    status: 'proposed' | 'accepted' | 'rejected';
    approvedBy?: string[];
  };
}

export interface Attachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file';
  name: string;
  url?: string;
  data?: string; // base64
  mimeType: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  content: string;
  createdAt: Date;
}

export interface AssigneeRecord {
  userId: string;
  assignedAt: Date;
}

export interface Notification {
  id: string;
  userId: string; // Recipient
  senderId: string; // Triggered by
  text: string;
  read: boolean;
  createdAt: Date;
  type: 'mention' | 'assignment' | 'system';
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'archived';
  tasks: Task[];
  // New fields for Project Workspace
  chatHistory: Message[];
  files: Document[];
  activePersonaId: string;
  theme: string; // e.g. 'blue', 'purple', 'emerald', 'amber', 'rose', 'cyan', 'indigo'
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high'; // Added priority
  assigneeId?: string;
  dueDate?: Date;
  createdAt?: Date;
  subtasks?: Subtask[];
  comments?: Comment[];
  assigneeHistory?: AssigneeRecord[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'meeting' | 'deadline' | 'reminder';
  projectId?: string; // Link event to a project
}

export interface Document {
  id: string;
  name: string;
  content: string; // Simulated content for context
  source: 'upload' | 'gdrive' | 'external';
  isActive: boolean; // If true, included in RAG context
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  systemInstruction: string;
  tone: string;
  theme?: string; // Custom color theme for the persona
}

export interface Agreement {
  id: string;
  title: string;
  content: string;
  status: 'active' | 'draft' | 'archived';
  createdAt: Date;
  signatories: string[]; // List of User IDs who accepted
}

export enum View {
  CHAT = 'CHAT',
  PROJECTS = 'PROJECTS',
  CALENDAR = 'CALENDAR',
  KNOWLEDGE = 'KNOWLEDGE',
  AGREEMENTS = 'AGREEMENTS',
  SETTINGS = 'SETTINGS'
}

export enum ProjectViewType {
  DASHBOARD = 'DASHBOARD',
  TASKS = 'TASKS',
  CHAT = 'CHAT',
  FILES = 'FILES',
  CALENDAR = 'CALENDAR'
}
