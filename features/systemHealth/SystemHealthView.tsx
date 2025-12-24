import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    Activity, Terminal, ShieldCheck, Zap, AlertTriangle, 
    RefreshCw, Trash2, Cpu, Stethoscope, Search, 
    CheckCircle2, HardDrive, Network, Server, Database,
    Wifi, Power, Bug, Monitor, Volume2, 
    ChevronRight, ChevronDown, Play, Pause, ArrowRight, Key
} from 'lucide-react';
import { debugService } from '../../services/debugService';
import { KEY_MANAGER, type ProviderStatus } from '../../services/geminiService';
import { MELSA_KERNEL } from '../../services/melsaKernel';
import { speakWithMelsa } from '../../services/elevenLabsService';
import { type LogEntry } from '../../types';
import Markdown from 'react-markdown';
import { executeMechanicTool } from '../mechanic/mechanicTools';

// --- HELPER: JSON TREE VIEW ---
const JsonTree: React.FC<{ data: any; level?: number }> = ({ data, level = 0 }) => {
    const [expanded, setExpanded] = useState(level < 1);
    
    if (typeof data !== 'object' || data === null) {
        const valueColor = typeof data === 'string' ? 'text-emerald-400' : typeof data === 'number' ? 'text-orange-400' : 'text-purple-400';
        return <span className={`${valueColor} break-all`}>{JSON.stringify(data)}</span>;
    }

    const isArray = Array.isArray(data);
    const keys = Object.keys(data);
    const isEmpty = keys.length === 0;

    return (
        <div className="font-mono text-[10px] leading-relaxed ml-3 border-l border-black/5 dark:border-white/5 pl-1">
            <div 
                className={`flex items-center gap-1 cursor-pointer hover:text-black dark:hover:text-white ${isEmpty ? 'opacity-50 cursor-default' : 'text-neutral-500'}`} 
                onClick={() => !isEmpty && setExpanded(!expanded)}
            >
                {!isEmpty && (expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />)}
                <span className="text-neutral-500">{isArray ? '[' : '{'}</span>
                {!expanded && !isEmpty && <span className="text-neutral-400">...</span>}
                {isEmpty && <span className="text-neutral-500">{isArray ? ']' : '}'}</span>}
                {!isEmpty && !expanded && <span className="text-neutral-500">{isArray ? ']' : '}'}</span>}
                {!isEmpty && <span className="text-neutral-400 text-[8px] ml-2">({keys.length} items)</span>}
            </div>
            
            {expanded && !isEmpty && (
                <div className="my-0.5">
                    {keys.map((key) => (
                        <div key={key} className="flex items-start">
                            <span className="text-[var(--accent-color)] opacity-70 mr-2 shrink-0">{key}:</span>
                            <JsonTree data={data[key]} level={level + 1} />
                        </div>
                    ))}
                    <div className="text-neutral-500">{isArray ? ']' : '}'}</div>
                </div>
            )}
        </div>
    );
};

