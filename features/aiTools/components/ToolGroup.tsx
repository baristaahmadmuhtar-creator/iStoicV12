
import React from 'react';
import { Loader2, ChevronDown } from 'lucide-react';

interface ToolGroupProps {
    title: string;
    icon: React.ReactNode;
    subtitle: string;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    isLoading?: boolean;
    loadingText?: string;
}

export const ToolGroup: React.FC<ToolGroupProps> = ({ 
    title, icon, subtitle, isOpen, onToggle, children, isLoading, loadingText 
}) => (
    <div className={`bg-white dark:bg-[#0a0a0b] overflow-hidden transition-all duration-700 border border-black/5 dark:border-white/5 rounded-[32px] shadow-sm group relative ${isOpen ? 'border-[var(--accent-color)]/30 ring-1 ring-[var(--accent-color)]/10' : 'hover:border-black/10 dark:hover:border-white/10 hover:shadow-lg'}`}>
        {/* Loading Progress Line */}
        <div className={`absolute top-0 left-0 h-[2px] bg-accent shadow-[0_0_10px_var(--accent-color)] transition-all duration-1000 ease-in-out z-20 ${isLoading ? 'w-full opacity-100' : 'w-0 opacity-0'}`}></div>
        
        <button onClick={onToggle} className="w-full p-6 md:p-8 flex items-center justify-between cursor-pointer text-left focus:outline-none relative z-10">
            <div className="flex items-center gap-6">
                <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center text-on-accent shadow-lg transition-all duration-500 bg-[var(--accent-color)] ${isLoading ? 'animate-pulse scale-110 shadow-[0_0_25px_var(--accent-glow)]' : 'group-hover:rotate-6'}`}>
                    {isLoading ? <Loader2 size={24} className="animate-spin" /> : icon}
                </div>
                <div>
                    <h3 className="text-2xl md:text-3xl font-black uppercase text-black dark:text-white tracking-tighter italic leading-none">{title}</h3>
                    <div className="flex flex-col gap-1 mt-2">
                        <p className={`text-[9px] tech-mono font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-all duration-500 ${isLoading ? 'text-accent' : 'text-neutral-400'}`}>
                             {isLoading ? (loadingText || 'PROCESSING...') : subtitle}
                        </p>
                    </div>
                </div>
            </div>
            <div className={`w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center transition-all duration-500 ${isOpen ? 'rotate-180 bg-[var(--accent-color)] text-on-accent shadow-lg' : 'text-neutral-400'}`}><ChevronDown size={20} /></div>
        </button>
        <div className={`transition-all duration-700 ease-[cubic-bezier(0.2,0,0,1)] overflow-hidden ${isOpen ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="px-6 pb-6 md:px-8 md:pb-8 border-t border-black/5 dark:border-white/5 pt-8 relative">
                {isLoading && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-black/60 backdrop-blur-[4px] z-10 flex items-center justify-center animate-fade-in">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 rounded-full border-2 border-accent/20 border-t-accent animate-spin shadow-[0_0_20px_var(--accent-glow)]"></div>
                            <span className="text-[10px] tech-mono font-black text-accent animate-pulse tracking-[0.4em] uppercase">LINKING_NEURONS...</span>
                        </div>
                    </div>
                )}
                {children}
            </div>
        </div>
    </div>
);
