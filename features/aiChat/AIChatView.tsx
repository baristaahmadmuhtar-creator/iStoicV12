
import React, { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';
import { type Note } from '../../types';
import useLocalStorage from '../../hooks/useLocalStorage';
import { 
  Radio, ChevronDown, Sparkles, Zap, 
  Flame, Brain, Activity, Fingerprint, Layers, Command,
  ArrowRight, Search, Palette, Code, GraduationCap, Lightbulb, Music,
  History, Settings2, LayoutTemplate, ArrowDown
} from 'lucide-react';

// Hooks & Logic
import { useNeuralLinkSession } from './hooks/useNeuralLinkSession';
import { ChatHistory } from './components/ChatHistory';
import { ModelPicker } from './components/ModelPicker';
import { NeuralLinkOverlay } from './components/NeuralLinkOverlay';
import { ChatInput } from './components/ChatInput'; 
import { ChatWindow } from './components/ChatWindow'; 
import { VaultPinModal } from '../../components/VaultPinModal';
import { useNavigationIntelligence } from '../../hooks/useNavigationIntelligence';
import { useAIProvider } from '../../hooks/useAIProvider'; 
// STRICT REGISTRY
import { UI_REGISTRY, FN_REGISTRY } from '../../constants/registry';
import { debugService } from '../../services/debugService';

interface AIChatViewProps {
    chatLogic: any;
}

// BENTO GRID CARD COMPONENT - ANIMATED & RESPONSIVE
const SuggestionCard: React.FC<{ 
    icon: React.ReactNode, 
    label: string, 
    desc: string, 
    onClick: () => void, 
    className?: string, 
    delay: number,
    accent?: string 
}> = ({ icon, label, desc, onClick, className, delay, accent = "text-neutral-400 group-hover:text-accent" }) => (
    <button 
        onClick={onClick}
        style={{ animationDelay: `${delay}ms` }}
        className={`
            relative overflow-hidden group 
            bg-white dark:bg-[#0f0f11] 
            border border-black/5 dark:border-white/5 
            rounded-[24px] p-6 text-left 
            transition-all duration-500 ease-out
            hover:border-accent/40 hover:shadow-[0_10px_40px_-10px_rgba(var(--accent-rgb),0.1)] hover:-translate-y-1
            animate-slide-up flex flex-col justify-between h-full min-h-[140px]
            ${className}
        `}
    >
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 p-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-x-2 group-hover:translate-x-0">
            <ArrowRight size={16} className="text-accent" />
        </div>
        
        <div className="relative z-10 w-full">
            <div className="mb-4">
                <div className={`w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-white/5 flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${accent} group-hover:bg-accent/10 border border-black/5 dark:border-white/5`}>
                    {icon}
                </div>
            </div>
            <div>
                <h4 className="text-[11px] font-black uppercase tracking-widest text-black dark:text-white mb-2 group-hover:text-accent transition-colors">{label}</h4>
                <p className="text-[11px] text-neutral-500 font-medium leading-relaxed line-clamp-2 group-hover:text-neutral-400 transition-colors">{desc}</p>
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
        setIsAutoSpeak
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
            if (distanceToBottom > 150) {
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
                <header className="sticky top-6 z-40 mb-6 transition-all duration-300 ease-out flex justify-center">
                    <div className="bg-white/80 dark:bg-[#0f0f11]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-full p-2 pl-4 pr-2 shadow-[0_8px_32px_rgba(0,0,0,0.08)] flex items-center justify-between gap-6 ring-1 ring-white/20">
                        
                        {/* Model & Persona Info */}
                        <div className="flex items-center gap-3 cursor-pointer group" onClick={handleModelPickerOpen}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${personaMode === 'hanisah' ? 'bg-orange-500/10 text-orange-500' : 'bg-cyan-500/10 text-cyan-500'} border border-black/5 dark:border-white/5`}>
                                {personaMode === 'hanisah' ? <Flame size={14} fill="currentColor" /> : <Brain size={14} fill="currentColor" />}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[7px] font-black uppercase tracking-[0.2em] text-neutral-400 group-hover:text-accent transition-colors">
                                    {personaMode.toUpperCase()} // SYSTEM
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-black dark:text-white uppercase leading-none max-w-[120px] truncate tracking-wide">
                                        {activeModel?.name || 'GEMINI PRO'}
                                    </span>
                                    <ChevronDown size={10} className="text-neutral-400" />
                                </div>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="h-6 w-[1px] bg-black/10 dark:bg-white/10 hidden sm:block"></div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={handleHistoryOpen}
                                className="w-9 h-9 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-neutral-500 hover:text-black dark:hover:text-white transition-all flex items-center justify-center active:scale-95"
                                title="History Log"
                            >
                                <History size={16} strokeWidth={2} />
                            </button>

                            <button 
                                onClick={handleLiveToggle}
                                className={`w-9 h-9 rounded-full transition-all flex items-center justify-center active:scale-95 ${
                                    isLiveMode 
                                    ? 'bg-red-500 text-white shadow-lg animate-pulse' 
                                    : 'text-neutral-500 hover:text-red-500 hover:bg-red-500/10'
                                }`}
                                title="Initialize Neural Link"
                            >
                                <Radio size={16} strokeWidth={2} />
                            </button>
                        </div>
                    </div>
                </header>

                {/* 2. CHAT AREA */}
                <div className="flex-1 w-full relative min-h-0">
                    {showEmptyState ? (
                        <div className="flex flex-col h-full justify-center max-w-4xl mx-auto w-full pb-20 pt-4">
                            
                            {/* Hero Section */}
                            <div className="flex flex-col items-center text-center mb-16 animate-fade-in px-4 relative">
                                <div className={`relative w-28 h-28 mb-8 flex items-center justify-center group`}>
                                    <div className={`absolute inset-0 rounded-full bg-gradient-to-br opacity-20 blur-2xl group-hover:opacity-30 transition-opacity ${personaMode === 'hanisah' ? 'from-orange-500 to-pink-500' : 'from-cyan-500 to-blue-500'}`}></div>
                                    <div className={`relative w-28 h-28 rounded-[40px] flex items-center justify-center shadow-2xl border border-white/10 bg-gradient-to-br transition-transform duration-500 group-hover:scale-105 ${personaMode === 'hanisah' ? 'from-orange-500/10 to-pink-500/10 text-orange-500' : 'from-cyan-500/10 to-blue-500/10 text-cyan-500'}`}>
                                        {personaMode === 'hanisah' ? <Flame size={48} strokeWidth={1} /> : <Brain size={48} strokeWidth={1} />}
                                    </div>
                                    {/* Orbit Ring */}
                                    <div className="absolute inset-[-10px] rounded-full border border-dashed border-black/5 dark:border-white/5 animate-spin-slow pointer-events-none"></div>
                                </div>

                                <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter text-black dark:text-white mb-4 uppercase leading-none drop-shadow-sm">
                                    {personaMode === 'hanisah' ? 'HANISAH' : 'STOIC'} <span className="text-transparent bg-clip-text bg-gradient-to-r from-neutral-400 to-neutral-600">OS</span>
                                </h2>
                                <div className="flex items-center gap-3">
                                    <div className="h-[1px] w-8 bg-accent/50"></div>
                                    <p className="text-[10px] tech-mono font-bold text-accent uppercase tracking-[0.3em]">
                                        NEURAL INTERFACE READY
                                    </p>
                                    <div className="h-[1px] w-8 bg-accent/50"></div>
                                </div>
                            </div>

                            {/* Bento Grid Suggestions */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full px-2">
                                {personaMode === 'hanisah' ? (
                                    <>
                                        <SuggestionCard 
                                            icon={<Palette size={22} />} 
                                            label="GENERATE_VISUAL" 
                                            desc="Create high-fidelity images with Imagen 3." 
                                            onClick={() => handleSuggestionClick("Generate a futuristic cyberpunk city with neon lights, 8k resolution.", 'GEN_IMG')} 
                                            delay={100}
                                            className="col-span-1 sm:col-span-2 md:col-span-1"
                                            accent="text-pink-500"
                                        />
                                        <SuggestionCard 
                                            icon={<Code size={22} />} 
                                            label="CODE_AUDIT" 
                                            desc="Debug and optimize complex algorithms." 
                                            onClick={() => handleSuggestionClick("Review this code for performance bottlenecks and suggest optimizations.", 'CODE_AUDIT')} 
                                            delay={150}
                                            className="col-span-1 sm:col-span-2 md:col-span-2"
                                            accent="text-emerald-500"
                                        />
                                        <SuggestionCard 
                                            icon={<Layers size={22} />} 
                                            label="VAULT_SYNC" 
                                            desc="Analyze connected notes." 
                                            onClick={() => handleSuggestionClick("Analyze my recent notes about 'Project X' and summarize key insights.", 'VAULT_SYNC')} 
                                            delay={200}
                                            className="col-span-1 md:col-span-1"
                                            accent="text-blue-500"
                                        />
                                    </>
                                ) : (
                                    <>
                                        <SuggestionCard 
                                            icon={<GraduationCap size={22} />} 
                                            label="STOIC_AUDIT" 
                                            desc="Analyze a dilemma via Marcus Aurelius." 
                                            onClick={() => handleSuggestionClick("I'm feeling overwhelmed by work. How would a Stoic approach this?", 'STOIC_AUDIT')} 
                                            delay={100}
                                            className="col-span-1 sm:col-span-2 md:col-span-2"
                                            accent="text-amber-500"
                                        />
                                        <SuggestionCard 
                                            icon={<Lightbulb size={22} />} 
                                            label="LOGIC_BREAKDOWN" 
                                            desc="Deconstruct complex problems." 
                                            onClick={() => handleSuggestionClick("Help me deconstruct this problem using first principles thinking.", 'LOGIC_BREAKDOWN')} 
                                            delay={150}
                                            className="col-span-1"
                                            accent="text-cyan-500"
                                        />
                                        <SuggestionCard 
                                            icon={<Brain size={22} />} 
                                            label="BIAS_CHECK" 
                                            desc="Identify logical fallacies." 
                                            onClick={() => handleSuggestionClick("Identify potential biases in this argument: [Insert Text]", 'BIAS_CHECK')} 
                                            delay={200}
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
                                <ArrowDown size={20} strokeWidth={2.5} />
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
