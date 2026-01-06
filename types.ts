
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
}

export interface Attachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file';
  name: string;
  url?: string;
  data?: string; // base64
  mimeType: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'archived';
  tasks: Task[];
}

export interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'done';
  assigneeId?: string;
  dueDate?: Date;
  createdAt?: Date;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'meeting' | 'deadline' | 'reminder';
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
}

export enum View {
  CHAT = 'CHAT',
  PROJECTS = 'PROJECTS',
  CALENDAR = 'CALENDAR',
  KNOWLEDGE = 'KNOWLEDGE',
  SETTINGS = 'SETTINGS'
}
