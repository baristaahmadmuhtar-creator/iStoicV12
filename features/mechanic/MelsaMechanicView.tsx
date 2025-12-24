import React, { useState, useEffect, useRef } from 'react';
import { 
    Activity, Terminal, Cpu, Zap, Wifi, HardDrive, 
    RefreshCw, ShieldCheck, Trash2, 
    ChevronRight, Send, Command, Network, Server,
    AlertTriangle, CheckCircle2, Play, FileText
} from 'lucide-react';
import { debugService } from '../../services/debugService';
import { KEY_MANAGER, type ProviderStatus } from '../../services/geminiService';
import { MelsaKernel } from '../../services/melsaKernel';
import { MELSA_BRAIN } from '../../services/melsaBrain';
import { mechanicTools, executeMechanicTool } from './mechanicTools';
import Markdown from 'react-markdown';

// Local Kernel Instance for Mechanic Context Isolation
const MECHANIC_KERNEL = new MelsaKernel();

// --- COMPONENTS ---

const MetricRing: React.FC<{ 
    label: string; 
    value: number; 
    max: number; 
    unit: string; 
    color?: string;
    icon?: React.ReactNode;
}> = ({ label, value, max, unit, color, icon }) => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(value / max, 1);
    const offset = circumference - progress * circumference;
    
    const strokeColor = color || (progress > 0.9 ? '#ef4444' : progress > 0.7 ? '#eab308' : 'var(--accent-color)');

    return (
        <div className="relative flex flex-col items-center justify-center p-5 bg-white/5 dark:bg-white/[0.02] rounded-[24px] border border-black/5 dark:border-white/5 group hover:border-accent/30 transition-all duration-500">
            <div className="relative w-24 h-24">
                <svg className="w-full h-full transform -rotate-90">
                    <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-black/5 dark:text-white/5" />
                    <circle cx="48" cy="48" r={radius} stroke={strokeColor} strokeWidth="8" fill="transparent" 
                        strokeDasharray={circumference} 
                        strokeDashoffset={offset} 
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]"
                        style={{ filter: `drop-shadow(0 0 2px ${strokeColor})` }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col text-accent">
                    {icon && <div className="mb-1 opacity-80">{icon}</div>}
                    <span className="text-sm font-black text-black dark:text-white leading-none">{value}</span>
                    <span className="text-[9px] text-neutral-500 font-mono mt-0.5">{unit}</span>
                </div>
            </div>
            <span className="mt-3 text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400 group-hover:text-accent transition-colors">{label}</span>
        </div>
    );
};

