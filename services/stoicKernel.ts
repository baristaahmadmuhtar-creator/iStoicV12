
import { GoogleGenAI } from "@google/genai";
import { noteTools, searchTools, KEY_MANAGER } from "./geminiService";
import { debugService } from "./debugService";
import { MODEL_CATALOG, type StreamChunk } from "./melsaKernel";
import { MELSA_BRAIN } from "./melsaBrain";

class StoicLogicKernel {
  private history: any[] = [];

  async *streamExecute(msg: string, modelId: string, context?: string): AsyncGenerator<StreamChunk> {
    const startTime = Date.now();
    let selectedModel = MODEL_CATALOG.find(m => m.id === modelId) || MODEL_CATALOG[0];
    const systemPrompt = MELSA_BRAIN.getSystemInstruction('stoic', context);
    
    // Get Rotated Key
    const key = KEY_MANAGER.getKey(selectedModel.provider);

    try {
      if (selectedModel.provider === 'GEMINI') {
        const ai = new GoogleGenAI({ apiKey: key });
        const config: any = { 
            systemInstruction: systemPrompt, 
            temperature: 0.1,
            tools: [noteTools, searchTools] 
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
        yield {
          metadata: { provider: 'GEMINI', model: selectedModel.name, latency: Date.now() - startTime, status: 'success' as const }
        };
      } else {
        // Fallback for non-Gemini models (Basic fetch without streaming for Stoic for now)
        const result = await this.execute(msg, modelId, context);
        yield result;
      }
    } catch (err: any) {
      debugService.log('ERROR', 'STOIC_KERNEL', 'SYS-01', err.message);
      yield { text: `Error: ${err.message}`, metadata: { status: 'error' } };
    }
  }

  async execute(msg: string, modelId: string, context?: string): Promise<any> {
    const startTime = Date.now();
    let selectedModel = MODEL_CATALOG.find(m => m.id === modelId) || MODEL_CATALOG[0];
    const systemPrompt = MELSA_BRAIN.getSystemInstruction('stoic', context);
    const key = KEY_MANAGER.getKey(selectedModel.provider);

    try {
      if (selectedModel.provider === 'GEMINI') {
        const ai = new GoogleGenAI({ apiKey: key });
        const config: any = { 
            systemInstruction: systemPrompt, 
            temperature: 0.1,
            tools: [noteTools, searchTools] 
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

        return {
          text,
          groundingChunks,
          metadata: { provider: 'GEMINI', model: selectedModel.name, latency: Date.now() - startTime, status: 'success' as const }
        };
      }
      return { text: "Koneksi Stoic saat ini hanya optimal untuk Gemini.", metadata: { status: 'error' as const } };
    } catch (err: any) {
      debugService.log('ERROR', 'STOIC_KERNEL', 'SYS-01', err.message);
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
