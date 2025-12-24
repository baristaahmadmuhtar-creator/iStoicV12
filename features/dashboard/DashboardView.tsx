
import React, { useState, useEffect } from 'react';
import useLocalStorage from '../../hooks/useLocalStorage';
import { type Note } from '../../types';
import { type FeatureID } from '../../constants';
import { ArrowUpRight, ChevronRight, Target, Brain, Zap, FileText, ShieldCheck, DatabaseZap, Lock, Unlock, Activity } from 'lucide-react';
import { VaultPinModal } from '../../components/VaultPinModal';

interface DashboardProps {
    onNavigate: (feature: FeatureID) => void;
}

const StatBox: React.FC<{ label: string; value: string; isPulse?: boolean; color?: string }> = ({ label, value, isPulse, color }) => (
    <div className="bg-white dark:bg-[#0a0a0b] p-6 flex flex-col justify-center rounded-[24px] border border-black/5 dark:border-white/5 shadow-sm hover:shadow-xl hover:scale-105 transition-all duration-500 group min-w-[140px]">
        <p className="tech-mono text-[9px] text-neutral-400 font-black uppercase tracking-[0.3em] mb-2 italic group-hover:text-accent transition-colors flex items-center gap-2">
            {label}
            {isPulse && <Activity size={10} className={`animate-pulse ${color || 'text-green-500'}`} />}
        </p>
        <p className={`text-4xl md:text-5xl font-black tracking-tighter italic leading-none group-hover:translate-x-2 transition-transform ${color || 'text-black dark:text-white'}`}>{value}</p>
    </div>
);

const ModuleCard: React.FC<{ 
    title: string; 
    desc: string; 
    icon: React.ReactNode; 
    onClick: () => void;
    layout: 'grid' | 'list' | 'minimal' | 'compact';
    delay?: number;
}> = ({ title, desc, icon, onClick, layout, delay }) => {
    const isMinimal = layout === 'minimal' || layout === 'compact';
    
    return (
        <div 
            onClick={onClick}
            style={{ animationDelay: `${delay}ms` }}
            className={`bg-white dark:bg-[#0a0a0b] group relative overflow-hidden flex flex-col justify-between cursor-pointer rounded-[32px] border border-black/5 dark:border-white/5 hover:border-accent/30 transition-all duration-500 animate-slide-up shadow-sm hover:shadow-2xl hover:-translate-y-1 ${isMinimal ? 'p-6 flex-row items-center gap-6' : 'p-8 md:p-10 h-full min-h-[280px]'}`}
        >
            <div className="flex items-center gap-6 relative z-10">
                <div className={`rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500 group-hover:rotate-12 group-hover:scale-110 text-on-accent bg-accent ${isMinimal ? 'w-14 h-14' : 'w-16 h-16 md:w-20 md:h-20 mb-8 md:mb-10'}`}>
                    {icon}
                </div>
                {isMinimal && (
                    <div className="flex-1">
                        <h3 className="text-xl font-black text-black dark:text-white italic tracking-tighter uppercase leading-none mb-1 group-hover:text-accent transition-colors">{title}</h3>
                        <p className="text-[9px] text-neutral-400 uppercase tracking-widest font-black tech-mono">ACTIVE_NODE</p>
                    </div>
                )}
            </div>
            
            {!isMinimal && (
                <div className="relative z-10">
                    <div>
                        <h3 className="text-4xl md:text-5xl font-black text-black dark:text-white leading-[0.85] mb-4 tracking-tighter uppercase italic group-hover:text-accent transition-colors duration-300">{title}</h3>
                        <p className="text-neutral-500 dark:text-neutral-400 text-[10px] font-bold leading-relaxed max-w-[95%] uppercase tracking-widest line-clamp-3 group-hover:text-black dark:group-hover:text-white transition-colors">{desc}</p>
                    </div>
                    <div className="mt-auto flex items-center justify-between border-t border-black/5 dark:border-white/5 pt-6 md:pt-8 group-hover:border-accent/20 transition-colors">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shadow-[0_0_10px_var(--accent-color)]"></div>
                            <span className="tech-mono text-[9px] text-neutral-400 font-bold tracking-widest uppercase italic group-hover:text-accent transition-colors">SECURE_LINK</span>
                        </div>
                        <div className="p-3 bg-zinc-100 dark:bg-white/5 rounded-xl group-hover:bg-accent group-hover:text-on-accent transition-all transform group-hover:-translate-y-1 group-hover:translate-x-1">
                            <ArrowUpRight size={20} />
                        </div>
                    </div>
                </div>
            )}
            {isMinimal && <ArrowUpRight size={20} className="text-neutral-300 dark:text-neutral-700 group-hover:text-accent group-hover:translate-x-1 group-hover:-translate-y-1 transition-all ml-auto" />}
        </div>
    );
};

