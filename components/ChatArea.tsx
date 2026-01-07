
import React, { useState, useRef, useEffect } from 'react';
import { Message, User, Persona, Attachment, Agreement } from '../types';
import { Send, User as UserIcon, Bot, Paperclip, Smile, BrainCircuit, X, Image as ImageIcon, Video as VideoIcon, Mic, MicOff, Volume2, Volume1, Sparkles, AudioLines, StopCircle, Camera, FileSignature, CheckCircle2, AlertCircle, Circle, Aperture } from 'lucide-react';
import { generateResponse, generateSpeech } from '../services/geminiService';
import LiveVoiceModal from './LiveVoiceModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatAreaProps {
  currentUser: User;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  allUsers: User[];
  activePersona: Persona;
  activeDocs: any[];
  activeAgreements: Agreement[];
  onAcceptAgreement: (title: string, content: string) => void;
  // New Props for Collaboration
  activeTypers?: Map<string, string>;
  onTyping?: (isTyping: boolean) => void;
  themeColor?: string;
}

const ChatArea: React.FC<ChatAreaProps> = ({ 
  currentUser, 
  messages, 
  setMessages, 
  allUsers,
  activePersona,
  activeDocs,
  activeAgreements,
  onAcceptAgreement,
  activeTypers,
  onTyping,
  themeColor: propThemeColor = 'blue'
}) => {
  // Prefer persona theme if available, else project theme, else blue
  const themeColor = activePersona.theme || propThemeColor;

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false); // Model typing state
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [autoTTSEnabled, setAutoTTSEnabled] = useState(false);

  // Dictation State
  const [isDictating, setIsDictating] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Camera Capture State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<'video' | 'photo'>('video');
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Simple Audio Recording (Voice Message) State - handled separately from camera
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const lastAutoPlayedIdRef = useRef<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, attachments, activeTypers]); 

  // Auto TTS Effect
  useEffect(() => {
    if (!autoTTSEnabled) return;

    const lastMsg = messages[messages.length - 1];
    // Check if it's a model message, not thinking, and not already played
    if (lastMsg && lastMsg.role === 'model' && !lastMsg.isThinking && lastMsg.id !== lastAutoPlayedIdRef.current) {
        lastAutoPlayedIdRef.current = lastMsg.id;
        // Small delay to ensure UI updates first
        setTimeout(() => {
            handleTTS(lastMsg.content, lastMsg.id);
        }, 500);
    }
  }, [messages, autoTTSEnabled]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            const latestResult = event.results[event.results.length - 1];
            if (latestResult.isFinal) {
                const text = latestResult[0].transcript.trim();
                setInputText(prev => prev ? `${prev} ${text}` : text);
            }
        };

        recognition.onend = () => {
            setIsDictating(false);
        };
        
        recognitionRef.current = recognition;
    }
  }, []);

  // Cleanup camera on unmount or close
  useEffect(() => {
      if (!isCameraOpen) {
          stopCameraStream();
      }
  }, [isCameraOpen]);

  const toggleDictation = () => {
    if (!recognitionRef.current) {
        alert("Speech recognition not supported in this browser.");
        return;
    }

    if (isDictating) {
        recognitionRef.current.stop();
        setIsDictating(false);
    } else {
        recognitionRef.current.start();
        setIsDictating(true);
    }
  };

  // --- Camera & Recording Logic ---

  const startCamera = async () => {
      setIsCameraOpen(true);
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          cameraStreamRef.current = stream;
          if (videoPreviewRef.current) {
              videoPreviewRef.current.srcObject = stream;
          }
      } catch (e) {
          console.error("Camera access failed", e);
          alert("Could not access camera. Please check permissions.");
          setIsCameraOpen(false);
      }
  };

  const stopCameraStream = () => {
      if (cameraStreamRef.current) {
          cameraStreamRef.current.getTracks().forEach(t => t.stop());
          cameraStreamRef.current = null;
      }
      setIsRecordingVideo(false);
  };

  const takePhoto = () => {
      if (!videoPreviewRef.current) return;
      const canvas = document.createElement('canvas');
      canvas.width = videoPreviewRef.current.videoWidth;
      canvas.height = videoPreviewRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoPreviewRef.current, 0, 0);
      
      const base64Data = canvas.toDataURL('image/jpeg').split(',')[1];
      
      setAttachments(prev => [...prev, {
          id: Date.now().toString(),
          type: 'image',
          name: `Photo ${new Date().toLocaleTimeString()}`,
          data: base64Data,
          mimeType: 'image/jpeg',
          url: canvas.toDataURL('image/jpeg')
      }]);
      
      setIsCameraOpen(false);
  };

  const startVideoRecording = () => {
      if (!cameraStreamRef.current) return;
      const recorder = new MediaRecorder(cameraStreamRef.current);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' });
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
                const base64String = reader.result as string;
                const base64 = base64String.split(',')[1];
                
                setAttachments(prev => [...prev, {
                    id: Date.now().toString(),
                    type: 'video',
                    name: `Video ${new Date().toLocaleTimeString()}`,
                    data: base64,
                    mimeType: 'video/webm',
                    url: URL.createObjectURL(blob)
                }]);
            };
            setIsCameraOpen(false);
      };
      
      recorder.start();
      setIsRecordingVideo(true);
  };

  const stopVideoRecording = () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
          setIsRecordingVideo(false);
      }
  };

  // --- Audio Only Recording ---

  const startAudioRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        chunksRef.current = [];
        
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        
        recorder.onstop = async () => {
            const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
                const base64String = reader.result as string;
                const base64 = base64String.split(',')[1];
                
                setAttachments(prev => [...prev, {
                    id: Date.now().toString(),
                    type: 'audio',
                    name: `Audio ${new Date().toLocaleTimeString()}`,
                    data: base64,
                    mimeType: 'audio/webm',
                    url: URL.createObjectURL(blob)
                }]);
            };
            stream.getTracks().forEach(t => t.stop());
        };
        
        recorder.start();
        setIsRecordingAudio(true);
    } catch (e) {
        console.error("Audio recording failed", e);
        alert("Microphone access denied.");
    }
  };

  const stopAudioRecording = () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
          setIsRecordingAudio(false);
      }
  };


  // Handle Local Typing with Broadcast
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    
    if (onTyping) {
        onTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            onTyping(false);
        }, 1500);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
           const base64String = reader.result as string;
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
             url: URL.createObjectURL(file) 
           }]);
        };
        reader.readAsDataURL(file);
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() && attachments.length === 0) return;

    if (onTyping) {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        onTyping(false);
    }

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
    
    setInputText('');
    setAttachments([]);
    setIsTyping(true);

    try {
      const responseData = await generateResponse(
        updatedHistory, 
        currentUser, 
        activePersona, 
        activeDocs,
        allUsers,
        activeAgreements,
        isThinkingMode
      );

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        userId: 'gemini',
        content: responseData.text,
        timestamp: new Date(),
        role: 'model',
        isThinking: isThinkingMode,
        agreementProposal: responseData.agreementProposal ? {
            ...responseData.agreementProposal,
            status: 'proposed'
        } : undefined
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  const handleAcceptProposal = (msgId: string) => {
      setMessages(prev => prev.map(m => {
          if (m.id === msgId && m.agreementProposal) {
              // Trigger app level save
              onAcceptAgreement(m.agreementProposal.title, m.agreementProposal.content);
              
              // Update local message state
              return {
                  ...m,
                  agreementProposal: {
                      ...m.agreementProposal,
                      status: 'accepted',
                      approvedBy: [...(m.agreementProposal.approvedBy || []), currentUser.name]
                  }
              };
          }
          return m;
      }));
  };

  const handleTTS = async (text: string, msgId: string) => {
      if (playingAudioId === msgId) {
          setPlayingAudioId(null);
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

  const renderRemoteTypingIndicator = () => {
    if (!activeTypers || activeTypers.size === 0) return null;
    
    const userIds = Array.from(activeTypers.keys());
    const typingUsers = userIds.map(id => allUsers.find(u => u.id === id)).filter(Boolean) as User[];
    
    let text = "";
    const names = typingUsers.map(u => u.name);
    
    if (names.length === 1) text = `${names[0]} is typing...`;
    else if (names.length === 2) text = `${names[0]} and ${names[1]} are typing...`;
    else if (names.length === 3) text = `${names[0]}, ${names[1]}, and ${names[2]} are typing...`;
    else text = `${names[0]}, ${names[1]}, and ${names.length - 2} others are typing...`;

    return (
        <div className="flex items-center space-x-3 ml-14 mt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="flex -space-x-2">
                 {typingUsers.slice(0, 3).map((u, i) => (
                     <img key={u.id} src={u.avatar} alt={u.name} className="w-6 h-6 rounded-full border-2 border-white ring-1 ring-slate-200 object-cover bg-white" style={{ zIndex: 3 - i }} />
                 ))}
                 {typingUsers.length > 3 && (
                     <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] text-slate-500 font-bold z-0">+{typingUsers.length - 3}</div>
                 )}
             </div>
             <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1.5 rounded-full shadow-sm">
                <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-xs text-slate-500 font-medium italic">{text}</span>
             </div>
        </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-tl-3xl shadow-inner overflow-hidden relative">
      <LiveVoiceModal isOpen={isLiveModalOpen} onClose={() => setIsLiveModalOpen(false)} systemInstruction={activePersona.systemInstruction} />

      {/* Camera Capture Modal */}
      {isCameraOpen && (
          <div className="absolute inset-0 z-50 bg-black flex flex-col animate-in fade-in duration-200">
              <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
                   <video 
                      ref={videoPreviewRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="absolute w-full h-full object-cover" 
                   />
                   <div className="absolute top-4 right-4 z-10">
                       <button onClick={() => setIsCameraOpen(false)} className="p-2 bg-black/50 text-white rounded-full hover:bg-black/80">
                           <X className="w-6 h-6" />
                       </button>
                   </div>
              </div>
              <div className="h-24 bg-black/90 flex items-center justify-center space-x-8 pb-4">
                  {cameraMode === 'photo' ? (
                      <button 
                        onClick={takePhoto} 
                        className="w-16 h-16 rounded-full border-4 border-white bg-white/20 hover:bg-white/40 transition-colors flex items-center justify-center"
                      >
                          <div className="w-12 h-12 bg-white rounded-full"></div>
                      </button>
                  ) : (
                      <button 
                        onClick={isRecordingVideo ? stopVideoRecording : startVideoRecording} 
                        className={`w-16 h-16 rounded-full border-4 border-white flex items-center justify-center transition-all ${isRecordingVideo ? 'bg-red-500 scale-110' : 'bg-transparent'}`}
                      >
                          {isRecordingVideo ? (
                              <div className="w-6 h-6 bg-white rounded-sm"></div>
                          ) : (
                              <div className="w-14 h-14 bg-red-500 rounded-full border-2 border-black"></div>
                          )}
                      </button>
                  )}
                  
                  <div className="absolute bottom-24 flex space-x-4 bg-black/50 p-2 rounded-full backdrop-blur-md">
                      <button 
                        onClick={() => setCameraMode('video')} 
                        className={`px-4 py-1 rounded-full text-sm font-medium ${cameraMode === 'video' ? 'bg-white text-black' : 'text-white'}`}
                      >
                          Video
                      </button>
                      <button 
                        onClick={() => setCameraMode('photo')} 
                        className={`px-4 py-1 rounded-full text-sm font-medium ${cameraMode === 'photo' ? 'bg-white text-black' : 'text-white'}`}
                      >
                          Photo
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-sm sticky top-0 z-10" id="chat-header">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Bot className={`w-5 h-5 text-${themeColor}-600`} />
              {activePersona.name}
            </h2>
            <p className="text-xs text-slate-500">Active Mode: {activePersona.tone}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
            <button 
                onClick={() => setAutoTTSEnabled(!autoTTSEnabled)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm border transition-all
                  ${autoTTSEnabled ? `bg-${themeColor}-50 text-${themeColor}-600 border-${themeColor}-200` : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                title="Automatically read aloud new AI messages"
            >
                {autoTTSEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <Volume1 className="w-3.5 h-3.5" />}
                <span>Auto-Read</span>
            </button>
            <button 
                onClick={() => setIsLiveModalOpen(true)}
                className={`flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-${themeColor}-500 to-purple-600 text-white rounded-full text-xs font-bold shadow-md hover:shadow-lg transition-all animate-pulse-slow`}
            >
                <Mic className="w-3.5 h-3.5" />
                <span>Live Voice</span>
            </button>
            <div className="h-6 w-px bg-slate-200"></div>
            {activeDocs.length > 0 && (
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium border border-green-200">{activeDocs.length} Docs Active</span>
            )}
            <span className="text-xs text-slate-400">User: <span className="font-semibold text-slate-700">{currentUser.name}</span></span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
        {messages.map((msg) => {
          const isModel = msg.role === 'model';
          const sender = isModel ? { id: 'gemini', name: activePersona.name, avatar: '', color: `bg-${themeColor}-600` } : allUsers.find(u => u.id === msg.userId);

          return (
            <div key={msg.id} className={`flex flex-col space-y-2 ${!isModel && sender?.id === currentUser.id ? 'items-end' : 'items-start'}`}>
              <div className={`flex space-x-3 ${!isModel && sender?.id === currentUser.id ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm overflow-hidden ${isModel ? `bg-${themeColor}-100 border-2 border-${themeColor}-200` : 'bg-white border-2 border-white'}`}>
                    {isModel ? <Bot className={`w-6 h-6 text-${themeColor}-600`} /> : <img src={sender?.avatar} alt={sender?.name} className="w-full h-full object-cover" />}
                  </div>

                  <div className={`max-w-[70%] space-y-1 ${!isModel && sender?.id === currentUser.id ? 'items-end flex flex-col' : ''}`}>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-slate-600">{sender?.name || 'Unknown'}</span>
                      <span className="text-[10px] text-slate-400">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {msg.isThinking && <BrainCircuit className="w-3 h-3 text-purple-400" />}
                    </div>

                    <div className={`space-y-2 ${!isModel && sender?.id === currentUser.id ? 'items-end flex flex-col' : ''}`}>
                        {msg.attachments && msg.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                                {msg.attachments.map(att => (
                                    <div key={att.id} className="rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-slate-900">
                                        {att.type === 'image' && <img src={att.url || `data:${att.mimeType};base64,${att.data}`} alt="attachment" className="h-32 w-auto object-cover" />}
                                        {att.type === 'video' && <video src={att.url} controls className="h-32 w-auto max-w-[200px]" />}
                                        {att.type === 'audio' && <div className="p-2 flex items-center justify-center h-16 w-48"><audio src={att.url} controls className="w-full h-8" /></div>}
                                        {att.type === 'file' && <div className="h-20 w-32 flex flex-col items-center justify-center text-white p-2"><Paperclip className="w-6 h-6 mb-1" /><span className="text-xs truncate max-w-full">{att.name}</span></div>}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className={`p-4 rounded-2xl shadow-sm text-sm relative group overflow-hidden ${isModel ? 'bg-white text-slate-700 rounded-tl-none border border-slate-100' : sender?.id === currentUser.id ? `bg-${themeColor}-600 text-white rounded-tr-none shadow-${themeColor}-200` : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'}`}>
                            {isModel ? (
                                <ReactMarkdown className="prose prose-sm max-w-none text-slate-700 leading-relaxed prose-headings:font-bold prose-p:my-1 prose-pre:bg-slate-800 prose-pre:text-white prose-pre:p-3 prose-pre:rounded-lg" remarkPlugins={[remarkGfm]} components={{ a: ({node, ...props}) => <a {...props} className={`text-${themeColor}-600 underline hover:text-${themeColor}-800`} target="_blank" rel="noopener noreferrer" />, code: ({node, className, children, ...props}) => { const match = /language-(\w+)/.exec(className || ''); return !String(children).includes('\n') ? <code className="bg-slate-100 text-pink-600 rounded px-1 py-0.5 text-xs font-mono border border-slate-200" {...props}>{children}</code> : <code className="text-xs font-mono" {...props}>{children}</code> } }}>{msg.content}</ReactMarkdown>
                            ) : (
                                <div className="whitespace-pre-wrap">{msg.content}</div>
                            )}
                            {isModel && (
                                <button onClick={() => handleTTS(msg.content, msg.id)} className={`absolute -bottom-8 left-0 p-1.5 rounded-full shadow-sm border border-slate-200 bg-white hover:bg-slate-50 transition-all opacity-0 group-hover:opacity-100 ${playingAudioId === msg.id ? `text-${themeColor}-600` : 'text-slate-400'}`} title="Read Aloud"><Volume2 className={`w-4 h-4 ${playingAudioId === msg.id ? 'animate-pulse' : ''}`} /></button>
                            )}
                        </div>
                    </div>
                  </div>
              </div>

              {/* Agreement Proposal Card */}
              {msg.agreementProposal && (
                  <div className="w-[70%] ml-14 animate-in slide-in-from-bottom-5 duration-300">
                      <div className={`border-2 rounded-xl p-5 shadow-sm relative overflow-hidden
                          ${msg.agreementProposal.status === 'accepted' ? 'border-green-200 bg-green-50/50' : 'border-purple-200 bg-white'}`}
                      >
                          <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center space-x-2">
                                  <div className={`p-2 rounded-lg ${msg.agreementProposal.status === 'accepted' ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'}`}>
                                      <FileSignature className="w-5 h-5" />
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-slate-800">{msg.agreementProposal.title}</h4>
                                      <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Formal Agreement Proposal</span>
                                  </div>
                              </div>
                              {msg.agreementProposal.status === 'accepted' && (
                                  <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold flex items-center">
                                      <CheckCircle2 className="w-3 h-3 mr-1" /> Accepted
                                  </span>
                              )}
                          </div>
                          
                          <div className="prose prose-sm max-w-none text-slate-600 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                              <ReactMarkdown>{msg.agreementProposal.content}</ReactMarkdown>
                          </div>

                          <div className="flex justify-between items-center">
                              <div className="flex -space-x-1">
                                  {/* Just showing potential signatures here for UI */}
                                  {msg.agreementProposal.approvedBy?.map((name, i) => (
                                      <div key={i} className="w-6 h-6 rounded-full bg-green-200 border border-white flex items-center justify-center text-[10px] text-green-800 font-bold" title={name}>
                                          {name[0]}
                                      </div>
                                  ))}
                              </div>
                              
                              {msg.agreementProposal.status === 'proposed' && (
                                  <div className="flex space-x-2">
                                      <button className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                          Reject
                                      </button>
                                      <button 
                                          onClick={() => handleAcceptProposal(msg.id)}
                                          className="px-4 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors flex items-center"
                                      >
                                          <CheckCircle2 className="w-3 h-3 mr-1.5" />
                                          Accept & Sign
                                      </button>
                                  </div>
                              )}
                              
                              {msg.agreementProposal.status === 'accepted' && (
                                  <p className="text-xs text-green-600 italic">Agreement formalized and saved.</p>
                              )}
                          </div>
                      </div>
                  </div>
              )}
            </div>
          );
        })}
        
        {isTyping && (
          <div className="flex items-center space-x-2 text-slate-400 text-sm ml-14">
            <div className="flex space-x-1"><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div></div>
            <span>{isThinkingMode ? 'Thinking deeply...' : 'Gemini is typing...'}</span>
          </div>
        )}

        {renderRemoteTypingIndicator()}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-100 relative">
        {isRecordingAudio && (
            <div className="absolute inset-0 bg-white/95 z-20 flex items-center justify-center space-x-4">
                <div className="flex items-center space-x-2 text-red-500 animate-pulse"><div className="w-3 h-3 bg-red-500 rounded-full"></div><span className="font-bold text-sm">Recording Audio...</span></div>
                <button onClick={stopAudioRecording} className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 shadow-lg"><StopCircle className="w-5 h-5" /><span>Stop & Attach</span></button>
            </div>
        )}

        {attachments.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                {attachments.map(att => (
                    <div key={att.id} className="relative group shrink-0">
                        <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                            {att.type === 'image' ? <img src={att.url} className="w-full h-full object-cover" /> : att.type === 'video' ? <VideoIcon className="w-6 h-6 text-slate-400" /> : att.type === 'audio' ? <AudioLines className="w-6 h-6 text-slate-400" /> : <Paperclip className="w-6 h-6 text-slate-400" />}
                        </div>
                        <button onClick={() => removeAttachment(att.id)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                    </div>
                ))}
            </div>
        )}

        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 px-1">
                <button onClick={() => setIsThinkingMode(!isThinkingMode)} className={`flex items-center space-x-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors border ${isThinkingMode ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-slate-50 text-slate-500 border-transparent hover:bg-slate-100'}`}><BrainCircuit className="w-3.5 h-3.5" /><span>Deep Think</span></button>
            </div>

            <div className={`flex items-end space-x-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 focus-within:border-${themeColor}-400 focus-within:ring-4 focus-within:ring-${themeColor}-50 transition-all`}>
                <input type="file" multiple accept="image/*,video/*,audio/*" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                <button onClick={() => fileInputRef.current?.click()} className={`p-2 text-slate-400 hover:text-${themeColor}-600 hover:bg-${themeColor}-50 rounded-xl transition-colors`} title="Attach File"><Paperclip className="w-5 h-5" /></button>
                <button onClick={startAudioRecording} className={`p-2 text-slate-400 hover:text-${themeColor}-600 hover:bg-${themeColor}-50 rounded-xl transition-colors`} title="Record Audio Message"><AudioLines className="w-5 h-5" /></button>
                <button onClick={startCamera} className={`p-2 text-slate-400 hover:text-${themeColor}-600 hover:bg-${themeColor}-50 rounded-xl transition-colors`} title="Camera: Photo or Video"><Aperture className="w-5 h-5" /></button>

                <textarea value={inputText} onChange={handleInputChange} onKeyDown={handleKeyPress} placeholder={isThinkingMode ? "Ask a complex question..." : isDictating ? "Listening..." : `Message as ${currentUser.name}...`} className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 py-2 text-slate-700 placeholder-slate-400" rows={1} style={{ minHeight: '44px' }} />
                
                <button onClick={toggleDictation} className={`p-2 rounded-xl transition-all duration-200 ${isDictating ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-200' : `text-slate-400 hover:text-${themeColor}-600 hover:bg-${themeColor}-50`}`} title="Speech-to-Text Dictation">{isDictating ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}</button>
                <button onClick={handleSendMessage} disabled={(!inputText.trim() && attachments.length === 0) || isTyping} className={`p-3 rounded-xl shadow-lg transition-all flex items-center justify-center ${(!inputText.trim() && attachments.length === 0) || isTyping ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : isThinkingMode ? 'bg-purple-600 text-white hover:bg-purple-700' : `bg-${themeColor}-600 text-white hover:bg-${themeColor}-700`}`}>{isThinkingMode ? <BrainCircuit className="w-5 h-5" /> : <Send className="w-5 h-5" />}</button>
            </div>
        </div>
        
        <p className="text-center text-[10px] text-slate-400 mt-2">Gemini 3 models active. Verify important information.</p>
      </div>
    </div>
  );
};

export default ChatArea;
