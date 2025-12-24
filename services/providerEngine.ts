
import { KEY_MANAGER } from "./geminiService";
import { debugService } from "./debugService";
import Groq from "groq-sdk";
import { Mistral } from '@mistralai/mistralai';
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

    // --- 1. GROQ SDK ---
    if (provider === 'GROQ') {
        try {
            const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });
            const completionStream = await groq.chat.completions.create({
                messages: fullMessages,
                model: modelId,
                temperature: 0.6,
                stream: true,
            });

            for await (const chunk of completionStream) {
                const content = chunk.choices[0]?.delta?.content;
                if (content) yield { text: content };
            }
        } catch (error: any) {
             // Rethrow to allow kernel fallback logic to trigger
             throw error; 
        }
        return;
    }

    // --- 2. MISTRAL SDK ---
    if (provider === 'MISTRAL') {
        try {
            const client = new Mistral({ apiKey });
            const stream = await client.chat.stream({
                model: modelId,
                messages: fullMessages.map(m => ({ 
                    role: m.role === 'model' || m.role === 'assistant' ? 'assistant' : m.role, 
                    content: m.content 
                })) as any,
            });

            for await (const chunk of stream) {
                const content = chunk.data.choices[0].delta.content;
                if (typeof content === 'string') yield { text: content };
            }
        } catch (error: any) {
            throw error;
        }
        return;
    }

    // --- 3. OPENAI / DEEPSEEK / OPENROUTER ---
    if (provider === 'DEEPSEEK' || provider === 'OPENAI' || provider === 'XAI' || provider === 'OPENROUTER') {
        const baseURLMap: Record<string, string> = {
            'DEEPSEEK': 'https://api.deepseek.com',
            'OPENAI': 'https://api.openai.com/v1',
            'XAI': 'https://api.x.ai/v1',
            'OPENROUTER': 'https://openrouter.ai/api/v1'
        };

        try {
            const openai = new OpenAI({
                baseURL: baseURLMap[provider],
                apiKey: apiKey,
                dangerouslyAllowBrowser: true,
                defaultHeaders: provider === 'OPENROUTER' ? {
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'IStoicAI Platinum'
                } : {}
            });

            const stream = await openai.chat.completions.create({
                messages: fullMessages,
                model: modelId,
                stream: true,
                temperature: 0.7,
            });

            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content;
                if (content) yield { text: content };
            }
        } catch (error: any) {
            throw error;
        }
        return;
    }
}

export async function analyzeMultiModalMedia(provider: string, modelId: string, data: string, mimeType: string, prompt: string): Promise<string> {
    const apiKey = KEY_MANAGER.getKey(provider);
    if (!apiKey) throw new Error(`API Key for ${provider} not found`);

    if (provider === 'GEMINI') {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: modelId || 'gemini-3-pro-preview',
            contents: { parts: [{ inlineData: { data, mimeType } }, { text: prompt }] }
        });
        KEY_MANAGER.reportSuccess('GEMINI');
        return response.text || "No response.";
    }
    return "Vision not supported for this provider yet.";
}

export async function generateMultiModalImage(provider: string, modelId: string, prompt: string, options: any): Promise<string> {
    const apiKey = KEY_MANAGER.getKey(provider);
    if (!apiKey) throw new Error(`API Key for ${provider} not found`);
    
    if (provider === 'GEMINI') {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: modelId || 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
            config: { imageConfig: options }
        });
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                KEY_MANAGER.reportSuccess('GEMINI');
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
    }
    throw new Error(`Provider ${provider} not supported for Image Generation.`);
}
