
import { GoogleGenAI } from "@google/genai";
import { debugService } from "./debugService";
import { HANISAH_BRAIN } from "./melsaBrain";
import { noteTools, visualTools, searchTools, universalTools } from "./geminiService";
import { GLOBAL_VAULT, Provider } from "./hydraVault"; 
import { mechanicTools } from "../features/mechanic/mechanicTools";
import { streamOpenAICompatible, streamPuterChat } from "./providerEngine";
import { runHanisahRace } from "./melsaOmni"; 
import { type ModelMetadata } from "../types";
import { KEY_MANAGER } from "./geminiService"; 

export const MODEL_CATALOG: ModelMetadata[] = [
  // --- GEMINI (GOOGLE) ---
  { 
    id: 'gemini-2.0-flash-exp', 
    name: 'Gemini 2.0 Flash (Exp)', 
    category: 'GEMINI_2_5', 
    provider: 'GEMINI', 
    description: 'Model tercepat & terpintar. Sangat disarankan untuk Vercel.', 
    specs: { context: '1M', speed: 'INSTANT', intelligence: 9.7 } 
  },
  { 
    id: 'gemini-1.5-flash', 
    name: 'Gemini 1.5 Flash', 
    category: 'GEMINI_2_5', 
    provider: 'GEMINI', 
    description: 'Fallback paling stabil & cepat.', 
    specs: { context: '1M', speed: 'FAST', intelligence: 9.0 } 
  },
  { 
    id: 'gemini-1.5-pro-latest', 
    name: 'Gemini 1.5 Pro', 
    category: 'GEMINI_3', 
    provider: 'GEMINI', 
    description: 'Reasoning tinggi. Warning: Lambat (Timeout Risk).', 
    specs: { context: '2M', speed: 'THINKING', intelligence: 9.9 } 
  },
  {
    id: 'auto-best',
    name: 'Auto Pilot (Hydra)',
    category: 'GEMINI_2_5',
    provider: 'GEMINI', 
    description: 'Otomatis memilih jalur tercepat.',
    specs: { context: 'AUTO', speed: 'INSTANT', intelligence: 9.8 } 
  },

  // --- PUTER (X.AI) ---
  { 
    id: 'x-ai/grok-4.1-fast', 
    name: 'Grok 4.1 Fast (Puter)', 
    category: 'GROQ_VELOCITY', 
    provider: 'PUTER', 
    description: 'Ultra-fast inference from X.AI via Puter.js.', 
    specs: { context: '128K', speed: 'INSTANT', intelligence: 9.2 } 
  },
  { 
    id: 'x-ai/grok-2-1212', 
    name: 'Grok 2 (Puter)', 
    category: 'GROQ_VELOCITY', 
    provider: 'PUTER', 
    description: 'Advanced reasoning by X.AI via Puter.js.', 
    specs: { context: '128K', speed: 'FAST', intelligence: 9.4 } 
  },

  // --- GROQ (LLAMA - BEST FREE FALLBACK) ---
  { 
    id: 'llama-3.3-70b-versatile', 
    name: 'Llama 3.3 70B (Groq)', 
    category: 'GROQ_VELOCITY', 
    provider: 'GROQ', 
    description: 'Speed Demon. Sempurna untuk Vercel.', 
    specs: { context: '128K', speed: 'INSTANT', intelligence: 9.3 } 
  },
  { 
    id: 'llama-3.1-8b-instant', 
    name: 'Llama 3.1 8B (Groq)', 
    category: 'GROQ_VELOCITY', 
    provider: 'GROQ', 
    description: 'Ultra ringan.', 
    specs: { context: '128K', speed: 'INSTANT', intelligence: 8.5 } 
  },

  // --- MISTRAL ---
  { 
    id: 'mistral-large-latest', 
    name: 'Mistral Large', 
    category: 'MISTRAL_NATIVE', 
    provider: 'MISTRAL', 
    description: 'Model flagship Eropa. Sangat logis & akurat.', 
    specs: { context: '128K', speed: 'FAST', intelligence: 9.6 } 
  },
  { 
    id: 'mistral-small-latest', 
    name: 'Mistral Small', 
    category: 'MISTRAL_NATIVE', 
    provider: 'MISTRAL', 
    description: 'Ringan, cepat, efisien.', 
    specs: { context: '32K', speed: 'INSTANT', intelligence: 8.9 } 
  },

  // --- OPENAI ---
  { 
    id: 'gpt-4o-mini', 
    name: 'GPT-4o Mini', 
    category: 'OPEN_ROUTER_ELITE', 
    provider: 'OPENAI', 
    description: 'Efisien & Murah.', 
    specs: { context: '128K', speed: 'INSTANT', intelligence: 9.2 } 
  },

  // --- DEEPSEEK ---
  { 
    id: 'deepseek-chat', 
    name: 'DeepSeek V3', 
    category: 'DEEPSEEK_OFFICIAL', 
    provider: 'DEEPSEEK', 
    description: 'Alternatif coding.', 
    specs: { context: '64K', speed: 'FAST', intelligence: 9.5 } 
  }
];

