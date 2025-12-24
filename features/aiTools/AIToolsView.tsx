
import React, { useState } from 'react';
import { Fingerprint, Wand2, ScanEye, Activity } from 'lucide-react';
import { GenerativeStudio } from './components/GenerativeStudio';
import { NeuralVision } from './components/NeuralVision';

const AIToolsView: React.FC = () => {
    const [activeSection, setActiveSection] = useState<'GENERATIVE' | 'ANALYTIC' | null>('GENERATIVE');

    const toggleSection = (section: 'GENERATIVE' | 'ANALYTIC') => setActiveSection(activeSection === section ? null : section);

    return (
        <div className="min-h-full flex flex-col p-4 md:p-12 lg:p-16 pb-40 custom-scroll">
            <div className="max-w-[1200px] mx-auto w-full space-y-12">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10 border-b border-black/5 dark:border-white/5 pb-10 animate-slide-up">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3"><Fingerprint size={20} className="text-[var(--accent-color)]" /><span className="text-neutral-400 tech-mono text-[9px] font-black uppercase tracking-[0.4em]">NEURAL ARSENAL v13.5</span></div>
                        <h2 className="text-6xl md:text-[7rem] heading-heavy text-black dark:text-white leading-none italic uppercase tracking-tighter">ELITE <span className="text-[var(--accent-color)]">SYNTHESIS</span></h2>
                    </div>
                    <div className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl tech-mono text-[9px] font-black uppercase tracking-widest text-neutral-500 shadow-sm">
                         <Activity size={14} className="text-[var(--accent-color)] animate-pulse" /> SYSTEM_CREDENTIALS: ACTIVE
                    </div>
                </header>

                <div className="space-y-8">
                    <GenerativeStudio 
                        isOpen={activeSection === 'GENERATIVE'} 
                        onToggle={() => toggleSection('GENERATIVE')}
                        icon={<Wand2 size={24} />}
                    />

                    <NeuralVision 
                        isOpen={activeSection === 'ANALYTIC'} 
                        onToggle={() => toggleSection('ANALYTIC')}
                        icon={<ScanEye size={24} />}
                    />
                </div>
            </div>
        </div>
    );
};

export default AIToolsView;
