
import { KEY_MANAGER } from "./geminiService";
import { debugService } from "./debugService";
import { GoogleGenAI } from "@google/genai";

export interface StandardMessage {
    role: string;
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

/**
 * Converts Google GenAI Tool format (FunctionDeclaration) to OpenAI Tool format.
 * Fixes 400 errors caused by sending incompatible schemas (e.g. UPPERCASE types).
 */
function convertToolsToOpenAI(googleTools: any[]): any[] | undefined {
    if (!googleTools || googleTools.length === 0) return undefined;

    const openaiTools: any[] = [];

    googleTools.forEach(toolBlock => {
        // Google tools are wrapped in { functionDeclarations: [...] }
        if (toolBlock.functionDeclarations) {
            toolBlock.functionDeclarations.forEach((fd: any) => {
                // Deep clone parameters to avoid mutating original and lower-case types
                const parameters = JSON.parse(JSON.stringify(fd.parameters || {}));
                
                // Recursive function to lowercase types (Google uses 'STRING', OpenAI uses 'string')
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
 * Native Fetch Implementation for OpenAI-Compatible Streaming.
 * Bypasses CORS issues caused by SDK headers (x-stainless-timeout).
 */
export async function* streamOpenAICompatible(
    provider: 'GROQ' | 'DEEPSEEK' | 'OPENAI' | 'XAI' | 'MISTRAL' | 'OPENROUTER',
    modelId: string,
    messages: StandardMessage[],
    systemInstruction?: string,
    tools: any[] = [],
    signal?: AbortSignal
): AsyncGenerator<{ text?: string; functionCall?: any; }> {

    const apiKey = KEY_MANAGER.getKey(provider);
    
    if (!apiKey) {
        yield { text: `\n\n⚠️ **SISTEM HALT**: Kunci API untuk **${provider}** tidak valid atau kosong.` };
        return;
    }

    const fullMessages: any[] = [
        { role: 'system', content: systemInstruction || "You are a helpful assistant." },
        ...messages
    ];

    const baseURLMap: Record<string, string> = {
        'GROQ': 'https://api.groq.com/openai/v1/chat/completions',
        'DEEPSEEK': 'https://api.deepseek.com/chat/completions',
        'OPENAI': 'https://api.openai.com/v1/chat/completions',
        'XAI': 'https://api.x.ai/v1/chat/completions',
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

    // Prepare Body
    const body: any = {
        model: modelId,
        messages: fullMessages,
        stream: true,
        temperature: provider === 'DEEPSEEK' && modelId === 'deepseek-reasoner' ? undefined : 0.7
    };

    // Only attach tools if supported and available
    // DeepSeek Reasoner does NOT support tools.
    if (modelId !== 'deepseek-reasoner' && tools && tools.length > 0) {
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
            signal // Pass the signal here
        });
    } catch (e: any) {
        if (e.name === 'AbortError') {
            throw e; // Propagate abort
        }
        debugService.log('ERROR', provider, 'NET_ERR', e.message);
        throw new Error(`Network Error (${provider}): ${e.message}`);
    }

    if (!response.ok) {
        let errorText = "";
        try { errorText = await response.text(); } catch {}
        debugService.log('ERROR', provider, `API_${response.status}`, errorText);
        throw new Error(`API Error ${response.status} from ${provider}: ${errorText.slice(0, 100)}...`);
    }

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    
    // Tool Accumulator
    let toolCallAccumulator: any = {};
    let isAccumulatingTool = false;

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (signal?.aborted) break; // Check signal in loop
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ""; // Keep incomplete line

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

                        // 2. Reasoning Content (DeepSeek R1)
                        if ((delta as any)?.reasoning_content) {
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

    // Finalize Tool Calls if NOT aborted
    if (isAccumulatingTool && !signal?.aborted) {
        for (const idx in toolCallAccumulator) {
            const tc = toolCallAccumulator[idx];
            try {
                // Parse arguments to ensure valid JSON
                // Handle potential incomplete JSON gracefully
                const args = JSON.parse(tc.args);
                yield { 
                    functionCall: {
                        name: tc.name,
                        args: args
                    } 
                };
            } catch (e) {
                console.error("Failed to parse tool arguments", e);
                // Attempt to repair simple cases or yield raw
                yield { text: `\n\n[SYSTEM WARNING: Model attempted to call ${tc.name} but arguments were incomplete. Raw: ${tc.args}]` };
            }
        }
    }
}

export async function analyzeMultiModalMedia(provider: string, modelId: string, data: string, mimeType: string, prompt: string): Promise<string> {
    const apiKey = KEY_MANAGER.getKey(provider);
    if (!apiKey) throw new Error(`API Key for ${provider} not found`);

    // --- GEMINI VISION ---
    if (provider === 'GEMINI') {
        try {
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: modelId || 'gemini-1.5-flash',
                contents: { parts: [{ inlineData: { data, mimeType } }, { text: prompt }] }
            });
            KEY_MANAGER.reportSuccess('GEMINI');
            return response.text || "No response.";
        } catch (e: any) {
            KEY_MANAGER.reportFailure('GEMINI', apiKey, e);
            throw new Error(`Gemini Vision Failed: ${e.message}`);
        }
    }

    // --- OPENAI COMPATIBLE VISION ---
    if (['GROQ', 'OPENAI', 'OPENROUTER'].includes(provider)) {
        const baseURLMap: Record<string, string> = {
            'GROQ': 'https://api.groq.com/openai/v1/chat/completions',
            'OPENAI': 'https://api.openai.com/v1/chat/completions',
            'OPENROUTER': 'https://openrouter.ai/api/v1/chat/completions'
        };

        const headers: any = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        };

        if (provider === 'OPENROUTER') {
            headers['HTTP-Referer'] = window.location.origin;
            headers['X-Title'] = 'IStoicAI Platinum';
        }

        const body = {
            model: modelId,
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${mimeType};base64,${data}`
                            }
                        }
                    ]
                }
            ],
            max_tokens: 1024
        };

        try {
            const response = await fetch(baseURLMap[provider], {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Vision API Error: ${err}`);
            }

            const json = await response.json();
            KEY_MANAGER.reportSuccess(provider);
            return json.choices[0]?.message?.content || "No analysis generated.";
        } catch (e: any) {
            console.error("Vision API Error:", e);
            KEY_MANAGER.reportFailure(provider, e);
            throw new Error(`${provider} Vision Error: ${e.message}`);
        }
    }

    return `Provider ${provider} does not support visual analysis in this kernel.`;
}

export async function generateMultiModalImage(provider: string, modelId: string, prompt: string, options: any): Promise<string> {
    const apiKey = KEY_MANAGER.getKey(provider);
    if (!apiKey) throw new Error(`API Key for ${provider} not found`);
    
    // --- GEMINI (IMAGEN 3) ---
    if (provider === 'GEMINI') {
        try {
            const ai = new GoogleGenAI({ apiKey });
            const validRatios = ["1:1", "16:9", "9:16", "4:3", "3:4"];
            const ratio = validRatios.includes(options?.aspectRatio) ? options.aspectRatio : "1:1";

            // Using standard model for image gen call, which will use the tool internally or specific endpoint
            // gemini-2.0-flash-exp supports generation
            const response = await ai.models.generateContent({
                model: modelId || 'gemini-2.0-flash-exp', 
                contents: { parts: [{ text: prompt }] },
                config: { imageConfig: { aspectRatio: ratio } } 
            });
            
            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    KEY_MANAGER.reportSuccess('GEMINI');
                    return `data:image/png;base64,${part.inlineData.data}`;
                }
            }
            throw new Error("No image data returned from Gemini.");
        } catch(e) {
            KEY_MANAGER.reportFailure('GEMINI', e);
            throw e;
        }
    }

    // --- OPENAI (DALL-E 3) ---
    // Using fetch directly
    if (provider === 'OPENAI') {
        try {
            let size = "1024x1024";
            if (modelId === 'dall-e-3') {
                if (options?.aspectRatio === '16:9') size = "1792x1024";
                else if (options?.aspectRatio === '9:16') size = "1024x1792";
            }

            const response = await fetch("https://api.openai.com/v1/images/generations", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: modelId || "dall-e-3",
                    prompt: prompt,
                    n: 1,
                    size: size,
                    response_format: "b64_json",
                    quality: "standard",
                    style: "vivid"
                })
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`DALL-E Error: ${err}`);
            }

            const json = await response.json();
            const b64 = json.data[0].b64_json;
            if (b64) {
                KEY_MANAGER.reportSuccess('OPENAI');
                return `data:image/png;base64,${b64}`;
            }
            throw new Error("No image data returned from OpenAI.");
        } catch(e) {
            KEY_MANAGER.reportFailure('OPENAI', e);
            throw e;
        }
    }

    throw new Error(`Provider ${provider} not supported for Image Generation.`);
}
