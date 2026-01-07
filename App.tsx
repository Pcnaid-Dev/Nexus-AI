
import React, { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import ProjectBoard from './components/ProjectBoard';
import ProjectWorkspace from './components/ProjectWorkspace';
import CalendarView from './components/CalendarView';
import KnowledgeBase from './components/KnowledgeBase';
import AgentSettings from './components/AgentSettings';
import UserSwitcher from './components/UserSwitcher';
import AgreementsPage from './components/AgreementsPage';
import OnboardingTour from './components/OnboardingTour';
import { useRealTimeSync, SyncAction } from './hooks/useRealTimeSync';
import { 
  MOCK_USERS, 
  DEFAULT_PERSONAS, 
  MOCK_PROJECTS, 
  MOCK_DOCS, 
  MOCK_EVENTS,
  MOCK_AGREEMENTS 
} from './constants';
import { 
  View, 
  User, 
  Message, 
  Project, 
  Document, 
  Persona,
  Agreement,
  Notification
} from './types';

function App() {
  const [currentView, setCurrentView] = useState<View>(View.CHAT);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  
  // State Management
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[0]);
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', userId: 'gemini', role: 'model', content: 'Welcome to Nexus Workspace. I am ready to collaborate with your team. How can I assist you today?', timestamp: new Date() }
  ]);
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [documents, setDocuments] = useState<Document[]>(MOCK_DOCS);
  const [agreements, setAgreements] = useState<Agreement[]>(MOCK_AGREEMENTS);
  const [personas, setPersonas] = useState<Persona[]>(DEFAULT_PERSONAS);
  const [activePersonaId, setActivePersonaId] = useState<string>(DEFAULT_PERSONAS[0].id);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Collaboration State
  const [activeTypers, setActiveTypers] = useState<Map<string, string>>(new Map());

  // Handle incoming typing updates
  const handleRemoteTypingUpdate = useCallback((userId: string, name: string, isTyping: boolean) => {
    setActiveTypers(prev => {
      const newMap = new Map(prev);
      if (isTyping) {
        newMap.set(userId, name);
      } else {
        newMap.delete(userId);
      }
      return newMap;
    });
  }, []);

  // Initialize Sync Hook
  const { broadcast } = useRealTimeSync(
    setMessages,
    setProjects,
    setDocuments,
    setPersonas,
    setAgreements,
    handleRemoteTypingUpdate
  );

  // State Wrappers with Broadcast
  const handleSetMessages = (action: React.SetStateAction<Message[]>) => {
    setMessages(prev => {
      const newState = typeof action === 'function' ? action(prev) : action;
      broadcast({ type: 'SYNC_MESSAGES', payload: newState });
      return newState;
    });
  };

  const handleSetProjects = (action: React.SetStateAction<Project[]>) => {
    setProjects(prev => {
      const newState = typeof action === 'function' ? action(prev) : action;
      broadcast({ type: 'SYNC_PROJECTS', payload: newState });
      return newState;
    });
  };

  const handleUpdateSingleProject = (updatedProject: Project) => {
      handleSetProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const handleSetDocuments = (action: React.SetStateAction<Document[]>) => {
    setDocuments(prev => {
      const newState = typeof action === 'function' ? action(prev) : action;
      broadcast({ type: 'SYNC_DOCS', payload: newState });
      return newState;
    });
  };

  const handleSetAgreements = (action: React.SetStateAction<Agreement[]>) => {
    setAgreements(prev => {
      const newState = typeof action === 'function' ? action(prev) : action;
      broadcast({ type: 'SYNC_AGREEMENTS', payload: newState });
      return newState;
    });
  };

  const handleSetPersonas = (action: React.SetStateAction<Persona[]>) => {
    setPersonas(prev => {
      const newState = typeof action === 'function' ? action(prev) : action;
      broadcast({ type: 'SYNC_PERSONAS', payload: newState });
      return newState;
    });
  };

  const handleNotify = (userId: string, text: string, type: 'mention' | 'assignment' | 'system') => {
      const newNotif: Notification = {
          id: Date.now().toString(),
          userId,
          senderId: currentUser.id,
          text,
          read: false,
          createdAt: new Date(),
          type
      };
      setNotifications(prev => [newNotif, ...prev]);
  };

  const broadcastTyping = (isTyping: boolean) => {
    broadcast({ 
      type: 'TYPING_UPDATE', 
      payload: { userId: currentUser.id, name: currentUser.name, isTyping } 
    });
  };

  const handleAcceptAgreement = (title: string, content: string) => {
    const newAgreement: Agreement = {
      id: Date.now().toString(),
      title: title,
      content: content,
      status: 'active',
      createdAt: new Date(),
      signatories: [currentUser.id]
    };
    handleSetAgreements(prev => [...prev, newAgreement]);
  };

  const activePersona = personas.find(p => p.id === activePersonaId) || personas[0];
  const activeDocs = documents.filter(d => d.isActive);
  const activeAgreements = agreements.filter(a => a.status === 'active');
  const activeProject = projects.find(p => p.id === activeProjectId);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <OnboardingTour onComplete={() => console.log('Tour Completed')} />

      {/* Conditionally Render Left Sidebar */}
      {!activeProjectId && (
          <Sidebar 
            currentView={currentView} 
            onViewChange={setCurrentView} 
          />
      )}
      
      <main className="flex-1 flex flex-col h-full relative">
        {/* Top Bar with User Switcher - Hide in Project Mode as Workspace has its own header */}
        {!activeProjectId && (
            <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                {currentView === View.CHAT && "Team Chat Channel"}
                {currentView === View.PROJECTS && "Project Dashboard"}
                {currentView === View.CALENDAR && "Team Schedule"}
                {currentView === View.KNOWLEDGE && "Knowledge & Context"}
                {currentView === View.AGREEMENTS && "Agreements & Contracts"}
                {currentView === View.SETTINGS && "Agent Configuration"}
            </h1>
            
            <div className="flex items-center gap-4">
               {/* Notifications Area */}
                <div className="relative">
                    {notifications.filter(n => !n.read && n.userId === currentUser.id).length > 0 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
                    )}
                </div>
                <UserSwitcher 
                    currentUser={currentUser} 
                    allUsers={MOCK_USERS} 
                    onSwitch={(id) => setCurrentUser(MOCK_USERS.find(u => u.id === id) || MOCK_USERS[0])} 
                />
            </div>
            </div>
        )}

        {/* View Content */}
        <div className="flex-1 overflow-hidden relative">
          
          {/* Project Workspace Mode */}
          {activeProjectId && activeProject ? (
              <ProjectWorkspace 
                  project={activeProject}
                  currentUser={currentUser}
                  allUsers={MOCK_USERS}
                  personas={personas}
                  documents={documents}
                  agreements={agreements}
                  events={MOCK_EVENTS}
                  onUpdateProject={handleUpdateSingleProject}
                  onClose={() => setActiveProjectId(null)}
                  activeTypers={activeTypers}
                  onTyping={broadcastTyping}
                  onNotify={handleNotify}
              />
          ) : (
            // Standard Dashboard Views
            <>
                {currentView === View.CHAT && (
                    <ChatArea 
                    currentUser={currentUser}
                    messages={messages}
                    setMessages={handleSetMessages}
                    allUsers={MOCK_USERS}
                    activePersona={activePersona}
                    activeDocs={activeDocs}
                    activeAgreements={activeAgreements}
                    activeTypers={activeTypers}
                    onTyping={broadcastTyping}
                    onAcceptAgreement={handleAcceptAgreement}
                    />
                )}

                {currentView === View.PROJECTS && (
                    <ProjectBoard 
                        projects={projects} 
                        setProjects={handleSetProjects}
                        users={MOCK_USERS} 
                        onSelectProject={setActiveProjectId}
                    />
                )}

                {currentView === View.CALENDAR && (
                    <CalendarView events={MOCK_EVENTS} />
                )}

                {currentView === View.KNOWLEDGE && (
                    <KnowledgeBase documents={documents} setDocuments={handleSetDocuments} />
                )}

                {currentView === View.AGREEMENTS && (
                    <AgreementsPage 
                        agreements={agreements} 
                        setAgreements={handleSetAgreements} 
                        users={MOCK_USERS}
                    />
                )}

                {currentView === View.SETTINGS && (
                    <AgentSettings 
                        personas={personas}
                        activePersonaId={activePersonaId}
                        setActivePersonaId={setActivePersonaId}
                        setPersonas={handleSetPersonas}
                    />
                )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
