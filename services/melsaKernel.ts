
import { GoogleGenAI } from "@google/genai";
import { debugService } from "./debugService";
import { HANISAH_BRAIN } from "./melsaBrain";
import { noteTools, visualTools, searchTools } from "./geminiService";
import { GLOBAL_VAULT, Provider } from "./hydraVault"; 
import { mechanicTools } from "../features/mechanic/mechanicTools";
import { streamOpenAICompatible } from "./providerEngine";
import { OMNI_KERNEL } from "./omniRace"; 
import { type ModelMetadata } from "../types";

export const MODEL_CATALOG: ModelMetadata[] = [
  { 
    id: 'gemini-2.5-flash', 
    name: 'Gemini 2.5 Flash', 
    category: 'GEMINI_2_5', 
    provider: 'GEMINI', 
    description: 'Model Default. Tercepat, Gratis, & Multimodal.', 
    specs: { context: '1M', speed: 'INSTANT', intelligence: 9 } 
  },
  {
    id: 'auto-best',
    name: 'Auto Pilot (Hydra)',
    category: 'GEMINI_2_5',
    provider: 'GEMINI',
    description: 'Omni-Race Protocol: Races all providers simultaneously. Fastest successful engine wins.',
    specs: { context: 'AUTO', speed: 'INSTANT', intelligence: 9.8 }
  },
  { 
    id: 'gemini-3-flash-preview', 
    name: 'Gemini 3.0 Flash', 
    category: 'GEMINI_3', 
    provider: 'GEMINI', 
    description: 'Next-Gen Flash. High speed, low latency, advanced reasoning.', 
    specs: { context: '1M', speed: 'INSTANT', intelligence: 9.5 } 
  },
  { 
    id: 'gemini-3-pro-preview', 
    name: 'Gemini 3 Pro', 
    category: 'GEMINI_3', 
    provider: 'GEMINI', 
    description: 'Model tercerdas. Reasoning tingkat dewa. (No Tools in Thinking Mode)', 
    specs: { context: '2M+', speed: 'THINKING', intelligence: 10 } 
  },
  { 
    id: 'deepseek-chat', 
    name: 'DeepSeek V3 (Official)', 
    category: 'DEEPSEEK_OFFICIAL', 
    provider: 'DEEPSEEK', 
    description: 'General purpose model yang sangat efisien dan cerdas.', 
    specs: { context: '64K', speed: 'FAST', intelligence: 9.5 } 
  },
  { 
    id: 'llama-3.3-70b-versatile', 
    name: 'Llama 3.3 70B (Groq)', 
    category: 'GROQ_VELOCITY', 
    provider: 'GROQ', 
    description: 'Flagship Meta terbaru. Sangat serbaguna dan cepat via Groq.', 
    specs: { context: '128K', speed: 'INSTANT', intelligence: 9.2 } 
  },
  { 
    id: 'mistral-large-latest', 
    name: 'Mistral Large 2', 
    category: 'MISTRAL_NATIVE', 
    provider: 'MISTRAL', 
    description: 'Flagship Eropa. Sangat fasih dan presisi.', 
    specs: { context: '128K', speed: 'FAST', intelligence: 9.5 } 
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
      if (config.vault) tools.push(noteTools);
      if (config.visual) tools.push(visualTools);
      if (config.search && provider === 'GEMINI') tools.push(searchTools);
      tools.push(mechanicTools);
      
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
    
    // CRITICAL FIX: Defined mutable currentModelId to be used in the logic loop
    let currentModelId = initialModelId;

    // --- OMNI RACE LOGIC with FEATURE FLAG CHECK ---
    if (initialModelId === 'auto-best') {
        const isEnabled = this.isOmniRaceEnabled();
        
        if (!isEnabled) {
            // FIX: If disabled, explicit fallback message and model reassignment
            yield { text: `\n\n> 🛑 *Omni-Race disabled by Protocol. Switching to Single-Core (Gemini Flash)...*\n\n` };
            currentModelId = 'gemini-2.5-flash'; 
        } else if (imageData) {
            yield { text: `\n\n> ⚠️ *Visual Input detected. Falling back to Gemini Vision...*` };
            currentModelId = 'gemini-2.5-flash';
        } else {
            yield* OMNI_KERNEL.raceStream(msg, systemPrompt, context);
            this.updateHistory(msg, "[Omni-Race Response]"); 
            return;
        }
    }

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
        attempts++;
        const model = MODEL_CATALOG.find(m => m.id === currentModelId) || MODEL_CATALOG[0];
        const provider = model.provider;
        const key = GLOBAL_VAULT.getKey(provider as Provider);

        if (!key) {
            yield { text: `\n\n> ⚠️ *Node ${provider} offline. Mencoba jalur alternatif...*` };
            currentModelId = 'gemini-2.5-flash';
            continue;
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
                    if (chunk.text) { fullText += chunk.text; yield { text: chunk.text }; }
                    if (chunk.functionCalls?.length) yield { functionCall: chunk.functionCalls[0] };
                }
                this.updateHistory(msg, fullText);
                GLOBAL_VAULT.reportSuccess(provider as Provider);
                return;
            } else {
                const stream = streamOpenAICompatible(provider as any, model.id, [{ role: 'user', content: msg }], systemPrompt, activeTools);
                let fullText = "";
                for await (const chunk of stream) {
                    if (chunk.text) { fullText += chunk.text; yield { text: chunk.text }; }
                    if (chunk.functionCall) yield { functionCall: chunk.functionCall };
                }
                this.updateHistory(msg, fullText);
                GLOBAL_VAULT.reportSuccess(provider as Provider);
                return;
            }
        } catch (err: any) {
            GLOBAL_VAULT.reportFailure(provider as Provider, key, err);
            const isQuota = JSON.stringify(err).includes('429') || JSON.stringify(err).includes('resource_exhausted') || JSON.stringify(err).includes('limit');
            const isBalance = JSON.stringify(err).includes('402');

            // If it's a fatal error with the model ID (like sending auto-best to Gemini), fallback immediately
            const isBadModel = JSON.stringify(err).includes('404') || JSON.stringify(err).includes('not found') || JSON.stringify(err).includes('400');

            if (isQuota || isBalance || isBadModel) {
                // FALLBACK LOGIC: If we are already on Flash, we can't fall back further easily.
                if (currentModelId === 'gemini-2.5-flash') {
                     yield { text: `\n\n> ⛔ *Jalur Darurat (Flash) juga gagal. Pesan tidak terkirim.*` };
                     throw err; 
                }
                
                yield { text: `\n\n> 🔄 *Jalur ${model.name} terganggu. Mengalihkan ke Jalur Darurat (Flash)...*` };
                currentModelId = 'gemini-2.5-flash';
                continue;
            }
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
