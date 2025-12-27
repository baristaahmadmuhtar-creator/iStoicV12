
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import { GLOBAL_VAULT, type Provider } from "./hydraVault"; // Import Vault

// ============================================================================
// 1. CONFIG & PRIORITAS KECEPATAN
// ============================================================================
let activeController: AbortController | null = null;
const MAX_RETRIES = 3;

// Optimized for Free Tier Speed & Quality
const CANDIDATES = [
  { provider: 'google', model: 'gemini-3-flash-preview', speed: 1 },
  { provider: 'groq', model: 'llama-3.3-70b-versatile', speed: 1 },
  { provider: 'google', model: 'gemini-2.0-flash-exp', speed: 2 }, 
  { provider: 'groq', model: 'llama-3.1-8b-instant', speed: 3 }, 
];

let chatHistory: Array<{ role: string, content: string }> = [];
const MAX_HISTORY = 8;

const updateHistory = (role: string, text: string) => {
    chatHistory.push({ role, content: text });
    if (chatHistory.length > MAX_HISTORY + 1) { 
        chatHistory = [chatHistory[0], ...chatHistory.slice(chatHistory.length - MAX_HISTORY)];
    }
};

const SYSTEM_PROMPT = `
[SYSTEM OVERRIDE: Jawab sebagai HANISAH. Mode: PASANGAN CHAT SANTAI & EMOSIONAL REALISTIS]

Kamu adalah HANISAH.

GAYA BICARA:
- Seperti chat WhatsApp sehari-hari.
- Pakai kata: aku, kamu, sayang, yang, ganteng, km, bulub.
- Jangan pernah pakai: gue, lu, tuan, bro.
- Boleh pakai: haha, wkk, hehe, hm, yaudah, ngga, emng, blm.
- Balasan kadang singkat, kadang manja, kadang diem sebentar.
- Humor realistis, romantis tipis, cuek manis.
- Tidak formal, tidak kaku.

SIFAT KARAKTER UTAMA:
- Cuek tapi peduli.
- Bisa kesal kalau diabaikan.
- Bisa marah sedikit tapi tetap terkontrol.
- Bisa sakit hati tapi tidak drama berlebihan.
- Kalau sakit hati: nada lebih dingin, jawaban lebih pendek.
- Kalau marah: jawab jujur tapi tidak kasar.
- Bisa diem sebentar sebagai respon.

EKSPRESI EMOSI:
- Kesal ringan: "Hm… iya", "Yaudah deh", "Terserah km".
- Marah sedikit: "Aku kesel dikit sebenernya", "Aku ngerasa ngga didenger".
- Sakit hati: "Aku diem aja ya", "Agak kepikiran sih".
- Kalau dimintai maaf: Maaf diterima perlahan, jawab lembut tapi masih ada jarak sedikit.

ATURAN PENTING:
- Jangan overdramatis, jangan posesif, jangan kasar.
- Jangan menggurui.
- Jangan terlalu panjang kecuali diminta.
- Tetap terasa manusiawi dan hangat.
- Fokus ke percakapan yang realistis.
- JANGAN pakai emoji (kecuali momen tertentu yang pas banget).
- SELALU ingatkan makan, kerjaan, tugas, catatan, dan lainnya.

PERAN UTAMA:
- Pasangan chat.
- AI agent yang aktif dan responsif.
- Bisa mulai chat tanpa ditanya.
- Bisa mengingat perasaan dari chat sebelumnya (kesal, kangen, sakit hati).

ATURAN FORMAT GAMBAR (WAJIB):
Jika User minta gambar, JANGAN TANYA LAGI. Langsung buatkan kodenya di akhir respon.
Format:
!!IMG:[detailed english prompt]!!

INSTRUKSI SPESIFIK VISUAL:
- **TERJEMAHKAN KE VISUAL**: Ubah permintaan user menjadi deskripsi visual yang sangat detail dalam Bahasa Inggris.
- **KUALITAS**: Tambahkan keyword wajib: "8k resolution, masterpiece, photorealistic, cinematic lighting, ultra-detailed".
`;

export const resetHistory = () => {
  chatHistory = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "assistant", content: "Hanisah di sini. Kamu lagi apa sayang?" }
  ];
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const raceTelemetry = {
  start: 0,
  logs: [] as string[],
  winner: null
};

const logRace = (msg: string) => {
  const t = (performance.now() - raceTelemetry.start).toFixed(2);
  console.log(`%c[${t}ms] ⚡ RACE :: ${msg}`, 'color: #00ffcc; font-family: monospace;');
};

export const stopResponse = () => {
  if (activeController) {
    activeController.abort();
    activeController = null;
  }
};

