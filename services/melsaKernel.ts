
import { GoogleGenAI } from "@google/genai";
import { debugService } from "./debugService";
import { HANISAH_BRAIN } from "./melsaBrain";
import { noteTools, visualTools, searchTools } from "./geminiService";
import { GLOBAL_VAULT, Provider } from "./hydraVault"; 
import { mechanicTools } from "../features/mechanic/mechanicTools";
import { streamOpenAICompatible } from "./providerEngine";
import { OMNI_KERNEL } from "./omniRace"; 
import { type ModelMetadata } from "../types";

// KATALOG MODEL TERVERIFIKASI (WORK & HEMAT API)
export const MODEL_CATALOG: ModelMetadata[] = [
  // SPECIAL
  { id: 'auto-best', name: 'HYDRA OMNI-RACE', category: 'GEMINI_3', provider: 'GEMINI', description: 'Mode Balap: Memanggil semua provider sekaligus. Pemenang tercepat diambil. Boros kuota.', specs: { context: 'AUTO', speed: 'INSTANT', intelligence: 9.9 } },
  
  // GOOGLE (STABIL & GRATIS)
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', category: 'GEMINI_3', provider: 'GEMINI', description: 'Model eksperimental Google. Sangat cepat & Multimodal.', specs: { context: '1M', speed: 'INSTANT', intelligence: 9.5 } },
  { id: 'gemini-2.0-flash-thinking-exp-01-21', name: 'Gemini 2.0 Thinking', category: 'GEMINI_3', provider: 'GEMINI', description: 'Model dengan Chain-of-Thought native Google.', specs: { context: '32K', speed: 'THINKING', intelligence: 9.7 } },
  
  // GROQ (SUPER CEPAT - GRATIS TIER)
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Groq)', category: 'GROQ_VELOCITY', provider: 'GROQ', description: 'Open Source terbaik saat ini via Groq LPU. Sangat cepat.', specs: { context: '128K', speed: 'INSTANT', intelligence: 9.4 } },
  { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 (Groq)', category: 'GROQ_VELOCITY', provider: 'GROQ', description: 'Logika DeepSeek R1 yang dijalankan di hardware Groq.', specs: { context: '128K', speed: 'FAST', intelligence: 9.6 } },

  // DEEPSEEK (MURAH & PINTAR)
  { id: 'deepseek-chat', name: 'DeepSeek V3', category: 'DEEPSEEK_OFFICIAL', provider: 'DEEPSEEK', description: 'Model V3 Asli. Sangat efisien untuk coding & logika.', specs: { context: '64K', speed: 'FAST', intelligence: 9.6 } },
  { id: 'deepseek-reasoner', name: 'DeepSeek R1 (Reason)', category: 'DEEPSEEK_OFFICIAL', provider: 'DEEPSEEK', description: 'Reasoning Model (CoT). Lebih lambat tapi sangat teliti.', specs: { context: '64K', speed: 'THINKING', intelligence: 9.9 } },

  // OPENAI & OTHERS
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', category: 'OPEN_ROUTER_ELITE', provider: 'OPENAI', description: 'Model efisien OpenAI. Cepat dan murah.', specs: { context: '128K', speed: 'FAST', intelligence: 9.2 } },
  { id: 'mistral-small-latest', name: 'Mistral Small 3', category: 'MISTRAL_NATIVE', provider: 'MISTRAL', description: 'Model efisiensi tinggi dari Mistral AI.', specs: { context: '32K', speed: 'FAST', intelligence: 9.0 } }
];

export interface StreamChunk {
  text?: string;
  functionCall?: any;
  groundingChunks?: any[];
  metadata?: any;
}

export class HanisahKernel {
  private history: any[] = [];

  private getThinkingBudget(): number {
      try {
          const stored = localStorage.getItem('thinking_budget');
          return stored ? parseInt(stored, 10) : 4096;
      } catch {
          return 4096;
      }
  }

  private getActiveTools(provider: string, isThinking: boolean, vaultUnlocked: boolean = false): any[] {
      // DeepSeek Reasoner & Models Thinking tidak support tools
      if (isThinking) return []; 

      if (provider === 'GEMINI') {
          const configStr = localStorage.getItem('hanisah_tools_config');
          const config = configStr ? JSON.parse(configStr) : { search: true, vault: true, visual: true };
          const tools: any[] = [];
          
          if (config.vault && vaultUnlocked && noteTools) tools.push(noteTools);
          if (config.visual && visualTools) tools.push(visualTools);
          if (config.search) tools.push(searchTools); 
          if (mechanicTools) tools.push(mechanicTools);
          return tools;
      } else {
          // Provider lain (OpenAI/Groq) via Function Calling standar
          const toolsList: any[] = [];
          if (vaultUnlocked && noteTools.functionDeclarations) toolsList.push(...noteTools.functionDeclarations);
          // Visual tools often limited on non-native multimodal
          return toolsList.length > 0 ? [{ functionDeclarations: toolsList }] : [];
      }
  }

