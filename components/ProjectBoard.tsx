
import React, { useState } from 'react';
import { Project, User } from '../types';
import { Plus, Folder, Clock, CheckCircle2, MoreHorizontal } from 'lucide-react';

interface ProjectBoardProps {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  users: User[];
  onSelectProject: (projectId: string) => void;
}

const THEMES = [
    { id: 'blue', color: 'bg-blue-500' },
    { id: 'emerald', color: 'bg-emerald-500' },
    { id: 'violet', color: 'bg-violet-500' },
    { id: 'amber', color: 'bg-amber-500' },
    { id: 'rose', color: 'bg-rose-500' },
    { id: 'cyan', color: 'bg-cyan-500' },
    { id: 'indigo', color: 'bg-indigo-500' },
];

const ProjectBoard: React.FC<ProjectBoardProps> = ({ projects, setProjects, users, onSelectProject }) => {
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectTheme, setNewProjectTheme] = useState('blue');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    const newProject: Project = {
        id: Date.now().toString(),
        name: newProjectName,
        description: 'New project workspace',
        status: 'active',
        tasks: [],
        files: [],
        theme: newProjectTheme,
        chatHistory: [{
            id: 'init',
            userId: 'gemini',
            role: 'model',
            content: `Welcome to the ${newProjectName} workspace!`,
            timestamp: new Date()
        }],
        activePersonaId: 'agent-1'
    };
    setProjects(prev => [...prev, newProject]);
    setNewProjectName('');
    setNewProjectTheme('blue');
    setIsCreating(false);
  };

  return (
    <div className="h-full p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Project Dashboard</h2>
                    <p className="text-slate-500 mt-1">Select a project to open its dedicated workspace.</p>
                </div>
                <button 
                    onClick={() => setIsCreating(true)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    New Project
                </button>
            </div>

            {isCreating && (
                <div className="mb-8 p-6 bg-white rounded-2xl shadow-sm border border-blue-100 animate-in fade-in slide-in-from-top-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Project Name</label>
                    <div className="flex gap-4 mb-4">
                        <input 
                            autoFocus
                            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                            placeholder="e.g. Q4 Marketing Strategy"
                            value={newProjectName}
                            onChange={e => setNewProjectName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
                        />
                    </div>
                    
                    <label className="block text-sm font-medium text-slate-700 mb-2">Project Theme</label>
                    <div className="flex items-center gap-3 mb-6">
                        {THEMES.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setNewProjectTheme(t.id)}
                                className={`w-8 h-8 rounded-full ${t.color} transition-all ring-offset-2 ${newProjectTheme === t.id ? 'ring-2 ring-slate-400 scale-110' : 'hover:scale-110'}`}
                            />
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <button onClick={handleCreateProject} className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">Create Project</button>
                        <button onClick={() => setIsCreating(false)} className="px-6 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {projects.map((project) => {
                    const progress = project.tasks.length > 0 
                        ? Math.round((project.tasks.filter(t => t.status === 'done').length / project.tasks.length) * 100)
                        : 0;
                    
                    // Default to blue if theme is missing for legacy data
                    const theme = project.theme || 'blue';

                    return (
                        <div 
                            key={project.id} 
                            onClick={() => onSelectProject(project.id)}
                            className={`group bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-xl transition-all cursor-pointer relative overflow-hidden
                                hover:border-${theme}-200`}
                        >
                            <div className={`absolute top-0 left-0 w-1 h-full bg-${theme}-500 opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                            
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 bg-${theme}-50 text-${theme}-600 rounded-xl group-hover:bg-${theme}-600 group-hover:text-white transition-colors`}>
                                    <Folder className="w-6 h-6" />
                                </div>
                                <button className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50">
                                    <MoreHorizontal className="w-5 h-5" />
                                </button>
                            </div>

                            <h3 className={`text-lg font-bold text-slate-800 mb-2 group-hover:text-${theme}-600 transition-colors`}>{project.name}</h3>
                            <p className="text-sm text-slate-500 mb-6 line-clamp-2">{project.description}</p>

                            <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
                                <div className="flex items-center space-x-1">
                                    <Clock className="w-4 h-4" />
                                    <span>{project.tasks.filter(t => t.status !== 'done').length} Active Tasks</span>
                                </div>
                            </div>

                            <div className="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden">
                                <div className={`bg-${theme}-500 h-full rounded-full transition-all duration-500`} style={{ width: `${progress}%` }}></div>
                            </div>
                            <div className="flex justify-between text-xs text-slate-400 font-medium">
                                <span>Progress</span>
                                <span>{progress}%</span>
                            </div>
                        </div>
                    );
                })}
                
                <button 
                    onClick={() => setIsCreating(true)}
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl hover:border-blue-300 hover:bg-blue-50/50 transition-all group min-h-[240px]"
                >
                    <div className="p-4 bg-slate-50 rounded-full text-slate-400 group-hover:bg-white group-hover:text-blue-500 shadow-sm mb-4 transition-colors">
                        <Plus className="w-8 h-8" />
                    </div>
                    <span className="font-semibold text-slate-500 group-hover:text-blue-600">Create New Project</span>
                </button>
            </div>
        </div>
    </div>
  );
};

export default ProjectBoard;
