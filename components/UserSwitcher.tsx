import React, { useState } from 'react';
import { User } from '../types';
import { ChevronDown, Settings, LogOut, User as UserIcon } from 'lucide-react';

interface UserSwitcherProps {
  currentUser: User;
  allUsers?: User[]; // Kept for compatibility but unused
  onSwitch?: (userId: string) => void; // Kept for compatibility but unused
}

const UserSwitcher: React.FC<UserSwitcherProps> = ({ currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div 
      className="relative z-50"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button 
        className="flex items-center space-x-3 px-3 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors border border-slate-700"
      >
        <div className="relative">
          <img src={currentUser.avatar} alt={currentUser.name} className="w-8 h-8 rounded-full border border-slate-500" />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-slate-800 rounded-full"></div>
        </div>
        <div className="text-left hidden md:block">
          <p className="text-xs text-slate-400 font-medium">Logged in as</p>
          <p className="text-sm font-semibold text-white">{currentUser.name}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-3 bg-slate-800 border-b border-slate-700">
               <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300">
                     <UserIcon className="w-6 h-6" />
                  </div>
                  <div>
                      <p className="text-sm font-bold text-white">{currentUser.name}</p>
                      <p className="text-xs text-slate-400">user@nexus.ai</p>
                  </div>
               </div>
            </div>
            
            <div className="p-2 space-y-1">
              <button className="w-full flex items-center space-x-3 px-3 py-2 text-slate-300 hover:bg-slate-800 rounded-lg transition-colors text-sm">
                 <UserIcon className="w-4 h-4" />
                 <span>My Profile</span>
              </button>
              <button className="w-full flex items-center space-x-3 px-3 py-2 text-slate-300 hover:bg-slate-800 rounded-lg transition-colors text-sm">
                 <Settings className="w-4 h-4" />
                 <span>Settings</span>
              </button>
            </div>

            <div className="p-2 border-t border-slate-800">
                <button 
                    onClick={() => console.log('Log out clicked')}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
                >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default UserSwitcher;