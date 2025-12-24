
import { GoogleGenAI } from "@google/genai";
import { debugService } from "./debugService";
import { MELSA_BRAIN } from "./melsaBrain";
import { noteTools, visualTools, searchTools, KEY_MANAGER, SANITIZED_ERRORS } from "./geminiService";
import { mechanicTools } from "../features/mechanic/mechanicTools";
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

// --- PRIORITY ROUTING CONFIGURATION ---
const PRIORITY_CHAINS: Record<string, string[]> = {
    // Logic/Reasoning Chain: Pro -> Flash -> DeepSeek -> Claude
    'gemini-3-pro-preview': [
        'gemini-3-flash-preview', 
        'deepseek-r1-distill-llama-70b', 
        'anthropic/claude-3.5-sonnet',
        'mistral-large-latest'
    ],
    // Speed/Efficiency Chain: Flash -> Pro -> Llama -> Gemini 2.0
    'gemini-3-flash-preview': [
        'gemini-3-pro-preview', 
        'llama-3.3-70b-versatile', 
        'google/gemini-2.0-flash-exp:free'
    ],
    // Specialized Arsenal Fallbacks
    'deepseek-r1-distill-llama-70b': ['llama-3.3-70b-versatile', 'gemini-3-flash-preview'],
    'llama-3.3-70b-versatile': ['deepseek-r1-distill-llama-70b', 'gemini-3-flash-preview'],
    'mistral-large-latest': ['gemini-3-flash-preview']
};

export interface StreamChunk {
  text?: string;
  functionCall?: any;
  groundingChunks?: any[];
  metadata?: any;
}

export class MelsaKernel {
  private history: any[] = [];

  // Helper: Get next valid model based on Priority Chain
  private getFallbackModel(currentId: string): string | null {
    // 1. Get the specific priority chain for this model, or default to a safe list
    const candidates = PRIORITY_CHAINS[currentId] || ['gemini-3-flash-preview', 'gemini-3-pro-preview'];

    // 2. Iterate through the chain and find the first HEALTHY provider
    for (const candidateId of candidates) {
        // Prevent infinite loops if chain contains current model
        if (candidateId === currentId) continue;

        const candidateModel = MODEL_CATALOG.find(m => m.id === candidateId);
        if (candidateModel && KEY_MANAGER.isProviderHealthy(candidateModel.provider)) {
            debugService.log('INFO', 'ROUTING', 'FALLBACK_FOUND', `Switching to priority backup: ${candidateModel.name}`);
            return candidateId;
        }
    }

    // 3. Last Resort: Scan entire catalog for ANY healthy provider that isn't the current one
    const anyHealthy = MODEL_CATALOG.find(m => m.id !== currentId && KEY_MANAGER.isProviderHealthy(m.provider));
    if (anyHealthy) {
        debugService.log('WARN', 'ROUTING', 'LAST_RESORT', `Priority chain exhausted. Using available model: ${anyHealthy.name}`);
        return anyHealthy.id;
    }

    return null;
  }

  private getActiveTools(): any[] {
      // Read Config (Defaults: All Enabled for Melsa)
      const configStr = localStorage.getItem('melsa_tools_config');
      const config = configStr 
          ? JSON.parse(configStr) 
          : { search: true, vault: true, visual: true };

      const tools: any[] = [];
      if (config.vault) tools.push(noteTools);
      if (config.visual) tools.push(visualTools);
      if (config.search) tools.push(searchTools);
      
      // Always enable mechanic tools for system integrity
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
    
    const systemPrompt = options?.systemInstruction || MELSA_BRAIN.getSystemInstruction('melsa', context);
    let currentModelId = initialModelId;
    let attempts = 0;
    const maxAttempts = 4; // Prevent infinite loops

    while (attempts < maxAttempts) {
        attempts++;
        const model = MODEL_CATALOG.find(m => m.id === currentModelId) || MODEL_CATALOG[0];
        const provider = model.provider;
        const startTime = Date.now();

        // 1. CHECK KEY HEALTH
        const key = KEY_MANAGER.getKey(provider);
        if (!key) {
            debugService.log('WARN', 'KERNEL', 'SKIP_PROVIDER', `${provider} unavailable (Cooldown/Empty).`);
            
            // Trigger Fallback immediately
            const fallback = this.getFallbackModel(currentModelId);
            if (fallback) {
                yield { text: `\n\n> *The primary path is blocked. Shifting perspective...*\n\n` };
                currentModelId = fallback;
                continue; 
            } else {
                yield { text: `**SILENCE**: All external resources are currently silent. We must wait.` };
                return;
            }
        }

        debugService.log('INFO', 'KERNEL', 'EXEC_START', `Attempting ${model.name} (Try ${attempts})`, { modelId: model.id });

        try {
            // --- EXECUTION BLOCK ---
            if (provider === 'GEMINI') {
                const activeTools = options?.tools || this.getActiveTools();
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
                
                // REPORT SUCCESS
                KEY_MANAGER.reportSuccess(provider);
                
                yield { metadata: { provider: 'GEMINI', model: model.name, latency: Date.now() - startTime } };
                return; // SUCCESS - Exit Loop

            } else {
                // OTHER PROVIDERS (Groq, etc)
                // Note: Other providers might not support Google Tools, so we strip them here to prevent crash
                const hist = this.history.map(h => ({ role: h.role === 'assistant' ? 'assistant' : h.role, content: h.content }));
                let currentContent: any = msg;
                if (imageData) currentContent = [{ type: "text", text: msg }, { type: "image_url", image_url: { url: `data:${imageData.mimeType};base64,${imageData.data}` } }];

                // We stream without specific tools for now on fallbacks to ensure stability
                const stream = streamOpenAICompatible(provider, model.id, [...hist, { role: 'user', content: currentContent }], systemPrompt);

                let fullText = "";
                for await (const chunk of stream) {
                    if (chunk.text) {
                        fullText += chunk.text;
                        yield { text: chunk.text };
                    }
                }
                this.updateHistory(msg, fullText);
                debugService.trackNetwork(model.id, startTime);
                
                // REPORT SUCCESS
                KEY_MANAGER.reportSuccess(provider);

                yield { metadata: { provider: provider, model: model.name, latency: Date.now() - startTime } };
                return; // SUCCESS - Exit Loop
            }

        } catch (err: any) {
            // --- ERROR HANDLING & FALLBACK LOGIC ---
            const errorMsg = err.message || JSON.stringify(err);
            debugService.log('ERROR', 'KERNEL', 'EXEC_FAIL', `Provider ${provider} failed: ${errorMsg.slice(0,100)}`);
            
            // Report to KeyManager to trigger Kill-Switch if Quota/429
            KEY_MANAGER.reportFailure(provider, err);

            const fallback = this.getFallbackModel(currentModelId);
            
            if (fallback && attempts < maxAttempts) {
                // Determine user-friendly error message
                let reason = "An unexpected obstacle has arisen";
                if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('exhausted')) reason = "Cognitive resources momentarily depleted";
                
                // Yield system notification to UI stream
                yield { text: `\n\n> *${reason}. Re-aligning logic path...*\n\n` };
                
                // Switch model and LOOP again
                currentModelId = fallback;
                continue; 
            } else {
                // Total Failure (No fallbacks left or max attempts reached)
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
    if (this.history.length > 12) this.history = this.history.slice(-12);
  }
}

export const MELSA_KERNEL = new MelsaKernel();
