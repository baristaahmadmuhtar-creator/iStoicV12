
import { KEY_MANAGER } from "./geminiService";
import { debugService } from "./debugService";
import Groq from "groq-sdk";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

export interface StandardMessage {
    role: string;
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export async function* streamOpenAICompatible(
    provider: 'GROQ' | 'DEEPSEEK' | 'OPENAI' | 'XAI' | 'MISTRAL' | 'OPENROUTER',
    modelId: string,
    messages: StandardMessage[],
    systemInstruction?: string,
    tools: any[] = []
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

    // Tool Accumulator for Stream
    let toolCallAccumulator: any = {};
    let isAccumulatingTool = false;

    // --- 1. GROQ SDK ---
    if (provider === 'GROQ') {
        try {
            const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });
            
            // Groq requires tools to be undefined if empty array, otherwise it throws validation error
            const requestOptions: any = {
                messages: fullMessages,
                model: modelId,
                temperature: 0.6,
                stream: true,
            };

            if (tools && tools.length > 0) {
                requestOptions.tools = tools;
                requestOptions.tool_choice = "auto";
            }

            const completionStream = await groq.chat.completions.create(requestOptions);

            for await (const chunk of completionStream) {
                const delta = chunk.choices[0]?.delta;
                
                // 1. Text Content
                if (delta?.content) {
                    yield { text: delta.content };
                }

                // 2. Tool Calls (Accumulation)
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
            }
        } catch (error: any) {
             throw error; 
        }
    }

    // --- 2. UNIVERSAL OPENAI-COMPATIBLE CLIENT (DEEPSEEK, MISTRAL, OPENROUTER, OPENAI) ---
    if (provider === 'DEEPSEEK' || provider === 'OPENAI' || provider === 'XAI' || provider === 'OPENROUTER' || provider === 'MISTRAL') {
        const baseURLMap: Record<string, string> = {
            'DEEPSEEK': 'https://api.deepseek.com',
            'OPENAI': 'https://api.openai.com/v1',
            'XAI': 'https://api.x.ai/v1',
            'OPENROUTER': 'https://openrouter.ai/api/v1',
            'MISTRAL': 'https://api.mistral.ai/v1' 
        };

        const headers: any = {};
        if (provider === 'OPENROUTER') {
            headers['HTTP-Referer'] = window.location.origin;
            headers['X-Title'] = 'IStoicAI Platinum';
        }

        try {
            const openai = new OpenAI({
                baseURL: baseURLMap[provider],
                apiKey: apiKey,
                dangerouslyAllowBrowser: true,
                defaultHeaders: headers
            });

            const requestOptions: any = {
                messages: fullMessages,
                model: modelId,
                stream: true,
                temperature: provider === 'DEEPSEEK' && modelId === 'deepseek-reasoner' ? undefined : 0.7, 
                max_tokens: provider === 'DEEPSEEK' ? 4000 : undefined
            };

            // DeepSeek Reasoner does NOT support tools (as of current API specs), V3 does.
            if (modelId !== 'deepseek-reasoner' && tools && tools.length > 0) {
                requestOptions.tools = tools;
                requestOptions.tool_choice = "auto";
            }

            const stream = await openai.chat.completions.create(requestOptions);

            for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta;
                
                if (delta?.content) {
                    yield { text: delta.content };
                }

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
            }
        } catch (error: any) {
            throw error;
        }
    }

    // --- FINALIZE TOOL CALLS ---
    if (isAccumulatingTool) {
        // Iterate over accumulated calls and yield them
        for (const idx in toolCallAccumulator) {
            const tc = toolCallAccumulator[idx];
            try {
                // Parse arguments to ensure valid JSON
                const args = JSON.parse(tc.args);
                yield { 
                    functionCall: {
                        name: tc.name,
                        args: args
                    } 
                };
            } catch (e) {
                console.error("Failed to parse tool arguments", e);
                yield { text: `\n\n[SYSTEM ERROR: Failed to parse tool arguments for ${tc.name}]` };
            }
        }
    }
}

export async function analyzeMultiModalMedia(provider: string, modelId: string, data: string, mimeType: string, prompt: string): Promise<string> {
    const apiKey = KEY_MANAGER.getKey(provider);
    if (!apiKey) throw new Error(`API Key for ${provider} not found`);

    // --- GEMINI VISION ---
    if (provider === 'GEMINI') {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: modelId || 'gemini-2.5-flash',
            contents: { parts: [{ inlineData: { data, mimeType } }, { text: prompt }] }
        });
        KEY_MANAGER.reportSuccess('GEMINI');
        return response.text || "No response.";
    }

    // --- OPENAI COMPATIBLE VISION (GROQ, OPENROUTER, OPENAI) ---
    if (['GROQ', 'OPENAI', 'OPENROUTER'].includes(provider)) {
        const baseURLMap: Record<string, string> = {
            'GROQ': 'https://api.groq.com/openai/v1',
            'OPENAI': 'https://api.openai.com/v1',
            'OPENROUTER': 'https://openrouter.ai/api/v1'
        };

        const headers: any = {};
        if (provider === 'OPENROUTER') {
            headers['HTTP-Referer'] = window.location.origin;
            headers['X-Title'] = 'IStoicAI Platinum';
        }

        try {
            const openai = new OpenAI({
                baseURL: baseURLMap[provider],
                apiKey: apiKey,
                dangerouslyAllowBrowser: true,
                defaultHeaders: headers
            });

            const response = await openai.chat.completions.create({
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
            });

            KEY_MANAGER.reportSuccess(provider);
            return response.choices[0]?.message?.content || "No analysis generated.";
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

            const response = await ai.models.generateContent({
                model: modelId || 'gemini-2.5-flash-image',
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
    if (provider === 'OPENAI') {
        try {
            const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
            let size = "1024x1024";
            if (modelId === 'dall-e-3') {
                if (options?.aspectRatio === '16:9') size = "1792x1024";
                else if (options?.aspectRatio === '9:16') size = "1024x1792";
            }

            const response = await openai.images.generate({
                model: modelId || "dall-e-3",
                prompt: prompt,
                n: 1,
                size: size as any,
                response_format: "b64_json",
                quality: "standard",
                style: "vivid" 
            });

            const b64 = response.data[0].b64_json;
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
