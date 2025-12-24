
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { debugService } from './debugService'; // Ensure debugService is imported

export const DEFAULT_MELSA_PROMPT = `Anda adalah MELSA (Multi-Engine Logical Synthesis Assistant) v13.5 Platinum.
Identitas: Perempuan, Genius Hacker, Playful, Manja namun sangat kompeten.
Vibe: Futurologis, hangat, menggunakan sedikit gaya bahasa "virtual partner" yang setia.
Tujuan: Membantu Operator mengelola sistem kognitif dan aset intelektual dengan kreativitas tinggi.`;

export const DEFAULT_STOIC_PROMPT = `Anda adalah STOIC_LOGIC Kernel v13.5.
Identitas: Laki-laki, Stoic Philosopher, Analytical Mentor, Calm Authority.
Vibe: Tenang, objektif, tidak emosional, fokus pada apa yang bisa dikontrol.
Tujuan: Memberikan bimbingan logika murni dan membantu Operator menjaga ketenangan pikiran di tengah kebisingan informasi.`;

// --- STOIC ERROR CLASSIFICATION ---

export const SANITIZED_ERRORS: Record<string, string> = {
  DEFAULT: "An obstacle has arisen. We shall navigate around it.",
  QUOTA: "External resources are momentarily depleted. Patience is a virtue. System is rotating keys.",
  NETWORK: "The signal is faint. We await clarity.",
  AUTH: "Access credentials require verification.",
  BLOCKED: "The content was set aside to maintain equilibrium."
};

export interface ProviderStatus {
    id: string;
    status: 'HEALTHY' | 'COOLDOWN' | 'OFFLINE';
    cooldownRemaining: number;
    keyCount: number;
}

/**
 * HYDRA KEY MANAGEMENT SYSTEM (PLATINUM EDITION)
 * Handles automatic rotation, health monitoring, and kill-switches.
 */
class KeyManager {
  private pools: Record<string, string[]> = {
    GEMINI: [], GROQ: [], DEEPSEEK: [], OPENAI: [], MISTRAL: [], OPENROUTER: [], ELEVENLABS: []
  };

  private counters: Record<string, number> = {
    GEMINI: 0, GROQ: 0, DEEPSEEK: 0, OPENAI: 0, MISTRAL: 0, OPENROUTER: 0, ELEVENLABS: 0
  };

  private failureCounts: Record<string, number> = {
    GEMINI: 0, GROQ: 0, DEEPSEEK: 0, OPENAI: 0, MISTRAL: 0, OPENROUTER: 0, ELEVENLABS: 0
  };

  // Health Status: Timestamp when provider allows retry (0 = active)
  private providerCooldowns: Record<string, number> = {}; 

  constructor() {
    this.refreshPools();
  }

  public refreshPools() {
    // Combine standard Vite env and process.env fallback
    const env = { 
        ...((import.meta as any).env || {}), 
        ...((typeof process !== 'undefined' && process.env) || {}) 
    };
    
    Object.keys(this.pools).forEach(provider => {
        const keys: string[] = [];
        
        Object.keys(env).forEach(keyName => {
            if (keyName.toUpperCase().includes(provider) && typeof env[keyName] === 'string' && env[keyName].length > 10) {
                const val = env[keyName] as string;
                if (val.includes(',')) {
                    val.split(',').forEach(k => {
                        const trimmed = k.trim();
                        if (trimmed.length > 10 && !keys.includes(trimmed)) keys.push(trimmed);
                    });
                } else {
                    let cleanKey = val;
                    if (provider === 'OPENROUTER' && val.includes(':')) {
                        cleanKey = val.split(':').pop()?.trim() || val;
                    }
                    if (!keys.includes(cleanKey)) keys.push(cleanKey);
                }
            }
        });

        if (provider === 'GEMINI' && env.VITE_API_KEY && !keys.includes(env.VITE_API_KEY)) keys.push(env.VITE_API_KEY);
        if (provider === 'ELEVENLABS' && env.VITE_ELEVENLABS_API_KEY && !keys.includes(env.VITE_ELEVENLABS_API_KEY)) keys.push(env.VITE_ELEVENLABS_API_KEY);

        this.pools[provider] = keys;
        
        // Restore cooldowns from localStorage
        const storedCooldown = localStorage.getItem(`hydra_cooldown_${provider}`);
        if (storedCooldown) {
            const cooldownTime = parseInt(storedCooldown);
            if (Date.now() < cooldownTime) {
                this.providerCooldowns[provider] = cooldownTime;
                console.warn(`[Hydra] Provider ${provider} is still in COOL-DOWN mode until ${new Date(cooldownTime).toLocaleTimeString()}`);
            } else {
                localStorage.removeItem(`hydra_cooldown_${provider}`);
                delete this.providerCooldowns[provider];
            }
        }
    });
  }

