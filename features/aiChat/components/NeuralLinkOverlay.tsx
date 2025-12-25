
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Flame, Brain, MicOff, Radio, Shield, X, Mic, Volume2, Activity } from 'lucide-react';
import { type NeuralLinkStatus } from '../../../services/neuralLink';

interface NeuralLinkOverlayProps {
  isOpen: boolean;
  status: NeuralLinkStatus;
  personaMode: 'hanisah' | 'stoic';
  transcriptHistory: Array<{role: 'user' | 'model', text: string}>;
  interimTranscript: {role: 'user' | 'model', text: string} | null;
  onTerminate: () => void;
  analyser?: AnalyserNode | null;
}

export const NeuralLinkOverlay: React.FC<NeuralLinkOverlayProps> = ({
  isOpen,
  status,
  personaMode,
  transcriptHistory,
  interimTranscript,
  onTerminate,
  analyser
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  
  // Volume state for orb scaling
  const [volume, setVolume] = useState(0);

  // Auto-scroll transcript
  useEffect(() => {
      if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
  }, [transcriptHistory, interimTranscript]);

  // Handle Resize
  useEffect(() => {
      const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Enhanced Audio Visualizer
  useEffect(() => {
    if (!isOpen || !analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = windowSize.width;
    canvas.height = windowSize.height;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let animationId: number;

    const draw = () => {
      animationId = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      // Calculate average volume for reactivity
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
      const avg = sum / bufferLength;
      setVolume(avg); // Sync react state for orb scaling

      // Clear with trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height); 
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const maxRadius = Math.min(centerX, centerY) * 0.4;
      
      // Determine Core Color
      const hue = personaMode === 'hanisah' ? 25 : 190; // Orange vs Cyan
      
      // Draw Circular Spectrum
      const bars = 100;
      const step = Math.floor(bufferLength / bars);
      
      ctx.beginPath();
      for (let i = 0; i < bars; i++) {
          const value = dataArray[i * step];
          const percent = value / 256;
          const height = maxRadius * 0.5 * percent;
          const angle = (i / bars) * Math.PI * 2;
          
          const x = centerX + Math.cos(angle) * (maxRadius + height * 0.5);
          const y = centerY + Math.sin(angle) * (maxRadius + height * 0.5);
          
          const xEnd = centerX + Math.cos(angle) * (maxRadius + height * 1.5);
          const yEnd = centerY + Math.sin(angle) * (maxRadius + height * 1.5);

          ctx.strokeStyle = `hsla(${hue}, 100%, ${50 + percent * 50}%, ${percent})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(xEnd, yEnd);
          ctx.stroke();
      }

      // Draw Connection Lines (Neural Network Effect)
      ctx.beginPath();
      ctx.strokeStyle = `hsla(${hue}, 100%, 50%, 0.1)`;
      ctx.lineWidth = 1;
      for (let i = 0; i < bars; i+=5) {
          const angle = (i / bars) * Math.PI * 2;
          const x = centerX + Math.cos(angle) * maxRadius;
          const y = centerY + Math.sin(angle) * maxRadius;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [isOpen, analyser, windowSize, personaMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[5000] bg-black flex flex-col animate-fade-in transition-all overflow-hidden selection:bg-accent/30 font-sans">
      
      {/* 1. VISUALIZER LAYER */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 pointer-events-none z-0"
      />

      {/* 2. AMBIENT ORB LAYER */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 transition-transform duration-100 ease-out"
           style={{ transform: `scale(${1 + (volume / 256) * 0.2})` }}
      >
          <div className={`relative w-[280px] h-[280px] rounded-full blur-3xl opacity-40 animate-pulse ${personaMode === 'hanisah' ? 'bg-orange-500' : 'bg-cyan-500'}`}></div>
          <div className="absolute inset-0 flex items-center justify-center">
               <div className={`w-32 h-32 rounded-full border-2 border-white/20 flex items-center justify-center backdrop-blur-md shadow-[0_0_50px_rgba(255,255,255,0.1)] ${status === 'ACTIVE' ? 'animate-[spin_10s_linear_infinite]' : ''}`}>
                    {personaMode === 'hanisah' ? <Flame size={48} className="text-white opacity-80" /> : <Brain size={48} className="text-white opacity-80" />}
               </div>
          </div>
      </div>

      {/* 3. UI LAYER */}
      <div className="relative z-20 flex flex-col h-full justify-between pointer-events-none">
          
          {/* HEADER */}
          <div className="p-6 md:p-8 flex justify-between items-center pointer-events-auto">
              <div className="flex items-center gap-4">
                  <div className={`px-3 py-1 rounded-full border bg-black/40 backdrop-blur-md flex items-center gap-2 ${status === 'ERROR' ? 'border-red-500 text-red-500' : 'border-white/10 text-white'}`}>
                      <Radio size={14} className={status === 'ACTIVE' ? 'animate-pulse text-green-400' : ''} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{status}</span>
                  </div>
              </div>
              <button onClick={onTerminate} className="w-10 h-10 rounded-full bg-white/10 hover:bg-red-500/20 text-white hover:text-red-500 flex items-center justify-center transition-all border border-white/5 hover:border-red-500/50">
                  <X size={18} />
              </button>
          </div>

          {/* DYNAMIC TRANSCRIPT AREA */}
          <div ref={scrollRef} className="flex-1 w-full max-w-2xl mx-auto px-6 overflow-y-auto no-scrollbar pointer-events-auto flex flex-col justify-end pb-10 space-y-4 mask-fade-top">
              
              {/* History */}
              {transcriptHistory.map((item, idx) => (
                  <div key={idx} className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                      <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm font-medium leading-relaxed backdrop-blur-sm ${
                          item.role === 'user' 
                          ? 'bg-white/10 text-white/70 rounded-tr-none' 
                          : 'bg-black/40 text-accent/80 border border-accent/10 rounded-tl-none'
                      }`}>
                          {item.text}
                      </div>
                  </div>
              ))}

              {/* Interim (Live Streaming) */}
              {interimTranscript && (
                  <div className={`flex ${interimTranscript.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                      <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-base font-bold leading-relaxed backdrop-blur-md border shadow-lg ${
                          interimTranscript.role === 'user' 
                          ? 'bg-white/20 text-white border-white/20 rounded-tr-none' 
                          : 'bg-accent/20 text-accent border-accent/40 rounded-tl-none'
                      }`}>
                          {interimTranscript.text}
                          <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-current animate-pulse"></span>
                      </div>
                  </div>
              )}
              
              {/* Status Text when Idle */}
              {!interimTranscript && status === 'ACTIVE' && transcriptHistory.length === 0 && (
                  <div className="text-center text-white/30 text-xs font-mono uppercase tracking-widest animate-pulse mt-4">
                      Listening for audio input...
                  </div>
              )}
          </div>

          {/* CONTROLS FOOTER */}
          <div className="p-8 md:p-12 flex justify-center items-center gap-6 pointer-events-auto bg-gradient-to-t from-black via-black/80 to-transparent">
              <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all ${
                      isMuted ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
                  }`}
              >
                  {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
              </button>

              <button 
                  onClick={onTerminate}
                  className="px-8 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white font-black text-xs tracking-[0.3em] uppercase shadow-lg shadow-red-900/50 hover:shadow-red-500/50 hover:scale-105 transition-all flex items-center gap-3 active:scale-95"
              >
                  <Activity size={18} className="animate-pulse" /> TERMINATE_LINK
              </button>

              <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center text-white/50">
                  <Volume2 size={24} />
              </div>
          </div>
      </div>

      <style>{`
        .mask-fade-top {
            mask-image: linear-gradient(to bottom, transparent 0%, black 20%);
            -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 20%);
        }
      `}</style>
    </div>
  );
};
