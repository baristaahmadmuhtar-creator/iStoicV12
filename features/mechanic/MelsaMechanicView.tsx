import React, { useState, useEffect, useRef } from 'react';
import { 
    Activity, Terminal, Cpu, Zap, Wifi, HardDrive, 
    RefreshCw, ShieldCheck, Trash2, 
    ChevronRight, Send, Command, Network, Server,
    AlertTriangle, CheckCircle2, Play, FileText, BrainCircuit,
    LayoutGrid, MousePointer2, ToggleLeft, ToggleRight, Fingerprint, Info
} from 'lucide-react';
import { debugService, type UIStatus } from '../../services/debugService';
import { KEY_MANAGER, type ProviderStatus } from '../../services/geminiService';
import { HanisahKernel } from '../../services/melsaKernel';
import { HANISAH_BRAIN } from '../../services/melsaBrain';
import { mechanicTools, executeMechanicTool } from './mechanicTools';
import Markdown from 'react-markdown';
import { UI_REGISTRY, FN_REGISTRY } from '../../constants/registry';
import { useFeatures } from '../../contexts/FeatureContext'; // Updated Import

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

const UIElementNode: React.FC<{ id: string, status: UIStatus, errors: number, usage: number, onToggle: () => void }> = ({ id, status, errors, usage, onToggle }) => {
    const getStatusColor = () => {
        if (status === 'DISABLED') return 'bg-red-500/10 border-red-500 text-red-500';
        if (status === 'UNSTABLE') return 'bg-yellow-500/10 border-yellow-500 text-yellow-500 animate-pulse';
        return 'bg-emerald-500/10 border-emerald-500 text-emerald-500';
    };

    const cleanName = id.replace(/UI_|BTN_/g, '').replace(/_/g, ' ');

    return (
        <div 
            onClick={onToggle}
            className={`
                relative p-3 rounded-xl border transition-all cursor-pointer group select-none
                ${getStatusColor()} hover:scale-[1.02] active:scale-95
            `}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="p-1.5 rounded-lg bg-black/20">
                    {status === 'DISABLED' ? <ToggleLeft size={14} /> : <ToggleRight size={14} />}
                </div>
                <div className="text-[9px] font-mono opacity-70">
                    ERR:{errors} | USE:{usage}
                </div>
            </div>
            <div className="text-[10px] font-black uppercase tracking-wider truncate" title={id}>
                {cleanName}
            </div>
            <div className="text-[8px] font-mono mt-1 opacity-60">
                {status}
            </div>
            
            {/* Holographic Overlay */}
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        </div>
    );
};

// ... (DiagnosticReport component preserved from previous version, no changes needed there) ...
const DiagnosticReport: React.FC<{ text: string, onExecute: (cmd: string) => void }> = ({ text, onExecute }) => {
    const integrityMatch = text.match(/SYSTEM INTEGRITY:\s*(\d+)%/i);
    const score = integrityMatch ? parseInt(integrityMatch[1]) : 0;
    
    const parts = text.split('###');
    const getSection = (titlePart: string) => parts.find(s => s.toUpperCase().includes(titlePart)) || '';

    const insightSection = getSection('COGNITIVE INSIGHT');
    const insightText = insightSection ? insightSection.replace(/COGNITIVE INSIGHT(\s*\**\s*)?/i, '').trim() : '';

    const anomaliesContent = getSection('ANOMALIES DETECTED');
    const actionsContent = getSection('RECOMMENDED ACTIONS');
    
    const anomalyList = anomaliesContent.split('\n').filter(l => l.trim().startsWith('-')).map(l => l.replace('-', '').trim());
    const actionList = actionsContent.split('\n').filter(l => l.trim().match(/^\d+\./)).map(l => l.replace(/^\d+\./, '').trim());

    return (
        <div className="bg-zinc-900/50 rounded-[32px] border border-white/10 p-6 md:p-8 my-4 space-y-6 font-sans animate-fade-in w-full shadow-2xl relative overflow-hidden ring-1 ring-accent/20">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none"></div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        </div>
    );
};

