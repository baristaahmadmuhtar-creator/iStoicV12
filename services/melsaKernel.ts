
import { GoogleGenAI } from "@google/genai";
import { debugService } from "./debugService";
import { HANISAH_BRAIN } from "./melsaBrain";
import { noteTools, visualTools, searchTools, universalTools } from "./geminiService";
import { GLOBAL_VAULT, Provider } from "./hydraVault"; 
import { mechanicTools } from "../features/mechanic/mechanicTools";
import { streamOpenAICompatible } from "./providerEngine";
import { runHanisahRace } from "./melsaOmni"; 
import { type ModelMetadata } from "../types";
import { KEY_MANAGER } from "./geminiService"; 

export const MODEL_CATALOG: ModelMetadata[] = [
  // --- GEMINI (GOOGLE) - STABILITY FIRST ---
  { 
    id: 'gemini-2.0-flash-exp', 
    name: 'Gemini 2.0 Flash (Stable)', 
    category: 'GEMINI_2_5', 
    provider: 'GEMINI', 
    description: 'Model tercepat dan paling stabil untuk Free Tier saat ini.', 
    specs: { context: '1M', speed: 'INSTANT', intelligence: 9.5 } 
  },
  {
    id: 'auto-best',
    name: 'Auto Pilot (Hydra)',
    category: 'GEMINI_2_5',
    provider: 'GEMINI', 
    description: 'Hanisah Engine: Omni-Race (Gemini vs Llama).',
    specs: { context: 'AUTO', speed: 'INSTANT', intelligence: 9.8 } 
  },
  { 
    id: 'gemini-1.5-flash', 
    name: 'Gemini 1.5 Flash', 
    category: 'GEMINI_2_5', 
    provider: 'GEMINI', 
    description: 'Model legacy paling stabil. Gunakan ini jika error 429.', 
    specs: { context: '1M', speed: 'INSTANT', intelligence: 9.0 } 
  },
  { 
    id: 'gemini-3-flash-preview', 
    name: 'Gemini 3 Flash (Preview)', 
    category: 'GEMINI_3', 
    provider: 'GEMINI', 
    description: 'Experimental. Sering kena limit (429).', 
    specs: { context: '1M', speed: 'INSTANT', intelligence: 9.2 } 
  },
  { 
    id: 'gemini-3-pro-preview', 
    name: 'Gemini 3 Pro', 
    category: 'GEMINI_3', 
    provider: 'GEMINI', 
    description: 'Complex Reasoning Tasks.', 
    specs: { context: '2M', speed: 'THINKING', intelligence: 9.9 } 
  },

  // --- OPENAI ---
  { 
    id: 'gpt-4o', 
    name: 'GPT-4o (Omni)', 
    category: 'OPEN_ROUTER_ELITE', 
    provider: 'OPENAI', 
    description: 'Flagship OpenAI (Paid API Key Required).', 
    specs: { context: '128K', speed: 'FAST', intelligence: 9.8 } 
  },
  { 
    id: 'gpt-4o-mini', 
    name: 'GPT-4o Mini', 
    category: 'OPEN_ROUTER_ELITE', 
    provider: 'OPENAI', 
    description: 'Versi ringan dari Omni. Sangat cepat.', 
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
    description: 'Model CoT (Chain of Thought) untuk logika berat.', 
    specs: { context: '64K', speed: 'THINKING', intelligence: 9.9 } 
  },

  // --- MISTRAL ---
  { 
    id: 'mistral-large-latest', 
    name: 'Mistral Large 2', 
    category: 'MISTRAL_NATIVE', 
    provider: 'MISTRAL', 
    description: 'Flagship Eropa. Sangat fasih multi-bahasa.', 
    specs: { context: '128K', speed: 'FAST', intelligence: 9.6 } 
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
          if (isThinking) return []; // Thinking models restricted
          
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

    let currentModelId = initialModelId;
    
    // Auto Fallback Logic for deprecated models
    if (currentModelId === 'gemini-1.5-flash-latest') currentModelId = 'gemini-1.5-flash';

    if (initialModelId === 'auto-best') {
        const isEnabled = this.isOmniRaceEnabled();
        if (!isEnabled) {
            yield { metadata: { systemStatus: "Omni-Race Disabled. Switching to Gemini 2.0...", isRerouting: true } };
            currentModelId = 'gemini-2.0-flash-exp'; 
        } else {
            try {
                const hanisahImg = imageData ? { data: imageData.data, mimeType: imageData.mimeType } : null;
                const response = await runHanisahRace(msg, hanisahImg);
                if (signal?.aborted) throw new Error("ABORTED");
                yield { text: response };
                this.updateHistory(msg, response);
                return;
            } catch (e: any) {
                if (e.message === "ABORTED" || signal?.aborted) return;
                yield { metadata: { systemStatus: `Omni-Engine Failed. Switching to Standard...`, isRerouting: true } };
                currentModelId = 'gemini-2.0-flash-exp';
            }
        }
    }

    let attempts = 0;
    const maxAttempts = 10; // High retry count for aggressive rotation

    while (attempts < maxAttempts) {
        if (signal?.aborted) break;
        attempts++;
        const model = MODEL_CATALOG.find(m => m.id === currentModelId) || MODEL_CATALOG[0];
        const provider = model.provider;
        const key = GLOBAL_VAULT.getKey(provider as Provider);

        if (!key) {
            debugService.log('WARN', 'KERNEL', 'NO_KEY', `No keys for ${provider}. Attempting fallback switch.`);
            if (provider === 'GEMINI') {
                // If Gemini keys exhausted, try Groq as a backup immediately
                if (KEY_MANAGER.getKey('GROQ')) {
                    currentModelId = 'llama-3.3-70b-versatile';
                    yield { metadata: { systemStatus: "Gemini Exhausted. Rerouting to Groq LPU...", isRerouting: true } };
                    continue;
                }
            }
            yield { text: `\n\n> ⛔ *CRITICAL: No keys available for ${provider}. Check Settings > Provider Matrix. If you are using Free Tier, ensure you have unique keys from different projects.*` };
            break;
        }

        try {
            const isThinking = model.specs.speed === 'THINKING';
            const activeTools = configOverride?.tools || this.getActiveTools(provider, isThinking);

            if (provider === 'GEMINI') {
                const ai = new GoogleGenAI({ apiKey: key });
                const config: any = { systemInstruction: systemPrompt, temperature: 0.7 };
                
                if (activeTools.length > 0) config.tools = activeTools;
                
                if (isThinking) {
                    const budgetStr = localStorage.getItem('thinking_budget');
                    const budget = budgetStr ? parseInt(budgetStr) : 4096;
                    config.thinkingConfig = { thinkingBudget: budget };
                }

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
            
            // REPORT FAILURE TO VAULT (This freezes the key for 30s)
            GLOBAL_VAULT.reportFailure(provider as Provider, key, err);
            
            const errStr = JSON.stringify(err);
            const isQuota = errStr.includes('429') || errStr.includes('resource_exhausted') || errStr.includes('limit');
            const isBalance = errStr.includes('402');
            const isNotFound = errStr.includes('404') || errStr.includes('not found');
            
            console.warn(`[KERNEL] Error on ${model.id} (Key: ...${key.slice(-4)}): ${err.message}`);

            if (provider === 'GEMINI') {
                // AGGRESSIVE DOWNGRADE LOGIC for 429 or 404
                if (isQuota || isNotFound) {
                     // Try switching to 1.5 Flash if we are on a higher model
                     if (currentModelId === 'gemini-3-flash-preview' || currentModelId === 'gemini-2.0-flash-exp') {
                         currentModelId = 'gemini-1.5-flash';
                         yield { metadata: { systemStatus: "Gemini Limit Reached. Retrying with 1.5 Flash (Legacy)...", isRerouting: true } };
                         continue;
                     }
                     
                     // If we are already on 1.5 Flash, or if we just want to try another key with the SAME model (auto-handled by loop + hydraVault active check)
                     yield { metadata: { systemStatus: "Switching API Key...", isRerouting: true } };
                     continue;
                }
            }

            if (isQuota || isBalance) {
                // Try next iteration (HydraVault will give a different key)
                continue;
            }
            
            // Unknown fatal error
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
