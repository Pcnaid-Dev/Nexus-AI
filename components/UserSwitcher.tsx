import React from 'react';
import { User } from '../types';
import { Users, ChevronDown } from 'lucide-react';

interface UserSwitcherProps {
  currentUser: User;
  allUsers: User[];
  onSwitch: (userId: string) => void;
}

const UserSwitcher: React.FC<UserSwitcherProps> = ({ currentUser, allUsers, onSwitch }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="relative z-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
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
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
            <div className="p-3 bg-slate-800 border-b border-slate-700">
               <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center">
                 <Users className="w-3 h-3 mr-2" />
                 Switch User (Demo)
               </h4>
            </div>
            <div className="p-2 space-y-1">
              {allUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => {
                    onSwitch(user.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 p-2 rounded-lg transition-colors
                    ${user.id === currentUser.id ? 'bg-blue-600/20 text-blue-400' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  <img src={user.avatar} className="w-8 h-8 rounded-full" alt={user.name} />
                  <span className="text-sm font-medium">{user.name}</span>
                  {user.id === currentUser.id && <div className="ml-auto w-2 h-2 rounded-full bg-blue-500"></div>}
                </button>
              ))}
            </div>
            <div className="p-3 bg-slate-950 text-[10px] text-slate-500">
                This feature simulates multiple users in the same chat session.
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserSwitcher;