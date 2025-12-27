
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { encodeAudio, decodeAudio, decodeAudioData, noteTools, visualTools, KEY_MANAGER } from "./geminiService";
import { debugService } from "./debugService";

export type NeuralLinkStatus = 'IDLE' | 'CONNECTING' | 'ACTIVE' | 'ERROR';

export interface TranscriptionEvent {
    text: string;
    source: 'user' | 'model';
    isFinal: boolean;
}

export interface NeuralLinkConfig {
    modelId: string;
    persona: 'hanisah' | 'stoic';
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
    private isConnected: boolean = false;
    private audioCheckInterval: any = null;

    constructor() {}

    get analyser() {
        return this._analyser;
    }

    async connect(config: NeuralLinkConfig) {
        if (this.isConnecting || this.isConnected) {
            console.warn("Neural Link already active or connecting.");
            return;
        }
        
        this.isConnecting = true;
        this.config = config;
        
        // Reset state
        this.disconnect(true); 
        config.onStatusChange('CONNECTING');

        try {
            // 1. Initialize Audio Contexts (MUST happen inside user gesture flow)
            const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
            
            // Input: 16kHz for Gemini
            this.inputCtx = new AudioContextClass({ sampleRate: 16000 });
            
            // Output: 24kHz for Gemini Response
            this.outputCtx = new AudioContextClass({ sampleRate: 24000 });
            
            // Analyser for visualizer
            this._analyser = this.outputCtx.createAnalyser();
            this._analyser.fftSize = 256;
            this._analyser.smoothingTimeConstant = 0.5;

            // CRITICAL: Resume contexts for Mobile Safari/Chrome autoplay policies
            if (this.inputCtx.state === 'suspended') await this.inputCtx.resume();
            if (this.outputCtx.state === 'suspended') await this.outputCtx.resume();

            // 2. Get User Media (Microphone)
            this.activeStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 16000,
                    channelCount: 1
                } 
            });

            // 3. Get API Key
            const apiKey = KEY_MANAGER.getKey('GEMINI');
            if (!apiKey) {
                throw new Error("No healthy GEMINI API key available.");
            }

            const ai = new GoogleGenAI({ apiKey });
            
            // 4. Voice Selection
            const storedHanisahVoice = localStorage.getItem('hanisah_voice');
            const storedStoicVoice = localStorage.getItem('stoic_voice');
            
            let preferredVoice = config.persona === 'hanisah' 
                ? (storedHanisahVoice ? JSON.parse(storedHanisahVoice) : 'Zephyr') 
                : (storedStoicVoice ? JSON.parse(storedStoicVoice) : 'Fenrir');

            if (!GOOGLE_VALID_VOICES.includes(preferredVoice)) {
                preferredVoice = config.persona === 'hanisah' ? 'Kore' : 'Fenrir';
            }

            // 5. Prepare Tools
            const liveTools = [
                { 
                    functionDeclarations: [
                        ...(noteTools.functionDeclarations || []),
                        ...(visualTools?.functionDeclarations || [])
                    ] 
                }
            ];

            // 6. Connect to Gemini Live
            const sessionPromise = ai.live.connect({
                model: config.modelId || 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        this.isConnecting = false;
                        this.isConnected = true;
                        config.onStatusChange('ACTIVE');
                        
                        this.startAudioInputStream(sessionPromise);
                        
                        // Keep-alive / Monitor
                        this.audioCheckInterval = setInterval(() => {
                            if (this.outputCtx?.state === 'suspended') this.outputCtx.resume();
                            if (this.inputCtx?.state === 'suspended') this.inputCtx.resume();
                        }, 2000);

                        sessionPromise.then(session => {
                            const greeting = config.persona === 'hanisah' 
                                ? "Sistem online. Hai, aku siap mendengarkan."
                                : "Logika terhubung. Silakan berbicara.";
                            try {
                                session.sendRealtimeInput({ text: greeting });
                            } catch(err) {
                                console.error("Failed to send initial greeting:", err);
                            }
                        });
                    },
                    onmessage: async (msg: LiveServerMessage) => {
                        await this.handleServerMessage(msg, sessionPromise);
                    },
                    onerror: (e) => {
                        console.error("Neural Link Error:", e);
                        config.onStatusChange('ERROR', "Connection interrupted.");
                        this.disconnect();
                    },
                    onclose: () => {
                        console.log("Neural Link Closed");
                        this.disconnect();
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    tools: liveTools,
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
            console.error("Neural Link Setup Failed:", e);
            config.onStatusChange('ERROR', e.name === 'NotAllowedError' ? "Microphone Access Denied" : e.message);
            this.disconnect();
        }
    }

    private startAudioInputStream(sessionPromise: Promise<any>) {
        if (!this.inputCtx || !this.activeStream) return;
        
        try {
            const source = this.inputCtx.createMediaStreamSource(this.activeStream);
            const scriptProcessor = this.inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
                if (!this.isConnected) return; // Stop processing if disconnected

                const inputData = e.inputBuffer.getChannelData(0);
                // Convert Float32 to Int16 PCM
                const int16 = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    // Clamp and scale
                    int16[i] = Math.max(-1, Math.min(1, inputData[i])) * 32767;
                }
                
                const pcmBlob = { 
                    data: encodeAudio(new Uint8Array(int16.buffer)), 
                    mimeType: 'audio/pcm;rate=16000' 
                };
                
                sessionPromise.then(s => { 
                    try { 
                        if (this.isConnected && s) s.sendRealtimeInput({ media: pcmBlob }); 
                    } catch (err) { 
                        // Ignore send errors during teardown
                    } 
                });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(this.inputCtx.destination);
        } catch (err) {
            console.error("Input Stream Error:", err);
        }
    }

    private async handleServerMessage(msg: LiveServerMessage, sessionPromise: Promise<any>) {
        if (!this.isConnected) return;

        // 1. Transcriptions
        if (this.config?.onTranscription) {
            if (msg.serverContent?.inputTranscription) {
                this.config.onTranscription({ 
                    text: msg.serverContent.inputTranscription.text, 
                    source: 'user', 
                    isFinal: !!msg.serverContent.turnComplete 
                });
            }
            if (msg.serverContent?.outputTranscription) {
                this.config.onTranscription({ 
                    text: msg.serverContent.outputTranscription.text, 
                    source: 'model', 
                    isFinal: !!msg.serverContent.turnComplete 
                });
            }
        }

        // 2. Tool Calls
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

        // 3. Audio Output
        const base64Audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (base64Audio && this.outputCtx) {
            try {
                // Drift Correction: If next start time is behind current time, fast forward
                const currentTime = this.outputCtx.currentTime;
                if (this.nextStartTime < currentTime) {
                    this.nextStartTime = currentTime + 0.05; // 50ms buffer
                }

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
                };
            } catch (e) {
                console.warn("Audio playback error:", e);
            }
        }

        // 4. Interruption Handling
        if (msg.serverContent?.interrupted) {
            this.sources.forEach(s => { 
                try { s.stop(); } catch(e){} 
            });
            this.sources.clear();
            this.nextStartTime = 0;
        }
    }

    disconnect(silent: boolean = false) {
        this.isConnected = false;
        this.isConnecting = false;

        if (this.audioCheckInterval) {
            clearInterval(this.audioCheckInterval);
            this.audioCheckInterval = null;
        }
        
        // Stop Websocket
        if (this.session) { 
            try { 
                // Attempt to close if method exists
                if(typeof this.session.close === 'function') this.session.close();
            } catch(e){} 
            this.session = null; 
        }

        // Stop Microphone
        if (this.activeStream) { 
            this.activeStream.getTracks().forEach(t => t.stop()); 
            this.activeStream = null; 
        }

        // Close Audio Contexts
        if (this.inputCtx) { 
            try { this.inputCtx.close(); } catch(e){} 
            this.inputCtx = null; 
        }
        if (this.outputCtx) { 
            try { this.outputCtx.close(); } catch(e){} 
            this.outputCtx = null; 
        }

        // Stop Playing Audio
        this.sources.forEach(s => {
            try { s.stop(); } catch(e){}
        });
        this.sources.clear();
        this.nextStartTime = 0;
        
        if (!silent && this.config) {
            this.config.onStatusChange('IDLE');
        }
    }
}
