
import React, { useState, useEffect } from 'react';
import { 
    BrainCircuit, Sparkles, CheckCircle2, X, RefreshCw, 
    ArrowRight, ListTodo, Archive, Tag, Lightbulb, Play,
    ChevronLeft, GripHorizontal, Activity, Layers
} from 'lucide-react';
import { NOTE_AGENTS, type AgentType } from '../../services/noteAgentService';
import { type Note } from '../../types';

interface NoteAgentConsoleProps {
    isOpen: boolean;
    onClose: () => void;
    notes: Note[];
    onApplyUpdates: (updates: Partial<Note>[]) => void;
    onAddTasks: (tasks: any[]) => void;
}

export const NoteAgentConsole: React.FC<NoteAgentConsoleProps> = ({ 
    isOpen, onClose, notes, onApplyUpdates, onAddTasks 
}) => {
    const [activeAgent, setActiveAgent] = useState<AgentType | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<any>(null);
    
    // Mobile Navigation State ('MENU' | 'RESULT')
    // On Desktop, we show both side-by-side. On Mobile, we toggle.
    const [mobileView, setMobileView] = useState<'MENU' | 'RESULT'>('MENU');

    // Reset state when opened
    useEffect(() => {
        if (isOpen) {
            setMobileView('MENU');
            setResult(null);
            setActiveAgent(null);
        }
    }, [isOpen]);

    const runAgent = async (type: AgentType) => {
        setActiveAgent(type);
        setIsProcessing(true);
        setResult(null);
        setMobileView('RESULT'); // Switch view on mobile immediately

        try {
            if (type === 'ORGANIZER') {
                const updates = await NOTE_AGENTS.runOrganizer(notes, 'hanisah');
                setResult({ type: 'UPDATES', data: updates });
            } else if (type === 'INSIGHT') {
                const insight = await NOTE_AGENTS.runInsight(notes);
                setResult({ type: 'TEXT', data: insight });
            } else if (type === 'TASKS') {
                const tasks = await NOTE_AGENTS.runActionExtractor(notes);
                setResult({ type: 'TASKS', data: tasks });
            }
        } catch (e) {
            console.error(e);
            setResult({ type: 'TEXT', data: "Error executing neural protocol." });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleApply = () => {
        if (!result) return;
        if (result.type === 'UPDATES') {
            onApplyUpdates(result.data);
        } else if (result.type === 'TASKS') {
            onAddTasks(result.data);
        }
        onClose();
    };

    const handleBackToMenu = () => {
        setMobileView('MENU');
        // Optional: clear active agent if you want fresh state
        // setActiveAgent(null); 
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2200] flex items-end md:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in transition-all duration-300">
            {/* Main Container - Bottom Sheet on Mobile, Card on Desktop */}
            <div className={`
                w-full md:max-w-5xl bg-[#09090b] 
                rounded-t-[32px] md:rounded-[40px] 
                border border-white/10 shadow-2xl overflow-hidden 
                flex flex-col md:flex-row 
                h-[90vh] md:h-[650px] ring-1 ring-white/5
                transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                ${isOpen ? 'translate-y-0' : 'translate-y-full'}
            `}>
                
                {/* --- SIDEBAR / MENU (Mobile: Full Screen when 'MENU', Desktop: Left Col) --- */}
                <div className={`
                    w-full md:w-[380px] bg-zinc-900/50 border-r border-white/5 flex flex-col
                    ${mobileView === 'MENU' ? 'flex' : 'hidden md:flex'}
                `}>
                    {/* Header */}
                    <div className="p-6 md:p-8 border-b border-white/5 shrink-0 relative">
                        {/* Mobile Drag Handle */}
                        <div className="md:hidden absolute top-3 left-1/2 -translate-x-1/2 text-white/20">
                            <GripHorizontal size={24} />
                        </div>

                        <div className="flex items-center justify-between mt-2 md:mt-0">
                            <div className="flex items-center gap-3 text-accent">
                                <div className="p-2 bg-accent/10 rounded-xl border border-accent/20">
                                    <BrainCircuit size={20} />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white leading-none">NEURAL_AGENTS</h2>
                                    <p className="text-[9px] text-neutral-500 font-mono mt-1 tracking-widest">v13.5 COGNITIVE LAYER</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 -mr-2 md:hidden text-neutral-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                    
                    {/* Agent List */}
                    <div className="flex-1 p-4 md:p-6 space-y-3 overflow-y-auto custom-scroll">
                        <AgentButton 
                            title="AUTO_ORGANIZER" 
                            desc="Rename, Tag, & Archive based on context." 
                            icon={<Archive size={18} />} 
                            isActive={activeAgent === 'ORGANIZER'} 
                            onClick={() => runAgent('ORGANIZER')} 
                            color="text-blue-400"
                            bgColor="bg-blue-500/10"
                        />
                        <AgentButton 
                            title="INSIGHT_MINER" 
                            desc="Detect hidden patterns & productivity trends." 
                            icon={<Lightbulb size={18} />} 
                            isActive={activeAgent === 'INSIGHT'} 
                            onClick={() => runAgent('INSIGHT')} 
                            color="text-amber-400"
                            bgColor="bg-amber-500/10"
                        />
                        <AgentButton 
                            title="ACTION_EXTRACTOR" 
                            desc="Convert unstructured notes into tasks." 
                            icon={<ListTodo size={18} />} 
                            isActive={activeAgent === 'TASKS'} 
                            onClick={() => runAgent('TASKS')} 
                            color="text-emerald-400"
                            bgColor="bg-emerald-500/10"
                        />
                    </div>

                    <div className="p-6 md:hidden">
                        <button onClick={onClose} className="w-full py-4 rounded-xl border border-white/10 text-neutral-400 font-bold text-xs hover:bg-white/5 transition-all">
                            CLOSE CONSOLE
                        </button>
                    </div>
                </div>

                {/* --- MAIN / RESULT AREA (Mobile: Full Screen when 'RESULT', Desktop: Right Col) --- */}
                <div className={`
                    flex-1 flex-col bg-[#050505] relative
                    ${mobileView === 'RESULT' ? 'flex' : 'hidden md:flex'}
                `}>
                    {/* Mobile Header for Result View */}
                    <div className="md:hidden p-4 border-b border-white/10 flex items-center gap-3 bg-zinc-900/50">
                        <button onClick={handleBackToMenu} className="p-2 -ml-2 text-neutral-400 hover:text-white">
                            <ChevronLeft size={20} />
                        </button>
                        <span className="text-xs font-black uppercase tracking-widest text-white">
                            {activeAgent ? activeAgent : 'CONSOLE'}
                        </span>
                    </div>

                    {/* Desktop Close Button */}
                    <button onClick={onClose} className="hidden md:block absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full text-neutral-500 hover:text-white transition-all z-10">
                        <X size={20} />
                    </button>

                    <div className="flex-1 p-6 md:p-10 overflow-y-auto custom-scroll flex flex-col">
                        {!activeAgent ? (
                            <div className="m-auto text-center space-y-6 opacity-30">
                                <Layers size={80} strokeWidth={0.5} className="mx-auto text-white" />
                                <div className="space-y-2">
                                    <p className="text-sm font-black uppercase tracking-[0.3em] text-white">AWAITING_PROTOCOL</p>
                                    <p className="text-[10px] font-mono text-neutral-400">Select an agent from the left panel to begin.</p>
                                </div>
                            </div>
                        ) : isProcessing ? (
                            <div className="m-auto text-center space-y-8">
                                <div className="relative mx-auto w-24 h-24">
                                    <div className="absolute inset-0 rounded-full border-4 border-white/5"></div>
                                    <div className="absolute inset-0 rounded-full border-4 border-t-accent border-r-accent/50 border-b-transparent border-l-transparent animate-spin"></div>
                                    <div className="absolute inset-4 rounded-full bg-accent/5 animate-pulse"></div>
                                    <Activity className="absolute inset-0 m-auto text-accent animate-pulse" size={32} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-white animate-pulse">NEURAL_PROCESSING</p>
                                    <p className="text-[10px] font-mono text-accent">Analyzing encrypted vault data...</p>
                                </div>
                            </div>
                        ) : result ? (
                            <div className="space-y-8 animate-slide-up w-full max-w-3xl mx-auto">
                                <div className="flex items-center gap-4 pb-6 border-b border-white/10">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                                        <CheckCircle2 size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black uppercase tracking-widest text-white">ANALYSIS_COMPLETE</h3>
                                        <p className="text-[10px] text-neutral-500 font-mono">Review suggested changes below.</p>
                                    </div>
                                </div>

                                {result.type === 'UPDATES' && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">PROPOSED_MODIFICATIONS</p>
                                            <span className="text-[10px] font-mono text-accent bg-accent/10 px-2 py-1 rounded">{result.data.length} ITEMS</span>
                                        </div>
                                        <div className="grid gap-3">
                                            {result.data.map((u: any, i: number) => (
                                                <div key={i} className="p-4 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl border border-white/5 flex gap-4 items-start transition-colors">
                                                    <div className="text-[9px] font-mono text-neutral-600 pt-1 w-16 truncate">{u.id.slice(0,6)}</div>
                                                    <div className="flex-1 space-y-1.5">
                                                        {u.title && <div className="text-xs font-bold text-white flex items-center gap-2"><ArrowRight size={12} className="text-accent"/> {u.title}</div>}
                                                        {u.tags && <div className="flex gap-1.5 flex-wrap">{u.tags.map((t:string) => <span key={t} className="px-2 py-0.5 bg-white/5 text-neutral-300 text-[9px] font-bold uppercase tracking-wider rounded border border-white/10">{t}</span>)}</div>}
                                                        {u.is_archived && <span className="text-[9px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded uppercase tracking-wider border border-orange-500/20">ARCHIVE_REQUEST</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {result.type === 'TEXT' && (
                                    <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 md:p-8">
                                        <div className="prose prose-invert prose-sm max-w-none text-xs md:text-sm leading-loose font-medium text-neutral-300">
                                            <pre className="whitespace-pre-wrap font-sans">{result.data}</pre>
                                        </div>
                                    </div>
                                )}

                                {result.type === 'TASKS' && (
                                    <div className="space-y-4">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">EXTRACTED_ACTION_ITEMS</p>
                                        <div className="grid gap-3">
                                            {result.data.map((t: any, i: number) => (
                                                <div key={i} className="flex items-start gap-4 p-4 bg-white/[0.03] rounded-xl border border-white/5 group hover:border-accent/30 transition-all">
                                                    <div className="w-5 h-5 rounded border border-neutral-600 mt-0.5 group-hover:border-accent transition-colors"></div>
                                                    <span className="text-xs text-neutral-300 leading-relaxed">{t.text}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>

                    {result && result.type !== 'TEXT' && (
                        <div className="p-6 md:p-8 border-t border-white/10 bg-black/40 backdrop-blur-md flex flex-col md:flex-row justify-end gap-4 shrink-0 pb-safe">
                            <button onClick={onClose} className="px-6 py-4 md:py-3 rounded-xl hover:bg-white/5 text-neutral-400 text-xs font-bold uppercase tracking-wider transition-all order-2 md:order-1">
                                Cancel Operation
                            </button>
                            <button onClick={handleApply} className="px-8 py-4 md:py-3 rounded-xl bg-white text-black hover:bg-accent hover:scale-105 active:scale-95 transition-all text-xs font-black uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center justify-center gap-3 order-1 md:order-2">
                                <Play size={14} fill="currentColor" /> EXECUTE_CHANGES
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const AgentButton = ({ title, desc, icon, isActive, onClick, color = "text-neutral-400", bgColor = "bg-white/5" }: any) => (
    <button 
        onClick={onClick}
        className={`
            w-full p-5 rounded-2xl border text-left transition-all group relative overflow-hidden
            ${isActive 
                ? 'bg-white/10 border-white/20 shadow-lg' 
                : 'bg-transparent border-white/5 hover:bg-white/5 hover:border-white/10'
            }
        `}
    >
        {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent"></div>}
        
        <div className="flex items-start gap-4 relative z-10">
            <div className={`p-3 rounded-xl ${isActive ? 'bg-white text-black' : `${bgColor} ${color} group-hover:text-white`} transition-colors`}>
                {React.cloneElement(icon, { size: 20 })}
            </div>
            <div>
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] block mb-1.5 ${isActive ? 'text-white' : 'text-neutral-300 group-hover:text-white'}`}>
                    {title}
                </span>
                <p className="text-[10px] text-neutral-500 font-medium leading-relaxed group-hover:text-neutral-400">
                    {desc}
                </p>
            </div>
        </div>
    </button>
);
