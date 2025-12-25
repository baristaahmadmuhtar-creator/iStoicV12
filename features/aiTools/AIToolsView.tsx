
import React, { useState } from 'react';
import { Fingerprint, ImagePlus, Aperture, Activity } from 'lucide-react';
import { GenerativeStudio } from './components/GenerativeStudio';
import { NeuralVision } from './components/NeuralVision';

const AIToolsView: React.FC = () => {
    const [activeSection, setActiveSection] = useState<'GENERATIVE' | 'ANALYTIC' | null>('GENERATIVE');

    const toggleSection = (section: 'GENERATIVE' | 'ANALYTIC') => setActiveSection(activeSection === section ? null : section);

    return (
        <div className="min-h-full flex flex-col p-4 md:p-8 lg:p-12 pb-32 md:pb-40 animate-fade-in bg-noise">
            <div className="max-w-[1400px] mx-auto w-full space-y-10">
                
                {/* Unified Header - Consistent with Dashboard */}
                <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-10 animate-slide-up pb-6">
                    <div className="space-y-6 flex-1">
                        <div className="flex items-center gap-4">
                            <div className="px-4 py-2 rounded-xl bg-accent/10 border border-accent/20 tech-mono text-[10px] font-black uppercase text-accent tracking-[0.3em] shadow-[0_0_20px_rgba(var(--accent-rgb),0.2)]">ARSENAL_v13.5</div>
                            <span className="text-neutral-500 tech-mono text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                <Fingerprint size={14} className="text-neutral-400" /> AUTHENTICATED
                            </span>
                        </div>
                        <h2 className="text-[13vw] md:text-[7rem] xl:text-[8rem] font-black italic tracking-tighter text-black dark:text-white leading-[0.85] uppercase drop-shadow-sm">
                             NEURAL <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-purple-500 animate-gradient-text">ARSENAL</span>
                        </h2>
                    </div>
                    
                    <div className="flex items-center gap-3 px-5 py-3 bg-white dark:bg-[#0f0f11] border border-black/5 dark:border-white/5 rounded-2xl tech-mono text-[9px] font-black uppercase tracking-widest text-neutral-500 shadow-sm backdrop-blur-md">
                         <Activity size={14} className="text-[var(--accent-color)] animate-pulse" /> MULTI_ENGINE_READY
                    </div>
                </header>

                <div className="space-y-8">
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
