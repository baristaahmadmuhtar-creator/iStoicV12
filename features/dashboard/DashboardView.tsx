
import React, { useState, useEffect } from 'react';
import useLocalStorage from '../../hooks/useLocalStorage';
import { type Note } from '../../types';
import { type FeatureID } from '../../constants';
import { ArrowUpRight, ChevronRight, Target, Brain, Zap, FileText, ShieldCheck, DatabaseZap, Lock, Unlock, Activity, Clock, Cpu, Database } from 'lucide-react';
import { VaultPinModal } from '../../components/VaultPinModal';
import { useVault } from '../../contexts/VaultContext';
import { UI_REGISTRY, FN_REGISTRY } from '../../constants/registry';
import { debugService } from '../../services/debugService';
import { DailyStoicWidget } from './components/DailyStoicWidget';

interface DashboardProps {
    onNavigate: (feature: FeatureID) => void;
    notes: Note[]; // Receive notes from App state
}

// Strictly Typed StatBox
const StatBox: React.FC<{ label: string; value: string; isPulse?: boolean; color?: string; icon?: React.ReactNode; onClick?: () => void }> = ({ label, value, isPulse, color, icon, onClick }) => (
    <button 
        onClick={onClick}
        aria-label={`${label}: ${value}`}
        className={`bg-white/5 dark:bg-[#0f0f11] p-[1.618rem] flex flex-col justify-between rounded-[32px] border border-black/5 dark:border-white/5 shadow-sm hover:shadow-[0_10px_40px_-10px_var(--accent-glow)] hover:border-accent/30 transition-all duration-500 group relative overflow-hidden h-full aspect-[1.618/1] w-full text-left ${onClick ? 'cursor-pointer active:scale-[0.98]' : 'cursor-default'}`}
    >
        <div className="absolute inset-0 bg-gradient-to-br from-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="flex justify-between items-start relative z-10 w-full">
             <div className={`p-3 rounded-2xl bg-black/5 dark:bg-white/5 text-neutral-400 group-hover:text-accent transition-colors`}>
                {icon ? React.cloneElement(icon as any, { size: 20 }) : <Activity size={20} />}
             </div>
             {isPulse && <div className={`w-2.5 h-2.5 rounded-full ${color?.replace('text-', 'bg-') || 'bg-accent'} animate-pulse shadow-[0_0_12px_currentColor]`} />}
        </div>
        <div className="relative z-10 mt-2">
            <p className={`text-3xl md:text-4xl font-black tracking-tighter italic leading-none group-hover:translate-x-1 transition-transform ${color || 'text-black dark:text-white'}`}>{value}</p>
            <p className="tech-mono text-[9px] text-neutral-500 font-black uppercase tracking-[0.2em] mt-2">{label}</p>
        </div>
    </button>
);

const BentoCard: React.FC<{ 
    title: string; 
    desc: string; 
    icon: React.ReactNode; 
    onClick: () => void;
    className?: string;
    delay?: number;
    accentColor?: string;
}> = ({ title, desc, icon, onClick, className, delay, accentColor = "group-hover:text-accent" }) => {
    return (
        <button 
            onClick={onClick}
            aria-label={`Open ${title}`}
            style={{ animationDelay: `${delay}ms` }}
            className={`
                relative overflow-hidden cursor-pointer rounded-[48px] 
                bg-white dark:bg-[#0f0f11] border border-black/5 dark:border-white/5 
                hover:border-accent/40 transition-all duration-500 animate-slide-up 
                shadow-sm hover:shadow-[0_30px_80px_-20px_var(--accent-glow)] 
                hover:-translate-y-2 active:scale-[0.98] group flex flex-col justify-between p-8 md:p-10 text-left
                ${className}
            `}
        >
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
            <div className="absolute top-0 right-0 p-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform translate-x-4 group-hover:translate-x-0">
                <ArrowUpRight size={32} className="text-accent" />
            </div>

            <div className="relative z-10 w-full">
                {/* Icon Container - Maximized for Bento Aesthetic */}
                <div className={`w-20 h-20 md:w-24 md:h-24 rounded-[32px] bg-black/5 dark:bg-white/5 flex items-center justify-center text-neutral-500 ${accentColor} transition-colors duration-500 mb-8 group-hover:scale-110 group-hover:rotate-6 shadow-inner border border-black/5 dark:border-white/5`}>
                    {React.cloneElement(icon as React.ReactElement<any>, { size: 40, strokeWidth: 1.5 })}
                </div>
                
                {/* Responsive Typography: Scaled down slightly for mobile, clamped for large screens */}
                <h3 className="text-[9vw] md:text-4xl lg:text-5xl font-black text-black dark:text-white uppercase italic tracking-tighter leading-[0.85] mb-4 break-words">{title}</h3>
                <p className="text-xs md:text-sm font-medium text-neutral-500 dark:text-neutral-400 leading-relaxed uppercase tracking-wide max-w-[90%] group-hover:text-black dark:group-hover:text-white transition-colors">{desc}</p>
            </div>
            
            <div className="relative z-10 mt-auto pt-8 border-t border-black/5 dark:border-white/5 flex items-center gap-3 opacity-60 group-hover:opacity-100 transition-opacity w-full">
                <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse shadow-[0_0_10px_var(--accent-color)]"></div>
                <span className="text-[10px] tech-mono font-black text-neutral-400 uppercase tracking-[0.25em]">SYSTEM_READY</span>
            </div>
        </button>
    );
};

