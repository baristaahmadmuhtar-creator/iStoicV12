
import { GoogleGenAI } from "@google/genai";
import { debugService } from "./debugService";
import { HANISAH_BRAIN } from "./melsaBrain";
import { noteTools, visualTools, searchTools, KEY_MANAGER, SANITIZED_ERRORS } from "./geminiService";
import { mechanicTools } from "../features/mechanic/mechanicTools";
import { streamOpenAICompatible } from "./providerEngine";
import { type ModelMetadata } from "../types";

export const MODEL_CATALOG: ModelMetadata[] = [
  // --- GEMINI 2.5 SERIES (DEFAULT FREE & FAST) ---
  { 
    id: 'gemini-2.5-flash', 
    name: 'Gemini 2.5 Flash', 
    category: 'GEMINI_2_5', 
    provider: 'GEMINI', 
    description: 'Model Default. Tercepat, Gratis, & Multimodal (Teks/Gambar).', 
    specs: { context: '1M', speed: 'INSTANT', intelligence: 9 } 
  },
  
  // --- GEMINI 3 SERIES (FRONTIER) ---
  { 
    id: 'gemini-3-pro-preview', 
    name: 'Gemini 3 Pro', 
    category: 'GEMINI_3', 
    provider: 'GEMINI', 
    description: 'Model tercerdas Google. Reasoning tingkat dewa & multimodalitas terbaik.', 
    specs: { context: '2M+', speed: 'THINKING', intelligence: 10 } 
  },
  { 
    id: 'gemini-3-flash-preview', 
    name: 'Gemini 3 Flash', 
    category: 'GEMINI_3', 
    provider: 'GEMINI', 
    description: 'Performa frontier dengan efisiensi biaya/waktu terbaik.', 
    specs: { context: '1M+', speed: 'FAST', intelligence: 9.5 } 
  },

  // --- GEMINI 2.5 PRO ---
  { 
    id: 'gemini-2.5-pro', 
    name: 'Gemini 2.5 Pro', 
    category: 'GEMINI_2_5', 
    provider: 'GEMINI', 
    description: 'Powerhouse reasoning untuk coding & tugas kompleks (Stable).', 
    specs: { context: '2M', speed: 'DEEP', intelligence: 9.5 } 
  },

  // --- DEEPSEEK OFFICIAL (CHINA) ---
  { 
    id: 'deepseek-reasoner', 
    name: 'DeepSeek R1 (Official)', 
    category: 'DEEPSEEK_OFFICIAL', 
    provider: 'DEEPSEEK', 
    description: 'Model "Thinking" terkuat dari China. Menyaingi o1 dengan CoT logic.', 
    specs: { context: '64K', speed: 'THINKING', intelligence: 9.8 } 
  },
  { 
    id: 'deepseek-chat', 
    name: 'DeepSeek V3 (Official)', 
    category: 'DEEPSEEK_OFFICIAL', 
    provider: 'DEEPSEEK', 
    description: 'General purpose model yang sangat efisien dan cerdas.', 
    specs: { context: '64K', speed: 'FAST', intelligence: 9.5 } 
  },

  // --- GROQ VELOCITY (META/MISTRAL) ---
  { 
    id: 'deepseek-r1-distill-llama-70b', 
    name: 'DeepSeek R1 Distill (Groq)', 
    category: 'GROQ_VELOCITY', 
    provider: 'GROQ', 
    description: 'Versi R1 Llama yang berjalan di LPU Groq. Instant Reasoning.', 
    specs: { context: '128K', speed: 'INSTANT', intelligence: 9.5 } 
  },
  { 
    id: 'llama-3.3-70b-versatile', 
    name: 'Llama 3.3 70B (Groq)', 
    category: 'GROQ_VELOCITY', 
    provider: 'GROQ', 
    description: 'Flagship Meta terbaru. Sangat serbaguna dan cepat via Groq.', 
    specs: { context: '128K', speed: 'INSTANT', intelligence: 9.2 } 
  },

  // --- MISTRAL OFFICIAL ---
  { 
    id: 'mistral-large-latest', 
    name: 'Mistral Large 2', 
    category: 'MISTRAL_NATIVE', 
    provider: 'MISTRAL', 
    description: 'Flagship Eropa. Sangat fasih, logis, dan presisi.', 
    specs: { context: '128K', speed: 'FAST', intelligence: 9.5 } 
  },
  { 
    id: 'mistral-small-latest', 
    name: 'Mistral Small', 
    category: 'MISTRAL_NATIVE', 
    provider: 'MISTRAL', 
    description: 'Model efisien untuk tugas harian dengan latensi rendah.', 
    specs: { context: '32K', speed: 'FAST', intelligence: 8.8 } 
  },

  // --- OPEN ROUTER ELITE (X.AI / ANTHROPIC) ---
  { 
    id: 'x-ai/grok-2-vision-1212', 
    name: 'Grok 2 Vision (OR)', 
    category: 'OPEN_ROUTER_ELITE', 
    provider: 'OPENROUTER', 
    description: 'Kecerdasan dari xAI (Elon Musk). Uncensored-leaning, witty, dan visual.', 
    specs: { context: '32K', speed: 'FAST', intelligence: 9.6 } 
  },
  { 
    id: 'anthropic/claude-3.5-sonnet', 
    name: 'Claude 3.5 Sonnet (OR)', 
    category: 'OPEN_ROUTER_ELITE', 
    provider: 'OPENROUTER', 
    description: 'Standar emas untuk nuansa bahasa & coding via OpenRouter.', 
    specs: { context: '200K', speed: 'FAST', intelligence: 10 } 
  }
];

