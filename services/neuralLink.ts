
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { encodeAudio, decodeAudio, decodeAudioData, noteTools, visualTools, searchTools, KEY_MANAGER } from "./geminiService";
import { debugService } from "./debugService";

export type NeuralLinkStatus = 'IDLE' | 'CONNECTING' | 'ACTIVE' | 'ERROR';

export interface TranscriptionEvent {
    text: string;
    source: 'user' | 'model';
    isFinal: boolean;
}

export interface NeuralLinkConfig {
    modelId: string;
    persona: 'melsa' | 'stoic';
    systemInstruction: string;
    voiceName: string;
    onStatusChange: (status: NeuralLinkStatus, error?: string) => void;
    onToolCall: (toolCall: any) => Promise<any>;
    onTranscription?: (event: TranscriptionEvent) => void;
}

// Allowed Gemini Live Voices
const GOOGLE_VALID_VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede', 'Zephyr'];

export class NeuralLinkService {
    private session: any = null;
    private inputCtx: AudioContext | null = null;
    private outputCtx: AudioContext | null = null;
    private nextStartTime: number = 0;
    private sources: Set<AudioBufferSourceNode> = new Set();
    private activeStream: MediaStream | null = null;
    private config: NeuralLinkConfig | null = null;
    private _analyser: AnalyserNode | null = null;
    private isConnecting: boolean = false;
    private audioCheckInterval: any = null;

    constructor() {}

    get analyser() {
        return this._analyser;
    }

    async connect(config: NeuralLinkConfig) {
        if (this.isConnecting) return;
        this.isConnecting = true;
        this.config = config;
        
        this.disconnect(); 
        config.onStatusChange('CONNECTING');

        try {
            this.activeStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            });
            
            const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
            this.inputCtx = new AudioContextClass({ sampleRate: 16000 });
            this.outputCtx = new AudioContextClass({ sampleRate: 24000 });
            this._analyser = this.outputCtx.createAnalyser();
            this._analyser.fftSize = 256;

            const resumeContexts = async () => {
                if (this.inputCtx?.state === 'suspended') await this.inputCtx.resume();
                if (this.outputCtx?.state === 'suspended') await this.outputCtx.resume();
            };
            await resumeContexts();

            // KEY ROTATION USAGE FOR LIVE API
            const apiKey = KEY_MANAGER.getKey('GEMINI');
            const ai = new GoogleGenAI({ apiKey });
            
            // DYNAMIC VOICE SELECTION & VALIDATION
            const storedMelsaVoice = localStorage.getItem('melsa_voice');
            const storedStoicVoice = localStorage.getItem('stoic_voice');
            
            let preferredVoice = config.persona === 'melsa' 
                ? (storedMelsaVoice ? JSON.parse(storedMelsaVoice) : 'Zephyr') 
                : (storedStoicVoice ? JSON.parse(storedStoicVoice) : 'Fenrir');

            // SAFETY CHECK: If user selected "Melsa" (Custom) in settings, Gemini API will error.
            // We must fallback to a valid Google voice for the Live Session.
            if (!GOOGLE_VALID_VOICES.includes(preferredVoice)) {
                debugService.log('WARN', 'NEURAL_LINK', 'VOICE_FALLBACK', `Voice '${preferredVoice}' not supported by Gemini Live. Falling back.`);
                // Fallback: Melsa -> Kore (Female), Others -> Fenrir (Male)
                preferredVoice = config.persona === 'melsa' ? 'Kore' : 'Fenrir';
            }

