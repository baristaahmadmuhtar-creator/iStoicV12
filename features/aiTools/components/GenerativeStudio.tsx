
import React, { useState, useEffect } from 'react';
import { generateVideo } from '../../../services/geminiService';
import { generateMultiModalImage } from '../../../services/providerEngine';
import { HANISAH_KERNEL } from '../../../services/melsaKernel';
import { ImageIcon, Video, Sparkles, Download, Trash2, Monitor, AlertCircle, Wand2, Palette, Layers, Zap, X, Dices, History, Copy, Maximize2 } from 'lucide-react';
import { ToolGroup } from './ToolGroup';
import { useAIProvider } from '../../../hooks/useAIProvider';
import { VisualModelSelector, type ProviderGroup } from './VisualModelSelector';
import { UI_REGISTRY, FN_REGISTRY } from '../../../constants/registry';
import { debugService } from '../../../services/debugService';

interface GenerativeStudioProps {
    isOpen: boolean;
    onToggle: () => void;
    icon: React.ReactNode;
}

const STYLE_PRESETS = [
    { id: 'NONE', label: 'RAW', prompt: '' },
    { id: 'CYBERPUNK', label: 'CYBERPUNK', prompt: ', cyberpunk style, neon lights, high tech, futuristic city, detailed, 8k resolution, cinematic lighting' },
    { id: 'PHOTOREAL', label: 'PHOTOREAL', prompt: ', photorealistic, 8k, highly detailed, shot on 35mm, f/1.8, bokeh, professional photography' },
    { id: 'ANIME', label: 'ANIME', prompt: ', anime style, studio ghibli style, vibrant colors, cel shaded, highly detailed' },
    { id: 'OIL', label: 'OIL PAINT', prompt: ', oil painting style, textured brush strokes, artistic, masterpiece' },
    { id: '3D', label: '3D RENDER', prompt: ', 3d render, octane render, unreal engine 5, ray tracing, highly detailed' }
];

const SURPRISE_PROMPTS = [
    "A futuristic city built inside a giant glass bubble on Mars, cinematic lighting, 8k",
    "A portrait of a cyborg woman with neon glowing eyes, cyberpunk style, detailed",
    "An isometric view of a magical library with floating books, fantasy art",
    "A cute robot gardener watering plants in a greenhouse, pixar style, 3d render",
    "A surreal landscape with melting clocks and floating islands, salvador dali style"
];

interface HistoryItem {
    id: string;
    url: string;
    type: 'IMAGE' | 'VIDEO';
    prompt: string;
    timestamp: number;
}