const DashboardView: React.FC<DashboardProps> = ({ onNavigate, notes }) => {
    // Note: 'notes' are now passed via props from App IDB state
    const { isVaultUnlocked, unlockVault, lockVault, isVaultConfigEnabled } = useVault();
    const [personaMode] = useLocalStorage<'hanisah' | 'stoic'>('ai_persona_mode', 'hanisah');
    const [language] = useLocalStorage<string>('app_language', 'id');
    
    const [showPinModal, setShowPinModal] = useState(false);
    const [syncLevel, setSyncLevel] = useState(0);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    const vaultEnabled = isVaultConfigEnabled(personaMode);

    useEffect(() => {
        const handleStatus = () => setIsOnline(navigator.onLine);
        window.addEventListener('online', handleStatus);
        window.addEventListener('offline', handleStatus);

        let level = 20; 
        if (isOnline) level += 30; 
        if (isVaultUnlocked) level += 50; 
        setSyncLevel(level);

        return () => {
            window.removeEventListener('online', handleStatus);
            window.removeEventListener('offline', handleStatus);
        };
    }, [isVaultUnlocked, isOnline]);

    // Explicit Handlers
    const handleNavSystem = () => {
        debugService.logAction(UI_REGISTRY.DASHBOARD_BTN_SYSTEM_STATUS, FN_REGISTRY.OPEN_SYSTEM_MECHANIC, 'NAV_SYSTEM');
        onNavigate('system');
    };

    const handleNavNotes = () => {
        debugService.logAction(UI_REGISTRY.DASHBOARD_CARD_NOTES, FN_REGISTRY.NAVIGATE_TO_FEATURE, 'NOTES_QUICK_ACCESS');
        onNavigate('notes');
    };

    const handleNavArchive = () => {
        debugService.logAction(UI_REGISTRY.DASHBOARD_BENTO_ARCHIVE, FN_REGISTRY.NAVIGATE_TO_FEATURE, 'NOTES_ARCHIVE');
        onNavigate('notes');
    };

    const handleNavChat = () => {
        debugService.logAction(UI_REGISTRY.DASHBOARD_BENTO_CHAT, FN_REGISTRY.NAVIGATE_TO_FEATURE, 'CHAT');
        onNavigate('chat');
    };

    const handleNavTools = () => {
        debugService.logAction(UI_REGISTRY.DASHBOARD_BENTO_TOOLS, FN_REGISTRY.NAVIGATE_TO_FEATURE, 'TOOLS');
        onNavigate('tools');
    };

    const handleToggleVault = () => {
        debugService.logAction(UI_REGISTRY.DASHBOARD_BTN_VAULT_TOGGLE, FN_REGISTRY.TOGGLE_VAULT_LOCK, isVaultUnlocked ? 'LOCK' : 'UNLOCK_ATTEMPT');
        if (!vaultEnabled) return;
        if (isVaultUnlocked) {
            lockVault();
        } else {
            setShowPinModal(true);
        }
    };

    const handleRecentLogClick = () => {
        debugService.logAction(UI_REGISTRY.DASHBOARD_BTN_RECENT_LOGS, FN_REGISTRY.NAVIGATE_TO_FEATURE, 'NOTES_FROM_RECENT');
        onNavigate('notes');
    };

    const translations = {
        id: {
            uptime: "SISTEM ONLINE",
            nodes: "NODE VAULT",
            focus: "STATUS SINKRON",
            archiveTitle: "ARSIP PINTAR",
            archiveDesc: "Aset intelektual terstruktur.",
            chatTitle: "NEURAL LINK",
            chatDesc: personaMode === 'hanisah' ? "Partner kreatif virtual." : "Mentor logika stoik.",
            toolsTitle: "ARSENAL",
            toolsDesc: "Generator & Analisis AI.",
            recent: "AKTIVITAS TERBARU",
            control: "PUSAT KEAMANAN",
            vaultAccess: "AKSES VAULT"
        },
        en: {
            uptime: "SYSTEM ONLINE",
            nodes: "VAULT NODES",
            focus: "SYNC STATUS",
            archiveTitle: "SMART ARCHIVE",
            archiveDesc: "Structured intellectual assets.",
            chatTitle: "NEURAL LINK",
            chatDesc: personaMode === 'hanisah' ? "Virtual creative partner." : "Stoic logic mentor.",
            toolsTitle: "ARSENAL",
            toolsDesc: "Generative & Analytic AI.",
            recent: "RECENT ACTIVITY",
            control: "SECURITY HUB",
            vaultAccess: "VAULT ACCESS"
        },
        bn: {
            uptime: "SISTEM AKTIF",
            nodes: "NOTA VAULT",
            focus: "STATUS SINKRON",
            archiveTitle: "ARKIB PINTAR",
            archiveDesc: "Aset minda tersusun rapi.",
            chatTitle: "NEURAL LINK",
            chatDesc: personaMode === 'hanisah' ? "Rakan kognitif maya." : "Mentor logika stoik.",
            toolsTitle: "ARSENAL",
            toolsDesc: "Generator & Analisis AI.",
            recent: "AKTIVITI TERKINI",
            control: "HAB SEKURITI",
            vaultAccess: "AKSES PETI"
        }
    };

    const t = translations[language as keyof typeof translations] || translations['id'];

    return (
        <div className="min-h-full flex flex-col p-4 md:p-8 lg:p-12 pb-32 md:pb-40 animate-fade-in bg-noise">
            <VaultPinModal 
                isOpen={showPinModal} 
                onClose={() => setShowPinModal(false)} 
                onSuccess={() => unlockVault()} 
            />

            <div className="max-w-[1400px] mx-auto w-full space-y-8 md:space-y-10">
                
                <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-10 animate-slide-up pb-2">
                    <div className="space-y-4 md:space-y-6 flex-1 w-full">
                        <div className="flex items-center gap-4">
                            <div className="px-4 py-2 rounded-xl bg-accent/10 border border-accent/20 tech-mono text-[10px] font-black uppercase text-accent tracking-[0.3em] shadow-[0_0_20px_rgba(var(--accent-rgb),0.2)]">PLATINUM_OS_v13.5</div>
                            <button 
                                onClick={handleNavSystem}
                                className="text-neutral-500 tech-mono text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:text-accent transition-colors"
                                title="Open System Mechanic"
                                aria-label="System Uptime Status"
                            >
                                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]"></span>
                                {t.uptime}
                            </button>
                        </div>
                        {/* Improved Fluid Typography: Scaled down min-size for mobile, clamped max-size for desktop */}
                        <h1 className="text-[12vw] md:text-[6rem] xl:text-[7rem] font-black italic tracking-tighter text-black dark:text-white leading-[0.85] uppercase drop-shadow-sm break-words">
                             COMMAND <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-purple-500 animate-gradient-text">CENTER</span>
                        </h1>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-5 w-full xl:w-auto min-w-[280px] md:min-w-[340px]">
                        <StatBox 
                            label={t.nodes} 
                            value={notes.length.toString().padStart(2, '0')} 
                            icon={<FileText />}
                            onClick={handleNavNotes}
                        />
                        <StatBox 
                            label={t.focus} 
                            value={`${syncLevel}%`} 
                            isPulse={true} 
                            color={syncLevel > 90 ? 'text-accent' : 'text-yellow-500'}
                            icon={<Activity />}
                            onClick={handleNavSystem} 
                        />
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6 md:gap-8">
                    
                    {/* DAILY STOIC WIDGET */}
                    <DailyStoicWidget />

                    {/* Primary Bento: Chat (Wider on large screens) */}
                    <BentoCard 
                        title={t.chatTitle} 
                        desc={t.chatDesc} 
                        icon={<Brain />} 
                        onClick={handleNavChat} 
                        className="md:col-span-3 lg:col-span-4 min-h-[260px] md:min-h-0 md:aspect-[1.618/1] lg:aspect-square"
                        delay={100}
                        accentColor={personaMode === 'hanisah' ? "group-hover:text-orange-500" : "group-hover:text-cyan-500"}
                    />
                    
                    {/* Secondary Bento: Archive */}
                    <BentoCard 
                        title={t.archiveTitle} 
                        desc={t.archiveDesc} 
                        icon={<Database />} 
                        onClick={handleNavArchive} 
                        className="md:col-span-3 lg:col-span-4 min-h-[260px] md:min-h-0 md:aspect-[1.618/1] lg:aspect-square"
                        delay={200}
                    />
                    
                    {/* Tools: Spans wider on tablet (6 cols) */}
                    <BentoCard 
                        title={t.toolsTitle} 
                        desc={t.toolsDesc} 
                        icon={<Zap />} 
                        onClick={handleNavTools} 
                        className="md:col-span-6 lg:col-span-4 min-h-[260px] md:min-h-0 md:aspect-[3.236/1] lg:aspect-square"
                        delay={300}
                    />

                    {/* Recent Logs: Large span for readability */}
                    <div className="md:col-span-6 lg:col-span-8 bg-zinc-100 dark:bg-[#0f0f11] rounded-[48px] border border-black/5 dark:border-white/5 p-8 md:p-10 flex flex-col justify-between animate-slide-up lg:aspect-[1.618/1]" style={{ animationDelay: '400ms' }}>
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-black dark:text-white flex items-center gap-4">
                                <Clock size={32} className="text-neutral-400" /> {t.recent}
                            </h3>
                            <button onClick={handleNavNotes} aria-label="Go to Archive" className="w-14 h-14 rounded-full bg-white/5 hover:bg-accent hover:text-black flex items-center justify-center transition-all border border-black/5 dark:border-white/5">
                                <ChevronRight size={24} />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            {notes.slice(0, 3).map((note, i) => (
                                <div key={note.id} onClick={handleRecentLogClick} role="button" tabIndex={0} className="group flex items-center gap-6 p-5 rounded-[28px] bg-white dark:bg-black/20 border border-black/5 dark:border-white/5 hover:border-accent/30 hover:bg-white dark:hover:bg-white/5 transition-all cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5">
                                    <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-neutral-400 group-hover:text-accent group-hover:scale-110 transition-transform border border-black/5 dark:border-white/5 shrink-0">
                                        <FileText size={24} strokeWidth={2} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-lg font-bold text-black dark:text-white uppercase tracking-tight truncate">{note.title || "UNTITLED"}</h4>
                                        <p className="text-[11px] tech-mono text-neutral-500 truncate mt-1">ID: {note.id.slice(0,8)} // {new Date(note.updated).toLocaleDateString()}</p>
                                    </div>
                                    <ArrowUpRight size={20} className="text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0" />
                                </div>
                            ))}
                            {notes.length === 0 && (
                                <div className="text-center py-12 opacity-40 text-[12px] font-black uppercase tracking-widest text-neutral-500">NO_DATA_LOGGED</div>
                            )}
                        </div>
                    </div>

                    {/* Security Hub */}
                    <div className={`md:col-span-6 lg:col-span-4 p-8 md:p-10 rounded-[48px] border transition-all duration-500 flex flex-col justify-between group shadow-lg animate-slide-up h-full ${isVaultUnlocked ? 'bg-white dark:bg-[#0f0f11] border-accent/50 shadow-[0_0_60px_rgba(var(--accent-rgb),0.1)]' : 'bg-zinc-200 dark:bg-[#0a0a0b] border-transparent'}`} style={{ animationDelay: '500ms' }}>
                        <div>
                            <div className="flex justify-between items-start mb-10">
                                <div className={`p-5 rounded-[24px] ${isVaultUnlocked ? 'bg-accent/10 text-accent' : 'bg-black/5 dark:bg-white/5 text-neutral-500'}`}>
                                    <DatabaseZap size={40} strokeWidth={1.5} />
                                </div>
                                <div className={`px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-widest border ${isVaultUnlocked ? 'border-accent/30 text-accent bg-accent/5' : 'border-neutral-500/20 text-neutral-500'}`}>
                                    {isVaultUnlocked ? 'UNLOCKED' : 'LOCKED'}
                                </div>
                            </div>
                            {/* Adjusted Text Size for Hub */}
                            <h3 className="text-3xl md:text-4xl xl:text-5xl font-black uppercase italic tracking-tighter leading-none text-black dark:text-white">{t.control}</h3>
                            <p className="text-xs font-medium text-neutral-500 mt-4 leading-relaxed max-w-[80%]">
                                {isVaultUnlocked ? "Access granted to secure memory banks." : "Authentication required for vault access."}
                            </p>
                        </div>
                        
                        <button 
                            onClick={vaultEnabled ? handleToggleVault : handleNavTools}
                            aria-label={!vaultEnabled ? 'Vault Disabled' : isVaultUnlocked ? 'Lock Vault' : 'Unlock Vault'}
                            className={`w-full py-6 rounded-[24px] font-black uppercase text-[12px] tracking-[0.3em] flex items-center justify-center gap-4 transition-all active:scale-95 shadow-xl mt-8 ${
                                !vaultEnabled ? 'bg-black/10 text-neutral-500 cursor-not-allowed' :
                                isVaultUnlocked ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' : 
                                'bg-black dark:bg-white text-white dark:text-black hover:bg-accent hover:text-black hover:shadow-[0_0_30px_var(--accent-glow)]'
                            }`}
                        >
                            {isVaultUnlocked ? <Lock size={20}/> : <Unlock size={20}/>}
                            {!vaultEnabled ? 'DISABLED' : isVaultUnlocked ? 'LOCK_VAULT' : 'AUTHENTICATE'}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default DashboardView;
