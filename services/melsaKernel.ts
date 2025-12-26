
import { GoogleGenAI } from "@google/genai";
import { debugService } from "./debugService";
import { HANISAH_BRAIN } from "./melsaBrain";
import { noteTools, visualTools, searchTools } from "./geminiService";
import { GLOBAL_VAULT, Provider } from "./hydraVault"; 
import { mechanicTools } from "../features/mechanic/mechanicTools";
import { streamOpenAICompatible } from "./providerEngine";
import { runMelsaRace } from "./melsaOmni"; // NEW IMPORT
import { type ModelMetadata } from "../types";

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
    description: 'Melsa Engine: No Mercy Omni-Race. Fastest winner takes all. Uncensored Logic.',
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
      if (isThinking && provider === 'GEMINI') return [];

      const configStr = localStorage.getItem('hanisah_tools_config');
      const config = configStr ? JSON.parse(configStr) : { search: true, vault: true, visual: true };

      const tools: any[] = [];
      
      // Strict check to avoid empty tool objects which break Gemini API
      if (config.vault && noteTools && noteTools.functionDeclarations?.length > 0) tools.push(noteTools);
      
      // Visual tools usually empty or null now, so we skip if not valid
      if (config.visual && visualTools) tools.push(visualTools);
      
      if (config.search && provider === 'GEMINI') tools.push(searchTools);
      
      // Mechanic tools
      if (mechanicTools && mechanicTools.functionDeclarations?.length > 0) tools.push(mechanicTools);
      
      return tools;
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

    // --- NEW OMNI RACE LOGIC (MELSA DEWA) ---
    if (initialModelId === 'auto-best') {
        const isEnabled = this.isOmniRaceEnabled();
        
        if (!isEnabled) {
            yield { text: `\n\n> 🛑 *Omni-Race disabled. Switching to Gemini Flash...*\n\n` };
            currentModelId = 'gemini-2.0-flash-exp'; 
        } else {
            // Melsa Engine: Non-Streaming Logic wrapped in Generator
            yield { text: "> *Initializing Melsa Omni-Race (Multi-Engine)...*\n\n" };
            try {
                // Determine image data format for Melsa
                const melsaImg = imageData ? { data: imageData.data, mimeType: imageData.mimeType } : null;
                
                // Note: runMelsaRace currently doesn't support AbortSignal cancellation mid-flight in the simplified wrapper
                // but we can check signal before yielding result
                const response = await runMelsaRace(msg, melsaImg);
                if (signal?.aborted) throw new Error("ABORTED");
                yield { text: response };
                this.updateHistory(msg, response);
                return;
            } catch (e: any) {
                if (e.message === "ABORTED" || signal?.aborted) return;
                yield { text: `\n\n> ⚠️ *Melsa Engine Error: ${e.message}*` };
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

        if (!key) {
            // If keys are missing or exhausted, fallback to Llama (Groq) which is usually reliable
            const fallbackModel = 'llama-3.3-70b-versatile';
            if (currentModelId !== fallbackModel) {
                yield { text: `\n\n> ⚠️ *Node ${provider} offline / No Key. Switching to ${fallbackModel}...*` };
                currentModelId = fallbackModel;
                continue;
            } else {
                yield { text: `\n\n> ⛔ *CRITICAL: No keys available for fallback.*` };
                break;
            }
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

                // Note: generateContentStream returns a promise that resolves to an iterable.
                // We cannot pass abort signal directly to config, but breaking the loop effectively stops it.
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

            if (isQuota || isBalance || isBadModel) {
                // Primary Fallback: Llama 3.3 (Groq) since it's robust
                const fallbackLlama = 'llama-3.3-70b-versatile';
                const fallbackMistral = 'mistral-large-latest';
                
                // If current model is already Llama, switch to Mistral
                if (currentModelId === fallbackLlama) {
                     yield { text: `\n\n> 🔄 *Llama juga gagal. Mengalihkan ke Mistral...*` };
                     currentModelId = fallbackMistral;
                     continue;
                }

                // If current model is already Mistral (and it failed), then we are done
                if (currentModelId === fallbackMistral) {
                     yield { text: `\n\n> ⛔ *Jalur Darurat (${fallbackMistral}) juga gagal: ${err.message || 'Unknown Error'}*` };
                     throw err; 
                }
                
                // Otherwise, it was the original model or something else, so switch to Llama
                yield { text: `\n\n> 🔄 *Jalur ${model.name} terganggu (${isBadModel ? 'Error 400/404' : isBalance ? 'Saldo Habis' : 'Quota'}). Mengalihkan ke ${fallbackLlama}...*` };
                currentModelId = fallbackLlama;
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
