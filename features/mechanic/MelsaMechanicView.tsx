
import React, { useState, useEffect, useRef } from 'react';
import { 
    Activity, Terminal, Cpu, Zap, Wifi, HardDrive, 
    RefreshCw, ShieldCheck, Trash2, 
    ChevronRight, Send, Command, Network, Server,
    AlertTriangle, CheckCircle2, Play, FileText, BrainCircuit
} from 'lucide-react';
import { debugService } from '../../services/debugService';
import { KEY_MANAGER, type ProviderStatus } from '../../services/geminiService';
import { HanisahKernel } from '../../services/melsaKernel';
import { HANISAH_BRAIN } from '../../services/melsaBrain';
import { mechanicTools, executeMechanicTool } from './mechanicTools';
import Markdown from 'react-markdown';
import { UI_REGISTRY, FN_REGISTRY } from '../../constants/registry';

// Local Kernel Instance for Mechanic Context Isolation
const MECHANIC_KERNEL = new HanisahKernel();

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
    
    // Use dynamic accent color if no specific color provided
    const strokeColor = color || (progress > 0.9 ? '#ef4444' : progress > 0.7 ? '#eab308' : 'var(--accent-color)');

    return (
        <div className="relative flex flex-col items-center justify-center p-5 bg-white/5 dark:bg-white/[0.02] rounded-[24px] border border-black/5 dark:border-white/5 group hover:border-accent/30 transition-all duration-500 hover:shadow-[0_0_20px_rgba(var(--accent-rgb),0.1)]">
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

    // Extract Cognitive Insight (The natural language mission brief)
    const insightSection = getSection('COGNITIVE INSIGHT');
    const insightText = insightSection ? insightSection.replace(/COGNITIVE INSIGHT(\s*\**\s*)?/i, '').trim() : '';

    const anomaliesContent = getSection('ANOMALIES DETECTED');
    const actionsContent = getSection('RECOMMENDED ACTIONS');
    
    const anomalyList = anomaliesContent.split('\n').filter(l => l.trim().startsWith('-')).map(l => l.replace('-', '').trim());
    const actionList = actionsContent.split('\n').filter(l => l.trim().match(/^\d+\./)).map(l => l.replace(/^\d+\./, '').trim());

    return (
        <div className="bg-zinc-900/50 rounded-[32px] border border-white/10 p-6 md:p-8 my-4 space-y-6 font-sans animate-fade-in w-full shadow-2xl relative overflow-hidden ring-1 ring-accent/20">
            {/* Background Texture */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none"></div>

            {/* Header: Score */}
            <div className="flex items-center justify-between border-b border-white/10 pb-6 relative z-10">
                <div>
                    <h4 className="text-xs font-black uppercase tracking-[0.3em] text-white flex items-center gap-2">
                        <Activity size={14} className="text-accent animate-pulse"/> DIAGNOSTIC_MATRIX_ID_{Math.floor(Math.random()*10000)}
                    </h4>
                    <p className="text-[9px] text-neutral-500 mt-1 tech-mono uppercase tracking-widest">Neural Layer Analysis v13.5</p>
                </div>
                <div className="text-right">
                    <p className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest mb-1">INTEGRITY_INDEX</p>
                    <div className={`text-5xl font-black italic tracking-tighter ${score >= 90 ? 'text-emerald-400' : score >= 70 ? 'text-amber-400' : 'text-red-500'}`}>
                        {score}%
                    </div>
                </div>
            </div>

            {/* Natural Language Summary Card */}
            {insightText && (
                <div className="bg-white/[0.03] rounded-2xl p-5 border border-white/5 relative group transition-all hover:bg-white/[0.05]">
                    <div className="flex items-center gap-3 mb-4 text-accent/70 text-[9px] font-black uppercase tracking-[0.2em]">
                        <BrainCircuit size={14} className="group-hover:rotate-12 transition-transform" /> COGNITIVE_INSIGHT_SUMMARY
                    </div>
                    <div className="text-[11px] md:text-xs text-neutral-300 leading-relaxed italic prose-sm dark:prose-invert max-w-none border-l-2 border-accent/20 pl-4 py-1">
                        <Markdown>{insightText}</Markdown>
                    </div>
                </div>
            )}

            {/* Grid for Anomalies and Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Anomalies */}
                <div className={`${anomalyList.length > 0 && !anomalyList[0].toLowerCase().includes('none') ? 'bg-red-500/[0.03] border-red-500/20' : 'bg-emerald-500/[0.03] border-emerald-500/20'} rounded-2xl p-5 border flex flex-col`}>
                    <h5 className={`text-[9px] font-black uppercase tracking-wider mb-4 flex items-center gap-2 ${anomalyList.length > 0 && !anomalyList[0].toLowerCase().includes('none') ? 'text-red-400' : 'text-emerald-400'}`}>
                        <AlertTriangle size={12} /> {anomalyList.length > 0 && !anomalyList[0].toLowerCase().includes('none') ? 'ANOMALIES_DETECTED' : 'SYSTEM_STABLE'}
                    </h5>
                    {anomalyList.length > 0 && !anomalyList[0].toLowerCase().includes('none') ? (
                        <ul className="space-y-3 flex-1">
                            {anomalyList.map((a, i) => (
                                <li key={i} className="text-[10px] text-neutral-400 pl-4 relative before:content-['>'] before:absolute before:left-0 before:text-red-500/50 leading-relaxed font-mono">
                                    {a}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-6 gap-2 text-emerald-500/40">
                             <CheckCircle2 size={32} strokeWidth={1} />
                             <span className="text-[8px] font-bold uppercase tracking-widest">All Core Links Nominal</span>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="bg-white/[0.03] rounded-2xl p-5 border border-white/5">
                    <h5 className="text-[9px] font-black text-neutral-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Zap size={12} className="text-accent" /> PROTOCOL_REVIEWS
                    </h5>
                    <div className="space-y-2">
                        {actionList.map((action, i) => {
                            const toolMatch = action.match(/'(REFRESH_KEYS|OPTIMIZE_MEMORY|CLEAR_LOGS|GET_DIAGNOSTICS)'/);
                            const toolCmd = toolMatch ? toolMatch[1] : null;
                            
                            return (
                                <div key={i} className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/5 hover:border-accent/20 transition-colors gap-3 group/item">
                                    <span className="text-[10px] text-neutral-400 leading-tight group-hover/item:text-neutral-200 transition-colors">{action}</span>
                                    {toolCmd && (
                                        <button 
                                            onClick={() => onExecute(toolCmd === 'GET_DIAGNOSTICS' ? "Run System Scan" : toolCmd === 'OPTIMIZE_MEMORY' ? "Execute memory optimization" : `Trigger ${toolCmd} protocol`)}
                                            className="shrink-0 w-8 h-8 bg-accent/10 hover:bg-accent text-accent hover:text-black rounded-lg transition-all flex items-center justify-center"
                                            title="Run This Tool"
                                        >
                                            <Play size={10} />
                                        </button>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
            
            <div className="pt-4 border-t border-white/5 flex justify-between items-center opacity-30">
                <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-[0.4em]">Verified_by_Hanisah_Kernel</span>
                <div className="flex gap-1">
                    <div className="w-1 h-1 bg-white rounded-full"></div>
                    <div className="w-1 h-1 bg-white rounded-full"></div>
                    <div className="w-1 h-1 bg-white rounded-full"></div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN VIEW ---

export const HanisahMechanicView: React.FC = () => {
    const [health, setHealth] = useState<any>({ avgLatency: 0, memoryMb: 0, errorCount: 0 });
    const [providers, setProviders] = useState<ProviderStatus[]>([]);
    
    const [messages, setMessages] = useState<Array<{role: 'user'|'mechanic', text: string}>>([
        { role: 'mechanic', text: "Hanisah Mechanic Online. Diagnostic systems active. Ready for input." }
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

    const executeRepair = async (action: string) => {
        const uiId = action === 'REFRESH_KEYS' ? UI_REGISTRY.MECH_BTN_REFRESH_KEYS :
                     action === 'OPTIMIZE_MEMORY' ? UI_REGISTRY.MECH_BTN_OPTIMIZE :
                     action === 'CLEAR_LOGS' ? UI_REGISTRY.MECH_BTN_CLEAR_LOGS : UI_REGISTRY.MECH_BTN_HARD_RESET;
        
        debugService.logAction(uiId, FN_REGISTRY.MECH_EXECUTE_FIX, action);
        debugService.log('INFO', 'MECHANIC', 'FIX_EXEC', `Initiating protocol: ${action}`);
        
        // Hard Reset Exception
        if (action === 'HARD_RESET') {
            if(confirm("PERINGATAN: System Reboot akan merefresh halaman.")) window.location.reload();
            return;
        }

        // Artificial delay for UX processing feel
        await new Promise(r => setTimeout(r, 800));

        const result = await executeMechanicTool({ args: { action } });
        debugService.log('INFO', 'MECHANIC', 'FIX_RESULT', result);
        
        // Immediate Local State Updates
        if (action === 'REFRESH_KEYS') {
            setProviders(KEY_MANAGER.getAllProviderStatuses());
        } else if (action === 'CLEAR_LOGS') {
            setMessages(prev => [{ role: 'mechanic', text: "Logs cleared. Buffer reset." }]);
            debugService.clear(); 
        } else if (action === 'OPTIMIZE_MEMORY') {
            setHealth(debugService.getSystemHealth());
        }
    };

    const handleHydraRefresh = async () => {
        await executeRepair('REFRESH_KEYS');
    };

    const runHanisahDiagnosis = async () => {
        debugService.logAction(UI_REGISTRY.MECH_BTN_SCAN, FN_REGISTRY.MECH_RUN_DIAGNOSIS, 'START');
        // Add user message to log flow
        setMessages(prev => [...prev, { role: 'user', text: "Run full diagnostic scan." }]);
        setIsProcessing(true);
        
        try {
            debugService.log('INFO', 'MECHANIC', 'SCAN_INIT', 'Running full system diagnostics...');
            const toolResultJson = await executeMechanicTool({ args: { action: 'GET_DIAGNOSTICS' } });
            
            const prompt = `[ROLE: HANISAH_SYSTEM_MECHANIC]\nAnalisa data telemetri (CPU, RAM, Latency).\nBerikan laporan performa sistem gaya Cyberpunk.\n\n[RAW_DATA]\n${toolResultJson}\n\nFORMAT:\n1. **SYSTEM INTEGRITY**: (SCORE %)\n2. **METRICS SUMMARY**: (CPU/Mem/Net Status)\n3. **ANOMALIES**: (List - be specific)\n4. **OPTIMIZATION**: (Actionable steps)`;
            
            const response = await MECHANIC_KERNEL.execute(prompt, 'gemini-3-flash-preview');
            setMessages(prev => [...prev, { role: 'mechanic', text: response.text || "Diagnostic failed." }]);
            debugService.log('INFO', 'MECHANIC', 'SCAN_COMPLETE', 'Diagnosis generated successfully.');
        } catch (e: any) {
            setMessages(prev => [...prev, { role: 'mechanic', text: `⚠️ **DIAGNOSTIC FAILURE**: ${e.message}` }]);
            debugService.log('ERROR', 'MECHANIC', 'SCAN_FAIL', e.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCommand = async (cmdOverride?: string) => {
        const cmd = cmdOverride || input.trim();
        if (!cmd || isProcessing) return;

        debugService.logAction(UI_REGISTRY.MECH_INPUT_CLI, FN_REGISTRY.MECH_CLI_EXEC, cmd);
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
                    systemInstruction: HANISAH_BRAIN.getMechanicInstruction(),
                    tools: [mechanicTools]
                }
            );

            let responseText = "";
            setMessages(prev => [...prev, { role: 'mechanic', text: "..." }]);

            for await (const chunk of stream) {
                if (chunk.text) {
                    responseText += chunk.text;
                    setMessages(prev => {
                        const newMsgs = [...prev];
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
                    const synthesisPrompt = `Tool Result: ${result}.\n\nProvide a human-readable status update.`;
                    
                    const followUp = await MECHANIC_KERNEL.execute(synthesisPrompt, 'gemini-3-flash-preview');
                    
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
        <div className="h-full flex flex-col p-4 md:p-12 lg:p-16 pb-32 overflow-hidden font-sans animate-fade-in bg-zinc-50 dark:bg-[#050505] text-black dark:text-white">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-black/5 dark:border-white/5 pb-6 shrink-0 gap-4">
                <div>
                    <h1 className="text-[10vw] lg:text-[7rem] heading-heavy text-black dark:text-white leading-[0.85] tracking-tighter uppercase">
                        HANISAH <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-blue-500 animate-gradient-text">MECHANIC</span>
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></div>
                        <p className="text-[9px] tech-mono font-bold text-neutral-500 uppercase tracking-[0.3em]">NEURAL_DIAGNOSTICS_MATRIX</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <div className="px-4 py-2 bg-white dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5 flex items-center gap-3 shadow-sm transition-all hover:border-accent/30">
                        <Wifi size={14} className={health.avgLatency > 1000 ? "text-red-500" : "text-emerald-500"} />
                        <span className="text-[10px] font-black tech-mono">{health.avgLatency}ms</span>
                    </div>
                    <div className="px-4 py-2 bg-white dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5 flex items-center gap-3 shadow-sm">
                        <ShieldCheck size={14} className="text-accent" />
                        <span className="text-[10px] font-black tech-mono uppercase">Link_Secure</span>
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
                            <Zap size={12} className="text-accent" /> RAPID_MAINTENANCE
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                            <button onClick={runHanisahDiagnosis} disabled={isProcessing} className="p-4 bg-zinc-50 dark:bg-white/5 hover:bg-accent hover:text-on-accent border border-black/5 dark:border-white/5 rounded-2xl text-[9px] font-black uppercase tracking-wider text-left transition-all flex items-center gap-3 group">
                                <Activity size={16} className="text-accent group-hover:text-on-accent transition-colors" /> 
                                <span>FULL_SYSTEM_SCAN</span>
                                <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                            <button onClick={() => executeRepair('REFRESH_KEYS')} disabled={isProcessing} className="p-4 bg-zinc-50 dark:bg-white/5 hover:bg-accent hover:text-on-accent border border-black/5 dark:border-white/5 rounded-2xl text-[9px] font-black uppercase tracking-wider text-left transition-all flex items-center gap-3 group">
                                <RefreshCw size={16} className="text-accent group-hover:text-on-accent transition-colors" /> 
                                <span>ROTATE_UPLINKS</span>
                                <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                            <button onClick={() => executeRepair('OPTIMIZE_MEMORY')} disabled={isProcessing} className="p-4 bg-zinc-50 dark:bg-white/5 hover:bg-accent hover:text-on-accent border border-black/5 dark:border-white/5 rounded-2xl text-[9px] font-black uppercase tracking-wider text-left transition-all flex items-center gap-3 group">
                                <Cpu size={16} className="text-accent group-hover:text-on-accent transition-colors" /> 
                                <span>MEMORY_COMPACT</span>
                                <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                            <button onClick={() => executeRepair('CLEAR_LOGS')} disabled={isProcessing} className="p-4 bg-zinc-50 dark:bg-white/5 hover:bg-red-500 hover:text-white border border-black/5 dark:border-white/5 rounded-2xl text-[9px] font-black uppercase tracking-wider text-left transition-all flex items-center gap-3 group">
                                <Trash2 size={16} className="text-red-500 group-hover:text-white transition-colors" /> 
                                <span>NUKE_LOG_BUFFER</span>
                                <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        </div>
                    </div>

                    {/* Provider Status List */}
                    <div className="flex-1 bg-white dark:bg-[#0a0a0b] border border-black/5 dark:border-white/5 rounded-[32px] p-6 overflow-hidden flex flex-col shadow-sm">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-4 flex items-center gap-2">
                            <Server size={12} className="text-emerald-500" /> ACTIVE_COGNITIVE_NODES
                        </h3>
                        <div className="flex-1 overflow-y-auto space-y-2 custom-scroll pr-1">
                            {providers.map(p => (
                                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/5 hover:border-accent/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`relative w-2 h-2 rounded-full ${p.status === 'HEALTHY' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : p.status === 'COOLDOWN' ? 'bg-amber-500' : 'bg-red-500'}`}>
                                            {p.status !== 'HEALTHY' && <div className="absolute inset-0 rounded-full animate-ping opacity-75 bg-inherit"></div>}
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-black dark:text-white uppercase tracking-tight">{p.id}</div>
                                            <div className={`text-[8px] font-mono ${p.status === 'HEALTHY' ? 'text-neutral-500' : 'text-amber-500'}`}>{p.status === 'COOLDOWN' ? `RESTORING (${p.cooldownRemaining}m)` : p.status}</div>
                                        </div>
                                    </div>
                                    <div className="text-[9px] font-black tech-mono text-accent">{p.keyCount} KEYS</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Neural Console */}
                <div className="flex-1 bg-terminal-void border border-black/5 dark:border-white/10 rounded-[32px] flex flex-col overflow-hidden relative shadow-2xl backdrop-blur-xl ring-1 ring-accent/20 terminal-scanlines">
                    {/* Header Strip */}
                    <div className="h-12 bg-white/5 border-b border-white/5 flex items-center px-5 justify-between shrink-0 relative z-20">
                        <div className="flex gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.2)]"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50 shadow-[0_0_8px_rgba(234,179,8,0.2)]"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50 shadow-[0_0_8px_rgba(34,197,94,0.2)]"></div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest animate-pulse">Neural_Link: Established</span>
                            <span className="text-[8px] font-mono text-neutral-600 uppercase tracking-widest">shell_v13.5</span>
                        </div>
                    </div>

                    {/* Output Stream */}
                    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scroll font-mono relative z-20">
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
                                            : 'bg-black/40 text-accent border-accent/20 rounded-tl-none shadow-[0_0_15px_var(--accent-glow)] text-terminal-glow'
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
                            <div className="absolute inset-0 bg-accent/10 blur-xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
                            
                            <span className="absolute left-4 top-4 text-accent z-20 animate-pulse font-black">{'>'}</span>
                            
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="ENTER_SYSTEM_COMMAND..."
                                rows={1}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-12 text-sm text-accent font-mono focus:outline-none focus:border-accent/50 focus:bg-white/10 transition-all placeholder:text-neutral-800 relative z-10 resize-none overflow-hidden custom-scroll"
                                disabled={isProcessing}
                                autoFocus
                            />
                            
                            <button 
                                onClick={() => handleCommand()}
                                disabled={!input.trim() || isProcessing}
                                className="absolute right-3 bottom-3 p-2 bg-accent/10 text-accent rounded-lg hover:bg-accent hover:text-black transition-all disabled:opacity-0 z-20 active:scale-95"
                            >
                                <Send size={14} />
                            </button>
                        </div>
                        <div className="flex justify-between mt-3 px-1">
                            <span className="text-[7px] font-black text-neutral-600 uppercase tracking-[0.2em] flex items-center gap-1">
                                <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div> KERNEL_ACTIVE
                            </span>
                            <span className="text-[7px] font-black text-accent uppercase tracking-[0.2em] flex items-center gap-1">
                                <Command size={8}/> READY_FOR_UPLINK
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
