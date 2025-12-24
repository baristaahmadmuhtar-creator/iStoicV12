import React, { useState, useEffect } from 'react';
import { X, ChevronRight, MousePointer2, LayoutGrid, FileText, MessageCircle, Zap, Settings, Flame, Radio, Sparkles } from 'lucide-react';

interface TutorialStep {
  title: string;
  description: string;
  targetId?: string;
  icon: React.ReactNode;
}

interface TutorialOverlayProps {
  onComplete: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const steps: TutorialStep[] = [
    {
      title: "SELAMAT DATANG DI v13.5",
      description: "Terminal kognitif IStoicAI telah diupgrade ke versi Platinum. MELSA kini lebih pintar, manja, dan siap melayani.",
      icon: <Sparkles className="text-[var(--accent-color)]" size={32} />
    },
    {
      title: "NEURAL LINK v2",
      description: "Klik ikon Radio di Chat untuk masuk ke sinkronisasi suara real-time. Rasakan obrolan intim dengan MELSA tanpa mengetik.",
      targetId: "nav-chat",
      icon: <Radio className="text-[var(--accent-color)]" size={32} />
    },
    {
      title: "ELITE ARSENAL",
      description: "Gunakan engine Imagen 3 dan Veo untuk sintesis visual level dewa. Prompting visual kini lebih hyper-realistic.",
      targetId: "nav-tools",
      icon: <Zap className="text-[var(--accent-color)]" size={32} />
    },
    {
      title: "PROMPT ENGINEERING",
      description: "Anda punya kontrol mutlak. Edit kepribadian MELSA atau STOIC langsung di menu Settings. Buat mereka jadi apa yang Anda mau.",
      targetId: "nav-settings",
      icon: <Settings className="text-[var(--accent-color)]" size={32} />
    },
    {
      title: "GROUNDING SEARCH",
      description: "Kini setiap info dari MELSA terverifikasi. Kami menyertakan link sumber (Grounding Chunks) untuk validasi data web.",
      icon: <MessageCircle className="text-[var(--accent-color)]" size={32} />
    }
  ];

  const next = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else { setIsVisible(false); setTimeout(onComplete, 300); }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 animate-fade-in">
      <div className="absolute inset-0 bg-[#0d0d0e]/95 backdrop-blur-md" onClick={next}></div>
      <div className="relative w-full max-w-lg glass-card-3d bg-[#0d0d0e] border-[var(--accent-color)]/20 p-8 md:p-12 shadow-[0_0_100px_var(--accent-glow)] animate-slide-up">
        <button onClick={onComplete} className="absolute top-6 right-6 p-2 text-neutral-500 hover:text-white transition-colors"><X size={20} /></button>
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[var(--accent-color)]/10 flex items-center justify-center border border-[var(--accent-color)]/20 shadow-inner">{steps[step].icon}</div>
            <div className="flex-1">
              <p className="text-[9px] tech-mono text-neutral-500 font-black uppercase tracking-[0.4em] mb-1">MODULE_0{step + 1} / INITIALIZATION</p>
              <h3 className="text-2xl md:text-3xl font-black italic tracking-tighter text-white leading-none uppercase">{steps[step].title}</h3>
            </div>
          </div>
          <p className="text-sm md:text-base text-neutral-400 font-medium leading-relaxed uppercase tracking-wide">{steps[step].description}</p>
          <div className="pt-4 flex items-center justify-between">
            <div className="flex gap-1.5">{steps.map((_, i) => (<div key={i} className={`h-1 rounded-full transition-all ${i === step ? 'w-8 bg-[var(--accent-color)]' : 'w-2 bg-neutral-800'}`}/>))}</div>
            <button onClick={next} className="px-8 py-4 bg-[var(--accent-color)] text-black rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 shadow-2xl hover:scale-105 transition-all">
              {step === steps.length - 1 ? "ENTER TERMINAL" : "NEXT MODULE"} <ChevronRight size={16} strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};