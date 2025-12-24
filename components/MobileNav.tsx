
import React, { memo } from 'react';
import { type FeatureID, FEATURES } from '../constants';
import { Settings, Bug } from 'lucide-react';
import { useNavigationIntelligence } from '../hooks/useNavigationIntelligence';

interface MobileNavProps {
  activeFeature: FeatureID;
  setActiveFeature: (feature: FeatureID) => void;
  onToggleDebug?: () => void;
  chatLogic?: any;
}

export const MobileNav: React.FC<MobileNavProps> = memo(({ activeFeature, setActiveFeature, onToggleDebug }) => {
  const { shouldShowNav, isInputFocused } = useNavigationIntelligence();

  // Golden Ratio Smart Visibility:
  // Hide completely if input is focused (keyboard open) to ensure safety.
  // Otherwise follow scroll intelligence.
  const isVisible = shouldShowNav && !isInputFocused;

  return (
    <div 
      className={`md:hidden fixed left-1/2 -translate-x-1/2 z-[900] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] will-change-transform ${
        isVisible 
          ? 'bottom-[34px] opacity-100 scale-100 translate-3d(0, 0, 0)' 
          : 'bottom-0 opacity-0 scale-90 translate-3d(0, 100%, 0)'
      }`}
    >
      <nav className={`
        flex items-center gap-2 
        bg-white/40 dark:bg-[#080809]/95 backdrop-blur-xl
        border border-black/5 dark:border-white/10 
        rounded-[3rem] p-2 pl-6 pr-2 
        shadow-[0_13px_34px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.6)]
        ring-1 ring-white/10
        pb-safe mb-2
      `}>
        
        {/* Main Features */}
        <div className="flex items-center gap-3">
          {FEATURES.map((f) => {
            const isActive = activeFeature === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setActiveFeature(f.id as FeatureID)}
                className={`relative w-[48px] h-[48px] rounded-full flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                  isActive 
                  ? 'text-[var(--accent-color)] bg-[var(--accent-color)]/10' 
                  : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                aria-label={f.name}
              >
                <div className={`transition-transform duration-500 ${isActive ? 'scale-110' : 'scale-100'}`}>
                  {/* Fix: Casting to ReactElement<any> to allow size prop in cloneElement */}
                  {React.cloneElement(f.icon as React.ReactElement<any>, { size: 22 })}
                </div>
                {isActive && (
                  <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-[var(--accent-color)] shadow-[0_0_10px_var(--accent-color)]"></div>
                )}
              </button>
            );
          })}
        </div>
        
        {/* Divider */}
        <div className="w-[1px] h-[24px] bg-black/10 dark:bg-white/10 mx-1"></div>
        
        {/* Utilities */}
        <div className="flex items-center gap-1">
          <button 
            onClick={() => onToggleDebug?.()} 
            className="w-[48px] h-[48px] rounded-full flex items-center justify-center text-neutral-400 dark:text-neutral-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-90"
            aria-label="Debug Console"
          >
            <Bug size={20} />
          </button>

          <button 
            onClick={() => setActiveFeature('settings')} 
            className={`w-[48px] h-[48px] rounded-full flex items-center justify-center transition-all duration-500 ${
              activeFeature === 'settings' 
              ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg scale-105' 
              : 'bg-black/5 dark:bg-white/5 text-neutral-400 dark:text-neutral-500 border border-black/5 dark:border-white/5'
            }`}
            aria-label="Settings"
          >
            <Settings size={20} className={activeFeature === 'settings' ? 'animate-spin-slow' : ''} />
          </button>
        </div>
      </nav>
    </div>
  );
});
