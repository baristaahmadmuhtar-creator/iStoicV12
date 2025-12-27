
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { debugService } from './debugService';
import { GLOBAL_VAULT, Provider } from "./hydraVault";

export const SANITIZED_ERRORS: Record<string, string> = {
  DEFAULT: "An obstacle has arisen. We shall navigate around it.",
  QUOTA: "Resources exhausted. System is rotating keys.",
  BALANCE: "Node balance insufficient. Switching providers.",
  NETWORK: "The signal is faint. We await clarity."
};

export interface ProviderStatus {
    id: string;
    status: 'HEALTHY' | 'COOLDOWN';
    keyCount: number;
    cooldownRemaining: number;
}

// Proxy Class to maintain compatibility with existing app code
class KeyManagerProxy {
  
  public refreshPools() {
    GLOBAL_VAULT.refreshPools();
  }

  public isProviderHealthy(provider: string): boolean {
    return GLOBAL_VAULT.isProviderHealthy(provider as Provider);
  }

  public reportFailure(provider: string, arg2: any, arg3?: any) {
      // Overload support: (provider, key, error) OR (provider, error)
      if (arg3 !== undefined) {
          // 3-arg signature: arg2 is key, arg3 is error
          GLOBAL_VAULT.reportFailure(provider as Provider, arg2, arg3);
      } else {
          // 2-arg signature: arg2 is error
          debugService.log('WARN', 'LEGACY_KEY_MGR', 'FAIL_REPORT', `Provider ${provider} reported failure without key context.`);
      }
  }

  public reportSuccess(provider: string) {
      GLOBAL_VAULT.reportSuccess(provider as Provider);
  }

  public getKey(provider: string): string | null {
    return GLOBAL_VAULT.getKey(provider as Provider);
  }

  public getAllProviderStatuses(): ProviderStatus[] {
      return GLOBAL_VAULT.getAllProviderStatuses();
  }
}

export const KEY_MANAGER = new KeyManagerProxy();

// --- UTILITIES ---

// 1. OPENAI GENERATOR
async function generateOpenAIImage(prompt: string, apiKey: string): Promise<string | null> {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: "1024x1024",
            response_format: "b64_json",
            quality: "standard",
            style: "vivid" 
        })
    });

    if (response.ok) {
        const json = await response.json();
        if (json.data?.[0]?.b64_json) {
            return `data:image/png;base64,${json.data[0].b64_json}`;
        }
    }
    throw new Error(await response.text());
}

// 2. GEMINI GENERATOR
async function generateGeminiImage(prompt: string, apiKey: string): Promise<string | null> {
    const ai = new GoogleGenAI({ apiKey });
    // Using gemini-2.0-flash-exp which handles image generation prompts natively.
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: { parts: [{ text: prompt }] },
    });
    // Iterate parts to find image, robust check
    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
    }
    return null;
}

export async function generateImage(prompt: string): Promise<string | null> {
  const openAiKey = KEY_MANAGER.getKey('OPENAI');
  const geminiKey = KEY_MANAGER.getKey('GEMINI');

  // Strategy: Try OpenAI -> Fallback Gemini (Higher quality first)
  // BUT if OpenAI key is missing, go straight to Gemini
  
  if (openAiKey) {
      try {
          const result = await generateOpenAIImage(prompt, openAiKey);
          if (result) {
              KEY_MANAGER.reportSuccess('OPENAI');
              return result;
          }
      } catch (e) {
          debugService.log('WARN', 'IMG_GEN', 'OPENAI_FAIL', 'DALL-E 3 failed, trying Gemini fallback.');
          GLOBAL_VAULT.reportFailure('OPENAI', openAiKey, e);
      }
  }

  if (geminiKey) {
      try {
          const result = await generateGeminiImage(prompt, geminiKey);
          if (result) {
              KEY_MANAGER.reportSuccess('GEMINI');
              return result;
          }
      } catch (e) {
          debugService.log('ERROR', 'IMG_GEN', 'GEMINI_FAIL', 'Imagen 3 failed.');
          GLOBAL_VAULT.reportFailure('GEMINI', geminiKey, e);
      }
  }

  // Last Resort: If User wanted Gemini originally (via UI) but it failed, maybe try OpenAI if we haven't already
  if (!openAiKey && geminiKey) {
      // Already tried Gemini.
      return null;
  }
  
  return null;
}