const DashboardView: React.FC<DashboardProps> = ({ onNavigate }) => {
    const [notes] = useLocalStorage<Note[]>('notes', []);
    const [isVaultSynced, setIsVaultSynced] = useLocalStorage<boolean>('is_vault_synced', false);
    const [personaMode] = useLocalStorage<'melsa' | 'stoic'>('ai_persona_mode', 'melsa');
    const [layout] = useLocalStorage<'grid' | 'list' | 'minimal' | 'compact'>('app_dashboard_layout', 'grid');
    const [language] = useLocalStorage<'id' | 'en'>('app_language', 'id');
    const [showPinModal, setShowPinModal] = useState(false);
    
    // Logic: Real Sync Level Calculation
    const [syncLevel, setSyncLevel] = useState(0);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleStatus = () => setIsOnline(navigator.onLine);
        window.addEventListener('online', handleStatus);
        window.addEventListener('offline', handleStatus);

        // Calculate Logic
        let level = 20; // Base System Integrity
        if (isOnline) level += 30; // Network Connectivity
        if (isVaultSynced) level += 50; // Vault Access (Critical)
        
        // Minor random fluctuation for "Live" feel if fully synced
        if (level === 100) {
            const jitter = Math.random() > 0.5 ? 0 : -1;
            level += jitter;
        }

        setSyncLevel(level);

        return () => {
            window.removeEventListener('online', handleStatus);
            window.removeEventListener('offline', handleStatus);
        };
    }, [isVaultSynced, isOnline, notes.length]);


    const translations = {
        id: {
            uptime: "SYSTEM ONLINE",
            nodes: "DATABASE NODES",
            focus: "SYNC LEVEL",
            archiveTitle: "ARCHIVE",
            archiveDesc: "PENYIMPANAN DATA TERSTRUKTUR UNTUK ASET INTELEKTUAL.",
            chatTitle: "NEURAL CHAT",
            chatDesc: personaMode === 'melsa' ? "GENIUS HACKER & CREATIVE PARTNER." : "MENTOR LOGIKA & ANALISIS.",
            toolsTitle: "ARSENAL",
            toolsDesc: "EKSTENSI PRODUKTIVITAS LEVEL TINGGI.",
            recent: "RECENT LOGS",
            control: "CONTROL_HUB",
            controlDesc: "SISTEM OPTIMALISASI FOKUS INTERNAL.",
            deploy: "OPEN VAULT",
            empty: "DATABASE_KOSONG",
            untitled: "TANPA_JUDUL",
            auth: "TERAUTENTIKASI",
            vaultAccess: "VAULT ACCESS"
        },
        en: {
            uptime: "SYSTEM ONLINE",
            nodes: "DATABASE NODES",
            focus: "SYNC LEVEL",
            archiveTitle: "ARCHIVE",
            archiveDesc: "STRUCTURED DATA STORAGE FOR INTELLECTUAL ASSETS.",
            chatTitle: "NEURAL CHAT",
            chatDesc: personaMode === 'melsa' ? "GENIUS HACKER & CREATIVE PARTNER." : "LOGIC MENTOR & ANALYST.",
            toolsTitle: "ARSENAL",
            toolsDesc: "HIGH-LEVEL PRODUCTIVITY EXTENSIONS.",
            recent: "RECENT LOGS",
            control: "CONTROL_HUB",
            controlDesc: "INTERNAL FOCUS OPTIMIZATION SYSTEM.",
            deploy: "OPEN VAULT",
            empty: "DATABASE_EMPTY",
            untitled: "UNTITLED_NODE",
            auth: "AUTHENTICATED",
            vaultAccess: "VAULT ACCESS"
        }
    };

    const t = translations[language];

    const toggleVaultAccess = () => {
        if (isVaultSynced) {
            setIsVaultSynced(false);
        } else {
            setShowPinModal(true);
        }
    };

    const getSyncColor = () => {
        if (syncLevel >= 99) return 'text-[var(--accent-color)]';
        if (syncLevel >= 50) return 'text-yellow-500';
        return 'text-red-500';
    };

    return (
        <div className="min-h-full flex flex-col p-4 md:p-12 lg:p-16 pb-40 animate-fade-in">
            <VaultPinModal 
                isOpen={showPinModal} 
                onClose={() => setShowPinModal(false)} 
                onSuccess={() => setIsVaultSynced(true)} 
            />

            <div className="max-w-[1600px] mx-auto w-full space-y-12 md:space-y-16">
                
                {/* Header Section */}
                <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-10 animate-slide-up border-b border-black/5 dark:border-white/5 pb-10 relative">
                    <div className="space-y-6 flex-1 max-w-4xl">
                        <div className="flex items-center gap-4">
                            <div className="px-3 py-1 rounded-lg bg-accent/10 border border-accent/20 tech-mono text-[9px] font-black uppercase text-accent tracking-[0.3em] shadow-inner backdrop-blur-md">IStoicAI_v13.5</div>
                            <span className="text-neutral-500 tech-mono text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                {t.uptime}
                            </span>
                        </div>
                        <h2 className="text-[12vw] xl:text-[8rem] heading-heavy text-black dark:text-white leading-[0.85] tracking-tighter uppercase">
                             <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-blue-500">TERMINAL</span>
                        </h2>
                    </div>
                    <div className="grid grid-cols-2 gap-4 w-full sm:w-auto min-w-[320px]">
                        <StatBox label={t.nodes} value={notes.length.toString().padStart(2, '0')} />
                        <StatBox 
                            label={t.focus} 
                            value={`${syncLevel}%`} 
                            isPulse={true} 
                            color={getSyncColor()}
                        />
                    </div>
                </header>

                {/* Main Modules Grid */}
                <div className={`grid gap-6 md:gap-8 ${
                    layout === 'minimal' ? 'grid-cols-1' : 
                    layout === 'compact' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' :
                    'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
                }`}>
                    <ModuleCard title={t.archiveTitle} desc={t.archiveDesc} icon={<Target size={32} strokeWidth={2.5} />} onClick={() => onNavigate('notes')} layout={layout} delay={100} />
                    <ModuleCard title={t.chatTitle} desc={t.chatDesc} icon={<Brain size={32} strokeWidth={2.5} />} onClick={() => onNavigate('chat')} layout={layout} delay={200} />
                    <ModuleCard title={t.toolsTitle} desc={t.toolsDesc} icon={<Zap size={32} strokeWidth={2.5} />} onClick={() => onNavigate('tools')} layout={layout} delay={300} />
                </div>

                {/* Bottom Section: Recent & Control Hub */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 animate-slide-up" style={{ animationDelay: '400ms' }}>
                    {/* Recent Activity */}
                    <div className="lg:col-span-8 space-y-8">
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-4 text-black dark:text-white leading-none pl-2 border-l-4 border-accent h-6">
                             {t.recent}
                        </h3>
                        <div className="space-y-4">
                            {notes.slice(0, 3).map((note, i) => (
                                <div key={note.id} onClick={() => onNavigate('notes')} style={{ animationDelay: `${i * 100}ms` }} className="p-6 bg-white dark:bg-[#0a0a0b] rounded-[24px] border border-black/5 dark:border-white/5 flex items-center justify-between group cursor-pointer hover:border-accent/30 transition-all duration-500 shadow-sm hover:shadow-xl hover:-translate-x-1 animate-slide-up">
                                    <div className="flex items-center gap-6">
                                        <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-accent text-neutral-400 group-hover:text-on-accent transition-all border border-black/5 dark:border-white/5 shadow-inner">
                                            <FileText size={24} />
                                        </div>
                                        <div className="overflow-hidden">
                                            <h4 className="text-xl font-black text-black dark:text-white uppercase italic tracking-tighter leading-none mb-2 group-hover:translate-x-2 transition-transform truncate max-w-[200px] md:max-w-md">{note.title || t.untitled}</h4>
                                            <p className="text-[9px] tech-mono text-neutral-500 font-black uppercase tracking-widest flex items-center gap-3">
                                                <span>ID: {note.id.slice(0, 8)}</span>
                                                <span className="w-1 h-1 rounded-full bg-neutral-400"></span>
                                                <span>{new Date(note.updated).toLocaleDateString()}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-accent group-hover:text-on-accent transition-all">
                                        <ChevronRight size={20} />
                                    </div>
                                </div>
                            ))}
                            {notes.length === 0 && (
                                <div className="p-16 text-center rounded-[32px] border-2 border-dashed border-black/5 dark:border-white/5 opacity-60 flex flex-col items-center justify-center gap-6">
                                    <FileText size={48} className="text-neutral-300" strokeWidth={1.5} />
                                    <p className="tech-mono text-[10px] font-black uppercase tracking-[0.5em] text-neutral-400">{t.empty}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Control Hub */}
                    <div className="lg:col-span-4 flex flex-col gap-6">
                        {/* Vault Access Controller */}
                        <div className={`p-8 rounded-[32px] border transition-all duration-500 flex flex-col justify-between group h-full shadow-lg ${isVaultSynced ? 'bg-white dark:bg-[#0a0a0b] border-accent/50' : 'bg-zinc-100 dark:bg-white/5 border-transparent'}`}>
                            <div className="flex items-start justify-between">
                                <div className="space-y-4">
                                    <div className={`flex items-center gap-3 ${isVaultSynced ? 'text-accent' : 'text-neutral-500'}`}>
                                        <DatabaseZap size={20} className={isVaultSynced ? 'animate-pulse' : ''} />
                                        <span className="tech-mono text-[9px] font-black uppercase tracking-[0.3em]">{t.vaultAccess}</span>
                                    </div>
                                    <h3 className={`text-3xl font-black uppercase italic leading-none tracking-tighter ${isVaultSynced ? 'text-black dark:text-white' : 'text-neutral-400'}`}>
                                        {isVaultSynced ? 'SYSTEM CONNECTED' : 'ACCESS LOCKED'}
                                    </h3>
                                </div>
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isVaultSynced ? 'bg-accent text-black' : 'bg-black/10 dark:bg-white/10 text-neutral-500'}`}>
                                    {isVaultSynced ? <Unlock size={20} /> : <Lock size={20} />}
                                </div>
                            </div>
                            
                            <button 
                                onClick={toggleVaultAccess}
                                className={`mt-8 w-full py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.3em] transition-all flex items-center justify-center gap-3 ${
                                    isVaultSynced 
                                    ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' 
                                    : 'bg-black dark:bg-white text-white dark:text-black hover:scale-[1.02]'
                                }`}
                            >
                                {isVaultSynced ? 'TERMINATE CONNECTION' : 'AUTHENTICATE'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardView;
