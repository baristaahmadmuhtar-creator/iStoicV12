
import React, { useState, useEffect, memo } from 'react';
import { type FeatureID, FEATURES } from '../constants';
import useLocalStorage from '../hooks/useLocalStorage';
import { Settings, Flame, Cpu, Activity, AlertTriangle, PanelLeft, PanelLeftClose } from 'lucide-react';
import { useNavigationIntelligence } from '../hooks/useNavigationIntelligence';
import { getText, getLang } from '../services/i18n';
import { debugService } from '../services/debugService';
import { UI_REGISTRY, FN_REGISTRY, UI_ID } from '../constants/registry';
import { useFeatures } from '../contexts/FeatureContext';

interface SidebarProps {
  activeFeature: FeatureID;
  setActiveFeature: (feature: FeatureID) => void;
  chatLogic: any;
}

export const Sidebar: React.FC<SidebarProps> = memo(({ activeFeature, setActiveFeature }) => {
  const [personaMode] = useLocalStorage<'hanisah' | 'stoic'>('ai_persona_mode', 'hanisah');
  
  // Persistent Expansion State
  const [isExpanded, setIsExpanded] = useLocalStorage<boolean>('sidebar_expanded', false);
  
  const { isForcedStealth } = useNavigationIntelligence();
  const { features } = useFeatures();
  
  const [healthScore, setHealthScore] = useState(100);
  const [healthColor, setHealthColor] = useState('bg-green-500');
  
  // UI Matrix State for disabling buttons
  const [uiMatrix, setUiMatrix] = useState<Record<string, any>>(debugService.getUIMatrix());

  useEffect(() => {
      // If Auto Diagnostics is disabled, do not poll system health.
      if (!features.AUTO_DIAGNOSTICS) {
          return;
      }

      const checkHealth = () => {
          const stats = debugService.getSystemHealth();
          let score = 100;
          if (stats.avgLatency > 500) score -= 10;
          if (stats.avgLatency > 1500) score -= 20;
          score -= (stats.errorCount * 5);
          if (stats.memoryMb && stats.memoryMb > 500) score -= 10;
          score = Math.max(0, Math.min(100, score));
          
          setHealthScore(score);
          if (score >= 80) setHealthColor('bg-green-500');
          else if (score >= 50) setHealthColor('bg-yellow-500');
          else setHealthColor('bg-red-500');
      };

      // Run once immediately
      checkHealth();

      const interval = setInterval(checkHealth, 2000);
      const unsubscribe = debugService.subscribeUI((state) => setUiMatrix(state)); // Listen to matrix updates
      
      return () => { 
          clearInterval(interval);
          unsubscribe(); 
      };
  }, [features.AUTO_DIAGNOSTICS]);
  
  const getLabel = (id: string) => {
      const keyMap: Record<string, string> = {
          dashboard: 'dashboard',
          notes: 'notes',
          chat: 'chat',
          tools: 'tools',
          system: 'system',
          settings: 'settings'
      };
      const transKey = keyMap[id];
      return transKey ? getText('sidebar', transKey) : id.toUpperCase();
  };

  const handleNavLogo = () => {
      if (debugService.logAction(UI_REGISTRY.SIDEBAR_BTN_LOGO, FN_REGISTRY.NAVIGATE_TO_FEATURE, 'DASHBOARD')) {
          setActiveFeature('dashboard');
      }
  };

  const handleNavSystem = () => {
      if (debugService.logAction(UI_REGISTRY.SIDEBAR_BTN_SYSTEM, FN_REGISTRY.NAVIGATE_TO_FEATURE, 'SYSTEM')) {
          setActiveFeature('system');
      }
  };

  const handleNavSettings = () => {
      if (debugService.logAction(UI_REGISTRY.SIDEBAR_BTN_SETTINGS, FN_REGISTRY.NAVIGATE_TO_FEATURE, 'SETTINGS')) {
          setActiveFeature('settings');
      }
  };

  const handleToggleSidebar = () => {
      if (debugService.logAction(UI_REGISTRY.SIDEBAR_BTN_TOGGLE, FN_REGISTRY.UI_TOGGLE_SIDEBAR, isExpanded ? 'COLLAPSE' : 'EXPAND')) {
          setIsExpanded(prev => !prev);
      }
  };

  // Function to map Feature ID to UI ID strictly
  const getUiIdForFeature = (fid: FeatureID): UI_ID => {
      switch(fid) {
          case 'dashboard': return UI_REGISTRY.SIDEBAR_BTN_DASHBOARD;
          case 'notes': return UI_REGISTRY.SIDEBAR_BTN_NOTES;
          case 'chat': return UI_REGISTRY.SIDEBAR_BTN_CHAT;
          case 'tools': return UI_REGISTRY.SIDEBAR_BTN_TOOLS;
          case 'system': return UI_REGISTRY.SIDEBAR_BTN_SYSTEM;
          case 'settings': return UI_REGISTRY.SIDEBAR_BTN_SETTINGS;
          default: return UI_REGISTRY.SIDEBAR_BTN_DASHBOARD;
      }
  };

  return (
    <>
      {/* Dynamic Spacer for Content Pushing */}
      <div 
        className={`hidden md:block h-full flex-none shrink-0 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isExpanded ? 'w-[280px]' : 'w-[80px]'}`} 
      />

      <aside 
        className={`
          hidden md:flex flex-col fixed top-0 left-0 bottom-0 
          z-[1200] 
          bg-white/80 dark:bg-[#050505]/80 backdrop-blur-2xl 
          border-r border-black/5 dark:border-white/5
          transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
          ${isExpanded ? 'w-[280px] shadow-[20px_0_60px_rgba(0,0,0,0.1)] dark:shadow-[20px_0_60px_rgba(0,0,0,0.5)]' : 'w-[80px]'}
          ${isForcedStealth ? 'opacity-0 pointer-events-none -translate-x-full' : 'opacity-100 translate-x-0'}
        `}
        role="navigation"
        aria-label="Main Navigation"
      >
        <div className="flex flex-col h-full w-full overflow-hidden py-6">
          
          {/* LOGO & TOGGLE */}
          <div className={`px-5 mb-10 transition-all duration-500 flex flex-col ${isExpanded ? 'items-start' : 'items-center'}`}>
              <div className="flex items-center justify-between w-full">
                  <button 
                    onClick={handleNavLogo}
                    aria-label="Go to Dashboard"
                    className="relative group outline-none"
                  >
                    <div className={`
                      shrink-0 w-10 h-10 rounded-xl flex items-center justify-center 
                      bg-accent text-on-accent 
                      shadow-[0_0_20px_var(--accent-glow)] transition-all duration-500 
                      group-hover:scale-110 relative overflow-hidden group-hover:rotate-3
                    `}>
                      <div className="absolute inset-0 bg-white/20 skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                      {personaMode === 'hanisah' ? <Flame size={20} strokeWidth={2.5} /> : <Cpu size={20} strokeWidth={2.5} />}
                    </div>
                  </button>

                  {/* Toggle Button - Visible only when expanded for top-right placement, or re-layout for collapsed */}
                  {isExpanded && (
                      <button 
                        onClick={handleToggleSidebar}
                        className="p-2 rounded-lg text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                        aria-label="Collapse Sidebar"
                      >
                          <PanelLeftClose size={18} />
                      </button>
                  )}
              </div>

              {/* Text Label - Only visible when expanded */}
              <div className={`mt-4 overflow-hidden whitespace-nowrap transition-all duration-500 flex flex-col ${isExpanded ? 'opacity-100 max-h-[100px] translate-x-0' : 'opacity-0 max-h-0 -translate-x-4 pointer-events-none'}`}>
                  <h1 className="text-xl font-black italic tracking-tighter text-black dark:text-white leading-none uppercase">
                    ISTOIC<span className="text-accent">AI</span>
                  </h1>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_#22c55e]"></div>
                    <span className="text-[7px] tech-mono font-bold text-neutral-400 tracking-widest uppercase">PLATINUM_OS</span>
                  </div>
              </div>

              {/* Centered Toggle Button when collapsed */}
              {!isExpanded && (
                  <button 
                    onClick={handleToggleSidebar}
                    className="mt-6 p-2 rounded-lg text-neutral-400 hover:text-accent hover:bg-accent/10 transition-all"
                    aria-label="Expand Sidebar"
                  >
                      <PanelLeft size={18} />
                  </button>
              )}
          </div>

          {/* NAVIGATION LINKS */}
          <nav className="flex-1 flex flex-col gap-3 px-4 w-full" aria-label="Feature Links">
            {FEATURES.map((feature) => {
              const isActive = activeFeature === feature.id;
              const label = getLabel(feature.id);
              const uiId = getUiIdForFeature(feature.id);
              const isDisabled = uiMatrix[uiId]?.status === 'DISABLED';
              
              const handleClick = () => {
                  if (!isDisabled) {
                      if (debugService.logAction(uiId, FN_REGISTRY.NAVIGATE_TO_FEATURE, feature.id)) {
                          setActiveFeature(feature.id);
                      }
                  }
              };

              return (
                <button
                  key={feature.id}
                  onClick={handleClick}
                  aria-label={label}
                  disabled={isDisabled}
                  aria-current={isActive ? 'page' : undefined}
                  className={`
                    relative flex items-center rounded-xl transition-all duration-300 group overflow-hidden
                    ${isExpanded ? 'w-full px-4 py-3.5 gap-4' : 'w-12 h-12 justify-center mx-auto'}
                    ${isDisabled 
                        ? 'opacity-40 cursor-not-allowed bg-red-500/5 grayscale' 
                        : isActive 
                            ? 'bg-accent/10 text-accent border border-accent/20 shadow-[0_0_15px_var(--accent-glow)]' 
                            : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
                    }
                  `}
                  title={!isExpanded ? label : undefined}
                >
                  {isActive && !isDisabled && (
                    <div className={`absolute bg-accent shadow-[0_0_10px_var(--accent-color)] ${isExpanded ? 'left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full' : 'bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 rounded-t-full'}`} />
                  )}

                  <div className={`transition-transform duration-300 relative z-10 ${isActive && !isDisabled ? 'scale-110 drop-shadow-[0_0_8px_var(--accent-color)]' : 'group-hover:scale-110'}`}>
                    {isDisabled 
                        ? <AlertTriangle size={16} className="text-red-500" /> 
                        : React.cloneElement(feature.icon as React.ReactElement<any>, { size: 20 })
                    }
                  </div>

                  <div className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isExpanded ? 'opacity-100 max-w-[150px]' : 'opacity-0 max-w-0'}`}>
                    <span className={`text-[10px] font-black tracking-[0.25em] uppercase ${isDisabled ? 'text-red-500 line-through decoration-red-500/50' : ''}`}>
                        {label}
                    </span>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* SYSTEM FOOTER */}
          <div className="mt-auto px-4 flex flex-col gap-4">
             {/* System Status - Only Fully visible when expanded, simplified when collapsed */}
             <button 
                onClick={handleNavSystem}
                aria-label={`System Integrity: ${healthScore}%`}
                className={`
                    rounded-xl border transition-colors w-full text-left group
                    ${isExpanded 
                        ? 'p-3 bg-zinc-100 dark:bg-white/5 border-black/5 dark:border-white/5 hover:border-accent/30' 
                        : 'p-0 border-transparent bg-transparent justify-center flex'
                    }
                `}
                title={!isExpanded ? `System Integrity: ${healthScore}%` : undefined}
             >
                {isExpanded ? (
                    <>
                        <div className="flex justify-between items-center text-[8px] font-black text-neutral-500 uppercase tracking-widest mb-2 group-hover:text-black dark:group-hover:text-white transition-colors">
                            <span className="flex items-center gap-2"><Activity size={10}/> INTEGRITY</span>
                            <span className={`${healthScore < 80 ? 'text-red-500' : 'text-green-500'}`}>{healthScore}%</span>
                        </div>
                        <div className="w-full h-1 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                            <div className={`h-full ${healthColor} w-full transition-all duration-1000`} style={{ width: `${healthScore}%`, boxShadow: `0 0 10px currentColor` }}></div>
                        </div>
                    </>
                ) : (
                    <div className={`w-2 h-2 rounded-full ${healthColor} animate-pulse shadow-[0_0_8px_currentColor] mb-2`}></div>
                )}
             </button>

             <div className={`h-[1px] bg-gradient-to-r from-transparent via-black/10 dark:via-white/10 to-transparent mx-2 mb-2 transition-all ${isExpanded ? 'opacity-100' : 'opacity-0'}`} />

             <button 
                onClick={handleNavSettings}
                aria-label="Open Settings"
                className={`
                  flex items-center rounded-xl transition-all duration-300 group
                  ${isExpanded ? 'w-full px-4 py-3 gap-4 bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 border border-black/5 dark:border-white/5' : 'w-12 h-12 justify-center mx-auto hover:bg-black/5 dark:hover:bg-white/5'}
                  ${activeFeature === 'settings' ? 'text-accent border-accent/20 bg-accent/5' : 'text-neutral-500'}
                `}
                title={!isExpanded ? getLabel('settings') : undefined}
             >
                <Settings size={18} className={activeFeature === 'settings' ? 'animate-spin-slow text-accent' : 'group-hover:rotate-45 transition-transform'} />
                <div className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isExpanded ? 'opacity-100 max-w-[150px]' : 'opacity-0 max-w-0'}`}>
                    <span className="text-[10px] font-black tracking-[0.2em] uppercase">{getLabel('settings')}</span>
                </div>
             </button>
          </div>

        </div>
      </aside>
    </>
  );
});
