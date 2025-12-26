
import React, { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';
import { type Note } from '../../types';
import useLocalStorage from '../../hooks/useLocalStorage';
import { 
  Radio, ChevronDown, Sparkles, Zap, 
  Flame, Brain, Activity, Fingerprint, Layers, Command,
  ArrowRight, Search, Palette, Code, GraduationCap, Lightbulb, Music,
  History, Settings2, LayoutTemplate, ArrowDown, CircuitBoard, Infinity
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
import { useFeatures } from '../../contexts/FeatureContext'; // Import Feature Hook

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
            bg-white/80 dark:bg-[#0f0f11]/80 backdrop-blur-md
            border border-black/5 dark:border-white/5 
            rounded-[24px] p-5 text-left 
            transition-all duration-300 ease-out
            hover:border-accent/30 hover:shadow-[0_10px_30px_-10px_rgba(var(--accent-rgb),0.15)] hover:-translate-y-1 active:scale-[0.98]
            flex flex-col justify-between h-full min-h-[120px] md:min-h-[140px]
            animate-slide-up
            ${className}
        `}
    >
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-x-2 group-hover:translate-x-0">
            <ArrowRight size={14} className="text-accent" />
        </div>
        
        <div className="relative z-10 w-full">
            <div className="mb-4">
                <div className={`w-10 h-10 rounded-xl bg-zinc-50 dark:bg-white/5 flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${accent} group-hover:bg-accent/10 border border-black/5 dark:border-white/5 shadow-sm`}>
                    {icon}
                </div>
            </div>
            <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white mb-1.5 group-hover:text-accent transition-colors">{label}</h4>
                <p className="text-[10px] text-neutral-500 font-medium leading-relaxed line-clamp-2 group-hover:text-neutral-400 transition-colors">{desc}</p>
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
    
    // Feature Flags
    const { isFeatureEnabled } = useFeatures();
    const isLiveLinkEnabled = isFeatureEnabled('LIVE_LINK');

    // Mobile Intelligence
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
        isAutoSpeak,
        setIsAutoSpeak,
        setIsLiveModeActive
    } = chatLogic;

    // Strict Handlers
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
            alert("FEATURE_DISABLED: Live Link disabled in System Mechanic to save resources.");
            return;
        }
        debugService.logAction(UI_REGISTRY.CHAT_BTN_LIVE_TOGGLE, FN_REGISTRY.CHAT_TOGGLE_LIVE, isLiveMode ? 'STOP' : 'START');
        toggleLiveMode();
    };

    const handleVaultToggle = useCallback(() => {
        if (!isVaultConfigEnabled || isTransitioning) return;
        if (isVaultSynced) {
            setIsVaultSynced(false);
        } else {
            setShowPinModal(true);
        }
    }, [isVaultSynced, isTransitioning, setIsVaultSynced, isVaultConfigEnabled]);

    const {
        isLiveMode,
        liveStatus,
        transcriptHistory,
        interimTranscript,
        toggleLiveMode,
        analyser
    } = useNeuralLinkSession(personaMode, notes, setNotes);

    // Sync Live Mode State to Global Logic
    useEffect(() => {
        if (setIsLiveModeActive) {
            setIsLiveModeActive(isLiveMode);
        }
    }, [isLiveMode, setIsLiveModeActive]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isAutoScrolling = useRef(true);

    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
            isAutoScrolling.current = true;
            setShowScrollBtn(false);
        }
    }, []);

    const handleScrollBtnClick = () => {
        debugService.logAction(UI_REGISTRY.CHAT_BTN_SCROLL_DOWN, FN_REGISTRY.CHAT_LOAD_HISTORY, 'SCROLL_BOTTOM');
        scrollToBottom();
    };

    const handleSuggestionClick = (prompt: string, type: string) => {
        debugService.logAction(UI_REGISTRY.CHAT_SUGGESTION_CARD, FN_REGISTRY.CHAT_SEND_MESSAGE, type);
        setInput(prompt);
    };

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

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (!messagesEndRef.current) return;
        if (isAutoScrolling.current) {
            requestAnimationFrame(() => {
                scrollToBottom(isLoading ? 'auto' : 'smooth');
            });
        }
    }, [activeThread?.messages, isLoading, scrollToBottom]);

    useLayoutEffect(() => {
        if (messagesEndRef.current && activeThread) {
            scrollToBottom('auto');
        }
    }, [activeThreadId, activeThread?.messages.length, scrollToBottom]);

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

    const showEmptyState = !activeThread || activeThread.messages.length <= 1;
    const isAutoBest = activeModel?.id === 'auto-best';

    return (
        <div className="min-h-full flex flex-col relative w-full bg-noise animate-fade-in">
            <VaultPinModal 
                isOpen={showPinModal} 
                onClose={() => setShowPinModal(false)} 
                onSuccess={() => setIsVaultSynced(true)} 
            />

            {/* MAIN CONTENT CONTAINER */}
            <div className={`flex-1 flex flex-col relative z-10 w-full max-w-[1000px] mx-auto px-4 md:px-6 transition-all duration-500 ${isMobileNavVisible ? 'pb-36' : 'pb-28'}`}>
                
                {/* 1. FLOATING HEADER */}
                <header className="sticky top-2 md:top-6 z-40 mb-2 transition-all duration-300 ease-out flex justify-center w-full">
                    <div className={`
                        backdrop-blur-xl border rounded-full p-1.5 pl-4 pr-1.5 flex items-center justify-between gap-6 shadow-lg ring-1 transition-all duration-500 max-w-[95%] sm:max-w-none
                        ${isAutoBest 
                            ? 'bg-black/80 dark:bg-white/10 border-emerald-500/30 ring-emerald-500/20 shadow-emerald-500/10' 
                            : 'bg-white/80 dark:bg-[#0f0f11]/80 border-black/5 dark:border-white/10 ring-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.08)]'
                        }
                    `}>
                        
                        {/* Model & Persona Info */}
                        <button 
                            className="flex items-center gap-3 cursor-pointer group py-1 hover:opacity-80 transition-opacity" 
                            onClick={handleModelPickerOpen}
                            title="Switch AI Model"
                        >
                            <div className={`
                                w-7 h-7 rounded-full flex items-center justify-center transition-colors border border-black/5 dark:border-white/5 shrink-0
                                ${isAutoBest 
                                    ? 'bg-gradient-to-br from-emerald-400 to-cyan-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                                    : personaMode === 'hanisah' ? 'bg-orange-500/10 text-orange-500' : 'bg-cyan-500/10 text-cyan-500'
                                }
                            `}>
                                {isAutoBest ? <Infinity size={14} /> : (personaMode === 'hanisah' ? <Flame size={12} fill="currentColor" /> : <Brain size={12} fill="currentColor" />)}
                            </div>
                            <div className="flex flex-col overflow-hidden text-left">
                                <span className={`text-[7px] font-black uppercase tracking-[0.2em] transition-colors truncate ${isAutoBest ? 'text-emerald-500' : 'text-neutral-400 group-hover:text-accent'}`}>
                                    {isAutoBest ? 'HYDRA_ENGINE' : `${personaMode.toUpperCase()} // SYSTEM`}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <span className={`text-[10px] font-bold uppercase leading-none max-w-[100px] sm:max-w-[120px] truncate tracking-wide ${isAutoBest ? 'text-white' : 'text-black dark:text-white'}`}>
                                        {activeModel?.name || 'GEMINI PRO'}
                                    </span>
                                    <ChevronDown size={10} className="text-neutral-400 shrink-0" />
                                </div>
                            </div>
                        </button>

                        {/* Divider */}
                        <div className="h-5 w-[1px] bg-black/10 dark:bg-white/10 hidden sm:block"></div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                            <button 
                                onClick={handleHistoryOpen}
                                className="w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-neutral-500 hover:text-black dark:hover:text-white transition-all flex items-center justify-center active:scale-95"
                                title="History Log"
                            >
                                <History size={14} strokeWidth={2} />
                            </button>

                            <button 
                                onClick={handleLiveToggle}
                                className={`w-8 h-8 rounded-full transition-all flex items-center justify-center active:scale-95 ${
                                    !isLiveLinkEnabled 
                                    ? 'opacity-30 cursor-not-allowed text-neutral-500' 
                                    : isLiveMode 
                                        ? 'bg-red-500 text-white shadow-lg animate-pulse' 
                                        : 'text-neutral-500 hover:text-red-500 hover:bg-red-500/10'
                                }`}
                                title={!isLiveLinkEnabled ? "Live Link Disabled" : "Initialize Neural Link"}
                                disabled={!isLiveLinkEnabled}
                            >
                                <Radio size={14} strokeWidth={2} />
                            </button>
                        </div>
                    </div>
                </header>

                {/* 2. CHAT AREA */}
                <div className="flex-1 w-full relative min-h-0 flex flex-col">
                    {showEmptyState ? (
                        <div className="flex flex-col h-full justify-center max-w-4xl mx-auto w-full pb-20 pt-8 animate-fade-in">
                            
                            {/* Dynamic Hero Section */}
                            <div className="flex flex-col items-center text-center mb-10 md:mb-16 relative">
                                {/* Ambient Glow */}
                                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] md:w-[350px] h-[250px] md:h-[350px] rounded-full blur-[100px] opacity-20 pointer-events-none transition-colors duration-700 ${personaMode === 'hanisah' ? 'bg-orange-500' : 'bg-cyan-500'}`}></div>

                                <div className={`relative w-20 h-20 md:w-28 md:h-28 mb-6 md:mb-8 flex items-center justify-center group cursor-pointer`} onClick={togglePersona}>
                                    <div className={`absolute inset-0 rounded-full bg-gradient-to-br opacity-10 blur-xl group-hover:opacity-25 transition-opacity duration-500 ${personaMode === 'hanisah' ? 'from-orange-500 to-pink-500' : 'from-cyan-500 to-blue-500'}`}></div>
                                    <div className={`relative w-20 h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center shadow-2xl border border-white/10 bg-white/5 backdrop-blur-md transition-all duration-500 group-hover:scale-105 group-hover:rotate-3 ${personaMode === 'hanisah' ? 'text-orange-500' : 'text-cyan-500'}`}>
                                        {personaMode === 'hanisah' ? <Flame size={40} strokeWidth={1} /> : <Brain size={40} strokeWidth={1} />}
                                    </div>
                                    {/* Orbit Ring */}
                                    <div className="absolute inset-[-8px] md:inset-[-12px] rounded-full border border-dashed border-black/5 dark:border-white/5 animate-spin-slow pointer-events-none opacity-50"></div>
                                </div>

                                <h2 className="text-4xl md:text-7xl font-black italic tracking-tighter text-black dark:text-white mb-4 uppercase leading-none drop-shadow-sm">
                                    {personaMode === 'hanisah' ? 'HANISAH' : 'STOIC'} <span className="text-transparent bg-clip-text bg-gradient-to-r from-neutral-400 to-neutral-600">OS</span>
                                </h2>
                                <div className="flex items-center gap-4">
                                    <div className="h-[1px] w-8 bg-black/10 dark:bg-white/10"></div>
                                    <p className="text-[9px] md:text-[10px] tech-mono font-bold text-neutral-500 uppercase tracking-[0.3em]">
                                        NEURAL INTERFACE READY
                                    </p>
                                    <div className="h-[1px] w-8 bg-black/10 dark:bg-white/10"></div>
                                </div>
                            </div>

                            {/* Refined Bento Grid Suggestions */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 w-full px-2">
                                {personaMode === 'hanisah' ? (
                                    <>
                                        <SuggestionCard 
                                            icon={<Palette size={20} />} 
                                            label="GENERATE_VISUAL" 
                                            desc="Create high-fidelity images with Imagen 3." 
                                            onClick={() => handleSuggestionClick("Generate a futuristic cyberpunk city with neon lights, 8k resolution.", 'GEN_IMG')} 
                                            className="col-span-1 sm:col-span-2 md:col-span-1"
                                            accent="text-pink-500"
                                        />
                                        <SuggestionCard 
                                            icon={<Code size={20} />} 
                                            label="CODE_AUDIT" 
                                            desc="Debug algorithms." 
                                            onClick={() => handleSuggestionClick("Review this code for performance bottlenecks and suggest optimizations.", 'CODE_AUDIT')} 
                                            className="col-span-1 sm:col-span-2 md:col-span-2"
                                            accent="text-emerald-500"
                                        />
                                        <SuggestionCard 
                                            icon={<Layers size={20} />} 
                                            label="VAULT_SYNC" 
                                            desc="Analyze notes." 
                                            onClick={() => handleSuggestionClick("Analyze my recent notes about 'Project X' and summarize key insights.", 'VAULT_SYNC')} 
                                            className="col-span-1 md:col-span-1"
                                            accent="text-blue-500"
                                        />
                                    </>
                                ) : (
                                    <>
                                        <SuggestionCard 
                                            icon={<GraduationCap size={20} />} 
                                            label="STOIC_AUDIT" 
                                            desc="Analyze a dilemma via Marcus Aurelius." 
                                            onClick={() => handleSuggestionClick("I'm feeling overwhelmed by work. How would a Stoic approach this?", 'STOIC_AUDIT')} 
                                            className="col-span-1 sm:col-span-2 md:col-span-2"
                                            accent="text-amber-500"
                                        />
                                        <SuggestionCard 
                                            icon={<Lightbulb size={20} />} 
                                            label="LOGIC_BREAKDOWN" 
                                            desc="First principles thinking." 
                                            onClick={() => handleSuggestionClick("Help me deconstruct this problem using first principles thinking.", 'LOGIC_BREAKDOWN')} 
                                            className="col-span-1"
                                            accent="text-cyan-500"
                                        />
                                        <SuggestionCard 
                                            icon={<Brain size={20} />} 
                                            label="BIAS_CHECK" 
                                            desc="Identify fallacies." 
                                            onClick={() => handleSuggestionClick("Identify potential biases in this argument: [Insert Text]", 'BIAS_CHECK')} 
                                            className="col-span-1"
                                            accent="text-purple-500"
                                        />
                                    </>
                                )}
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

                {/* 3. INPUT CAPSULE */}
                <div className={`
                    fixed bottom-6 left-4 right-4 md:left-[80px] z-[100] 
                    pointer-events-none transition-all duration-500 ease-out
                    flex justify-center
                    ${isMobileNavVisible ? 'mb-16 md:mb-0' : 'mb-2'}
                `}>
                    <div className="w-full max-w-[1000px] pointer-events-auto relative">
                        {/* Scroll To Bottom Button */}
                        {showScrollBtn && (
                            <button 
                                onClick={handleScrollBtnClick}
                                className="absolute -top-14 right-0 z-20 w-10 h-10 rounded-full bg-white dark:bg-[#0a0a0b] shadow-lg border border-black/10 dark:border-white/10 flex items-center justify-center text-accent hover:scale-110 active:scale-95 transition-all animate-bounce"
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
                        />
                    </div>
                </div>

            </div>

            {/* OVERLAYS */}
            <ModelPicker 
                isOpen={showModelPicker} 
                onClose={() => setShowModelPicker(false)}
                activeModelId={activeModel?.id || ''}
                onSelectModel={(id) => {
                    debugService.logAction(UI_REGISTRY.CHAT_BTN_MODEL_PICKER, FN_REGISTRY.CHAT_SELECT_MODEL, id);
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
