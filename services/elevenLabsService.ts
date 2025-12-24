
import { KEY_MANAGER } from './geminiService';
import { debugService } from './debugService';

// --- VOICE MAPPING SYSTEM ---
export const VOICE_MAPPING: Record<string, string> = {
    'Melsa': 'JBFqnCBsd6RMkjVDRZzb', 
    'Zephyr': '21m00Tcm4TlvDq8ikWAM',
    'Kore': 'EXAVITQu4vr4xnSDxMaL',  
    'Fenrir': 'TxGEqnHWrfWFTfGW9XjX',
    'Puck': 'IKne3meq5aSn9XLyUdCD',   
    'default': 'JBFqnCBsd6RMkjVDRZzb'
};

/**
 * Production-ready TTS Service
 * Menggunakan Native Fetch untuk kompatibilitas maksimal di browser/Vercel
 */
export async function speakWithMelsa(text: string, voiceNameOverride?: string): Promise<void> {
    const apiKey = KEY_MANAGER.getKey('ELEVENLABS');

    if (!apiKey) {
        debugService.log('WARN', 'MELSA_VOICE', 'NO_KEY', 'ElevenLabs API Key is missing.');
        return;
    }

    try {
        let selectedName = voiceNameOverride;
        if (!selectedName) {
            const storedVoice = localStorage.getItem('melsa_voice');
            selectedName = storedVoice ? JSON.parse(storedVoice) : 'Melsa';
        }

        const voiceId = VOICE_MAPPING[selectedName || 'Melsa'] || VOICE_MAPPING['Melsa'];
        
        debugService.log('INFO', 'MELSA_VOICE', 'INIT', `Synthesizing via API: ${selectedName}`);

        // Direct API Call (Lebih stabil untuk Production Browser Environment)
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
        const url = URL.createObjectURL(audioBlob);
        const audio = new Audio(url);
        
        debugService.log('INFO', 'MELSA_VOICE', 'PLAY', 'Audio stream synchronized.');
        await audio.play();

    } catch (error: any) {
        debugService.log('ERROR', 'MELSA_VOICE', 'FAIL', error.message);
        console.error("ElevenLabs Critical Fail:", error);
    }
}