export const HanisahMechanicView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'CONSOLE' | 'UI_MATRIX'>('CONSOLE');
    const [health, setHealth] = useState<any>({ avgLatency: 0, memoryMb: 0, errorCount: 0 });
    const [providers, setProviders] = useState<ProviderStatus[]>([]);
    const [uiMatrix, setUiMatrix] = useState<Record<string, any>>(debugService.getUIMatrix());
    const { features } = useFeatures();
    
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
        const unsubscribeUI = debugService.subscribeUI((state) => setUiMatrix(state));

        // Background Polling ONLY if AUTO_DIAGNOSTICS is enabled
        let interval: any = null;
        if (features.AUTO_DIAGNOSTICS) {
            interval = setInterval(updateVitals, 2000);
        }

        return () => {
            if (interval) clearInterval(interval);
            unsubscribeUI();
        };
    }, [features.AUTO_DIAGNOSTICS]);

    useEffect(() => {
        if (activeTab === 'CONSOLE') {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, activeTab]);

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
        
        // This logAction call might be blocked if we disable our own buttons! 
        // But for Mechanic self-healing, we might allow it. 
        // For now, let's treat Mechanic controls as "Root" and bypass standard check? 
        // No, let's test the system. If user disables "Refresh Keys" button in Matrix, it should fail here.
        if (!debugService.logAction(uiId, FN_REGISTRY.MECH_EXECUTE_FIX, action)) return;

        debugService.log('INFO', 'MECHANIC', 'FIX_EXEC', `Initiating protocol: ${action}`);
        
        if (action === 'HARD_RESET') {
            if(confirm("PERINGATAN: System Reboot akan merefresh halaman.")) window.location.reload();
            return;
        }

        await new Promise(r => setTimeout(r, 800));
        const result = await executeMechanicTool({ args: { action } });
        debugService.log('INFO', 'MECHANIC', 'FIX_RESULT', result);
        
        if (action === 'REFRESH_KEYS') setProviders(KEY_MANAGER.getAllProviderStatuses());
        else if (action === 'CLEAR_LOGS') {
            setMessages(prev => [{ role: 'mechanic', text: "Logs cleared. Buffer reset." }]);
            debugService.clear(); 
        } else if (action === 'OPTIMIZE_MEMORY') setHealth(debugService.getSystemHealth());
    };

    const runHanisahDiagnosis = async () => {
        if (!debugService.logAction(UI_REGISTRY.MECH_BTN_SCAN, FN_REGISTRY.MECH_RUN_DIAGNOSIS, 'START')) return;
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

        if (!debugService.logAction(UI_REGISTRY.MECH_INPUT_CLI, FN_REGISTRY.MECH_CLI_EXEC, cmd)) return;

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

    const toggleUIElement = (id: string) => {
        const current = uiMatrix[id];
        const newStatus = current.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED';
        debugService.setUIStatus(id, newStatus);
    };

    const runGhostScan = () => {
        const count = debugService.runGhostScan();
        setMessages(prev => [...prev, { role: 'mechanic', text: `**UI_SCAN_COMPLETE**: ${count} anomalies flagged in UI Matrix.` }]);
        setActiveTab('UI_MATRIX');
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
                
                {/* Header Controls */}
                <div className="flex gap-3">
                    <div className="flex bg-white dark:bg-white/5 p-1 rounded-xl border border-black/5 dark:border-white/5">
                        <button onClick={() => setActiveTab('CONSOLE')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'CONSOLE' ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm' : 'text-neutral-500 hover:text-black dark:hover:text-white'}`}>
                            CONSOLE
                        </button>
                        <button onClick={() => setActiveTab('UI_MATRIX')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'UI_MATRIX' ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm' : 'text-neutral-500 hover:text-black dark:hover:text-white'}`}>
                            UI_MATRIX
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden min-h-0">
                
                {/* Left: Vitals & Tools */}
                <div className="w-full lg:w-1/3 flex flex-col gap-6 overflow-y-auto custom-scroll pr-2">
                    
                    <div className="grid grid-cols-2 gap-3">
                        <MetricRing label="LATENCY" value={health.avgLatency} max={2000} unit="ms" icon={<Network size={14}/>} />
                        <MetricRing label="MEMORY" value={health.memoryMb || 0} max={2000} unit="MB" icon={<HardDrive size={14}/>} />
                    </div>

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
                            <button onClick={runGhostScan} className="p-4 bg-zinc-50 dark:bg-white/5 hover:bg-amber-500 hover:text-white border border-black/5 dark:border-white/5 rounded-2xl text-[9px] font-black uppercase tracking-wider text-left transition-all flex items-center gap-3 group">
                                <MousePointer2 size={16} className="text-amber-500 group-hover:text-white transition-colors" /> 
                                <span>SCAN_GHOST_UI</span>
                                <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                            <button onClick={() => executeRepair('CLEAR_LOGS')} disabled={isProcessing} className="p-4 bg-zinc-50 dark:bg-white/5 hover:bg-red-500 hover:text-white border border-black/5 dark:border-white/5 rounded-2xl text-[9px] font-black uppercase tracking-wider text-left transition-all flex items-center gap-3 group">
                                <Trash2 size={16} className="text-red-500 group-hover:text-white transition-colors" /> 
                                <span>NUKE_LOG_BUFFER</span>
                                <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 bg-white dark:bg-[#0a0a0b] border border-black/5 dark:border-white/5 rounded-[32px] p-6 overflow-hidden flex flex-col shadow-sm">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-4 flex items-center gap-2">
                            <Server size={12} className="text-emerald-500" /> ACTIVE_NODES
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

                {/* Right: Console or UI Matrix */}
                <div className="flex-1 bg-terminal-void border border-black/5 dark:border-white/10 rounded-[32px] flex flex-col overflow-hidden relative shadow-2xl backdrop-blur-xl ring-1 ring-accent/20 terminal-scanlines">
                    
                    {/* Header Strip */}
                    <div className="h-12 bg-white/5 border-b border-white/5 flex items-center px-5 justify-between shrink-0 relative z-20">
                        <div className="flex gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.2)]"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50 shadow-[0_0_8px_rgba(234,179,8,0.2)]"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50 shadow-[0_0_8px_rgba(34,197,94,0.2)]"></div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest animate-pulse">
                                {activeTab === 'UI_MATRIX' ? 'UI_Governance_Protocol' : 'Neural_Link: Established'}
                            </span>
                            <span className="text-[8px] font-mono text-neutral-600 uppercase tracking-widest">shell_v13.5</span>
                        </div>
                    </div>

                    {activeTab === 'CONSOLE' ? (
                        <>
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
                            </div>
                        </>
                    ) : (
                        // UI MATRIX VIEW
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 relative z-20">
                            <div className="flex items-center gap-3 mb-6">
                                <LayoutGrid size={18} className="text-accent" />
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">INTERFACE_INTEGRITY_MATRIX</h3>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {Object.values(uiMatrix).map((el: any) => (
                                    <UIElementNode 
                                        key={el.id}
                                        id={el.id}
                                        status={el.status}
                                        errors={el.errorCount}
                                        usage={el.usageCount}
                                        onToggle={() => toggleUIElement(el.id)}
                                    />
                                ))}
                            </div>
                            
                            <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/5">
                                <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono">
                                    <Info size={12} className="text-accent" />
                                    <span>RED = Disabled (User Kill Switch) | YELLOW = Unstable (Auto-Flagged) | GREEN = Nominal</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};