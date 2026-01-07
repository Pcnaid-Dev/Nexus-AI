
import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, X, Volume2, Activity } from 'lucide-react';
import { getLiveClient } from '../services/geminiService';
import { LiveServerMessage, Modality } from '@google/genai';

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemInstruction?: string;
}

const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({ isOpen, onClose, systemInstruction }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('disconnected');
  const [isMuted, setIsMuted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Audio Context Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // Playback Refs
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    if (isOpen) {
      startSession();
    } else {
      stopSession();
    }
    return () => {
        stopSession();
    };
  }, [isOpen]);

  const startSession = async () => {
    setStatus('connecting');
    try {
      const live = getLiveClient();
      
      // Setup Audio Contexts
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const sessionPromise = live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log('Live Session Opened');
            setStatus('connected');
            
            // Setup Input Stream
            if (!inputAudioContextRef.current) return;
            const ctx = inputAudioContextRef.current;
            const source = ctx.createMediaStreamSource(stream);
            sourceRef.current = source;
            
            const processor = ctx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;
            
            processor.onaudioprocess = (e) => {
              if (isMuted) return;
              
              const inputData = e.inputBuffer.getChannelData(0);
              // Simple volume meter
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              setVolumeLevel(Math.sqrt(sum/inputData.length));

              const pcmBlob = createBlob(inputData);
              sessionPromise.then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(processor);
            processor.connect(ctx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
                const ctx = outputAudioContextRef.current;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                
                const audioBuffer = await decodeAudioData(
                    decode(base64Audio),
                    ctx,
                    24000,
                    1
                );
                
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                
                source.addEventListener('ended', () => {
                    sourcesRef.current.delete(source);
                });
                
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
            }
            
            // Handle Interruption
            if (message.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => s.stop());
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
            console.log('Session Closed');
            setStatus('disconnected');
          },
          onerror: (err) => {
            console.error('Session Error', err);
            setStatus('error');
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: systemInstruction || "You are a helpful AI assistant.",
        },
      });
      
      sessionRef.current = sessionPromise;

    } catch (e) {
      console.error("Failed to start live session", e);
      setStatus('error');
    }
  };

  const stopSession = () => {
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    
    if (inputAudioContextRef.current) {
        if (inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close();
        }
        inputAudioContextRef.current = null;
    }

    if (outputAudioContextRef.current) {
        if (outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close();
        }
        outputAudioContextRef.current = null;
    }
    
    // Reset other refs
    processorRef.current = null;
    sourceRef.current = null;
    sourcesRef.current.forEach(s => {
        try { s.stop(); } catch(e) {}
    });
    sourcesRef.current.clear();
    
    setStatus('disconnected');
    setVolumeLevel(0);
  };

  // Helpers
  function createBlob(data: Float32Array) {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    // Encode raw PCM
    let binary = '';
    const bytes = new Uint8Array(int16.buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const b64 = btoa(binary);

    return {
        data: b64,
        mimeType: 'audio/pcm;rate=16000',
    };
  }

  function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) {
      const dataInt16 = new Int16Array(data.buffer);
      const frameCount = dataInt16.length / numChannels;
      const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
      for (let channel = 0; channel < numChannels; channel++) {
          const channelData = buffer.getChannelData(channel);
          for (let i = 0; i < frameCount; i++) {
              channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
          }
      }
      return buffer;
  }


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-white/20 relative overflow-hidden">
         {/* Background Animation */}
         <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 opacity-50 z-0"></div>
         
         <div className="relative z-10 flex flex-col items-center">
            <button 
                onClick={onClose}
                className="absolute top-0 right-0 p-2 text-slate-400 hover:text-slate-600 bg-white/50 rounded-full"
            >
                <X className="w-6 h-6" />
            </button>

            <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 transition-all duration-300
                ${status === 'connected' ? 'bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30' : 'bg-slate-200'}
                ${status === 'connecting' ? 'animate-pulse' : ''}
            `}>
                {status === 'connected' ? (
                    <div className="relative">
                         <Mic className="w-12 h-12 text-white" />
                         {/* Visualizer rings */}
                         <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping" style={{ animationDuration: '2s' }}></div>
                         <div className="absolute inset-0 rounded-full border border-white/20 animate-ping" style={{ animationDuration: '1.5s' }}></div>
                    </div>
                ) : (
                    <Activity className="w-12 h-12 text-slate-400" />
                )}
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mb-2">Gemini Live</h2>
            <p className="text-slate-500 text-center mb-8 h-6">
                {status === 'connecting' && "Establishing connection..."}
                {status === 'connected' && "Listening & Speaking..."}
                {status === 'disconnected' && "Disconnected"}
                {status === 'error' && "Connection Error"}
            </p>

            <div className="flex items-center space-x-6">
                <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-4 rounded-full transition-colors ${isMuted ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
                <button 
                    onClick={onClose}
                    className="px-8 py-3 bg-red-500 text-white font-medium rounded-full hover:bg-red-600 shadow-lg shadow-red-200 transition-transform active:scale-95"
                >
                    End Session
                </button>
            </div>
         </div>
      </div>
    </div>
  );
};

export default LiveVoiceModal;
