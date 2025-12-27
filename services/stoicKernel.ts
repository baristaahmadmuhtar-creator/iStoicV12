
import { GoogleGenAI } from "@google/genai";
import { noteTools, searchTools, visualTools, universalTools, KEY_MANAGER } from "./geminiService";
import { debugService } from "./debugService";
import { MODEL_CATALOG, type StreamChunk } from "./melsaKernel";
import { HANISAH_BRAIN } from "./melsaBrain";
import { streamOpenAICompatible } from "./providerEngine";

class StoicLogicKernel {
  private history: any[] = [];

  private getActiveTools(provider: string, vaultUnlocked: boolean = false): any[] {
      const configStr = localStorage.getItem('stoic_tools_config');
      const config = configStr 
          ? JSON.parse(configStr) 
          : { search: true, vault: true, visual: false };

      if (provider === 'GEMINI') {
          const tools: any[] = [];
          if (config.vault && vaultUnlocked) tools.push(noteTools);
          if (config.visual) tools.push(visualTools);
          if (config.search) tools.push(searchTools);
          return tools;
      } else {
          if ((config.search || config.vault) && vaultUnlocked) {
              return universalTools.functionDeclarations ? [universalTools] : [];
          }
          return [];
      }
  }

  async *streamExecute(msg: string, modelId: string, context?: string, attachment?: any, configOverride?: any): AsyncGenerator<StreamChunk> {
    const systemPrompt = HANISAH_BRAIN.getSystemInstruction('stoic', context);
    const signal = configOverride?.signal;
    const vaultUnlocked = configOverride?.vaultUnlocked || false;
    
    let effectiveModelId = modelId === 'auto-best' ? 'llama-3.3-70b-versatile' : modelId;
    const plan = [effectiveModelId, 'gemini-3-pro-preview', 'gpt-4o-mini'];
    const uniquePlan = [...new Set(plan)];

    for (const currentModelId of uniquePlan) {
        if (signal?.aborted) break;
        let selectedModel = MODEL_CATALOG.find(m => m.id === currentModelId) || MODEL_CATALOG.find(m => m.id === 'gemini-3-pro-preview');
        if (!selectedModel) continue;

        const key = KEY_MANAGER.getKey(selectedModel.provider);
        const startTime = Date.now();

        try {
          if (selectedModel.provider === 'GEMINI') {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const activeTools = this.getActiveTools('GEMINI', vaultUnlocked);
            const config: any = { systemInstruction: systemPrompt, temperature: 0.1 };
            if (activeTools.length > 0) config.tools = activeTools;

            const responseStream = await ai.models.generateContentStream({
              model: selectedModel.id,
              contents: [...this.history, { role: 'user', parts: [{ text: msg }] }],
              config
            });

            let fullText = "";
            for await (const chunk of responseStream) {
              if (signal?.aborted) break;
              if (chunk.text) { fullText += chunk.text; yield { text: chunk.text }; }
              if (chunk.functionCalls?.length) yield { functionCall: chunk.functionCalls[0] };
            }
            this.updateHistory(msg, fullText);
            KEY_MANAGER.reportSuccess('GEMINI');
            yield { metadata: { provider: 'GEMINI', model: selectedModel.name, latency: Date.now() - startTime, status: 'success' } };
            return;
          } else {
            const activeTools = this.getActiveTools(selectedModel.provider, vaultUnlocked);
            const stream = streamOpenAICompatible(selectedModel.provider as any, selectedModel.id, [{ role: 'user', content: msg }], systemPrompt, activeTools, signal);
            let fullText = "";
            for await (const chunk of stream) {
                if (signal?.aborted) break;
                if (chunk.text) { fullText += chunk.text; yield { text: chunk.text }; }
                if (chunk.functionCall) yield { functionCall: chunk.functionCall };
            }
            this.updateHistory(msg, fullText);
            KEY_MANAGER.reportSuccess(selectedModel.provider as any);
            yield { metadata: { provider: selectedModel.provider, model: selectedModel.name, latency: Date.now() - startTime, status: 'success' } };
            return;
          }
        } catch (err: any) {
          debugService.log('ERROR', 'STOIC_KERNEL', 'EXEC_FAIL', err.message);
          KEY_MANAGER.reportFailure(selectedModel.provider, key || process.env.API_KEY || 'UNKNOWN', err);
          if (currentModelId === uniquePlan[uniquePlan.length - 1]) {
             yield { text: `\n\n> *Logical flow disrupted.*`, metadata: { status: 'error' } };
          }
        }
    }
  }

  async execute(msg: string, modelId: string, context?: string): Promise<any> {
    const startTime = Date.now();
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
}

export const STOIC_KERNEL = new StoicLogicKernel();