  async *streamExecute(msg: string, initialModelId: string, context?: string, imageData?: { data: string, mimeType: string }, configOverride?: any): AsyncGenerator<StreamChunk> {
    const systemPrompt = HANISAH_BRAIN.getSystemInstruction('hanisah', context);
    const signal = configOverride?.signal;
    const vaultUnlocked = configOverride?.vaultUnlocked || false;

    // --- MODE 1: HYDRA OMNI-RACE (Hanya jika user memilih ini) ---
    if (initialModelId === 'auto-best') {
        try {
            // Menggunakan OmniKernel yang benar-benar memanggil paralel
            const raceIterator = OMNI_KERNEL.raceStream(msg, systemPrompt, context);
            let fullText = "";
            for await (const chunk of raceIterator) {
                if (signal?.aborted) break;
                if (chunk.text) { 
                    fullText += chunk.text; 
                    yield { text: chunk.text }; 
                }
            }
            this.updateHistory(msg, fullText);
            return;
        } catch (e: any) {
            debugService.log('ERROR', 'KERNEL', 'RACE_FAIL', 'Race failed, falling back to safety net.');
            // Fallback ke single execution jika race gagal total
            initialModelId = 'gemini-2.0-flash-exp'; 
        }
    }

    // --- MODE 2: MANUAL PRIORITY (Sequential Fallback) ---
    // Kita buat antrian: [Model Pilihan User] -> [Gemini Flash (Safety Net)]
    const executionPlan = [initialModelId];
    if (initialModelId !== 'gemini-2.0-flash-exp') {
        executionPlan.push('gemini-2.0-flash-exp'); // Selalu punya backup yang gratis & stabil
    }

    for (const currentModelId of executionPlan) {
        if (signal?.aborted) break;

        const model = MODEL_CATALOG.find(m => m.id === currentModelId) || MODEL_CATALOG[1]; // Default Gemini
        const provider = model.provider;
        const key = provider === 'GEMINI' ? process.env.API_KEY : GLOBAL_VAULT.getKey(provider as Provider);

        // Skip jika tidak ada key untuk provider ini
        if (!key && provider !== 'GEMINI') {
            debugService.log('WARN', 'KERNEL', 'SKIP_PROVIDER', `No key for ${provider}. Moving to fallback.`);
            continue;
        }

        try {
            debugService.log('INFO', 'KERNEL', 'EXEC_START', `Executing via ${model.name} (${provider})`);
            const isThinking = model.specs.speed === 'THINKING';
            const activeTools = this.getActiveTools(provider, isThinking, vaultUnlocked);

            // A. GEMINI EXECUTION
            if (provider === 'GEMINI') {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const config: any = { systemInstruction: systemPrompt, temperature: 0.7 };
                
                // Config Specifics
                if (activeTools.length > 0) config.tools = activeTools;
                if (isThinking) {
                    const budget = this.getThinkingBudget();
                    config.thinkingConfig = { thinkingBudget: budget };
                    debugService.log('INFO', 'KERNEL', 'THINKING', `Applied Budget: ${budget} tokens`);
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
                    // Handle function calls
                    if (chunk.functionCalls?.length) yield { functionCall: chunk.functionCalls[0] };
                }
                
                this.updateHistory(msg, fullText);
                GLOBAL_VAULT.reportSuccess(provider as Provider);
                return; // Sukses! Keluar dari loop fallback.
            } 
            
            // B. OPENAI COMPATIBLE EXECUTION (Groq, DeepSeek, dll)
            else {
                const stream = streamOpenAICompatible(
                    provider as any, 
                    model.id, 
                    [...this.history.map(h => ({ role: h.role, content: h.content })), { role: 'user', content: msg }], 
                    systemPrompt, 
                    activeTools, 
                    signal
                );
                
                let fullText = "";
                for await (const chunk of stream) {
                    if (signal?.aborted) break;
                    if (chunk.text) { fullText += chunk.text; yield { text: chunk.text }; }
                    if (chunk.functionCall) yield { functionCall: chunk.functionCall };
                }
                
                this.updateHistory(msg, fullText);
                GLOBAL_VAULT.reportSuccess(provider as Provider);
                return; // Sukses! Keluar dari loop.
            }

        } catch (err: any) {
            // ERROR HANDLING & FALLBACK TRIGGER
            debugService.log('ERROR', 'KERNEL', 'EXEC_ERROR', `Model ${model.name} failed: ${err.message}`);
            
            // Report to Vault untuk cooldown key yang rusak
            GLOBAL_VAULT.reportFailure(provider as Provider, key || process.env.API_KEY || 'UNKNOWN', err);
            
            // Yield error kecil untuk UI (opsional), lalu lanjut ke model berikutnya di array executionPlan
            if (currentModelId === executionPlan[executionPlan.length - 1]) {
                yield { text: `\n\n> ⚠️ **SYSTEM FAILURE**: All neural paths exhausted. Please check API Keys.` };
            } else {
                yield { text: `\n\n> ⚠️ *${model.name} offline. Rerouting to backup node...*\n\n` };
            }
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
        if (chunk.metadata) finalChunk.metadata = chunk.metadata;
    }
    return { ...finalChunk, text: fullText };
  }

  private updateHistory(u: string, a: string) {
    // Keep context window small/efficient
    this.history.push({ role: 'user', content: u }, { role: 'assistant', content: a });
    if (this.history.length > 8) this.history = this.history.slice(-8);
  }
}

export const HANISAH_KERNEL = new HanisahKernel();
