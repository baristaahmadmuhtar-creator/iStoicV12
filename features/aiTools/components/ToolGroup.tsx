
import React from 'react';
import { Loader2, ChevronDown, ArrowUpRight } from 'lucide-react';

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
    <div className={`
        relative overflow-hidden rounded-[48px] border transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group
        ${isOpen 
            ? 'bg-white dark:bg-[#0f0f11] border-accent/40 shadow-[0_20px_60px_-15px_rgba(var(--accent-rgb),0.15)] ring-1 ring-accent/20' 
            : 'bg-white dark:bg-[#0f0f11] border-black/5 dark:border-white/5 hover:border-accent/30 hover:shadow-lg min-h-[220px]' // Dynamic height instead of fixed aspect ratio
        }
    `}>
        {/* Background Texture */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay pointer-events-none"></div>

        {/* Loading Progress Line */}
        <div className={`absolute top-0 left-0 h-[3px] bg-accent shadow-[0_0_15px_var(--accent-color)] transition-all duration-1000 ease-in-out z-20 ${isLoading ? 'w-full opacity-100' : 'w-0 opacity-0'}`}></div>
        
        <button 
            onClick={onToggle} 
            className="w-full p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between cursor-pointer text-left focus:outline-none relative z-10 h-full gap-6 md:gap-0"
        >
            <div className="flex items-start md:items-center gap-6 md:gap-8">
                <div className={`
                    w-16 h-16 md:w-24 md:h-24 rounded-[32px] flex items-center justify-center text-neutral-500 shadow-inner border border-black/5 dark:border-white/5 transition-all duration-500 shrink-0
                    ${isOpen ? 'bg-accent/10 text-accent' : 'bg-black/5 dark:bg-white/5 group-hover:text-accent group-hover:scale-110 group-hover:rotate-3'}
                    ${isLoading ? 'animate-pulse scale-110 shadow-[0_0_30px_var(--accent-glow)] bg-accent text-on-accent' : ''}
                `}>
                    {isLoading 
                        ? <Loader2 size={32} className="animate-spin" /> 
                        : React.cloneElement(icon as React.ReactElement<any>, { size: 36, strokeWidth: 1.5 })
                    }
                </div>
                
                <div className="space-y-1.5 md:space-y-2">
                    <h3 className="text-2xl md:text-5xl font-black uppercase text-black dark:text-white tracking-tighter italic leading-none group-hover:translate-x-1 transition-transform">
                        {title}
                    </h3>
                    <div className="flex flex-col gap-1">
                        <p className={`text-[9px] md:text-[10px] tech-mono font-black uppercase tracking-[0.25em] flex items-center gap-2 transition-all duration-500 ${isLoading ? 'text-accent' : 'text-neutral-400 group-hover:text-neutral-500'}`}>
                             {isLoading ? (loadingText || 'PROCESSING...') : subtitle}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4 md:gap-6 absolute top-8 right-8 md:static">
                {!isOpen && (
                    <div className="hidden md:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-4 group-hover:translate-x-0">
                        <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Expand</span>
                        <ArrowUpRight size={18} className="text-accent" />
                    </div>
                )}
                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center transition-all duration-500 border border-black/5 dark:border-white/5 ${isOpen ? 'rotate-180 bg-accent text-on-accent shadow-lg border-transparent' : 'text-neutral-400 group-hover:text-black dark:group-hover:text-white'}`}>
                    <ChevronDown size={24} />
                </div>
            </div>
        </button>

        <div className={`transition-all duration-700 ease-[cubic-bezier(0.2,0,0,1)] overflow-hidden ${isOpen ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="px-6 pb-6 md:px-10 md:pb-10 pt-0 relative">
                {isLoading && (
                    <div className="absolute inset-0 bg-white/60 dark:bg-[#0f0f11]/80 backdrop-blur-sm z-20 flex items-center justify-center animate-fade-in rounded-b-[48px]">
                        <div className="flex flex-col items-center gap-6 p-8 rounded-[32px] bg-white dark:bg-black border border-black/5 dark:border-white/10 shadow-2xl aspect-square justify-center">
                            <div className="w-20 h-20 rounded-full border-4 border-accent/20 border-t-accent animate-spin shadow-[0_0_40px_var(--accent-glow)]"></div>
                            <span className="text-[11px] tech-mono font-black text-accent animate-pulse tracking-[0.4em] uppercase">NEURAL_LINK_ACTIVE</span>
                        </div>
                    </div>
                )}
                <div className="bg-zinc-50 dark:bg-[#0a0a0b] rounded-[32px] border border-black/5 dark:border-white/5 p-2 shadow-inner">
                    {children}
                </div>
            </div>
        </div>
    </div>
);
