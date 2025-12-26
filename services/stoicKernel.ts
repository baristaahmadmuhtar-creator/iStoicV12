
import { GoogleGenAI } from "@google/genai";
import { noteTools, searchTools, visualTools, KEY_MANAGER } from "./geminiService";
import { debugService } from "./debugService";
import { MODEL_CATALOG, type StreamChunk } from "./melsaKernel";
import { HANISAH_BRAIN } from "./melsaBrain";
import { streamOpenAICompatible } from "./providerEngine";

class StoicLogicKernel {
  private history: any[] = [];

  private getActiveTools(): any[] {
      // Read Config (Defaults: Search & Vault active, Visual disabled for Stoic)
      const configStr = localStorage.getItem('stoic_tools_config');
      const config = configStr 
          ? JSON.parse(configStr) 
          : { search: true, vault: true, visual: false };

      const tools: any[] = [];
      if (config.vault) tools.push(noteTools);
      if (config.visual) tools.push(visualTools);
      if (config.search) tools.push(searchTools);
      
      return tools;
  }

  async *streamExecute(msg: string, modelId: string, context?: string): AsyncGenerator<StreamChunk> {
    const systemPrompt = HANISAH_BRAIN.getSystemInstruction('stoic', context);
    
    // FIX 404: If modelId is 'auto-best' (Omni-Race Virtual ID), map it to a concrete model.
    // For Stoic persona, we default to the requested global default (Llama 3.3) for speed + reasoning.
    let effectiveModelId = modelId;
    if (effectiveModelId === 'auto-best') {
        effectiveModelId = 'llama-3.3-70b-versatile'; 
    }

    // Stoic Retry Logic: Try requested model, then fallback to Gemini Flash if it fails
    const plan = [effectiveModelId, 'gemini-2.5-flash'];
    
    // Remove duplicates if effectiveModelId IS Flash
    if (effectiveModelId === 'gemini-2.5-flash') plan.pop();

    for (const currentModelId of plan) {
        // SAFE FALLBACK: If lookup fails, default to a concrete model (Gemini Flash), NOT index 0 (which might be auto-best)
        let selectedModel = MODEL_CATALOG.find(m => m.id === currentModelId) || MODEL_CATALOG.find(m => m.id === 'gemini-2.5-flash');
        
        if (!selectedModel) {
             // If even Flash is missing from catalog (impossible), hardcode it to prevent crash
             selectedModel = { id: 'gemini-2.5-flash', name: 'Gemini Flash (Fallback)', category: 'GEMINI_2_5', provider: 'GEMINI', description: 'Fallback', specs: { context: '1M', speed: 'INSTANT', intelligence: 9 } };
        }

        const key = KEY_MANAGER.getKey(selectedModel.provider);
        const startTime = Date.now();

        if (!key) {
            // If we can't get a key for the preferred model, skip to fallback loop iteration
            continue;
        }

        try {
          if (selectedModel.provider === 'GEMINI') {
            const ai = new GoogleGenAI({ apiKey: key });
            const activeTools = this.getActiveTools();
            
            const config: any = { 
                systemInstruction: systemPrompt, 
                temperature: 0.1, // Stoic precision
                tools: activeTools 
            };

            // Only Gemini Pro models support 'thinkingConfig' properly
            if (selectedModel.specs.speed === 'THINKING' || selectedModel.id.includes('pro')) {
               config.thinkingConfig = { thinkingBudget: 1024 }; 
            }

            const responseStream = await ai.models.generateContentStream({
              model: selectedModel.id,
              contents: [...this.history, { role: 'user', parts: [{ text: msg }] }],
              config
            });

            let fullText = "";
            for await (const chunk of responseStream) {
              if (chunk.text) {
                fullText += chunk.text;
                yield { text: chunk.text };
              }
              if (chunk.functionCalls?.length) {
                yield { functionCall: chunk.functionCalls[0] };
              }
              if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
                yield { groundingChunks: chunk.candidates[0].groundingMetadata.groundingChunks };
              }
            }

            this.updateHistory(msg, fullText);
            KEY_MANAGER.reportSuccess('GEMINI');
            
            yield {
              metadata: { provider: 'GEMINI', model: selectedModel.name, latency: Date.now() - startTime, status: 'success' as const }
            };
            
            return; // SUCCESS! Exit the loop.

          } else {
            // Support for non-Gemini models (Groq, DeepSeek, etc.) via providerEngine
            // This prevents Stoic from crashing if user selects Groq/DeepSeek
            const activeTools = this.getActiveTools();
            
            // Filter out Google Search if not Gemini, as others don't support it natively in this kernel structure
            const filteredTools = activeTools.filter(t => !t.googleSearch);

            const stream = streamOpenAICompatible(selectedModel.provider as any, selectedModel.id, [{ role: 'user', content: msg }], systemPrompt, filteredTools);
            
            let fullText = "";
            for await (const chunk of stream) {
                if (chunk.text) { fullText += chunk.text; yield { text: chunk.text }; }
                if (chunk.functionCall) yield { functionCall: chunk.functionCall };
            }
            this.updateHistory(msg, fullText);
            KEY_MANAGER.reportSuccess(selectedModel.provider as any);
            
            yield {
              metadata: { provider: selectedModel.provider, model: selectedModel.name, latency: Date.now() - startTime, status: 'success' as const }
            };
            return;
          }
        } catch (err: any) {
          debugService.log('ERROR', 'STOIC_KERNEL', 'EXEC_FAIL', `Model ${selectedModel.id} failed: ${err.message}`);
          KEY_MANAGER.reportFailure(selectedModel.provider, err);
          
          // If this was the last plan item, yield error
          if (currentModelId === plan[plan.length - 1]) {
             yield { text: `\n\n> *The logical flow has been disrupted. We must pause.*`, metadata: { status: 'error' } };
          } else {
             yield { text: `\n\n> *A temporary interruption. Re-aligning logic...*\n\n` };
          }
        }
    }
  }

  async execute(msg: string, modelId: string, context?: string): Promise<any> {
    const startTime = Date.now();
    
    // FIX 404: Virtual ID Resolution
    let effectiveModelId = modelId;
    if (effectiveModelId === 'auto-best') effectiveModelId = 'llama-3.3-70b-versatile';

    let selectedModel = MODEL_CATALOG.find(m => m.id === effectiveModelId) || MODEL_CATALOG.find(m => m.id === 'gemini-2.5-flash');
    if (!selectedModel) throw new Error("CRITICAL_KERNEL_ERROR: No valid model found.");

    const systemPrompt = HANISAH_BRAIN.getSystemInstruction('stoic', context);
    const key = KEY_MANAGER.getKey(selectedModel.provider);

    try {
      if (selectedModel.provider === 'GEMINI') {
        const ai = new GoogleGenAI({ apiKey: key });
        const activeTools = this.getActiveTools();
        
        const config: any = { 
            systemInstruction: systemPrompt, 
            temperature: 0.1,
            tools: activeTools 
        };

        if (selectedModel.specs.speed === 'THINKING' || selectedModel.id.includes('pro')) {
           config.thinkingConfig = { thinkingBudget: 1024 }; 
        }

        const response = await ai.models.generateContent({
          model: selectedModel.id,
          contents: [...this.history, { role: 'user', parts: [{ text: msg }] }],
          config
        });

        if (response.functionCalls && response.functionCalls.length > 0) {
          return {
            functionCall: response.functionCalls[0],
            metadata: { provider: 'GEMINI', model: selectedModel.name, latency: Date.now() - startTime, status: 'success' as const }
          };
        }

        const text = response.text || "Memproses...";
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        this.updateHistory(msg, text);
        
        KEY_MANAGER.reportSuccess('GEMINI');

        return {
          text,
          groundingChunks,
          metadata: { provider: 'GEMINI', model: selectedModel.name, latency: Date.now() - startTime, status: 'success' as const }
        };
      }
      return { text: "Stoic connection is optimized for Gemini nodes only in non-streaming mode.", metadata: { status: 'error' as const } };
    } catch (err: any) {
      debugService.log('ERROR', 'STOIC_KERNEL', 'SYS-01', err.message);
      KEY_MANAGER.reportFailure(selectedModel.provider, err);
      throw err;
    }
  }

  private updateHistory(user: string, assistant: string) {
    this.history.push({ role: 'user', parts: [{ text: user }] }, { role: 'model', parts: [{ text: assistant }] });
    if (this.history.length > 20) this.history = this.history.slice(-20);
  }

  reset() { this.history = []; }
}

export const STOIC_KERNEL = new StoicLogicKernel();
