import React, { useState, useCallback, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
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
import LoginPage from './components/LoginPage';
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
  // Auth0 Hook
  const { user: auth0User, isAuthenticated, isLoading } = useAuth0();

  // App State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>(View.CHAT);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  
  // Data State
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

  // --- AUTHENTICATION SYNC ---
  useEffect(() => {
    if (isAuthenticated && auth0User) {
      // Map Auth0 user to Nexus User
      // auth0User.sub is the unique user ID
      // auth0User.email is the Gmail address (if using Google social connection)
      const mappedUser: User = {
        id: auth0User.sub || `user-${Date.now()}`,
        name: auth0User.name || auth0User.email || 'User',
        email: auth0User.email,
        avatar: auth0User.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(auth0User.name || 'U')}`,
        color: 'bg-blue-500' // could randomize based on ID
      };
      setCurrentUser(mappedUser);
    } else if (!isLoading && !isAuthenticated) {
      setCurrentUser(null);
    }
  }, [isAuthenticated, auth0User, isLoading]);

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
      if (!currentUser) return;
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
    if (!currentUser) return;
    broadcast({ 
      type: 'TYPING_UPDATE', 
      payload: { userId: currentUser.id, name: currentUser.name, isTyping } 
    });
  };

  const handleAcceptAgreement = (title: string, content: string) => {
    if (!currentUser) return;
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

  if (isLoading) {
    return (
      <div className="h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Connecting to Nexus Identity...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return <LoginPage />;
  }

  const activePersona = personas.find(p => p.id === activePersonaId) || personas[0];
  const activeDocs = documents.filter(d => d.isActive);
  const activeAgreements = agreements.filter(a => a.status === 'active');
  const activeProject = projects.find(p => p.id === activeProjectId);

  // Combine real currentUser with mock users for collaboration lists
  const activeUsersList = [currentUser, ...MOCK_USERS.filter(u => u.id !== currentUser.id)];

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
                  allUsers={activeUsersList}
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
                    allUsers={activeUsersList}
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
                        users={activeUsersList} 
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
                        users={activeUsersList}
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