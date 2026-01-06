
import React, { useState } from 'react';
import { Project, Task, User } from '../types';
import { Plus, MoreHorizontal, Clock, CheckCircle2, Circle, Filter, SortAsc, User as UserIcon, Calendar, X, GripVertical, Sparkles } from 'lucide-react';
import { generateTaskAnalysis } from '../services/geminiService';

interface ProjectBoardProps {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  users: User[];
}

const ProjectBoard: React.FC<ProjectBoardProps> = ({ projects, setProjects, users }) => {
  // Filter & Sort State
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'in-progress' | 'done'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'manual' | 'createdAt' | 'dueDate'>('manual');

  // New Task State
  const [addingTaskToProject, setAddingTaskToProject] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>('');
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>('');
  
  // AI State
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  // Drag and Drop State
  const [draggedTask, setDraggedTask] = useState<{ projectId: string, taskId: string } | null>(null);

  const handleAddTask = (projectId: string) => {
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      status: 'todo',
      assigneeId: newTaskAssignee || undefined,
      dueDate: newTaskDueDate ? new Date(newTaskDueDate) : undefined,
      createdAt: new Date()
    };

    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return { ...p, tasks: [...p.tasks, newTask] };
      }
      return p;
    }));

    setAddingTaskToProject(null);
    setNewTaskTitle('');
    setNewTaskAssignee('');
    setNewTaskDueDate('');
  };

  const handleAiSuggest = async (project: Project) => {
      setIsGenerating(project.id);
      const suggestionsJson = await generateTaskAnalysis(project.description);
      try {
          const suggestions = JSON.parse(suggestionsJson);
          if (Array.isArray(suggestions)) {
              const newTasks: Task[] = suggestions.map((s: any, idx: number) => ({
                  id: Date.now().toString() + idx,
                  title: s.title || s.task || "New Task",
                  status: 'todo',
                  createdAt: new Date()
              }));
              
              setProjects(prev => prev.map(p => {
                  if (p.id === project.id) {
                      return { ...p, tasks: [...p.tasks, ...newTasks] };
                  }
                  return p;
              }));
          }
      } catch (e) {
          console.error("Failed to parse AI suggestions", e);
      } finally {
          setIsGenerating(null);
      }
  };

  const handleUpdateTaskAssignee = (projectId: string, taskId: string, assigneeId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          tasks: p.tasks.map(t => t.id === taskId ? { ...t, assigneeId: assigneeId === 'unassigned' ? undefined : assigneeId } : t)
        };
      }
      return p;
    }));
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, projectId: string, taskId: string) => {
    setDraggedTask({ projectId, taskId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (
    e: React.DragEvent, 
    targetProjectId: string, 
    targetStatus: Task['status'],
    targetTaskId?: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedTask) return;

    const { projectId: sourceProjectId, taskId: sourceTaskId } = draggedTask;

    setProjects(prevProjects => {
      const sourceProject = prevProjects.find(p => p.id === sourceProjectId);
      const destProject = prevProjects.find(p => p.id === targetProjectId);
      
      if (!sourceProject || !destProject) return prevProjects;

      const taskToMove = sourceProject.tasks.find(t => t.id === sourceTaskId);
      if (!taskToMove) return prevProjects;

      // Remove from source list (careful if source == dest, we handle insertion next)
      let newSourceTasks = sourceProject.tasks.filter(t => t.id !== sourceTaskId);
      
      // Determine destination list
      // If moving within same project, start with the filtered list
      // If moving to different, start with the dest project's list
      let newDestTasks = sourceProjectId === targetProjectId 
        ? [...newSourceTasks] 
        : [...destProject.tasks];

      const updatedTask = { ...taskToMove, status: targetStatus };

      if (targetTaskId) {
        // Find index to insert before
        const targetIndex = newDestTasks.findIndex(t => t.id === targetTaskId);
        if (targetIndex !== -1) {
            newDestTasks.splice(targetIndex, 0, updatedTask);
        } else {
            newDestTasks.push(updatedTask);
        }
      } else {
        // Dropped on column, append to end
        newDestTasks.push(updatedTask);
      }

      return prevProjects.map(p => {
        if (p.id === sourceProjectId && p.id === targetProjectId) {
            return { ...p, tasks: newDestTasks };
        }
        if (p.id === sourceProjectId) {
            return { ...p, tasks: newSourceTasks };
        }
        if (p.id === targetProjectId) {
            return { ...p, tasks: newDestTasks };
        }
        return p;
      });
    });

    setDraggedTask(null);
  };

  const getFilteredTasks = (tasks: Task[]) => {
    let filtered = [...tasks];
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }
    if (assigneeFilter !== 'all') {
      filtered = filtered.filter(t => t.assigneeId === assigneeFilter);
    }
    
    if (sortBy === 'manual') {
        return filtered; // Return in array order
    }

    filtered.sort((a, b) => {
      if (sortBy === 'dueDate') {
        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return dateA - dateB;
      } else {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      }
    });
    
    return filtered;
  };

  const renderTaskColumn = (project: Project, status: Task['status'], displayLabel: string, icon: any) => {
    const tasks = getFilteredTasks(project.tasks).filter(t => t.status === status);
    
    if (statusFilter !== 'all' && statusFilter !== status) return null;

    return (
      <div 
        className="flex-1 min-w-[200px] bg-slate-50/50 rounded-xl p-2 flex flex-col gap-2 border border-transparent hover:border-blue-200 transition-colors"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, project.id, status)}
      >
        <div className="flex items-center space-x-2 px-2 py-1 mb-1">
           {icon}
           <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{displayLabel}</span>
           <span className="text-xs bg-slate-200 text-slate-600 px-1.5 rounded-full">{tasks.length}</span>
        </div>

        <div className="flex flex-col gap-2 min-h-[50px]">
          {tasks.map(task => {
             const assignee = users.find(u => u.id === task.assigneeId);
             return (
               <div 
                 key={task.id}
                 draggable
                 onDragStart={(e) => handleDragStart(e, project.id, task.id)}
                 onDragOver={handleDragOver}
                 onDrop={(e) => handleDrop(e, project.id, status, task.id)}
                 className={`bg-white p-3 rounded-lg border shadow-sm cursor-move transition-all group relative
                    ${draggedTask?.taskId === task.id ? 'opacity-50 border-blue-400 border-dashed' : 'border-slate-200 hover:shadow-md hover:border-blue-300'}
                 `}
               >
                 <div className="flex items-start justify-between gap-2 pointer-events-none">
                    <span className="text-sm font-medium text-slate-700 leading-tight">{task.title}</span>
                    <GripVertical className="w-4 h-4 text-slate-300 shrink-0 opacity-0 group-hover:opacity-100" />
                 </div>
                 
                 <div className="flex items-center justify-between mt-3">
                    {/* Assignee */}
                    <div className="relative group/assignee z-10">
                        {assignee ? (
                            <img 
                                src={assignee.avatar} 
                                alt={assignee.name} 
                                className="w-5 h-5 rounded-full border border-white shadow-sm cursor-pointer"
                                title={assignee.name}
                            />
                        ) : (
                            <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 cursor-pointer">
                                <UserIcon className="w-3 h-3" />
                            </div>
                        )}
                         {/* Quick Assignee Dropdown */}
                         <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-slate-200 shadow-xl rounded-lg p-1 hidden group-hover/assignee:block">
                            <button 
                                onClick={() => handleUpdateTaskAssignee(project.id, task.id, 'unassigned')}
                                className="w-full text-left px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 rounded"
                            >
                                Unassigned
                            </button>
                            {users.map(u => (
                                <button 
                                    key={u.id}
                                    onClick={() => handleUpdateTaskAssignee(project.id, task.id, u.id)}
                                    className="w-full text-left px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 rounded flex items-center gap-2"
                                >
                                    <img src={u.avatar} className="w-4 h-4 rounded-full" />
                                    <span className="truncate">{u.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Date */}
                    {task.dueDate && (
                        <div className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center pointer-events-none
                            ${new Date(task.dueDate) < new Date() && task.status !== 'done'
                                ? 'bg-red-50 text-red-600 border-red-100' 
                                : 'bg-slate-50 text-slate-500 border-slate-100'}`
                        }>
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                    )}
                 </div>
               </div>
             )
          })}
          {tasks.length === 0 && (
            <div className="h-full border-2 border-dashed border-slate-100 rounded-lg flex items-center justify-center py-4 text-slate-300 text-xs">
                Drop here
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50/50">
      {/* Controls Bar */}
      <div className="px-8 py-4 bg-white border-b border-slate-200 flex flex-wrap items-center gap-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Filters:</span>
        </div>
        
        <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-100 text-slate-600"
        >
            <option value="all">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
        </select>

        <select 
            value={assigneeFilter} 
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-100 text-slate-600"
        >
            <option value="all">All Assignees</option>
            {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
            ))}
        </select>

        <div className="w-px h-6 bg-slate-200 mx-2"></div>

        <div className="flex items-center space-x-2">
            <SortAsc className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Sort by:</span>
        </div>

        <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-100 text-slate-600"
        >
            <option value="manual">Manual (Drag & Drop)</option>
            <option value="createdAt">Created Date (Newest)</option>
            <option value="dueDate">Due Date (Earliest)</option>
        </select>
        
        <div className="ml-auto">
             <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium">
                <Plus className="w-4 h-4 mr-2" />
                New Project
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-20">
            {projects.map((project) => (
            <div key={project.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">{project.name}</h3>
                        <p className="text-sm text-slate-500 line-clamp-2">{project.description}</p>
                    </div>
                    <div className="flex space-x-2">
                        <button 
                            onClick={() => handleAiSuggest(project)}
                            disabled={isGenerating === project.id}
                            className={`p-2 rounded-lg text-slate-500 hover:bg-purple-50 hover:text-purple-600 border border-slate-200 hover:border-purple-200 transition-all
                                ${isGenerating === project.id ? 'animate-pulse bg-purple-50 text-purple-600' : ''}`}
                            title="AI Suggest Tasks"
                        >
                            <Sparkles className="w-4 h-4" />
                        </button>
                        <button className="p-1 hover:bg-slate-50 rounded-full text-slate-400">
                            <MoreHorizontal className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Task Columns */}
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    {renderTaskColumn(project, 'todo', 'To Do', <Circle className="w-4 h-4 text-slate-400" />)}
                    {renderTaskColumn(project, 'in-progress', 'In Progress', <Clock className="w-4 h-4 text-blue-500" />)}
                    {renderTaskColumn(project, 'done', 'Done', <CheckCircle2 className="w-4 h-4 text-emerald-500" />)}
                </div>

                {/* Add Task Area */}
                <div className="pt-4 border-t border-slate-100 mt-auto">
                    {addingTaskToProject === project.id ? (
                        <div className="bg-slate-50 p-3 rounded-xl border border-blue-200 animate-in fade-in zoom-in-95 duration-200">
                            <input 
                                autoFocus
                                type="text" 
                                placeholder="Task title..." 
                                className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 mb-2 focus:ring-2 focus:ring-blue-100 outline-none"
                                value={newTaskTitle}
                                onChange={e => setNewTaskTitle(e.target.value)}
                            />
                            <div className="flex gap-2 mb-2">
                                <select 
                                    className="text-xs w-1/2 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none"
                                    value={newTaskAssignee}
                                    onChange={e => setNewTaskAssignee(e.target.value)}
                                >
                                    <option value="">No Assignee</option>
                                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                                <input 
                                    type="date"
                                    className="text-xs w-1/2 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none text-slate-500"
                                    value={newTaskDueDate}
                                    onChange={e => setNewTaskDueDate(e.target.value)}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button 
                                    onClick={() => setAddingTaskToProject(null)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => handleAddTask(project.id)}
                                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"
                                >
                                    Add Task
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button 
                            onClick={() => {
                                setAddingTaskToProject(project.id);
                                setNewTaskTitle('');
                                setNewTaskAssignee('');
                                setNewTaskDueDate('');
                            }}
                            className="w-full py-2 flex items-center justify-center text-sm text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-dashed border-slate-300 hover:border-blue-300 rounded-xl transition-all"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Task
                        </button>
                    )}
                </div>
            </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default ProjectBoard;
