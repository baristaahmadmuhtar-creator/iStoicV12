
import React, { memo } from 'react';
import { type FeatureID, FEATURES } from '../constants';
import { Settings } from 'lucide-react';
import { useNavigationIntelligence } from '../hooks/useNavigationIntelligence';

interface MobileNavProps {
  activeFeature: FeatureID;
  setActiveFeature: (feature: FeatureID) => void;
  chatLogic?: any;
}

export const MobileNav: React.FC<MobileNavProps> = memo(({ activeFeature, setActiveFeature }) => {
  const { shouldShowNav, isInputFocused } = useNavigationIntelligence();

  // FIX BUG #1: Ensure visibility logic doesn't trap pointer events when hidden
  const isVisible = shouldShowNav && !isInputFocused;

  return (
    <div 
      className={`
        md:hidden fixed left-1/2 -translate-x-1/2 
        transition-all cubic-bezier(0.2, 0.8, 0.2, 1) 
        will-change-transform w-auto max-w-[calc(100vw-32px)]
        /* FIX BUG #1: High Z-Index to beat content, pointer-events toggle */
        z-[100] ${isVisible ? 'pointer-events-auto' : 'pointer-events-none'}
        ${isVisible 
          ? 'bottom-6 opacity-100 translate-y-0 scale-100 duration-500 delay-100' 
          : 'bottom-0 opacity-0 translate-y-10 scale-90 duration-300' 
        }
      `}
      role="navigation"
      aria-label="Mobile Navigation"
    >
      <nav className="
        flex items-center gap-1 p-2
        /* FIX BUG #2: High Opacity Background (95%) + Stronger Shadow + Border Top */
        bg-white/95 dark:bg-[#050505]/95 backdrop-blur-2xl 
        border border-black/5 dark:border-white/10 
        rounded-[28px] 
        shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)]
        ring-1 ring-black/5 dark:ring-white/5
      ">
        
        {FEATURES.map((f) => {
          const isActive = activeFeature === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setActiveFeature(f.id as FeatureID)}
              aria-label={`Go to ${f.name}`}
              aria-current={isActive ? 'page' : undefined}
              className={`
                relative w-12 h-12 flex items-center justify-center rounded-[20px] 
                transition-all duration-300 group
                /* FIX BUG #1: Force pointer events on button */
                pointer-events-auto
                ${isActive 
                  ? 'bg-accent/10 text-accent border border-accent/20 shadow-[0_0_20px_var(--accent-glow)]' 
                  : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'}
              `}
            >
              {/* Active Glow Dot */}
              {isActive && (
                  <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-accent shadow-[0_0_5px_var(--accent-color)]" />
              )}

              <div className={`transition-transform duration-300 ${isActive ? 'scale-110 -translate-y-0.5' : 'group-active:scale-95'}`}>
                {React.cloneElement(f.icon as React.ReactElement<any>, { size: 20, strokeWidth: isActive ? 2.5 : 2 })}
              </div>
            </button>
          );
        })}

        <div className="w-[1px] h-6 bg-black/10 dark:bg-white/10 mx-1"></div>

        <div className="flex items-center gap-1">
            <button 
                onClick={() => setActiveFeature('settings')} 
                aria-label="Open Settings"
                className={`
                    w-12 h-12 flex items-center justify-center rounded-[20px] transition-all pointer-events-auto
                    ${activeFeature === 'settings' 
                        ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg scale-105' 
                        : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}
                `}
            >
                <Settings size={20} className={activeFeature === 'settings' ? 'animate-spin-slow' : ''} />
            </button>
        </div>

      </nav>
    </div>
  );
});
