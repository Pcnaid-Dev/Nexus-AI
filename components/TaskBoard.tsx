
import React, { useState, useEffect, useRef } from 'react';
import { Project, Task, User, Subtask, Comment } from '../types';
import { Plus, MoreHorizontal, Clock, CheckCircle2, Circle, Filter, SortAsc, User as UserIcon, Calendar, X, GripVertical, Sparkles, AlignLeft, CheckSquare, MessageSquare, Send, Flag, AlertCircle, History, AtSign } from 'lucide-react';
import { generateTaskAnalysis } from '../services/geminiService';

interface TaskBoardProps {
  project: Project;
  onUpdateProject: (updatedProject: Project) => void;
  users: User[];
  themeColor?: string;
  onNotify?: (userId: string, text: string, type: 'mention' | 'assignment' | 'system') => void;
}

const TaskBoard: React.FC<TaskBoardProps> = ({ project, onUpdateProject, users, themeColor = 'blue', onNotify }) => {
  // Filter & Sort State
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'in-progress' | 'done'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'manual' | 'createdAt' | 'dueDate' | 'priority'>('manual');

  // New Task State
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>('');
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  
  // AI State
  const [isGenerating, setIsGenerating] = useState(false);

  // Drag and Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Feedback State
  const [showDoneFeedback, setShowDoneFeedback] = useState(false);

  // Modal State
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const selectedTask = project.tasks.find(t => t.id === selectedTaskId);

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      status: 'todo',
      priority: newTaskPriority,
      assigneeId: newTaskAssignee || undefined,
      dueDate: newTaskDueDate ? new Date(newTaskDueDate) : undefined,
      createdAt: new Date(),
      subtasks: [],
      comments: [],
      assigneeHistory: newTaskAssignee ? [{ userId: newTaskAssignee, assignedAt: new Date() }] : []
    };

    onUpdateProject({
        ...project,
        tasks: [...project.tasks, newTask]
    });

    if (newTaskAssignee && onNotify) {
        onNotify(newTaskAssignee, `You were assigned to: ${newTaskTitle}`, 'assignment');
    }

    setIsAddingTask(false);
    setNewTaskTitle('');
    setNewTaskAssignee('');
    setNewTaskDueDate('');
    setNewTaskPriority('medium');
  };

  const handleAiSuggest = async () => {
      setIsGenerating(true);
      const suggestionsJson = await generateTaskAnalysis(project.description);
      try {
          const suggestions = JSON.parse(suggestionsJson);
          if (Array.isArray(suggestions)) {
              const newTasks: Task[] = suggestions.map((s: any, idx: number) => ({
                  id: Date.now().toString() + idx,
                  title: s.title || s.task || "New Task",
                  status: 'todo',
                  priority: 'medium',
                  createdAt: new Date(),
                  subtasks: [],
                  comments: []
              }));
              
              onUpdateProject({
                  ...project,
                  tasks: [...project.tasks, ...newTasks]
              });
          }
      } catch (e) {
          console.error("Failed to parse AI suggestions", e);
      } finally {
          setIsGenerating(false);
      }
  };

  const handleUpdateTaskAssignee = (taskId: string, assigneeId: string) => {
    onUpdateProject({
        ...project,
        tasks: project.tasks.map(t => {
            if (t.id === taskId) {
                 const newAssigneeId = assigneeId === 'unassigned' ? undefined : assigneeId;
                 const history = t.assigneeHistory || [];
                 // Add history record if assigned changed
                 if (newAssigneeId && newAssigneeId !== t.assigneeId) {
                     history.push({ userId: newAssigneeId, assignedAt: new Date() });
                     if (onNotify && newAssigneeId) onNotify(newAssigneeId, `You were assigned to: ${t.title}`, 'assignment');
                 }
                 return { ...t, assigneeId: newAssigneeId, assigneeHistory: history };
            }
            return t;
        })
    });
  };

  const handleTaskUpdate = (updatedTask: Task) => {
      onUpdateProject({
          ...project,
          tasks: project.tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
      });
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (
    e: React.DragEvent, 
    targetStatus: Task['status'],
    targetTaskId?: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedTaskId) return;

    const taskToMove = project.tasks.find(t => t.id === draggedTaskId);
    if (!taskToMove) return;

    let newTasks = project.tasks.filter(t => t.id !== draggedTaskId);
    const updatedTask = { ...taskToMove, status: targetStatus };

    if (targetStatus === 'done' && taskToMove.status !== 'done') {
        setShowDoneFeedback(true);
        setTimeout(() => setShowDoneFeedback(false), 3000);
    }

    if (targetTaskId) {
        // Drop before target
        const targetIndex = newTasks.findIndex(t => t.id === targetTaskId);
        if (targetIndex !== -1) {
            newTasks.splice(targetIndex, 0, updatedTask);
        } else {
            newTasks.push(updatedTask);
        }
    } else {
        // Drop in column
        newTasks.push(updatedTask);
    }

    onUpdateProject({ ...project, tasks: newTasks });
    setDraggedTaskId(null);
  };

  const getFilteredTasks = (tasks: Task[]) => {
    let filtered = [...tasks];
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }
    
    if (assigneeFilter !== 'all') {
      if (assigneeFilter === 'unassigned') {
        filtered = filtered.filter(t => !t.assigneeId);
      } else {
        filtered = filtered.filter(t => t.assigneeId === assigneeFilter);
      }
    }
    
    if (sortBy === 'manual') {
        return filtered; 
    }

    filtered.sort((a, b) => {
      if (sortBy === 'dueDate') {
        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return dateA - dateB;
      } else if (sortBy === 'priority') {
          const pMap = { high: 3, medium: 2, low: 1 };
          return pMap[b.priority] - pMap[a.priority];
      } else {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      }
    });
    
    return filtered;
  };

  const renderTaskColumn = (status: Task['status'], displayLabel: string, icon: any, accentColor: string) => {
    const tasks = getFilteredTasks(project.tasks).filter(t => t.status === status);
    
    if (statusFilter !== 'all' && statusFilter !== status) return null;

    return (
      <div 
        className="flex-1 min-w-[280px] bg-slate-100/50 rounded-xl p-3 flex flex-col gap-3 border border-slate-200"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, status)}
      >
        <div className="flex items-center space-x-2 px-2 py-1 mb-1">
           {icon}
           <span className="text-sm font-bold text-slate-600">{displayLabel}</span>
           <span className="text-xs bg-white text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full font-medium">{tasks.length}</span>
        </div>

        <div className="flex flex-col gap-3 min-h-[100px]">
          {tasks.map(task => {
             const assignee = users.find(u => u.id === task.assigneeId);
             const subtaskCount = task.subtasks?.length || 0;
             const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0;
             const commentCount = task.comments?.length || 0;
             
             let priorityColor = 'bg-slate-100 text-slate-600';
             if (task.priority === 'high') priorityColor = 'bg-red-100 text-red-600';
             if (task.priority === 'medium') priorityColor = 'bg-amber-100 text-amber-600';
             if (task.priority === 'low') priorityColor = 'bg-blue-100 text-blue-600';

             return (
               <div 
                 key={task.id}
                 draggable
                 onDragStart={(e) => handleDragStart(e, task.id)}
                 onDragOver={handleDragOver}
                 onDrop={(e) => handleDrop(e, status, task.id)}
                 onClick={(e) => {
                    // Prevent opening modal if clicking dropdown items
                    if ((e.target as HTMLElement).closest('button')) return;
                    setSelectedTaskId(task.id);
                 }}
                 className={`bg-white p-4 rounded-xl border shadow-sm cursor-pointer transition-all group relative
                    ${draggedTaskId === task.id ? `opacity-50 border-${themeColor}-400 border-dashed` : `border-slate-200 hover:shadow-md hover:border-${themeColor}-300`}
                 `}
               >
                 <div className="flex items-start justify-between gap-2 pointer-events-none">
                    <span className="text-sm font-medium text-slate-800 leading-snug">{task.title}</span>
                    <GripVertical className="w-4 h-4 text-slate-300 shrink-0 opacity-0 group-hover:opacity-100" />
                 </div>
                 
                 <div className="flex flex-wrap items-center gap-2 mt-2">
                     <span className={`text-[10px] px-2 py-0.5 rounded font-semibold capitalize ${priorityColor}`}>
                         {task.priority}
                     </span>
                 </div>
                 
                 <div className="flex items-center gap-3 mt-3 text-slate-400">
                    {task.description && <AlignLeft className="w-3.5 h-3.5" />}
                    {subtaskCount > 0 && (
                        <div className="flex items-center gap-1 text-xs">
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span>{completedSubtasks}/{subtaskCount}</span>
                        </div>
                    )}
                    {commentCount > 0 && (
                        <div className="flex items-center gap-1 text-xs">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>{commentCount}</span>
                        </div>
                    )}
                 </div>

                 <div className="flex items-center justify-between mt-3">
                    <div className="relative group/assignee z-10" onClick={e => e.stopPropagation()}>
                        {assignee ? (
                            <img 
                                src={assignee.avatar} 
                                alt={assignee.name} 
                                className="w-6 h-6 rounded-full border border-white shadow-sm cursor-pointer"
                                title={assignee.name}
                            />
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-100">
                                <UserIcon className="w-3 h-3" />
                            </div>
                        )}
                         <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 shadow-xl rounded-lg p-1 hidden group-hover/assignee:block z-20">
                            <button 
                                onClick={() => handleUpdateTaskAssignee(task.id, 'unassigned')}
                                className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 rounded"
                            >
                                Unassigned
                            </button>
                            {users.map(u => (
                                <button 
                                    key={u.id}
                                    onClick={() => handleUpdateTaskAssignee(task.id, u.id)}
                                    className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 rounded flex items-center gap-2"
                                >
                                    <img src={u.avatar} className="w-5 h-5 rounded-full" />
                                    <span className="truncate">{u.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {task.dueDate && (
                        <div className={`text-[10px] px-2 py-1 rounded-md border flex items-center pointer-events-none
                            ${new Date(task.dueDate) < new Date() && task.status !== 'done'
                                ? 'bg-red-50 text-red-600 border-red-100' 
                                : 'bg-slate-50 text-slate-500 border-slate-100'}`
                        }>
                            <Calendar className="w-3 h-3 mr-1.5" />
                            {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                    )}
                 </div>
               </div>
             )
          })}
          {tasks.length === 0 && (
            <div className={`flex-1 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-xs font-medium hover:border-${themeColor}-300 hover:bg-${themeColor}-50/50 transition-colors`}>
                Drag tasks here
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
      {/* Done Feedback Toast */}
      {showDoneFeedback && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-full shadow-xl flex items-center animate-in slide-in-from-bottom-5 fade-in z-50">
              <CheckCircle2 className="w-5 h-5 mr-2" />
              <span className="font-bold">Task Completed! Great job!</span>
          </div>
      )}

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-sm bg-transparent border-none focus:ring-0 text-slate-600 font-medium"
            >
                <option value="all">All Statuses</option>
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
            </select>
        </div>

        <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <UserIcon className="w-4 h-4 text-slate-400" />
            <select 
                value={assigneeFilter} 
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="text-sm bg-transparent border-none focus:ring-0 text-slate-600 font-medium"
            >
                <option value="all">All Assignees</option>
                <option value="unassigned">Unassigned</option>
                {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                ))}
            </select>
        </div>

        <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <SortAsc className="w-4 h-4 text-slate-400" />
            <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-sm bg-transparent border-none focus:ring-0 text-slate-600 font-medium"
            >
                <option value="manual">Manual Sort</option>
                <option value="priority">Highest Priority</option>
                <option value="createdAt">Newest First</option>
                <option value="dueDate">Due Date</option>
            </select>
        </div>
        
        <div className="ml-auto flex items-center gap-2">
             <button 
                onClick={handleAiSuggest}
                disabled={isGenerating}
                className={`flex items-center px-4 py-2 text-${themeColor}-600 bg-${themeColor}-50 rounded-lg hover:bg-${themeColor}-100 transition-colors border border-${themeColor}-200 text-sm font-medium ${isGenerating ? 'opacity-70' : ''}`}
            >
                <Sparkles className="w-4 h-4 mr-2" />
                {isGenerating ? 'Analyzing...' : 'AI Suggest'}
            </button>
             <button 
                onClick={() => setIsAddingTask(true)}
                className={`flex items-center px-4 py-2 bg-${themeColor}-600 text-white rounded-lg hover:bg-${themeColor}-700 transition-colors shadow-sm text-sm font-medium`}
             >
                <Plus className="w-4 h-4 mr-2" />
                Add Task
            </button>
        </div>
      </div>

      {/* Add Task Form */}
      {isAddingTask && (
        <div className={`mb-6 bg-slate-50 p-4 rounded-xl border border-${themeColor}-200 animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-4`}>
            <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Task Title</label>
                <input 
                    autoFocus
                    type="text" 
                    placeholder="What needs to be done?" 
                    className={`w-full text-base bg-white border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-${themeColor}-100 outline-none`}
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Priority</label>
                    <select 
                        className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none"
                        value={newTaskPriority}
                        onChange={e => setNewTaskPriority(e.target.value as any)}
                    >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Assign To</label>
                    <select 
                        className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none"
                        value={newTaskAssignee}
                        onChange={e => setNewTaskAssignee(e.target.value)}
                    >
                        <option value="">Unassigned</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Due Date</label>
                    <input 
                        type="date"
                        className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none text-slate-500"
                        value={newTaskDueDate}
                        onChange={e => setNewTaskDueDate(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <button 
                    onClick={() => setIsAddingTask(false)}
                    className="px-4 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg text-sm font-medium"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleAddTask}
                    className={`px-6 py-2 bg-${themeColor}-600 text-white text-sm font-bold rounded-lg hover:bg-${themeColor}-700 shadow-sm`}
                >
                    Create Task
                </button>
            </div>
        </div>
      )}

      {/* Board Columns */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex flex-row gap-6 h-full min-w-[800px]">
            {renderTaskColumn('todo', 'To Do', <Circle className="w-4 h-4 text-slate-400" />, themeColor)}
            {renderTaskColumn('in-progress', 'In Progress', <Clock className={`w-4 h-4 text-${themeColor}-500`} />, themeColor)}
            {renderTaskColumn('done', 'Completed', <CheckCircle2 className="w-4 h-4 text-emerald-500" />, themeColor)}
        </div>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailsModal 
            task={selectedTask} 
            users={users} 
            isOpen={!!selectedTask} 
            onClose={() => setSelectedTaskId(null)} 
            onUpdate={handleTaskUpdate}
            themeColor={themeColor}
            onNotify={onNotify}
        />
      )}
    </div>
  );
};

// --- Task Details Modal Component ---

const TaskDetailsModal = ({ 
    task, 
    users, 
    isOpen, 
    onClose, 
    onUpdate, 
    themeColor = 'blue',
    onNotify
}: { 
    task: Task, 
    users: User[], 
    isOpen: boolean, 
    onClose: () => void, 
    onUpdate: (task: Task) => void, 
    themeColor?: string,
    onNotify?: (userId: string, text: string, type: 'mention' | 'assignment' | 'system') => void
}) => {
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || '');
    const [subtaskInput, setSubtaskInput] = useState('');
    const [commentInput, setCommentInput] = useState('');
    
    // Mention State
    const [showMentions, setShowMentions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const commentInputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setTitle(task.title);
        setDescription(task.description || '');
    }, [task]);

    if (!isOpen) return null;

    const handleSaveTitle = () => {
        if(title !== task.title) onUpdate({ ...task, title });
    };

    const handleSaveDescription = () => {
        if(description !== task.description) onUpdate({ ...task, description });
    };

    const toggleSubtask = (id: string) => {
        const subtasks = task.subtasks?.map(s => s.id === id ? { ...s, completed: !s.completed } : s) || [];
        onUpdate({ ...task, subtasks });
    };

    const addSubtask = () => {
        if (!subtaskInput.trim()) return;
        const newSubtask: Subtask = { id: Date.now().toString(), title: subtaskInput, completed: false };
        onUpdate({ ...task, subtasks: [...(task.subtasks || []), newSubtask] });
        setSubtaskInput('');
    };

    const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setCommentInput(val);
        
        // Simple mention detection
        const cursor = e.target.selectionStart;
        const textBeforeCursor = val.slice(0, cursor);
        const lastAt = textBeforeCursor.lastIndexOf('@');
        
        if (lastAt !== -1) {
            const query = textBeforeCursor.slice(lastAt + 1);
            // If there's a space after @, we assume user is done typing name or it's not a mention
            if (!query.includes(' ')) {
                setMentionQuery(query);
                setShowMentions(true);
                return;
            }
        }
        setShowMentions(false);
    };

    const insertMention = (user: User) => {
        const cursor = commentInputRef.current?.selectionStart || 0;
        const textBeforeCursor = commentInput.slice(0, cursor);
        const lastAt = textBeforeCursor.lastIndexOf('@');
        const textAfterCursor = commentInput.slice(cursor);
        
        const newText = commentInput.slice(0, lastAt) + `@${user.name} ` + textAfterCursor;
        setCommentInput(newText);
        setShowMentions(false);
        commentInputRef.current?.focus();
    };

    const addComment = () => {
        if (!commentInput.trim()) return;
        // Assuming current user is user-1 for mock purposes
        const newComment: Comment = { id: Date.now().toString(), userId: 'user-1', content: commentInput, createdAt: new Date() };
        onUpdate({ ...task, comments: [...(task.comments || []), newComment] });
        
        // Handle Mentions Notification
        if (onNotify) {
            users.forEach(u => {
                // Check for @User Name
                if (commentInput.includes(`@${u.name}`)) {
                    onNotify(u.id, `You were mentioned in a comment on: ${task.title}`, 'mention');
                }
            });
        }

        setCommentInput('');
    };

    const filteredUsers = users.filter(u => u.name.toLowerCase().includes(mentionQuery.toLowerCase()));

    const assignee = users.find(u => u.id === task.assigneeId);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
                    <div className="flex-1 mr-8">
                        <input 
                            className="w-full text-2xl font-bold bg-transparent border-none focus:ring-0 p-0 text-slate-800 placeholder-slate-400"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            onBlur={handleSaveTitle}
                        />
                        <div className="flex items-center gap-4 mt-2">
                             <div className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider border
                                ${task.status === 'todo' ? 'bg-slate-100 text-slate-500 border-slate-200' : 
                                  task.status === 'in-progress' ? `bg-${themeColor}-100 text-${themeColor}-600 border-${themeColor}-200` : 
                                  'bg-emerald-100 text-emerald-600 border-emerald-200'}`}
                             >
                                 {task.status.replace('-', ' ')}
                             </div>
                             <span className="text-xs text-slate-400">Created {new Date(task.createdAt || Date.now()).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Main Content */}
                    <div className="flex-1 p-8 overflow-y-auto space-y-8">
                        {/* Description */}
                        <div>
                            <h4 className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
                                <AlignLeft className="w-4 h-4" /> Description
                            </h4>
                            <textarea 
                                className="w-full min-h-[120px] p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none text-slate-600 leading-relaxed resize-none"
                                placeholder="Add a more detailed description..."
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                onBlur={handleSaveDescription}
                            />
                        </div>

                        {/* Subtasks */}
                        <div>
                             <h4 className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
                                <CheckSquare className="w-4 h-4" /> Subtasks
                            </h4>
                            <div className="space-y-2 mb-3">
                                {task.subtasks?.map(st => (
                                    <div key={st.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg group">
                                        <button 
                                            onClick={() => toggleSubtask(st.id)}
                                            className={`w-5 h-5 rounded border flex items-center justify-center transition-colors
                                                ${st.completed ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300 hover:border-blue-400'}`}
                                        >
                                            {st.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                                        </button>
                                        <span className={`flex-1 text-sm ${st.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{st.title}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <Plus className="w-4 h-4 text-slate-400" />
                                <input 
                                    className="flex-1 bg-transparent border-none text-sm focus:ring-0 placeholder-slate-400"
                                    placeholder="Add a subtask..."
                                    value={subtaskInput}
                                    onChange={e => setSubtaskInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addSubtask()}
                                />
                            </div>
                        </div>

                        {/* Comments / Activity */}
                        <div>
                             <h4 className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
                                <MessageSquare className="w-4 h-4" /> Comments
                            </h4>
                            <div className="space-y-6 mb-6">
                                {task.comments?.map(comment => {
                                    const author = users.find(u => u.id === comment.userId);
                                    // Simple regex to highlight mentions
                                    const contentParts = comment.content.split(/(@\w+(?: \w+)?)/g);
                                    
                                    return (
                                        <div key={comment.id} className="flex gap-3">
                                            <img src={author?.avatar} className="w-8 h-8 rounded-full mt-1" />
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-semibold text-sm text-slate-800">{author?.name || 'Unknown'}</span>
                                                    <span className="text-xs text-slate-400">{new Date(comment.createdAt).toLocaleString()}</span>
                                                </div>
                                                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg rounded-tl-none inline-block">
                                                    {contentParts.map((part, i) => 
                                                        part.startsWith('@') ? <span key={i} className="text-blue-600 font-semibold">{part}</span> : part
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="flex gap-3 items-start relative">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs border border-blue-200">
                                    ME
                                </div>
                                <div className="flex-1 relative">
                                    <textarea 
                                        ref={commentInputRef}
                                        className="w-full p-3 pr-10 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 outline-none text-sm resize-none"
                                        placeholder="Write a comment... use @ to mention"
                                        rows={2}
                                        value={commentInput}
                                        onChange={handleCommentChange}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                addComment();
                                            }
                                        }}
                                    />
                                    {/* Mention Autocomplete */}
                                    {showMentions && filteredUsers.length > 0 && (
                                        <div className="absolute bottom-full left-0 mb-2 w-64 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
                                            <div className="p-2 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase">
                                                Mention...
                                            </div>
                                            {filteredUsers.map(u => (
                                                <button
                                                    key={u.id}
                                                    onClick={() => insertMention(u)}
                                                    className="w-full flex items-center space-x-2 p-2 hover:bg-blue-50 transition-colors text-left"
                                                >
                                                    <img src={u.avatar} className="w-6 h-6 rounded-full" />
                                                    <span className="text-sm font-medium text-slate-700">{u.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <button 
                                        onClick={addComment}
                                        disabled={!commentInput.trim()}
                                        className="absolute bottom-3 right-3 text-blue-600 hover:text-blue-700 disabled:opacity-50"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Meta */}
                    <div className="w-72 bg-slate-50 border-l border-slate-200 p-6 space-y-6 overflow-y-auto">
                         <div>
                             <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Status</label>
                             <select 
                                value={task.status}
                                onChange={(e) => onUpdate({ ...task, status: e.target.value as any })}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                             >
                                 <option value="todo">To Do</option>
                                 <option value="in-progress">In Progress</option>
                                 <option value="done">Done</option>
                             </select>
                         </div>

                         <div>
                             <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Priority</label>
                             <select 
                                value={task.priority || 'medium'}
                                onChange={(e) => onUpdate({ ...task, priority: e.target.value as any })}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 capitalize"
                             >
                                 <option value="low">Low</option>
                                 <option value="medium">Medium</option>
                                 <option value="high">High</option>
                             </select>
                         </div>

                         <div>
                             <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Assignee</label>
                             <div className="flex items-center gap-2 mb-2">
                                 {assignee ? (
                                     <>
                                        <img src={assignee.avatar} className="w-6 h-6 rounded-full" />
                                        <span className="text-sm font-medium text-slate-700">{assignee.name}</span>
                                     </>
                                 ) : (
                                     <span className="text-sm text-slate-400 italic">Unassigned</span>
                                 )}
                             </div>
                             <select 
                                value={task.assigneeId || ''}
                                onChange={(e) => {
                                    const newId = e.target.value;
                                    const history = task.assigneeHistory || [];
                                    if (newId && newId !== task.assigneeId) {
                                        history.push({ userId: newId, assignedAt: new Date() });
                                        if (onNotify && newId) onNotify(newId, `You were assigned to: ${task.title}`, 'assignment');
                                    }
                                    onUpdate({ ...task, assigneeId: newId || undefined, assigneeHistory: history });
                                }}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                             >
                                 <option value="">No Assignee</option>
                                 {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                             </select>
                         </div>

                         <div>
                             <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Due Date</label>
                             <input 
                                type="date"
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 text-slate-600"
                                value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                                onChange={(e) => onUpdate({ ...task, dueDate: e.target.value ? new Date(e.target.value) : undefined })}
                             />
                         </div>
                         
                         {/* Assignee History Visualization */}
                         {task.assigneeHistory && task.assigneeHistory.length > 0 && (
                             <div className="bg-white p-3 rounded-lg border border-slate-200">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block flex items-center">
                                    <History className="w-3 h-3 mr-1" />
                                    Assignment History
                                </label>
                                <div className="space-y-3 relative pl-2 border-l-2 border-slate-100 ml-1">
                                    {task.assigneeHistory.map((h, i) => {
                                        const u = users.find(user => user.id === h.userId);
                                        return (
                                            <div key={i} className="text-xs text-slate-500 relative pl-3">
                                                <div className="absolute -left-[13px] top-1.5 w-2 h-2 rounded-full bg-white border-2 border-slate-300"></div>
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <img src={u?.avatar} className="w-4 h-4 rounded-full" />
                                                    <span className="font-semibold text-slate-700">{u?.name}</span>
                                                </div>
                                                <span className="text-[10px] opacity-75">{new Date(h.assignedAt).toLocaleString()}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                             </div>
                         )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskBoard;
