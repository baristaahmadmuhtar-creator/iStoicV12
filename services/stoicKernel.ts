
import { GoogleGenAI } from "@google/genai";
import { noteTools, searchTools, visualTools, universalTools, KEY_MANAGER } from "./geminiService";
import { debugService } from "./debugService";
import { MODEL_CATALOG, type StreamChunk } from "./melsaKernel";
import { HANISAH_BRAIN } from "./melsaBrain";
import { streamOpenAICompatible } from "./providerEngine";

class StoicLogicKernel {
  private history: any[] = [];

  private getActiveTools(provider: string): any[] {
      const configStr = localStorage.getItem('stoic_tools_config');
      const config = configStr 
          ? JSON.parse(configStr) 
          : { search: true, vault: true, visual: false };

      if (provider === 'GEMINI') {
          const tools: any[] = [];
          if (config.vault) tools.push(noteTools);
          if (config.visual) tools.push(visualTools);
          
          if (config.search) tools.push(searchTools);
          
          return tools;
      } else {
          // For non-Gemini, if search/vault is enabled, use Universal Tools
          if (config.search || config.vault) {
              return universalTools.functionDeclarations ? [universalTools] : [];
          }
          return [];
      }
  }

  async *streamExecute(msg: string, modelId: string, context?: string, attachment?: any, configOverride?: any): AsyncGenerator<StreamChunk> {
    const systemPrompt = HANISAH_BRAIN.getSystemInstruction('stoic', context);
    const signal = configOverride?.signal; // AbortSignal passed via configOverride
    
    // FIX 404: If modelId is 'auto-best' (Omni-Race Virtual ID), map it to a concrete model.
    let effectiveModelId = modelId;
    if (effectiveModelId === 'auto-best') {
        effectiveModelId = 'llama-3.3-70b-versatile'; 
    }

    // --- ENHANCED FALLBACK STRATEGY ---
    // Plan: Try Requested -> Gemini 1.5 Flash -> Groq Llama 3.3 -> OpenAI
    const plan = [effectiveModelId, 'gemini-1.5-flash', 'llama-3.3-70b-versatile', 'gpt-4o-mini'];
    
    // Remove duplicates
    const uniquePlan = [...new Set(plan)];

    for (const currentModelId of uniquePlan) {
        if (signal?.aborted) break;

        let selectedModel = MODEL_CATALOG.find(m => m.id === currentModelId) || MODEL_CATALOG.find(m => m.id === 'gemini-1.5-flash');
        
        if (!selectedModel) continue;

        const key = KEY_MANAGER.getKey(selectedModel.provider);
        const startTime = Date.now();

        if (!key) {
            // If we are out of keys for this provider, verify we haven't exhausted the plan
            continue;
        }

        try {
          if (selectedModel.provider === 'GEMINI') {
            const ai = new GoogleGenAI({ apiKey: key });
            const activeTools = this.getActiveTools('GEMINI');
            
            const config: any = { 
                systemInstruction: systemPrompt, 
                temperature: 0.1, // Stoic precision
            };

            // FIX 400: Only add tools if array is not empty
            if (activeTools.length > 0) {
                config.tools = activeTools;
            }

            // Only Gemini Pro/Thinking models support 'thinkingConfig'.
            // Do not use thinkingConfig with tools if the specific model version doesn't support it (2.5 Pro does).
            if (selectedModel.specs.speed === 'THINKING' || selectedModel.id.includes('pro')) {
               // Only for newer models
               if (selectedModel.id.includes('2.5') || selectedModel.id.includes('3')) {
                   config.thinkingConfig = { thinkingBudget: 1024 }; 
               }
            }

            const responseStream = await ai.models.generateContentStream({
              model: selectedModel.id,
              contents: [...this.history, { role: 'user', parts: [{ text: msg }] }],
              config
            });

            let fullText = "";
            for await (const chunk of responseStream) {
              if (signal?.aborted) break;
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
            if (signal?.aborted) return;

            this.updateHistory(msg, fullText);
            KEY_MANAGER.reportSuccess('GEMINI');
            
            yield {
              metadata: { provider: 'GEMINI', model: selectedModel.name, latency: Date.now() - startTime, status: 'success' as const }
            };
            
            return; // SUCCESS! Exit the loop.

          } else {
            // Support for non-Gemini models (Groq, DeepSeek, etc.) via providerEngine
            const activeTools = this.getActiveTools(selectedModel.provider);
            
            const stream = streamOpenAICompatible(selectedModel.provider as any, selectedModel.id, [{ role: 'user', content: msg }], systemPrompt, activeTools, signal);
            
            let fullText = "";
            for await (const chunk of stream) {
                if (signal?.aborted) break;
                if (chunk.text) { fullText += chunk.text; yield { text: chunk.text }; }
                if (chunk.functionCall) yield { functionCall: chunk.functionCall };
            }
            if (signal?.aborted) return;

            this.updateHistory(msg, fullText);
            KEY_MANAGER.reportSuccess(selectedModel.provider as any);
            
            yield {
              metadata: { provider: selectedModel.provider, model: selectedModel.name, latency: Date.now() - startTime, status: 'success' as const }
            };
            return;
          }
        } catch (err: any) {
          if (signal?.aborted) return; // Silent return if aborted
          debugService.log('ERROR', 'STOIC_KERNEL', 'EXEC_FAIL', `Model ${selectedModel.id} failed: ${JSON.stringify(err)}`);
          KEY_MANAGER.reportFailure(selectedModel.provider, err);
          
          // If this was the last fallback in the plan, yield error
          if (currentModelId === uniquePlan[uniquePlan.length - 1]) {
             const isRateLimit = JSON.stringify(err).includes('429');
             const errMsg = isRateLimit ? "System capacity limits reached. All logical nodes failed." : "Logical flow disrupted.";
             yield { text: `\n\n> *${errMsg}*`, metadata: { status: 'error' } };
          } else {
             // CLEANFALLBACK: Yield metadata for visual bubble instead of raw text
             const nextModelId = uniquePlan[uniquePlan.indexOf(currentModelId) + 1];
             yield { 
                 metadata: { 
                     systemStatus: `Rerouting logic stream to ${nextModelId}...`, 
                     isRerouting: true 
                 } 
             };
          }
        }
    }
  }

  async execute(msg: string, modelId: string, context?: string): Promise<any> {
    const startTime = Date.now();
    let effectiveModelId = modelId;
    if (effectiveModelId === 'auto-best') effectiveModelId = 'llama-3.3-70b-versatile';

    let selectedModel = MODEL_CATALOG.find(m => m.id === effectiveModelId) || MODEL_CATALOG.find(m => m.id === 'gemini-1.5-flash');
    if (!selectedModel) throw new Error("CRITICAL_KERNEL_ERROR: No valid model found.");

    const systemPrompt = HANISAH_BRAIN.getSystemInstruction('stoic', context);
    const key = KEY_MANAGER.getKey(selectedModel.provider);

    try {
      if (selectedModel.provider === 'GEMINI') {
        const ai = new GoogleGenAI({ apiKey: key });
        const activeTools = this.getActiveTools('GEMINI');
        
        const config: any = { 
            systemInstruction: systemPrompt, 
            temperature: 0.1,
        };

        if (activeTools.length > 0) {
            config.tools = activeTools;
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
      // Basic fallback for non-streaming execution on other providers
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
