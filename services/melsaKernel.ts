
import { GoogleGenAI } from "@google/genai";
import { debugService } from "./debugService";
import { MELSA_BRAIN } from "./melsaBrain";
import { noteTools, visualTools, searchTools, KEY_MANAGER } from "./geminiService";
import { streamOpenAICompatible } from "./providerEngine";
import { type ModelMetadata } from "../types";

export const MODEL_CATALOG: ModelMetadata[] = [
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', category: 'GEMINI_3', provider: 'GEMINI', description: 'Logika level dewa. Reasoning tinggi & Multimodal.', specs: { context: '2M+', speed: 'THINKING', intelligence: 10 } },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', category: 'GEMINI_3', provider: 'GEMINI', description: 'Kecepatan cahaya. Efisien untuk tugas harian.', specs: { context: '1M+', speed: 'FAST', intelligence: 9 } },
  { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 (Groq)', category: 'ARSENAL', provider: 'GROQ', description: 'Model reasoning tercepat di dunia via Groq.', specs: { context: '128K', speed: 'INSTANT', intelligence: 9.5 } },
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Groq)', category: 'ARSENAL', provider: 'GROQ', description: 'Meta AI flagship via Groq LPU.', specs: { context: '128K', speed: 'INSTANT', intelligence: 9 } },
  { id: 'mistral-large-latest', name: 'Mistral Large', category: 'ARSENAL', provider: 'MISTRAL', description: 'Flagship Eropa. Sangat fasih & logis.', specs: { context: '128K', speed: 'FAST', intelligence: 9.5 } },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (OR)', category: 'ARSENAL', provider: 'OPENROUTER', description: 'Best-in-class coding & nuance.', specs: { context: '200K', speed: 'FAST', intelligence: 10 } },
  { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 (Free)', category: 'ARSENAL', provider: 'OPENROUTER', description: 'Akses gratis ke model terbaru.', specs: { context: '1M', speed: 'FAST', intelligence: 9 } }
];

export interface StreamChunk {
  text?: string;
  functionCall?: any;
  groundingChunks?: any[];
  metadata?: any;
}

class MelsaKernel {
  private history: any[] = [];

  async execute(msg: string, modelId: string, context?: string, imageData?: { data: string, mimeType: string }): Promise<StreamChunk> {
    const stream = this.streamExecute(msg, modelId, context, imageData);
    let fullText = "";
    let lastChunk: StreamChunk = {};
    for await (const chunk of stream) {
      if (chunk.text) fullText += chunk.text;
      lastChunk = chunk;
    }
    return { ...lastChunk, text: fullText };
  }

  async *streamExecute(msg: string, modelId: string, context?: string, imageData?: { data: string, mimeType: string }): AsyncGenerator<StreamChunk> {
    const startTime = Date.now();
    const model = MODEL_CATALOG.find(m => m.id === modelId) || MODEL_CATALOG[0];
    const systemPrompt = MELSA_BRAIN.getSystemInstruction('melsa', context);
    
    // Log Start
    debugService.log('INFO', 'KERNEL', 'EXEC_START', `Executing prompt on ${model.name}`, { modelId: model.id, provider: model.provider });

    const key = KEY_MANAGER.getKey(model.provider);
    if (!key) {
        debugService.log('ERROR', 'KERNEL', 'NO_KEY', `Missing API Key for ${model.provider}`);
        yield { text: `⚠️ **ACCESS_DENIED**: Kunci API untuk **${model.provider}** tidak ditemukan di .env terminal.` };
        return;
    }

    try {
      if (model.provider === 'GEMINI') {
        const ai = new GoogleGenAI({ apiKey: key });
        const config: any = { 
          systemInstruction: systemPrompt, 
          temperature: 0.8, 
          tools: model.id.includes('flash') ? [noteTools, visualTools, searchTools] : [noteTools, visualTools]
        };
        
        if (model.id.includes('pro')) {
          config.thinkingConfig = { thinkingBudget: 4096 };
        }

        const contents = [
            ...this.history.map(h => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: h.content }] })), 
            { role: 'user', parts: imageData ? [{ inlineData: imageData }, { text: msg }] : [{ text: msg }] }
        ];

        const stream = await ai.models.generateContentStream({ model: model.id, contents, config });

        let fullText = "";
        for await (const chunk of stream) {
          if (chunk.text) {
            fullText += chunk.text;
            yield { text: chunk.text };
          }
          if (chunk.functionCalls?.length) {
             debugService.log('INFO', 'KERNEL', 'TOOL_CALL', `Model requested tool: ${chunk.functionCalls[0].name}`, chunk.functionCalls[0]);
             yield { functionCall: chunk.functionCalls[0] };
          }
          if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            yield { groundingChunks: chunk.candidates[0].groundingMetadata.groundingChunks };
          }
        }
        this.updateHistory(msg, fullText);
        
        // Log Success & Latency
        debugService.trackNetwork(model.id, startTime);
        yield { metadata: { provider: 'GEMINI', model: model.name, latency: Date.now() - startTime } };

      } else {
        const hist = this.history.map(h => ({ role: h.role === 'assistant' ? 'assistant' : h.role, content: h.content }));
        let currentContent: any = msg;
        if (imageData) {
             currentContent = [{ type: "text", text: msg }, { type: "image_url", image_url: { url: `data:${imageData.mimeType};base64,${imageData.data}` } }];
        }

        const stream = streamOpenAICompatible(model.provider, model.id, [...hist, { role: 'user', content: currentContent }], systemPrompt);

        let fullText = "";
        for await (const chunk of stream) {
            if (chunk.text) {
                fullText += chunk.text;
                yield { text: chunk.text };
            }
        }
        this.updateHistory(msg, fullText);
        debugService.trackNetwork(model.id, startTime);
        yield { metadata: { provider: model.provider, model: model.name, latency: Date.now() - startTime } };
      }
    } catch (err: any) {
      debugService.log('ERROR', 'KERNEL', 'EXEC_FAIL', err.message, { stack: err.stack });
      yield { text: `\n\n**System Error [${model.provider}]:** ${err.message}` };
    }
  }

  private updateHistory(u: string, a: string) {
    if (!u || !a) return;
    this.history.push({ role: 'user', content: u }, { role: 'assistant', content: a });
    if (this.history.length > 12) this.history = this.history.slice(-12);
  }
}

export const MELSA_KERNEL = new MelsaKernel();
