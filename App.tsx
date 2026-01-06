import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import ProjectBoard from './components/ProjectBoard';
import CalendarView from './components/CalendarView';
import KnowledgeBase from './components/KnowledgeBase';
import AgentSettings from './components/AgentSettings';
import UserSwitcher from './components/UserSwitcher';
import { 
  MOCK_USERS, 
  DEFAULT_PERSONAS, 
  MOCK_PROJECTS, 
  MOCK_DOCS, 
  MOCK_EVENTS 
} from './constants';
import { 
  View, 
  User, 
  Message, 
  Project, 
  Document, 
  Persona 
} from './types';

function App() {
  const [currentView, setCurrentView] = useState<View>(View.CHAT);
  
  // State Management
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[0]);
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', userId: 'gemini', role: 'model', content: 'Welcome to Nexus Workspace. I am ready to collaborate with your team. How can I assist you today?', timestamp: new Date() }
  ]);
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS); // In a real app, setProjects
  const [documents, setDocuments] = useState<Document[]>(MOCK_DOCS);
  const [personas, setPersonas] = useState<Persona[]>(DEFAULT_PERSONAS);
  const [activePersonaId, setActivePersonaId] = useState<string>(DEFAULT_PERSONAS[0].id);

  const activePersona = personas.find(p => p.id === activePersonaId) || personas[0];
  const activeDocs = documents.filter(d => d.isActive);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView} 
      />
      
      <main className="flex-1 flex flex-col h-full relative">
        {/* Top Bar with User Switcher */}
        <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">
            {currentView === View.CHAT && "Team Chat Channel"}
            {currentView === View.PROJECTS && "Project Dashboard"}
            {currentView === View.CALENDAR && "Team Schedule"}
            {currentView === View.KNOWLEDGE && "Knowledge & Context"}
            {currentView === View.SETTINGS && "Agent Configuration"}
          </h1>
          
          <UserSwitcher 
            currentUser={currentUser} 
            allUsers={MOCK_USERS} 
            onSwitch={(id) => setCurrentUser(MOCK_USERS.find(u => u.id === id) || MOCK_USERS[0])} 
          />
        </div>

        {/* View Content */}
        <div className="flex-1 overflow-hidden relative">
          {currentView === View.CHAT && (
            <ChatArea 
              currentUser={currentUser}
              messages={messages}
              setMessages={setMessages}
              allUsers={MOCK_USERS}
              activePersona={activePersona}
              activeDocs={activeDocs}
            />
          )}

          {currentView === View.PROJECTS && (
            <ProjectBoard 
              projects={projects} 
              setProjects={setProjects}
              users={MOCK_USERS} 
            />
          )}

          {currentView === View.CALENDAR && (
            <CalendarView events={MOCK_EVENTS} />
          )}

          {currentView === View.KNOWLEDGE && (
            <KnowledgeBase documents={documents} setDocuments={setDocuments} />
          )}

          {currentView === View.SETTINGS && (
            <AgentSettings 
                personas={personas}
                activePersonaId={activePersonaId}
                setActivePersonaId={setActivePersonaId}
                setPersonas={setPersonas}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;