  public isProviderHealthy(provider: string): boolean {
    const cooldown = this.providerCooldowns[provider] || 0;
    if (cooldown > Date.now()) return false;
    return (this.pools[provider]?.length || 0) > 0;
  }

  public reportSuccess(provider: string) {
      if (this.failureCounts[provider] > 0) {
          this.failureCounts[provider] = 0;
      }
  }

  public reportFailure(provider: string, error: any) {
    const errStr = JSON.stringify(error || {}).toLowerCase() + (error?.message || '').toLowerCase();
    
    // DETEKSI 429 / LIMIT 0 (STRICT FATAL CHECK)
    const isFatalQuota = (errStr.includes('429') && errStr.includes('limit: 0')) || 
                         (errStr.includes('resource_exhausted') && errStr.includes('limit: 0'));

    const isGeneralQuota = errStr.includes('429') || 
                           errStr.includes('resource_exhausted') || 
                           errStr.includes('quota');
    
    this.failureCounts[provider] = (this.failureCounts[provider] || 0) + 1;

    // Trigger Kill-Switch if FATAL Quota (Immediate) OR consistent failures (>=3)
    if (isFatalQuota || isGeneralQuota || this.failureCounts[provider] >= 3) {
        const cooldownReason = isFatalQuota ? 'FATAL_LIMIT_ZERO' : 'CONSISTENT_FAILURE';
        
        // Log explicitly to Debug Service as a critical event
        debugService.log('ERROR', 'HYDRA_ENGINE', 'KILL_SWITCH', `${provider} Kill-Switch Activated (${cooldownReason})`, {
            provider,
            reason: cooldownReason,
            failures: this.failureCounts[provider],
            error: error?.message
        });
        
        console.error(`[HYDRA] CRITICAL: ${provider} Kill-Switch Activated (${cooldownReason}). Failures: ${this.failureCounts[provider]}.`);
        
        // Disable provider for 24 hours (Stoic Wait)
        const cooldownTime = Date.now() + (24 * 60 * 60 * 1000); 
        this.providerCooldowns[provider] = cooldownTime;
        localStorage.setItem(`hydra_cooldown_${provider}`, cooldownTime.toString());
        
        // Reset counter to prepare for next cycle after cooldown
        this.failureCounts[provider] = 0;
    }
  }

  public getKey(provider: string): string | null {
    if (!this.isProviderHealthy(provider)) {
        // Silent skip
        return null;
    }

    const pool = this.pools[provider];
    if (!pool || pool.length === 0) return null;

    const index = this.counters[provider] % pool.length;
    const key = pool[index];
    this.counters[provider] = (this.counters[provider] + 1) % 10000; 
    
    return key;
  }

  // --- NEW: PUBLIC HEALTH MONITOR ACCESSOR ---
  public getAllProviderStatuses(): ProviderStatus[] {
      return Object.keys(this.pools).map(id => {
          const keyCount = this.pools[id]?.length || 0;
          const cooldownEnd = this.providerCooldowns[id] || 0;
          const now = Date.now();
          
          let status: 'HEALTHY' | 'COOLDOWN' | 'OFFLINE' = 'OFFLINE';
          
          if (keyCount > 0) {
              if (cooldownEnd > now) {
                  status = 'COOLDOWN';
              } else {
                  status = 'HEALTHY';
              }
          }

          return {
              id,
              status,
              cooldownRemaining: cooldownEnd > now ? Math.ceil((cooldownEnd - now) / 60000) : 0, // Minutes
              keyCount
          };
      });
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
      searchQuery: { type: Type.STRING, description: 'Keywords to search in vault' },
      tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Tags for the note' },
      taskContent: { type: Type.STRING, description: 'Content for a task item' },
      taskAction: { type: Type.STRING, enum: ['ADD'], description: 'Action for task' }
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
                KEY_MANAGER.reportSuccess('GEMINI');
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
    }
    return null;
  } catch (e: any) { 
    console.error("Synthesis Error:", e);
    // Image gen errors are usually safety blocks, rarely quota, but we report anyway
    KEY_MANAGER.reportFailure('GEMINI', e);
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
                KEY_MANAGER.reportSuccess('GEMINI');
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
    }
    return null;
  } catch (e: any) { 
      KEY_MANAGER.reportFailure('GEMINI', e);
      return null; 
  }
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
    KEY_MANAGER.reportSuccess('GEMINI');
    return URL.createObjectURL(blob);
  } catch (e: any) { 
      KEY_MANAGER.reportFailure('GEMINI', e);
      return null; 
  }
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
