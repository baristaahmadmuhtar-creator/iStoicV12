
import { KEY_MANAGER } from './geminiService';
import { debugService } from './debugService';
import { db } from './storage';

// --- VOICE MAPPING SYSTEM ---
export const VOICE_MAPPING: Record<string, string> = {
    'Hanisah': 'JBFqnCBsd6RMkjVDRZzb', // Using standard voice ID
    'Zephyr': '21m00Tcm4TlvDq8ikWAM',
    'Kore': 'EXAVITQu4vr4xnSDxMaL',  
    'Fenrir': 'TxGEqnHWrfWFTfGW9XjX',
    'Puck': 'IKne3meq5aSn9XLyUdCD',   
    'default': 'JBFqnCBsd6RMkjVDRZzb'
};

// Simple string hash for cache keys
const cyrb53 = (str: string, seed = 0) => {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

/**
 * Production-ready TTS Service with IndexedDB Caching
 */
export async function speakWithHanisah(text: string, voiceNameOverride?: string): Promise<void> {
    // 1. Determine configuration
    let selectedName = voiceNameOverride;
    if (!selectedName) {
        const storedVoice = localStorage.getItem('hanisah_voice');
        selectedName = storedVoice ? JSON.parse(storedVoice) : 'Hanisah';
    }
    const voiceId = VOICE_MAPPING[selectedName || 'Hanisah'] || VOICE_MAPPING['Hanisah'];
    
    // 2. Check Cache First
    const cacheKey = `tts_${selectedName}_${cyrb53(text)}`;
    const cachedBlob = await db.getAudio(cacheKey);

    if (cachedBlob) {
        debugService.log('INFO', 'TTS_CACHE', 'HIT', `Playing cached audio for: "${text.slice(0, 20)}..."`);
        const url = URL.createObjectURL(cachedBlob);
        const audio = new Audio(url);
        await audio.play();
        return;
    }

    // 3. If no cache, call API
    const apiKey = KEY_MANAGER.getKey('ELEVENLABS');
    if (!apiKey) {
        debugService.log('WARN', 'HANISAH_VOICE', 'NO_KEY', 'ElevenLabs API Key is missing.');
        return;
    }

    try {
        debugService.log('INFO', 'HANISAH_VOICE', 'FETCH', `Synthesizing via API: ${selectedName}`);

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': apiKey
            },
            body: JSON.stringify({
                text: text,
                model_id: "eleven_multilingual_v2",
                voice_settings: { stability: 0.5, similarity_boost: 0.75 }
            })
        });

        if (!response.ok) throw new Error(`Status: ${response.status}`);

        const audioBlob = await response.blob();
        
        // 4. Save to Cache asynchronously
        db.saveAudio(cacheKey, audioBlob).catch(e => console.warn("Failed to cache audio", e));

        const url = URL.createObjectURL(audioBlob);
        const audio = new Audio(url);
        
        debugService.log('INFO', 'HANISAH_VOICE', 'PLAY', 'Audio stream synchronized.');
        await audio.play();

    } catch (error: any) {
        debugService.log('ERROR', 'HANISAH_VOICE', 'FAIL', error.message);
    }
}
