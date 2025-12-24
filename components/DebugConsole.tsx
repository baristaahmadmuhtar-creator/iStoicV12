
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { debugService } from '../services/debugService';
import { LogEntry } from '../types';
import { 
    X, Terminal, Trash2, Activity, Search, Cpu, Wifi, Layers, 
    AlertTriangle, Maximize2, Minimize2, Copy, Play, Pause, 
    ChevronRight, ChevronDown, Command, ArrowRight
} from 'lucide-react';

// --- SUB-COMPONENT: JSON INSPECTOR ---
const JsonTree: React.FC<{ data: any; level?: number }> = ({ data, level = 0 }) => {
    const [expanded, setExpanded] = useState(level < 1);
    
    if (typeof data !== 'object' || data === null) {
        return <span className="text-emerald-400">{JSON.stringify(data)}</span>;
    }

    const isArray = Array.isArray(data);
    const keys = Object.keys(data);
    const isEmpty = keys.length === 0;

    return (
        <div className="font-mono text-[10px] leading-relaxed ml-2">
            <div 
                className={`flex items-center gap-1 cursor-pointer hover:text-white ${isEmpty ? 'opacity-50 cursor-default' : 'text-neutral-400'}`} 
                onClick={() => !isEmpty && setExpanded(!expanded)}
            >
                {!isEmpty && (expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />)}
                <span className="text-purple-400">{isArray ? '[' : '{'}</span>
                {!expanded && !isEmpty && <span className="text-neutral-600">...</span>}
                {isEmpty && <span className="text-purple-400">{isArray ? ']' : '}'}</span>}
                {!isEmpty && !expanded && <span className="text-purple-400">{isArray ? ']' : '}'}</span>}
                {!isEmpty && <span className="text-neutral-600 text-[8px] ml-2">({keys.length} items)</span>}
            </div>
            
            {expanded && !isEmpty && (
                <div className="border-l border-white/5 pl-2 my-1">
                    {keys.map((key) => (
                        <div key={key} className="flex items-start">
                            <span className="text-cyan-600 mr-2 opacity-80">{key}:</span>
                            <JsonTree data={data[key]} level={level + 1} />
                        </div>
                    ))}
                    <div className="text-purple-400">{isArray ? ']' : '}'}</div>
                </div>
            )}
        </div>
    );
};

