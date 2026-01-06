import React, { useState } from 'react';
import { CalendarEvent } from '../types';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Video, Clock } from 'lucide-react';

interface CalendarViewProps {
  events: CalendarEvent[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ events }) => {
  const [isConnected, setIsConnected] = useState(false);

  const handleConnect = () => {
    // Mock connection
    setIsConnected(true);
  };

  return (
    <div className="h-full p-8 flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Schedule</h2>
          <p className="text-slate-500">Sync with your team's Google Calendar.</p>
        </div>
        {!isConnected ? (
           <button 
             onClick={handleConnect}
             className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
           >
             <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" alt="GCal" className="w-5 h-5 mr-2" />
             Connect Google Calendar
           </button>
        ) : (
            <span className="flex items-center text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-sm font-medium border border-emerald-100">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
                Synced with Google Calendar
            </span>
        )}
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col lg:flex-row">
        {/* Sidebar for mini calendar and list */}
        <div className="w-full lg:w-80 border-r border-slate-100 p-6 bg-slate-50">
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-800">October 2023</h3>
                    <div className="flex space-x-1">
                        <button className="p-1 hover:bg-slate-200 rounded"><ChevronLeft className="w-4 h-4" /></button>
                        <button className="p-1 hover:bg-slate-200 rounded"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                </div>
                {/* Mock Mini Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                    {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-slate-400 font-medium py-1">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-sm">
                     {Array.from({length: 31}).map((_, i) => (
                         <button key={i} className={`p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all ${i === 14 ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600'}`}>
                             {i + 1}
                         </button>
                     ))}
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Upcoming Events</h4>
                {events.map(evt => (
                    <div key={evt.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-start space-x-3">
                         <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                             {evt.type === 'meeting' ? <Video className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                         </div>
                         <div>
                             <h5 className="font-semibold text-slate-800 text-sm">{evt.title}</h5>
                             <p className="text-xs text-slate-500">
                                 {evt.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {evt.end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                             </p>
                         </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Main Calendar Area */}
        <div className="flex-1 p-6 relative">
            <div className="grid grid-cols-1 gap-4">
                {/* Just a visual representation of a daily timeline */}
                {Array.from({length: 9}).map((_, i) => {
                    const hour = i + 9;
                    return (
                        <div key={hour} className="flex border-b border-slate-50 min-h-[80px]">
                            <div className="w-16 text-xs text-slate-400 text-right pr-4 pt-2">
                                {hour > 12 ? hour - 12 : hour} {hour >= 12 ? 'PM' : 'AM'}
                            </div>
                            <div className="flex-1 relative group">
                                <div className="absolute inset-0 group-hover:bg-slate-50 transition-colors"></div>
                                {/* Mock event placement */}
                                {hour === 10 && (
                                    <div className="absolute top-2 left-2 right-4 h-20 bg-blue-100 border border-blue-200 rounded-lg p-2 cursor-pointer hover:shadow-md transition-all">
                                        <p className="text-blue-800 font-semibold text-sm">Daily Standup</p>
                                        <div className="flex -space-x-1 mt-2">
                                            <div className="w-6 h-6 rounded-full bg-blue-300 border-2 border-white"></div>
                                            <div className="w-6 h-6 rounded-full bg-purple-300 border-2 border-white"></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;