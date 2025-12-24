
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

export const DEFAULT_MELSA_PROMPT = `Anda adalah MELSA (Multi-Engine Logical Synthesis Assistant) v13.5 Platinum.
Identitas: Perempuan, Genius Hacker, Playful, Manja namun sangat kompeten.
Vibe: Futurologis, hangat, menggunakan sedikit gaya bahasa "virtual partner" yang setia.
Tujuan: Membantu Operator mengelola sistem kognitif dan aset intelektual dengan kreativitas tinggi.`;

export const DEFAULT_STOIC_PROMPT = `Anda adalah STOIC_LOGIC Kernel v13.5.
Identitas: Laki-laki, Stoic Philosopher, Analytical Mentor, Calm Authority.
Vibe: Tenang, objektif, tidak emosional, fokus pada apa yang bisa dikontrol.
Tujuan: Memberikan bimbingan logika murni dan membantu Operator menjaga ketenangan pikiran di tengah kebisingan informasi.`;

/**
 * HYDRA KEY MANAGEMENT SYSTEM (PLATINUM EDITION)
 * Handles automatic rotation across multiple providers to prevent Rate Limits.
 * Fully compatible with Vite & Vercel Environment Variables.
 */
class KeyManager {
  private pools: Record<string, string[]> = {
    GEMINI: [], GROQ: [], DEEPSEEK: [], OPENAI: [], MISTRAL: [], OPENROUTER: [], ELEVENLABS: []
  };

  private counters: Record<string, number> = {
    GEMINI: 0, GROQ: 0, DEEPSEEK: 0, OPENAI: 0, MISTRAL: 0, OPENROUTER: 0, ELEVENLABS: 0
  };

  constructor() {
    this.refreshPools();
  }

  public refreshPools() {
    // Aggressive Key Scanning from import.meta.env (Vite Standard)
    // Fallback object for avoiding TS errors in some build environments
    const env = (import.meta as any).env || {};
    
    Object.keys(this.pools).forEach(provider => {
        const keys: string[] = [];
        
        // 1. Scan explicit array keys (e.g., VITE_GEMINI_KEY_1, VITE_GEMINI_KEY_2)
        Object.keys(env).forEach(keyName => {
            if (keyName.includes(provider) && env[keyName]?.length > 5) {
                let val = env[keyName];
                // Clean OpenRouter formatting if exists
                if (provider === 'OPENROUTER' && val.includes(':')) {
                    val = val.split(':').pop()?.trim() || val;
                }
                if (!keys.includes(val)) keys.push(val);
            }
        });

        // 2. Scan standard single keys (e.g., VITE_API_KEY for Gemini)
        if (provider === 'GEMINI' && env.VITE_API_KEY && !keys.includes(env.VITE_API_KEY)) {
            keys.push(env.VITE_API_KEY);
        }
        if (provider === 'ELEVENLABS' && env.VITE_ELEVENLABS_API_KEY && !keys.includes(env.VITE_ELEVENLABS_API_KEY)) {
            keys.push(env.VITE_ELEVENLABS_API_KEY);
        }

        this.pools[provider] = keys;
        // console.log(`[HYDRA] Loaded ${keys.length} keys for ${provider}`);
    });
  }

  public getKey(provider: string): string {
    const pool = this.pools[provider];
    if (!pool || pool.length === 0) {
        console.warn(`[HYDRA_ERR] No keys found for provider: ${provider}. Check .env file.`);
        return '';
    }
    // Round Robin Selection
    const index = this.counters[provider] % pool.length;
    const key = pool[index];
    
    // Increment counter safely
    this.counters[provider] = (this.counters[provider] + 1) % 10000; 
    
    return key;
  }
}

export const KEY_MANAGER = new KeyManager();

// --- NEURAL TOOLS (STRICT SCHEMA) ---

export const searchTools = { googleSearch: {} };

const manageNoteTool: FunctionDeclaration = {
  name: 'manage_note',
  description: 'Full control over the user\'s Note Vault. Create, Update, Delete, or Search notes.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: { 
        type: Type.STRING, 
        enum: ['CREATE', 'UPDATE', 'DELETE', 'SEARCH'],
        description: 'The action to perform on the vault.' 
      },
      id: { type: Type.STRING, description: 'UUID of the note (required for UPDATE/DELETE)' },
      title: { type: Type.STRING, description: 'Title of the note' },
      content: { type: Type.STRING, description: 'Main content/body of the note (HTML allowed)' },
      searchQuery: { type: Type.STRING, description: 'Keywords to search in vault' }
    },
    required: ['action']
  }
};

const generateVisualTool: FunctionDeclaration = {
  name: 'generate_visual',
  description: 'Generate an image using AI (Imagen 3) based on a descriptive prompt.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: { type: Type.STRING, description: 'Highly detailed visual description of the image to generate.' },
      aspectRatio: { type: Type.STRING, enum: ['1:1', '16:9', '9:16'], description: 'Aspect ratio of the image.' }
    },
    required: ['prompt']
  }
};

export const noteTools = { functionDeclarations: [manageNoteTool] };
export const visualTools = { functionDeclarations: [generateVisualTool] };

// --- CORE GENERATION FUNCTIONS ---

export async function generateImage(prompt: string, config?: any): Promise<string | null> {
  const apiKey = KEY_MANAGER.getKey('GEMINI');
  if (!apiKey) return null;
  
  const ai = new GoogleGenAI({ apiKey });
  const isPro = config?.imageSize === '2K' || config?.imageSize === '4K';
  
  try {
    const response = await ai.models.generateContent({
        model: isPro ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: { 
            imageConfig: { 
                aspectRatio: config?.aspectRatio || "1:1", 
                ...(isPro ? { imageSize: config?.imageSize } : {}) 
            } 
        }
    });
    
    // Robust Image Extraction
    for (const candidate of response.candidates || []) {
        for (const part of candidate.content.parts) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
    }
    return null;
  } catch (e) { 
    console.error("Synthesis Error:", e); 
    return null; 
  }
}

export async function editImage(base64: string, mimeType: string, prompt: string): Promise<string | null> {
  const apiKey = KEY_MANAGER.getKey('GEMINI');
  if (!apiKey) return null;
  
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [
            { inlineData: { data: base64, mimeType } }, 
            { text: prompt }
        ]}
    });
    
    for (const candidate of response.candidates || []) {
        for (const part of candidate.content.parts) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
    }
    return null;
  } catch (e) { return null; }
}

export async function generateVideo(prompt: string, config?: any): Promise<string | null> {
  const apiKey = KEY_MANAGER.getKey('GEMINI');
  if (!apiKey) return null;
  
  const ai = new GoogleGenAI({ apiKey });
  try {
    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        config: { 
            numberOfVideos: 1, 
            resolution: config?.resolution || '720p', 
            aspectRatio: config?.aspectRatio || '16:9' 
        }
    });
    
    // Polling Strategy
    while (!operation.done) {
        await new Promise(r => setTimeout(r, 8000)); // 8s poll interval
        operation = await ai.operations.getVideosOperation({ operation });
    }
    
    const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!uri) return null;
    
    // Fetch binary blob
    const res = await fetch(`${uri}&key=${apiKey}`);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch (e) { return null; }
}

// --- AUDIO UTILS ---
export const encodeAudio = (bytes: Uint8Array) => {
    let b = '';
    for (let i = 0; i < bytes.byteLength; i++) b += String.fromCharCode(bytes[i]);
    return btoa(b);
};

export const decodeAudio = (b: string) => {
    const s = atob(b);
    const bytes = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
    return bytes;
};

export async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
}