export interface StreamChunk {
  text?: string;
  functionCall?: any;
  groundingChunks?: any[];
  metadata?: any;
}

export class HanisahKernel {
  private history: any[] = [];

  private getActiveTools(provider: string, isThinking: boolean): any[] {
      if (provider === 'GEMINI') {
          if (isThinking) return []; 
          
          const configStr = localStorage.getItem('hanisah_tools_config');
          const config = configStr ? JSON.parse(configStr) : { search: true, vault: true, visual: true };
          
          const tools: any[] = [];
          if (config.vault && noteTools) tools.push(noteTools);
          if (config.visual && visualTools) tools.push(visualTools);
          if (config.search) tools.push(searchTools); 
          if (mechanicTools) tools.push(mechanicTools);
          return tools;
      } 
      else {
          if (isThinking) return [];
          return universalTools.functionDeclarations ? [universalTools] : [];
      }
  }

  private isOmniRaceEnabled(): boolean {
      try {
          const stored = localStorage.getItem('sys_feature_flags');
          if (!stored) return true; 
          const flags = JSON.parse(stored);
          return flags['OMNI_RACE'] !== false; 
      } catch (e) { return true; }
  }

  async *streamExecute(msg: string, initialModelId: string, context?: string, imageData?: { data: string, mimeType: string }, configOverride?: any): AsyncGenerator<StreamChunk> {
    const systemPrompt = configOverride?.systemInstruction || HANISAH_BRAIN.getSystemInstruction('hanisah', context);
    const signal = configOverride?.signal; 

    // FORCE OVERRIDE: If user selected a "ghost" model ID (like 3.0 preview which might not be in API yet), fallback to 2.0 Flash
    let currentModelId = initialModelId;
    if (currentModelId.includes('3-pro') || currentModelId.includes('3.0')) {
        // Safe check: assume 3.0 is unstable on Vercel unless explicitly whitelisted
        // currentModelId = 'gemini-1.5-pro-latest'; 
    }

    if (initialModelId === 'auto-best') {
        const isEnabled = this.isOmniRaceEnabled();
        if (!isEnabled) {
            yield { metadata: { systemStatus: "Omni-Race Disabled. Switching to Flash...", isRerouting: true } };
            currentModelId = 'gemini-2.0-flash-exp'; 
        } else {
            try {
                const hanisahImg = imageData ? { data: imageData.data, mimeType: imageData.mimeType } : null;
                const response = await runHanisahRace(msg, hanisahImg);
                if (signal?.aborted) throw new Error("ABORTED");
                
                yield { text: response.text };
                
                if (response.provider && response.model) {
                    yield { 
                        metadata: { 
                            provider: response.provider, 
                            model: response.model,
                            status: 'success'
                        } 
                    };
                }

                this.updateHistory(msg, response.text);
                return;
            } catch (e: any) {
                if (e.message === "ABORTED" || signal?.aborted) return;
                yield { metadata: { systemStatus: `Omni-Engine Busy. Switching to Flash...`, isRerouting: true } };
                currentModelId = 'gemini-2.0-flash-exp';
            }
        }
    }

    let attempts = 0;
    const maxAttempts = 15; // Increased attempts to cycle through all 8+ keys if needed

    while (attempts < maxAttempts) {
        if (signal?.aborted) break;
        attempts++;
        
        // Find model metadata, default to Flash if ID not found
        const model = MODEL_CATALOG.find(m => m.id === currentModelId) || MODEL_CATALOG[0];
        const provider = model.provider;
        
        // REQUEST KEY FROM HYDRA (Will get the least-used ACTIVE key)
        const key = GLOBAL_VAULT.getKey(provider as Provider);

        if (!key) {
            debugService.log('WARN', 'KERNEL', 'NO_KEY', `All keys for ${provider} are exhausted/cooldown.`);
            
            // EMERGENCY FALLBACK CHAIN (Cross-Provider)
            if (provider === 'GEMINI') {
                if (KEY_MANAGER.getKey('GROQ')) {
                    currentModelId = 'llama-3.3-70b-versatile';
                    yield { metadata: { systemStatus: "Gemini Exhausted. Rerouting to Groq...", isRerouting: true } };
                    continue;
                } else if (KEY_MANAGER.getKey('MISTRAL')) {
                    currentModelId = 'mistral-small-latest';
                    yield { metadata: { systemStatus: "Gemini Exhausted. Rerouting to Mistral...", isRerouting: true } };
                    continue;
                }
            } else if (provider === 'GROQ') {
                 if (KEY_MANAGER.getKey('GEMINI')) {
                    currentModelId = 'gemini-1.5-flash'; 
                    yield { metadata: { systemStatus: "Groq Exhausted. Rerouting to Gemini...", isRerouting: true } };
                    continue;
                 }
            }
            
            yield { text: `\n\n> ⛔ *CRITICAL: No active API keys found. Please check Environment Variables.*` };
            break;
        }

        try {
            const isThinking = model.specs.speed === 'THINKING';
            const activeTools = configOverride?.tools || this.getActiveTools(provider, isThinking);

            if (provider === 'GEMINI') {
                const ai = new GoogleGenAI({ apiKey: key });
                const config: any = { systemInstruction: systemPrompt, temperature: 0.7 };
                
                if (activeTools.length > 0 && !isThinking) config.tools = activeTools;
                if (isThinking) config.thinkingConfig = { thinkingBudget: 1024 }; 

                const contents = [
                    ...this.history.map(h => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: h.content }] })), 
                    { role: 'user', parts: imageData ? [{ inlineData: imageData }, { text: msg }] : [{ text: msg }] }
                ];

