
import React, { useState } from 'react';
import { Project, User, Persona, Document, Message, Agreement, ProjectViewType, CalendarEvent } from '../types';
import ProjectSidebar from './ProjectSidebar';
import ChatArea from './ChatArea';
import TaskBoard from './TaskBoard';
import CalendarView from './CalendarView';
import KnowledgeBase from './KnowledgeBase';

interface ProjectWorkspaceProps {
  project: Project;
  currentUser: User;
  allUsers: User[];
  personas: Persona[];
  documents: Document[]; // Global docs potentially available
  agreements: Agreement[];
  events: CalendarEvent[]; // Global events
  onUpdateProject: (updatedProject: Project) => void;
  onClose: () => void;
  // Sync props
  activeTypers?: Map<string, string>;
  onTyping?: (isTyping: boolean) => void;
  onNotify?: (userId: string, text: string, type: 'mention' | 'assignment' | 'system') => void;
}

const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({
  project,
  currentUser,
  allUsers,
  personas,
  documents,
  agreements,
  events,
  onUpdateProject,
  onClose,
  activeTypers,
  onTyping,
  onNotify
}) => {
  const [currentView, setCurrentView] = useState<ProjectViewType>(ProjectViewType.TASKS);

  const activePersona = personas.find(p => p.id === project.activePersonaId) || personas[0];
  const theme = project.theme || 'blue';
  
  // Handlers for updating sub-parts of the project
  const handleSetMessages = (action: React.SetStateAction<Message[]>) => {
      const newMessages = typeof action === 'function' ? action(project.chatHistory) : action;
      onUpdateProject({ ...project, chatHistory: newMessages });
  };

  const handleSetFiles = (action: React.SetStateAction<Document[]>) => {
      const newFiles = typeof action === 'function' ? action(project.files) : action;
      onUpdateProject({ ...project, files: newFiles });
  };

  const handleChangePersona = (id: string) => {
      onUpdateProject({ ...project, activePersonaId: id });
  };

  const handleAcceptAgreement = (title: string, content: string) => {
      // Just log for now or add to global agreements if needed
      console.log('Agreement accepted in project context', title);
  };

  const projectEvents = events.filter(e => e.projectId === project.id);

  return (
    <div className="flex h-full w-full bg-slate-50 overflow-hidden">
        {/* Main Workspace Area */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
            <div className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full bg-${theme}-500`}></span>
                    {project.name} <span className="text-slate-400 font-normal">/ {currentView.toLowerCase()}</span>
                </h2>
                <div className="flex -space-x-2">
                    {/* Show project members / assignees */}
                    {Array.from(new Set(project.tasks.map(t => t.assigneeId).filter(Boolean))).map(uid => {
                        const u = allUsers.find(user => user.id === uid);
                        if (!u) return null;
                        return <img key={u.id} src={u.avatar} className="w-8 h-8 rounded-full border-2 border-white" title={u.name} />;
                    })}
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                {currentView === ProjectViewType.CHAT && (
                    <ChatArea 
                        currentUser={currentUser}
                        messages={project.chatHistory}
                        setMessages={handleSetMessages}
                        allUsers={allUsers}
                        activePersona={activePersona}
                        activeDocs={project.files}
                        activeAgreements={agreements}
                        onAcceptAgreement={handleAcceptAgreement}
                        activeTypers={activeTypers}
                        onTyping={onTyping}
                        themeColor={theme}
                    />
                )}
                {currentView === ProjectViewType.TASKS && (
                    <div className="h-full p-6 bg-slate-50 overflow-hidden">
                        <TaskBoard 
                            project={project}
                            onUpdateProject={onUpdateProject}
                            users={allUsers}
                            themeColor={theme}
                            onNotify={onNotify}
                        />
                    </div>
                )}
                {currentView === ProjectViewType.FILES && (
                    <KnowledgeBase 
                        documents={project.files}
                        setDocuments={handleSetFiles}
                    />
                )}
                {currentView === ProjectViewType.CALENDAR && (
                     <div className="h-full">
                        <CalendarView events={projectEvents} />
                     </div>
                )}
            </div>
        </div>

        {/* Right Sidebar */}
        <ProjectSidebar 
            currentView={currentView}
            onViewChange={setCurrentView}
            onBack={onClose}
            activePersonaId={project.activePersonaId}
            personas={personas}
            onChangePersona={handleChangePersona}
            themeColor={theme}
        />
    </div>
  );
};

export default ProjectWorkspace;
