
import { GoogleGenAI } from "@google/genai";
import { debugService } from "./debugService";
import { HANISAH_BRAIN } from "./melsaBrain";
import { noteTools, visualTools, searchTools, universalTools } from "./geminiService";
import { GLOBAL_VAULT, Provider } from "./hydraVault"; 
import { mechanicTools } from "../features/mechanic/mechanicTools";
import { streamOpenAICompatible } from "./providerEngine";
import { runHanisahRace } from "./melsaOmni"; // NEW IMPORT
import { type ModelMetadata } from "../types";
import { KEY_MANAGER } from "./geminiService"; // Ensure Key Manager is used

export const MODEL_CATALOG: ModelMetadata[] = [
  // --- GEMINI (GOOGLE) ---
  { 
    id: 'gemini-2.0-flash-exp', 
    name: 'Gemini 2.0 Flash', 
    category: 'GEMINI_2_5', 
    provider: 'GEMINI', 
    description: 'Model Tercepat Google (Exp). Multimodal & Low Latency.', 
    specs: { context: '1M', speed: 'INSTANT', intelligence: 9.5 } 
  },
  {
    id: 'auto-best',
    name: 'Auto Pilot (Hydra)',
    category: 'GEMINI_2_5',
    provider: 'GEMINI', 
    description: 'Hanisah Engine: No Mercy Omni-Race. Fastest winner takes all. Uncensored Logic.',
    specs: { context: 'AUTO', speed: 'INSTANT', intelligence: 9.8 } 
  },
  { 
    id: 'gemini-1.5-flash', 
    name: 'Gemini 1.5 Flash', 
    category: 'GEMINI_3', 
    provider: 'GEMINI', 
    description: 'Stable Flash. Hemat cost & sangat stabil.', 
    specs: { context: '1M', speed: 'INSTANT', intelligence: 9.0 } 
  },
  { 
    id: 'gemini-1.5-pro', 
    name: 'Gemini 1.5 Pro', 
    category: 'GEMINI_3', 
    provider: 'GEMINI', 
    description: 'Reasoning Powerhouse. 2M Context Window.', 
    specs: { context: '2M', speed: 'THINKING', intelligence: 10 } 
  },

  // --- OPENAI ---
  { 
    id: 'gpt-4o', 
    name: 'GPT-4o (Omni)', 
    category: 'OPEN_ROUTER_ELITE', 
    provider: 'OPENAI', 
    description: 'Flagship OpenAI. Cerdas, cepat, dan multimodal native.', 
    specs: { context: '128K', speed: 'FAST', intelligence: 9.8 } 
  },
  { 
    id: 'gpt-4o-mini', 
    name: 'GPT-4o Mini', 
    category: 'OPEN_ROUTER_ELITE', 
    provider: 'OPENAI', 
    description: 'Versi ringan dari Omni. Sangat cepat dan hemat biaya.', 
    specs: { context: '128K', speed: 'INSTANT', intelligence: 9.2 } 
  },

  // --- GROQ (LLAMA & MIXTRAL) ---
  { 
    id: 'llama-3.3-70b-versatile', 
    name: 'Llama 3.3 70B (Groq)', 
    category: 'GROQ_VELOCITY', 
    provider: 'GROQ', 
    description: 'Flagship Meta terbaru via LPU Groq. Sangat serbaguna.', 
    specs: { context: '128K', speed: 'INSTANT', intelligence: 9.3 } 
  },
  { 
    id: 'llama-3.1-8b-instant', 
    name: 'Llama 3.1 8B (Groq)', 
    category: 'GROQ_VELOCITY', 
    provider: 'GROQ', 
    description: 'Model ultra-cepat untuk tugas ringan dan chat santai.', 
    specs: { context: '128K', speed: 'INSTANT', intelligence: 8.5 } 
  },
  { 
    id: 'mixtral-8x7b-32768', 
    name: 'Mixtral 8x7B (Groq)', 
    category: 'GROQ_VELOCITY', 
    provider: 'GROQ', 
    description: 'Mixture of Experts. Seimbang antara kecepatan dan logika.', 
    specs: { context: '32K', speed: 'FAST', intelligence: 9.0 } 
  },
  { 
    id: 'gemma2-9b-it', 
    name: 'Gemma 2 9B (Groq)', 
    category: 'GROQ_VELOCITY', 
    provider: 'GROQ', 
    description: 'Model Google open-weight yang dijalankan di Groq.', 
    specs: { context: '8K', speed: 'INSTANT', intelligence: 8.8 } 
  },

  // --- DEEPSEEK ---
  { 
    id: 'deepseek-chat', 
    name: 'DeepSeek V3', 
    category: 'DEEPSEEK_OFFICIAL', 
    provider: 'DEEPSEEK', 
    description: 'Model efisien dengan kemampuan coding yang kuat.', 
    specs: { context: '64K', speed: 'FAST', intelligence: 9.5 } 
  },
  { 
    id: 'deepseek-reasoner', 
    name: 'DeepSeek R1 (Reasoning)', 
    category: 'DEEPSEEK_OFFICIAL', 
    provider: 'DEEPSEEK', 
    description: 'Model CoT (Chain of Thought) untuk logika berat. Lambat tapi teliti.', 
    specs: { context: '64K', speed: 'THINKING', intelligence: 9.9 } 
  },

  // --- MISTRAL ---
  { 
    id: 'mistral-large-latest', 
    name: 'Mistral Large 2', 
    category: 'MISTRAL_NATIVE', 
    provider: 'MISTRAL', 
    description: 'Flagship Eropa. Sangat fasih multi-bahasa dan presisi.', 
    specs: { context: '128K', speed: 'FAST', intelligence: 9.6 } 
  },
  { 
    id: 'mistral-small-latest', 
    name: 'Mistral Small', 
    category: 'MISTRAL_NATIVE', 
    provider: 'MISTRAL', 
    description: 'Efisien dan cepat untuk tugas sehari-hari.', 
    specs: { context: '32K', speed: 'INSTANT', intelligence: 9.0 } 
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
      // 1. GEMINI PROVIDER (Native Tools)
      if (provider === 'GEMINI') {
          if (isThinking) return []; // Thinking models (2.0 Pro) often restricted with tools
          
          const configStr = localStorage.getItem('hanisah_tools_config');
          const config = configStr ? JSON.parse(configStr) : { search: true, vault: true, visual: true };
          
          const tools: any[] = [];
          if (config.vault && noteTools) tools.push(noteTools);
          if (config.visual && visualTools) tools.push(visualTools);
          
          if (config.search) tools.push(searchTools); 
          
          if (mechanicTools) tools.push(mechanicTools);
          return tools;
      } 
      
      // 2. OTHER PROVIDERS (Universal Tools via Proxy)
      else {
          // Check config, but generally enable tools for capable models
          // Note: DeepSeek Reasoner does not support tools in current API usually
          if (isThinking) return [];

          // Use the UNIVERSAL toolset (Note Management)
          // We wrap them in the structure expected by the providerEngine
          // providerEngine expects an array of tool objects
          return universalTools.functionDeclarations ? [universalTools] : [];
      }
  }

  // Helper to check feature flags directly from storage (since Kernel is non-React)
  private isOmniRaceEnabled(): boolean {
      try {
          const stored = localStorage.getItem('sys_feature_flags');
          if (!stored) return true; // Default ON
          const flags = JSON.parse(stored);
          return flags['OMNI_RACE'] !== false; // Default true if key missing
      } catch (e) { return true; }
  }

  async *streamExecute(msg: string, initialModelId: string, context?: string, imageData?: { data: string, mimeType: string }, configOverride?: any): AsyncGenerator<StreamChunk> {
    const systemPrompt = configOverride?.systemInstruction || HANISAH_BRAIN.getSystemInstruction('hanisah', context);
    const signal = configOverride?.signal; // AbortSignal passed via configOverride

    // Auto-Migrate Stale IDs
    let currentModelId = initialModelId;
    if (currentModelId === 'gemini-2.5-flash') currentModelId = 'gemini-2.0-flash-exp';

    // --- NEW OMNI RACE LOGIC (HANISAH DEWA) ---
    if (initialModelId === 'auto-best') {
        const isEnabled = this.isOmniRaceEnabled();
        
        if (!isEnabled) {
            yield { metadata: { systemStatus: "Omni-Race Disabled. Switching to Gemini...", isRerouting: true } };
            currentModelId = 'gemini-2.0-flash-exp'; 
        } else {
            // Hanisah Engine: Non-Streaming Logic wrapped in Generator
            try {
                // Determine image data format for Hanisah
                const hanisahImg = imageData ? { data: imageData.data, mimeType: imageData.mimeType } : null;
                
                // Note: runHanisahRace currently doesn't support AbortSignal cancellation mid-flight in the simplified wrapper
                // but we can check signal before yielding result
                const response = await runHanisahRace(msg, hanisahImg);
                if (signal?.aborted) throw new Error("ABORTED");
                yield { text: response };
                this.updateHistory(msg, response);
                return;
            } catch (e: any) {
                if (e.message === "ABORTED" || signal?.aborted) return;
                yield { metadata: { systemStatus: `Omni-Engine Failed. Switching to Standard...`, isRerouting: true } };
                currentModelId = 'gemini-2.0-flash-exp'; // Fallback
            }
        }
    }

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
        if (signal?.aborted) break;
        attempts++;
        // Robust ID check to prevent 404s
        const model = MODEL_CATALOG.find(m => m.id === currentModelId) || MODEL_CATALOG[0];
        const provider = model.provider;
        const key = GLOBAL_VAULT.getKey(provider as Provider);

        // --- KEY CHECK & FAST SWITCH ---
        if (!key) {
            debugService.log('WARN', 'KERNEL', 'NO_KEY', `No keys for ${provider}. Attempting fallback switch.`);
            
            // Intelligence Switch: If Gemini is dead, switch to Groq (Llama) or OpenAI
            if (provider === 'GEMINI') {
                if (KEY_MANAGER.getKey('GROQ')) {
                    currentModelId = 'llama-3.3-70b-versatile';
                    yield { metadata: { systemStatus: "Gemini Exhausted. Rerouting to Groq LPU...", isRerouting: true } };
                    continue;
                } else if (KEY_MANAGER.getKey('OPENAI')) {
                    currentModelId = 'gpt-4o-mini';
                    yield { metadata: { systemStatus: "Gemini Exhausted. Rerouting to OpenAI...", isRerouting: true } };
                    continue;
                }
            }
            
            yield { text: `\n\n> ⛔ *CRITICAL: No keys available for ${provider} or fallbacks.*` };
            break;
        }

        try {
            const isThinking = model.specs.speed === 'THINKING';
            const activeTools = configOverride?.tools || this.getActiveTools(provider, isThinking);

            if (provider === 'GEMINI') {
                const ai = new GoogleGenAI({ apiKey: key });
                const config: any = { systemInstruction: systemPrompt, temperature: 0.7 };
                
                if (activeTools.length > 0) config.tools = activeTools;
                if (isThinking) config.thinkingConfig = { thinkingBudget: 4096 };

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
            } else {
                // OpenAI, Groq, Mistral, DeepSeek go here
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
            if (signal?.aborted) return; // Silent return if aborted
            GLOBAL_VAULT.reportFailure(provider as Provider, key, err);
            const errStr = JSON.stringify(err);
            const isQuota = errStr.includes('429') || errStr.includes('resource_exhausted') || errStr.includes('limit');
            const isBalance = errStr.includes('402'); // DeepSeek/OpenAI Insufficient Balance
            const isBadModel = errStr.includes('404') || errStr.includes('not found') || errStr.includes('400');
            const isServerErr = errStr.includes('500') || errStr.includes('503') || errStr.includes('overloaded');

            if (isQuota || isBalance || isBadModel || isServerErr) {
                // --- ROBUST FALLBACK STRATEGY ---
                // If primary choice fails, we MUST try another provider, not just retry the same one.
                
                if (provider === 'GEMINI') {
                    // Fallback Chain: Gemini -> Groq -> OpenAI -> Mistral
                    if (KEY_MANAGER.getKey('GROQ')) {
                        yield { metadata: { systemStatus: "Gemini Stalled. Rerouting to Groq LPU...", isRerouting: true } };
                        currentModelId = 'llama-3.3-70b-versatile';
                        continue;
                    } 
                    if (KEY_MANAGER.getKey('OPENAI')) {
                        yield { metadata: { systemStatus: "Gemini Stalled. Rerouting to OpenAI...", isRerouting: true } };
                        currentModelId = 'gpt-4o-mini';
                        continue;
                    }
                } else if (provider === 'GROQ') {
                    // If Groq fails, try Gemini (if valid) or OpenAI
                    if (KEY_MANAGER.getKey('GEMINI') && currentModelId !== 'gemini-2.0-flash-exp') {
                        yield { metadata: { systemStatus: "Groq Stalled. Rerouting to Gemini...", isRerouting: true } };
                        currentModelId = 'gemini-1.5-flash';
                        continue;
                    }
                }

                // Generic Fallback within same provider if no other options or simple error
                const fallbackMistral = 'mistral-large-latest';
                
                if (currentModelId === fallbackMistral) {
                     yield { text: `\n\n> ⛔ *Jalur Darurat (${fallbackMistral}) juga gagal: ${err.message || 'Unknown Error'}*` };
                     throw err; 
                }
                
                continue;
            }
            yield { text: `\n\n> ⚠️ *Connection Error:* ${err.message}` };
            throw err;
        }
    }
  }

  async execute(msg: string, modelId: string, context?: string): Promise<StreamChunk> {
    const it = this.streamExecute(msg, modelId, context);
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
