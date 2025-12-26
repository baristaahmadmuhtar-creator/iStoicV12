
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { type Note } from '../../types';
import useLocalStorage from '../../hooks/useLocalStorage';
import { 
  Radio, ChevronDown, Flame, Brain, ArrowRight, Palette, Code, 
  GraduationCap, Lightbulb, History, Layers, Infinity, ArrowDown,
  Terminal
} from 'lucide-react';

import { useNeuralLinkSession } from './hooks/useNeuralLinkSession';
import { ChatHistory } from './components/ChatHistory';
import { ModelPicker } from './components/ModelPicker';
import { NeuralLinkOverlay } from './components/NeuralLinkOverlay';
import { ChatInput } from './components/ChatInput'; 
import { ChatWindow } from './components/ChatWindow'; 
import { VaultPinModal } from '../../components/VaultPinModal';
import { useNavigationIntelligence } from '../../hooks/useNavigationIntelligence';
import { UI_REGISTRY, FN_REGISTRY } from '../../constants/registry';
import { debugService } from '../../services/debugService';
import { useFeatures } from '../../contexts/FeatureContext';

interface AIChatViewProps {
    chatLogic: any;
}

const SuggestionCard: React.FC<{ 
    icon: React.ReactNode, 
    label: string, 
    desc: string, 
    onClick: () => void, 
    className?: string, 
    accent?: string 
}> = ({ icon, label, desc, onClick, className, accent = "text-neutral-400 group-hover:text-accent" }) => (
    <button 
        onClick={onClick}
        className={`
            relative overflow-hidden group 
            bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl
            border border-black/5 dark:border-white/5
            rounded-[24px] p-5 text-left 
            transition-all duration-300 ease-out
            hover:bg-white/80 dark:hover:bg-white/[0.06]
            hover:border-accent/30 hover:shadow-[0_15px_30px_-10px_rgba(var(--accent-rgb),0.15)]
            hover:-translate-y-1 active:scale-[0.98]
            flex flex-col justify-between h-full min-h-[140px]
            animate-slide-up ring-1 ring-transparent hover:ring-accent/10
            ${className}
        `}
    >
        <div className="relative z-10 w-full flex flex-col h-full">
            <div className="mb-auto flex justify-between items-start">
                <div className={`w-10 h-10 rounded-[14px] bg-zinc-50 dark:bg-white/5 flex items-center justify-center transition-all duration-500 group-hover:scale-110 ${accent} group-hover:bg-accent/10 border border-black/5 dark:border-white/5 shadow-sm`}>
                    {React.cloneElement(icon as React.ReactElement<any>, { size: 18, strokeWidth: 2 })}
                </div>
                <ArrowRight size={14} className="text-accent/50 -rotate-45 group-hover:rotate-0 transition-transform opacity-0 group-hover:opacity-100" />
            </div>
            <div className="mt-4 space-y-1.5">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-700 dark:text-neutral-300 group-hover:text-accent transition-colors">{label}</h4>
                <p className="text-[10px] text-neutral-500 font-medium leading-relaxed line-clamp-2 pr-2 opacity-80 group-hover:opacity-100">{desc}</p>
            </div>
        </div>
    </button>
);

