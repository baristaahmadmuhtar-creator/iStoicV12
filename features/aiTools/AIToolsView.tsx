
import React, { useState } from 'react';
import { Fingerprint, ImagePlus, Aperture, Activity } from 'lucide-react';
import { GenerativeStudio } from './components/GenerativeStudio';
import { NeuralVision } from './components/NeuralVision';

const AIToolsView: React.FC = () => {
    const [activeSection, setActiveSection] = useState<'GENERATIVE' | 'ANALYTIC' | null>('GENERATIVE');

    const toggleSection = (section: 'GENERATIVE' | 'ANALYTIC') => setActiveSection(activeSection === section ? null : section);

    return (
        <div className="min-h-full flex flex-col p-4 md:p-8 lg:p-12 pb-32 md:pb-40 animate-fade-in bg-noise relative overflow-hidden">
            {/* Ambient Background - Dynamic Accent */}
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-accent/5 blur-[120px] rounded-full pointer-events-none animate-pulse-slow"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-accent/5 blur-[150px] rounded-full pointer-events-none animate-float" style={{ animationDelay: '2s' }}></div>

            <div className="max-w-[1400px] mx-auto w-full space-y-10 relative z-10">
                
                {/* Unified Header - Consistent with Dashboard */}
                <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-10 animate-slide-up pb-6 border-b border-black/5 dark:border-white/5">
                    <div className="space-y-4 flex-1">
                        <div className="flex items-center gap-4">
                            <div className="px-4 py-2 rounded-xl bg-accent/10 border border-accent/20 tech-mono text-[10px] font-black uppercase text-accent tracking-[0.3em] shadow-[0_0_20px_rgba(var(--accent-rgb),0.2)] flex items-center gap-2">
                                <Fingerprint size={12} /> ARSENAL_v13.5
                            </div>
                            <div className="h-[1px] w-12 bg-gradient-to-r from-accent/50 to-transparent"></div>
                        </div>
                        <h2 className="text-[12vw] md:text-[6rem] xl:text-[7rem] font-black italic tracking-tighter text-black dark:text-white leading-[0.85] uppercase drop-shadow-sm">
                             NEURAL <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-white animate-gradient-text">ARSENAL</span>
                        </h2>
                    </div>
                    
                    <div className="flex items-center gap-3 px-6 py-4 bg-white/80 dark:bg-[#0a0a0b]/80 border border-black/5 dark:border-white/10 rounded-2xl tech-mono text-[9px] font-black uppercase tracking-widest text-neutral-500 shadow-xl backdrop-blur-xl group hover:border-accent/30 transition-all">
                         <Activity size={14} className="text-emerald-500 animate-pulse" /> 
                         <span className="group-hover:text-black dark:group-hover:text-white transition-colors">MULTI_ENGINE_READY</span>
                    </div>
                </header>

                <div className="space-y-6">
                    <GenerativeStudio 
                        isOpen={activeSection === 'GENERATIVE'} 
                        onToggle={() => toggleSection('GENERATIVE')}
                        icon={<ImagePlus />}
                    />

                    <NeuralVision 
                        isOpen={activeSection === 'ANALYTIC'} 
                        onToggle={() => toggleSection('ANALYTIC')}
                        icon={<Aperture />}
                    />
                </div>
            </div>
        </div>
    );
};

export default AIToolsView;
