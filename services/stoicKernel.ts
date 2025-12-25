
import { GoogleGenAI } from "@google/genai";
import { noteTools, searchTools, visualTools, KEY_MANAGER } from "./geminiService";
import { debugService } from "./debugService";
import { MODEL_CATALOG, type StreamChunk } from "./melsaKernel";
import { HANISAH_BRAIN } from "./melsaBrain";

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
    
    // Stoic Retry Logic: Try requested model (Pro), then fallback to Flash
    const plan = [modelId, 'gemini-3-flash-preview'];
    
    // Remove duplicates if modelId IS Flash
    if (modelId === 'gemini-3-flash-preview') plan.pop();

    for (const currentModelId of plan) {
        let selectedModel = MODEL_CATALOG.find(m => m.id === currentModelId) || MODEL_CATALOG[0];
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
            // Fallback for non-Gemini models if manually selected (Unlikely for Stoic default)
            const result = await this.execute(msg, currentModelId, context);
            yield result;
            return;
          }
        } catch (err: any) {
          debugService.log('ERROR', 'STOIC_KERNEL', 'EXEC_FAIL', `Model ${currentModelId} failed: ${err.message}`);
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
    let selectedModel = MODEL_CATALOG.find(m => m.id === modelId) || MODEL_CATALOG[0];
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
      return { text: "Stoic connection is optimized for Gemini nodes only.", metadata: { status: 'error' as const } };
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
