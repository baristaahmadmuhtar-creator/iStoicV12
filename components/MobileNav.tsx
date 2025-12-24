
import React, { memo } from 'react';
import { type FeatureID, FEATURES } from '../constants';
import { Settings, MoreHorizontal } from 'lucide-react';
import { useNavigationIntelligence } from '../hooks/useNavigationIntelligence';

interface MobileNavProps {
  activeFeature: FeatureID;
  setActiveFeature: (feature: FeatureID) => void;
  chatLogic?: any;
}

export const MobileNav: React.FC<MobileNavProps> = memo(({ activeFeature, setActiveFeature }) => {
  const { shouldShowNav, isInputFocused } = useNavigationIntelligence();

  const isVisible = shouldShowNav && !isInputFocused;

  return (
    <div 
      className={`
        md:hidden fixed left-1/2 -translate-x-1/2 z-[900] 
        transition-all cubic-bezier(0.2, 0.8, 0.2, 1) 
        will-change-transform w-auto max-w-[95vw]
        ${isVisible 
          ? 'bottom-6 opacity-100 translate-y-0 scale-100 duration-500 delay-100' 
          : 'bottom-0 opacity-0 translate-y-10 scale-90 pointer-events-none duration-300' 
        }
      `}
    >
      <nav className="
        flex items-center gap-1 p-1.5
        bg-[#050505]/85 backdrop-blur-2xl 
        border border-white/10 
        rounded-[24px] 
        shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)]
        ring-1 ring-white/5
      ">
        
        {FEATURES.map((f) => {
          const isActive = activeFeature === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setActiveFeature(f.id as FeatureID)}
              className={`
                relative w-12 h-12 flex items-center justify-center rounded-[18px] 
                transition-all duration-300
                ${isActive 
                  ? 'bg-[var(--accent-color)] text-black shadow-[0_0_20px_rgba(var(--accent-rgb),0.4)] scale-105 z-10' 
                  : 'text-neutral-500 hover:text-white hover:bg-white/5'}
              `}
            >
              <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}>
                {React.cloneElement(f.icon as React.ReactElement<any>, { size: 20 })}
              </div>
            </button>
          );
        })}

        <div className="w-[1px] h-6 bg-white/10 mx-1"></div>

        <div className="flex items-center gap-1">
            <button 
                onClick={() => setActiveFeature('settings')} 
                className={`
                    w-12 h-12 flex items-center justify-center rounded-[18px] transition-all
                    ${activeFeature === 'settings' 
                        ? 'bg-white text-black shadow-lg scale-105' 
                        : 'text-neutral-500 hover:text-white hover:bg-white/5'}
                `}
            >
                <Settings size={20} className={activeFeature === 'settings' ? 'animate-spin-slow' : ''} />
            </button>
        </div>

      </nav>
    </div>
  );
});
