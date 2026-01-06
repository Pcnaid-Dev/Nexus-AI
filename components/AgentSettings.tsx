import React, { useState } from 'react';
import { Persona } from '../types';
import { Bot, Edit2, Check, UserPlus } from 'lucide-react';

interface AgentSettingsProps {
  personas: Persona[];
  activePersonaId: string;
  setActivePersonaId: (id: string) => void;
  setPersonas: React.Dispatch<React.SetStateAction<Persona[]>>;
}

const AgentSettings: React.FC<AgentSettingsProps> = ({ 
  personas, 
  activePersonaId, 
  setActivePersonaId,
  setPersonas
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const handleSave = (id: string, updates: Partial<Persona>) => {
    setPersonas(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    setEditingId(null);
  };

  const handleCreate = () => {
    const newPersona: Persona = {
      id: Date.now().toString(),
      name: 'New Agent',
      description: 'A new custom agent.',
      systemInstruction: 'You are a helpful assistant.',
      tone: 'Neutral'
    };
    setPersonas(prev => [...prev, newPersona]);
    setEditingId(newPersona.id);
  };

  return (
    <div className="h-full p-8 overflow-y-auto">
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

                return (
                    <div 
                        key={persona.id} 
                        className={`bg-white rounded-2xl p-6 transition-all border
                            ${isActive ? 'border-purple-500 shadow-md ring-1 ring-purple-100' : 'border-slate-200 shadow-sm hover:shadow-md'}`}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-4">
                                <div className={`p-3 rounded-xl ${isActive ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>
                                    <Bot className="w-6 h-6" />
                                </div>
                                <div>
                                    {isEditing ? (
                                        <input 
                                            className="font-bold text-lg text-slate-800 border-b border-purple-300 focus:outline-none"
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
                                        className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                                    >
                                        Activate
                                    </button>
                                )}
                                {isActive && (
                                    <span className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-100 text-purple-700 flex items-center">
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
                            <div>
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