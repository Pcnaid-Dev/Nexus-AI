
import React, { useState, useRef, useEffect } from 'react';
import { Message, User, Persona, Attachment } from '../types';
import { Send, User as UserIcon, Bot, Paperclip, Smile, BrainCircuit, X, Image as ImageIcon, Video as VideoIcon, Mic, Volume2 } from 'lucide-react';
import { generateResponse, generateSpeech } from '../services/geminiService';
import LiveVoiceModal from './LiveVoiceModal';

interface ChatAreaProps {
  currentUser: User;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  allUsers: User[];
  activePersona: Persona;
  activeDocs: any[];
}

const ChatArea: React.FC<ChatAreaProps> = ({ 
  currentUser, 
  messages, 
  setMessages, 
  allUsers,
  activePersona,
  activeDocs
}) => {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, attachments]); // Scroll when attachments added too

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
           const base64String = reader.result as string;
           // Remove data URL prefix for API
           const base64Data = base64String.split(',')[1];
           
           let type: Attachment['type'] = 'file';
           if (file.type.startsWith('image/')) type = 'image';
           if (file.type.startsWith('video/')) type = 'video';
           if (file.type.startsWith('audio/')) type = 'audio';

           setAttachments(prev => [...prev, {
             id: Date.now().toString() + Math.random(),
             name: file.name,
             type: type,
             data: base64Data,
             mimeType: file.type,
             url: URL.createObjectURL(file) // For preview
           }]);
        };
        reader.readAsDataURL(file);
      });
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() && attachments.length === 0) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      userId: currentUser.id,
      content: inputText,
      timestamp: new Date(),
      role: 'user',
      attachments: attachments
    };

    const updatedHistory = [...messages, newMessage];
    setMessages(updatedHistory);
    
    // Clear Input State
    setInputText('');
    setAttachments([]);
    setIsTyping(true);

    try {
      const responseText = await generateResponse(
        updatedHistory, 
        currentUser, 
        activePersona, 
        activeDocs,
        allUsers,
        isThinkingMode
      );

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        userId: 'gemini',
        content: responseText,
        timestamp: new Date(),
        role: 'model',
        isThinking: isThinkingMode
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
      // Reset modes after send? Maybe keep it.
      // setIsThinkingMode(false); 
    }
  };

  const handleTTS = async (text: string, msgId: string) => {
      if (playingAudioId === msgId) {
          setPlayingAudioId(null);
          // In real app, we would stop audio context here.
          return;
      }

      setPlayingAudioId(msgId);
      const audioBase64 = await generateSpeech(text);
      if (audioBase64) {
          const audio = new Audio("data:audio/mp3;base64," + audioBase64);
          audio.onended = () => setPlayingAudioId(null);
          audio.play();
      } else {
          setPlayingAudioId(null);
      }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-tl-3xl shadow-inner overflow-hidden relative">
      <LiveVoiceModal 
        isOpen={isLiveModalOpen} 
        onClose={() => setIsLiveModalOpen(false)} 
        systemInstruction={activePersona.systemInstruction}
      />

      {/* Chat Header */}
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-600" />
              {activePersona.name}
            </h2>
            <p className="text-xs text-slate-500">Active Mode: {activePersona.tone}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
            <button 
                onClick={() => setIsLiveModalOpen(true)}
                className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full text-xs font-bold shadow-md hover:shadow-lg transition-all animate-pulse-slow"
            >
                <Mic className="w-3.5 h-3.5" />
                <span>Live Voice</span>
            </button>
            <div className="h-6 w-px bg-slate-200"></div>
            {activeDocs.length > 0 && (
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium border border-green-200">
                {activeDocs.length} Docs Active
                </span>
            )}
            <span className="text-xs text-slate-400">
                User: <span className="font-semibold text-slate-700">{currentUser.name}</span>
            </span>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
        {messages.map((msg) => {
          const isModel = msg.role === 'model';
          const sender = isModel 
            ? { id: 'gemini', name: activePersona.name, avatar: '', color: 'bg-purple-600' }
            : allUsers.find(u => u.id === msg.userId);

          return (
            <div 
              key={msg.id} 
              className={`flex space-x-3 ${!isModel && sender?.id === currentUser.id ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm overflow-hidden
                ${isModel ? 'bg-purple-100 border-2 border-purple-200' : 'bg-white border-2 border-white'}`}
              >
                {isModel ? (
                  <Bot className="w-6 h-6 text-purple-600" />
                ) : (
                  <img src={sender?.avatar} alt={sender?.name} className="w-full h-full object-cover" />
                )}
              </div>

              {/* Message Content */}
              <div className={`max-w-[70%] space-y-1 ${!isModel && sender?.id === currentUser.id ? 'items-end flex flex-col' : ''}`}>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-slate-600">
                    {sender?.name || 'Unknown'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.isThinking && <BrainCircuit className="w-3 h-3 text-purple-400" />}
                </div>

                <div className={`space-y-2 ${!isModel && sender?.id === currentUser.id ? 'items-end flex flex-col' : ''}`}>
                    {/* Attachments Rendering */}
                    {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                            {msg.attachments.map(att => (
                                <div key={att.id} className="rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                                    {att.type === 'image' && (
                                        <img src={att.url || `data:${att.mimeType};base64,${att.data}`} alt="attachment" className="h-32 w-auto object-cover" />
                                    )}
                                    {att.type === 'video' && (
                                        <div className="h-32 w-32 bg-slate-900 flex items-center justify-center text-white">
                                            <VideoIcon className="w-8 h-8" />
                                        </div>
                                    )}
                                     {/* Audio/File placeholders could go here */}
                                </div>
                            ))}
                        </div>
                    )}

                    <div 
                    className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap relative group
                        ${isModel 
                        ? 'bg-white text-slate-700 rounded-tl-none border border-slate-100' 
                        : sender?.id === currentUser.id
                            ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-200'
                            : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
                        }`}
                    >
                    {msg.content}
                    
                    {/* TTS Button for Model Messages */}
                    {isModel && (
                        <button 
                            onClick={() => handleTTS(msg.content, msg.id)}
                            className={`absolute -bottom-8 left-0 p-1.5 rounded-full shadow-sm border border-slate-200 bg-white hover:bg-slate-50 transition-all opacity-0 group-hover:opacity-100 
                                ${playingAudioId === msg.id ? 'text-blue-600' : 'text-slate-400'}`}
                            title="Read Aloud"
                        >
                            <Volume2 className={`w-4 h-4 ${playingAudioId === msg.id ? 'animate-pulse' : ''}`} />
                        </button>
                    )}
                    </div>
                </div>
              </div>
            </div>
          );
        })}
        
        {isTyping && (
          <div className="flex items-center space-x-2 text-slate-400 text-sm ml-14">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span>{isThinkingMode ? 'Thinking deeply...' : 'Thinking...'}</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100">
        {/* Attachment Preview */}
        {attachments.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                {attachments.map(att => (
                    <div key={att.id} className="relative group shrink-0">
                        <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                            {att.type === 'image' ? (
                                <img src={att.url} className="w-full h-full object-cover" />
                            ) : att.type === 'video' ? (
                                <VideoIcon className="w-6 h-6 text-slate-400" />
                            ) : (
                                <Paperclip className="w-6 h-6 text-slate-400" />
                            )}
                        </div>
                        <button 
                            onClick={() => removeAttachment(att.id)}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </div>
        )}

        <div className="flex flex-col gap-2">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-1">
                <button 
                    onClick={() => setIsThinkingMode(!isThinkingMode)}
                    className={`flex items-center space-x-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors border
                        ${isThinkingMode 
                            ? 'bg-purple-100 text-purple-700 border-purple-200' 
                            : 'bg-slate-50 text-slate-500 border-transparent hover:bg-slate-100'}`}
                >
                    <BrainCircuit className="w-3.5 h-3.5" />
                    <span>Deep Think</span>
                </button>
            </div>

            <div className="flex items-end space-x-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50 transition-all">
            <input 
                type="file" 
                multiple 
                accept="image/*,video/*,audio/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileSelect}
            />
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                title="Attach Image, Video, or Audio"
            >
                <Paperclip className="w-5 h-5" />
            </button>
            <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={isThinkingMode ? "Ask a complex question..." : `Message as ${currentUser.name}...`}
                className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 py-2 text-slate-700 placeholder-slate-400"
                rows={1}
                style={{ minHeight: '44px' }}
            />
            <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
                <Smile className="w-5 h-5" />
            </button>
            <button 
                onClick={handleSendMessage}
                disabled={(!inputText.trim() && attachments.length === 0) || isTyping}
                className={`p-3 rounded-xl shadow-lg transition-all flex items-center justify-center
                ${(!inputText.trim() && attachments.length === 0) || isTyping
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                    : isThinkingMode 
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
            >
                {isThinkingMode ? <BrainCircuit className="w-5 h-5" /> : <Send className="w-5 h-5" />}
            </button>
            </div>
        </div>
        
        <p className="text-center text-[10px] text-slate-400 mt-2">
          Gemini 3 models active. Verify important information.
        </p>
      </div>
    </div>
  );
};

export default ChatArea;