            const sessionPromise = ai.live.connect({
                model: config.modelId || 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        this.isConnecting = false;
                        config.onStatusChange('ACTIVE');
                        this.startAudioInputStream(sessionPromise);
                        
                        this.audioCheckInterval = setInterval(() => {
                            resumeContexts();
                        }, 2000);

                        sessionPromise.then(session => {
                            const greeting = config.persona === 'melsa' 
                                ? "Sistem Mel-SA tersinkronisasi. Tuan, aku sudah siap mendengarkan."
                                : "Logika Stoik aktif. Kesadaran kognitif terhubung.";
                            session.sendRealtimeInput({ text: greeting });
                        });
                    },
                    onmessage: async (msg: LiveServerMessage) => {
                        await this.handleServerMessage(msg, sessionPromise);
                    },
                    onerror: (e) => {
                        console.error("Neural Link Error:", e);
                        this.isConnecting = false;
                        config.onStatusChange('ERROR', e.message);
                        this.disconnect();
                    },
                    onclose: () => {
                        this.isConnecting = false;
                        if (this.config) {
                            this.config.onStatusChange('IDLE');
                        }
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    tools: [noteTools, visualTools, searchTools],
                    speechConfig: { 
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: preferredVoice } } 
                    },
                    systemInstruction: config.systemInstruction,
                    inputAudioTranscription: {}, 
                    outputAudioTranscription: {},
                }
            });

            this.session = await sessionPromise;
        } catch (e: any) {
            this.isConnecting = false;
            config.onStatusChange('ERROR', e.message);
            this.disconnect();
        }
    }

    private startAudioInputStream(sessionPromise: Promise<any>) {
        if (!this.inputCtx || !this.activeStream) return;
        
        try {
            const source = this.inputCtx.createMediaStreamSource(this.activeStream);
            const scriptProcessor = this.inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
                if (!this.session) return;
                const inputData = e.inputBuffer.getChannelData(0);
                const int16 = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    int16[i] = Math.max(-1, Math.min(1, inputData[i])) * 32767;
                }
                const pcmBlob = { 
                    data: encodeAudio(new Uint8Array(int16.buffer)), 
                    mimeType: 'audio/pcm;rate=16000' 
                };
                sessionPromise.then(s => { 
                    try { 
                        if (s && s.sendRealtimeInput) s.sendRealtimeInput({ media: pcmBlob }); 
                    } catch (err) { } 
                });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(this.inputCtx.destination);
        } catch (err) {
            console.error("Input Stream Error:", err);
        }
    }

    private async handleServerMessage(msg: LiveServerMessage, sessionPromise: Promise<any>) {
        if (!this.session) return;

        if (msg.serverContent?.inputTranscription && this.config?.onTranscription) {
            this.config.onTranscription({ text: msg.serverContent.inputTranscription.text, source: 'user', isFinal: !!msg.serverContent.turnComplete });
        }
        if (msg.serverContent?.outputTranscription && this.config?.onTranscription) {
            this.config.onTranscription({ text: msg.serverContent.outputTranscription.text, source: 'model', isFinal: !!msg.serverContent.turnComplete });
        }

        if (msg.toolCall) {
            for (const fc of msg.toolCall.functionCalls) {
                if (this.config?.onToolCall) {
                    try {
                        const result = await this.config.onToolCall(fc);
                        sessionPromise.then(s => s.sendToolResponse({ 
                            functionResponses: [{ id: fc.id, name: fc.name, response: { result: String(result) } }] 
                        }));
                    } catch (err) {
                        console.error("Tool execution failed:", err);
                    }
                }
            }
        }

        const base64Audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (base64Audio && this.outputCtx) {
            try {
                this.nextStartTime = Math.max(this.nextStartTime, this.outputCtx.currentTime);
                const audioBuffer = await decodeAudioData(decodeAudio(base64Audio), this.outputCtx, 24000, 1);
                const source = this.outputCtx.createBufferSource();
                source.buffer = audioBuffer;
                
                if (this._analyser) { 
                    source.connect(this._analyser); 
                    this._analyser.connect(this.outputCtx.destination); 
                } else {
                    source.connect(this.outputCtx.destination);
                }
                
                source.start(this.nextStartTime);
                this.nextStartTime += audioBuffer.duration;
                this.sources.add(source);
                source.onended = () => {
                    this.sources.delete(source);
                    source.disconnect();
                };
            } catch (e) {
                console.warn("Audio playback error:", e);
            }
        }

        if (msg.serverContent?.interrupted) {
            this.sources.forEach(s => { 
                try { s.stop(); s.disconnect(); } catch(e){} 
            });
            this.sources.clear();
            this.nextStartTime = 0;
        }
    }

    disconnect() {
        if (this.audioCheckInterval) {
            clearInterval(this.audioCheckInterval);
            this.audioCheckInterval = null;
        }
        if (this.session) { 
            try { this.session.close(); } catch(e){} 
            this.session = null; 
        }
        if (this.activeStream) { 
            this.activeStream.getTracks().forEach(t => t.stop()); 
            this.activeStream = null; 
        }
        if (this.inputCtx) { 
            try { this.inputCtx.close(); } catch(e){} 
            this.inputCtx = null; 
        }
        if (this.outputCtx) { 
            try { this.outputCtx.close(); } catch(e){} 
            this.outputCtx = null; 
        }
        this.sources.forEach(s => {
            try { s.stop(); s.disconnect(); } catch(e){}
        });
        this.sources.clear();
        this.nextStartTime = 0;
        this.isConnecting = false;
        if (this.config) this.config.onStatusChange('IDLE');
    }
}
