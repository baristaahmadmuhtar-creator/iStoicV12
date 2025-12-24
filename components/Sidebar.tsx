
import React, { useState, memo } from 'react';
import { type FeatureID, FEATURES } from '../constants';
import useLocalStorage from '../hooks/useLocalStorage';
import { Settings, Bug, Flame, Cpu } from 'lucide-react';
import { useNavigationIntelligence } from '../hooks/useNavigationIntelligence';

interface SidebarProps {
  activeFeature: FeatureID;
  setActiveFeature: (feature: FeatureID) => void;
  onToggleDebug: () => void;
  chatLogic: any;
}

export const Sidebar: React.FC<SidebarProps> = memo(({ activeFeature, setActiveFeature, onToggleDebug, chatLogic }) => {
  const [personaMode] = useLocalStorage<'melsa' | 'stoic'>('ai_persona_mode', 'melsa');
  const [language] = useLocalStorage<'id' | 'en'>('app_language', 'id');
  const [isHovered, setIsHovered] = useState(false);
  const { isForcedStealth } = useNavigationIntelligence();
  
  // LOGIC UPDATE: Desktop sidebar only hides for Modals (isForcedStealth).
  // It no longer cares about scroll direction (!shouldShowNav) for visibility.
  const isStealthMode = isForcedStealth;

  const featureNames = {
      id: { dashboard: "TERMINAL", notes: "ARSIP", chat: "AI_CHAT", tools: "ARSENAL", settings: "KONFIG" },
      en: { dashboard: "HOME", notes: "VAULT", chat: "AI_CHAT", tools: "TOOLS", settings: "CONFIG" }
  };

  const getLabel = (id: string) => (featureNames[language] as any)[id] || id;

  return (
    <aside 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`hidden md:flex flex-col h-full bg-white/40 dark:bg-[#080809]/95 backdrop-blur-xl border-r z-[500] transition-all duration-700 ease-[cubic-bezier(0.2,0,0,1)] relative group overflow-hidden border-black/5 dark:border-white/10 ${
        isForcedStealth 
          ? 'w-0 opacity-0 border-none' 
          : (isStealthMode ? 'w-[80px]' : (isHovered ? 'w-72 shadow-[20px_0_60px_rgba(0,0,0,0.4)]' : 'w-[80px]'))
      }`}
    >
      <div className="w-full flex flex-col h-full relative z-10">
        
        {/* Header Logo */}
        <div className={`h-20 flex items-center transition-all duration-500 ${isHovered ? 'px-6' : 'justify-center'} ${isStealthMode && !isHovered ? 'opacity-100' : 'opacity-100'}`}>
            <div className="flex items-center gap-3 cursor-pointer group/logo" onClick={() => setActiveFeature('dashboard')}>
              <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 bg-accent text-on-accent shadow-[0_0_20px_var(--accent-glow)] ${isHovered ? 'rotate-0' : 'rotate-12 group-hover/logo:rotate-0'}`}>
                {personaMode === 'melsa' ? <Flame size={20} strokeWidth={2.5} /> : <Cpu size={20} strokeWidth={2.5} />}
              </div>
              <div className={`transition-all duration-500 delay-75 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none absolute'}`}>
                <h1 className="text-lg font-black italic tracking-tighter text-black dark:text-white leading-none">
                  IStoic<span className="text-accent">AI</span>
                </h1>
              </div>
            </div>
        </div>

        {/* Navigation Links */}
        <div className={`flex-1 flex flex-col transition-all duration-500 overflow-hidden ${isHovered ? 'px-4' : 'px-3'}`}>
            <nav className="flex flex-col gap-1.5 mt-8">
              {FEATURES.map((feature) => {
                const isActive = activeFeature === feature.id;
                return (
                  <button
                    key={feature.id}
                    onClick={() => setActiveFeature(feature.id)}
                    className={`w-full group/btn flex items-center transition-all duration-300 relative rounded-xl ${
                      isHovered ? 'px-3.5 py-2.5 gap-3' : 'justify-center py-3.5'
                    } ${
                      isActive 
                      ? 'bg-accent/5 text-accent border border-accent/10 shadow-sm' 
                      : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className={`transition-transform duration-300 ${isActive ? 'scale-105' : 'group-hover/btn:scale-105'}`}>
                      {/* Fix: Casting to ReactElement<any> to allow size prop in cloneElement */}
                      {React.cloneElement(feature.icon as React.ReactElement<any>, { size: 18 })}
                    </div>
                    <div className={`flex-1 transition-all duration-300 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 absolute'}`}>
                      <span className={`text-[8px] font-black tracking-[0.2em] uppercase italic ${isActive ? 'text-accent' : 'text-neutral-500'}`}>
                        {getLabel(feature.id)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </nav>
        </div>

        {/* Footer Actions */}
        <div className={`mt-auto transition-all duration-500 ${isHovered ? 'p-5 space-y-1' : 'p-2 flex flex-col items-center gap-1 pb-8'}`}>
            <button onClick={onToggleDebug} className="w-9 h-9 flex items-center justify-center text-neutral-500 hover:text-accent transition-all hover:bg-accent/5 rounded-xl"><Bug size={14} /></button>
            <button onClick={() => setActiveFeature('settings')} className="w-9 h-9 flex items-center justify-center text-neutral-500 hover:text-accent transition-all hover:bg-accent/5 rounded-xl"><Settings size={14} /></button>
        </div>
      </div>
    </aside>
  );
});
