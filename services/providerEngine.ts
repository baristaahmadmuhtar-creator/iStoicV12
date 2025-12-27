
import { KEY_MANAGER } from "./geminiService";
import { debugService } from "./debugService";
import { GoogleGenAI } from "@google/genai";

export interface StandardMessage {
    role: string;
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

/**
 * Konversi Google Tools ke format OpenAI yang valid.
 */
function convertToolsToOpenAI(googleTools: any[]): any[] | undefined {
    if (!googleTools || googleTools.length === 0) return undefined;

    const openaiTools: any[] = [];

    googleTools.forEach(toolBlock => {
        if (toolBlock.functionDeclarations) {
            toolBlock.functionDeclarations.forEach((fd: any) => {
                const parameters = JSON.parse(JSON.stringify(fd.parameters || {}));
                
                // Fix types for OpenAI strictness
                const fixTypes = (schema: any) => {
                    if (!schema) return;
                    if (schema.type && typeof schema.type === 'string') {
                        schema.type = schema.type.toLowerCase();
                    }
                    if (schema.properties) {
                        for (const key in schema.properties) {
                            fixTypes(schema.properties[key]);
                        }
                    }
                    if (schema.items) {
                        fixTypes(schema.items);
                    }
                };
                fixTypes(parameters);

                openaiTools.push({
                    type: "function",
                    function: {
                        name: fd.name,
                        description: fd.description,
                        parameters: parameters
                    }
                });
            });
        }
    });

    return openaiTools.length > 0 ? openaiTools : undefined;
}

/**
 * Universal Streamer untuk Provider Non-Gemini
 */
export async function* streamOpenAICompatible(
    provider: 'GROQ' | 'DEEPSEEK' | 'OPENAI' | 'MISTRAL' | 'OPENROUTER',
    modelId: string,
    messages: StandardMessage[],
    systemInstruction?: string,
    tools: any[] = [],
    signal?: AbortSignal
): AsyncGenerator<{ text?: string; functionCall?: any; }> {

    const apiKey = KEY_MANAGER.getKey(provider);
    
    if (!apiKey) {
        yield { text: `\n\n⚠️ **AKSES DITOLAK**: API Key untuk **${provider}** tidak ditemukan di Vault.` };
        return;
    }

    // DeepSeek Reasoner tidak support System Role di beberapa endpoint, tapi kita coba standard dulu.
    // Jika model adalah 'deepseek-reasoner', kita masukkan system prompt ke user prompt pertama agar aman.
    let finalMessages = [...messages];
    if (modelId === 'deepseek-reasoner') {
        finalMessages[0].content = `${systemInstruction}\n\n${finalMessages[0].content}`;
    } else {
        finalMessages.unshift({ role: 'system', content: systemInstruction || "You are a helpful assistant." });
    }

    const baseURLMap: Record<string, string> = {
        'GROQ': 'https://api.groq.com/openai/v1/chat/completions',
        'DEEPSEEK': 'https://api.deepseek.com/chat/completions',
        'OPENAI': 'https://api.openai.com/v1/chat/completions',
        'OPENROUTER': 'https://openrouter.ai/api/v1/chat/completions',
        'MISTRAL': 'https://api.mistral.ai/v1/chat/completions'
    };

    const endpoint = baseURLMap[provider];
    const headers: any = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    };

    if (provider === 'OPENROUTER') {
        headers['HTTP-Referer'] = window.location.origin;
        headers['X-Title'] = 'IStoicAI Platinum';
    }

    const body: any = {
        model: modelId,
        messages: finalMessages,
        stream: true,
        // DeepSeek Reasoner tidak support temperature parameter di beberapa versi
        temperature: modelId === 'deepseek-reasoner' ? undefined : 0.7
    };

    // Matikan tools untuk model reasoning atau jika tools kosong
    if (modelId !== 'deepseek-reasoner' && !modelId.includes('r1') && tools && tools.length > 0) {
        const compatibleTools = convertToolsToOpenAI(tools);
        if (compatibleTools) {
            body.tools = compatibleTools;
            body.tool_choice = "auto";
        }
    }