export const DebugConsole: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [filter, setFilter] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'LOGS' | 'SYSTEM'>('LOGS');
    const [health, setHealth] = useState<any>({ avgLatency: 0, memoryMb: 0, errorCount: 0 });
    
    // UX States
    const [isExpanded, setIsExpanded] = useState(false);
    const [isAutoScroll, setIsAutoScroll] = useState(true);
    const [cliInput, setCliInput] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        setLogs(debugService.getLogs());
        
        const statInterval = setInterval(() => {
            setHealth(debugService.getSystemHealth());
        }, 1000);

        const sub = debugService.subscribe((newLogs) => {
            setLogs(newLogs);
        });

        return () => {
            clearInterval(statInterval);
            sub();
        };
    }, [isOpen]);

    // Auto-scroll logic
    useEffect(() => {
        if (isAutoScroll && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, isAutoScroll, activeTab]);

    const handleCopyLog = (log: LogEntry) => {
        navigator.clipboard.writeText(`[${log.timestamp}] [${log.level}] ${log.message}\n${JSON.stringify(log.payload)}`);
    };

    const handleCLI = (e: React.FormEvent) => {
        e.preventDefault();
        const cmd = cliInput.trim().toLowerCase();
        if (!cmd) return;

        debugService.log('INFO', 'CLI', 'EXEC', `> ${cmd}`);

        switch (cmd) {
            case 'clear':
            case 'cls':
                debugService.clear();
                break;
            case 'help':
                debugService.log('INFO', 'CLI', 'HELP', 'Available: clear, refresh, ping, mock_error');
                break;
            case 'refresh':
                window.location.reload();
                break;
            case 'ping':
                debugService.log('INFO', 'CLI', 'PONG', 'System is responsive.');
                break;
            case 'mock_error':
                debugService.log('ERROR', 'MOCK', 'TEST', 'This is a simulated critical failure.');
                break;
            default:
                debugService.log('WARN', 'CLI', 'XB404', `Command not recognized: ${cmd}`);
        }
        setCliInput('');
    };

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesFilter = filter === 'ALL' || log.level === filter;
            const matchesSearch = searchQuery === '' || 
                log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.layer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.code.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesFilter && matchesSearch;
        });
    }, [logs, filter, searchQuery]);

    const getLevelStyle = (level: string) => {
        switch (level) {
            case 'ERROR': return 'text-red-500 bg-red-500/5 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]';
            case 'WARN': return 'text-amber-500 bg-amber-500/5 border-amber-500/20';
            case 'KERNEL': return 'text-purple-400 bg-purple-500/5 border-purple-500/20';
            case 'TRACE': return 'text-zinc-500 bg-transparent border-transparent italic';
            default: return 'text-cyan-400 bg-cyan-500/5 border-cyan-500/20';
        }
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-y-0 right-0 bg-[#080809]/95 backdrop-blur-2xl border-l border-white/10 z-[9000] shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col transition-all duration-300 ease-out tech-mono font-mono ${isExpanded ? 'w-full md:w-[90vw]' : 'w-full md:w-[500px]'}`}>
            
            {/* --- HEADER --- */}
            <header className="h-14 px-4 border-b border-white/5 flex items-center justify-between bg-black/40 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent animate-pulse-slow">
                        <Terminal size={16} />
                    </div>
                    <div>
                        <h2 className="text-[10px] font-black tracking-[0.2em] text-white uppercase leading-none">SYS_DIAGNOSTICS</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${health.errorCount > 0 ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`}></span>
                            <span className="text-[8px] text-neutral-500 font-bold tracking-wider">
                                {health.errorCount > 0 ? 'CRITICAL_ERRORS_DETECTED' : 'SYSTEM_NOMINAL'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 hover:bg-white/10 rounded-lg text-neutral-500 hover:text-white transition-all hidden md:block" title={isExpanded ? "Collapse" : "Expand"}>
                        {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                    <button onClick={onClose} className="p-2 hover:bg-red-500/20 rounded-lg text-neutral-500 hover:text-red-500 transition-all">
                        <X size={18} />
                    </button>
                </div>
            </header>

            {/* --- TOOLBAR --- */}
            <div className="p-3 border-b border-white/5 bg-white/[0.02] space-y-3 shrink-0">
                <div className="flex gap-2">
                    <button onClick={() => setActiveTab('LOGS')} className={`flex-1 py-2 text-[9px] font-black tracking-widest rounded-lg border transition-all ${activeTab === 'LOGS' ? 'bg-accent/10 border-accent/30 text-accent' : 'border-transparent text-neutral-500 hover:text-white hover:bg-white/5'}`}>EVENT_LOG</button>
                    <button onClick={() => setActiveTab('SYSTEM')} className={`flex-1 py-2 text-[9px] font-black tracking-widest rounded-lg border transition-all ${activeTab === 'SYSTEM' ? 'bg-accent/10 border-accent/30 text-accent' : 'border-transparent text-neutral-500 hover:text-white hover:bg-white/5'}`}>SYSTEM_HEALTH</button>
                </div>
                
                {activeTab === 'LOGS' && (
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={12} />
                            <input 
                                type="text" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="GREP_LOGS..." 
                                className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-[10px] text-white focus:outline-none focus:border-accent/50 placeholder:text-neutral-700 uppercase tracking-wide"
                            />
                        </div>
                        <button 
                            onClick={() => setIsAutoScroll(!isAutoScroll)} 
                            className={`p-2 rounded-lg border transition-all ${!isAutoScroll ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' : 'border-white/10 text-neutral-500 hover:text-white'}`}
                            title={isAutoScroll ? "Pause Scrolling" : "Resume Scrolling"}
                        >
                            {isAutoScroll ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                        <button onClick={() => debugService.clear()} className="p-2 rounded-lg border border-white/10 text-neutral-500 hover:text-red-500 hover:border-red-500/30 transition-all" title="Clear Logs">
                            <Trash2 size={14} />
                        </button>
                    </div>
                )}
            </div>

            {/* --- MAIN CONTENT AREA --- */}
            {activeTab === 'LOGS' ? (
                <div 
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto p-2 space-y-1 custom-scroll bg-black/20"
                >
                    {filteredLogs.map((log) => (
                        <div key={log.id} className={`p-3 rounded-lg border text-[10px] leading-relaxed group relative transition-all duration-300 ${getLevelStyle(log.level)}`}>
                            <div className="flex justify-between items-start gap-3">
                                <div className="flex items-center gap-2 font-black tracking-wider opacity-70 shrink-0">
                                    <span className="opacity-50 font-normal">{log.timestamp.split('T')[1].slice(0, -1)}</span>
                                    <span>[{log.level}]</span>
                                    <span className="px-1.5 py-0.5 rounded bg-black/20 border border-black/10 uppercase">{log.layer}</span>
                                </div>
                                <button onClick={() => handleCopyLog(log)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-black/20 rounded text-current transition-opacity">
                                    <Copy size={10} />
                                </button>
                            </div>
                            
                            <p className="mt-1 font-medium break-words opacity-90">{log.message}</p>
                            
                            {log.payload && Object.keys(log.payload).length > 0 && (
                                <div className="mt-2 bg-black/30 rounded border border-white/5 p-2 overflow-x-auto">
                                    <JsonTree data={log.payload} />
                                </div>
                            )}
                        </div>
                    ))}
                    <div ref={bottomRef} className="h-4" />
                    
                    {filteredLogs.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-neutral-700 gap-3 opacity-50 py-20">
                            <Terminal size={40} />
                            <span className="text-[10px] uppercase tracking-[0.3em]">NO_DATA_STREAM</span>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto p-6 custom-scroll space-y-8">
                    {/* Health Dashboard */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Wifi size={48} /></div>
                            <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-1">NETWORK_LATENCY</p>
                            <p className="text-3xl font-black text-white mb-4">{health.avgLatency}<span className="text-sm text-neutral-600 ml-1">ms</span></p>
                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-accent transition-all duration-500" style={{ width: `${Math.min(health.avgLatency / 10, 100)}%` }}></div>
                            </div>
                        </div>
                        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Layers size={48} /></div>
                            <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-1">HEAP_ALLOCATION</p>
                            <p className="text-3xl font-black text-white mb-4">{health.memoryMb || 0}<span className="text-sm text-neutral-600 ml-1">MB</span></p>
                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${Math.min((health.memoryMb / 200) * 100, 100)}%` }}></div>
                            </div>
                        </div>
                    </div>

                    <div className={`p-6 rounded-2xl border ${health.errorCount > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${health.errorCount > 0 ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h3 className={`text-lg font-black uppercase tracking-tight ${health.errorCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {health.errorCount > 0 ? 'SYSTEM UNSTABLE' : 'ALL SYSTEMS GO'}
                                </h3>
                                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-1">
                                    {health.errorCount} EXCEPTIONS CAUGHT
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-[10px] text-neutral-500 font-black uppercase tracking-[0.2em] border-b border-white/5 pb-2">ENVIRONMENT_VARS</h3>
                        <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
                            <div className="p-3 bg-white/5 rounded border border-white/5">
                                <span className="text-neutral-500 block mb-1">PLATFORM</span>
                                <span className="text-white">{navigator.platform}</span>
                            </div>
                            <div className="p-3 bg-white/5 rounded border border-white/5">
                                <span className="text-neutral-500 block mb-1">CORES</span>
                                <span className="text-white">{navigator.hardwareConcurrency || 'N/A'}</span>
                            </div>
                            <div className="p-3 bg-white/5 rounded border border-white/5 col-span-2">
                                <span className="text-neutral-500 block mb-1">USER_AGENT</span>
                                <span className="text-white break-all">{navigator.userAgent}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CLI FOOTER --- */}
            <div className="p-3 bg-black/60 border-t border-white/10 shrink-0">
                <form onSubmit={handleCLI} className="relative flex items-center">
                    <span className="absolute left-3 text-accent font-black text-xs animate-pulse">{'>'}</span>
                    <input 
                        type="text" 
                        value={cliInput}
                        onChange={(e) => setCliInput(e.target.value)}
                        placeholder="ENTER_COMMAND..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-8 pr-12 text-[11px] text-white focus:outline-none focus:border-accent/50 focus:bg-white/5 transition-all font-mono placeholder:text-neutral-700"
                    />
                    <button type="submit" disabled={!cliInput} className="absolute right-2 p-1.5 bg-white/10 rounded-lg text-neutral-400 hover:text-white hover:bg-accent/20 transition-all disabled:opacity-0">
                        <ArrowRight size={14} />
                    </button>
                </form>
                <div className="flex justify-between items-center mt-2 px-1">
                    <p className="text-[8px] text-neutral-600 uppercase tracking-widest">ISTOIC_KERNEL_V13.5</p>
                    <p className="text-[8px] text-neutral-600 uppercase tracking-widest">SECURE_MODE</p>
                </div>
            </div>
        </div>
    );
};
