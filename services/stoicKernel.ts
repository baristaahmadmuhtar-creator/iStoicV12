
import { GoogleGenAI } from "@google/genai";
import { noteTools, searchTools, visualTools, universalTools, KEY_MANAGER } from "./geminiService";
import { debugService } from "./debugService";
import { MODEL_CATALOG, type StreamChunk } from "./melsaKernel";
import { HANISAH_BRAIN } from "./melsaBrain";
import { streamOpenAICompatible } from "./providerEngine";
import { GLOBAL_VAULT, type Provider } from "./hydraVault"; // Import Vault

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
          if (config.search || config.vault) {
              return universalTools.functionDeclarations ? [universalTools] : [];
          }
          return [];
      }
  }

  async *streamExecute(msg: string, modelId: string, context?: string, attachment?: any, configOverride?: any): AsyncGenerator<StreamChunk> {
    const systemPrompt = HANISAH_BRAIN.getSystemInstruction('stoic', context);
    const signal = configOverride?.signal; 
    
    let currentModelId = modelId;
    if (currentModelId === 'auto-best') {
        currentModelId = 'llama-3.3-70b-versatile'; 
    }

    let attempts = 0;
    const maxAttempts = 15;

    while (attempts < maxAttempts) {
        if (signal?.aborted) break;
        attempts++;

        let selectedModel = MODEL_CATALOG.find(m => m.id === currentModelId) || MODEL_CATALOG[0];
        const provider = selectedModel.provider;

        // Use HYDRA VAULT to get rotated keys
        const key = GLOBAL_VAULT.getKey(provider as Provider);

        if (!key) {
             debugService.log('WARN', 'STOIC_KERNEL', 'NO_KEY', `All keys for ${provider} are exhausted.`);
             
             // FALLBACK CHAIN
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
             yield { text: `\n\n> ⛔ *CRITICAL: No active API keys found.*` };
             break;
        }

        const startTime = Date.now();

        try {
          if (selectedModel.provider === 'GEMINI') {
            const ai = new GoogleGenAI({ apiKey: key });
            const activeTools = this.getActiveTools('GEMINI');
            
            const config: any = { 
                systemInstruction: systemPrompt, 
                temperature: 0.1, // Stoic precision
            };

            if (activeTools.length > 0) {
                config.tools = activeTools;
            }

            if (selectedModel.specs.speed === 'THINKING' || selectedModel.id.includes('pro')) {
               if (selectedModel.id.includes('2.5') || selectedModel.id.includes('3')) {
                   const budgetStr = localStorage.getItem('thinking_budget');
                   const budget = budgetStr ? parseInt(budgetStr) : 4096; 
                   config.thinkingConfig = { thinkingBudget: budget }; 
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
            GLOBAL_VAULT.reportSuccess('GEMINI');
            
            yield {
              metadata: { provider: 'GEMINI', model: selectedModel.name, latency: Date.now() - startTime, status: 'success' as const }
            };
            return;

          } else {
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
            GLOBAL_VAULT.reportSuccess(selectedModel.provider as any);
            
            yield {
              metadata: { provider: selectedModel.provider, model: selectedModel.name, latency: Date.now() - startTime, status: 'success' as const }
            };
            return;
          }
        } catch (err: any) {
          if (signal?.aborted) return;
          
          // REPORT FAILURE TO VAULT
          GLOBAL_VAULT.reportFailure(selectedModel.provider as Provider, key, err);
          
          debugService.log('ERROR', 'STOIC_KERNEL', 'EXEC_FAIL', `Model ${selectedModel.id} failed: ${err.message}`);
          
          const errStr = JSON.stringify(err);
          const isQuota = errStr.includes('429') || errStr.includes('resource_exhausted') || errStr.includes('quota');
          const isTimeout = errStr.includes('timeout') || errStr.includes('504');

          if (isQuota || isTimeout) {
                // Retry same provider first (Hydra will give new key)
                if (GLOBAL_VAULT.hasAlternativeKeys(provider as Provider)) {
                    yield { metadata: { systemStatus: `${provider} Limit. Rotating key...`, isRerouting: true } };
                    continue; 
                }

                // If no keys left, switch providers
                if (provider === 'GEMINI') {
                    currentModelId = 'llama-3.3-70b-versatile';
                    yield { metadata: { systemStatus: "Gemini Overloaded. Switching to Groq...", isRerouting: true } };
                } else if (provider === 'GROQ') {
                    currentModelId = 'mistral-small-latest';
                    yield { metadata: { systemStatus: "Groq Overloaded. Switching to Mistral...", isRerouting: true } };
                }
                continue;
          }
          
          yield { text: `\n\n> *Logic Matrix Error: ${err.message}*`, metadata: { status: 'error' } };
          return;
        }
    }
  }

  async execute(msg: string, modelId: string, context?: string): Promise<any> {
    const it = this.streamExecute(msg, modelId, context);
    let fullText = "";
    let finalChunk: any = {};
    
    for await (const chunk of it) {
        if (chunk.text) fullText += chunk.text;
        if (chunk.functionCall) finalChunk.functionCall = chunk.functionCall;
        if (chunk.metadata) finalChunk.metadata = chunk.metadata;
    }
    return { ...finalChunk, text: fullText };
  }

  private updateHistory(user: string, assistant: string) {
    this.history.push({ role: 'user', parts: [{ text: user }] }, { role: 'model', parts: [{ text: assistant }] });
    if (this.history.length > 20) this.history = this.history.slice(-20);
  }

  reset() { this.history = []; }
}

export const STOIC_KERNEL = new StoicLogicKernel();
