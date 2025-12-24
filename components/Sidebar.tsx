
import React, { useState, memo } from 'react';
import { type FeatureID, FEATURES } from '../constants';
import useLocalStorage from '../hooks/useLocalStorage';
import { Settings, Flame, Cpu, Activity, Zap } from 'lucide-react';
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

  const getLabel = (id: string) => (featureNames[language] as any)[id] || id;

  const handleLogoClick = () => setActiveFeature('dashboard');

  return (
    <>
      {/* Spacer to push content */}
      <div className="hidden md:block w-[80px] h-full flex-none shrink-0 transition-all duration-500" />

      <aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          hidden md:flex flex-col fixed top-0 left-0 bottom-0 
          z-[1200] 
          bg-[#050505]/80 dark:bg-[#000000]/80 backdrop-blur-2xl 
          border-r border-white/5
          transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
          ${isHovered ? 'w-[280px] shadow-[20px_0_60px_rgba(0,0,0,0.5)]' : 'w-[80px]'}
          ${isForcedStealth ? 'opacity-0 pointer-events-none -translate-x-full' : 'opacity-100 translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full w-full overflow-hidden py-8">
          
          {/* LOGO SECTION */}
          <div className={`px-5 mb-10 transition-all duration-500 ${isHovered ? 'items-start' : 'items-center'} flex flex-col`}>
              <button 
                onClick={handleLogoClick}
                className={`
                  relative group outline-none transition-all duration-500
                  ${isHovered ? 'w-full flex items-center gap-4' : 'w-12 h-12 flex items-center justify-center'}
                `}
              >
                <div className={`
                  shrink-0 w-10 h-10 rounded-xl flex items-center justify-center 
                  bg-gradient-to-br from-[var(--accent-color)] to-blue-600 text-white 
                  shadow-[0_0_20px_var(--accent-glow)] transition-all duration-500 
                  group-hover:scale-110 relative overflow-hidden
                `}>
                  <div className="absolute inset-0 bg-white/20 skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  {personaMode === 'melsa' ? <Flame size={20} strokeWidth={2.5} /> : <Cpu size={20} strokeWidth={2.5} />}
                </div>

                <div className={`flex flex-col items-start overflow-hidden whitespace-nowrap transition-all duration-500 ${isHovered ? 'opacity-100 max-w-[200px] translate-x-0' : 'opacity-0 max-w-0 -translate-x-4'}`}>
                  <h1 className="text-xl font-black italic tracking-tighter text-white leading-none">
                    ISTOIC<span className="text-[var(--accent-color)]">AI</span>
                  </h1>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-[7px] tech-mono font-bold text-neutral-400 tracking-widest uppercase">PLATINUM_OS</span>
                  </div>
                </div>
              </button>
          </div>

          {/* NAVIGATION LINKS */}
          <nav className="flex-1 flex flex-col gap-3 px-4 w-full">
            {FEATURES.map((feature) => {
              const isActive = activeFeature === feature.id;
              const label = getLabel(feature.id);
              
              return (
                <button
                  key={feature.id}
                  onClick={() => setActiveFeature(feature.id)}
                  className={`
                    relative flex items-center rounded-xl transition-all duration-300 group overflow-hidden
                    ${isHovered ? 'w-full px-4 py-3.5 gap-4' : 'w-12 h-12 justify-center mx-auto'}
                    ${isActive 
                      ? 'bg-[var(--accent-color)]/10 text-[var(--accent-color)] border border-[var(--accent-color)]/20 shadow-[0_0_15px_rgba(var(--accent-rgb),0.1)]' 
                      : 'text-neutral-500 hover:text-white hover:bg-white/5 border border-transparent'}
                  `}
                >
                  {/* Active Indicator Line */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[var(--accent-color)] shadow-[0_0_10px_var(--accent-color)]" />
                  )}

                  <div className={`transition-transform duration-300 relative z-10 ${isActive ? 'scale-110 drop-shadow-[0_0_5px_var(--accent-color)]' : 'group-hover:scale-110'}`}>
                    {React.cloneElement(feature.icon as React.ReactElement<any>, { size: 20 })}
                  </div>

                  <div className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isHovered ? 'opacity-100 max-w-[150px]' : 'opacity-0 max-w-0'}`}>
                    <span className="text-[10px] font-black tracking-[0.25em] uppercase">{label}</span>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* SYSTEM FOOTER */}
          <div className="mt-auto px-4 flex flex-col gap-4">
             {isHovered && (
                 <div className="p-3 bg-white/5 rounded-xl border border-white/5 animate-fade-in">
                    <div className="flex justify-between items-center text-[8px] font-black text-neutral-500 uppercase tracking-widest mb-2">
                        <span>SYSTEM_HEALTH</span>
                        <span className="text-green-500">98%</span>
                    </div>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 w-[98%] shadow-[0_0_10px_#22c55e]"></div>
                    </div>
                 </div>
             )}

             <div className={`h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent mx-2 mb-2 transition-all ${isHovered ? 'opacity-100' : 'opacity-0'}`} />

             <button 
                onClick={() => setActiveFeature('settings')}
                className={`
                  flex items-center rounded-xl transition-all duration-300 group
                  ${isHovered ? 'w-full px-4 py-3 gap-4 bg-white/5 hover:bg-white/10 border border-white/5' : 'w-12 h-12 justify-center mx-auto hover:bg-white/5'}
                  ${activeFeature === 'settings' ? 'text-white border-white/20' : 'text-neutral-500'}
                `}
             >
                <Settings size={18} className={activeFeature === 'settings' ? 'animate-spin-slow' : 'group-hover:rotate-45 transition-transform'} />
                <div className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isHovered ? 'opacity-100 max-w-[150px]' : 'opacity-0 max-w-0'}`}>
                    <span className="text-[10px] font-black tracking-[0.2em] uppercase">SYS_CONFIG</span>
                </div>
             </button>
          </div>

        </div>
      </aside>
    </>
  );
});
