
import React, { useState, useEffect, useRef } from 'react';
import { editImage } from '../../../services/geminiService';
import { analyzeMultiModalMedia } from '../../../services/providerEngine';
import { Camera, Layout, Send, Sparkles, Trash2, Activity, ChevronDown } from 'lucide-react';
import Markdown from 'react-markdown';
import { ToolGroup } from './ToolGroup';

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

    const fileInputRef = useRef<HTMLInputElement>(null);
    const editInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!loading) return;
        const messages = loading === 'ANALYZE' ? [
            "SCANNING_NEURAL_MAPS...", "DECODING_VISUAL_DATA...", "IDENTIFYING_ENTITIES...", "CONTEXTUAL_MAPPING...", "GENERATING_INSIGHTS..."
        ] : [
            "MORPHING_VISUAL_KERNEL...", "RECONSTRUCTING_DATA...", "APPLYING_TRANSFORMS...", "PIXEL_REGENERATION...", "INTEGRITY_CHECK..."
        ];

        let msgIdx = 0;
        setStatusMsg(messages[0]);
        const interval = setInterval(() => {
            msgIdx = (msgIdx + 1) % messages.length;
            setStatusMsg(messages[msgIdx]);
        }, 3000);
        return () => clearInterval(interval);
    }, [loading]);

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

    const handleMediaUpload = async (file: File, task: 'ANALYZE' | 'EDIT') => {
        if (!file) return;
        setLoading(task);
        setEditResult(null);
        setAnalysisResult(null);
        
        const reader = new FileReader();
        reader.onload = async () => {
            const base64 = (reader.result as string).split(',')[1];
            try {
                if (task === 'ANALYZE') {
                    // Use new Multi-Modal Engine
                    const result = await analyzeMultiModalMedia(
                        selectedProvider,
                        selectedModel,
                        base64,
                        file.type,
                        prompt || "Analyze this media."
                    );
                    setAnalysisResult(result);
                } else {
                    // Editing still uses Gemini for now as other providers don't have standard edit endpoint
                    const result = await editImage(base64, file.type, prompt || "Enhance this image.");
                    setEditResult(result);
                }
            } catch (err: any) { 
                setAnalysisResult(`ERROR: ${err.message}`); 
            } finally { 
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
                        <label className="text-[9px] tech-mono font-black uppercase tracking-[0.3em] text-neutral-500 pl-2">Vision Engine</label>
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
                    <div onClick={() => fileInputRef.current?.click()} className="flex-1 p-10 border-2 border-dashed border-black/10 dark:border-white/10 rounded-[40px] flex flex-col items-center justify-center text-center group hover:border-[var(--accent-color)]/50 hover:bg-[var(--accent-color)]/[0.03] transition-all duration-700 cursor-pointer min-h-[300px] shadow-inner relative bg-zinc-50 dark:bg-black/20">
                        <div className="w-24 h-24 rounded-[32px] bg-white dark:bg-white/5 flex items-center justify-center mb-8 shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 group-hover:bg-accent/10 border border-black/5 dark:border-white/5">
                            <Camera size={40} className="text-neutral-400 group-hover:text-[var(--accent-color)] transition-colors" />
                        </div>
                        <p className="text-[10px] font-black uppercase tech-mono text-neutral-400 group-hover:text-accent transition-colors tracking-[0.4em]">SOURCE_UPLINK</p>
                        <p className="text-[8px] text-neutral-500 uppercase mt-2 opacity-50">IMAGE / VIDEO / RAW DATA</p>
                        <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => e.target.files?.[0] && handleMediaUpload(e.target.files[0], 'ANALYZE')} accept="image/*,video/*" />
                    </div>
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