const AIChatView: React.FC<AIChatViewProps> = ({ chatLogic }) => {
    const [notes, setNotes] = useLocalStorage<Note[]>('notes', []);
    const [showModelPicker, setShowModelPicker] = useState(false);
    const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false); 
    const [showScrollBtn, setShowScrollBtn] = useState(false);
    
    const { isFeatureEnabled } = useFeatures();
    const isLiveLinkEnabled = isFeatureEnabled('LIVE_LINK');
    
    const { isInputFocused, shouldShowNav } = useNavigationIntelligence();
    const isMobileNavVisible = shouldShowNav && (!isInputFocused || window.innerWidth > 768);
    
    const {
        threads, setThreads,
        activeThread, activeThreadId, setActiveThreadId,
        input, setInput,
        isLoading,
        activeModel,
        personaMode,
        handleNewChat,
        sendMessage,
        togglePinThread,
        renameThread,
        isVaultSynced,
        setIsVaultSynced,
        isVaultConfigEnabled, 
        setIsLiveModeActive,
        setGlobalModelId 
    } = chatLogic;

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isAutoScrolling = useRef(true);

    const {
        isLiveMode,
        liveStatus,
        transcriptHistory,
        interimTranscript,
        toggleLiveMode,
        analyser
    } = useNeuralLinkSession(personaMode, notes, setNotes);

    useEffect(() => {
        if (setIsLiveModeActive) setIsLiveModeActive(isLiveMode);
    }, [isLiveMode, setIsLiveModeActive]);

    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
            isAutoScrolling.current = true;
            setShowScrollBtn(false);
        }
    }, []);

    useEffect(() => {
        const container = document.getElementById('main-scroll-container');
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const distanceToBottom = scrollHeight - scrollTop - clientHeight;
            
            if (distanceToBottom > 300) {
                isAutoScrolling.current = false;
                setShowScrollBtn(true);
            } else {
                isAutoScrolling.current = true;
                setShowScrollBtn(false);
            }
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (isAutoScrolling.current) {
            scrollToBottom(isLoading ? 'auto' : 'smooth');
        }
    }, [activeThread?.messages, isLoading, scrollToBottom]);

    const handleModelPickerOpen = () => {
        debugService.logAction(UI_REGISTRY.CHAT_BTN_MODEL_PICKER, FN_REGISTRY.CHAT_SELECT_MODEL, 'OPEN');
        setShowModelPicker(true);
    };

    const handleHistoryOpen = () => {
        debugService.logAction(UI_REGISTRY.CHAT_BTN_HISTORY, FN_REGISTRY.CHAT_LOAD_HISTORY, 'OPEN');
        setShowHistoryDrawer(true);
    };

    const handleLiveToggle = () => {
        if (!isLiveLinkEnabled) {
            alert("FEATURE_DISABLED: Live Link disabled in System Mechanic.");
            return;
        }
        debugService.logAction(UI_REGISTRY.CHAT_BTN_LIVE_TOGGLE, FN_REGISTRY.CHAT_TOGGLE_LIVE, isLiveMode ? 'STOP' : 'START');
        toggleLiveMode();
    };

    const handleVaultToggle = useCallback(() => {
        if (!isVaultConfigEnabled || isTransitioning) return;
        if (isVaultSynced) setIsVaultSynced(false);
        else setShowPinModal(true);
    }, [isVaultSynced, isTransitioning, setIsVaultSynced, isVaultConfigEnabled]);

    const changePersona = async (target: 'hanisah' | 'stoic') => {
        if (personaMode === target || isTransitioning) return;
        setIsTransitioning(true);
        await handleNewChat(target);
        setTimeout(() => setIsTransitioning(false), 500);
    };

    const togglePersona = () => {
        const target = personaMode === 'stoic' ? 'hanisah' : 'stoic';
        changePersona(target);
    };

    // CRITICAL: Robust empty state check.
    // We only show empty state if we are NOT loading AND there are no meaningful messages.
    // If isLoading is true, we force the ChatWindow to render (state lock).
    const showEmptyState = !isLoading && (!activeThreadId || !activeThread || activeThread.messages.length <= 1);
    
    // Debug logging for developers
    useEffect(() => {
        if (activeThreadId && !activeThread) {
            console.warn(`[CHAT_VIEW] Active Thread ID ${activeThreadId} set, but thread object not found in store.`);
        }
        if (isLoading) {
            console.log(`[CHAT_VIEW] State Locked: Loading active for session ${activeThreadId}`);
        }
    }, [activeThreadId, activeThread, isLoading]);

    const isHydraActive = activeModel?.id === 'auto-best';
    const effectiveModelName = isHydraActive ? 'HYDRA_OMNI (MELSA)' : (activeModel?.name || 'GEMINI PRO');

    const personaColor = personaMode === 'hanisah' ? 'text-orange-500' : 'text-cyan-500';
    const personaGlow = personaMode === 'hanisah' ? 'from-orange-500/20 to-pink-500/5' : 'from-cyan-500/20 to-blue-500/5';
    const personaBorder = personaMode === 'hanisah' ? 'border-orange-500/20' : 'border-cyan-500/20';

    return (
        <div className="min-h-full flex flex-col relative w-full bg-noise animate-fade-in transition-colors duration-1000">
            <VaultPinModal 
                isOpen={showPinModal} 
                onClose={() => setShowPinModal(false)} 
                onSuccess={() => setIsVaultSynced(true)} 
            />

            <div className={`fixed inset-0 bg-gradient-to-b ${personaGlow} pointer-events-none transition-all duration-1000 opacity-20`}></div>

            <div className={`flex-1 flex flex-col relative z-10 w-full max-w-[1000px] mx-auto transition-all duration-500 ${isMobileNavVisible ? 'pb-36' : 'pb-32'}`}>
                
                {/* 1. HUD HEADER */}
                <div className="sticky top-4 z-40 w-full px-4 flex justify-center pointer-events-none">
                    <div className={`
                        pointer-events-auto backdrop-blur-xl border rounded-full p-1.5 pl-2 pr-1.5 flex items-center justify-between gap-3 shadow-lg ring-1 transition-all duration-500
                        ${isHydraActive 
                            ? 'bg-black/80 dark:bg-zinc-900/80 border-emerald-500/30 ring-emerald-500/20 shadow-emerald-500/10' 
                            : 'bg-white/80 dark:bg-[#0f0f11]/80 border-white/20 dark:border-white/10 ring-white/20 shadow-2xl'
                        }
                    `}>
                        <button 
                            className="flex items-center gap-3 cursor-pointer group py-1.5 px-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-all" 
                            onClick={handleModelPickerOpen}
                            title="Switch AI Model"
                        >
                            <div className={`
                                w-7 h-7 rounded-full flex items-center justify-center transition-colors border shrink-0 relative overflow-hidden
                                ${isHydraActive 
                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                    : `${personaMode === 'hanisah' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'}`
                                }
                            `}>
                                {isHydraActive 
                                    ? <Infinity size={14} className="animate-pulse" /> 
                                    : (personaMode === 'hanisah' ? <Flame size={14} fill="currentColor" /> : <Brain size={14} fill="currentColor" />)
                                }
                            </div>
                            <div className="flex flex-col overflow-hidden text-left">
                                <span className={`text-[8px] font-black uppercase tracking-widest leading-none mb-0.5 ${isHydraActive ? 'text-emerald-500' : 'text-neutral-500 group-hover:text-black dark:group-hover:text-white transition-colors'}`}>
                                    {isHydraActive ? 'HYDRA_OMNI' : `${personaMode.toUpperCase()}`}
                                </span>
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-bold uppercase leading-none max-w-[120px] sm:max-w-[160px] truncate text-black dark:text-white">
                                        {effectiveModelName}
                                    </span>
                                    <ChevronDown size={10} className="text-neutral-400 shrink-0 opacity-50 group-hover:opacity-100" />
                                </div>
                            </div>
                        </button>

                        <div className="h-6 w-[1px] bg-black/5 dark:bg-white/10"></div>

                        <div className="flex items-center gap-1 shrink-0">
                            <button 
                                onClick={handleHistoryOpen}
                                className="w-9 h-9 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-neutral-400 hover:text-black dark:hover:text-white transition-all flex items-center justify-center active:scale-95"
                                title="Neural Logs"
                            >
                                <History size={16} strokeWidth={2} />
                            </button>

                            <button 
                                onClick={handleLiveToggle}
                                className={`w-9 h-9 rounded-full transition-all flex items-center justify-center active:scale-95 ${
                                    !isLiveLinkEnabled 
                                    ? 'opacity-30 cursor-not-allowed text-neutral-500' 
                                    : isLiveMode 
                                        ? 'bg-red-500 text-white shadow-lg animate-pulse' 
                                        : 'text-neutral-400 hover:text-red-500 hover:bg-red-500/10'
                                }`}
                                title={!isLiveLinkEnabled ? "Live Link Disabled" : "Initialize Neural Link"}
                                disabled={!isLiveLinkEnabled}
                            >
                                <Radio size={16} strokeWidth={2} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2. CHAT AREA */}
                <div className="flex-1 w-full relative min-h-0 flex flex-col px-4 md:px-0 mt-4">
                    {showEmptyState ? (
                        <div className="flex flex-col h-full justify-center w-full pb-20 pt-8 animate-fade-in">
                            <div className="flex flex-col items-center text-center mb-10 relative">
                                <button 
                                    onClick={togglePersona}
                                    className={`relative w-28 h-28 mb-8 flex items-center justify-center group cursor-pointer active:scale-95 transition-transform duration-300`}
                                >
                                    <div className={`absolute inset-0 rounded-[32px] bg-gradient-to-br opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-500 ${personaMode === 'hanisah' ? 'from-orange-500 to-pink-500' : 'from-cyan-500 to-blue-500'}`}></div>
                                    <div className={`relative w-full h-full rounded-[32px] flex items-center justify-center shadow-2xl border bg-white/50 dark:bg-white/5 backdrop-blur-xl transition-all duration-500 group-hover:rotate-3 ${personaBorder} ${personaColor}`}>
                                        {personaMode === 'hanisah' ? <Flame size={48} strokeWidth={1.5} /> : <Brain size={48} strokeWidth={1.5} />}
                                    </div>
                                </button>

                                <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter text-black dark:text-white mb-3 uppercase leading-none drop-shadow-sm select-none">
                                    {personaMode === 'hanisah' ? 'HANISAH' : 'STOIC'} <span className="text-transparent bg-clip-text bg-gradient-to-r from-neutral-400 to-neutral-600">OS</span>
                                </h2>
                                
                                <div className="flex items-center gap-3 px-4 py-1.5 rounded-full border border-black/5 dark:border-white/5 bg-white/50 dark:bg-white/5 backdrop-blur-sm mb-8">
                                    <span className={`w-1.5 h-1.5 rounded-full ${personaMode === 'hanisah' ? 'bg-orange-500' : 'bg-cyan-500'} animate-pulse shadow-[0_0_8px_currentColor]`}></span>
                                    <p className="text-[9px] tech-mono font-bold text-neutral-500 uppercase tracking-[0.25em]">
                                        {personaMode === 'hanisah' ? 'HEURISTIC_ENGINE_READY' : 'LOGIC_KERNEL_ACTIVE'}
                                    </p>
                                </div>

                                {/* HERO INPUT (Replaces Fixed Footer in Empty State) */}
                                <div className="w-full max-w-2xl px-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
                                    <ChatInput 
                                        input={input}
                                        setInput={setInput}
                                        isLoading={isLoading}
                                        onSubmit={sendMessage}
                                        onNewChat={() => handleNewChat(personaMode)}
                                        onFocusChange={() => {}}
                                        aiName={personaMode.toUpperCase()}
                                        isVaultSynced={isVaultSynced}
                                        onToggleVaultSync={handleVaultToggle}
                                        personaMode={personaMode}
                                        isVaultEnabled={isVaultConfigEnabled}
                                        onTogglePersona={() => changePersona(personaMode === 'hanisah' ? 'stoic' : 'hanisah')}
                                        variant="hero"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-4xl mx-auto px-4">
                                <SuggestionCard 
                                    icon={<Palette />} 
                                    label="VISUAL_SYNTHESIS" 
                                    desc="Generate visuals with Imagen 3." 
                                    onClick={() => { debugService.logAction(UI_REGISTRY.CHAT_SUGGESTION_CARD, FN_REGISTRY.CHAT_SEND_MESSAGE, 'GEN_IMG'); setInput("Generate a futuristic cyberpunk city with neon lights."); }} 
                                    className="col-span-1"
                                    accent="text-pink-500"
                                />
                                <SuggestionCard 
                                    icon={<Code />} 
                                    label="CODE_AUDIT" 
                                    desc="Debug & optimize algorithms." 
                                    onClick={() => { debugService.logAction(UI_REGISTRY.CHAT_SUGGESTION_CARD, FN_REGISTRY.CHAT_SEND_MESSAGE, 'CODE_AUDIT'); setInput("Analyze this algorithm for complexity: [Paste Code]"); }} 
                                    className="col-span-1"
                                    accent="text-emerald-500"
                                />
                                <SuggestionCard 
                                    icon={<Layers />} 
                                    label="VAULT_SYNC" 
                                    desc="Connect knowledge nodes." 
                                    onClick={() => { debugService.logAction(UI_REGISTRY.CHAT_SUGGESTION_CARD, FN_REGISTRY.CHAT_SEND_MESSAGE, 'VAULT_SYNC'); setInput("Summarize my active vault entries."); }} 
                                    className="col-span-1"
                                    accent="text-blue-500"
                                />
                                <SuggestionCard 
                                    icon={<GraduationCap />} 
                                    label="STOIC_AUDIT" 
                                    desc="Analyze via Marcus Aurelius." 
                                    onClick={() => { debugService.logAction(UI_REGISTRY.CHAT_SUGGESTION_CARD, FN_REGISTRY.CHAT_SEND_MESSAGE, 'STOIC_AUDIT'); setInput("Help me approach this problem stoically."); }} 
                                    className="col-span-1"
                                    accent="text-amber-500"
                                />
                            </div>
                        </div>
                    ) : (
                        <ChatWindow 
                            messages={activeThread?.messages || []}
                            personaMode={personaMode}
                            isLoading={isLoading}
                            messagesEndRef={messagesEndRef}
                        />
                    )}
                </div>

                {/* 3. INPUT CAPSULE (FIXED FOOTER - Only visible when NOT in empty state) */}
                {!showEmptyState && (
                    <div className={`
                        fixed bottom-6 left-4 right-4 md:left-[80px] z-[100] 
                        pointer-events-none transition-all duration-500 ease-out
                        flex justify-center
                        ${isMobileNavVisible ? 'mb-16 md:mb-0' : 'mb-2'}
                        animate-slide-up
                    `}>
                        <div className="w-full max-w-[1000px] pointer-events-auto relative">
                            {showScrollBtn && (
                                <button 
                                    onClick={() => scrollToBottom()}
                                    className="absolute -top-16 right-0 z-20 w-10 h-10 rounded-full bg-white dark:bg-[#0a0a0b] shadow-xl border border-black/10 dark:border-white/10 flex items-center justify-center text-accent hover:scale-110 active:scale-95 transition-all animate-bounce"
                                >
                                    <ArrowDown size={18} strokeWidth={2.5} />
                                </button>
                            )}

                            <ChatInput 
                                input={input}
                                setInput={setInput}
                                isLoading={isLoading}
                                onSubmit={sendMessage}
                                onNewChat={() => handleNewChat(personaMode)}
                                onFocusChange={() => {}}
                                aiName={personaMode.toUpperCase()}
                                isVaultSynced={isVaultSynced}
                                onToggleVaultSync={handleVaultToggle}
                                personaMode={personaMode}
                                isVaultEnabled={isVaultConfigEnabled}
                                onTogglePersona={() => changePersona(personaMode === 'hanisah' ? 'stoic' : 'hanisah')}
                                variant="standard"
                            />
                        </div>
                    </div>
                )}

            </div>

            <ModelPicker 
                isOpen={showModelPicker} 
                onClose={() => setShowModelPicker(false)}
                activeModelId={activeModel?.id || ''}
                onSelectModel={(id) => {
                    debugService.logAction(UI_REGISTRY.CHAT_BTN_MODEL_PICKER, FN_REGISTRY.CHAT_SELECT_MODEL, id);
                    setGlobalModelId(id);
                    if (activeThreadId) {
                        setThreads(prev => prev.map(t => t.id === activeThreadId ? { ...t, model_id: id } : t));
                    }
                    setShowModelPicker(false);
                }}
            />

            <ChatHistory 
                isOpen={showHistoryDrawer}
                onClose={() => setShowHistoryDrawer(false)}
                threads={threads}
                activeThreadId={activeThreadId}
                onSelectThread={setActiveThreadId}
                onDeleteThread={(id) => {
                    setThreads(prev => prev.filter(t => t.id !== id));
                    if (activeThreadId === id) setActiveThreadId(null);
                }}
                onRenameThread={renameThread}
                onTogglePin={togglePinThread}
                onNewChat={() => handleNewChat(personaMode)}
            />

            <NeuralLinkOverlay 
                isOpen={isLiveMode}
                status={liveStatus}
                personaMode={personaMode}
                transcriptHistory={transcriptHistory}
                interimTranscript={interimTranscript}
                onTerminate={handleLiveToggle}
                analyser={analyser}
            />
        </div>
    );
};

export default AIChatView;