// --- PRIORITY ROUTING CONFIGURATION ---
const PRIORITY_CHAINS: Record<string, string[]> = {
    // Pro Chain: Gemini 3 Pro -> DeepSeek R1 -> Gemini 2.5 Pro -> Gemini 2.5 Flash
    'gemini-3-pro-preview': [
        'gemini-2.5-flash', // Fallback to fast/free immediately if pro fails
        'gemini-2.5-pro'
    ],
    // DeepSeek Chain: Official -> Groq Distill -> Gemini Flash
    'deepseek-reasoner': [
        'deepseek-r1-distill-llama-70b',
        'gemini-2.5-flash'
    ],
    // Mistral Chain
    'mistral-large-latest': [
        'mistral-small-latest',
        'gemini-2.5-flash'
    ],
    // Grok Chain: Grok 2 -> Llama 3.3 -> Gemini Flash
    'x-ai/grok-2-vision-1212': [
        'llama-3.3-70b-versatile',
        'gemini-2.5-flash'
    ]
};

export interface StreamChunk {
  text?: string;
  functionCall?: any;
  groundingChunks?: any[];
  metadata?: any;
}

export class HanisahKernel {
  private history: any[] = [];

  // Helper: Get next valid model based on Priority Chain
  private getFallbackModel(currentId: string): string | null {
    const candidates = PRIORITY_CHAINS[currentId] || ['gemini-2.5-flash'];

    for (const candidateId of candidates) {
        if (candidateId === currentId) continue;
        const candidateModel = MODEL_CATALOG.find(m => m.id === candidateId);
        if (candidateModel && KEY_MANAGER.isProviderHealthy(candidateModel.provider)) {
            debugService.log('INFO', 'ROUTING', 'FALLBACK_FOUND', `Switching to priority backup: ${candidateModel.name}`);
            return candidateId;
        }
    }

    // Last Resort: Scan for ANY healthy Gemini Flash key as it's the most reliable free tier
    if (KEY_MANAGER.isProviderHealthy('GEMINI')) {
        return 'gemini-2.5-flash';
    }

    return null;
  }

  // UPDATED: Now accepts optional provider to filter tools like 'search' which are Gemini exclusive
  private getActiveTools(provider: string): any[] {
      const configStr = localStorage.getItem('hanisah_tools_config');
      const config = configStr 
          ? JSON.parse(configStr) 
          : { search: true, vault: true, visual: true };

      const tools: any[] = [];
      if (config.vault) tools.push(noteTools);
      if (config.visual) tools.push(visualTools);
      if (config.search && provider === 'GEMINI') tools.push(searchTools); // Only Gemini supports native Google Search
      tools.push(mechanicTools);
      
      return tools;
  }

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