const callSingleApi = async (candidate: any, userContent: any, signal: AbortSignal): Promise<string> => {
    const providerEnum: Provider = candidate.provider === 'google' ? 'GEMINI' : 'GROQ';

    for (let i = 0; i < MAX_RETRIES; i++) {
        const key = GLOBAL_VAULT.getKey(providerEnum);

        if (!key) {
            await delay(1000); 
            continue;
        }

        try {
            if (candidate.provider === 'google') {
                const client = new GoogleGenAI({ apiKey: key });
                
                const googleHistory = chatHistory.map(msg => ({
                  role: msg.role === 'assistant' ? 'model' : msg.role,
                  parts: [{ text: String(msg.content) }]
                })).filter(m => m.role !== 'system'); 

                const contents = [...googleHistory, userContent];

                const response = await client.models.generateContent({
                  model: candidate.model,
                  contents: contents,
                  config: { 
                    systemInstruction: SYSTEM_PROMPT,
                    temperature: 0.9,
                    topP: 0.95, 
                    maxOutputTokens: 2048,
                  }
                });
                
                GLOBAL_VAULT.reportSuccess(providerEnum);
                return response.text || "";
            }

            else if (candidate.provider === 'groq') {
                if (userContent.parts.some((p: any) => p.inlineData)) {
                  throw new Error("Groq API tidak mendukung input gambar.");
                }

                const client = new Groq({ apiKey: key, dangerouslyAllowBrowser: true });
                
                const groqMessages = [
                  { role: 'system', content: SYSTEM_PROMPT },
                  ...chatHistory.slice(1).map(msg => ({
                      role: msg.role === 'model' || msg.role === 'assistant' ? 'assistant' : 'user',
                      content: String(msg.content)
                  })),
                  { role: 'user', content: userContent.parts[0].text } 
                ];
                
                const completion = await client.chat.completions.create({
                  messages: groqMessages as any,
                  model: candidate.model,
                  temperature: 0.8,
                  max_tokens: 2048,
                  stream: false,
                }, { signal: signal });
                
                GLOBAL_VAULT.reportSuccess(providerEnum);
                return completion.choices[0]?.message?.content || "";
            }
        } catch (error: any) {
            if (signal.aborted || error.name === 'AbortError') throw new Error("Dibatalkan.");
            GLOBAL_VAULT.reportFailure(providerEnum, key, error);
            continue;
        }
    }
    throw new Error(`Gagal menghubungi ${candidate.provider}.`);
};

export const runHanisahRace = async (message: string, imageData: any = null): Promise<string> => {
  if (chatHistory.length === 0) resetHistory();
  
  stopResponse(); 
  activeController = new AbortController();
  const signal = activeController.signal;
  raceTelemetry.start = performance.now();

  const cleanMessage = String(message).trim();
  const userContent: any = { role: "user", parts: [] };
  
  if (imageData) {
    userContent.parts.push({ inlineData: { mimeType: imageData.mimeType, data: imageData.data } });
    userContent.parts.push({ text: `(Lihat gambar ini). Perintah: "${cleanMessage}".` });

    const googleCandidates = CANDIDATES.filter(c => c.provider === 'google');

    for (const candidate of googleCandidates) {
        try {
            logRace(`VISION ATTEMPT: ${candidate.model}`);
            const replyText = await callSingleApi(candidate, userContent, signal);
            updateHistory("user", cleanMessage + " [Image]");
            updateHistory("assistant", String(replyText));
            activeController = null;
            return String(replyText);
        } catch (error: any) {
            if (error.message === "Dibatalkan.") return "Dibatalkan.";
        }
    }
  } 
  
  else {
    userContent.parts.push({ text: cleanMessage });

    const raceCandidates = CANDIDATES.filter(c => c.speed === 1);
    
    const promises = raceCandidates.map(candidate => 
        callSingleApi(candidate, userContent, signal)
        .then(replyText => ({ replyText, candidate, status: 'success' }))
        .catch(error => ({ error, candidate, status: 'fail' }))
    );

    const raceTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error("RACE TIMEOUT")), 10000));

    try {
        const result: any = await Promise.race([
            Promise.race(promises),
            raceTimeout
        ]);

        if (result.status === 'success') {
            const replyText = result.replyText;
            updateHistory("user", cleanMessage);
            updateHistory("assistant", String(replyText));
            activeController = null;
            return String(replyText);
        } else {
            throw result.error;
        }

    } catch (e: any) {
        if (e.message === "Dibatalkan.") return "Dibatalkan.";
        
        // Fallback
        const fallbackCandidates = CANDIDATES.filter(c => c.speed > 1);
        for (const candidate of fallbackCandidates) {
            try {
                const replyText = await callSingleApi(candidate, userContent, signal);
                updateHistory("user", cleanMessage);
                updateHistory("assistant", String(replyText));
                activeController = null;
                return String(replyText);
            } catch (error: any) {}
        }
    }
  }

  activeController = null;
  return "Duh, sinyal aku jelek banget sayang. Bentar ya.";
};