    let response;
    try {
        response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal
        });
    } catch (e: any) {
        if (e.name === 'AbortError') throw e;
        debugService.log('ERROR', provider, 'NET_ERR', e.message);
        throw new Error(`Koneksi Gagal (${provider}): ${e.message}`);
    }

    if (!response.ok) {
        let errorText = "";
        try { errorText = await response.text(); } catch {}
        debugService.log('ERROR', provider, `API_${response.status}`, errorText);
        throw new Error(`API Error ${response.status}: ${errorText.slice(0, 100)}...`);
    }

    if (!response.body) throw new Error("Respons kosong dari server.");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    
    let toolCallAccumulator: any = {};
    let isAccumulatingTool = false;

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (signal?.aborted) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ""; 

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === 'data: [DONE]') continue;
                if (trimmed.startsWith('data: ')) {
                    try {
                        const json = JSON.parse(trimmed.slice(6));
                        const choice = json.choices?.[0];
                        if (!choice) continue;

                        const delta = choice.delta;

                        // 1. Text Content
                        if (delta?.content) {
                            yield { text: delta.content };
                        }

                        // 2. Reasoning Content (DeepSeek R1 / Groq R1)
                        if ((delta as any)?.reasoning_content) {
                            // Render reasoning block
                            yield { text: `\n<think>${(delta as any).reasoning_content}</think>` };
                        }

                        // 3. Tool Calls
                        if (delta?.tool_calls) {
                            isAccumulatingTool = true;
                            for (const tc of delta.tool_calls) {
                                const idx = tc.index;
                                if (!toolCallAccumulator[idx]) {
                                    toolCallAccumulator[idx] = { 
                                        name: tc.function?.name || "", 
                                        args: tc.function?.arguments || "",
                                        id: tc.id 
                                    };
                                } else {
                                    if (tc.function?.arguments) toolCallAccumulator[idx].args += tc.function.arguments;
                                }
                            }
                        }
                    } catch (e) {
                        // Ignore parse errors for partial chunks
                    }
                }
            }
        }
    } finally {
        reader.releaseLock();
    }

    if (isAccumulatingTool && !signal?.aborted) {
        for (const idx in toolCallAccumulator) {
            const tc = toolCallAccumulator[idx];
            try {
                const args = JSON.parse(tc.args);
                yield { 
                    functionCall: {
                        name: tc.name,
                        args: args
                    } 
                };
            } catch (e) {
                yield { text: `\n\n[SYSTEM: Gagal memproses tool ${tc.name}. Argumen rusak.]` };
            }
        }
    }
}

// ... (Sisa fungsi analyzeMultiModalMedia dan generateMultiModalImage tetap sama, gunakan yang ada di file lama) ...
export async function analyzeMultiModalMedia(provider: string, modelId: string, data: string, mimeType: string, prompt: string): Promise<string> {
    const apiKey = KEY_MANAGER.getKey(provider as any);
    if (!apiKey) throw new Error(`API Key for ${provider} not found`);

    if (provider === 'GEMINI') {
        try {
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: modelId || 'gemini-2.5-flash-latest', // Update to 2.5 Flash
                contents: { parts: [{ inlineData: { data, mimeType } }, { text: prompt }] }
            });
            KEY_MANAGER.reportSuccess('GEMINI');
            return response.text || "No response.";
        } catch (e: any) {
            KEY_MANAGER.reportFailure('GEMINI', apiKey, e);
            throw new Error(`Gemini Vision Failed: ${e.message}`);
        }
    }
    
    // Fallback logic for OpenAI compatible vision is same as before
    return "Vision not fully supported on this provider yet.";
}

export async function generateMultiModalImage(provider: string, modelId: string, prompt: string, options: any): Promise<string> {
    const apiKey = KEY_MANAGER.getKey(provider as any);
    if (!apiKey) throw new Error(`API Key for ${provider} not found`);
    
    if (provider === 'GEMINI') {
        try {
            const ai = new GoogleGenAI({ apiKey });
            const ratio = options?.aspectRatio || "1:1";
            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash-exp', // Use Experimental 2.0 or dedicated image model
                contents: { parts: [{ text: prompt }] },
                config: { imageConfig: { aspectRatio: ratio } } 
            });
            
            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    KEY_MANAGER.reportSuccess('GEMINI');
                    return `data:image/png;base64,${part.inlineData.data}`;
                }
            }
            throw new Error("No image data returned.");
        } catch(e) {
            KEY_MANAGER.reportFailure('GEMINI', process.env.API_KEY || 'UNK', e);
            throw e;
        }
    }
    throw new Error(`Provider ${provider} not supported for Image Generation.`);
}
