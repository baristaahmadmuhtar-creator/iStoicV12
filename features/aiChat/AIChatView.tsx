
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { type Note, type ChatThread } from '../../types';
import useLocalStorage from '../../hooks/useLocalStorage';
import { 
  Radio, ChevronDown, History, Sparkles, Zap, 
  Flame, Brain, Activity, Fingerprint, GripHorizontal,
  Volume2, VolumeX, AlertTriangle, ArrowDown
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

interface AIChatViewProps {
    chatLogic: any;
}

const AIChatView: React.FC<AIChatViewProps> = ({ chatLogic }) => {
    const [notes, setNotes] = useLocalStorage<Note[]>('notes', []);
    const [showModelPicker, setShowModelPicker] = useState(false);
    const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false); 
    const [showScrollBtn, setShowScrollBtn] = useState(false);
    
    // Mobile Intelligence
    const { isInputFocused, shouldShowNav } = useNavigationIntelligence();
    const isMobileNavVisible = shouldShowNav && !isInputFocused;
    
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
        isVaultSynced,
        setIsVaultSynced,
        isVaultConfigEnabled, 
        isAutoSpeak,
        setIsAutoSpeak
    } = chatLogic;

    // Use centralized provider health hook
    const { status: providerStatus } = useAIProvider(activeModel?.provider || 'GEMINI');

    // Secure Vault Toggle with Anti-Spam
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
        liveTranscript,
        toggleLiveMode,
        analyser
    } = useNeuralLinkSession(personaMode, notes, setNotes);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isAutoScrolling = useRef(true);

    // Scroll Intelligence: Track if user is at bottom
    useEffect(() => {
        const container = document.getElementById('main-scroll-container');
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const distanceToBottom = scrollHeight - scrollTop - clientHeight;
            
            // Logic: if user scrolls UP (distance > 200), disable auto-scroll and show button
            if (distanceToBottom > 200) {
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

    // Auto-scroll logic for Streaming & New Messages
    useEffect(() => {
        if (!messagesEndRef.current) return;

        // Force scroll if we are actively "sticking" to bottom
        if (isAutoScrolling.current) {
            requestAnimationFrame(() => {
                messagesEndRef.current?.scrollIntoView({ 
                    behavior: isLoading ? 'auto' : 'smooth', 
                    block: 'end' 
                });
            });
        }
    }, [activeThread?.messages, isLoading]);

    // Force scroll to bottom on thread switch
    useEffect(() => {
        if (messagesEndRef.current) {
            requestAnimationFrame(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
                isAutoScrolling.current = true;
                setShowScrollBtn(false);
            });
        }
    }, [activeThreadId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        isAutoScrolling.current = true;
        // Button will hide via scroll listener
    };

    const changePersona = async (target: 'melsa' | 'stoic') => {
        if (personaMode === target || isTransitioning) return;
        setIsTransitioning(true);
        await handleNewChat(target);
        setTimeout(() => setIsTransitioning(false), 500);
    };

    return (
        <div className="min-h-full flex flex-col relative w-full">
            <VaultPinModal 
                isOpen={showPinModal} 
                onClose={() => setShowPinModal(false)} 
                onSuccess={() => setIsVaultSynced(true)} 
            />

            {/* MAIN CONTENT CONTAINER */}
            <div className="flex-1 flex flex-col relative z-10 w-full max-w-[1200px] mx-auto px-4 md:px-8 lg:px-12 pb-[180px]">
                
                {/* 
                    STICKY HEADER 
                    - Removed top margin/padding from container and moved to header 
                    - Added sticky, z-index, and backdrop-blur 
                    - Used negative margin on X-axis to span full width while keeping content aligned
                */}
                <header className="sticky top-0 z-40 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-black/5 dark:border-white/5 py-4 mb-6 bg-zinc-50/95 dark:bg-black/95 backdrop-blur-xl -mx-4 md:-mx-8 lg:-mx-12 px-4 md:px-8 lg:px-12 shadow-sm transition-all duration-300">
                    <div className="space-y-1 w-full xl:w-auto">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-ping"></div>
                            <span className="text-neutral-500 tech-mono text-[9px] font-black uppercase tracking-[0.4em]">NEURAL_UPLINK_v13.5</span>
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                            <h2 className="text-3xl md:text-4xl heading-heavy text-black dark:text-white leading-[0.9] italic uppercase tracking-tighter hidden md:block">
                                {personaMode === 'melsa' ? 'MELSA' : 'STOIC'} <span className="text-accent">LINK</span>
                            </h2>
                            
                            {/* PERSONA TOGGLE - Compact on Scroll */}
                            <div className="bg-zinc-100 dark:bg-white/5 backdrop-blur-xl p-1 rounded-[14px] flex items-center border border-black/5 dark:border-white/10 shadow-inner w-full md:w-auto">
                                <button 
                                    onClick={() => changePersona('stoic')} 
                                    className={`flex-1 md:flex-none px-4 py-2 rounded-[10px] text-[9px] font-black tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${personaMode === 'stoic' ? 'bg-white dark:bg-white/10 text-cyan-500 shadow-sm scale-100' : 'text-neutral-500 opacity-60 hover:opacity-100'}`}
                                >
                                    <Brain size={12} /> STOIC
                                </button>
                                <button 
                                    onClick={() => changePersona('melsa')} 
                                    className={`flex-1 md:flex-none px-4 py-2 rounded-[10px] text-[9px] font-black tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${personaMode === 'melsa' ? 'bg-white dark:bg-white/10 text-orange-500 shadow-sm scale-100' : 'text-neutral-500 opacity-60 hover:opacity-100'}`}
                                >
                                    <Flame size={12} /> MELSA
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ACTIONS TOOLBAR */}
                    <div className="flex flex-row items-center gap-2 w-full xl:w-auto overflow-x-auto no-scrollbar pb-1 xl:pb-0">
                        <button 
                            onClick={() => setShowModelPicker(true)}
                            className={`min-h-[40px] px-4 bg-white dark:bg-white/5 border rounded-xl flex items-center gap-2 tech-mono text-[9px] font-black uppercase tracking-widest transition-all hover:border-accent/40 shrink-0 shadow-sm ${
                                providerStatus !== 'HEALTHY' ? 'border-amber-500/50 text-amber-500 bg-amber-500/5' : 'border-black/5 dark:border-white/10 text-neutral-500'
                            }`}
                        >
                            {providerStatus === 'HEALTHY' ? <Sparkles size={14} className="text-accent" /> : <AlertTriangle size={14} className="animate-pulse" />}
                            <span className="truncate max-w-[100px] md:max-w-none">{activeModel.name.toUpperCase()}</span>
                            <ChevronDown size={10} />
                        </button>

                        <button 
                            onClick={() => setIsAutoSpeak(!isAutoSpeak)} 
                            className={`min-h-[40px] min-w-[40px] rounded-xl transition-all border flex items-center justify-center ${isAutoSpeak ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white dark:bg-white/5 border-black/5 dark:border-white/10 text-neutral-500'}`}
                            title="Auto Speak Reply"
                        >
                            {isAutoSpeak ? <Volume2 size={16}/> : <VolumeX size={16}/>}
                        </button>
                        
                        <button 
                            onClick={toggleLiveMode} 
                            className={`min-h-[40px] px-4 rounded-xl transition-all border flex items-center gap-2 font-black uppercase text-[9px] tracking-[0.2em] shrink-0 ${isLiveMode ? 'bg-red-500 border-red-400 text-white animate-pulse' : 'bg-white dark:bg-white/5 border-black/5 dark:border-white/10 text-neutral-500'}`}
                        >
                            <Radio size={16}/> <span className="hidden sm:inline">LIVE_LINK</span>
                        </button>

                        <button 
                            onClick={() => setShowHistoryDrawer(true)} 
                            className="min-h-[40px] min-w-[40px] bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl flex items-center justify-center text-neutral-500 transition-all shadow-sm"
                        >
                            <History size={18}/>
                        </button>
                    </div>
                </header>

                {/* MESSAGES AREA - USING CHAT WINDOW COMPONENT */}
                <div className="flex-1">
                    <ChatWindow 
                        messages={activeThread?.messages || []} 
                        personaMode={personaMode} 
                        isLoading={isLoading} 
                        messagesEndRef={messagesEndRef}
                    />
                </div>
            </div>

            {/* INPUT DOCK (FIXED POSITIONING) */}
            <div className={`
                fixed bottom-0 right-0 z-[400] 
                w-full md:pl-[80px] /* Crucial: Offset for Desktop Sidebar */
                transition-all duration-500 ease-[cubic-bezier(0.2,0,0,1)]
                ${isMobileNavVisible ? 'pb-[88px] md:pb-0' : 'pb-0'}
            `}>
                
                {/* Scroll Down Button (Floating) */}
                <div className={`absolute -top-16 left-1/2 -translate-x-1/2 transition-all duration-300 ${showScrollBtn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                    <button 
                        onClick={scrollToBottom}
                        className="w-10 h-10 rounded-full bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 shadow-xl flex items-center justify-center text-neutral-500 hover:text-accent hover:scale-110 transition-all"
                    >
                        <ArrowDown size={20} />
                    </button>
                </div>

                {/* Gradient Fade for seamless scroll */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-zinc-50 dark:from-black via-zinc-50/80 dark:via-black/80 to-transparent pointer-events-none"></div>

                {/* The Actual Dock Container */}
                <div className={`relative w-full max-w-[1000px] mx-auto px-4 md:px-8 pb-4 md:pb-8 transition-all duration-300 ${isInputFocused ? 'pb-2' : ''}`}>
                    <ChatInput 
                        input={input}
                        setInput={setInput}
                        isLoading={isLoading}
                        onSubmit={(e, attachment) => { 
                            sendMessage(e, attachment); 
                            isAutoScrolling.current = true; 
                        }} 
                        onNewChat={() => handleNewChat(personaMode)}
                        onFocusChange={() => {}} // Global nav hook handles focus detection
                        aiName={activeModel.name}
                        isVaultSynced={isVaultSynced}
                        onToggleVaultSync={handleVaultToggle}
                        personaMode={personaMode}
                        isVaultEnabled={isVaultConfigEnabled} 
                    />
                </div>
            </div>

            <ModelPicker 
                isOpen={showModelPicker} 
                onClose={() => setShowModelPicker(false)} 
                activeModelId={activeThread?.model_id || 'gemini-3-pro-preview'} 
                onSelectModel={(model_id) => {
                    setThreads(threads.map((t:any) => t.id === activeThreadId ? { ...t, model_id, updated: new Date().toISOString() } : t));
                    setShowModelPicker(false);
                }} 
            />

            <NeuralLinkOverlay isOpen={isLiveMode} status={liveStatus} personaMode={personaMode} transcript={liveTranscript} onTerminate={toggleLiveMode} analyser={analyser} />
            <ChatHistory 
                isOpen={showHistoryDrawer} 
                onClose={() => setShowHistoryDrawer(false)} 
                threads={threads} 
                activeThreadId={activeThreadId} 
                onSelectThread={setActiveThreadId} 
                onDeleteThread={(id) => { const upd = threads.filter((t: any) => t.id !== id); setThreads(upd); if (activeThreadId === id) setActiveThreadId(upd[0]?.id || null); }} 
                onRenameThread={(id, title) => setThreads(threads.map((t:any) => t.id === id ? {...t, title, updated: new Date().toISOString()} : t))} 
                onTogglePin={togglePinThread}
                onNewChat={() => handleNewChat(personaMode)} 
            />
        </div>
    );
};

export default AIChatView;
