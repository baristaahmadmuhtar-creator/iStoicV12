
import React, { useState, useEffect } from 'react';
import { generateVideo } from '../../../services/geminiService';
import { generateMultiModalImage } from '../../../services/providerEngine';
import { ImageIcon, Video, Sparkles, Download, Trash2, ChevronDown, Monitor } from 'lucide-react';
import { ToolGroup } from './ToolGroup';

interface GenerativeStudioProps {
    isOpen: boolean;
    onToggle: () => void;
    icon: React.ReactNode;
}

export const GenerativeStudio: React.FC<GenerativeStudioProps> = ({ isOpen, onToggle, icon }) => {
    const [prompt, setPrompt] = useState('');
    const [imgResult, setImgResult] = useState<string | null>(null);
    const [vidResult, setVidResult] = useState<string | null>(null);
    const [loading, setLoading] = useState<'IMAGE' | 'VIDEO' | null>(null);
    const [statusMsg, setStatusMsg] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16'>('1:1');
    const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    
    // Multi-Provider State
    const [selectedProvider, setSelectedProvider] = useState<string>('GEMINI');
    const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash-image');

    // Dynamic Loading Messages
    useEffect(() => {
        if (!loading) return;
        const messages = loading === 'IMAGE' ? [
            "SYNTHESIZING_PIXELS...", "CALIBRATING_OPTICS...", "INJECTING_CREATIVITY...", "POLISHING_REFLECTIONS...", "FINALIZING_RENDER..."
        ] : [
            "INJECTING_VEO_VECTORS...", "TEMPORAL_STABILIZATION...", "FLUID_DYNAMICS_SYNC...", "VEO_ENGINE_WARMUP...", "ENCODING_COGNITION..."
        ];

        let msgIdx = 0;
        setStatusMsg(messages[0]);
        const interval = setInterval(() => {
            msgIdx = (msgIdx + 1) % messages.length;
            setStatusMsg(messages[msgIdx]);
        }, 3000);
        return () => clearInterval(interval);
    }, [loading]);

    // HELPER: Ensure API Key is selected for Paid Models (Google Only)
    const ensureApiKey = async (): Promise<boolean> => {
        const aistudio = (window as any).aistudio;
        if (aistudio) {
            const hasKey = await aistudio.hasSelectedApiKey();
            if (!hasKey) {
                try {
                    await aistudio.openSelectKey();
                    return true;
                } catch (e) {
                    console.error("API Key Selection Cancelled", e);
                    return false;
                }
            }
            return true;
        }
        return true;
    };

    const handleGenerateImage = async () => {
        if (!prompt || loading) return;
        if (selectedProvider === 'GEMINI' && (imageSize === '2K' || imageSize === '4K')) {
            if (!await ensureApiKey()) return;
        }

        setLoading('IMAGE');
        setErrorMsg(null);
        try { 
            // Use new multi-provider engine
            const result = await generateMultiModalImage(
                selectedProvider, 
                selectedModel, 
                prompt, 
                { aspectRatio, imageSize }
            );
            setImgResult(result);
            setVidResult(null);
        } catch (e: any) { 
            console.error(e);
            if (e.message && e.message.includes("Requested entity was not found")) {
                setErrorMsg("⚠️ AUTH_ERROR: Key tidak valid. Membuka dialog...");
                const aistudio = (window as any).aistudio;
                if (aistudio) await aistudio.openSelectKey();
            } else {
                setErrorMsg(`ERROR: ${e.message}`);
            }
        } finally { setLoading(null); }
    };

    const handleGenerateVideo = async () => {
        if (!prompt || loading) return;
        if (!await ensureApiKey()) return;

        setLoading('VIDEO');
        setErrorMsg(null);
        try { 
            // Video currently handled by Gemini Service directly for polling operations
            const result = await generateVideo(prompt, { aspectRatio: aspectRatio === '1:1' ? '16:9' : (aspectRatio as any), resolution: '720p' });
            setVidResult(result);
            setImgResult(null);
        } catch (e: any) { 
            console.error(e);
            if (e.message && e.message.includes("Requested entity was not found")) {
                setErrorMsg("⚠️ AUTH_ERROR: Key tidak valid. Membuka dialog...");
                const aistudio = (window as any).aistudio;
                if (aistudio) await aistudio.openSelectKey();
            } else {
                setErrorMsg(`ERROR: ${e.message}`);
            }
        } finally { setLoading(null); }
    };

    const providers = [
        { id: 'GEMINI', name: 'Gemini (Imagen 3)', models: [
            { id: 'gemini-2.5-flash-image', name: 'Imagen 3 Fast' },
            { id: 'gemini-3-pro-image-preview', name: 'Imagen 3 Pro' }
        ]},
        { id: 'OPENAI', name: 'OpenAI (DALL-E)', models: [
            { id: 'dall-e-3', name: 'DALL-E 3' },
            { id: 'dall-e-2', name: 'DALL-E 2' }
        ]}
    ];

    const currentModels = providers.find(p => p.id === selectedProvider)?.models || [];

    return (
        <ToolGroup 
            title="GENERATIVE STUDIO" 
            icon={icon} 
            subtitle="IMAGEN 3 & VEO ENGINE" 
            isOpen={isOpen} 
            onToggle={onToggle} 
            isLoading={!!loading} 
            loadingText={statusMsg || ''}
        >
            <div className="space-y-8 animate-fade-in">
                {/* Provider & Model Selector */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 space-y-2">
                        <label className="text-[9px] tech-mono font-black uppercase tracking-[0.3em] text-neutral-500 pl-2">Engine Provider</label>
                        <div className="relative">
                            <select 
                                value={selectedProvider} 
                                onChange={(e) => { setSelectedProvider(e.target.value); setSelectedModel(providers.find(p => p.id === e.target.value)?.models[0].id || ''); }}
                                className="w-full bg-zinc-100 dark:bg-white/5 p-3 rounded-xl border border-black/5 dark:border-white/5 text-[10px] font-black uppercase tracking-widest text-black dark:text-white focus:outline-none focus:border-accent/30 appearance-none"
                            >
                                {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                        </div>
                    </div>
                    <div className="flex-1 space-y-2">
                         <label className="text-[9px] tech-mono font-black uppercase tracking-[0.3em] text-neutral-500 pl-2">Model Version</label>
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

                <div className="relative group">
                    <textarea 
                        value={prompt} 
                        onChange={(e) => setPrompt(e.target.value)} 
                        placeholder="Visualisasi keinginan Tuan..." 
                        className="w-full bg-zinc-100 dark:bg-black/20 p-8 rounded-[32px] border border-transparent focus:border-accent/20 focus:bg-white dark:focus:bg-black/40 focus:outline-none text-black dark:text-white font-bold h-44 resize-none transition-all placeholder:text-neutral-400 uppercase italic leading-relaxed text-sm shadow-inner" 
                    />
                    <div className="absolute bottom-4 right-6 opacity-20 group-focus-within:opacity-100 transition-opacity">
                        <Sparkles size={16} className="text-accent animate-pulse" />
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <label className="text-[9px] tech-mono font-black uppercase tracking-[0.3em] text-neutral-500 pl-2">Aspect Ratio</label>
                        <div className="flex gap-2 p-1.5 bg-zinc-100 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5">
                            {['1:1', '16:9', '9:16'].map(r => (<button key={r} onClick={() => setAspectRatio(r as any)} className={`flex-1 py-4 text-[10px] tech-mono font-black rounded-xl transition-all duration-300 ${aspectRatio === r ? 'bg-[var(--accent-color)] text-on-accent shadow-[0_10px_20px_var(--accent-glow)]' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>{r}</button>))}
                        </div>
                    </div>
                    {selectedProvider === 'GEMINI' && (
                        <div className="space-y-4">
                            <label className="text-[9px] tech-mono font-black uppercase tracking-[0.3em] text-neutral-500 pl-2">Density</label>
                            <div className="flex gap-2 p-1.5 bg-zinc-100 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5">
                                {['1K', '2K', '4K'].map(s => (<button key={s} onClick={() => setImageSize(s as any)} className={`flex-1 py-4 text-[10px] tech-mono font-black rounded-xl transition-all duration-300 ${imageSize === s ? 'bg-[var(--accent-color)] text-on-accent shadow-[0_10px_20px_var(--accent-glow)]' : 'text-neutral-400 hover:text-neutral-600'}`}>{s}</button>))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row gap-5 pt-4">
                    <button onClick={handleGenerateImage} disabled={!!loading || !prompt.trim()} className="flex-1 py-6 bg-[var(--accent-color)] text-on-accent rounded-[24px] font-black uppercase text-[11px] tracking-[0.4em] flex items-center justify-center gap-4 shadow-2xl hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all duration-500"><ImageIcon size={20} /> GENERATE_IMAGE</button>
                    {selectedProvider === 'GEMINI' && (
                        <button onClick={handleGenerateVideo} disabled={!!loading || !prompt.trim()} className="flex-1 py-6 bg-zinc-100 dark:bg-white/5 text-black dark:text-white rounded-[24px] font-black uppercase text-[11px] tracking-[0.4em] flex items-center justify-center gap-4 border border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40 transition-all duration-500 shadow-lg"><Video size={20} /> VEO_VIDEO</button>
                    )}
                </div>

                {errorMsg && (
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black tech-mono uppercase tracking-wider">
                        {errorMsg}
                    </div>
                )}

                {(imgResult || vidResult) && (
                    <div className="rounded-[40px] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.2)] border border-black/5 dark:border-white/5 group relative bg-black dark:bg-black/40 animate-slide-up mt-12 transition-all duration-700">
                        {imgResult && <img src={imgResult} className="w-full object-cover max-h-[700px] transition-transform duration-[2s] group-hover:scale-105" alt="Synthesis Result" />}
                        {vidResult && <video src={vidResult} controls className="w-full max-h-[700px]" />}
                        <div className="absolute top-8 right-8 flex gap-4 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                            <button onClick={() => window.open(imgResult || vidResult!)} className="p-4 bg-black/60 backdrop-blur-xl rounded-2xl text-white hover:text-[var(--accent-color)] transition-all border border-white/10 shadow-2xl"><Download size={22} /></button>
                            <button onClick={() => { setImgResult(null); setVidResult(null); }} className="p-4 bg-black/60 backdrop-blur-xl rounded-2xl text-white hover:text-red-500 transition-all border border-white/10 shadow-2xl"><Trash2 size={22} /></button>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                            <p className="text-[10px] tech-mono text-white/60 uppercase tracking-[0.4em]">SYNTHESIS_COMPLETE // ATARAXIA_OUTPUT_ID_{Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                        </div>
                    </div>
                )}
            </div>
        </ToolGroup>
    );
};
