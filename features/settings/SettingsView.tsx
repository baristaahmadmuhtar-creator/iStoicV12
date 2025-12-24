
import React, { useState } from 'react';
import useLocalStorage from '../../hooks/useLocalStorage';
// Fix: Added missing Flame and Brain icons to lucide-react imports.
import { 
    Shield, Trash2, Cpu, Languages, Palette, Layout, Save, CheckCircle2, 
    Volume2, Mic2, Moon, Sun, Monitor, X, Check, HelpCircle, RefreshCw,
    Terminal, UserCheck, Sparkles, MessageSquare, ChevronRight, Activity, Zap, Globe, User, UserRound, Play, Info,
    Flame, Brain, DatabaseZap, Image as ImageIcon
} from 'lucide-react';
import { THEME_COLORS } from '../../App';
import { DEFAULT_MELSA_PROMPT, DEFAULT_STOIC_PROMPT } from '../../services/geminiService';
import { speakWithMelsa } from '../../services/elevenLabsService';
import { useVault } from '../../contexts/VaultContext';

interface ToolConfig {
    search: boolean;
    vault: boolean;
    visual: boolean;
}

const SettingsSection: React.FC<{ title: string; children: React.ReactNode; icon: React.ReactNode }> = ({ title, children, icon }) => (
    <div className="space-y-6 animate-slide-up">
        <div className="flex items-center gap-3 px-2">
            <div className="p-2.5 bg-accent/10 rounded-xl text-accent border border-accent/20">{icon}</div>
            <h3 className="text-[11px] font-black text-black dark:text-white tech-mono uppercase tracking-[0.3em]">{title}</h3>
        </div>
        <div className="bg-zinc-50 dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-[32px] overflow-hidden p-2 md:p-3">
            {children}
        </div>
    </div>
);

// Peningkatan Area Sentuh: Minimal tinggi 48px untuk jempol mobile
const SettingsItem: React.FC<{ label: string; desc: string; icon: React.ReactNode; action: React.ReactNode }> = ({ label, desc, icon, action }) => (
    <div className="p-6 md:p-8 bg-white dark:bg-[#0f0f11] rounded-[24px] mb-2 last:mb-0 border border-black/5 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-accent/30 transition-all group shadow-sm">
        <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-white/[0.03] flex items-center justify-center text-neutral-400 group-hover:text-accent group-hover:scale-110 transition-all shrink-0 border border-black/5 dark:border-white/5">
                {icon}
            </div>
            <div className="space-y-1.5">
                <h4 className="text-xl font-black text-black dark:text-white uppercase italic tracking-tighter leading-none group-hover:text-accent transition-colors">{label}</h4>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest leading-relaxed max-w-sm">{desc}</p>
            </div>
        </div>
        <div className="w-full md:w-auto self-end md:self-center">
            {action}
        </div>
    </div>
);

const ToolRow: React.FC<{ 
    label: string; 
    description: string;
    icon: React.ReactNode; 
    isActive: boolean; 
    onClick: () => void;
    activeColor: string; // expecting tailwind bg class e.g. "bg-orange-500"
    badge?: string;
}> = ({ label, description, icon, isActive, onClick, activeColor, badge }) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 group text-left ${
            isActive 
            ? 'bg-white/80 dark:bg-black/40 border-black/5 dark:border-white/10 shadow-sm' 
            : 'bg-transparent border-transparent hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100'
        }`}
    >
        <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                isActive ? `${activeColor} text-white shadow-lg` : 'bg-zinc-200 dark:bg-zinc-800 text-neutral-400'
            }`}>
                {React.cloneElement(icon as React.ReactElement<any>, { size: 18 })}
            </div>
            <div>
                <div className="flex items-center gap-2">
                    <h5 className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-black dark:text-white' : 'text-neutral-500'}`}>{label}</h5>
                    {badge && isActive && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[7px] font-bold tracking-wider">{badge}</span>
                    )}
                </div>
                <p className="text-[10px] text-neutral-500 font-medium leading-tight max-w-[200px] mt-0.5">{description}</p>
            </div>
        </div>
        
        {/* Toggle Switch */}
        <div className={`w-11 h-6 rounded-full p-1 transition-colors duration-300 relative ${
            isActive ? activeColor : 'bg-zinc-300 dark:bg-zinc-700'
        }`}>
            <div className={`w-4 h-4 bg-white rounded-full shadow-sm absolute top-1 transition-all duration-300 ${
                isActive ? 'left-[22px]' : 'left-1'
            }`} />
        </div>
    </button>
);

