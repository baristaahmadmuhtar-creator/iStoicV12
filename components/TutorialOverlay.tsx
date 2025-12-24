import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, Radio, Zap, Settings, Terminal, Activity, ArrowRight, ShieldCheck, Cpu, Database } from 'lucide-react';

interface TutorialStep {
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  colorClass: string; // Tailwind text color class
  bgClass: string;    // Tailwind bg color class
  borderClass: string; // Tailwind border color class
}

interface TutorialOverlayProps {
  onComplete: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Smooth entrance
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const steps: TutorialStep[] = [
    {
      title: "SYSTEM ONLINE",
      subtitle: "PLATINUM TERMINAL v13.5",
      description: "Welcome to IStoicAI. You have accessed a high-performance cognitive environment fusing Stoic logic with multi-engine generative intelligence.",
      icon: <Terminal size={36} />,
      colorClass: "text-blue-400",
      bgClass: "bg-blue-500/10",
      borderClass: "border-blue-500/20"
    },
    {
      title: "NEURAL LINK",
      subtitle: "REAL-TIME VOICE MATRIX",
      description: "Experience ultra-low latency voice conversations. Activate 'LIVE_LINK' to interface directly with Melsa or Stoic Logic. Powered by Gemini Live.",
      icon: <Radio size={36} />,
      colorClass: "text-red-500",
      bgClass: "bg-red-500/10",
      borderClass: "border-red-500/20"
    },
    {
      title: "ELITE ARSENAL",
      subtitle: "MULTIMODAL SYNTHESIS",
      description: "Generate high-fidelity visuals using Imagen 3, analyze complex media with Neural Vision, and perform deep reasoning tasks.",
      icon: <Zap size={36} />,
      colorClass: "text-amber-400",
      bgClass: "bg-amber-500/10",
      borderClass: "border-amber-500/20"
    },
    {
      title: "VAULT & LOGIC",
      subtitle: "PERSISTENT MEMORY",
      description: "Your data is secured locally. Use the Vault to store intellectual assets and the Logic engine to refine your thoughts.",
      icon: <Database size={36} />,
      colorClass: "text-purple-400",
      bgClass: "bg-purple-500/10",
      borderClass: "border-purple-500/20"
    },
    {
      title: "READY TO DEPLOY",
      subtitle: "INITIALIZATION COMPLETE",
      description: "System parameters optimized. Network uplink established. Press the button below to enter your workspace.",
      icon: <ShieldCheck size={36} />,
      colorClass: "text-emerald-400",
      bgClass: "bg-emerald-500/10",
      borderClass: "border-emerald-500/20"
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      finish();
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const finish = () => {
    setIsVisible(false);
    setTimeout(onComplete, 600); // Wait for exit animation
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
        if (e.key === 'ArrowLeft') handlePrev();
        if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step]);

  const currentStep = steps[step];

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isVisible ? 'opacity-100 backdrop-blur-xl bg-[#050505]/90' : 'opacity-0 pointer-events-none'}`}
    >
        {/* Background Ambience - Synced with Step Color */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100vh] bg-gradient-to-tr from-black via-transparent to-black opacity-80`} />
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] blur-[150px] rounded-full transition-colors duration-1000 ${currentStep.bgClass.replace('bg-', 'bg-')}`} style={{ opacity: 0.15 }} />
        </div>

        <div className={`
            relative w-full max-w-4xl bg-[#0a0a0b] border border-white/10 rounded-[40px] 
            shadow-[0_0_100px_-20px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col md:flex-row
            transform transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
            ${isVisible ? 'translate-y-0 scale-100' : 'translate-y-10 scale-95'}
        `}>
            
            {/* Left Side: Visual / Icon / Graphic */}
            <div className={`md:w-5/12 relative overflow-hidden flex flex-col items-center justify-center p-12 transition-colors duration-700 border-b md:border-b-0 md:border-r border-white/5 ${currentStep.bgClass}`}>
                {/* Noise Texture */}
                <div className={`absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay`} />
                
                {/* Animated Rings */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className={`w-64 h-64 border border-white/10 rounded-full animate-[spin_20s_linear_infinite] opacity-30`} />
                    <div className={`absolute w-48 h-48 border border-white/10 rounded-full animate-[spin_15s_linear_infinite_reverse] opacity-30`} />
                </div>

                {/* Main Icon Container */}
                <div className={`
                    relative z-10 w-32 h-32 rounded-[32px] flex items-center justify-center mb-8 
                    transition-all duration-500 backdrop-blur-md shadow-2xl
                    ${currentStep.bgClass} ${currentStep.borderClass} border
                `}>
                    <div className={`transition-all duration-500 ${currentStep.colorClass} drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]`}>
                        {currentStep.icon}
                    </div>
                </div>
                
                {/* Progress Indicators */}
                <div className="flex gap-2 relative z-10">
                    {steps.map((_, i) => (
                        <div 
                            key={i} 
                            className={`h-1.5 rounded-full transition-all duration-500 ${i === step ? `w-8 bg-white` : `w-2 bg-white/20`}`} 
                        />
                    ))}
                </div>
            </div>

            {/* Right Side: Content & Controls */}
            <div className="flex-1 p-8 md:p-12 flex flex-col justify-between bg-zinc-900/30 backdrop-blur-3xl relative">
                <button 
                    onClick={finish} 
                    className="absolute top-8 right-8 p-2 text-neutral-600 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full"
                    title="Skip Tutorial"
                >
                    <X size={20} />
                </button>

                <div className="space-y-8 mt-4 md:mt-2">
                    {/* Text Content with Animate Key to trigger re-render animation */}
                    <div key={step} className="space-y-4 animate-slide-up">
                        <div className="space-y-2">
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${currentStep.borderClass} ${currentStep.bgClass}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${currentStep.colorClass.replace('text-', 'bg-')} animate-pulse`} />
                                <span className={`text-[9px] font-black tracking-[0.2em] uppercase ${currentStep.colorClass}`}>
                                    MODULE_0{step + 1}
                                </span>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white uppercase leading-[0.9]">
                                {currentStep.title}
                            </h2>
                            <p className="text-[10px] tech-mono font-bold text-neutral-500 uppercase tracking-widest pl-1">
                                // {currentStep.subtitle}
                            </p>
                        </div>
                        <p className="text-sm md:text-[15px] font-medium text-neutral-400 leading-relaxed max-w-sm">
                            {currentStep.description}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 pt-8 md:pt-0">
                    <button 
                        onClick={handlePrev}
                        disabled={step === 0}
                        className={`
                            p-4 rounded-2xl border border-white/10 text-neutral-400 transition-all duration-300
                            ${step === 0 ? 'opacity-0 pointer-events-none translate-y-2' : 'hover:bg-white/5 hover:text-white opacity-100 translate-y-0'}
                        `}
                    >
                        <ChevronLeft size={24} />
                    </button>
                    
                    <button 
                        onClick={handleNext} 
                        className={`
                            flex-1 py-5 px-8 rounded-2xl font-black uppercase text-[11px] tracking-[0.25em] 
                            flex items-center justify-center gap-3 transition-all shadow-xl hover:shadow-2xl group
                            ${step === steps.length - 1 
                                ? 'bg-white text-black hover:scale-[1.02]' 
                                : 'bg-[var(--accent-color)] text-[var(--on-accent-color)] hover:bg-[var(--accent-color)]/90 hover:scale-[1.02]'
                            }
                        `}
                    >
                        {step === steps.length - 1 ? 'ENTER SYSTEM' : 'NEXT MODULE'}
                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};