export async function generateVideo(prompt: string, config: any): Promise<string | null> {
    const key = KEY_MANAGER.getKey('GEMINI');
    if (!key) return null;
    const ai = new GoogleGenAI({ apiKey: key });
    try {
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt,
            config: {
                numberOfVideos: 1,
                resolution: config.resolution || '720p',
                aspectRatio: config.aspectRatio || '16:9'
            }
        });
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }
        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) return null;
        const response = await fetch(`${downloadLink}&key=${key}`);
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (e) {
        GLOBAL_VAULT.reportFailure('GEMINI', key, e);
    }
    return null;
}

export async function editImage(base64: string, mimeType: string, prompt: string): Promise<string | null> {
    const key = KEY_MANAGER.getKey('GEMINI');
    if (!key) return null;
    const ai = new GoogleGenAI({ apiKey: key });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash', // Fallback to stable for edits
            contents: {
                parts: [
                    { inlineData: { data: base64, mimeType } },
                    { text: prompt },
                ],
            },
        });
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return `data:image/png;base64,${part.inlineData.data}`;
                }
            }
        }
    } catch (e) {
        GLOBAL_VAULT.reportFailure('GEMINI', key, e);
    }
    return null;
}

export function encodeAudio(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decodeAudio(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
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

// --- TOOL DEFINITIONS ---

const manageNoteTool: FunctionDeclaration = {
  name: 'manage_note',
  description: 'Manage user notes in the vault. Use this to create, update, append to, or delete notes.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: { type: Type.STRING, description: 'CREATE, UPDATE, APPEND, or DELETE' },
      id: { type: Type.STRING, description: 'Note ID (required for UPDATE/APPEND/DELETE)' },
      title: { type: Type.STRING, description: 'Note Title' },
      content: { type: Type.STRING, description: 'Note Content (Markdown supported)' },
      appendContent: { type: Type.STRING, description: 'Content to append to existing note (for APPEND action)' },
      tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Tags for categorization' }
    },
    required: ['action']
  }
};

const searchNotesTool: FunctionDeclaration = {
    name: 'search_notes',
    description: 'Search through the user\'s local notes vault. Returns metadata and snippets of matching notes.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            query: { type: Type.STRING, description: 'Keywords to search for.' }
        },
        required: ['query']
    }
};

const readNoteTool: FunctionDeclaration = {
    name: 'read_note',
    description: 'Read the full content of a specific note by its ID.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            id: { type: Type.STRING, description: 'The ID of the note to read.' }
        },
        required: ['id']
    }
};

// --- VISUAL GENERATION TOOL ---
const generateVisualTool: FunctionDeclaration = {
    name: 'generate_visual',
    description: 'Generate an image based on a detailed text prompt. Use this when the user asks to see, draw, or generate a picture.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            prompt: { 
                type: Type.STRING, 
                description: 'A highly detailed visual description of the image to generate. Include style, lighting, and resolution keywords (e.g., 8k, photorealistic).' 
            }
        },
        required: ['prompt']
    }
};

export const noteTools = { functionDeclarations: [manageNoteTool, searchNotesTool, readNoteTool] };
export const visualTools = { functionDeclarations: [generateVisualTool] }; 
export const searchTools = { googleSearch: {} }; 

// Universal tools for Non-Gemini providers
export const universalTools = {
    functionDeclarations: [manageNoteTool, searchNotesTool, readNoteTool, generateVisualTool]
};
