
import React, { useState } from 'react';
import { Agreement, User } from '../types';
import { FileSignature, Plus, Search, FileText, CheckCircle2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AgreementsPageProps {
  agreements: Agreement[];
  setAgreements: React.Dispatch<React.SetStateAction<Agreement[]>>;
  users: User[];
}

const AgreementsPage: React.FC<AgreementsPageProps> = ({ agreements, setAgreements, users }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  const handleCreate = () => {
    if (!newTitle.trim() || !newContent.trim()) return;

    const newAgreement: Agreement = {
      id: Date.now().toString(),
      title: newTitle,
      content: newContent,
      status: 'active',
      createdAt: new Date(),
      signatories: [] 
    };

    setAgreements(prev => [...prev, newAgreement]);
    setNewTitle('');
    setNewContent('');
    setIsModalOpen(false);
  };

  const activeAgreements = agreements.filter(a => a.status === 'active');
  const archivedAgreements = agreements.filter(a => a.status === 'archived');

  return (
    <div className="h-full p-8 overflow-y-auto relative">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-start mb-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <FileSignature className="w-6 h-6 text-purple-600" />
                    Family & Household Agreements
                </h2>
                <p className="text-slate-500 mt-1">
                    Formalized understandings and contracts for the team/family.
                </p>
            </div>
            <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200"
            >
                <Plus className="w-4 h-4 mr-2" />
                Create Agreement
            </button>
        </div>

        {/* Create Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-lg text-slate-800">New Agreement</h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                            <input 
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-200 outline-none"
                                placeholder="e.g., Weekend Chore Schedule"
                                value={newTitle}
                                onChange={e => setNewTitle(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Terms & Details</label>
                            <textarea 
                                className="w-full h-64 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-200 outline-none resize-none"
                                placeholder="Type the agreement details here..."
                                value={newContent}
                                onChange={e => setNewContent(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                        <button 
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleCreate}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
                        >
                            Save Agreement
                        </button>
                    </div>
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeAgreements.length === 0 && (
                <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
                    <FileSignature className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No active agreements yet. Start a chat or create one manually.</p>
                </div>
            )}
            {activeAgreements.map(agreement => (
                <div key={agreement.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-5 border-b border-slate-50 bg-slate-50/50">
                        <h3 className="font-bold text-lg text-slate-800 mb-1">{agreement.title}</h3>
                        <div className="flex items-center text-xs text-slate-500 gap-2">
                            <span>Created {new Date(agreement.createdAt).toLocaleDateString()}</span>
                            {agreement.signatories.length > 0 && (
                                <span className="flex items-center text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    {agreement.signatories.length} Signed
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="p-5 prose prose-sm max-w-none text-slate-600 h-64 overflow-y-auto custom-scrollbar">
                         <ReactMarkdown>{agreement.content}</ReactMarkdown>
                    </div>
                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                         <div className="flex -space-x-2">
                            {agreement.signatories.map(sigId => {
                                const user = users.find(u => u.id === sigId);
                                if (!user) return null;
                                return (
                                    <img 
                                        key={sigId} 
                                        src={user.avatar} 
                                        alt={user.name} 
                                        title={`Signed by ${user.name}`}
                                        className="w-8 h-8 rounded-full border-2 border-white"
                                    />
                                )
                            })}
                         </div>
                         <button className="text-xs text-purple-600 font-medium hover:underline">
                             View Full Details
                         </button>
                    </div>
                </div>
            ))}
        </div>

        {archivedAgreements.length > 0 && (
            <div className="mt-12">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Archived</h3>
                <div className="space-y-2">
                    {archivedAgreements.map(agr => (
                        <div key={agr.id} className="p-4 bg-slate-100 rounded-lg flex justify-between items-center opacity-75">
                            <span className="font-medium text-slate-600">{agr.title}</span>
                            <span className="text-xs text-slate-400">Archived {new Date(agr.createdAt).toLocaleDateString()}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default AgreementsPage;
