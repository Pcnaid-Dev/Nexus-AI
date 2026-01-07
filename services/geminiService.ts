
import { Message, User, Document, Persona, Agreement } from "../types";

// --- ARCHITECTURE 2 CONFIGURATION ---
// STRICTLY FALSE: We are moving all AI logic to the Python Backend
const USE_MOCK_BACKEND = false; 

// Dynamic API URL: Uses Env Var -> Localhost (dev) -> Production (default)
const getApiBaseUrl = () => {
  if (process.env.REACT_APP_API_BASE_URL) return process.env.REACT_APP_API_BASE_URL;
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3001';
  }
  return 'https://api.pcnaid.com';
};

const API_BASE_URL = getApiBaseUrl();

/**
 * AUTHENTICATION HELPER
 * If 401/403 received, redirect to the Backend's Google OAuth Start Endpoint.
 */
const handleAuthError = () => {
  console.log("Session expired or invalid. Redirecting to Google Login...");
  // Redirects to /auth/google/start
  window.location.href = `${API_BASE_URL}/auth/google/start?redirect_url=${encodeURIComponent(window.location.href)}`;
};

/**
 * PRODUCTION API CLIENT
 * Calls the Backend Orchestrator (FastAPI).
 * No Gemini Keys are stored in the frontend.
 */
export const generateResponse = async (
  history: Message[],
  currentUser: User,
  activePersona: Persona,
  activeDocs: Document[],
  allUsers: User[],
  activeAgreements: Agreement[],
  useThinking: boolean = false
): Promise<{ text: string, agreementProposal?: { title: string, content: string } }> => {

  if (!USE_MOCK_BACKEND) {
    try {
      const lastMessage = history[history.length - 1];
      
      const payload = {
        conversationId: 'active-session', // In a full app, this comes from the URL
        message: lastMessage.content,
        attachments: lastMessage.attachments || [],
        personaId: activePersona.id,
        useThinking: useThinking,
        // Zero-Knowledge RAG: We send IDs. Backend fetches vectors/content from R2/Postgres.
        activeDocIds: activeDocs.map(d => d.id), 
      };

      // Call Backend Orchestrator
      // Credentials 'include' is CRITICAL for sending the HttpOnly session cookie
      const response = await fetch(`${API_BASE_URL}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', 
        body: JSON.stringify(payload)
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError();
        return { text: "Redirecting to login..." };
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(err.detail || 'Backend API Error');
      }

      const data = await response.json();
      return {
        text: data.text,
        agreementProposal: data.agreementProposal
      };

    } catch (error) {
      console.error("Nexus Backend Connection Failed:", error);
      return { 
        text: `Error: Could not reach the Nexus Backend at ${API_BASE_URL}. Please check your connection.` 
      };
    }
  }

  return { text: "Error: Mock Backend is disabled for Production Architecture 2." };
};

export const generateSpeech = async (text: string): Promise<string | null> => {
    if (!USE_MOCK_BACKEND) {
        try {
            const res = await fetch(`${API_BASE_URL}/audio/tts`, {
                method: 'POST',
                body: JSON.stringify({ text }),
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });
            
            if (res.status === 401) { handleAuthError(); return null; }
            if (!res.ok) return null;
            
            const data = await res.json();
            return data.audioBase64;
        } catch (e) {
            console.error("TTS Backend Error", e);
            return null;
        }
    }
    return null;
}

export const generateTaskAnalysis = async (projectDescription: string): Promise<string> => {
    if (!USE_MOCK_BACKEND) {
        try {
            const res = await fetch(`${API_BASE_URL}/ai/analyze-tasks`, {
                method: 'POST',
                body: JSON.stringify({ description: projectDescription }),
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            if (res.status === 401) { handleAuthError(); return "[]"; }
            if (!res.ok) return "[]";

            const data = await res.json();
            return JSON.stringify(data.tasks);
        } catch (e) {
            return "[]";
        }
    }
    return "[]";
}

export const getLiveClient = () => {
    console.warn("Live Client requires backend proxy in Arch 2.");
    return null; 
}