const SettingsView: React.FC = () => {
    // The VaultContext will automatically detect changes to localStorage tools_config and lock if needed.
    // We just need to ensure we update localStorage correctly here.
    const { lockVault } = useVault();

    const [persistedLanguage, setPersistedLanguage] = useLocalStorage<'id' | 'en'>('app_language', 'id');
    const [persistedTheme, setPersistedTheme] = useLocalStorage<string>('app_theme', 'cyan');
    const [persistedColorScheme, setPersistedColorScheme] = useLocalStorage<'system' | 'light' | 'dark'>('app_color_scheme', 'system');
    
    // Prompts
    const [persistedMelsaPrompt, setPersistedMelsaPrompt] = useLocalStorage<string>('custom_melsa_prompt', DEFAULT_MELSA_PROMPT);
    const [persistedStoicPrompt, setPersistedStoicPrompt] = useLocalStorage<string>('custom_stoic_prompt', DEFAULT_STOIC_PROMPT);
    
    // Voices
    const [persistedMelsaVoice, setPersistedMelsaVoice] = useLocalStorage<string>('melsa_voice', 'Zephyr');
    const [persistedStoicVoice, setPersistedStoicVoice] = useLocalStorage<string>('stoic_voice', 'Fenrir');

    // Tools Configuration
    const [persistedMelsaTools, setPersistedMelsaTools] = useLocalStorage<ToolConfig>('melsa_tools_config', { search: true, vault: true, visual: true });
    const [persistedStoicTools, setPersistedStoicTools] = useLocalStorage<ToolConfig>('stoic_tools_config', { search: true, vault: true, visual: false });
    
    const [language, setLanguage] = useState(persistedLanguage);
    const [theme, setTheme] = useState(persistedTheme);
    const [colorScheme, setColorScheme] = useState(persistedColorScheme);
    const [melsaPrompt, setMelsaPrompt] = useState(persistedMelsaPrompt);
    const [stoicPrompt, setStoicPrompt] = useState(persistedStoicPrompt);
    const [melsaVoice, setMelsaVoice] = useState(persistedMelsaVoice);
    const [stoicVoice, setStoicVoice] = useState(persistedStoicVoice);
    
    // Tool State
    const [melsaTools, setMelsaTools] = useState(persistedMelsaTools);
    const [stoicTools, setStoicTools] = useState(persistedStoicTools);
    
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isTestingVoice, setIsTestingVoice] = useState(false);

    const themeOptions = Object.entries(THEME_COLORS).map(([id, color]) => ({ id, color }));

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            setPersistedLanguage(language);
            setPersistedTheme(theme);
            setPersistedColorScheme(colorScheme);
            setPersistedMelsaPrompt(melsaPrompt);
            setPersistedStoicPrompt(stoicPrompt);
            setPersistedMelsaVoice(melsaVoice);
            setPersistedStoicVoice(stoicVoice);
            setPersistedMelsaTools(melsaTools);
            setPersistedStoicTools(stoicTools);
            
            // Explicitly lock vault if user just disabled it
            if ((!melsaTools.vault && persistedMelsaTools.vault) || (!stoicTools.vault && persistedStoicTools.vault)) {
                lockVault();
            }
            
            setIsSaving(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        }, 1000);
    };

    const handleTestMelsaVoice = async () => {
        if (isTestingVoice) return;
        setIsTestingVoice(true);
        await speakWithMelsa(`Neural link testing successful using ${melsaVoice} module.`, melsaVoice);
        setIsTestingVoice(false);
    };

    return (
        <div className="min-h-full flex flex-col p-2 md:p-6 lg:p-8 pb-40 animate-fade-in overflow-x-hidden">
             <div className="max-w-6xl mx-auto w-full bg-white dark:bg-[#0a0a0b] rounded-[48px] shadow-sm border border-black/5 dark:border-white/5 p-6 md:p-12 space-y-16 relative">
                
                {/* Header */}
                <header className="space-y-8 relative z-10 border-b border-black/5 dark:border-white/5 pb-10">
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1 bg-accent/10 border border-accent/20 rounded-lg tech-mono text-[9px] font-black text-accent tracking-[0.3em]">CONFIG_V13.5</div>
                        <div className="flex-1 h-[1px] bg-black/5 dark:bg-white/5"></div>
                        <span className="text-neutral-500 tech-mono text-[9px] font-black tracking-widest flex items-center gap-2">
                            <Activity size={12} className="text-green-500 animate-pulse" /> UPLINK_STABLE
                        </span>
                    </div>
                    <div>
                        <h2 className="text-6xl md:text-8xl font-black italic tracking-tighter text-black dark:text-white leading-[0.8] uppercase">
                            CORE <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-blue-500">CONFIG</span>
                        </h2>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
                    <div className="space-y-12">
                        <SettingsSection title="DIALECT & THEME" icon={<Globe size={18} />}>
                            <SettingsItem 
                                label="SISTEM_LANG" desc="Bahasa utama antarmuka terminal."
                                icon={<Languages size={22}/>}
                                action={
                                    <div className="flex bg-zinc-100 dark:bg-black/40 p-1 rounded-2xl border border-black/5 w-full md:w-auto">
                                        {[
                                            { id: 'id', label: 'ID' },
                                            { id: 'en', label: 'EN' }
                                        ].map(lang => (
                                            <button 
                                                key={lang.id} 
                                                onClick={() => setLanguage(lang.id as any)} 
                                                className={`min-h-[48px] px-8 text-[10px] font-black tracking-widest rounded-xl transition-all ${language === lang.id ? 'bg-white dark:bg-white/10 text-accent shadow-md scale-100' : 'text-neutral-500'}`}
                                            >
                                                {lang.label}
                                            </button>
                                        ))}
                                    </div>
                                }
                            />
                            <SettingsItem 
                                label="VISUAL_MODE" desc="Optimasi skema warna layar."
                                icon={<Monitor size={22}/>}
                                action={
                                    <div className="flex bg-zinc-100 dark:bg-black/40 p-1 rounded-2xl border border-black/5 w-full md:w-auto">
                                        {['system', 'light', 'dark'].map(s => (
                                            <button 
                                                key={s} 
                                                onClick={() => setColorScheme(s as any)} 
                                                className={`min-h-[48px] px-6 text-[9px] font-black uppercase rounded-xl transition-all ${colorScheme === s ? 'bg-white dark:bg-white/10 text-accent shadow-md' : 'text-neutral-500'}`}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                }
                            />
                            <SettingsItem 
                                label="NEURAL_COLOR" desc="Warna aksen operasional."
                                icon={<Palette size={22}/>}
                                action={
                                    <div className="flex flex-wrap justify-end gap-3 max-w-[240px]">
                                        {themeOptions.map(opt => (
                                            <button 
                                                key={opt.id} 
                                                onClick={() => setTheme(opt.id)} 
                                                className={`w-11 h-11 rounded-xl border-4 transition-all ${theme === opt.id ? 'border-accent shadow-[0_0_15px_var(--accent-glow)]' : 'border-transparent opacity-40 hover:opacity-100'}`} 
                                                style={{ backgroundColor: opt.color }} 
                                            />
                                        ))}
                                    </div>
                                }
                            />
                        </SettingsSection>
                    </div>

                    <div className="space-y-12">
                        <SettingsSection title="COGNITIVE_MAPPING" icon={<Cpu size={18} />}>
                            <div className="space-y-6 p-2">
                                
                                {/* MELSA DYNAMIC CONFIG */}
                                <div className="p-6 md:p-8 bg-orange-600/5 rounded-[32px] border border-orange-500/10 space-y-6 group">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-orange-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><Flame size={24} /></div>
                                            <h4 className="text-xl font-black italic text-black dark:text-white uppercase tracking-tighter">MELSA_CORE</h4>
                                        </div>
                                        <button onClick={handleTestMelsaVoice} disabled={isTestingVoice} className="w-12 h-12 bg-white dark:bg-white/5 rounded-full flex items-center justify-center shadow-sm border border-black/5 hover:scale-110 active:scale-95 transition-all text-orange-500">
                                            {isTestingVoice ? <RefreshCw className="animate-spin" size={18} /> : <Play size={18} />}
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <p className="text-[9px] tech-mono font-black text-neutral-500 uppercase tracking-widest pl-2">AUDIO_SYNTHESIS_MODULE</p>
                                        <div className="flex bg-white dark:bg-black/40 p-1 rounded-2xl border border-black/5">
                                            {['Zephyr', 'Kore', 'Melsa'].map(v => (
                                                <button key={v} onClick={() => setMelsaVoice(v)} className={`flex-1 min-h-[44px] text-[10px] font-black uppercase rounded-xl transition-all ${melsaVoice === v ? 'bg-orange-600 text-white shadow-md' : 'text-neutral-500 opacity-60'}`}>{v}</button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Melsa Tools */}
                                    <div className="space-y-3">
                                        <p className="text-[9px] tech-mono font-black text-neutral-500 uppercase tracking-widest pl-2">ACTIVE_EXTENSIONS</p>
                                        <div className="flex flex-col gap-2">
                                            <ToolRow 
                                                label="WEB_SEARCH" 
                                                description="Real-time web grounding for factual queries."
                                                icon={<Globe />} 
                                                isActive={melsaTools.search} 
                                                activeColor="bg-orange-600"
                                                onClick={() => setMelsaTools(prev => ({...prev, search: !prev.search}))} 
                                            />
                                            <ToolRow 
                                                label="VAULT_ACCESS" 
                                                description="Permission to R/W memory. Requires active PIN session."
                                                icon={<DatabaseZap />} 
                                                isActive={melsaTools.vault} 
                                                activeColor="bg-orange-600"
                                                badge="ENCRYPTED"
                                                onClick={() => setMelsaTools(prev => ({...prev, vault: !prev.vault}))} 
                                            />
                                            <ToolRow 
                                                label="VISUAL_CORTEX" 
                                                description="Image generation and computer vision analysis."
                                                icon={<ImageIcon />} 
                                                isActive={melsaTools.visual} 
                                                activeColor="bg-orange-600"
                                                onClick={() => setMelsaTools(prev => ({...prev, visual: !prev.visual}))} 
                                            />
                                        </div>
                                    </div>

                                    <textarea 
                                        value={melsaPrompt} 
                                        onChange={(e) => setMelsaPrompt(e.target.value)}
                                        className="w-full h-32 bg-white dark:bg-black/40 border border-black/5 rounded-2xl p-5 tech-mono text-[11px] font-bold outline-none focus:border-orange-500/50 resize-none leading-relaxed transition-all"
                                        placeholder="Customize Melsa prompt..."
                                    />
                                </div>
                                
                                {/* STOIC DYNAMIC CONFIG */}
                                <div className="p-6 md:p-8 bg-blue-600/5 rounded-[32px] border border-blue-500/10 space-y-6 group">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><Brain size={24} /></div>
                                        <h4 className="text-xl font-black italic text-black dark:text-white uppercase tracking-tighter">STOIC_CORE</h4>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <p className="text-[9px] tech-mono font-black text-neutral-500 uppercase tracking-widest pl-2">AUDIO_SYNTHESIS_MODULE</p>
                                        <div className="flex bg-white dark:bg-black/40 p-1 rounded-2xl border border-black/5">
                                            {['Fenrir', 'Puck'].map(v => (
                                                <button key={v} onClick={() => setStoicVoice(v)} className={`flex-1 min-h-[44px] text-[10px] font-black uppercase rounded-xl transition-all ${stoicVoice === v ? 'bg-blue-600 text-white shadow-md' : 'text-neutral-500 opacity-60'}`}>{v}</button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Stoic Tools */}
                                    <div className="space-y-3">
                                        <p className="text-[9px] tech-mono font-black text-neutral-500 uppercase tracking-widest pl-2">ACTIVE_EXTENSIONS</p>
                                        <div className="flex flex-col gap-2">
                                            <ToolRow 
                                                label="WEB_SEARCH" 
                                                description="Real-time web grounding for factual queries."
                                                icon={<Globe />} 
                                                isActive={stoicTools.search} 
                                                activeColor="bg-blue-600"
                                                onClick={() => setStoicTools(prev => ({...prev, search: !prev.search}))} 
                                            />
                                            <ToolRow 
                                                label="VAULT_ACCESS" 
                                                description="Logic analysis of historical data. Requires PIN."
                                                icon={<DatabaseZap />} 
                                                isActive={stoicTools.vault} 
                                                activeColor="bg-blue-600"
                                                badge="SECURE"
                                                onClick={() => setStoicTools(prev => ({...prev, vault: !prev.vault}))} 
                                            />
                                            <ToolRow 
                                                label="VISUAL_CORTEX" 
                                                description="Image generation and computer vision analysis."
                                                icon={<ImageIcon />} 
                                                isActive={stoicTools.visual} 
                                                activeColor="bg-blue-600"
                                                onClick={() => setStoicTools(prev => ({...prev, visual: !prev.visual}))} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </SettingsSection>
                    </div>
                </div>

                <div className="space-y-6 pt-10 border-t border-black/5 dark:border-white/5">
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className={`w-full py-6 md:py-8 rounded-[32px] font-black uppercase text-[12px] md:text-[14px] tracking-[0.5em] flex items-center justify-center gap-4 transition-all shadow-xl hover:scale-[1.01] active:scale-95 ${
                            saveSuccess 
                            ? 'bg-emerald-600 text-white shadow-emerald-500/30' 
                            : 'bg-accent text-on-accent shadow-accent/30'
                        }`}
                    >
                        {isSaving ? <RefreshCw className="animate-spin" size={24} /> : saveSuccess ? <CheckCircle2 size={24} /> : <Zap size={24} />}
                        {isSaving ? "SYNCING..." : saveSuccess ? "UPDATED" : "DEPLOY CHANGES"}
                    </button>

                    <button 
                        onClick={() => { if(confirm("Hapus semua data kognitif permanen?")) { localStorage.clear(); window.location.reload(); } }}
                        className="w-full py-5 rounded-[28px] border border-red-500/20 bg-red-500/5 text-red-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-red-500 hover:text-white transition-all shadow-inner"
                    >
                        <Trash2 size={16} /> RESET_SYSTEM
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;