export const SystemHealthView: React.FC = () => {
    // Core Data
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [health, setHealth] = useState<any>({ avgLatency: 0, memoryMb: 0, errorCount: 0 });
    const [providers, setProviders] = useState<ProviderStatus[]>([]);
    
    // UI State
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TERMINAL' | 'MEMORY'>('TERMINAL');
    const [isScanning, setIsScanning] = useState(false);
    const [melsaDiagnosis, setMelsaDiagnosis] = useState<string | null>(null);
    const [storageUsage, setStorageUsage] = useState({ used: 0, percent: 0 });
    const [realPing, setRealPing] = useState<number | null>(null);
    
    // Hydraulic Rotation Animation
    const [isRotatingKeys, setIsRotatingKeys] = useState(false);

    // Terminal State
    const [logFilter, setLogFilter] = useState<string>('ALL');
    const [logSearch, setLogSearch] = useState<string>('');
    const [isAutoScroll, setIsAutoScroll] = useState(true);
    const [cliInput, setCliInput] = useState('');
    const logEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Memory State
    const [storageKeys, setStorageKeys] = useState<string[]>([]);
    const [selectedStorageKey, setSelectedStorageKey] = useState<string | null>(null);
    const [storageValue, setStorageValue] = useState<any>(null);

    // Device Info (Static)
    const deviceInfo = useRef({
        ua: navigator.userAgent,
        cores: navigator.hardwareConcurrency || 4,
        mem: (navigator as any).deviceMemory || 4, // Approx GB
        platform: navigator.platform,
        res: `${window.screen.width}x${window.screen.height}`
    });

    const executeRepair = async (action: string) => {
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
            setLogs([]); // Clear local state immediately
            debugService.clear(); // Ensure service is clear
        } else if (action === 'OPTIMIZE_MEMORY') {
            calcStorage();
            setHealth(debugService.getSystemHealth());
        }
    };

    const handleHydraRefresh = async () => {
        setIsRotatingKeys(true);
        await executeRepair('REFRESH_KEYS');
        setTimeout(() => setIsRotatingKeys(false), 1000);
    };

    const runMelsaDiagnosis = async () => {
        setIsScanning(true);
        setMelsaDiagnosis(null);
        
        try {
            debugService.log('INFO', 'MECHANIC', 'SCAN_INIT', 'Running full system diagnostics...');
            
            // CALL THE REAL TOOL TO GET DATA
            const toolResultJson = await executeMechanicTool({ args: { action: 'GET_DIAGNOSTICS' } });
            
            // Log raw telemetry to terminal for user visibility
            try {
                const telemetry = JSON.parse(toolResultJson);
                debugService.log('TRACE', 'MECHANIC', 'TELEMETRY', 'System Vital Signs', telemetry);
            } catch(e) {
                debugService.log('INFO', 'MECHANIC', 'RAW_DATA', toolResultJson);
            }
            
            const prompt = `[ROLE: MELSA_SYSTEM_MECHANIC]\nAnalisa data telemetri (CPU, RAM, Latency).\nBerikan laporan performa sistem gaya Cyberpunk.\n\n[RAW_DATA]\n${toolResultJson}\n\nFORMAT:\n1. **SYSTEM INTEGRITY**: (SCORE %)\n2. **METRICS SUMMARY**: (CPU/Mem/Net Status)\n3. **ANOMALIES**: (List - be specific)\n4. **OPTIMIZATION**: (Actionable steps)`;
            
            const response = await MELSA_KERNEL.execute(prompt, 'gemini-3-flash-preview', "System Diagnostic Context");
            setMelsaDiagnosis(response.text || "Diagnostic matrix failed to render.");
            debugService.log('INFO', 'MECHANIC', 'SCAN_COMPLETE', 'Diagnosis generated successfully.');
        } catch (e: any) {
            console.error(e);
            const errMsg = `⚠️ Neural Link Interrupted. ${e.message}`;
            setMelsaDiagnosis(errMsg);
            debugService.log('ERROR', 'MECHANIC', 'SCAN_FAIL', errMsg);
        } finally {
            setIsScanning(false);
        }
    };

    // Auto-Run Protocols on Mount
    useEffect(() => {
        // Run optimization first
        setTimeout(() => {
            executeRepair('OPTIMIZE_MEMORY');
        }, 500);

        // Refresh Keys & Check Cooldowns (Hydra Engine Cycle)
        setTimeout(() => {
            executeRepair('REFRESH_KEYS');
        }, 1200);
    }, []);

    // Subscribe to Data Sources
    useEffect(() => {
        setLogs(debugService.getLogs());
        setHealth(debugService.getSystemHealth());
        setProviders(KEY_MANAGER.getAllProviderStatuses());
        calcStorage();
        updateStorageList();

        const interval = setInterval(() => {
            setHealth(debugService.getSystemHealth());
            setProviders(KEY_MANAGER.getAllProviderStatuses());
            calcStorage();
        }, 3000);

        const unsubscribe = debugService.subscribe((newLogs) => {
            setLogs(newLogs);
        });

        return () => {
            clearInterval(interval);
            unsubscribe();
        };
    }, []);

    // Auto-scroll logic for Terminal
    useEffect(() => {
        if (activeTab === 'TERMINAL' && isAutoScroll && logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, activeTab, isAutoScroll]);

    // Auto-resize CLI input
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
        }
    }, [cliInput]);

    const calcStorage = () => {
        try {
            let total = 0;
            for (const x in localStorage) {
                if (!localStorage.hasOwnProperty(x)) continue;
                total += ((localStorage[x].length + x.length) * 2);
            }
            const limit = 5 * 1024 * 1024;
            const percent = Math.min((total / limit) * 100, 100);
            setStorageUsage({ used: total, percent });
        } catch(e) {}
    };

    const updateStorageList = () => {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('app_') || k === 'chat_threads' || k === 'notes' || k.includes('config') || k.includes('voice'));
        setStorageKeys(keys.sort());
    };

    const loadStorageValue = (key: string) => {
        setSelectedStorageKey(key);
        try {
            const raw = localStorage.getItem(key);
            setStorageValue(raw ? JSON.parse(raw) : null);
        } catch (e) {
            setStorageValue("Raw String: " + localStorage.getItem(key));
        }
    };

    const runPingTest = async () => {
        setRealPing(null);
        const start = Date.now();
        try {
            await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors', cache: 'no-store' });
            const duration = Date.now() - start;
            setRealPing(duration);
            debugService.log('TRACE', 'NETWORK', 'PING', `External Uplink Latency: ${duration}ms`);
        } catch (e) {
            setRealPing(-1);
            debugService.log('WARN', 'NETWORK', 'PING_FAIL', 'External Uplink Unreachable');
        }
    };

    const readDiagnosis = () => {
        if (melsaDiagnosis) {
            speakWithMelsa(melsaDiagnosis.replace(/[*#_`]/g, ''));
        }
    };

    const handleCLI = async (e: React.FormEvent) => {
        e.preventDefault();
        const cmd = cliInput.trim().toLowerCase();
        if (!cmd) return;
        debugService.log('INFO', 'CLI', 'EXEC', `> ${cmd}`);
        
        // CLI Mapping to Tools
        switch (cmd) {
            case 'clear': executeRepair('CLEAR_LOGS'); break;
            case 'refresh_keys': executeRepair('REFRESH_KEYS'); break;
            case 'optimize': executeRepair('OPTIMIZE_MEMORY'); break;
            case 'diagnose': runMelsaDiagnosis(); break;
            case 'nuke_storage': if(confirm('WARNING: WIPE ALL LOCAL DATA?')) { localStorage.clear(); window.location.reload(); } break;
            case 'reload': window.location.reload(); break;
            default: debugService.log('WARN', 'CLI', 'UKN', `Command unknown: ${cmd}`);
        }
        setCliInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleCLI(e as any);
        }
    };

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesFilter = logFilter === 'ALL' || log.level === logFilter;
            const matchesSearch = logSearch === '' || JSON.stringify(log).toLowerCase().includes(logSearch.toLowerCase());
            return matchesFilter && matchesSearch;
        });
    }, [logs, logFilter, logSearch]);

    const getLevelBadge = (level: string) => {
        const baseClass = "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border";
        switch (level) {
            case 'ERROR': return `${baseClass} bg-red-500/10 border-red-500/30 text-red-500`;
            case 'WARN': return `${baseClass} bg-amber-500/10 border-amber-500/30 text-amber-500`;
            case 'INFO': return `${baseClass} bg-blue-500/10 border-blue-500/30 text-blue-500`;
            case 'KERNEL': return `${baseClass} bg-purple-500/10 border-purple-500/30 text-purple-500`;
            case 'TRACE': return `${baseClass} bg-zinc-500/10 border-zinc-500/30 text-zinc-500`;
            default: return `${baseClass} bg-zinc-500/10 border-zinc-500/30 text-zinc-500`;
        }
    };

    return (
        <div className="min-h-full flex flex-col p-4 md:p-10 pb-40 animate-fade-in custom-scroll">
            <div className="max-w-[1600px] mx-auto w-full space-y-8 h-full flex flex-col">
                
                {/* HEADER */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-black/5 dark:border-white/5 pb-6 shrink-0">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-[var(--accent-color)] rounded-full animate-pulse shadow-[0_0_10px_var(--accent-glow)]"></div>
                            <span className="tech-mono text-[9px] font-black uppercase tracking-[0.4em] text-neutral-500">SYSTEM_INTEGRITY_MODULE_v13.5</span>
                        </div>
                        <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-black dark:text-white leading-none">
                            MELSA <span className="text-[var(--accent-color)]">MECHANIC</span>
                        </h2>
                    </div>
                    
                    <div className="flex bg-zinc-100 dark:bg-white/5 p-1 rounded-xl border border-black/5 dark:border-white/5">
                        {['OVERVIEW', 'TERMINAL', 'MEMORY'].map((tab) => (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                    activeTab === tab 
                                    ? 'bg-white dark:bg-[#0a0a0b] text-[var(--accent-color)] shadow-sm' 
                                    : 'text-neutral-500 hover:text-black dark:hover:text-white'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </header>

                {/* --- OVERVIEW TAB --- */}
                {activeTab === 'OVERVIEW' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 animate-slide-up">
                        <div className="lg:col-span-8 space-y-6">
                            {/* Vitals */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <VitalsCard label="LATENCY" value={`${health.avgLatency}ms`} icon={<Network size={18} />} status={health.avgLatency > 1000 ? 'danger' : 'good'} subtext="API_RESPONSE" />
                                <VitalsCard label="HEAP_MEM" value={`${health.memoryMb || 'N/A'}MB`} icon={<HardDrive size={18} />} status={health.memoryMb > 800 ? 'warning' : 'good'} subtext="ALLOCATED_RAM" />
                                <VitalsCard label="ERROR_LOG" value={`${health.errorCount}`} icon={<Bug size={18} />} status={health.errorCount > 5 ? 'danger' : 'good'} subtext="SESSION_ERRORS" />
                                <div onClick={runPingTest} className="cursor-pointer group p-6 rounded-[24px] border border-black/5 dark:border-white/5 bg-white dark:bg-[#0a0a0b] hover:border-accent/30 transition-all flex flex-col justify-between">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 rounded-xl bg-zinc-100 dark:bg-white/5 text-neutral-400 group-hover:text-accent transition-colors"><Wifi size={18}/></div>
                                        <div className={`w-2 h-2 rounded-full ${realPing === -1 ? 'bg-red-500' : 'bg-emerald-500'} ${!realPing && 'animate-pulse'}`}></div>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-1">NET_PING</p>
                                        <p className="text-3xl font-black italic tracking-tighter dark:text-white">{realPing === null ? 'TEST' : realPing === -1 ? 'ERR' : `${realPing}ms`}</p>
                                        <p className="text-[7px] tech-mono font-bold text-neutral-400 mt-2">TAP_TO_MEASURE</p>
                                    </div>
                                </div>
                            </div>

                            {/* Hydra Status */}
                            <div className="bg-white dark:bg-[#0a0a0b] rounded-[32px] border border-black/5 dark:border-white/5 overflow-hidden">
                                <div className="p-6 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-zinc-50 dark:bg-white/[0.02]">
                                    <div className="flex items-center gap-3">
                                        <Server size={18} className="text-[var(--accent-color)]" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">HYDRA_ENGINE_STATUS</span>
                                    </div>
                                    <button 
                                        onClick={handleHydraRefresh} 
                                        className={`p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-neutral-400 hover:text-[var(--accent-color)] transition-all ${isRotatingKeys ? 'animate-spin text-accent' : ''}`} 
                                        title="Force Refresh Keys"
                                    >
                                        <RefreshCw size={14} />
                                    </button>
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {providers.map(p => (
                                        <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/5 transition-all hover:bg-zinc-100 dark:hover:bg-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${p.status === 'HEALTHY' ? 'bg-emerald-500' : p.status === 'COOLDOWN' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`}></div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-wider dark:text-white">{p.id}</p>
                                                    <p className="text-[8px] tech-mono text-neutral-500">{p.status === 'COOLDOWN' ? `COOLDOWN: ${p.cooldownRemaining}m` : 'OPERATIONAL'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-lg font-black italic text-[var(--accent-color)]">{p.keyCount}</span>
                                                <p className="text-[7px] font-bold text-neutral-500 uppercase">KEYS_IN_POOL</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Storage & Device */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-6 bg-white dark:bg-[#0a0a0b] rounded-[32px] border border-black/5 dark:border-white/5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Database size={18} className="text-purple-500" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">STORAGE_CORE</span>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <span className="text-2xl font-black italic dark:text-white">{storageUsage.percent.toFixed(1)}%</span>
                                            <span className="text-[9px] tech-mono text-neutral-500">{(storageUsage.used / 1024).toFixed(1)}KB / 5MB</span>
                                        </div>
                                        <div className="h-2 w-full bg-zinc-100 dark:bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-purple-500 transition-all duration-1000" style={{ width: `${storageUsage.percent}%` }}></div>
                                        </div>
                                        <p className="text-[8px] text-neutral-400 font-medium">Local Storage persistence active.</p>
                                    </div>
                                </div>
                                <div className="p-6 bg-white dark:bg-[#0a0a0b] rounded-[32px] border border-black/5 dark:border-white/5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Monitor size={18} className="text-blue-500" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">DEVICE_FINGERPRINT</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><p className="text-[8px] font-bold text-neutral-500 uppercase">PLATFORM</p><p className="text-xs font-black dark:text-white truncate">{deviceInfo.current.platform}</p></div>
                                        <div><p className="text-[8px] font-bold text-neutral-500 uppercase">RESOLUTION</p><p className="text-xs font-black dark:text-white">{deviceInfo.current.res}</p></div>
                                        <div><p className="text-[8px] font-bold text-neutral-500 uppercase">LOGICAL CORES</p><p className="text-xs font-black dark:text-white">{deviceInfo.current.cores}</p></div>
                                        <div><p className="text-[8px] font-bold text-neutral-500 uppercase">MEMORY (EST)</p><p className="text-xs font-black dark:text-white">~{deviceInfo.current.mem} GB</p></div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <RepairButton icon={<Trash2 />} label="FLUSH MEMORY" onClick={() => executeRepair('OPTIMIZE_MEMORY')} />
                                <RepairButton icon={<RefreshCw />} label="ROTATE KEYS" onClick={() => executeRepair('REFRESH_KEYS')} />
                                <RepairButton icon={<ShieldCheck />} label="CLEAR LOGS" onClick={() => executeRepair('CLEAR_LOGS')} />
                                <RepairButton icon={<Power />} label="FORCE REBOOT" onClick={() => executeRepair('HARD_RESET')} danger />
                            </div>
                        </div>

                        {/* Diagnostics Panel */}
                        <div className="lg:col-span-4 flex flex-col h-full bg-white dark:bg-[#0a0a0b] rounded-[32px] border border-black/5 dark:border-white/5 overflow-hidden shadow-xl">
                            <div className="p-6 border-b border-black/5 dark:border-white/5 bg-[var(--accent-color)]/5 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <Stethoscope size={20} className="text-[var(--accent-color)]" />
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] dark:text-white">MELSA_DIAGNOSTICS</h3>
                                </div>
                                {melsaDiagnosis && <button onClick={readDiagnosis} className="p-2 bg-white/10 rounded-full hover:text-[var(--accent-color)] transition-colors text-neutral-500"><Volume2 size={16} /></button>}
                            </div>
                            <div className="flex-1 p-6 relative overflow-y-auto custom-scroll">
                                {melsaDiagnosis ? (
                                    <div className="prose dark:prose-invert prose-sm max-w-none animate-slide-up text-xs font-medium leading-relaxed"><Markdown>{melsaDiagnosis}</Markdown></div>
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 text-center p-8 space-y-4">
                                        <Activity size={48} className="text-neutral-500" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500">SYSTEM_IDLE</p>
                                    </div>
                                )}
                            </div>
                            <div className="p-4 border-t border-black/5 dark:border-white/5 bg-zinc-50 dark:bg-white/[0.02]">
                                <button onClick={runMelsaDiagnosis} disabled={isScanning} className={`w-full py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.3em] flex items-center justify-center gap-3 transition-all ${isScanning ? 'bg-zinc-200 dark:bg-white/10 text-neutral-500' : 'bg-[var(--accent-color)] text-on-accent shadow-lg hover:shadow-[0_0_20px_var(--accent-glow)]'}`}>
                                    {isScanning ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />} {isScanning ? 'RUNNING_ANALYSIS...' : 'START_DIAGNOSIS'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TERMINAL TAB --- */}
                {activeTab === 'TERMINAL' && (
                    <div className="flex-1 bg-[#050505] rounded-[32px] border border-white/10 flex flex-col shadow-2xl relative overflow-hidden font-mono animate-slide-up">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-cyan-500 z-10"></div>
                        
                        {/* Toolbar */}
                        <div className="p-3 border-b border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-md">
                            <div className="flex items-center gap-4">
                                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-neutral-400 flex items-center gap-2"><Terminal size={12} /> KERNEL_STREAM</span>
                                <div className="h-4 w-[1px] bg-white/10"></div>
                                <div className="flex items-center gap-2">
                                    <Search size={12} className="text-neutral-600"/>
                                    <input value={logSearch} onChange={e => setLogSearch(e.target.value)} placeholder="GREP..." className="bg-transparent border-none text-[10px] text-white focus:outline-none uppercase w-24 placeholder:text-neutral-700"/>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <select value={logFilter} onChange={e => setLogFilter(e.target.value)} className="bg-black border border-white/10 rounded px-2 py-1 text-[9px] text-neutral-400 focus:outline-none uppercase">
                                    <option value="ALL">ALL LEVELS</option>
                                    <option value="ERROR">ERROR</option>
                                    <option value="WARN">WARN</option>
                                    <option value="INFO">INFO</option>
                                </select>
                                <button onClick={() => setIsAutoScroll(!isAutoScroll)} className={`p-1.5 rounded border transition-all ${!isAutoScroll ? 'bg-amber-500/20 border-amber-500/50 text-amber-500' : 'border-white/10 text-neutral-500 hover:text-white'}`}>{isAutoScroll ? <Pause size={10} /> : <Play size={10} />}</button>
                                <button onClick={() => executeRepair('CLEAR_LOGS')} className="p-1.5 rounded border border-white/10 text-neutral-500 hover:text-red-500 transition-all"><Trash2 size={10}/></button>
                            </div>
                        </div>

                        {/* Logs */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scroll text-[10px]">
                            {filteredLogs.map(log => (
                                <div key={log.id} className="flex flex-col gap-1 p-1.5 hover:bg-white/5 rounded transition-colors group">
                                    <div className={`flex gap-3 ${log.level === 'ERROR' ? 'text-red-400' : log.level === 'WARN' ? 'text-amber-400' : log.level === 'TRACE' ? 'text-neutral-500' : 'text-emerald-400'}`}>
                                        <span className="opacity-50 shrink-0 font-mono">[{log.timestamp.split('T')[1].replace('Z','')}]</span>
                                        <div className={getLevelBadge(log.level)}>{log.level}</div>
                                        <span className="font-bold shrink-0 w-24 text-right opacity-70 uppercase">{log.layer}</span>
                                        <span className="break-all flex-1 text-neutral-300 font-mono">{log.message}</span>
                                    </div>
                                    {log.payload && Object.keys(log.payload).length > 0 && (
                                        <div className="pl-24 ml-2 border-l border-white/10 hidden group-hover:block">
                                            <JsonTree data={log.payload} />
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div ref={logEndRef} />
                        </div>

                        {/* CLI Input */}
                        <div className="p-3 bg-[#0a0a0b] border-t border-white/10">
                            <div className="relative flex items-end group">
                                <span className="absolute left-3 top-3.5 text-[var(--accent-color)] font-black text-xs animate-pulse">{'>'}</span>
                                <textarea
                                    ref={inputRef}
                                    value={cliInput}
                                    onChange={e => setCliInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="ENTER_COMMAND..."
                                    rows={1}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-8 pr-12 text-[11px] text-white focus:outline-none focus:border-[var(--accent-color)]/50 focus:bg-white/10 transition-all font-mono placeholder:text-neutral-700 resize-none overflow-hidden min-h-[42px]"
                                />
                                <button 
                                    onClick={(e) => handleCLI(e as any)} 
                                    disabled={!cliInput} 
                                    className="absolute right-2 bottom-2 p-1.5 bg-white/10 rounded-lg text-neutral-400 hover:text-white hover:bg-[var(--accent-color)]/20 transition-all disabled:opacity-0"
                                >
                                    <ArrowRight size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- MEMORY TAB --- */}
                {activeTab === 'MEMORY' && (
                    <div className="flex-1 bg-white dark:bg-[#0a0a0b] rounded-[32px] border border-black/5 dark:border-white/5 flex overflow-hidden shadow-lg animate-slide-up">
                        <div className="w-1/3 border-r border-black/5 dark:border-white/5 overflow-y-auto custom-scroll p-2 bg-zinc-50 dark:bg-black/20">
                            <div className="flex justify-between items-center p-3 mb-2">
                                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500">STORAGE_KEYS</h3>
                                <button onClick={updateStorageList} className="text-neutral-400 hover:text-accent"><RefreshCw size={12} /></button>
                            </div>
                            {storageKeys.map(k => (
                                <button key={k} onClick={() => loadStorageValue(k)} className={`w-full text-left px-3 py-3 rounded-lg text-[9px] font-mono truncate transition-all mb-1 ${selectedStorageKey === k ? 'bg-[var(--accent-color)]/10 text-[var(--accent-color)] border border-[var(--accent-color)]/20' : 'text-neutral-500 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white'}`}>
                                    {k}
                                </button>
                            ))}
                        </div>
                        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#0d0d0e]">
                            {selectedStorageKey ? (
                                <>
                                    <div className="p-4 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-zinc-50 dark:bg-white/[0.01]">
                                        <div className="flex items-center gap-3">
                                            <Key size={14} className="text-accent" />
                                            <span className="text-[10px] font-bold text-black dark:text-white uppercase tracking-wider truncate mr-2">{selectedStorageKey}</span>
                                        </div>
                                        <button onClick={() => { localStorage.removeItem(selectedStorageKey); updateStorageList(); setSelectedStorageKey(null); }} className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors border border-transparent hover:border-red-500/20" title="Delete Key"><Trash2 size={16} /></button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-6 custom-scroll">
                                        <JsonTree data={storageValue} />
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 opacity-50 gap-4">
                                    <Database size={48} strokeWidth={1} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">SELECT_DATA_NODE</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const VitalsCard: React.FC<{ label: string, value: string, icon: React.ReactNode, status: 'good'|'warning'|'danger', subtext: string }> = ({ label, value, icon, status, subtext }) => (
    <div className={`p-6 rounded-[24px] border flex flex-col justify-between h-full transition-all ${status === 'danger' ? 'bg-red-500/5 border-red-500/20' : status === 'warning' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-white dark:bg-[#0a0a0b] border-black/5 dark:border-white/5'}`}>
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-xl ${status === 'danger' ? 'bg-red-500/10 text-red-500' : 'bg-zinc-100 dark:bg-white/5 text-neutral-400'}`}>{icon}</div>
            <div className={`w-2 h-2 rounded-full ${status === 'danger' ? 'bg-red-500 animate-ping' : status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
        </div>
        <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-1">{label}</p>
            <p className="text-3xl font-black italic tracking-tighter dark:text-white">{value}</p>
            <p className="text-[7px] tech-mono font-bold text-neutral-400 mt-2">{subtext}</p>
        </div>
    </div>
);

const RepairButton: React.FC<{ icon: React.ReactNode, label: string, onClick: () => Promise<void>, danger?: boolean }> = ({ icon, label, onClick, danger }) => {
    const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS'>('IDLE');

    const handleClick = async () => {
        if (status !== 'IDLE') return;
        setStatus('LOADING');
        await onClick();
        setStatus('SUCCESS');
        setTimeout(() => setStatus('IDLE'), 2000);
    };

    return (
        <button 
            onClick={handleClick} 
            className={`flex flex-col items-center justify-center gap-3 p-6 rounded-[24px] border transition-all hover:scale-[1.02] active:scale-95 relative overflow-hidden ${
                danger 
                ? 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10 text-red-500' 
                : 'bg-white dark:bg-[#0a0a0b] border-black/5 dark:border-white/5 hover:border-[var(--accent-color)]/30 hover:text-[var(--accent-color)] text-neutral-500'
            }`}
        >
            {/* Success Overlay */}
            <div className={`absolute inset-0 flex flex-col items-center justify-center bg-emerald-500 text-white transition-all duration-300 ${status === 'SUCCESS' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <CheckCircle2 size={24} className="animate-bounce" />
                <span className="text-[8px] font-black uppercase tracking-widest mt-2">DONE</span>
            </div>

            <div className={`transition-all duration-300 flex flex-col items-center gap-3 ${status === 'SUCCESS' ? 'opacity-0' : 'opacity-100'}`}>
                {status === 'LOADING' ? <RefreshCw size={20} className="animate-spin" /> : React.cloneElement(icon as React.ReactElement, { size: 20 })}
                <span className="text-[8px] font-black uppercase tracking-widest text-center leading-tight">{label}</span>
            </div>
        </button>
    );
};