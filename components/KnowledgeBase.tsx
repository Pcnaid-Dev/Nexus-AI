import React, { useState } from 'react';
import { Document } from '../types';
import { FileText, Upload, Check, Trash2, Database, Search } from 'lucide-react';

interface KnowledgeBaseProps {
  documents: Document[];
  setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
}

const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ documents, setDocuments }) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleToggleActive = (id: string) => {
    setDocuments(docs => docs.map(d => d.id === id ? { ...d, isActive: !d.isActive } : d));
  };

  const handleDelete = (id: string) => {
    setDocuments(docs => docs.filter(d => d.id !== id));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      // Simulate reading file and adding to RAG
      setTimeout(() => {
        const newDoc: Document = {
          id: Date.now().toString(),
          name: file.name,
          content: "Simulated content from uploaded file. In a real app, this would be vector embeddings.",
          source: 'upload',
          isActive: true
        };
        setDocuments(prev => [...prev, newDoc]);
        setIsUploading(false);
      }, 1500);
    }
  };

  return (
    <div className="h-full p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-start mb-8">
            <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Database className="w-6 h-6 text-blue-600" />
                Knowledge Base (RAG)
            </h2>
            <p className="text-slate-500 mt-1">
                Upload documents to create context for Gemini. Active documents are automatically inserted into the chat context.
            </p>
            </div>
            <div className="flex space-x-2">
                <label className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer shadow-lg shadow-blue-200">
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? 'Processing...' : 'Upload File'}
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                </label>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
             <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 rounded-2xl shadow-lg">
                 <h3 className="text-3xl font-bold mb-2">{documents.filter(d => d.isActive).length}</h3>
                 <p className="text-indigo-100 font-medium">Active Context Sources</p>
             </div>
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                 <h3 className="text-3xl font-bold text-slate-800 mb-2">{documents.length}</h3>
                 <p className="text-slate-500 font-medium">Total Documents</p>
             </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center bg-slate-50">
                <Search className="w-5 h-5 text-slate-400 mr-3" />
                <input type="text" placeholder="Search documents..." className="bg-transparent border-none focus:ring-0 w-full text-slate-600" />
            </div>
            
            <div className="divide-y divide-slate-100">
                {documents.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>No documents uploaded yet.</p>
                    </div>
                ) : (
                    documents.map((doc) => (
                        <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                            <div className="flex items-center space-x-4">
                                <div className={`p-3 rounded-xl ${doc.source === 'gdrive' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-800">{doc.name}</h4>
                                    <div className="flex items-center text-xs text-slate-500 space-x-2">
                                        <span className="capitalize bg-slate-100 px-2 py-0.5 rounded text-slate-600">{doc.source}</span>
                                        <span>•</span>
                                        <span>2.4 MB</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                                <button 
                                    onClick={() => handleToggleActive(doc.id)}
                                    className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                                        ${doc.isActive 
                                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    {doc.isActive ? <Check className="w-4 h-4 mr-1.5" /> : null}
                                    {doc.isActive ? 'Active' : 'Include'}
                                </button>
                                <button 
                                    onClick={() => handleDelete(doc.id)}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;