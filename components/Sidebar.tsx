
import React, { useState, memo } from 'react';
import { type FeatureID, FEATURES } from '../constants';
import useLocalStorage from '../hooks/useLocalStorage';
import { Settings, Flame, Cpu } from 'lucide-react';
import { useNavigationIntelligence } from '../hooks/useNavigationIntelligence';

interface SidebarProps {
  activeFeature: FeatureID;
  setActiveFeature: (feature: FeatureID) => void;
  chatLogic: any;
}

export const Sidebar: React.FC<SidebarProps> = memo(({ activeFeature, setActiveFeature }) => {
  const [personaMode] = useLocalStorage<'melsa' | 'stoic'>('ai_persona_mode', 'melsa');
  const [language] = useLocalStorage<'id' | 'en'>('app_language', 'id');
  const [isHovered, setIsHovered] = useState(false);
  const { isForcedStealth } = useNavigationIntelligence();
  
  const featureNames = {
      id: { dashboard: "TERMINAL", notes: "VAULT_DB", chat: "NEURAL_LINK", tools: "ARSENAL", system: "SYSTEM", settings: "CONFIG" },
      en: { dashboard: "TERMINAL", notes: "VAULT_DB", chat: "NEURAL_LINK", tools: "ARSENAL", system: "SYSTEM", settings: "CONFIG" }
  };

  const featureTooltips = {
      id: { 
          dashboard: "Akses Dashboard Utama", 
          notes: "Buka Vault Database", 
          chat: "Mulai Neural Link Chat", 
          tools: "Akses Arsenal AI Tools",
          system: "Diagnosa Kesehatan Sistem & Terminal",
          settings: "Buka Konfigurasi Sistem",
          logo: "Kembali ke Dashboard"
      },
      en: { 
          dashboard: "Access Main Dashboard", 
          notes: "Open Vault Database", 
          chat: "Start Neural Link Chat", 
          tools: "Access AI Tools Arsenal",
          system: "System Health Diagnostics & Terminal",
          settings: "Open System Configuration",
          logo: "Return to Dashboard"
      }
  };

  const getLabel = (id: string) => (featureNames[language] as any)[id] || id;
  const getTooltip = (id: string) => (featureTooltips[language] as any)[id] || "";

  const handleLogoClick = () => setActiveFeature('dashboard');

  return (
    <>
      <div className="hidden md:block w-[72px] h-full flex-none shrink-0 transition-all duration-500" />

      <aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          hidden md:flex flex-col fixed top-0 left-0 bottom-0 
          z-[1200] 
          bg-zinc-50/90 dark:bg-[#050505]/90 backdrop-blur-2xl 
          border-r border-black/5 dark:border-white/5
          transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
          ${isHovered ? 'w-[260px] shadow-[20px_0_40px_rgba(0,0,0,0.1)]' : 'w-[72px]'}
          ${isForcedStealth ? 'opacity-20 pointer-events-none grayscale blur-[1px]' : 'opacity-100'}
        `}
      >
        <div className="flex flex-col h-full w-full overflow-hidden py-6">
          
          <div className={`px-3 mb-8 transition-all duration-500 ${isHovered ? 'items-start' : 'items-center'} flex flex-col`}>
              <button 
                onClick={handleLogoClick}
                title={getTooltip('logo')}
                aria-label={getTooltip('logo')}
                className={`
                  relative group outline-none transition-all duration-500
                  ${isHovered ? 'w-full flex items-center gap-4 px-2' : 'w-12 h-12 flex items-center justify-center'}
                `}
              >
                <div className={`
                  shrink-0 w-10 h-10 rounded-xl flex items-center justify-center 
                  bg-gradient-to-br from-[var(--accent-color)] to-blue-600 text-white 
                  shadow-[0_0_15px_var(--accent-glow)] transition-all duration-500 
                  group-hover:scale-110 group-hover:rotate-3
                `}>
                  {personaMode === 'melsa' ? <Flame size={20} strokeWidth={2.5} /> : <Cpu size={20} strokeWidth={2.5} />}
                </div>

                <div className={`flex flex-col items-start overflow-hidden whitespace-nowrap transition-all duration-500 ${isHovered ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0'}`}>
                  <h1 className="text-lg font-black italic tracking-tighter text-black dark:text-white leading-none">
                    ISTOIC<span className="text-[var(--accent-color)]">AI</span>
                  </h1>
                  <span className="text-[8px] tech-mono font-bold text-neutral-400 tracking-widest mt-0.5">PLATINUM_OS</span>
                </div>
              </button>
          </div>

          <nav className="flex-1 flex flex-col gap-2 px-3 w-full">
            {FEATURES.map((feature) => {
              const isActive = activeFeature === feature.id;
              const label = getLabel(feature.id);
              const tooltip = getTooltip(feature.id);
              
              return (
                <button
                  key={feature.id}
                  onClick={() => setActiveFeature(feature.id)}
                  title={tooltip}
                  aria-label={label}
                  className={`
                    relative flex items-center rounded-xl transition-all duration-300 group
                    ${isHovered ? 'w-full px-3 py-3 gap-4' : 'w-12 h-12 justify-center'}
                    ${isActive 
                      ? 'bg-[var(--accent-color)]/10 text-[var(--accent-color)]' 
                      : 'text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}
                  `}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[var(--accent-color)] rounded-r-full shadow-[0_0_10px_var(--accent-color)]" />
                  )}

                  <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                    {React.cloneElement(feature.icon as React.ReactElement<any>, { size: 20 })}
                  </div>

                  <div className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isHovered ? 'opacity-100 max-w-[150px]' : 'opacity-0 max-w-0'}`}>
                    <span className="text-[10px] font-black tracking-[0.2em] uppercase">{label}</span>
                  </div>

                  {isHovered && isActive && (
                    <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-[var(--accent-color)] animate-pulse" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto px-3 flex flex-col gap-2">
             <div className={`h-[1px] bg-black/5 dark:bg-white/5 mx-2 mb-2 transition-all ${isHovered ? 'opacity-100' : 'opacity-0'}`} />

             <button 
                onClick={() => setActiveFeature('settings')}
                className={`
                  flex items-center rounded-xl transition-all duration-300 group
                  ${isHovered ? 'w-full px-3 py-3 gap-4 bg-black/5 dark:bg-white/5' : 'w-12 h-12 justify-center hover:bg-black/5 dark:hover:bg-white/5'}
                  ${activeFeature === 'settings' ? 'text-black dark:text-white' : 'text-neutral-500'}
                `}
                title={getTooltip('settings')}
                aria-label={getTooltip('settings')}
             >
                <Settings size={18} className={activeFeature === 'settings' ? 'animate-spin-slow' : ''} />
                <div className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isHovered ? 'opacity-100 max-w-[150px]' : 'opacity-0 max-w-0'}`}>
                    <span className="text-[10px] font-black tracking-[0.2em] uppercase">SYSTEM_CONFIG</span>
                </div>
             </button>
          </div>

        </div>
      </aside>
    </>
  );
});
