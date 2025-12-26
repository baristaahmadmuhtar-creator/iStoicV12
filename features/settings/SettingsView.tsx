
import React, { useState, useRef, useEffect } from 'react';
import useLocalStorage from '../../hooks/useLocalStorage';
import { 
    Shield, Trash2, Cpu, Languages, Palette, Layout, Save, CheckCircle2, 
    Volume2, Mic2, Moon, Sun, Monitor, X, Check, HelpCircle, RefreshCw,
    Terminal, UserCheck, Sparkles, MessageSquare, ChevronRight, Activity, Zap, Globe, User, UserRound, Play, Info,
    Flame, Brain, DatabaseZap, Image as ImageIcon, HardDrive, Download, Upload, FileJson, Edit3, Undo2, Loader2
} from 'lucide-react';
import { THEME_COLORS } from '../../App';
import { speakWithHanisah } from '../../services/elevenLabsService';
import { useVault } from '../../contexts/VaultContext';
import { TRANSLATIONS, type LanguageCode } from '../../services/i18n';
import { DEFAULT_USER_PERSONA } from '../../services/persona';
import { debugService } from '../../services/debugService';
import { KEY_MANAGER } from '../../services/geminiService';
import { UI_REGISTRY, FN_REGISTRY } from '../../constants/registry';
import { type FeatureID } from '../../constants';

interface SettingsViewProps {
    onNavigate?: (feature: FeatureID) => void;
}

interface ToolConfig {
    search: boolean;
    vault: boolean;
    visual: boolean;
}

// --- SUB-COMPONENTS ---

const PromptEditorModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    persona: 'hanisah' | 'stoic';
    currentPrompt: string;
    onSave: (val: string) => void;
    onReset: () => void;
}> = ({ isOpen, onClose, persona, currentPrompt, onSave, onReset }) => {
    const [value, setValue] = useState(currentPrompt);
    
    useEffect(() => { setValue(currentPrompt); }, [currentPrompt, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-2xl bg-[#09090b] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${persona === 'hanisah' ? 'bg-orange-500/10 text-orange-500' : 'bg-cyan-500/10 text-cyan-500'}`}>
                            {persona === 'hanisah' ? <Flame size={20} /> : <Brain size={20} />}
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">NEURAL_MATRIX_EDITOR</h3>
                            <p className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest">Editing {persona.toUpperCase()} System Prompt</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition-all">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="flex-1 p-0 relative group">
                    <textarea 
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="w-full h-full bg-[#050505] p-6 text-xs md:text-sm font-mono text-neutral-300 focus:outline-none resize-none leading-relaxed custom-scroll selection:bg-accent/20"
                        placeholder="Enter system prompt instructions..."
                    />
                </div>

                <div className="p-6 border-t border-white/10 bg-white/[0.02] flex justify-between items-center gap-4">
                    <button 
                        onClick={() => { if(confirm('Reset to factory default?')) { onReset(); onClose(); } }}
                        className="px-4 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-neutral-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                        <Undo2 size={14} /> FACTORY_RESET
                    </button>
                    <button 
                        onClick={() => { onSave(value); onClose(); }}
                        className="px-8 py-3 rounded-xl bg-white text-black hover:bg-accent hover:text-black text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2"
                    >
                        <Save size={14} /> SAVE_MATRIX
                    </button>
                </div>
            </div>
        </div>
    );
};

const SettingsSection: React.FC<{ title: string; children: React.ReactNode; icon: React.ReactNode }> = ({ title, children, icon }) => (
    <div className="space-y-6 animate-slide-up">
        <div className="flex items-center gap-3 px-2">
            <div className="p-2.5 bg-accent/10 rounded-xl text-accent border border-accent/20 shadow-[0_0_15px_rgba(var(--accent-rgb),0.15)]">{icon}</div>
            <h3 className="text-[11px] font-black text-black dark:text-white tech-mono uppercase tracking-[0.3em]">{title}</h3>
        </div>
        <div className="bg-zinc-50 dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-[32px] overflow-hidden p-2 md:p-3 shadow-inner">
            {children}
        </div>
    </div>
);

const SettingsItem: React.FC<{ label: string; desc: string; icon: React.ReactNode; action: React.ReactNode }> = ({ label, desc, icon, action }) => (
    <div className="p-5 md:p-6 bg-white dark:bg-[#0f0f11] rounded-[24px] mb-2 last:mb-0 border border-black/5 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-accent/30 transition-all group shadow-sm">
        <div className="flex items-start gap-5">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-zinc-100 dark:bg-white/[0.03] flex items-center justify-center text-neutral-400 group-hover:text-accent group-hover:scale-110 transition-all shrink-0 border border-black/5 dark:border-white/5 group-hover:bg-accent/5">
                {icon}
            </div>
            <div className="space-y-1">
                <h4 className="text-sm md:text-base font-black text-black dark:text-white uppercase italic tracking-tighter leading-none group-hover:text-accent transition-colors">{label}</h4>
                <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest leading-relaxed max-w-sm">{desc}</p>
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
    activeColor: string; 
    badge?: string;
}> = ({ label, description, icon, isActive, onClick, activeColor, badge }) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 group text-left ${
            isActive 
            ? 'bg-white/80 dark:bg-black/40 border-black/5 dark:border-white/10 shadow-sm' 
            : 'bg-transparent border-transparent hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100'
        }`}
    >
        <div className="flex items-center gap-4">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                isActive ? `${activeColor} text-white shadow-lg` : 'bg-zinc-200 dark:bg-zinc-800 text-neutral-400'
            }`}>
                {React.cloneElement(icon as React.ReactElement<any>, { size: 14 })}
            </div>
            <div>
                <div className="flex items-center gap-2">
                    <h5 className={`text-[9px] font-black uppercase tracking-widest ${isActive ? 'text-black dark:text-white' : 'text-neutral-500'}`}>{label}</h5>
                    {badge && isActive && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[7px] font-bold tracking-wider">{badge}</span>
                    )}
                </div>
                <p className="text-[9px] text-neutral-500 font-medium leading-tight max-w-[180px] mt-0.5 truncate">{description}</p>
            </div>
        </div>
        
        <div className={`w-9 h-5 rounded-full p-1 transition-colors duration-300 relative ${
            isActive ? activeColor : 'bg-zinc-300 dark:bg-zinc-700'
        }`}>
            <div className={`w-3 h-3 bg-white rounded-full shadow-sm absolute top-1 transition-all duration-300 ${
                isActive ? 'left-[20px]' : 'left-1'
            }`} />
        </div>
    </button>
);

