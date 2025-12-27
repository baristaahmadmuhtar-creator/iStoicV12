
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { type Note } from '../../types';
import useLocalStorage from '../../hooks/useLocalStorage';
import { 
  Radio, ChevronDown, Flame, Brain, History, Infinity, ArrowDown, Sparkles as SparklesIcon, Activity, Code, Layers, GraduationCap, Cpu
} from 'lucide-react';

import { useNeuralLink } from '../../contexts/NeuralLinkContext';
import { ChatHistory } from './components/ChatHistory';
import { ModelPicker } from './components/ModelPicker';
import { NeuralLinkOverlay } from './components/NeuralLinkOverlay';
import { ChatInput } from './components/ChatInput'; 
import { ChatWindow } from './components/ChatWindow'; 
import { VaultPinModal } from '../../components/VaultPinModal';
import { useNavigationIntelligence } from '../../hooks/useNavigationIntelligence';
import { useFeatures } from '../../contexts/FeatureContext';

interface AIChatViewProps {
    chatLogic: any;
}

const SuggestionCard = ({ icon, label, desc, onClick, delay = 0 }: any) => (
    <button 
        onClick={onClick}
        style={{ animationDelay: `${delay}ms` }}
        className="relative group bg-[#0a0a0c] hover:bg-[#121214] border border-white/5 hover:border-accent/20 rounded-[28px] p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl animate-slide-up flex flex-col justify-between h-full min-h-[160px] overflow-hidden"
    >
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent/0 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
        
        <div className="relative z-10 w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center transition-all group-hover:scale-110 group-hover:bg-accent group-hover:text-black border border-white/5 group-hover:shadow-[0_0_20px_var(--accent-glow)] text-neutral-400">
            {React.cloneElement(icon, { size: 22, strokeWidth: 1.5 })}
        </div>
        <div className="relative z-10 mt-5 space-y-1.5">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-300 group-hover:text-white transition-colors">{label}</h4>
            <p className="text-[11px] text-neutral-500 font-medium leading-relaxed line-clamp-2 group-hover:text-neutral-400">{desc}</p>
        </div>
        
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
            <Activity size={14} className="text-accent" />
        </div>
    </button>
);

