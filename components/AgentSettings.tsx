
import React, { useState } from 'react';
import { Persona } from '../types';
import { Bot, Edit2, Check, UserPlus, Palette } from 'lucide-react';

interface AgentSettingsProps {
  personas: Persona[];
  activePersonaId: string;
  setActivePersonaId: (id: string) => void;
  setPersonas: React.Dispatch<React.SetStateAction<Persona[]>>;
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

const AgentSettings: React.FC<AgentSettingsProps> = ({ 
  personas, 
  activePersonaId, 
  setActivePersonaId,
  setPersonas
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const handleSave = (id: string, updates: Partial<Persona>) => {
    setPersonas(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    if (Object.keys(updates).every(k => k !== 'theme')) {
        // If we are just blurring inputs, keep editing open if needed, but here we close on blur for simplicity in list
        // However, for the color picker, we don't want to close immediately.
        // Logic below handles "setEditingId(null)" only when clicking the edit button again.
    }
  };

  const handleCreate = () => {
    const newPersona: Persona = {
      id: Date.now().toString(),
      name: 'New Agent',
      description: 'A new custom agent.',
      systemInstruction: 'You are a helpful assistant.',
      tone: 'Neutral',
      theme: 'blue'
    };
    setPersonas(prev => [...prev, newPersona]);
    setEditingId(newPersona.id);
  };

  return (
    <div className="h-full p-8 overflow-y-auto" id="settings-area">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">AI Agents & Personas</h2>
                <p className="text-slate-500">Create and manage custom AI personalities for different tasks.</p>
            </div>
            <button 
                onClick={handleCreate}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200"
            >
                <UserPlus className="w-4 h-4 mr-2" />
                Create Persona
            </button>
        </div>

        <div className="grid gap-6">
            {personas.map(persona => {
                const isActive = persona.id === activePersonaId;
                const isEditing = editingId === persona.id;
                const themeColor = persona.theme || 'blue';

                return (
                    <div 
                        key={persona.id} 
                        className={`bg-white rounded-2xl p-6 transition-all border
                            ${isActive ? `border-${themeColor}-500 shadow-md ring-1 ring-${themeColor}-100` : 'border-slate-200 shadow-sm hover:shadow-md'}`}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-4">
                                <div className={`p-3 rounded-xl ${isActive ? `bg-${themeColor}-100 text-${themeColor}-600` : 'bg-slate-100 text-slate-500'}`}>
                                    <Bot className="w-6 h-6" />
                                </div>
                                <div>
                                    {isEditing ? (
                                        <input 
                                            className={`font-bold text-lg text-slate-800 border-b border-${themeColor}-300 focus:outline-none`}
                                            defaultValue={persona.name}
                                            onBlur={(e) => handleSave(persona.id, { name: e.target.value })}
                                        />
                                    ) : (
                                        <h3 className="font-bold text-lg text-slate-800">{persona.name}</h3>
                                    )}
                                    <p className="text-sm text-slate-500">{persona.description}</p>
                                </div>
                            </div>
                            <div className="flex space-x-2">
                                {!isActive && (
                                    <button 
                                        onClick={() => setActivePersonaId(persona.id)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-${themeColor}-50 hover:text-${themeColor}-600 transition-colors`}
                                    >
                                        Activate
                                    </button>
                                )}
                                {isActive && (
                                    <span className={`px-4 py-2 rounded-lg text-sm font-medium bg-${themeColor}-100 text-${themeColor}-700 flex items-center`}>
                                        <Check className="w-4 h-4 mr-2" />
                                        Active
                                    </span>
                                )}
                                <button 
                                    onClick={() => setEditingId(isEditing ? null : persona.id)}
                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">System Instruction</label>
                                {isEditing ? (
                                    <textarea 
                                        className="w-full bg-white p-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-purple-200 outline-none"
                                        rows={3}
                                        defaultValue={persona.systemInstruction}
                                        onBlur={(e) => handleSave(persona.id, { systemInstruction: e.target.value })}
                                    />
                                ) : (
                                    <p className="text-sm text-slate-700 italic">"{persona.systemInstruction}"</p>
                                )}
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Tone</label>
                                    {isEditing ? (
                                        <input 
                                            className="w-full bg-white p-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-purple-200 outline-none"
                                            defaultValue={persona.tone}
                                            onBlur={(e) => handleSave(persona.id, { tone: e.target.value })}
                                        />
                                    ) : (
                                        <p className="text-sm text-slate-700">{persona.tone}</p>
                                    )}
                                </div>
                                {isEditing && (
                                    <div>
                                         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block flex items-center">
                                            <Palette className="w-3 h-3 mr-1" /> Theme
                                         </label>
                                         <div className="flex items-center gap-2">
                                            {THEMES.map(t => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => handleSave(persona.id, { theme: t.id })}
                                                    className={`w-6 h-6 rounded-full ${t.color} transition-all ring-offset-2 ${persona.theme === t.id ? 'ring-2 ring-slate-400 scale-110' : 'hover:scale-110'}`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
};

export default AgentSettings;