// --- MAIN VIEW ---

const SettingsView: React.FC<SettingsViewProps> = ({ onNavigate }) => {
    const { lockVault } = useVault();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Config State - REACTIVE
    const [persistedLanguage, setPersistedLanguage] = useLocalStorage<LanguageCode>('app_language', 'id');
    const [persistedTheme, setPersistedTheme] = useLocalStorage<string>('app_theme', 'cyan');
    const [persistedColorScheme, setPersistedColorScheme] = useLocalStorage<'system' | 'light' | 'dark'>('app_color_scheme', 'system');
    
    // User Persona
    const [userPersona, setUserPersona] = useLocalStorage('user_persona_config', DEFAULT_USER_PERSONA);

    // Voices
    const [persistedHanisahVoice, setPersistedHanisahVoice] = useLocalStorage<string>('hanisah_voice', 'Zephyr');
    const [persistedStoicVoice, setPersistedStoicVoice] = useLocalStorage<string>('stoic_voice', 'Fenrir');

    // System Prompts (The Brains)
    const [hanisahPrompt, setHanisahPrompt] = useLocalStorage<string>('hanisah_system_prompt', '');
    const [stoicPrompt, setStoicPrompt] = useLocalStorage<string>('stoic_system_prompt', '');

    // Tools Configuration
    const [persistedHanisahTools, setPersistedHanisahTools] = useLocalStorage<ToolConfig>('hanisah_tools_config', { search: true, vault: true, visual: true });
    const [persistedStoicTools, setPersistedStoicTools] = useLocalStorage<ToolConfig>('stoic_tools_config', { search: true, vault: true, visual: false });
    
    // Local UI State (For buffering changes before "Saving")
    const [language, setLanguage] = useState(persistedLanguage);
    const [theme, setTheme] = useState(persistedTheme);
    const [colorScheme, setColorScheme] = useState(persistedColorScheme);
    const [hanisahVoice, setHanisahVoice] = useState(persistedHanisahVoice);
    const [stoicVoice, setStoicVoice] = useState(persistedStoicVoice);
    const [hanisahTools, setHanisahTools] = useState(persistedHanisahTools);
    const [stoicTools, setStoicTools] = useState(persistedStoicTools);
    const [localPersona, setLocalPersona] = useState(userPersona);

    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isTestingVoice, setIsTestingVoice] = useState(false);
    
    // Editor Modal State
    const [editingPersona, setEditingPersona] = useState<'hanisah' | 'stoic' | null>(null);

    // Text Resources (Dynamic)
    const t = TRANSLATIONS[language].settings;
    const defaultPrompts = TRANSLATIONS[language].prompts;

    const themeOptions = Object.entries(THEME_COLORS).map(([id, color]) => ({ id, color }));

    const handleSave = () => {
        debugService.logAction(UI_REGISTRY.SETTINGS_BTN_SAVE, FN_REGISTRY.SAVE_CONFIG, 'START');
        setIsSaving(true);
        
        // Simulate System Reconfiguration delay for UX
        setTimeout(() => {
            // Updating these triggers the custom event in useLocalStorage, which updates App.tsx and other views INSTANTLY.
            setPersistedLanguage(language);
            setPersistedTheme(theme);
            setPersistedColorScheme(colorScheme);
            setPersistedHanisahVoice(hanisahVoice);
            setPersistedStoicVoice(stoicVoice);
            setPersistedHanisahTools(hanisahTools);
            setPersistedStoicTools(stoicTools);
            setUserPersona(localPersona);
            
            if ((!hanisahTools.vault && persistedHanisahTools.vault) || (!stoicTools.vault && persistedStoicTools.vault)) {
                lockVault();
            }
            
            setIsSaving(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        }, 1500);
    };

    const handleBackup = () => {
        debugService.logAction(UI_REGISTRY.SETTINGS_BTN_BACKUP, FN_REGISTRY.BACKUP_DATA, 'EXPORT');
        const data = { ...localStorage };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `istoic_full_backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
    };

    const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
        debugService.logAction(UI_REGISTRY.SETTINGS_BTN_RESTORE, FN_REGISTRY.RESTORE_DATA, 'IMPORT');
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const jsonStr = event.target?.result as string;
                const data = JSON.parse(jsonStr);
                
                if (typeof data !== 'object' || data === null) throw new Error("Invalid JSON.");

                if (confirm("WARNING: This will overwrite ALL local data. Proceed?")) {
                    localStorage.clear();
                    Object.keys(data).forEach(key => localStorage.setItem(key, data[key]));
                    debugService.log('INFO', 'SETTINGS', 'RESTORE_SUCCESS', 'System restored.');
                    window.location.reload();
                }
            } catch (err) {
                alert("Invalid backup file.");
            }
        };
        reader.readAsText(file);
    };

    const handleTestHanisahVoice = async () => {
        if (isTestingVoice) return;
        setIsTestingVoice(true);
        try {
            await speakWithHanisah(`Neural link testing successful using ${hanisahVoice} module.`, hanisahVoice);
        } catch (e) {
            alert("Voice synthesis failed.");
        } finally {
            setIsTestingVoice(false);
        }
    };

    const openKernelStream = () => {
        debugService.logAction(UI_REGISTRY.MECH_BTN_SCAN, FN_REGISTRY.NAVIGATE_TO_FEATURE, 'KERNEL_STREAM');
        if (onNavigate) onNavigate('system');
    };

    return (
        <div className="min-h-full flex flex-col p-4 md:p-12 lg:p-16 pb-40 animate-fade-in overflow-x-hidden bg-noise">
             
             {/* CONFIGURATION OVERLAY */}
             {isSaving && (
                 <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center animate-fade-in">
                     <div className="relative">
                         <div className="w-32 h-32 rounded-full border-4 border-accent/20 border-t-accent animate-spin"></div>
                         <Activity size={32} className="text-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                     </div>
                     <h2 className="mt-8 text-2xl font-black text-white uppercase italic tracking-tighter animate-pulse">RECONFIGURING SYSTEM MATRIX...</h2>
                     <p className="mt-2 text-xs font-mono text-accent uppercase tracking-[0.3em]">APPLYING GLOBAL UPDATES</p>
                 </div>
             )}

             {/* EDIT MODAL */}
             <PromptEditorModal 
                isOpen={!!editingPersona}
                onClose={() => setEditingPersona(null)}
                persona={editingPersona || 'hanisah'}
                currentPrompt={editingPersona === 'hanisah' ? (hanisahPrompt || defaultPrompts.hanisah) : (stoicPrompt || defaultPrompts.stoic)}
                onSave={(val) => editingPersona === 'hanisah' ? setHanisahPrompt(val) : setStoicPrompt(val)}
                onReset={() => editingPersona === 'hanisah' ? setHanisahPrompt('') : setStoicPrompt('')}
             />

             <div className="max-w-6xl mx-auto w-full bg-white dark:bg-[#0a0a0b] rounded-[32px] md:rounded-[48px] shadow-sm border border-black/5 dark:border-white/5 p-6 md:p-12 space-y-12 md:space-y-16 relative">
                
                {/* Unified Header */}
                <header className="space-y-4 md:space-y-6 relative z-10 border-b border-black/5 dark:border-white/5 pb-6 md:pb-10">
                    <div className="flex items-center gap-4">
                        <div className="px-3 py-1 bg-accent/10 border border-accent/20 rounded-lg tech-mono text-[9px] font-black text-accent tracking-[0.3em]">CONFIG_V13.5</div>
                        <div className="flex-1 h-[1px] bg-black/5 dark:bg-white/5"></div>
                        <span className="text-neutral-500 tech-mono text-[9px] font-black tracking-widest flex items-center gap-2">
                            <Activity size={12} className="text-green-500 animate-pulse" /> UPLINK_STABLE
                        </span>
                    </div>
                    <div>
                        <h2 className="text-[12vw] xl:text-[7rem] heading-heavy text-black dark:text-white leading-[0.85] tracking-tighter uppercase">
                            CORE <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-blue-500 animate-gradient-text">CONFIG</span>
                        </h2>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
                    <div className="space-y-12">
                        
                        {/* GENERAL SETTINGS */}
                        <SettingsSection title={t.title} icon={<Globe size={18} />}>
                            <SettingsItem 
                                label={t.lang_label} desc={t.lang_desc}
                                icon={<Languages size={22}/>}
                                action={
                                    <div className="flex bg-zinc-100 dark:bg-black/40 p-1 rounded-2xl border border-black/5 w-full md:w-auto">
                                        {[ { id: 'id', label: 'ID' }, { id: 'en', label: 'EN' }, { id: 'bn', label: 'BN' } ].map(lang => (
                                            <button key={lang.id} onClick={() => { debugService.logAction(UI_REGISTRY.SETTINGS_BTN_LANG_ID, FN_REGISTRY.SET_LANGUAGE, lang.id); setLanguage(lang.id as any); }} className={`min-h-[44px] flex-1 px-4 md:px-5 text-[10px] font-black tracking-widest rounded-xl transition-all ${language === lang.id ? 'bg-white dark:bg-white/10 text-accent shadow-md scale-100' : 'text-neutral-500'}`}>
                                                {lang.label}
                                            </button>
                                        ))}
                                    </div>
                                }
                            />
                            <SettingsItem 
                                label={t.theme_label} desc={t.theme_desc}
                                icon={<Palette size={22}/>}
                                action={
                                    <div className="flex bg-zinc-100 dark:bg-black/40 p-1 rounded-2xl border border-black/5 w-full md:w-auto">
                                        {['system', 'light', 'dark'].map(s => (
                                            <button key={s} onClick={() => { debugService.logAction(UI_REGISTRY.SETTINGS_BTN_THEME_SYSTEM, FN_REGISTRY.SET_THEME_MODE, s); setColorScheme(s as any); }} className={`min-h-[44px] flex-1 px-4 md:px-5 text-[9px] font-black uppercase rounded-xl transition-all ${colorScheme === s ? 'bg-white dark:bg-white/10 text-accent shadow-md' : 'text-neutral-500'}`}>
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                }
                            />
                            <SettingsItem 
                                label="NEURAL_COLOR" desc="Operational accent signature."
                                icon={<Monitor size={22}/>}
                                action={
                                    <div className="flex flex-wrap justify-end gap-3 max-w-[240px]">
                                        {themeOptions.map(opt => (
                                            <button key={opt.id} onClick={() => setTheme(opt.id)} className={`w-10 h-10 rounded-xl border-4 transition-all ${theme === opt.id ? 'border-accent shadow-[0_0_15px_var(--accent-glow)] scale-110' : 'border-transparent opacity-40 hover:opacity-100'}`} style={{ backgroundColor: opt.color }} />
                                        ))}
                                    </div>
                                }
                            />
                        </SettingsSection>

                        {/* IDENTITY MATRIX */}
                        <SettingsSection title={t.identity_title || "IDENTITY MATRIX"} icon={<UserCheck size={18} />}>
                            <div className="p-2 space-y-2">
                                <div className="p-6 bg-white dark:bg-[#0f0f11] rounded-[24px] border border-black/5 dark:border-white/5 space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest pl-1">{t.user_name || "USER NAME"}</label>
                                        <input type="text" value={localPersona.nama} onChange={(e) => setLocalPersona({...localPersona, nama: e.target.value})} className="w-full bg-zinc-100 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-black dark:text-white focus:outline-none focus:border-accent/50 transition-all"/>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest pl-1">{t.user_bio || "BIO CONTEXT"}</label>
                                        <textarea value={localPersona.bio} onChange={(e) => setLocalPersona({...localPersona, bio: e.target.value})} className="w-full h-24 bg-zinc-100 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl px-4 py-3 text-xs font-medium text-black dark:text-white focus:outline-none focus:border-accent/50 transition-all resize-none"/>
                                    </div>
                                </div>
                            </div>
                        </SettingsSection>
                    </div>

                    <div className="space-y-12">
                        <SettingsSection title="COGNITIVE_MAPPING" icon={<Cpu size={18} />}>
                            <div className="space-y-6 p-2">
                                {/* HANISAH CONFIG */}
                                <div className="p-6 md:p-8 bg-orange-600/5 rounded-[32px] border border-orange-500/10 space-y-6 group relative overflow-hidden">
                                    <div className="flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-orange-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><Flame size={24} /></div>
                                            <div>
                                                <h4 className="text-xl font-black italic text-black dark:text-white uppercase tracking-tighter">HANISAH_CORE</h4>
                                                <p className="text-[8px] font-black text-orange-500/60 uppercase tracking-widest">Heuristic Synthesis</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setEditingPersona('hanisah')} className="p-2.5 bg-white dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5 text-neutral-500 hover:text-orange-500 transition-all hover:scale-105" title="Edit Persona Matrix">
                                                <Edit3 size={16} />
                                            </button>
                                            <button onClick={handleTestHanisahVoice} disabled={isTestingVoice} className="p-2.5 bg-white dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5 text-orange-500 hover:bg-orange-600 hover:text-white transition-all hover:scale-105">
                                                {isTestingVoice ? <RefreshCw className="animate-spin" size={16} /> : <Play size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3 relative z-10">
                                        <div className="flex bg-white dark:bg-black/40 p-1 rounded-2xl border border-black/5 dark:border-white/5">
                                            {['Zephyr', 'Kore', 'Hanisah'].map(v => (
                                                <button key={v} onClick={() => setHanisahVoice(v)} className={`flex-1 min-h-[40px] text-[9px] font-black uppercase rounded-xl transition-all ${hanisahVoice === v ? 'bg-orange-600 text-white shadow-md' : 'text-neutral-500 opacity-60'}`}>{v}</button>
                                            ))}
                                        </div>
                                        <div className="flex flex-col gap-2 pt-2">
                                            <ToolRow label="WEB_SEARCH" description="Real-time grounding." icon={<Globe />} isActive={hanisahTools.search} activeColor="bg-orange-600" onClick={() => setHanisahTools(prev => ({...prev, search: !prev.search}))} />
                                            <ToolRow label="VAULT_ACCESS" description="Memory permission." icon={<DatabaseZap />} isActive={hanisahTools.vault} activeColor="bg-orange-600" badge="SECURE" onClick={() => setHanisahTools(prev => ({...prev, vault: !prev.vault}))} />
                                            <ToolRow label="VISUAL_CORTEX" description="Image generation." icon={<ImageIcon />} isActive={hanisahTools.visual} activeColor="bg-orange-600" onClick={() => setHanisahTools(prev => ({...prev, visual: !prev.visual}))} />
                                        </div>
                                    </div>
                                </div>
                                
                                {/* STOIC CONFIG */}
                                <div className="p-6 md:p-8 bg-blue-600/5 rounded-[32px] border border-blue-500/10 space-y-6 group relative overflow-hidden">
                                    <div className="flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><Brain size={24} /></div>
                                            <div>
                                                <h4 className="text-xl font-black italic text-black dark:text-white uppercase tracking-tighter">STOIC_CORE</h4>
                                                <p className="text-[8px] font-black text-blue-500/60 uppercase tracking-widest">Logic Kernel</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setEditingPersona('stoic')} className="p-2.5 bg-white dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5 text-neutral-500 hover:text-blue-500 transition-all hover:scale-105" title="Edit Persona Matrix">
                                            <Edit3 size={16} />
                                        </button>
                                    </div>
                                    <div className="space-y-3 relative z-10">
                                        <div className="flex bg-white dark:bg-black/40 p-1 rounded-2xl border border-black/5 dark:border-white/5">
                                            {['Fenrir', 'Puck'].map(v => (
                                                <button key={v} onClick={() => setStoicVoice(v)} className={`flex-1 min-h-[40px] text-[9px] font-black uppercase rounded-xl transition-all ${stoicVoice === v ? 'bg-blue-600 text-white shadow-md' : 'text-neutral-500 opacity-60'}`}>{v}</button>
                                            ))}
                                        </div>
                                        <div className="flex flex-col gap-2 pt-2">
                                            <ToolRow label="LOGIC_ONLY" description="No external tools." icon={<Shield />} isActive={!stoicTools.search && !stoicTools.visual} activeColor="bg-blue-600" onClick={() => setStoicTools({ search: false, vault: stoicTools.vault, visual: false })} />
                                            <ToolRow label="VAULT_ACCESS" description="Memory permission." icon={<DatabaseZap />} isActive={stoicTools.vault} activeColor="bg-blue-600" badge="SECURE" onClick={() => setStoicTools(prev => ({...prev, vault: !prev.vault}))} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </SettingsSection>

                        {/* DATA GOVERNANCE */}
                        <SettingsSection title={t.data_title || "DATA GOVERNANCE"} icon={<HardDrive size={18} />}>
                            <div className="p-2 grid grid-cols-2 gap-3">
                                <button onClick={handleBackup} className="p-4 bg-white dark:bg-[#0f0f11] border border-black/5 dark:border-white/5 rounded-[20px] flex flex-col items-center justify-center gap-3 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform"><Download size={18} /></div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">{t.backup || "BACKUP (JSON)"}</span>
                                </button>
                                <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-white dark:bg-[#0f0f11] border border-black/5 dark:border-white/5 rounded-[20px] flex flex-col items-center justify-center gap-3 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform"><Upload size={18} /></div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">{t.restore || "RESTORE DATA"}</span>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="application/json" onChange={handleRestore} />
                                </button>
                            </div>
                        </SettingsSection>

                        {/* DEVELOPER MATRIX */}
                        <SettingsSection title="DEVELOPER_MATRIX" icon={<Terminal size={18} />}>
                            <div className="p-4 bg-zinc-900 rounded-[24px] border border-white/10 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h4 className="text-xs font-black text-white uppercase tracking-wider">Kernel Stream</h4>
                                        <p className="text-[9px] text-neutral-500">Access full system diagnostics.</p>
                                    </div>
                                    <button onClick={openKernelStream} className="px-4 py-2 bg-white/10 hover:bg-accent hover:text-black text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">OPEN_KERNEL_STREAM</button>
                                </div>
                                <div className="h-[1px] bg-white/5"></div>
                                <button onClick={() => { debugService.runSelfDiagnosis(KEY_MANAGER); alert("Diagnosis Initiated. Check Kernel Stream."); }} className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-mono text-neutral-400 hover:text-white transition-all uppercase tracking-widest border border-white/5">RUN_SELF_DIAGNOSIS_PROTOCOL</button>
                            </div>
                        </SettingsSection>
                    </div>
                </div>

                <div className="space-y-6 pt-10 border-t border-black/5 dark:border-white/5">
                    <button onClick={handleSave} disabled={isSaving} className={`w-full py-6 md:py-8 rounded-[32px] font-black uppercase text-[12px] md:text-[14px] tracking-[0.5em] flex items-center justify-center gap-4 transition-all shadow-xl hover:scale-[1.01] active:scale-95 ${saveSuccess ? 'bg-emerald-600 text-white shadow-emerald-500/30' : 'bg-accent text-on-accent shadow-[0_0_30px_var(--accent-glow)]'}`}>
                        {isSaving ? <Loader2 className="animate-spin" size={24} /> : saveSuccess ? <CheckCircle2 size={24} /> : <Zap size={24} />}
                        {isSaving ? "RECONFIGURING..." : saveSuccess ? t.saved || "UPDATED" : t.save}
                    </button>

                    <button onClick={() => { debugService.logAction(UI_REGISTRY.SETTINGS_BTN_RESET, FN_REGISTRY.RESET_SYSTEM, 'CONFIRM'); if(confirm("Hapus semua data kognitif permanen?")) { localStorage.clear(); window.location.reload(); } }} className="w-full py-5 rounded-[28px] border border-red-500/20 bg-red-500/5 text-red-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-red-500 hover:text-white transition-all shadow-inner">
                        <Trash2 size={16} /> {t.reset}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
