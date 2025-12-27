
import React, { useState, useRef } from 'react';
import { generateVideo } from '../../../services/geminiService';
import { generateMultiModalImage } from '../../../services/providerEngine';
import { ImageIcon, Video, X, Download, Trash2, Zap, RefreshCw, Layers, AlertCircle } from 'lucide-react';
import { ToolGroup } from './ToolGroup';
import { VisualModelSelector, type ProviderGroup } from './VisualModelSelector';
import { UI_REGISTRY, FN_REGISTRY } from '../../../constants/registry';
import { debugService } from '../../../services/debugService';
import { useAIProvider } from '../../../hooks/useAIProvider';

interface GenerativeStudioProps {
    isOpen: boolean;
    onToggle: () => void;
    icon: React.ReactNode;
}

export const GenerativeStudio: React.FC<GenerativeStudioProps> = ({ isOpen, onToggle, icon }) => {
    const [prompt, setPrompt] = useState('');
    const [mode, setMode] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [selectedProvider, setSelectedProvider] = useState<string>('GEMINI');
    const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash-image');

    const { isHealthy, status: providerStatus } = useAIProvider(selectedProvider);

    const providers: ProviderGroup[] = [
        { 
            id: 'GEMINI', 
            name: 'Google Gemini', 
            models: [
                { 
                    id: 'gemini-2.5-flash-image', 
                    name: 'Imagen 3 Flash (Free)',
                    description: 'Optimized for speed and efficiency. Works on free tier.',
                    tags: ['FREE', 'FAST'],
                    specs: { speed: 'INSTANT', quality: 'STD' }
                },
                { 
                    id: 'gemini-3-pro-image-preview', 
                    name: 'Imagen 3 Pro',
                    description: 'High-fidelity synthesis. May require credits.',
                    tags: ['PRO', 'HD'],
                    specs: { speed: 'FAST', quality: 'ULTRA' }
                }
            ]
        },
        { 
            id: 'PUTER', 
            name: 'Puter (X.AI)', 
            models: [
                { 
                    id: 'grok-2-image', 
                    name: 'Grok 2 Image',
                    description: 'X.AI Image Generation via Puter.',
                    tags: ['FREE', 'BETA'],
                    specs: { speed: 'FAST', quality: 'HD' }
                }
            ]
        },
        { 
            id: 'OPENAI', 
            name: 'OpenAI', 
            models: [
                { 
                    id: 'dall-e-3', 
                    name: 'DALL-E 3',
                    description: 'State-of-the-art semantics. Paid only.',
                    tags: ['PAID', 'VIVID'],
                    specs: { speed: 'SLOW', quality: 'ULTRA' }
                }
            ]
        }
    ];

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        
        const uiId = mode === 'IMAGE' ? UI_REGISTRY.TOOLS_GEN_BTN_IMAGE : UI_REGISTRY.TOOLS_GEN_BTN_VIDEO;
        const fnId = mode === 'IMAGE' ? FN_REGISTRY.TOOL_GENERATE_IMAGE : FN_REGISTRY.TOOL_GENERATE_VIDEO;
        
        if (!debugService.logAction(uiId, fnId, selectedModel)) return;

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            if (mode === 'VIDEO') {
                if (selectedProvider !== 'GEMINI') throw new Error("Video generation currently only supported on Gemini (Veo).");
                const videoUrl = await generateVideo(prompt, { resolution: '720p' });
                if (videoUrl) setResult(videoUrl);
                else throw new Error("Video generation returned no data.");
            } else {
                const imgData = await generateMultiModalImage(selectedProvider, selectedModel, prompt, { aspectRatio: '1:1' });
                setResult(imgData);
            }
        } catch (e: any) {
            setError(e.message || "Generation failed.");
            debugService.log('ERROR', 'GEN_STUDIO', 'FAIL', e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = () => {
        debugService.logAction(UI_REGISTRY.TOOLS_BTN_TAB_GEN, FN_REGISTRY.NAVIGATE_TO_FEATURE, isOpen ? 'CLOSE' : 'OPEN');
        onToggle();
    };

    return (
        <ToolGroup 
            title="GENERATIVE STUDIO" 
            icon={icon} 
            subtitle="VISUAL SYNTHESIS ENGINE" 
            isOpen={isOpen} 
            onToggle={handleToggle}
            isLoading={loading}
            loadingText={mode === 'VIDEO' ? "RENDERING_VIDEO_STREAM..." : "DIFFUSING_PIXELS..."}
        >
            <div className="p-4 md:p-6 space-y-6 animate-fade-in relative">
                {/* Internal Close */}
                <button 
                    onClick={(e) => { e.stopPropagation(); handleToggle(); }}
                    className="absolute top-2 right-2 md:top-4 md:right-4 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-neutral-400 hover:text-black dark:hover:text-white transition-colors z-20"
                >
                    <X size={20} />
                </button>

                {/* SETTINGS HEADER */}
                <div className="flex flex-col sm:flex-row gap-4 mb-4 bg-white dark:bg-[#0f0f11] border border-black/5 dark:border-white/5 p-5 rounded-[24px] shadow-sm">
                    <div className="flex-1 space-y-2">
                        <VisualModelSelector 
                            label="Generation Engine"
                            selectedProviderId={selectedProvider}
                            selectedModelId={selectedModel}
                            providers={providers}
                            onSelect={(p, m) => { setSelectedProvider(p); setSelectedModel(m); }}
                            disabled={loading || mode === 'VIDEO'}
                        />
                        {!isHealthy && mode === 'IMAGE' && <span className="text-red-500 flex items-center gap-1 text-[9px] font-bold pl-2 pt-2 uppercase tracking-wide"><AlertCircle size={10} /> {providerStatus}</span>}
                    </div>
                    
                    <div className="flex items-center gap-2 p-1 bg-zinc-100 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5 self-start sm:self-center">
                        <button 
                            onClick={() => setMode('IMAGE')}
                            className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${mode === 'IMAGE' ? 'bg-white dark:bg-[#0a0a0b] text-black dark:text-white shadow-sm' : 'text-neutral-500 hover:text-black dark:hover:text-white'}`}
                        >
                            <ImageIcon size={14} /> IMAGE
                        </button>
                        <button 
                            onClick={() => { setMode('VIDEO'); setSelectedProvider('GEMINI'); }}
                            className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${mode === 'VIDEO' ? 'bg-white dark:bg-[#0a0a0b] text-black dark:text-white shadow-sm' : 'text-neutral-500 hover:text-black dark:hover:text-white'}`}
                        >
                            <Video size={14} /> VEO
                        </button>
                    </div>
                </div>

                {/* MAIN CONTENT */}
                <div className="flex flex-col lg:flex-row gap-8 lg:h-[500px]">
                    <div className="lg:w-1/3 flex flex-col gap-4">
                        <textarea 
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="DESCRIBE_VISUAL_OUTPUT..."
                            className="flex-1 w-full bg-white dark:bg-[#0a0a0b] p-6 rounded-[24px] border border-black/5 dark:border-white/10 focus:border-accent/30 focus:shadow-lg focus:outline-none text-black dark:text-white font-mono text-xs resize-none placeholder:text-neutral-400 transition-all shadow-inner min-h-[150px]"
                        />
                        <button 
                            onClick={handleGenerate}
                            disabled={loading || !prompt.trim()}
                            className="w-full py-4 bg-accent text-black font-black uppercase text-[10px] tracking-[0.25em] rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />}
                            {loading ? 'PROCESSING...' : 'GENERATE'}
                        </button>
                    </div>

                    <div className="lg:w-2/3 bg-zinc-100 dark:bg-[#0a0a0b] rounded-[32px] border border-black/5 dark:border-white/5 flex items-center justify-center relative overflow-hidden group">
                        {result ? (
                            mode === 'VIDEO' ? (
                                <video src={result} controls autoPlay loop className="max-w-full max-h-full rounded-2xl shadow-2xl" />
                            ) : (
                                <img src={result} alt="Generated" className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" />
                            )
                        ) : error ? (
                            <div className="text-center p-8">
                                <AlertCircle size={48} className="mx-auto text-red-500 mb-4 opacity-50" />
                                <p className="text-red-500 font-bold text-xs uppercase tracking-widest">{error}</p>
                            </div>
                        ) : (
                            <div className="text-center opacity-30">
                                <Layers size={64} className="mx-auto text-neutral-500 mb-4" strokeWidth={1} />
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500">AWAITING_INPUT_STREAM</p>
                            </div>
                        )}

                        {result && (
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <a href={result} download={`generated_${Date.now()}.${mode === 'VIDEO' ? 'mp4' : 'png'}`} className="p-2 bg-white/10 backdrop-blur hover:bg-white/20 rounded-xl text-white transition-all">
                                    <Download size={20} />
                                </a>
                                <button onClick={() => setResult(null)} className="p-2 bg-red-500/20 backdrop-blur hover:bg-red-500/40 rounded-xl text-red-200 transition-all">
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ToolGroup>
    );
};