  async *streamExecute(
      msg: string, 
      initialModelId: string, 
      context?: string, 
      imageData?: { data: string, mimeType: string },
      options?: { tools?: any[], systemInstruction?: string }
  ): AsyncGenerator<StreamChunk> {
    
    const systemPrompt = options?.systemInstruction || HANISAH_BRAIN.getSystemInstruction('hanisah', context);
    let currentModelId = initialModelId;
    let attempts = 0;
    const maxAttempts = 4;

    while (attempts < maxAttempts) {
        attempts++;
        const model = MODEL_CATALOG.find(m => m.id === currentModelId) || MODEL_CATALOG[0];
        const provider = model.provider;
        const startTime = Date.now();

        // 1. CHECK KEY HEALTH
        const key = KEY_MANAGER.getKey(provider);
        if (!key) {
            debugService.log('WARN', 'KERNEL', 'SKIP_PROVIDER', `${provider} unavailable (Cooldown/Empty).`);
            const fallback = this.getFallbackModel(currentModelId);
            if (fallback) {
                yield { text: `\n\n> *Provider ${provider} exhausted. Rerouting to ${fallback}...*\n\n` };
                currentModelId = fallback;
                continue; 
            } else {
                yield { text: `**SILENCE**: All external resources are currently silent. We must wait.` };
                return;
            }
        }

        debugService.log('INFO', 'KERNEL', 'EXEC_START', `Attempting ${model.name} (Try ${attempts})`, { modelId: model.id });

        try {
            // --- GEMINI EXECUTION ---
            if (provider === 'GEMINI') {
                const activeTools = options?.tools || this.getActiveTools('GEMINI');
                const ai = new GoogleGenAI({ apiKey: key });
                const config: any = { 
                    systemInstruction: systemPrompt, 
                    temperature: 0.8, 
                    tools: activeTools
                };
                if (model.id.includes('pro')) config.thinkingConfig = { thinkingBudget: 4096 };

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
                    if (chunk.functionCalls?.length) yield { functionCall: chunk.functionCalls[0] };
                    if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
                        yield { groundingChunks: chunk.candidates[0].groundingMetadata.groundingChunks };
                    }
                }
                this.updateHistory(msg, fullText);
                debugService.trackNetwork(model.id, startTime);
                KEY_MANAGER.reportSuccess(provider);
                yield { metadata: { provider: 'GEMINI', model: model.name, latency: Date.now() - startTime } };
                return;

            } else {
                // --- OPENAI COMPATIBLE (DEEPSEEK, GROQ, OPENROUTER, MISTRAL) ---
                const hist = this.history.map(h => ({ role: h.role === 'assistant' ? 'assistant' : h.role, content: h.content }));
                
                // Construct standard content
                let currentContent: any = msg;
                if (imageData) {
                    // OpenRouter/DeepSeek Vision format (if supported)
                    currentContent = [
                        { type: "text", text: msg }, 
                        { type: "image_url", image_url: { url: `data:${imageData.mimeType};base64,${imageData.data}` } }
                    ];
                }

                // TOOL TRANSLATION LOGIC (GOOGLE -> OPENAI)
                const rawTools = options?.tools || this.getActiveTools(provider);
                const openAITools = rawTools.flatMap((t: any) => t.functionDeclarations || []).map((fd: any) => ({
                    type: 'function',
                    function: {
                        name: fd.name,
                        description: fd.description,
                        parameters: fd.parameters
                    }
                }));

                // Streaming via Provider Engine
                const stream = streamOpenAICompatible(
                    provider, 
                    model.id, 
                    [...hist, { role: 'user', content: currentContent }], 
                    systemPrompt,
                    openAITools // Pass converted tools
                );

                let fullText = "";
                for await (const chunk of stream) {
                    if (chunk.text) {
                        fullText += chunk.text;
                        yield { text: chunk.text };
                    }
                    if (chunk.functionCall) {
                        yield { functionCall: chunk.functionCall };
                    }
                }
                this.updateHistory(msg, fullText);
                debugService.trackNetwork(model.id, startTime);
                KEY_MANAGER.reportSuccess(provider);
                yield { metadata: { provider: provider, model: model.name, latency: Date.now() - startTime } };
                return;
            }

        } catch (err: any) {
            const errorMsg = err.message || JSON.stringify(err);
            debugService.log('ERROR', 'KERNEL', 'EXEC_FAIL', `Provider ${provider} failed: ${errorMsg.slice(0,100)}`);
            KEY_MANAGER.reportFailure(provider, err);

            const fallback = this.getFallbackModel(currentModelId);
            if (fallback && attempts < maxAttempts) {
                yield { text: `\n\n> *Connection interrupted. Rerouting logic...*\n\n` };
                currentModelId = fallback;
                continue; 
            } else {
                let cleanError = SANITIZED_ERRORS.DEFAULT;
                if (errorMsg.includes('429') || errorMsg.includes('quota')) cleanError = SANITIZED_ERRORS.QUOTA;
                else if (errorMsg.includes('fetch') || errorMsg.includes('network')) cleanError = SANITIZED_ERRORS.NETWORK;
                yield { text: `\n\n**SYSTEM PAUSE**: ${cleanError}` };
                return;
            }
        }
    }
  }

  private updateHistory(u: string, a: string) {
    if (!u || !a) return;
    this.history.push({ role: 'user', content: u }, { role: 'assistant', content: a });
    if (this.history.length > 10) this.history = this.history.slice(-10);
  }
}

export const HANISAH_KERNEL = new HanisahKernel();
