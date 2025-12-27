
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
        className="relative group bg-white/5 backdrop-blur-md border border-white/5 rounded-[24px] p-5 text-left transition-all duration-500 hover:bg-white/10 hover:border-accent/20 hover:shadow-2xl animate-slide-up flex flex-col justify-between h-full min-h-[150px]"
    >
        <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center transition-all group-hover:scale-110 group-hover:bg-accent/10 group-hover:text-accent border border-white/5">
            {React.cloneElement(icon, { size: 20, strokeWidth: 1.5 })}
        </div>
        <div className="mt-4 space-y-1">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 group-hover:text-accent transition-colors">{label}</h4>
            <p className="text-[11px] text-neutral-500 font-medium leading-relaxed line-clamp-2">{desc}</p>
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

            {/* FIXED HEADER HUD - HIGH Z-INDEX */}
            <div className="fixed top-0 left-0 right-0 z-[200] w-full px-4 pt-4 flex justify-center pointer-events-none">
                <div className={`pointer-events-auto backdrop-blur-3xl border rounded-[32px] p-1.5 flex items-center shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)] transition-all duration-700 ${personaMode === 'hanisah' ? 'border-orange-500/20 bg-orange-500/5' : 'border-cyan-500/20 bg-cyan-500/5'}`}>
                    
                    <button 
                        onClick={() => setShowModelPicker(true)} 
                        className="flex items-center gap-3 pl-4 pr-3 py-2.5 hover:bg-white/5 rounded-2xl transition-all active:scale-95 group border-r border-white/5 mr-1"
                    >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all duration-500 ${isHydraActive ? 'border-emerald-500/20 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'border-white/10 text-accent'}`}>
                            {isHydraActive ? <Infinity size={18} className="animate-pulse" /> : <Cpu size={18} />}
                        </div>
                        <div className="flex flex-col text-left">
                            <span className="text-[7px] font-black uppercase tracking-[0.2em] text-neutral-500 leading-none mb-1">ENGINE</span>
                            <span className="text-[10px] font-bold uppercase text-white truncate max-w-[90px] leading-none">{activeModel?.name?.split(' ')[0] || 'NEURAL'}</span>
                        </div>
                        <ChevronDown size={12} className="text-neutral-500 group-hover:text-white transition-colors ml-1" />
                    </button>

                    <div className="flex bg-black/20 p-1 rounded-2xl gap-1 border border-white/5">
                        <button 
                            onClick={() => personaMode !== 'hanisah' && handleNewChat('hanisah')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-500 ${personaMode === 'hanisah' ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20' : 'text-neutral-500 hover:text-neutral-300'}`}
                        >
                            <Flame size={14} className={personaMode === 'hanisah' ? 'animate-pulse' : ''} />
                            <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Synthesis</span>
                        </button>
                        <button 
                            onClick={() => personaMode !== 'stoic' && handleNewChat('stoic')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-500 ${personaMode === 'stoic' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-neutral-500 hover:text-neutral-300'}`}
                        >
                            <Brain size={14} className={personaMode === 'stoic' ? 'animate-pulse' : ''} />
                            <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Logic</span>
                        </button>
                    </div>
                    
                    <div className="h-6 w-[1px] bg-white/5 mx-3"></div>

                    <div className="flex items-center gap-1.5 pr-2">
                        <button onClick={() => setShowHistoryDrawer(true)} className="p-2.5 text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl transition-all active:scale-90" title="Neural History"><History size={18}/></button>
                        <button onClick={() => isLiveLinkEnabled && toggleLiveMode(personaMode, notes, (n:any) => {})} disabled={!isLiveLinkEnabled} className={`p-2.5 rounded-xl transition-all active:scale-90 ${!isLiveLinkEnabled ? 'opacity-20' : isLiveMode ? 'bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'text-neutral-400 hover:text-red-400 hover:bg-red-500/10'}`} title="Neural Link (Live)"><Radio size={18}/></button>
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-0 relative min-h-0 flex flex-col pt-24 md:pt-28 pb-32">
                {showEmptyState ? (
                    <div className="flex flex-col h-full items-center justify-center pb-20 space-y-12">
                        <div className="relative flex flex-col items-center">
                            <div className={`absolute inset-0 blur-[120px] rounded-full animate-pulse-slow transition-colors duration-1000 ${personaMode === 'hanisah' ? 'bg-orange-500/20' : 'bg-cyan-500/20'}`}></div>
                            <button 
                                onClick={() => handleNewChat(personaMode === 'hanisah' ? 'stoic' : 'hanisah')}
                                className="relative w-32 h-32 md:w-40 md:h-40 rounded-[48px] bg-white/5 border border-white/10 backdrop-blur-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-700 hover:border-accent/40 shadow-2xl group overflow-hidden"
                            >
                                <div className={`absolute inset-0 opacity-10 blur-xl animate-pulse ${personaMode === 'hanisah' ? 'bg-orange-500' : 'bg-cyan-500'}`}></div>
                                {personaMode === 'hanisah' ? <Flame size={64} className="text-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.5)] relative z-10" /> : <Brain size={64} className="text-cyan-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)] relative z-10" />}
                                <div className="absolute -bottom-4 px-4 py-1.5 bg-black/80 border border-white/10 rounded-full text-[9px] font-black tracking-widest text-white opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 uppercase">CORE_SYNC</div>
                            </button>
                            <h2 className="mt-8 text-5xl md:text-7xl font-black italic tracking-tighter text-white uppercase text-center leading-none">
                                {personaMode === 'hanisah' ? 'HANISAH' : 'STOIC'} <span className="text-neutral-600">PRO</span>
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full px-4">
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

            {/* FIXED FOOTER INPUT WITH GRADIENT MASK */}
            <div className={`fixed bottom-0 left-0 right-0 z-[150] flex flex-col items-center p-4 md:p-8 pointer-events-none transition-all duration-500 ${shouldShowNav && window.innerWidth < 768 ? 'mb-20' : 'mb-0'}`}>
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#020202] via-[#020202]/95 to-transparent pointer-events-none"></div>
                
                <div className="w-full max-w-4xl pointer-events-auto relative z-10">
                    {showScrollBtn && (
                        <button onClick={() => scrollToBottom()} className="absolute -top-16 right-4 p-3 bg-accent text-black rounded-full shadow-2xl animate-bounce border border-white/20 active:scale-90"><ArrowDown size={20}/></button>
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
