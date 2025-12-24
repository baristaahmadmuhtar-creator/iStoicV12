
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { type Note, type ChatThread } from '../../types';
import useLocalStorage from '../../hooks/useLocalStorage';
import { 
  Radio, ChevronDown, History, Sparkles, Zap, 
  Flame, Brain, Send, Plus, Database, 
  Mic, ArrowUp, X, Command, ExternalLink, Cpu, Activity, Fingerprint, GripHorizontal,
  DatabaseZap, Volume2, VolumeX, ShieldCheck, Lock, Unlock, MicOff
} from 'lucide-react';
import Markdown from 'react-markdown';

// Hooks & Logic
import { useNeuralLinkSession } from './hooks/useNeuralLinkSession';
import { ChatHistory } from './components/ChatHistory';
import { ModelPicker } from './components/ModelPicker';
import { NeuralLinkOverlay } from './components/NeuralLinkOverlay';
import { VaultPinModal } from '../../components/VaultPinModal';
import { useNavigationIntelligence } from '../../hooks/useNavigationIntelligence';

interface AIChatViewProps {
    chatLogic: any;
}

const AIChatView: React.FC<AIChatViewProps> = ({ chatLogic }) => {
    const [notes, setNotes] = useLocalStorage<Note[]>('notes', []);
    const [showModelPicker, setShowModelPicker] = useState(false);
    const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false); 
    const [isDictating, setIsDictating] = useState(false);
    const recognitionRef = useRef<any>(null);
    
    // Mobile Intelligence
    const { isInputFocused } = useNavigationIntelligence();
    
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
        isAutoSpeak,
        setIsAutoSpeak
    } = chatLogic;

    // Secure Vault Toggle with Anti-Spam
    const handleVaultToggle = useCallback(() => {
        if (isTransitioning) return;
        if (isVaultSynced) {
            setIsVaultSynced(false);
        } else {
            setShowPinModal(true);
        }
    }, [isVaultSynced, isTransitioning, setIsVaultSynced]);

    const {
        isLiveMode,
        liveStatus,
        liveTranscript,
        toggleLiveMode,
        analyser
    } = useNeuralLinkSession(personaMode, notes, setNotes);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll logic
    useEffect(() => {
        if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [activeThread?.messages.length, isLoading]);

    // Mobile-Friendly Textarea Auto-Resize (NO JITTER VERSION)
    useEffect(() => {
        if (textareaRef.current) {
            // Using 'auto' instead of explicit pixel reset prevents the layout jump on mobile keyboards
            textareaRef.current.style.height = 'auto'; 
            const nextHeight = Math.min(textareaRef.current.scrollHeight, 120);
            textareaRef.current.style.height = `${nextHeight}px`;
        }
    }, [input]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 768) {
            e.preventDefault();
            sendMessage();
        }
    };

    const changePersona = async (target: 'melsa' | 'stoic') => {
        if (personaMode === target || isTransitioning) return;
        setIsTransitioning(true);
        await handleNewChat(target);
        setTimeout(() => setIsTransitioning(false), 500);
    };

    const toggleDictation = () => {
        if (isDictating) {
            recognitionRef.current?.stop();
            setIsDictating(false);
            return;
        }
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Browser tidak mendukung Dictation API.");
            return;
        }
        const r = new SpeechRecognition();
        r.lang = 'id-ID';
        r.continuous = true;
        r.onstart = () => setIsDictating(true);
        r.onend = () => setIsDictating(false);
        r.onresult = (e: any) => {
            const text = e.results[e.results.length - 1][0].transcript;
            setInput(prev => prev + (prev ? ' ' : '') + text);
        };
        recognitionRef.current = r;
        r.start();
    };

    return (
        <div className="min-h-full flex flex-col p-4 md:p-12 lg:p-16 pb-0 relative selection:bg-accent/30 h-auto">
            <VaultPinModal 
                isOpen={showPinModal} 
                onClose={() => setShowPinModal(false)} 
                onSuccess={() => setIsVaultSynced(true)} 
            />

            <div className="max-w-[1400px] mx-auto w-full flex-1 flex flex-col relative z-10">
                {/* HEADER */}
                <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 border-b border-black/5 dark:border-white/5 pb-8 animate-slide-up shrink-0">
                    <div className="space-y-5 w-full xl:w-auto">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-accent animate-ping"></div>
                            <span className="text-neutral-500 tech-mono text-[9px] font-black uppercase tracking-[0.4em]">NEURAL_UPLINK_v13.5</span>
                        </div>
                        <div className="flex flex-col md:flex-row md:items-baseline gap-4 md:gap-8">
                            <h2 className="text-5xl md:text-[6.5rem] heading-heavy text-black dark:text-white leading-[0.8] italic uppercase tracking-tighter">
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
                            className="min-h-[48px] px-5 bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl flex items-center gap-3 tech-mono text-[9px] font-black uppercase tracking-widest text-neutral-500 transition-all hover:border-accent/40 shrink-0 shadow-sm"
                        >
                            <Sparkles size={16} className="text-accent" />
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

                {/* MESSAGES AREA - UPDATED: No internal overflow, allows body scroll */}
                <div className="flex-1 py-6 md:py-10 space-y-8 md:space-y-12 pb-[200px]">
                    {activeThread?.messages.map((msg: any) => {
                         const isUser = msg.role === 'user';
                         if (msg.role === 'model' && !msg.text && !isLoading) return null;
                         return (
                            <div key={msg.id} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up group`}>
                                <div className={`max-w-[92%] md:max-w-[80%] flex gap-3 md:gap-6 ${isUser ? 'flex-row-reverse' : ''}`}>
                                    <div className={`shrink-0 w-10 h-10 md:w-14 md:h-14 rounded-2xl flex items-center justify-center border transition-all duration-500 ${
                                        isUser 
                                        ? 'bg-black dark:bg-white text-white dark:text-black border-black/10' 
                                        : (personaMode === 'melsa' ? 'bg-orange-500 text-white border-orange-400 shadow-lg shadow-orange-500/20' : 'bg-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-500/20')
                                    }`}>
                                        {isUser ? <Fingerprint size={20} /> : (personaMode === 'melsa' ? <Flame size={20} /> : <Brain size={20} />)}
                                    </div>
                                    <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
                                        <div className={`px-5 py-4 md:px-8 md:py-7 rounded-[26px] md:rounded-[36px] text-[15px] leading-relaxed relative ${
                                            isUser 
                                            ? 'bg-white dark:bg-white/5 text-black dark:text-white rounded-tr-none border border-black/5 dark:border-white/10 shadow-sm' 
                                            : 'bg-zinc-50 dark:bg-[#0d0d0e] text-neutral-700 dark:text-neutral-200 rounded-tl-none border border-black/5 dark:border-white/5'
                                        }`}>
                                            <div className="prose dark:prose-invert prose-sm max-w-none break-words font-medium">
                                                <Markdown>{msg.text}</Markdown>
                                            </div>
                                        </div>
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
                    <div ref={messagesEndRef} className="h-10" />
                </div>
            </div>

            {/* INPUT DOCK (Mobile Optimized + Safe Area + Dynamic Position) */}
            <div className={`fixed left-0 right-0 z-50 px-4 pb-safe pointer-events-none flex justify-center transition-all duration-300 ease-out ${
                isInputFocused ? 'bottom-2' : 'bottom-[94px] md:bottom-[40px]'
            }`}>
                <div className="w-full md:w-[75%] max-w-[1000px] pointer-events-auto">
                    <div className="bg-white/95 dark:bg-[#121214]/95 backdrop-blur-3xl border border-black/10 dark:border-white/10 rounded-[2.5rem] p-2 pl-3 flex items-end gap-2 shadow-[0_25px_60px_rgba(0,0,0,0.4)] transition-all group/dock">
                        
                        {/* Actions Left */}
                        <div className="flex gap-1 pb-2 shrink-0">
                            <button onClick={() => handleNewChat(personaMode)} className="w-10 h-10 flex items-center justify-center rounded-full text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/5 transition-all hidden xs:flex" title="New Session">
                                <Plus size={20} />
                            </button>
                            
                            <button 
                                onClick={handleVaultToggle} 
                                className={`w-10 h-10 flex items-center justify-center rounded-full transition-all relative overflow-hidden ${isVaultSynced ? 'text-accent bg-accent/10' : 'text-neutral-400 hover:bg-white/5'}`} 
                                title="Vault Context"
                            >
                                {isVaultSynced ? <Unlock size={18} className="animate-in fade-in zoom-in duration-300" /> : <Lock size={18} className="animate-in fade-in zoom-in duration-300" />}
                            </button>
                        </div>

                        {/* Input Area (Flexible) */}
                        <div className="flex-1 py-3 min-w-0">
                            <textarea 
                                ref={textareaRef} 
                                value={input} 
                                onChange={(e) => setInput(e.target.value)} 
                                onKeyDown={handleKeyDown} 
                                placeholder={isDictating ? "Mendengarkan..." : (isVaultSynced ? "Vault connected. Ask about notes..." : "Enter command...")} 
                                className="w-full bg-transparent text-[16px] font-medium text-black dark:text-white focus:outline-none resize-none custom-scroll placeholder:text-neutral-500 leading-relaxed max-h-[120px]" 
                                rows={1} 
                            />
                        </div>

                        {/* Right Buttons: Mic (STT) & Send */}
                        <div className="flex gap-1 pb-1 pr-1 shrink-0">
                            <button 
                                onClick={toggleDictation}
                                className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${isDictating ? 'bg-red-500 text-white animate-pulse' : 'text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/5'}`}
                                title="Text Dictation"
                            >
                                {isDictating ? <Mic size={20} /> : <MicOff size={20} />}
                            </button>

                            <button 
                                onClick={() => sendMessage()} 
                                disabled={!input.trim() || isLoading} 
                                className={`h-[50px] w-[50px] rounded-[2rem] flex items-center justify-center transition-all ${input.trim() && !isLoading ? 'bg-accent text-on-accent shadow-[0_10px_35px_var(--accent-glow)]' : 'bg-black/5 dark:bg-white/5 text-neutral-500'}`}
                            >
                                {isLoading ? <GripHorizontal className="animate-spin" /> : <ArrowUp size={24} strokeWidth={3} />}
                            </button>
                        </div>
                    </div>
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
