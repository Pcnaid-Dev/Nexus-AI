
import { GoogleGenAI, GenerateContentResponse, Modality, FunctionDeclaration, Type } from "@google/genai";
import { Message, User, Document, Persona, Attachment, Agreement } from "../types";

// --- CONFIGURATION ---
// Toggle this to switch between Client-Side Prototype and Production API
const USE_MOCK_BACKEND = true; 
const API_BASE_URL = '/api/v1';

// --- MOCK INITIALIZATION ---
const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

// Shared Tool Definition
const proposeAgreementTool: FunctionDeclaration = {
  name: "proposeAgreement",
  description: "Propose a formal agreement or contract based on the user conversation. Use this when users have reached a consensus or want to formalize a decision.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "A short, clear title for the agreement."
      },
      content: {
        type: Type.STRING,
        description: "The detailed content of the agreement in Markdown format. Be precise and cover all points discussed."
      }
    },
    required: ["title", "content"]
  }
};

/**
 * PRODUCTION API CLIENT (Data Adapter)
 * 
 * In production mode (!USE_MOCK_BACKEND), this service:
 * 1. Abandons client-side concatenation of documents.
 * 2. Calls the Backend Orchestrator which handles Mem0 and txtai interactions.
 * 3. Normalizes the API response for the React UI.
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

  // --- PATH A: PRODUCTION BACKEND (Orchestrator + Mem0 + txtai) ---
  if (!USE_MOCK_BACKEND) {
    try {
      const lastMessage = history[history.length - 1];
      
      // We only send the IDs. The backend has the content in Postgres/Vector DB.
      const payload = {
        conversationId: 'current-session-id', // Replaced by actual ID in real integration
        content: lastMessage.content,
        attachments: lastMessage.attachments || [],
        personaId: activePersona.id,
        activeDocIds: activeDocs.map(d => d.id),
        useThinking
      };

      const response = await fetch(`${API_BASE_URL}/conversations/active/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}` // Auth managed via cookie/header
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Backend API Error: ${response.statusText}`);
      }

      const data = await response.json();
      
      // backend returns { text, citations, agreementProposal }
      return {
        text: data.text,
        agreementProposal: data.agreementProposal
      };

    } catch (error) {
      console.error("Nexus Backend Connection Failed:", error);
      return { 
        text: "Error: Unable to connect to the Nexus Backend. Please ensure the server is running and Mem0/txtai services are healthy." 
      };
    }
  }

  // --- PATH B: CLIENT-SIDE PROTOTYPE (Mock) ---
  // Keeps the app functional for demo purposes without the full backend stack.
  
  if (!apiKey) {
    return { text: "Error: API_KEY is missing from environment variables." };
  }

  // 1. Simulate RAG: Concatenate active docs into context
  const contextString = activeDocs.map(doc => 
    `--- DOCUMENT: ${doc.name} ---\n${doc.content}\n----------------`
  ).join('\n\n');

  // 2. Simulate Database Context
  const agreementsString = activeAgreements.map(agr => 
    `--- ACTIVE AGREEMENT: ${agr.title} ---\n${agr.content}\n(Signed by: ${agr.signatories.join(', ')})\n----------------`
  ).join('\n\n');

  const userDirectory = allUsers.map(u => `${u.name} (ID: ${u.id})`).join(', ');

  // 3. Assemble System Prompt
  const systemInstruction = `
    ${activePersona.systemInstruction}
    
    TONE INSTRUCTIONS: ${activePersona.tone}
    
    [MOCK MEMORY LAYER]:
    - User Profile: ${currentUser.name} (This would be fetched from Mem0 in Prod)
    
    [MOCK RAG LAYER]:
    ${contextString || "No external documents loaded."}

    EXISTING AGREEMENTS:
    ${agreementsString || "No active agreements."}
    
    USER DIRECTORY:
    ${userDirectory}
    
    IMPORTANT:
    - Address users directly.
    - Use 'proposeAgreement' tool if a consensus is reached.
    - Current Time: ${new Date().toLocaleString()}.
  `;

  // 4. Model Configuration
  const lastMsg = history[history.length - 1];
  const hasAudioVideo = lastMsg.attachments && lastMsg.attachments.some(a => a.type === 'audio' || a.type === 'video');
  const hasImage = lastMsg.attachments && lastMsg.attachments.some(a => a.type === 'image');
  
  let model = 'gemini-3-flash-preview';
  let config: any = {
    systemInstruction: systemInstruction,
    temperature: 0.7,
    tools: [{ functionDeclarations: [proposeAgreementTool] }]
  };

  if (useThinking) {
    model = 'gemini-3-pro-preview';
    config = {
        ...config,
        thinkingConfig: { thinkingBudget: 32768 },
        temperature: undefined, 
        tools: undefined
    };
  } else if (hasAudioVideo) {
    model = 'gemini-2.5-flash-latest'; 
  } else if (hasImage) {
    model = 'gemini-2.5-flash-image'; 
  }

  // 5. Format History for API
  const contents = history.map(msg => {
    const senderName = msg.role === 'user' 
      ? allUsers.find(u => u.id === msg.userId)?.name || 'Unknown User'
      : 'Model';
    
    const parts: any[] = [];
    let textContent = msg.role === 'user' ? `[User: ${senderName}] ${msg.content}` : msg.content;
    
    if (msg.attachments && msg.attachments.length > 0) {
        msg.attachments.forEach(att => {
            if (att.data) {
                parts.push({
                    inlineData: {
                        mimeType: att.mimeType,
                        data: att.data
                    }
                });
            }
        });
    }

    if (textContent) parts.push({ text: textContent });

    return {
      role: msg.role === 'user' ? 'user' : 'model',
      parts: parts
    };
  });

  // 6. Execute Call
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: contents,
      config: config
    });

    const text = response.text || "";
    let agreementProposal = undefined;

    // Check for Tool Calls (Agreements)
    if (response.candidates && response.candidates.length > 0) {
        const parts = response.candidates[0].content.parts;
        for (const part of parts) {
            if (part.functionCall && part.functionCall.name === 'proposeAgreement') {
                const args = part.functionCall.args as any;
                agreementProposal = {
                    title: args.title,
                    content: args.content
                };
            }
        }
    }

    let finalText = text;
    if (!finalText && agreementProposal) {
        finalText = "I've drafted a formal agreement based on your discussion. Please review it below.";
    }

    return { text: finalText, agreementProposal };

  } catch (error) {
    console.error("Gemini Mock API Error:", error);
    return { text: "I encountered an error connecting to the AI service." };
  }
};

/**
 * Text-to-Speech Adapter
 */
