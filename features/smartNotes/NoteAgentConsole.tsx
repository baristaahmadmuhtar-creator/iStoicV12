import React, { useState, useEffect } from 'react';
import { X, BrainCircuit, Sparkles, ListTodo, Lightbulb, Library, ArrowRight, Check, Loader2 } from 'lucide-react';
import { type Note } from '../../types';
import { NOTE_AGENTS, type AgentType } from '../../services/noteAgentService';

interface NoteAgentConsoleProps {
    isOpen: boolean;
    onClose: () => void;
    notes: Note[];
    onApplyUpdates: (updates: Partial<Note>[]) => void;
    onAddTasks: (tasks: any[]) => void;
}

export const NoteAgentConsole: React.FC<NoteAgentConsoleProps> = ({ isOpen, onClose, notes, onApplyUpdates, onAddTasks }) => {
    // Mobile Navigation State ('MENU' | 'RESULT')
    const [mobileView, setMobileView] = useState<'MENU' | 'RESULT'>('MENU');
    const [result, setResult] = useState<any>(null);
    const [activeAgent, setActiveAgent] = useState<AgentType | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Reset state when opened & Manage Navigation Visibility
    useEffect(() => {
        if (isOpen) {
            setMobileView('MENU');
            setResult(null);
            setActiveAgent(null);
            // Hide Sidebar/MobileNav via Navigation Intelligence
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const runAgent = async (type: AgentType) => {
        setIsLoading(true);
        setActiveAgent(type);
        setMobileView('RESULT');
        setResult(null);
        
        try {
            if (type === 'ORGANIZER') {
                const res = await NOTE_AGENTS.runOrganizer(notes, 'hanisah'); // Defaulting persona for now
                setResult(res);
            } else if (type === 'INSIGHT') {
                const res = await NOTE_AGENTS.runInsight(notes);
                setResult(res);
            } else if (type === 'TASKS') {
                const res = await NOTE_AGENTS.runActionExtractor(notes);
                setResult(res);
            }
        } catch (e) {
            console.error(e);
            setResult({ error: "Agent execution failed." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleApply = () => {
        if (!result) return;
        if (activeAgent === 'ORGANIZER') {
            onApplyUpdates(result);
            onClose();
        } else if (activeAgent === 'TASKS') {
            onAddTasks(result);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center p-0 md:p-6 bg-black/80 backdrop-blur-xl animate-fade-in">
            <div className="w-full h-full md:max-w-5xl md:h-[650px] bg-white dark:bg-[#0a0a0b] rounded-none md:rounded-[40px] border-0 md:border border-white/10 shadow-2xl overflow-hidden flex flex-col md:flex-row relative">
                
                {/* CLOSE BTN */}
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-neutral-500 hover:text-black dark:hover:text-white transition-all"
                >
                    <X size={20} />
                </button>

                {/* LEFT: AGENT MENU */}
                <div className={`
                    w-full md:w-[350px] flex flex-col bg-zinc-50 dark:bg-[#050505] border-r border-black/5 dark:border-white/5
                    ${mobileView === 'MENU' ? 'flex' : 'hidden md:flex'}
                `}>
                    <div className="p-8 pb-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20 shadow-sm">
                                <BrainCircuit size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-black dark:text-white">NEURAL_AGENTS</h3>
                                <p className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest mt-0.5">AUTOMATED VAULT OPS</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        <AgentCard 
                            id="ORGANIZER" 
                            label="AUTO_LIBRARIAN" 
                            desc="Rename, tag, and archive notes intelligently." 
                            icon={<Library size={18}/>} 
                            color="text-blue-500 bg-blue-500/10 border-blue-500/20"
                            onClick={() => runAgent('ORGANIZER')}
                            isActive={activeAgent === 'ORGANIZER'}
                        />
                        <AgentCard 
                            id="INSIGHT" 
                            label="PATTERN_RECOGNITION" 
                            desc="Discover hidden themes and connections." 
                            icon={<Lightbulb size={18}/>} 
                            color="text-amber-500 bg-amber-500/10 border-amber-500/20"
                            onClick={() => runAgent('INSIGHT')}
                            isActive={activeAgent === 'INSIGHT'}
                        />
                        <AgentCard 
                            id="TASKS" 
                            label="ACTION_EXTRACTOR" 
                            desc="Convert note content into actionable tasks." 
                            icon={<ListTodo size={18}/>} 
                            color="text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                            onClick={() => runAgent('TASKS')}
                            isActive={activeAgent === 'TASKS'}
                        />
                    </div>
                </div>

                {/* RIGHT: RESULT AREA */}
                <div className={`
                    flex-1 flex flex-col bg-white dark:bg-[#0a0a0b] relative
                    ${mobileView === 'RESULT' ? 'flex' : 'hidden md:flex'}
                `}>
                    {/* Mobile Back Header */}
                    <div className="md:hidden h-16 border-b border-black/5 dark:border-white/5 flex items-center px-4">
                        <button onClick={() => setMobileView('MENU')} className="flex items-center gap-2 text-neutral-500 text-xs font-bold uppercase tracking-widest">
                            <ArrowRight size={14} className="rotate-180" /> BACK_TO_MENU
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 animate-fade-in">
                            <div className="relative">
                                <div className="w-20 h-20 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin"></div>
                                <Sparkles size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-purple-500 animate-pulse" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-[0.2em] text-black dark:text-white mb-2">AGENT_WORKING</h4>
                                <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Processing {notes.length} Neural Nodes...</p>
                            </div>
                        </div>
                    ) : result ? (
                        <div className="flex-1 flex flex-col overflow-hidden animate-slide-up">
                            <div className="p-6 md:p-8 border-b border-black/5 dark:border-white/5 bg-zinc-50/50 dark:bg-white/[0.02]">
                                <h3 className="text-xl font-black italic uppercase tracking-tighter text-black dark:text-white">
                                    {activeAgent}_REPORT
                                </h3>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-8">
                                {activeAgent === 'ORGANIZER' && Array.isArray(result) && (
                                    <div className="space-y-4">
                                        <p className="text-xs font-medium text-neutral-500 mb-4">{result.length} updates proposed.</p>
                                        {result.map((update: any, i: number) => (
                                            <div key={i} className="p-4 rounded-xl border border-black/5 dark:border-white/5 bg-white dark:bg-white/5 flex items-start gap-4">
                                                <div className="mt-1 w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/20">
                                                    <Check size={12} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[10px] font-mono text-neutral-400">ID: {update.id.slice(0,6)}</span>
                                                        <ArrowRight size={10} className="text-neutral-600" />
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-500">{update.title}</span>
                                                    </div>
                                                    <div className="flex gap-1 mt-2">
                                                        {update.tags?.map((t: string) => <span key={t} className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-white/10 text-neutral-500 uppercase">{t}</span>)}
                                                        {update.is_archived && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500 uppercase border border-orange-500/20">ARCHIVE</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {activeAgent === 'INSIGHT' && typeof result === 'string' && (
                                    <div className="prose dark:prose-invert prose-sm max-w-none text-sm font-medium leading-relaxed bg-white dark:bg-white/5 p-6 rounded-2xl border border-black/5 dark:border-white/5">
                                        <pre className="whitespace-pre-wrap font-sans">{result}</pre>
                                    </div>
                                )}

                                {activeAgent === 'TASKS' && Array.isArray(result) && (
                                    <div className="space-y-3">
                                        {result.map((task: any, i: number) => (
                                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-black/5 dark:border-white/5 bg-emerald-500/5 border-emerald-500/20">
                                                <div className="w-5 h-5 rounded border border-emerald-500/30 flex items-center justify-center"></div>
                                                <span className="text-xs font-medium text-black dark:text-white">{task.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Actions Footer */}
                            {activeAgent !== 'INSIGHT' && (
                                <div className="p-6 border-t border-black/5 dark:border-white/5 bg-zinc-50 dark:bg-white/[0.02]">
                                    <button 
                                        onClick={handleApply}
                                        className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-xl font-black uppercase text-[10px] tracking-[0.25em] hover:scale-[1.01] active:scale-95 transition-all shadow-lg"
                                    >
                                        APPLY_CHANGES
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center opacity-30 gap-4 p-8 text-center">
                            <Sparkles size={48} strokeWidth={1} />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">SELECT_AGENT_PROTOCOL</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const AgentCard: React.FC<{ 
    id: string, label: string, desc: string, icon: React.ReactNode, color: string, onClick: () => void, isActive: boolean 
}> = ({ label, desc, icon, color, onClick, isActive }) => (
    <button 
        onClick={onClick}
        className={`w-full text-left p-4 rounded-2xl border transition-all group duration-300 ${
            isActive 
            ? 'bg-white dark:bg-white/10 border-black/10 dark:border-white/20 shadow-md transform scale-[1.02]' 
            : 'bg-transparent border-transparent hover:bg-white/60 dark:hover:bg-white/5 hover:border-black/5 dark:hover:border-white/5'
        }`}
    >
        <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${isActive ? color : 'bg-zinc-200 dark:bg-white/5 text-neutral-400 group-hover:text-black dark:group-hover:text-white'}`}>
                {icon}
            </div>
            <div>
                <h4 className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isActive ? 'text-black dark:text-white' : 'text-neutral-500 group-hover:text-black dark:group-hover:text-white'}`}>{label}</h4>
                <p className="text-[9px] font-medium text-neutral-400 leading-relaxed">{desc}</p>
            </div>
        </div>
    </button>
);