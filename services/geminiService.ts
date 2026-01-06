
import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { Message, User, Document, Persona, Attachment } from "../types";

// Initialize the API client
const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

export const generateResponse = async (
  history: Message[],
  currentUser: User,
  activePersona: Persona,
  activeDocs: Document[],
  allUsers: User[],
  useThinking: boolean = false
): Promise<string> => {
  if (!apiKey) {
    return "Error: API_KEY is missing from environment variables.";
  }

  // Construct Context String from RAG documents
  const contextString = activeDocs.map(doc => 
    `--- DOCUMENT: ${doc.name} ---\n${doc.content}\n----------------`
  ).join('\n\n');

  // Construct User Directory for the model to know who is who
  const userDirectory = allUsers.map(u => `${u.name} (ID: ${u.id})`).join(', ');

  // Create System Instruction
  const systemInstruction = `
    ${activePersona.systemInstruction}
    
    TONE INSTRUCTIONS: ${activePersona.tone}
    
    CONTEXT / KNOWLEDGE BASE:
    ${contextString || "No external documents loaded."}
    
    USER DIRECTORY:
    ${userDirectory}
    
    IMPORTANT:
    - You are in a multi-user chat environment.
    - Messages will be prefixed with the user's name.
    - Address users directly by their name when responding.
    - You can facilitate conversations between users.
    - If a user asks to schedule something, check the current date/time: ${new Date().toLocaleString()}.
  `;

  // Determine Model and Config
  // Logic: 
  // 1. If thinking is requested -> gemini-3-pro-preview
  // 2. If images/video present in LATEST message -> gemini-3-pro-preview
  // 3. Default -> gemini-3-flash-preview
  
  const lastMsg = history[history.length - 1];
  const hasMedia = lastMsg.attachments && lastMsg.attachments.some(a => a.type === 'image' || a.type === 'video');
  
  let model = 'gemini-3-flash-preview';
  let config: any = {
    systemInstruction: systemInstruction,
    temperature: 0.7,
  };

  if (useThinking) {
    model = 'gemini-3-pro-preview';
    config = {
        ...config,
        thinkingConfig: { thinkingBudget: 32768 },
        temperature: undefined, // Thinking models often manage their own temp or require different handling, but API usually accepts it.
        // Important: Do not set maxOutputTokens when using thinking budget
    };
  } else if (hasMedia) {
    model = 'gemini-3-pro-preview'; // Use Pro for vision tasks as requested
  }

  // Format History for Gemini
  // We need to properly structure multimodal content
  const contents = history.map(msg => {
    const senderName = msg.role === 'user' 
      ? allUsers.find(u => u.id === msg.userId)?.name || 'Unknown User'
      : 'Model';
    
    const parts: any[] = [];
    
    // Add text prefix for user identification
    let textContent = msg.role === 'user' ? `[User: ${senderName}] ${msg.content}` : msg.content;
    
    // Add attachments if any
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

    // Add text part last (convention, though not strictly required)
    if (textContent) {
        parts.push({ text: textContent });
    }

    return {
      role: msg.role === 'user' ? 'user' : 'model',
      parts: parts
    };
  });

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: contents,
      config: config
    });

    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I encountered an error connecting to the AI service.";
  }
};

export const generateSpeech = async (text: string): Promise<string | null> => {
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

export const generateTaskAnalysis = async (projectDescription: string): Promise<string> => {
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

// Live API Helper (Wrapper for clean component usage)
export const getLiveClient = () => {
    return ai.live;
}
