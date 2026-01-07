
import React from 'react';
import { ProjectViewType, Persona } from '../types';
import { ArrowLeft, MessageSquare, ListTodo, Calendar, Files, Settings, Bot } from 'lucide-react';

interface ProjectSidebarProps {
  currentView: ProjectViewType;
  onViewChange: (view: ProjectViewType) => void;
  onBack: () => void;
  activePersonaId: string;
  personas: Persona[];
  onChangePersona: (id: string) => void;
  themeColor?: string;
}

const ProjectSidebar: React.FC<ProjectSidebarProps> = ({ 
  currentView, 
  onViewChange, 
  onBack,
  activePersonaId,
  personas,
  onChangePersona,
  themeColor = 'blue'
}) => {
  
  const navItems = [
    { type: ProjectViewType.CHAT, icon: MessageSquare, label: 'Chat' },
    { type: ProjectViewType.TASKS, icon: ListTodo, label: 'Tasks' },
    { type: ProjectViewType.FILES, icon: Files, label: 'Files' },
    { type: ProjectViewType.CALENDAR, icon: Calendar, label: 'Calendar' },
  ];

  return (
    <div className="w-72 bg-white border-l border-slate-200 h-full flex flex-col shadow-xl z-30">
        <div className="p-4 border-b border-slate-100">
            <button 
                onClick={onBack}
                className={`flex items-center space-x-2 text-slate-500 hover:text-${themeColor}-600 font-medium transition-colors w-full p-2 rounded-lg hover:bg-slate-50`}
            >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dashboard</span>
            </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Project Tools</div>
            {navItems.map(item => (
                <button
                    key={item.type}
                    onClick={() => onViewChange(item.type)}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all
                        ${currentView === item.type 
                            ? `bg-${themeColor}-50 text-${themeColor}-700 font-semibold` 
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                >
                    <item.icon className={`w-5 h-5 ${currentView === item.type ? `text-${themeColor}-600` : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                </button>
            ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
            <div className="mb-3 flex items-center space-x-2 text-slate-800 font-semibold">
                <Bot className={`w-5 h-5 text-${themeColor}-600`} />
                <span>Project Persona</span>
            </div>
            <select 
                value={activePersonaId}
                onChange={(e) => onChangePersona(e.target.value)}
                className={`w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-${themeColor}-100`}
            >
                {personas.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                ))}
            </select>
            <p className="text-xs text-slate-400 mt-2">
                This persona guides the AI in the project chat.
            </p>
        </div>
    </div>
  );
};

export default ProjectSidebar;
