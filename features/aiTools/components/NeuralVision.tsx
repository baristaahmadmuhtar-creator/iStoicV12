
import React, { useState, useEffect, useRef } from 'react';
import { editImage } from '../../../services/geminiService';
import { analyzeMultiModalMedia } from '../../../services/providerEngine';
import { Camera, Layout, Send, Sparkles, Trash2, Activity, ChevronDown, X, Aperture, Image as ImageIcon, AlertCircle } from 'lucide-react';
import Markdown from 'react-markdown';
import { ToolGroup } from './ToolGroup';
import { useAIProvider } from '../../../hooks/useAIProvider';

interface NeuralVisionProps {
    isOpen: boolean;
    onToggle: () => void;
    icon: React.ReactNode;
}

export const NeuralVision: React.FC<NeuralVisionProps> = ({ isOpen, onToggle, icon }) => {
    const [prompt, setPrompt] = useState('');
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [loading, setLoading] = useState<'ANALYZE' | 'EDIT' | null>(null);
    const [statusMsg, setStatusMsg] = useState<string | null>(null);
    const [editResult, setEditResult] = useState<string | null>(null);
    
    // Multi-Provider State
    const [selectedProvider, setSelectedProvider] = useState<string>('GEMINI');
    const [selectedModel, setSelectedModel] = useState<string>('gemini-3-pro-preview');

    // Use provider health hook
    const { isHealthy, status: providerStatus } = useAIProvider(selectedProvider);

    // Camera State
    const [isCameraActive, setIsCameraActive] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const editInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!loading) return;
        const messages = loading === 'ANALYZE' ? [
            "SCANNING NEURAL MAPS...", "DECODING VISUAL DATA...", "IDENTIFYING ENTITIES...", "CONTEXTUAL MAPPING...", "GENERATING INSIGHTS..."
        ] : [
            "MORPHING VISUAL KERNEL...", "RECONSTRUCTING DATA...", "APPLYING TRANSFORMS...", "PIXEL REGENERATION...", "INTEGRITY CHECK..."
        ];

        let msgIdx = 0;
        setStatusMsg(messages[0]);
        const interval = setInterval(() => {
            msgIdx = (msgIdx + 1) % messages.length;
            setStatusMsg(messages[msgIdx]);
        }, 3000);
        return () => clearInterval(interval);
    }, [loading]);

    // Attach stream to video element when camera is active
    useEffect(() => {
        if (isCameraActive && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [isCameraActive]);

    const providers = [
        { id: 'GEMINI', name: 'Gemini (Vision)', models: [
            { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Vision' },
            { id: 'gemini-2.5-flash-preview', name: 'Gemini 2.5 Flash' }
        ]},
        { id: 'GROQ', name: 'Groq (Llama)', models: [
            { id: 'llama-3.2-90b-vision-preview', name: 'Llama 3.2 Vision' },
            { id: 'llama-3.2-11b-vision-preview', name: 'Llama 3.2 11B' }
        ]},
        { id: 'OPENROUTER', name: 'OpenRouter (Omni)', models: [
            { id: 'openai/gpt-4o', name: 'GPT-4o' },
            { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' }
        ]}
    ];
    
    const currentModels = providers.find(p => p.id === selectedProvider)?.models || [];

    const startCamera = async (e?: React.MouseEvent) => {
        e?.stopPropagation();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            streamRef.current = stream;
            setIsCameraActive(true);
        } catch (err) {
            console.error("Camera Access Error:", err);
            alert("Could not access camera. Please check permissions.");
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        setIsCameraActive(false);
    };

    const captureFrame = () => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            const base64 = dataUrl.split(',')[1];
            stopCamera();
            processAnalysis(base64, 'image/jpeg');
        }
    };

    const processAnalysis = async (base64: string, mimeType: string) => {
        if (!isHealthy) {
            setAnalysisResult(`ERROR: Provider ${selectedProvider} is currently ${providerStatus}.`);
            return;
        }
        setLoading('ANALYZE');
        setEditResult(null);
        setAnalysisResult(null);
        
        try {
            const result = await analyzeMultiModalMedia(
                selectedProvider,
                selectedModel,
                base64,
                mimeType,
                prompt || "Analyze this visual data in detail."
            );
            setAnalysisResult(result);
        } catch (err: any) { 
            setAnalysisResult(`Visual analysis interrupted.`); 
        } finally { 
            setLoading(null); 
        }
    };

    const handleMediaUpload = async (file: File, task: 'ANALYZE' | 'EDIT') => {
        if (!file) return;
        if (!isHealthy) {
            setAnalysisResult(`ERROR: Provider ${selectedProvider} is ${providerStatus}.`);
            return;
        }

        setLoading(task);
        setEditResult(null);
        setAnalysisResult(null);
        
        const reader = new FileReader();
        reader.onload = async () => {
            const base64 = (reader.result as string).split(',')[1];
            try {
                if (task === 'ANALYZE') {
                    await processAnalysis(base64, file.type);
                } else {
                    const result = await editImage(base64, file.type, prompt || "Enhance this image.");
                    setEditResult(result);
                    setLoading(null);
                }
            } catch (err: any) { 
                setAnalysisResult(`Image processing interrupted.`); 
                setLoading(null);
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <ToolGroup 
            title="NEURAL VISION" 
            icon={icon} 
            subtitle="MULTIMODAL ANALYSIS" 
            isOpen={isOpen} 
            onToggle={onToggle} 
            isLoading={!!loading} 
            loadingText={statusMsg || ''}
        >
             <div className="space-y-10 animate-fade-in">
                
                {/* Provider Selector */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1 space-y-2">
                        <label className="text-[9px] tech-mono font-black uppercase tracking-[0.3em] text-neutral-500 pl-2 flex items-center justify-between">
                            Vision Engine
                            {!isHealthy && <span className="text-red-500 flex items-center gap-1"><AlertCircle size={10} /> {providerStatus}</span>}
                        </label>
                        <div className="relative">
                            <select 
                                value={selectedProvider} 
                                onChange={(e) => { setSelectedProvider(e.target.value); setSelectedModel(providers.find(p => p.id === e.target.value)?.models[0].id || ''); }}
                                className={`w-full bg-zinc-100 dark:bg-white/5 p-3 rounded-xl border border-black/5 dark:border-white/5 text-[10px] font-black uppercase tracking-widest text-black dark:text-white focus:outline-none focus:border-accent/30 appearance-none ${!isHealthy ? 'border-red-500/30' : ''}`}
                            >
                                {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                        </div>
                    </div>
                    <div className="flex-1 space-y-2">
                         <label className="text-[9px] tech-mono font-black uppercase tracking-[0.3em] text-neutral-500 pl-2">Model</label>
                         <div className="relative">
                            <select 
                                value={selectedModel} 
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="w-full bg-zinc-100 dark:bg-white/5 p-3 rounded-xl border border-black/5 dark:border-white/5 text-[10px] font-black uppercase tracking-widest text-black dark:text-white focus:outline-none focus:border-accent/30 appearance-none"
                            >
                                {currentModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                    {/* CAMERA / UPLOAD ZONE */}
                    {isCameraActive ? (
                        <div className="flex-1 relative rounded-[40px] overflow-hidden bg-black border-2 border-accent/30 shadow-[0_0_40px_var(--accent-glow)] min-h-[300px] flex flex-col animate-fade-in group">
                            <video 
                                ref={videoRef} 
                                autoPlay 
                                playsInline 
                                muted 
                                className="w-full h-full object-cover flex-1"
                            />
                            
                            {/* Live Indicator */}
                            <div className="absolute top-6 left-6 px-3 py-1.5 bg-red-600/90 backdrop-blur-md rounded-lg flex items-center gap-2 z-20">
                                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                <span className="text-[8px] font-black text-white uppercase tracking-widest">LIVE_FEED</span>
                            </div>

                            {/* Camera Controls Overlay */}
                            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-center gap-8 z-20">
                                <button 
                                    onClick={stopCamera}
                                    className="p-4 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white transition-all border border-white/10"
                                >
                                    <X size={20} />
                                </button>
                                
                                <button 
                                    onClick={captureFrame}
                                    className="w-16 h-16 rounded-full bg-white border-[6px] border-white/30 bg-clip-padding hover:scale-110 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                                >
                                </button>

                                <div className="w-12"></div> {/* Spacer for balance */}
                            </div>
                        </div>
                    ) : (
                        <div 
                            onClick={() => fileInputRef.current?.click()} 
                            className="flex-1 p-8 border-2 border-dashed border-black/10 dark:border-white/10 rounded-[40px] flex flex-col items-center justify-center text-center group hover:border-[var(--accent-color)]/50 hover:bg-[var(--accent-color)]/[0.03] transition-all duration-700 cursor-pointer min-h-[300px] shadow-inner relative bg-zinc-50 dark:bg-black/20"
                        >
                            <div className="w-24 h-24 rounded-[32px] bg-white dark:bg-white/5 flex items-center justify-center mb-6 shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 group-hover:bg-accent/10 border border-black/5 dark:border-white/5">
                                <ImageIcon size={36} className="text-neutral-400 group-hover:text-[var(--accent-color)] transition-colors" />
                            </div>
                            <p className="text-[10px] font-black uppercase tech-mono text-neutral-400 group-hover:text-accent transition-colors tracking-[0.4em]">SOURCE_UPLINK</p>
                            <p className="text-[8px] text-neutral-500 uppercase mt-2 opacity-50 mb-8">DROP FILE OR TAP TO BROWSE</p>
                            
                            <div className="flex gap-3 z-10 relative" onClick={(e) => e.stopPropagation()}>
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-6 py-3 bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/10 transition-all text-neutral-500 hover:text-black dark:hover:text-white"
                                >
                                    BROWSE
                                </button>
                                <button 
                                    onClick={startCamera}
                                    className="px-6 py-3 bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/10 transition-all flex items-center gap-2 text-neutral-500 hover:text-accent"
                                >
                                    <Camera size={14} /> LIVE_CAM
                                </button>
                            </div>

                            <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => e.target.files?.[0] && handleMediaUpload(e.target.files[0], 'ANALYZE')} accept="image/*,video/*" />
                        </div>
                    )}

                    <div className="flex-1 flex flex-col gap-6 justify-center">
                        <div className="relative">
                            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Instruksi analisis atau modifikasi..." className="w-full bg-zinc-100 dark:bg-black/20 p-6 rounded-[32px] border border-transparent focus:border-accent/30 focus:bg-white dark:focus:bg-black/40 focus:outline-none text-black dark:text-white font-bold h-40 resize-none transition-all placeholder:text-neutral-400 uppercase italic text-xs shadow-inner" />
                            <div className="absolute top-4 right-6 opacity-30">
                                <Activity size={12} className="text-accent" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <button onClick={() => editInputRef.current?.click()} className="py-5 bg-white dark:bg-white/5 text-neutral-500 dark:text-neutral-300 rounded-[20px] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 border border-black/5 dark:border-white/10 hover:border-accent/30 hover:bg-zinc-50 transition-all shadow-lg">
                                 <Layout size={18} /> EDIT_SOURCE
                                 <input type="file" ref={editInputRef} className="hidden" onChange={(e) => e.target.files?.[0] && handleMediaUpload(e.target.files[0], 'EDIT')} accept="image/*" />
                             </button>
                             <button onClick={() => fileInputRef.current?.click()} className="py-5 bg-[var(--accent-color)] text-on-accent rounded-[20px] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-2xl hover:scale-[1.02] active:scale-95 transition-all">
                                 <Send size={18} /> ANALYZE
                             </button>
                        </div>
                    </div>
                </div>

                {(analysisResult || editResult) && (
                    <div className="p-10 bg-white dark:bg-black/40 rounded-[40px] border border-black/5 dark:border-white/10 tech-mono text-xs leading-relaxed text-black dark:text-neutral-300 uppercase italic animate-slide-up shadow-lg relative group">
                        <div className="flex items-center gap-3 mb-8 text-[var(--accent-color)] border-b border-black/5 dark:border-white/10 pb-6">
                            <Sparkles size={20} className="animate-pulse" />
                            <span className="font-black tracking-[0.4em]">OUTPUT_LOG</span>
                        </div>
                        
                        {editResult ? (
                            <img src={editResult} alt="Edited Result" className="w-full rounded-[24px] shadow-lg border border-black/5" />
                        ) : (
                            <div className="prose dark:prose-invert prose-sm max-w-none text-black dark:text-white mb-4 selection:bg-accent/20">
                                <Markdown>{analysisResult || ''}</Markdown>
                            </div>
                        )}

                        <button onClick={() => { setAnalysisResult(null); setEditResult(null); }} className="absolute top-10 right-10 p-3 text-neutral-400 hover:text-red-500 transition-all hover:bg-red-500/10 rounded-xl"><Trash2 size={20} /></button>
                        <div className="mt-8 pt-6 border-t border-black/5 dark:border-white/10 flex items-center gap-2 opacity-40">
                            <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
                            <span className="text-[8px] font-black tracking-widest">KRNL_VERIFIED_OUTPUT</span>
                        </div>
                    </div>
                )}
             </div>
        </ToolGroup>
    );
};
