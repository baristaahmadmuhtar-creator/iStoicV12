
import React, { useEffect, useRef, useState } from 'react';
import { Flame, Brain, MicOff, Radio, Zap, Mic, Volume2, Shield, X, Maximize2 } from 'lucide-react';
import { type NeuralLinkStatus } from '../../../services/neuralLink';

interface NeuralLinkOverlayProps {
  isOpen: boolean;
  status: NeuralLinkStatus;
  personaMode: 'melsa' | 'stoic';
  transcript: string;
  onTerminate: () => void;
  analyser?: AnalyserNode | null;
}

export const NeuralLinkOverlay: React.FC<NeuralLinkOverlayProps> = ({
  isOpen,
  status,
  personaMode,
  transcript,
  onTerminate,
  analyser
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  // Audio Visualizer Logic
  useEffect(() => {
    if (!isOpen || !analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let animationId: number;

    const draw = () => {
      animationId = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(centerX, centerY) * 0.8;

      // Draw concentric neural waves
      for (let j = 0; j < 3; j++) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(var(--accent-rgb), ${0.1 - j * 0.03})`;
        ctx.lineWidth = 2;
        
        for (let i = 0; i < bufferLength; i++) {
          const angle = (i / bufferLength) * Math.PI * 2;
          const v = dataArray[i] / 128.0;
          const r = radius + (v * 40 * (j + 1)) * (status === 'ACTIVE' ? 1 : 0.1);
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // Pulse bars
      const barCount = 64;
      for (let i = 0; i < barCount; i++) {
        const angle = (i / barCount) * Math.PI * 2;
        const v = dataArray[i * 2] / 255.0;
        const barHeight = v * 60;
        
        const x1 = centerX + Math.cos(angle) * (radius - 10);
        const y1 = centerY + Math.sin(angle) * (radius - 10);
        const x2 = centerX + Math.cos(angle) * (radius + barHeight);
        const y2 = centerY + Math.sin(angle) * (radius + barHeight);

        ctx.beginPath();
        ctx.strokeStyle = `rgba(var(--accent-rgb), ${0.3 + v * 0.7})`;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [isOpen, analyser, status]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] bg-[#050505] flex flex-col items-center justify-between p-6 md:p-12 animate-fade-in transition-all overflow-hidden selection:bg-accent/30">
      {/* Background Ambience Layers */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180vw] h-[180vh] bg-accent/[0.03] blur-[150px] rounded-full animate-pulse-slow"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      {/* Header Info */}
      <div className="relative z-10 w-full flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-xl">
             <Radio size={20} className="text-accent animate-pulse" />
          </div>
          <div>
            <h2 className="text-[10px] font-black tech-mono text-neutral-500 uppercase tracking-[0.4em]">NEURAL_LINK_STABLE</h2>
            <p className="text-xs font-bold text-white uppercase italic tracking-tighter">SECURE_VOICE_UPLINK // 24KBPS</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-accent/10 border border-accent/20 rounded-xl hidden md:flex items-center gap-3">
            <Shield size={14} className="text-accent" />
            <span className="text-[9px] tech-mono font-black text-accent uppercase tracking-widest">E2E_ENCRYPTED</span>
          </div>
        </div>
      </div>
      
      {/* Central Interactive Hub */}
      <div className="relative flex-1 w-full flex flex-col items-center justify-center">
        {/* Visualizer Canvas */}
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={800} 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl aspect-square pointer-events-none opacity-60"
        />

        {/* Central Orb */}
        <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center group">
          {/* Outer Rotating Rings */}
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-accent/20 animate-spin-slow"></div>
          <div className="absolute inset-6 rounded-full border border-accent/10 animate-reverse-spin"></div>
          <div className="absolute inset-12 rounded-full border-2 border-accent/5 animate-spin-slow" style={{ animationDuration: '25s' }}></div>
          
          {/* Main Core */}
          <div className={`relative w-40 h-40 md:w-52 md:h-52 rounded-full transition-all duration-1000 flex items-center justify-center ${
            status === 'ACTIVE' 
            ? 'bg-accent shadow-[0_0_150px_var(--accent-glow)] scale-110' 
            : 'bg-neutral-900 grayscale opacity-40 scale-90'
          }`}>
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/20 to-transparent"></div>
            {personaMode === 'melsa' 
              ? <Flame size={80} className="text-on-accent animate-pulse relative z-10" /> 
              : <Brain size={80} className="text-on-accent animate-pulse relative z-10" />
            }
            
            {/* Listening/Thinking Indicators */}
            {status === 'ACTIVE' && (
              <div className="absolute -inset-4 rounded-full border-4 border-accent/30 animate-ping opacity-20"></div>
            )}
          </div>

          {/* Floating Status Badge */}
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <span className={`px-4 py-1 rounded-lg tech-mono text-[9px] font-black uppercase tracking-widest transition-all ${
              status === 'ACTIVE' ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-white/5 text-neutral-500'
            }`}>
              {status === 'ACTIVE' ? 'SYNCHRONIZED' : 'ESTABLISHING...'}
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Transcription Panel */}
      <div className="relative z-10 w-full max-w-4xl min-h-[160px] md:min-h-[200px] bg-white/5 border border-white/10 rounded-[32px] backdrop-blur-3xl p-8 md:p-12 flex items-center justify-center text-center shadow-2xl">
        <p className="text-white text-2xl md:text-5xl font-black italic uppercase tracking-tighter leading-tight drop-shadow-[0_0_20px_rgba(var(--accent-rgb),0.5)] transition-all duration-500 max-h-[120px] overflow-hidden">
          {transcript || (status === 'ACTIVE' ? 'SYSTEM_READY. SPEAK_NOW.' : 'UPLINKING_BRAIN_MAPS...')}
        </p>
      </div>

      {/* Control Actions Unit */}
      <div className="relative z-10 w-full max-w-xl flex items-center justify-center gap-6 mt-10">
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className={`w-16 h-16 rounded-[24px] flex items-center justify-center transition-all border ${
            isMuted 
            ? 'bg-red-600/20 border-red-500 text-red-500 shadow-[0_0_30px_rgba(220,38,38,0.2)]' 
            : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:bg-white/10'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        <button 
          onClick={onTerminate} 
          className="flex-1 py-6 bg-red-600 hover:bg-red-500 text-white rounded-[32px] font-black uppercase text-[12px] tracking-[0.4em] shadow-[0_25px_80px_rgba(220,38,38,0.5)] transition-all flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-95 group"
        >
          <X size={20} className="group-hover:rotate-90 transition-transform" /> TERMINATE_LINK
        </button>

        <button 
          className="w-16 h-16 rounded-[24px] bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-accent transition-all hover:bg-white/10"
          title="Voice Settings"
        >
          <Volume2 size={24} />
        </button>
      </div>

      <style>{`
        .animate-reverse-spin { animation: reverse-spin 12s linear infinite; }
        @keyframes reverse-spin { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        .animate-spin-slow { animation: spin 20s linear infinite; }
      `}</style>
    </div>
  );
};