export const GenerativeStudio: React.FC<GenerativeStudioProps> = ({ isOpen, onToggle, icon }) => {
    const [prompt, setPrompt] = useState('');
    const [imgResult, setImgResult] = useState<string | null>(null);
    const [vidResult, setVidResult] = useState<string | null>(null);
    const [loading, setLoading] = useState<'IMAGE' | 'VIDEO' | 'ENHANCING' | null>(null);
    const [statusMsg, setStatusMsg] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16'>('1:1');
    const [stylePreset, setStylePreset] = useState<string>('NONE');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    
    // History State
    const [history, setHistory] = useState<HistoryItem[]>([]);
    
    // Default to Gemini Flash Image (Free, Fast, Good Quality)
    const [selectedProvider, setSelectedProvider] = useState<string>('GEMINI');
    const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash-image');

    const { isHealthy, status: providerStatus } = useAIProvider(selectedProvider);

    useEffect(() => {
        if (!loading) return;
        const messages = loading === 'IMAGE' ? [
            "MANIFESTING VISUAL CONCEPT...", "ALIGNING PIXELS...", "POLISHING REFLECTIONS...", "FINALIZING RENDER..."
        ] : loading === 'VIDEO' ? [
            "TEMPORAL STABILIZATION...", "FLUID DYNAMICS SYNC...", "ENCODING COGNITION..."
        ] : [
            "EXPANDING PROMPT...", "ADDING DETAILS...", "OPTIMIZING TOKENS..."
        ];

        let msgIdx = 0;
        setStatusMsg(messages[0]);
        const interval = setInterval(() => {
            msgIdx = (msgIdx + 1) % messages.length;
            setStatusMsg(messages[msgIdx]);
        }, 3000);
        return () => clearInterval(interval);
    }, [loading]);

    const addToHistory = (url: string, type: 'IMAGE' | 'VIDEO', promptText: string) => {
        const newItem: HistoryItem = {
            id: Date.now().toString(),
            url,
            type,
            prompt: promptText,
            timestamp: Date.now()
        };
        setHistory(prev => [newItem, ...prev].slice(0, 10)); // Keep last 10
    };

    const handleRandomPrompt = () => {
        const random = SURPRISE_PROMPTS[Math.floor(Math.random() * SURPRISE_PROMPTS.length)];
        setPrompt(random);
    };

    const handleEnhancePrompt = async () => {
        if (!prompt) return;
        if (loading) return;
        
        debugService.logAction(UI_REGISTRY.TOOLS_GEN_BTN_IMAGE, FN_REGISTRY.TOOL_GENERATE_IMAGE, 'ENHANCE_PROMPT');
        setLoading('ENHANCING');
        try {
            const instruction = `Rewrite the following image prompt to be highly detailed, descriptive, and optimized for a generative AI model (Imagen 3). Focus on lighting, texture, and composition. Keep it under 100 words. Input: "${prompt}"`;
            const result = await HANISAH_KERNEL.execute(instruction, 'gemini-3-flash-preview');
            if (result.text) {
                setPrompt(result.text.trim());
            }
        } catch (e) {
            console.error("Enhance failed", e);
        } finally {
            setLoading(null);
        }
    };

    const handleGenerateImage = async () => {
        if (!prompt || loading) return;
        
        debugService.logAction(UI_REGISTRY.TOOLS_GEN_BTN_IMAGE, FN_REGISTRY.TOOL_GENERATE_IMAGE, selectedModel);

        if (!isHealthy) {
            setErrorMsg(`Provider ${selectedProvider} is currently ${providerStatus}. Check API keys.`);
            return;
        }

        // Check for Google Key selection requirement ONLY if using Pro Vision, not Flash Image
        if (selectedModel === 'gemini-3-pro-image-preview') {
            const aistudio = (window as any).aistudio;
            if (aistudio && !(await aistudio.hasSelectedApiKey())) {
                try { await aistudio.openSelectKey(); } catch(e) { return; }
            }
        }

        setLoading('IMAGE');
        setErrorMsg(null);
        
        // Append Style
        const styleSuffix = STYLE_PRESETS.find(s => s.id === stylePreset)?.prompt || '';
        const finalPrompt = prompt + styleSuffix;

        try { 
            const result = await generateMultiModalImage(
                selectedProvider, 
                selectedModel, 
                finalPrompt, 
                { aspectRatio }
            );
            setImgResult(result);
            setVidResult(null);
            addToHistory(result, 'IMAGE', prompt);
        } catch (e: any) { 
            console.error(e);
            if (e.message && e.message.includes("Requested entity was not found")) {
                setErrorMsg("Access credentials required. Please select a valid API Key.");
            } else {
                setErrorMsg(`Generation failed: ${e.message}`);
            }
        } finally { setLoading(null); }
    };

    const handleGenerateVideo = async () => {
        if (!prompt || loading) return;
        
        debugService.logAction(UI_REGISTRY.TOOLS_GEN_BTN_VIDEO, FN_REGISTRY.TOOL_GENERATE_VIDEO, 'VEO_FAST');

        if (!isHealthy) {
            setErrorMsg(`GEMINI provider is ${providerStatus}.`);
            return;
        }

        setLoading('VIDEO');
        setErrorMsg(null);
        try { 
            const result = await generateVideo(prompt, { aspectRatio: aspectRatio === '1:1' ? '16:9' : (aspectRatio as any), resolution: '720p' });
            setVidResult(result);
            setImgResult(null);
            if (result) addToHistory(result, 'VIDEO', prompt);
        } catch (e: any) { 
            console.error(e);
            setErrorMsg("Unable to generate video stream at this time.");
        } finally { setLoading(null); }
    };

    const restoreHistoryItem = (item: HistoryItem) => {
        if (item.type === 'IMAGE') {
            setImgResult(item.url);
            setVidResult(null);
        } else {
            setVidResult(item.url);
            setImgResult(null);
        }
        setPrompt(item.prompt);
    };

    const handleToggle = () => {
        debugService.logAction(UI_REGISTRY.TOOLS_BTN_TAB_GEN, FN_REGISTRY.NAVIGATE_TO_FEATURE, isOpen ? 'CLOSE' : 'OPEN');
        onToggle();
    };

    const providers: ProviderGroup[] = [
        { 
            id: 'GEMINI', 
            name: 'Google Gemini', 
            models: [
                { 
                    id: 'gemini-2.5-flash-image', 
                    name: 'Imagen 3 Fast (Free)',
                    description: 'Optimized for speed and efficiency. Good for drafting.',
                    tags: ['FREE', 'FAST'],
                    specs: { speed: 'INSTANT', quality: 'STD' }
                },
                { 
                    id: 'gemini-3-pro-image-preview', 
                    name: 'Imagen 3 Pro',
                    description: 'High-fidelity visual synthesis with enhanced detail.',
                    tags: ['PRO', 'HD'],
                    specs: { speed: 'FAST', quality: 'ULTRA' }
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
                    description: 'State-of-the-art semantic instruction following.',
                    tags: ['HD', 'VIVID'],
                    specs: { speed: 'SLOW', quality: 'ULTRA' }
                }
            ]
        }
    ];

    return (
        <ToolGroup 
            title="GENERATIVE STUDIO" 
            icon={icon} 
            subtitle="IMAGEN 3 & DALL-E ENGINE" 
            isOpen={isOpen} 
            onToggle={handleToggle} 
            isLoading={!!loading} 
            loadingText={statusMsg || ''}
        >
            <div className="space-y-8 animate-fade-in p-4 md:p-6 relative">
                {/* Internal Close Button for convenience */}
                <button 
                    onClick={(e) => { e.stopPropagation(); handleToggle(); }}
                    className="absolute top-2 right-2 md:top-4 md:right-4 p-2 rounded-full hover:bg-white/5 text-neutral-400 hover:text-white transition-colors z-20"
                    title="Minimize Studio"
                >
                    <X size={20} />
                </button>

                {/* COMMAND DECK */}
                <div className="bg-[#0f0f11] rounded-[28px] border border-white/5 p-6 flex flex-col xl:flex-row gap-8 shadow-sm">
                    {/* Model Selection */}
                    <div className="flex-1 space-y-3">
                        <VisualModelSelector 
                            label="Rendering Engine"
                            selectedProviderId={selectedProvider}
                            selectedModelId={selectedModel}
                            providers={providers}
                            onSelect={(p, m) => { setSelectedProvider(p); setSelectedModel(m); }}
                            disabled={!!loading}
                        />
                    </div>

                    {/* Aspect Ratio */}
                    <div className="space-y-3 xl:w-72">
                        <label className="text-[9px] tech-mono font-black uppercase tracking-[0.3em] text-neutral-500 pl-1 flex items-center gap-2">
                            <Monitor size={10} /> Frame Ratio
                        </label>
                        <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5 h-[72px] items-center">
                            {['1:1', '16:9', '9:16'].map(r => (
                                <button 
                                    key={r} 
                                    onClick={() => setAspectRatio(r as any)} 
                                    className={`flex-1 h-full rounded-xl text-[10px] font-black transition-all flex flex-col items-center justify-center gap-1.5 ${aspectRatio === r ? 'bg-[#0a0a0b] text-[var(--accent-color)] shadow-md border border-white/5' : 'text-neutral-400 hover:text-white'}`}
                                >
                                    <div className={`border-2 rounded-sm ${aspectRatio === r ? 'border-current' : 'border-neutral-400'} ${r === '1:1' ? 'w-4 h-4' : r === '16:9' ? 'w-6 h-3' : 'w-3 h-6'}`}></div>
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* PROMPT CANVAS */}
                <div className="relative group">
                    <div className="absolute top-5 left-6 z-10 flex items-center gap-2">
                        <span className="text-[9px] font-black bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-white tracking-widest uppercase flex items-center gap-2 border border-white/10 shadow-lg">
                            <Zap size={10} className="text-accent"/> PROMPT_TERMINAL
                        </span>
                    </div>
                    
                    <div className="absolute top-5 right-5 z-10 flex gap-2">
                        <button 
                            onClick={handleRandomPrompt} 
                            disabled={!!loading}
                            className="px-3 py-2 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white rounded-xl backdrop-blur-md border border-white/5 transition-all shadow-lg active:scale-95 disabled:opacity-0"
                            title="Random Idea"
                        >
                            <Dices size={14} />
                        </button>
                        <button 
                            onClick={handleEnhancePrompt} 
                            disabled={!!loading || !prompt}
                            className="px-4 py-2 bg-accent/20 hover:bg-accent text-accent hover:text-on-accent rounded-xl backdrop-blur-md border border-accent/30 transition-all shadow-lg group/wand disabled:opacity-0 flex items-center gap-2 text-[9px] font-black uppercase tracking-wider active:scale-95"
                        >
                            <Wand2 size={12} className="group-hover/wand:rotate-12 transition-transform" /> ENHANCE
                        </button>
                    </div>

                    <textarea 
                        value={prompt} 
                        onChange={(e) => setPrompt(e.target.value)} 
                        placeholder="Describe your vision in high fidelity..." 
                        className="w-full bg-[#050505] p-8 pt-20 rounded-[32px] border border-white/10 focus:border-accent/50 focus:shadow-[0_0_30px_-5px_var(--accent-glow)] outline-none text-white font-medium text-lg h-64 resize-none transition-all placeholder:text-neutral-700 leading-relaxed font-sans" 
                    />
                </div>

                {/* STYLE PRESETS */}
                <div className="space-y-3">
                    <label className="text-[9px] tech-mono font-black uppercase tracking-[0.3em] text-neutral-500 pl-1 flex items-center gap-2">
                        <Palette size={10} /> Aesthetic Matrix
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {STYLE_PRESETS.map(style => (
                            <button 
                                key={style.id} 
                                onClick={() => setStylePreset(style.id)}
                                className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                                    stylePreset === style.id 
                                    ? 'bg-accent text-on-accent border-accent shadow-[0_0_20px_var(--accent-glow)]' 
                                    : 'bg-[#0f0f11] border-white/5 text-neutral-500 hover:text-white hover:border-accent/30'
                                }`}
                            >
                                {style.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-white/5">
                    <button 
                        onClick={handleGenerateImage} 
                        disabled={!!loading || !prompt.trim() || !isHealthy} 
                        className="flex-1 py-6 bg-white text-black rounded-[24px] font-black uppercase text-[11px] tracking-[0.3em] flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:scale-[1.01] active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all duration-300 group relative overflow-hidden hover:shadow-[0_0_50px_var(--accent-glow)] hover:bg-accent"
                    >
                        <ImageIcon size={20} className="group-hover:scale-110 transition-transform" /> 
                        {loading === 'IMAGE' ? 'RENDERING...' : 'GENERATE_VISUAL'}
                    </button>
                    
                    {selectedProvider === 'GEMINI' && (
                        <button 
                            onClick={handleGenerateVideo} 
                            disabled={!!loading || !prompt.trim() || !isHealthy} 
                            className="flex-1 py-6 bg-[#0f0f11] text-white rounded-[24px] font-black uppercase text-[11px] tracking-[0.3em] flex items-center justify-center gap-3 border border-white/10 hover:border-accent/50 disabled:opacity-40 transition-all duration-300 shadow-sm hover:shadow-lg group"
                        >
                            <Video size={20} className="group-hover:scale-110 transition-transform" /> 
                            {loading === 'VIDEO' ? 'SYNTHESIZING...' : 'GENERATE_VIDEO'}
                        </button>
                    )}
                </div>

                {/* ERROR DISPLAY */}
                {errorMsg && (
                    <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black tech-mono uppercase tracking-wider flex items-center gap-3 animate-slide-up">
                        <AlertCircle size={16} />
                        {errorMsg}
                    </div>
                )}

                {/* RESULT DISPLAY - HOLOGRAPHIC CONTAINER */}
                {(imgResult || vidResult) && (
                    <div className="rounded-[40px] overflow-hidden shadow-[0_0_60px_rgba(var(--accent-rgb),0.15)] border border-white/10 group relative bg-black animate-slide-up mt-8 ring-1 ring-white/10">
                        {imgResult && <img src={imgResult} className="w-full object-contain max-h-[700px] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-20" alt="Synthesis Result" />}
                        {vidResult && <video src={vidResult} controls autoPlay loop className="w-full max-h-[700px]" />}
                        
                        <div className="absolute top-8 right-8 flex gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0">
                            <button onClick={() => window.open(imgResult || vidResult!)} className="p-4 bg-black/60 backdrop-blur-xl rounded-2xl text-white hover:bg-accent hover:text-black transition-all border border-white/10 shadow-lg" title="Download">
                                <Download size={20} />
                            </button>
                            <button onClick={() => { setImgResult(null); setVidResult(null); }} className="p-4 bg-black/60 backdrop-blur-xl rounded-2xl text-white hover:bg-red-500 transition-all border border-white/10 shadow-lg" title="Clear">
                                <Trash2 size={20} />
                            </button>
                        </div>
                        
                        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-accent animate-pulse shadow-[0_0_10px_var(--accent-color)]"></div>
                                <p className="text-[10px] tech-mono text-white uppercase tracking-[0.3em] font-bold">
                                    {selectedProvider}_SYNTHESIS_COMPLETE
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* HISTORY STRIP */}
                {history.length > 0 && (
                    <div className="mt-8 border-t border-white/5 pt-6">
                        <h4 className="text-[9px] tech-mono font-black uppercase tracking-[0.3em] text-neutral-500 mb-4 flex items-center gap-2">
                            <History size={12} /> RECENT_SYNTHESIS
                        </h4>
                        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                            {history.map(item => (
                                <button 
                                    key={item.id} 
                                    onClick={() => restoreHistoryItem(item)}
                                    className="relative w-32 h-20 rounded-xl overflow-hidden border border-white/5 hover:border-accent/50 transition-all group shrink-0 active:scale-95"
                                >
                                    {item.type === 'IMAGE' ? (
                                        <img src={item.url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="History" />
                                    ) : (
                                        <div className="w-full h-full bg-zinc-900 flex items-center justify-center opacity-60 group-hover:opacity-100">
                                            <Video size={16} className="text-white" />
                                        </div>
                                    )}
                                    <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/60 text-[8px] text-white truncate px-2 backdrop-blur-sm">
                                        {item.prompt}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </ToolGroup>
    );
};
