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
        if (this.isConnecting || this.isConnected) return;
        
        this.isConnecting = true;
        this.config = config;
        this.disconnect(true); 
        config.onStatusChange('CONNECTING');

        try {
            const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
            this.inputCtx = new AudioContextClass({ sampleRate: 16000 });
            this.outputCtx = new AudioContextClass({ sampleRate: 24000 });
            
            this._analyser = this.outputCtx!.createAnalyser();
            this._analyser.fftSize = 256;

            if (this.inputCtx!.state === 'suspended') await this.inputCtx!.resume();
            if (this.outputCtx!.state === 'suspended') await this.outputCtx!.resume();

            this.activeStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 16000
                } 
            });

            // Fix: Always use process.env.API_KEY directly for Gemini initialization as per guidelines
            const apiKey = process.env.API_KEY; 
            const ai = new GoogleGenAI({ apiKey });
            
            const liveTools = [{ 
                functionDeclarations: [
                    ...(noteTools.functionDeclarations || []),
                    ...(visualTools?.functionDeclarations || [])
                ] 
            }];

            const sessionPromise = ai.live.connect({
                model: config.modelId || 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        this.isConnecting = false;
                        this.isConnected = true;
                        config.onStatusChange('ACTIVE');
                        this.startAudioInputStream(sessionPromise);
                        
                        this.audioCheckInterval = setInterval(() => {
                            if (this.outputCtx?.state === 'suspended') this.outputCtx.resume();
                        }, 2000);
                    },
                    onmessage: async (msg: LiveServerMessage) => {
                        await this.handleServerMessage(msg, sessionPromise);
                    },
                    onerror: (e) => {
                        config.onStatusChange('ERROR', "Uplink Lost");
                        this.disconnect();
                    },
                    onclose: () => this.disconnect(),
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    tools: liveTools,
                    speechConfig: { 
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voiceName } } 
                    },
                    systemInstruction: config.systemInstruction,
                    inputAudioTranscription: {}, 
                    outputAudioTranscription: {},
                }
            });

            this.session = await sessionPromise;

        } catch (e: any) {
            config.onStatusChange('ERROR', e.message);
            this.disconnect();
        }
    }

    private startAudioInputStream(sessionPromise: Promise<any>) {
        if (!this.inputCtx || !this.activeStream) return;
        
        const source = this.inputCtx.createMediaStreamSource(this.activeStream);
        const scriptProcessor = this.inputCtx.createScriptProcessor(4096, 1, 1);
        
        scriptProcessor.onaudioprocess = (e) => {
            if (!this.isConnected) return;
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
                try { if (this.isConnected) s.sendRealtimeInput({ media: pcmBlob }); } catch (err) {} 
            });
        };
        
        source.connect(scriptProcessor);
        scriptProcessor.connect(this.inputCtx.destination);
    }

    private async handleServerMessage(msg: LiveServerMessage, sessionPromise: Promise<any>) {
        if (!this.isConnected) return;

        if (msg.serverContent?.inputTranscription || msg.serverContent?.outputTranscription) {
            const isUser = !!msg.serverContent.inputTranscription;
            this.config?.onTranscription?.({
                text: isUser ? msg.serverContent.inputTranscription!.text : msg.serverContent.outputTranscription!.text,
                source: isUser ? 'user' : 'model',
                isFinal: !!msg.serverContent.turnComplete
            });
        }

        if (msg.toolCall) {
            for (const fc of msg.toolCall.functionCalls) {
                const result = await this.config?.onToolCall(fc);
                sessionPromise.then(s => s.sendToolResponse({ 
                    functionResponses: [{ id: fc.id, name: fc.name, response: { result: String(result) } }] 
                }));
            }
        }

        const base64Audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (base64Audio && this.outputCtx) {
            // Tight scheduling with drift buffer
            const currentTime = this.outputCtx.currentTime;
            this.nextStartTime = Math.max(this.nextStartTime, currentTime + 0.02);

            const audioBuffer = await decodeAudioData(decodeAudio(base64Audio), this.outputCtx, 24000, 1);
            const source = this.outputCtx.createBufferSource();
            source.buffer = audioBuffer;
            
            source.connect(this._analyser!);
            this._analyser!.connect(this.outputCtx.destination);
            
            source.start(this.nextStartTime);
            this.nextStartTime += audioBuffer.duration;
            this.sources.add(source);
            source.onended = () => this.sources.delete(source);
        }

        if (msg.serverContent?.interrupted) {
            this.sources.forEach(s => { try { s.stop(); } catch(e){} });
            this.sources.clear();
            this.nextStartTime = 0;
        }
    }

    disconnect(silent: boolean = false) {
        this.isConnected = false;
        this.isConnecting = false;
        if (this.audioCheckInterval) clearInterval(this.audioCheckInterval);
        if (this.session) { try { this.session.close(); } catch(e){} this.session = null; }
        if (this.activeStream) { this.activeStream.getTracks().forEach(t => t.stop()); this.activeStream = null; }
        if (this.inputCtx) { try { this.inputCtx.close(); } catch(e){} this.inputCtx = null; }
        if (this.outputCtx) { try { this.outputCtx.close(); } catch(e){} this.outputCtx = null; }
        this.sources.forEach(s => { try { s.stop(); } catch(e){} });
        this.sources.clear();
        this.nextStartTime = 0;
        if (!silent) this.config?.onStatusChange('IDLE');
    }
}