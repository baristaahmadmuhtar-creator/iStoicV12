
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { type Note, type ChatThread } from '../../types';
import useLocalStorage from '../../hooks/useLocalStorage';
import { 
  Radio, ChevronDown, History, Sparkles, Zap, 
  Flame, Brain, Activity, Fingerprint, GripHorizontal,
  Volume2, VolumeX, AlertTriangle
} from 'lucide-react';
import Markdown from 'react-markdown';

// Hooks & Logic
import { useNeuralLinkSession } from './hooks/useNeuralLinkSession';
import { ChatHistory } from './components/ChatHistory';
import { ModelPicker } from './components/ModelPicker';
import { NeuralLinkOverlay } from './components/NeuralLinkOverlay';
import { ChatInput } from './components/ChatInput'; // Import ChatInput
import { VaultPinModal } from '../../components/VaultPinModal';
import { useNavigationIntelligence } from '../../hooks/useNavigationIntelligence';
import { useAIProvider } from '../../hooks/useAIProvider'; // New Hook

interface AIChatViewProps {
    chatLogic: any;
}

const AIChatView: React.FC<AIChatViewProps> = ({ chatLogic }) => {
    const [notes, setNotes] = useLocalStorage<Note[]>('notes', []);
    const [showModelPicker, setShowModelPicker] = useState(false);
    const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false); 
    
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
        isVaultSynced,
        setIsVaultSynced,
        isVaultConfigEnabled, // Destructure new prop
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
            // If user is within 150px of bottom, enable auto-scroll
            isAutoScrolling.current = distanceToBottom < 150;
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
            });
        }
    }, [activeThreadId]);

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
            <div className="flex-1 flex flex-col relative z-10 w-full max-w-[1200px] mx-auto px-4 md:px-8 lg:px-12 pt-6 md:pt-10 pb-[180px]">
                
                {/* HEADER */}
                <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 border-b border-black/5 dark:border-white/5 pb-8 mb-8 animate-slide-up shrink-0">
                    <div className="space-y-5 w-full xl:w-auto">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-accent animate-ping"></div>
                            <span className="text-neutral-500 tech-mono text-[9px] font-black uppercase tracking-[0.4em]">NEURAL_UPLINK_v13.5</span>
                        </div>
                        <div className="flex flex-col md:flex-row md:items-baseline gap-4 md:gap-8">
                            <h2 className="text-5xl md:text-[5.5rem] heading-heavy text-black dark:text-white leading-[0.8] italic uppercase tracking-tighter">
                                {personaMode === 'melsa' ? 'MELSA' : 'STOIC'} <span className="text-accent">LINK</span>
                            </h2>
                            
                            {/* PERSONA TOGGLE */}
                            <div className="bg-zinc-100 dark:bg-white/5 backdrop-blur-xl p-1 rounded-[22px] flex items-center border border-black/5 dark:border-white/10 shadow-inner w-full md:w-auto">
                                <button 
                                    onClick={() => changePersona('stoic')} 
                                    className={`flex-1 md:flex-none px-6 py-3.5 rounded-[18px] text-[10px] font-black tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${personaMode === 'stoic' ? 'bg-white dark:bg-white/10 text-cyan-500 shadow-md scale-100' : 'text-neutral-500 opacity-60 hover:opacity-100'}`}
                                >
                                    <Brain size={14} /> STOIC
                                </button>
                                <button 
                                    onClick={() => changePersona('melsa')} 
                                    className={`flex-1 md:flex-none px-6 py-3.5 rounded-[18px] text-[10px] font-black tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${personaMode === 'melsa' ? 'bg-white dark:bg-white/10 text-orange-500 shadow-md scale-100' : 'text-neutral-500 opacity-60 hover:opacity-100'}`}
                                >
                                    <Flame size={14} /> MELSA
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ACTIONS TOOLBAR */}
                    <div className="flex flex-row items-center gap-3 w-full xl:w-auto overflow-x-auto no-scrollbar pb-1">
                        <button 
                            onClick={() => setShowModelPicker(true)}
                            className={`min-h-[48px] px-5 bg-white dark:bg-white/5 border rounded-2xl flex items-center gap-3 tech-mono text-[9px] font-black uppercase tracking-widest transition-all hover:border-accent/40 shrink-0 shadow-sm ${
                                providerStatus !== 'HEALTHY' ? 'border-amber-500/50 text-amber-500 bg-amber-500/5' : 'border-black/5 dark:border-white/10 text-neutral-500'
                            }`}
                        >
                            {providerStatus === 'HEALTHY' ? <Sparkles size={16} className="text-accent" /> : <AlertTriangle size={16} className="animate-pulse" />}
                            <span>{activeModel.name.toUpperCase()}</span>
                            <ChevronDown size={12} />
                        </button>

                        <button 
                            onClick={() => setIsAutoSpeak(!isAutoSpeak)} 
                            className={`min-h-[48px] min-w-[48px] rounded-2xl transition-all border flex items-center justify-center ${isAutoSpeak ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white dark:bg-white/5 border-black/5 dark:border-white/10 text-neutral-500'}`}
                            title="Auto Speak Reply"
                        >
                            {isAutoSpeak ? <Volume2 size={20}/> : <VolumeX size={20}/>}
                        </button>
                        
                        <button 
                            onClick={toggleLiveMode} 
                            className={`min-h-[48px] px-6 rounded-2xl transition-all border flex items-center gap-2 font-black uppercase text-[9px] tracking-[0.2em] shrink-0 ${isLiveMode ? 'bg-red-500 border-red-400 text-white animate-pulse' : 'bg-white dark:bg-white/5 border-black/5 dark:border-white/10 text-neutral-500'}`}
                        >
                            <Radio size={16}/> LIVE_LINK
                        </button>

                        <button 
                            onClick={() => setShowHistoryDrawer(true)} 
                            className="min-h-[48px] min-w-[48px] bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl flex items-center justify-center text-neutral-500 transition-all shadow-sm"
                        >
                            <History size={20}/>
                        </button>
                    </div>
                </header>

                {/* MESSAGES AREA */}
                <div className="flex-1 space-y-8 md:space-y-10">
                    {activeThread?.messages.map((msg: any) => {
                         const isUser = msg.role === 'user';
                         if (msg.role === 'model' && !msg.text && !isLoading) return null;
                         return (
                            <div key={msg.id} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up group`}>
                                <div className={`max-w-[95%] md:max-w-[85%] lg:max-w-[80%] flex gap-3 md:gap-5 ${isUser ? 'flex-row-reverse' : ''}`}>
                                    <div className={`shrink-0 w-8 h-8 md:w-12 md:h-12 rounded-2xl flex items-center justify-center border transition-all duration-500 ${
                                        isUser 
                                        ? 'bg-black dark:bg-white text-white dark:text-black border-black/10' 
                                        : (personaMode === 'melsa' ? 'bg-orange-500 text-white border-orange-400 shadow-lg shadow-orange-500/20' : 'bg-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-500/20')
                                    }`}>
                                        {isUser ? <Fingerprint size={18} /> : (personaMode === 'melsa' ? <Flame size={18} /> : <Brain size={18} />)}
                                    </div>
                                    <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
                                        <div className={`px-5 py-3.5 md:px-8 md:py-6 rounded-[24px] md:rounded-[32px] text-[15px] leading-relaxed relative shadow-sm ${
                                            isUser 
                                            ? 'bg-white dark:bg-white/5 text-black dark:text-white rounded-tr-none border border-black/5 dark:border-white/10' 
                                            : 'bg-zinc-50 dark:bg-[#0d0d0e] text-neutral-700 dark:text-neutral-200 rounded-tl-none border border-black/5 dark:border-white/5'
                                        }`}>
                                            <div className="prose dark:prose-invert prose-sm max-w-none break-words font-medium">
                                                <Markdown>{msg.text}</Markdown>
                                            </div>
                                        </div>
                                        {/* Status / Meta */}
                                        <span className="text-[9px] tech-mono font-bold text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest px-2">
                                            {isUser ? 'ENCRYPTED_USER_INPUT' : 'NEURAL_RESPONSE_GENERATED'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {isLoading && (
                        <div className="flex justify-start animate-pulse pl-12 md:pl-20">
                            <div className="flex gap-2 p-4 bg-zinc-50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5">
                                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} className="h-4" />
                </div>
            </div>

            {/* INPUT DOCK (FIXED POSITIONING) */}
            <div className={`
                fixed bottom-0 right-0 z-[400] 
                w-full md:pl-[80px] /* Crucial: Offset for Desktop Sidebar */
                transition-all duration-500 ease-[cubic-bezier(0.2,0,0,1)]
                ${isMobileNavVisible ? 'pb-[88px] md:pb-0' : 'pb-0'}
            `}>
                {/* Gradient Fade for seamless scroll */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-zinc-50 dark:from-black via-zinc-50/80 dark:via-black/80 to-transparent pointer-events-none"></div>

                {/* The Actual Dock Container */}
                <div className={`relative w-full max-w-[1000px] mx-auto px-4 md:px-8 pb-4 md:pb-8 transition-all duration-300 ${isInputFocused ? 'pb-2' : ''}`}>
                    <ChatInput 
                        input={input}
                        setInput={setInput}
                        isLoading={isLoading}
                        onSubmit={() => { sendMessage(); isAutoScrolling.current = true; }} // Ensure auto-scroll on manual submit
                        onNewChat={() => handleNewChat(personaMode)}
                        onFocusChange={() => {}} // Global nav hook handles focus detection
                        aiName={activeModel.name}
                        isVaultSynced={isVaultSynced}
                        onToggleVaultSync={handleVaultToggle}
                        personaMode={personaMode}
                        isVaultEnabled={isVaultConfigEnabled} // Pass the config check
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
            <ChatHistory isOpen={showHistoryDrawer} onClose={() => setShowHistoryDrawer(false)} threads={threads} activeThreadId={activeThreadId} onSelectThread={setActiveThreadId} onDeleteThread={(id) => { const upd = threads.filter((t: any) => t.id !== id); setThreads(upd); if (activeThreadId === id) setActiveThreadId(upd[0]?.id || null); }} onRenameThread={(id, title) => setThreads(threads.map((t:any) => t.id === id ? {...t, title, updated: new Date().toISOString()} : t))} onNewChat={() => handleNewChat(personaMode)} />
        </div>
    );
};

export default AIChatView;