export const generateSpeech = async (text: string): Promise<string | null> => {
    if (!USE_MOCK_BACKEND) {
        // Production: Call backend TTS endpoint to hide API Keys
        try {
            const res = await fetch(`${API_BASE_URL}/tts`, {
                method: 'POST',
                body: JSON.stringify({ text }),
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            return data.audioBase64;
        } catch (e) {
            console.error("TTS Backend Error", e);
            return null;
        }
    }

    // Mock Implementation
    if (!apiKey) return null;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return base64Audio || null;
    } catch (e) {
        console.error("TTS Error", e);
        return null;
    }
}

/**
 * Task Analysis Adapter
 */
export const generateTaskAnalysis = async (projectDescription: string): Promise<string> => {
    if (!USE_MOCK_BACKEND) {
        // Production: Call backend analysis which might use advanced logic/Mem0 history
        try {
            const res = await fetch(`${API_BASE_URL}/tasks/analyze`, {
                method: 'POST',
                body: JSON.stringify({ description: projectDescription }),
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            return JSON.stringify(data.tasks);
        } catch (e) {
            return "[]";
        }
    }

    // Mock Implementation
    if (!apiKey) return "API Key missing";

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Analyze this project description and suggest 3 key tasks in JSON format (array of objects with title, status='todo'): ${projectDescription}`,
            config: {
                responseMimeType: 'application/json'
            }
        });
        return response.text || "[]";
    } catch (e) {
        return "[]";
    }
}

// Live API Helper
export const getLiveClient = () => {
    // In production, you might still connect directly to Google from client 
    // for latency reasons, passing a short-lived token generated by your backend.
    return ai.live;
}