                const stream = await ai.models.generateContentStream({ model: model.id, contents, config });
                let fullText = "";
                for await (const chunk of stream) {
                    if (signal?.aborted) break;
                    if (chunk.text) { fullText += chunk.text; yield { text: chunk.text }; }
                    if (chunk.functionCalls?.length) yield { functionCall: chunk.functionCalls[0] };
                }
                if (signal?.aborted) return;
                this.updateHistory(msg, fullText);
                GLOBAL_VAULT.reportSuccess(provider as Provider);
                return;
            } else if (provider === 'PUTER') {
                const stream = streamPuterChat(model.id, [{ role: 'user', content: msg }], systemPrompt, signal);
                let fullText = "";
                for await (const chunk of stream) {
                    if (signal?.aborted) break;
                    if (chunk.text) { fullText += chunk.text; yield { text: chunk.text }; }
                }
                if (signal?.aborted) return;
                this.updateHistory(msg, fullText);
                GLOBAL_VAULT.reportSuccess(provider as Provider);
                return;
            } else {
                const stream = streamOpenAICompatible(provider as any, model.id, [{ role: 'user', content: msg }], systemPrompt, activeTools, signal);
                let fullText = "";
                for await (const chunk of stream) {
                    if (signal?.aborted) break;
                    if (chunk.text) { fullText += chunk.text; yield { text: chunk.text }; }
                    if (chunk.functionCall) yield { functionCall: chunk.functionCall };
                }
                if (signal?.aborted) return;
                this.updateHistory(msg, fullText);
                GLOBAL_VAULT.reportSuccess(provider as Provider);
                return;
            }
        } catch (err: any) {
            if (signal?.aborted) return;
            
            // REPORT FAILURE TO HYDRA (Will trigger penalty/cooldown for this key)
            GLOBAL_VAULT.reportFailure(provider as Provider, key, err);
            
            const errStr = JSON.stringify(err);
            const isQuota = errStr.includes('429') || errStr.includes('resource_exhausted') || errStr.includes('quota');
            const isNotFound = errStr.includes('404') || errStr.includes('not found');
            const isTimeout = errStr.includes('timeout') || errStr.includes('504');
            
            console.warn(`[KERNEL] Error on ${model.id}: ${err.message}`);

            if (isQuota || isNotFound || isTimeout) {
                // IMPORTANT: Check for alternative keys within the SAME provider first
                // HydraVault has already marked the bad key as COOLDOWN, so calling getKey() again
                // will return a different key if one exists.
                if (GLOBAL_VAULT.hasAlternativeKeys(provider as Provider)) {
                    yield { metadata: { systemStatus: `${provider} Limit. Rotating key...`, isRerouting: true } };
                    continue; // Loop again -> Get New Key -> Retry
                }

                // Only if NO keys left for this provider, downgrade/switch
                if (currentModelId.includes('pro') || currentModelId.includes('3')) {
                    currentModelId = 'gemini-1.5-flash'; 
                    yield { metadata: { systemStatus: "Model Timeout/Limit on Vercel. Downgrading to Flash...", isRerouting: true } };
                } else if (provider === 'GEMINI') {
                    if (KEY_MANAGER.getKey('GROQ')) {
                        currentModelId = 'llama-3.3-70b-versatile';
                        yield { metadata: { systemStatus: "Gemini Unstable. Switching to Groq...", isRerouting: true } };
                    }
                }
                continue; 
            }
            
            yield { text: `\n\n> ⚠️ *Connection Error:* ${err.message}. Check Vercel Logs.` };
            throw err;
        }
    }
  }

  async execute(msg: string, modelId: string, context?: string, configOverride?: any): Promise<StreamChunk> {
    const it = this.streamExecute(msg, modelId, context, undefined, configOverride);
    let fullText = "";
    let finalChunk: StreamChunk = {};
    for await (const chunk of it) {
        if (chunk.text) fullText += chunk.text;
        if (chunk.functionCall) finalChunk.functionCall = chunk.functionCall;
        if (chunk.groundingChunks) finalChunk.groundingChunks = chunk.groundingChunks;
        if (chunk.metadata) finalChunk.metadata = chunk.metadata;
    }
    return { ...finalChunk, text: fullText };
  }

  private updateHistory(u: string, a: string) {
    this.history.push({ role: 'user', content: u }, { role: 'assistant', content: a });
    if (this.history.length > 6) this.history = this.history.slice(-6);
  }
}

export const HANISAH_KERNEL = new HanisahKernel();
