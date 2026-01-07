
import React, { useEffect, useRef } from 'react';
import { Message, Project, Document, Persona, Agreement } from '../types';

export type SyncActionPayload<T> = {
  data: T;
  timestamp: number;
};

export type SyncAction = 
  | { type: 'SYNC_MESSAGES'; payload: SyncActionPayload<Message[]> }
  | { type: 'SYNC_PROJECTS'; payload: SyncActionPayload<Project[]> }
  | { type: 'SYNC_DOCS'; payload: SyncActionPayload<Document[]> }
  | { type: 'SYNC_PERSONAS'; payload: SyncActionPayload<Persona[]> }
  | { type: 'SYNC_AGREEMENTS'; payload: SyncActionPayload<Agreement[]> }
  | { type: 'TYPING_UPDATE'; payload: { userId: string; name: string; isTyping: boolean } };

export const useRealTimeSync = (
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>,
  setDocuments: React.Dispatch<React.SetStateAction<Document[]>>,
  setPersonas: React.Dispatch<React.SetStateAction<Persona[]>>,
  setAgreements: React.Dispatch<React.SetStateAction<Agreement[]>>,
  onTypingUpdate: (userId: string, name: string, isTyping: boolean) => void
) => {
  const channelRef = useRef<BroadcastChannel | null>(null);
  
  const lastBroadcastRef = useRef<number>(0);
  const typingTimeoutsRef = useRef<Map<string, any>>(new Map());

  // Track the timestamp of the last update received or sent for each type
  // This implements a basic Last-Write-Wins (LWW) strategy
  const lastUpdateTimestamps = useRef({
    MESSAGES: 0,
    PROJECTS: 0,
    DOCS: 0,
    PERSONAS: 0,
    AGREEMENTS: 0
  });

  useEffect(() => {
    channelRef.current = new BroadcastChannel('nexus_workspace_sync_v2');

    channelRef.current.onmessage = (event: MessageEvent<SyncAction>) => {
      const { type, payload } = event.data;
      
      switch (type) {
        case 'SYNC_MESSAGES':
          if (payload.timestamp > lastUpdateTimestamps.current.MESSAGES) {
            lastUpdateTimestamps.current.MESSAGES = payload.timestamp;
            setMessages(payload.data);
          }
          break;
        case 'SYNC_PROJECTS':
          if (payload.timestamp > lastUpdateTimestamps.current.PROJECTS) {
            lastUpdateTimestamps.current.PROJECTS = payload.timestamp;
            setProjects(payload.data);
          }
          break;
        case 'SYNC_DOCS':
          if (payload.timestamp > lastUpdateTimestamps.current.DOCS) {
             lastUpdateTimestamps.current.DOCS = payload.timestamp;
             setDocuments(payload.data);
          }
          break;
        case 'SYNC_PERSONAS':
          if (payload.timestamp > lastUpdateTimestamps.current.PERSONAS) {
              lastUpdateTimestamps.current.PERSONAS = payload.timestamp;
              setPersonas(payload.data);
          }
          break;
        case 'SYNC_AGREEMENTS':
          if (payload.timestamp > lastUpdateTimestamps.current.AGREEMENTS) {
              lastUpdateTimestamps.current.AGREEMENTS = payload.timestamp;
              setAgreements(payload.data);
          }
          break;
        case 'TYPING_UPDATE':
          const { userId, name, isTyping } = payload;
          
          if (typingTimeoutsRef.current.has(userId)) {
            clearTimeout(typingTimeoutsRef.current.get(userId)!);
            typingTimeoutsRef.current.delete(userId);
          }

          onTypingUpdate(userId, name, isTyping);

          if (isTyping) {
            const timeout = setTimeout(() => {
              onTypingUpdate(userId, name, false);
              typingTimeoutsRef.current.delete(userId);
            }, 3000); 
            typingTimeoutsRef.current.set(userId, timeout);
          }
          break;
      }
    };

    return () => {
      channelRef.current?.close();
      typingTimeoutsRef.current.forEach((timeout: any) => clearTimeout(timeout));
      typingTimeoutsRef.current.clear();
    };
  }, [setMessages, setProjects, setDocuments, setPersonas, setAgreements, onTypingUpdate]);

  const broadcast = (action: any) => {
    if (action.type === 'TYPING_UPDATE' && action.payload.isTyping) {
        const now = Date.now();
        if (now - lastBroadcastRef.current < 500) {
            return;
        }
        lastBroadcastRef.current = now;
        channelRef.current?.postMessage(action);
        return;
    }

    // Wrap data with timestamp for LWW
    const timestamp = Date.now();
    let typeKey = '';
    
    if (action.type === 'SYNC_MESSAGES') typeKey = 'MESSAGES';
    else if (action.type === 'SYNC_PROJECTS') typeKey = 'PROJECTS';
    else if (action.type === 'SYNC_DOCS') typeKey = 'DOCS';
    else if (action.type === 'SYNC_PERSONAS') typeKey = 'PERSONAS';
    else if (action.type === 'SYNC_AGREEMENTS') typeKey = 'AGREEMENTS';

    if (typeKey) {
        // Update local timestamp so we don't overwrite ourselves with older incoming messages
        // @ts-ignore
        lastUpdateTimestamps.current[typeKey] = timestamp;
        
        const enhancedAction = {
            type: action.type,
            payload: {
                data: action.payload,
                timestamp: timestamp
            }
        };
        channelRef.current?.postMessage(enhancedAction);
    }
  };

  return { broadcast };
};
