import React from 'react';
import { View } from '../types';
import { MessageSquare, Layout, Calendar, Book, Settings, Hexagon } from 'lucide-react';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const menuItems = [
    { view: View.CHAT, icon: MessageSquare, label: 'Team Chat' },
    { view: View.PROJECTS, icon: Layout, label: 'Projects' },
    { view: View.CALENDAR, icon: Calendar, label: 'Calendar' },
    { view: View.KNOWLEDGE, icon: Book, label: 'Knowledge Base' },
    { view: View.SETTINGS, icon: Settings, label: 'Agents & Settings' },
  ];

  return (
    <div className="w-64 bg-slate-900 text-slate-100 flex flex-col h-full border-r border-slate-800 shadow-xl z-20">
      <div className="p-6 flex items-center space-x-3 border-b border-slate-800">
        <Hexagon className="text-blue-500 w-8 h-8" />
        <h1 className="text-xl font-bold tracking-tight">Nexus AI</h1>
      </div>
      
      <nav className="flex-1 py-6 px-3 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => onViewChange(item.view)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group
                ${isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-xs text-slate-400 uppercase font-semibold mb-2">System Status</p>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-sm font-medium text-slate-200">Gemini Online</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;