const DiagnosticReport: React.FC<{ text: string, onExecute: (cmd: string) => void }> = ({ text, onExecute }) => {
    const integrityMatch = text.match(/SYSTEM INTEGRITY:\s*(\d+)%/i);
    const score = integrityMatch ? parseInt(integrityMatch[1]) : 0;
    
    const parts = text.split('###');
    const getSection = (titlePart: string) => parts.find(s => s.toUpperCase().includes(titlePart)) || '';

    // Extract Summary Text (Everything after "SYSTEM INTEGRITY: XX%" until next section)
    const summarySection = getSection('SYSTEM INTEGRITY');
    const summaryText = summarySection ? summarySection.replace(/SYSTEM INTEGRITY:\s*\d+%(\s*\**\s*)?/i, '').trim() : '';

    const anomaliesContent = getSection('ANOMALIES DETECTED');
    const actionsContent = getSection('RECOMMENDED ACTIONS');
    
    const anomalyList = anomaliesContent.split('\n').filter(l => l.trim().startsWith('-')).map(l => l.replace('-', '').trim());
    const actionList = actionsContent.split('\n').filter(l => l.trim().match(/^\d+\./)).map(l => l.replace(/^\d+\./, '').trim());

    return (
        <div className="bg-zinc-900/50 rounded-2xl border border-white/10 p-5 my-2 space-y-5 font-sans animate-fade-in w-full">
            {/* Header: Score */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                        <Activity size={14} className="text-accent"/> Diagnostic Report
                    </h4>
                    <p className="text-[9px] text-neutral-400 mt-1 tech-mono">AUTO_GENERATED_ANALYSIS</p>
                </div>
                <div className={`text-4xl font-black italic tracking-tighter ${score >= 90 ? 'text-emerald-500' : score >= 70 ? 'text-amber-500' : 'text-red-500'}`}>
                    {score}%
                </div>
            </div>

            {/* Natural Language Summary */}
            {summaryText && (
                <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 mb-2 text-neutral-500 text-[9px] font-black uppercase tracking-widest">
                        <FileText size={10} /> SITUATION_REPORT
                    </div>
                    <div className="text-[10px] text-neutral-300 leading-relaxed italic prose-sm dark:prose-invert max-w-none">
                        <Markdown>{summaryText}</Markdown>
                    </div>
                </div>
            )}

            {/* Anomalies */}
            {anomalyList.length > 0 && !anomalyList[0].toLowerCase().includes('none') && (
                <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
                    <h5 className="text-[9px] font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <AlertTriangle size={12} /> Anomalies Detected
                    </h5>
                    <ul className="space-y-2">
                        {anomalyList.map((a, i) => (
                            <li key={i} className="text-[10px] text-red-200 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-red-500 leading-relaxed">
                                {a}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Actions */}
            {actionList.length > 0 && (
                <div>
                    <h5 className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Zap size={12} className="text-accent" /> Recommended Actions
                    </h5>
                    <div className="space-y-2">
                        {actionList.map((action, i) => {
                            const toolMatch = action.match(/'(REFRESH_KEYS|OPTIMIZE_MEMORY|CLEAR_LOGS|GET_DIAGNOSTICS)'/);
                            const toolCmd = toolMatch ? toolMatch[1] : null;
                            
                            return (
                                <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors gap-3">
                                    <span className="text-[10px] text-neutral-300 leading-tight">{action}</span>
                                    {toolCmd && (
                                        <button 
                                            onClick={() => onExecute(toolCmd === 'GET_DIAGNOSTICS' ? "Run Diagnostics" : toolCmd === 'OPTIMIZE_MEMORY' ? "Optimize memory" : `Run ${toolCmd}`)}
                                            className="shrink-0 px-3 py-1.5 bg-accent/10 hover:bg-accent text-accent hover:text-black border border-accent/20 hover:border-accent text-[8px] font-black uppercase rounded-lg transition-all flex items-center gap-1"
                                        >
                                            <Play size={8} /> EXECUTE
                                        </button>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
            
            {/* Safe Status Fallback */}
            {anomalyList.length > 0 && anomalyList[0].toLowerCase().includes('none') && (
                 <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                    <CheckCircle2 size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wide">All Systems Operational</span>
                 </div>
            )}
        </div>
    );
};

// --- MAIN VIEW ---

export const MelsaMechanicView: React.FC = () => {
    const [health, setHealth] = useState<any>({ avgLatency: 0, memoryMb: 0, errorCount: 0 });
    const [providers, setProviders] = useState<ProviderStatus[]>([]);
    
    const [messages, setMessages] = useState<Array<{role: 'user'|'mechanic', text: string}>>([
        { role: 'mechanic', text: "Melsa Mechanic Online. Diagnostic systems active. Ready for input." }
    ]);
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const updateVitals = () => {
            setHealth(debugService.getSystemHealth());
            setProviders(KEY_MANAGER.getAllProviderStatuses());
        };
        updateVitals();
        const interval = setInterval(updateVitals, 2000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Auto-resize textarea
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
        }
    }, [input]);

    const handleCommand = async (cmdOverride?: string) => {
        const cmd = cmdOverride || input.trim();
        if (!cmd || isProcessing) return;

        setMessages(prev => [...prev, { role: 'user', text: cmd }]);
        setInput('');
        setIsProcessing(true);

        try {
            const stream = MECHANIC_KERNEL.streamExecute(
                cmd, 
                'gemini-3-flash-preview', 
                undefined, 
                undefined, 
                {
                    systemInstruction: MELSA_BRAIN.getMechanicInstruction(),
                    tools: [mechanicTools]
                }
            );

            let responseText = "";
            
            // Initial mechanic message placeholder
            setMessages(prev => [...prev, { role: 'mechanic', text: "..." }]);

            for await (const chunk of stream) {
                if (chunk.text) {
                    responseText += chunk.text;
                    setMessages(prev => {
                        const newMsgs = [...prev];
                        // Update the LAST mechanic message
                        newMsgs[newMsgs.length - 1] = { role: 'mechanic', text: responseText };
                        return newMsgs;
                    });
                }
                
                if (chunk.functionCall) {
                    setMessages(prev => {
                        const newMsgs = [...prev];
                        newMsgs[newMsgs.length - 1] = { role: 'mechanic', text: `_Executing protocol: ${chunk.functionCall.name}..._` };
                        return newMsgs;
                    });

                    const result = await executeMechanicTool(chunk.functionCall);
                    
                    // Dynamic prompt engineering based on tool output to enhance natural language response
                    let synthesisPrompt = `Tool Output: ${result}.\n\nAnalyze this result and provide a status update.`;

                    if (chunk.functionCall.name === 'system_mechanic_tool') {
                        const action = (chunk.functionCall.args as any)?.action;
                        if (action === 'GET_DIAGNOSTICS') {
                            synthesisPrompt = `
[TELEMETRY_DATA_RECEIVED]
${result}

[DIRECTIVE]
You are the Melsa Mechanic AI. Analyze the raw JSON telemetry above.
1. Derive a 'System Integrity' score (0-100) based on latency (<1000ms is good), memory (<500MB is good), and error counts.
2. Generate a 'Mission Brief' summary in natural language (Cyberpunk/Tech tone). Be expressive but concise.
3. List active anomalies.
4. Recommend maintenance protocols.

[REQUIRED_OUTPUT_SCHEMA]
You MUST use this Markdown structure exactly for the UI to parse it:

### SYSTEM INTEGRITY: [Calculated_Score]%
[Your natural language Mission Brief here.]

### ⚠️ ANOMALIES DETECTED
- [Specific Anomaly or "None"]

### ⚡ RECOMMENDED ACTIONS
1. [Action Step 1]
2. [Action Step 2]
`;
                        }
                    }
                    
                    // Feed result back with refined instruction
                    const followUp = await MECHANIC_KERNEL.execute(
                        synthesisPrompt, 
                        'gemini-3-flash-preview',
                        undefined,
                        undefined
                    );
                    
                    if (followUp.text) {
                        setMessages(prev => {
                            const newMsgs = [...prev];
                            newMsgs[newMsgs.length - 1] = { role: 'mechanic', text: followUp.text };
                            return newMsgs;
                        });
                    }
                }
            }
        } catch (e: any) {
            setMessages(prev => [...prev, { role: 'mechanic', text: `**SYSTEM ERROR**: ${e.message}` }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleCommand();
        }
    };

    return (
        <div className="h-full flex flex-col p-4 md:p-8 pb-32 overflow-hidden font-sans animate-fade-in bg-zinc-50 dark:bg-[#050505] text-black dark:text-white">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-black/5 dark:border-white/5 pb-6 shrink-0 gap-4">
                <div>
                    <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase leading-none">
                        MELSA <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-blue-500">MECHANIC</span>
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></div>
                        <p className="text-[9px] tech-mono font-bold text-neutral-500 uppercase tracking-[0.3em]">SYSTEM_DIAGNOSTICS_MODULE</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <div className="px-4 py-2 bg-white dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5 flex items-center gap-3 shadow-sm">
                        <Wifi size={14} className={health.avgLatency > 1000 ? "text-red-500" : "text-emerald-500"} />
                        <span className="text-[10px] font-black tech-mono">{health.avgLatency}ms</span>
                    </div>
                    <div className="px-4 py-2 bg-white dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5 flex items-center gap-3 shadow-sm">
                        <ShieldCheck size={14} className="text-accent" />
                        <span className="text-[10px] font-black tech-mono">SECURE</span>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden min-h-0">
                
                {/* Left: Vitals & Tools */}
                <div className="w-full lg:w-1/3 flex flex-col gap-6 overflow-y-auto custom-scroll pr-2">
                    
                    {/* Ring Metrics Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <MetricRing label="LATENCY" value={health.avgLatency} max={2000} unit="ms" icon={<Network size={14}/>} />
                        <MetricRing label="MEMORY" value={health.memoryMb || 0} max={2000} unit="MB" icon={<HardDrive size={14}/>} />
                    </div>

                    {/* Quick Actions Panel */}
                    <div className="bg-white dark:bg-[#0a0a0b] border border-black/5 dark:border-white/5 rounded-[32px] p-6 shadow-sm">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-5 flex items-center gap-2">
                            <Zap size={12} className="text-accent" /> RAPID_PROTOCOLS
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                            <button onClick={() => handleCommand("Perform a deep system diagnosis. Check latency, memory, environment, and provider health.")} disabled={isProcessing} className="p-4 bg-zinc-50 dark:bg-white/5 hover:bg-accent hover:text-on-accent border border-black/5 dark:border-white/5 rounded-2xl text-[9px] font-black uppercase tracking-wider text-left transition-all flex items-center gap-3 group">
                                <Activity size={16} className="text-accent group-hover:text-on-accent transition-colors" /> 
                                <span>RUN_DIAGNOSTICS</span>
                                <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                            <button onClick={() => handleCommand("Refresh API key pools and check cooldowns.")} disabled={isProcessing} className="p-4 bg-zinc-50 dark:bg-white/5 hover:bg-accent hover:text-on-accent border border-black/5 dark:border-white/5 rounded-2xl text-[9px] font-black uppercase tracking-wider text-left transition-all flex items-center gap-3 group">
                                <RefreshCw size={16} className="text-accent group-hover:text-on-accent transition-colors" /> 
                                <span>ROTATE_API_KEYS</span>
                                <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                            <button onClick={() => handleCommand("Optimize memory usage.")} disabled={isProcessing} className="p-4 bg-zinc-50 dark:bg-white/5 hover:bg-accent hover:text-on-accent border border-black/5 dark:border-white/5 rounded-2xl text-[9px] font-black uppercase tracking-wider text-left transition-all flex items-center gap-3 group">
                                <Cpu size={16} className="text-accent group-hover:text-on-accent transition-colors" /> 
                                <span>OPTIMIZE_KERNEL</span>
                                <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                            <button onClick={() => handleCommand("Clear system logs immediately.")} disabled={isProcessing} className="p-4 bg-zinc-50 dark:bg-white/5 hover:bg-red-500 hover:text-white border border-black/5 dark:border-white/5 rounded-2xl text-[9px] font-black uppercase tracking-wider text-left transition-all flex items-center gap-3 group">
                                <Trash2 size={16} className="text-red-500 group-hover:text-white transition-colors" /> 
                                <span>PURGE_LOGS</span>
                                <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        </div>
                    </div>

                    {/* Provider Status List */}
                    <div className="flex-1 bg-white dark:bg-[#0a0a0b] border border-black/5 dark:border-white/5 rounded-[32px] p-6 overflow-hidden flex flex-col shadow-sm">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-4 flex items-center gap-2">
                            <Server size={12} className="text-emerald-500" /> API_UPLINK_STATUS
                        </h3>
                        <div className="flex-1 overflow-y-auto space-y-2 custom-scroll">
                            {providers.map(p => (
                                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className={`relative w-2 h-2 rounded-full ${p.status === 'HEALTHY' ? 'bg-emerald-500' : p.status === 'COOLDOWN' ? 'bg-amber-500' : 'bg-red-500'}`}>
                                            {p.status !== 'HEALTHY' && <div className="absolute inset-0 rounded-full animate-ping opacity-75 bg-inherit"></div>}
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold text-black dark:text-white uppercase tracking-tight">{p.id}</div>
                                            <div className="text-[8px] font-mono text-neutral-500">{p.status}</div>
                                        </div>
                                    </div>
                                    <div className="text-[9px] font-black tech-mono text-accent">{p.keyCount} KEYS</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Neural Console */}
                <div className="flex-1 bg-black/90 dark:bg-black/40 border border-black/5 dark:border-white/10 rounded-[32px] flex flex-col overflow-hidden relative shadow-2xl backdrop-blur-xl">
                    {/* CRT Scanline Effect */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20"></div>
                    
                    {/* Header Strip */}
                    <div className="h-10 bg-white/5 border-b border-white/5 flex items-center px-4 justify-between">
                        <div className="flex gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
                        </div>
                        <span className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest">secure_shell_v13.5</span>
                    </div>

                    {/* Output Stream */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scroll font-mono relative z-0">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                                {m.role === 'mechanic' && (
                                    <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center shrink-0 text-accent mt-1">
                                        <Terminal size={14} />
                                    </div>
                                )}
                                <div className={`max-w-[95%] lg:max-w-[85%] ${m.role === 'mechanic' ? 'w-full' : ''}`}>
                                    {m.role === 'mechanic' && m.text.includes("SYSTEM INTEGRITY") ? (
                                        <DiagnosticReport text={m.text} onExecute={handleCommand} />
                                    ) : (
                                        <div className={`p-4 rounded-xl text-xs leading-relaxed border ${
                                            m.role === 'user' 
                                            ? 'bg-white/10 text-white border-white/10 rounded-tr-none' 
                                            : 'bg-[#0a0a0b]/80 text-emerald-400 border-emerald-500/20 rounded-tl-none shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                                        }`}>
                                            <Markdown>{m.text}</Markdown>
                                        </div>
                                    )}
                                </div>
                                {m.role === 'user' && (
                                    <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center shrink-0 text-white mt-1">
                                        <ChevronRight size={14} />
                                    </div>
                                )}
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-[#0a0a0b] border-t border-white/10 relative z-20">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-accent/10 blur-xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                            
                            <span className="absolute left-4 top-4 text-accent z-20 animate-pulse">{'>'}</span>
                            
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="ENTER_SYSTEM_COMMAND..."
                                rows={1}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-12 text-sm text-emerald-400 font-mono focus:outline-none focus:border-accent/50 focus:bg-white/10 transition-all placeholder:text-neutral-700 relative z-10 resize-none overflow-hidden custom-scroll"
                                disabled={isProcessing}
                                autoFocus
                            />
                            
                            <button 
                                onClick={() => handleCommand()}
                                disabled={!input.trim() || isProcessing}
                                className="absolute right-3 bottom-3 p-2 bg-accent/10 text-accent rounded-lg hover:bg-accent hover:text-black transition-all disabled:opacity-0 z-20"
                            >
                                <Send size={14} />
                            </button>
                        </div>
                        <div className="flex justify-between mt-3 px-1">
                            <span className="text-[7px] font-black text-neutral-600 uppercase tracking-[0.2em] flex items-center gap-1">
                                <div className="w-1 h-1 bg-green-500 rounded-full"></div> KERNEL_ACTIVE
                            </span>
                            <span className="text-[7px] font-black text-accent uppercase tracking-[0.2em] flex items-center gap-1">
                                <Command size={8}/> WAITING_INPUT
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};