const AIChatView: React.FC<AIChatViewProps> = ({ chatLogic }) => {
    const [notes] = useLocalStorage<Note[]>('notes', []);
    const [showModelPicker, setShowModelPicker] = useState(false);
    const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);
    const [showScrollBtn, setShowScrollBtn] = useState(false);
    
    const { isFeatureEnabled } = useFeatures();
    const isLiveLinkEnabled = isFeatureEnabled('LIVE_LINK');
    const { shouldShowNav } = useNavigationIntelligence();
    
    const {
        threads, setThreads,
        activeThread, activeThreadId, setActiveThreadId,
        input, setInput,
        isLoading,
        activeModel,
        personaMode,
        handleNewChat,
        sendMessage,
        stopGeneration, 
        togglePinThread,
        renameThread,
        isVaultSynced,
        setIsVaultSynced,
        setIsLiveModeActive,
        setGlobalModelId,
    } = chatLogic;

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isAutoScrolling = useRef(true);

    const {
        isLiveMode,
        liveStatus,
        transcriptHistory,
        interimTranscript,
        isMinimized,
        activeTask,
        toggleLiveMode,
        setMinimized,
        terminateSession,
        analyser
    } = useNeuralLink();

    useEffect(() => {
        setIsLiveModeActive?.(isLiveMode);
    }, [isLiveMode, setIsLiveModeActive]);

    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
        isAutoScrolling.current = true;
        setShowScrollBtn(false);
    }, []);

    useEffect(() => {
        const container = document.getElementById('main-scroll-container');
        if (!container) return;
        const handleScroll = () => {
            const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
            setShowScrollBtn(distanceToBottom > 300);
            isAutoScrolling.current = distanceToBottom < 100;
        };
        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (isAutoScrolling.current) scrollToBottom(isLoading ? 'auto' : 'smooth');
    }, [activeThread?.messages, isLoading, scrollToBottom]);

    const handleUpdateMessage = useCallback((messageId: string, newText: string) => {
        setThreads((prev: any[]) => prev.map(t => {
            if (t.id === activeThreadId) {
                return { ...t, updated: new Date().toISOString(), messages: t.messages.map((m: any) => m.id === messageId ? { ...m, text: newText } : m) };
            }
            return t;
        }));
    }, [activeThreadId, setThreads]);

    const showEmptyState = !isLoading && (!activeThreadId || !activeThread || activeThread.messages.length <= 1);
    const isHydraActive = activeModel?.id === 'auto-best';

    return (
        <div className="min-h-full flex flex-col relative w-full bg-[#020202] animate-fade-in overflow-hidden">
            <VaultPinModal isOpen={showPinModal} onClose={() => setShowPinModal(false)} onSuccess={() => setIsVaultSynced(true)} />

            {/* FIXED HEADER HUD - PLATINUM DESIGN */}
            <div className="fixed top-0 left-0 right-0 z-[200] w-full px-4 pt-3 flex justify-center pointer-events-none">
                <div className={`pointer-events-auto backdrop-blur-2xl bg-black/60 border rounded-[28px] p-1.5 flex items-center shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] transition-all duration-700 ring-1 ${personaMode === 'hanisah' ? 'border-orange-500/20 ring-orange-500/10' : 'border-cyan-500/20 ring-cyan-500/10'}`}>
                    
                    {/* Model Selector */}
                    <button 
                        onClick={() => setShowModelPicker(true)} 
                        className="flex items-center gap-3 pl-3 pr-4 py-2 hover:bg-white/5 rounded-[20px] transition-all active:scale-95 group border-r border-white/5 mr-1"
                    >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all duration-500 ${isHydraActive ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-white/5 border-white/10 text-accent'}`}>
                            {isHydraActive ? <Infinity size={16} className="animate-pulse" /> : <Cpu size={16} />}
                        </div>
                        <div className="flex flex-col text-left">
                            <span className="text-[7px] font-black uppercase tracking-[0.2em] text-neutral-500 leading-none mb-0.5">ENGINE</span>
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] font-bold uppercase text-white truncate max-w-[80px] leading-none">{activeModel?.name?.split(' ')[0] || 'NEURAL'}</span>
                                <ChevronDown size={10} className="text-neutral-600 group-hover:text-white transition-colors" />
                            </div>
                        </div>
                    </button>

                    {/* Persona Toggle */}
                    <div className="flex bg-black/40 p-1 rounded-[20px] gap-1 border border-white/5 mx-1">
                        <button 
                            onClick={() => personaMode !== 'hanisah' && handleNewChat('hanisah')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl transition-all duration-500 active:scale-95 ${personaMode === 'hanisah' ? 'bg-orange-500 text-black shadow-[0_0_20px_rgba(249,115,22,0.3)]' : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'}`}
                        >
                            <Flame size={14} className={personaMode === 'hanisah' ? 'animate-pulse' : ''} fill={personaMode === 'hanisah' ? "currentColor" : "none"} />
                            <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Syn</span>
                        </button>
                        <button 
                            onClick={() => personaMode !== 'stoic' && handleNewChat('stoic')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl transition-all duration-500 active:scale-95 ${personaMode === 'stoic' ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.3)]' : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'}`}
                        >
                            <Brain size={14} className={personaMode === 'stoic' ? 'animate-pulse' : ''} />
                            <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Log</span>
                        </button>
                    </div>
                    
                    <div className="h-6 w-[1px] bg-white/5 mx-2"></div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 pr-1">
                        <button onClick={() => setShowHistoryDrawer(true)} className="p-2.5 text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl transition-all active:scale-90" title="Neural History"><History size={18}/></button>
                        <button onClick={() => isLiveLinkEnabled && toggleLiveMode(personaMode, notes, (n:any) => {})} disabled={!isLiveLinkEnabled} className={`p-2.5 rounded-xl transition-all active:scale-90 ${!isLiveLinkEnabled ? 'opacity-20' : isLiveMode ? 'bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'text-neutral-400 hover:text-red-400 hover:bg-red-500/10'}`} title="Neural Link (Live)"><Radio size={18}/></button>
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-0 relative min-h-0 flex flex-col pt-24 md:pt-28 pb-36">
                {showEmptyState ? (
                    <div className="flex flex-col h-full items-center justify-center pb-10 space-y-12 animate-fade-in">
                        <div className="relative flex flex-col items-center">
                            {/* Ambient Glow */}
                            <div className={`absolute inset-0 blur-[100px] rounded-full animate-pulse-slow transition-colors duration-1000 ${personaMode === 'hanisah' ? 'bg-orange-500/15' : 'bg-cyan-500/15'}`}></div>
                            
                            <button 
                                onClick={() => handleNewChat(personaMode === 'hanisah' ? 'stoic' : 'hanisah')}
                                className="relative w-32 h-32 md:w-36 md:h-36 rounded-[40px] bg-gradient-to-b from-white/5 to-transparent border border-white/10 backdrop-blur-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-700 hover:border-accent/40 shadow-2xl group overflow-hidden"
                            >
                                <div className={`absolute inset-0 opacity-20 blur-2xl animate-pulse ${personaMode === 'hanisah' ? 'bg-orange-500' : 'bg-cyan-500'}`}></div>
                                {personaMode === 'hanisah' ? <Flame size={64} className="text-orange-500 drop-shadow-[0_0_25px_rgba(249,115,22,0.6)] relative z-10" strokeWidth={1} /> : <Brain size={64} className="text-cyan-500 drop-shadow-[0_0_25px_rgba(6,182,212,0.6)] relative z-10" strokeWidth={1} />}
                                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent"></div>
                                <div className="absolute bottom-4 text-[8px] font-black tracking-[0.3em] text-white/50 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 uppercase">
                                    SWITCH_CORE
                                </div>
                            </button>
                            <h2 className="mt-8 text-5xl md:text-7xl font-black italic tracking-tighter text-white uppercase text-center leading-none drop-shadow-2xl">
                                {personaMode === 'hanisah' ? 'HANISAH' : 'STOIC'} <span className="text-neutral-700 text-4xl align-top">OS</span>
                            </h2>
                            <p className="mt-3 text-xs tech-mono uppercase tracking-[0.4em] text-neutral-500">
                                {personaMode === 'hanisah' ? 'Heuristic Synthesis Matrix' : 'Logical Reasoning Kernel'}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full px-4 max-w-4xl">
                            <SuggestionCard icon={<SparklesIcon />} label="SYNTHESIS" desc="Generate ultra-HD visuals." onClick={() => setInput("Visualize a neon stoic temple.")} delay={100} />
                            <SuggestionCard icon={<Code />} label="ALGORITHMS" desc="Debug complex logic streams." onClick={() => setInput("Optimize this function for speed.")} delay={200} />
                            <SuggestionCard icon={<Layers />} label="VAULT" desc="Sync with your brain archive." onClick={() => setInput("Summarize my recent vault entries.")} delay={300} />
                            <SuggestionCard icon={<GraduationCap />} label="STOA" desc="Logic-driven mentorship." onClick={() => setInput("Analyze my cognitive process.")} delay={400} />
                        </div>
                    </div>
                ) : (
                    <ChatWindow messages={activeThread?.messages || []} personaMode={personaMode} isLoading={isLoading} messagesEndRef={messagesEndRef} onUpdateMessage={handleUpdateMessage} />
                )}
            </div>

            {/* FIXED FOOTER INPUT */}
            <div className={`fixed bottom-0 left-0 right-0 z-[150] flex flex-col items-center p-4 md:p-6 pointer-events-none transition-all duration-500 ${shouldShowNav && window.innerWidth < 768 ? 'mb-20' : 'mb-0'}`}>
                <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#020202] via-[#020202]/95 to-transparent pointer-events-none"></div>
                
                <div className="w-full max-w-4xl pointer-events-auto relative z-10">
                    {showScrollBtn && (
                        <button onClick={() => scrollToBottom()} className="absolute -top-16 right-4 p-3 bg-white/10 hover:bg-accent hover:text-black text-white rounded-full shadow-2xl animate-bounce border border-white/20 active:scale-90 transition-colors backdrop-blur-md"><ArrowDown size={20}/></button>
                    )}
                    <ChatInput 
                        input={input} setInput={setInput} isLoading={isLoading} onSubmit={sendMessage} onStop={stopGeneration} onNewChat={() => handleNewChat(personaMode)}
                        aiName={personaMode.toUpperCase()} isVaultSynced={isVaultSynced} onToggleVaultSync={() => isVaultSynced ? setIsVaultSynced(false) : setShowPinModal(true)}
                        personaMode={personaMode} onTogglePersona={() => handleNewChat(personaMode === 'hanisah' ? 'stoic' : 'hanisah')}
                        onFocusChange={() => {}}
                    />
                </div>
            </div>

            <ModelPicker isOpen={showModelPicker} onClose={() => setShowModelPicker(false)} activeModelId={activeModel?.id || ''} onSelectModel={id => { setGlobalModelId(id); setShowModelPicker(false); }} />
            <ChatHistory isOpen={showHistoryDrawer} onClose={() => setShowHistoryDrawer(false)} threads={threads} activeThreadId={activeThreadId} onSelectThread={setActiveThreadId} onDeleteThread={id => setThreads((prev:any[]) => prev.filter(t => t.id !== id))} onRenameThread={renameThread} onTogglePin={togglePinThread} onNewChat={() => handleNewChat(personaMode)} />
            
            <NeuralLinkOverlay 
                isOpen={isLiveMode && !isMinimized} 
                status={liveStatus} 
                activeTask={activeTask}
                personaMode={personaMode} 
                transcriptHistory={transcriptHistory} 
                interimTranscript={interimTranscript} 
                onTerminate={terminateSession} 
                onMinimize={() => setMinimized(true)}
                analyser={analyser} 
            />
        </div>
    );
};

export default AIChatView;
