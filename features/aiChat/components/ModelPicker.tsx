
import React, { useState, useEffect } from 'react';
import { 
    X, Sparkles, Cpu, Zap, Globe, Layers, Brain, Activity, 
    Box, Wind, Gauge, Database, CircuitBoard, Star, CheckCircle2,
    AlertTriangle, Server, Network
} from 'lucide-react';
import { MODEL_CATALOG } from '../../../services/melsaKernel';
import { KEY_MANAGER, type ProviderStatus } from '../../../services/geminiService';

interface ModelPickerProps {
  isOpen: boolean;
  onClose: () => void;
  activeModelId: string;
  onSelectModel: (id: string) => void;
}

// --- SUB-COMPONENTS ---

const StatBar: React.FC<{ value: number; max: number; color: string; label: string }> = ({ value, max, color, label }) => {
    const percent = Math.min((value / max) * 100, 100);
    return (
        <div className="flex flex-col gap-1 w-full">
            <div className="flex justify-between items-end">
                <span className="text-[7px] font-bold text-neutral-500 uppercase tracking-wider">{label}</span>
                <span className={`text-[8px] font-mono font-bold ${color}`}>{value}</span>
            </div>
            <div className="h-1.5 w-full bg-black/20 dark:bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full ${color.replace('text-', 'bg-')} transition-all duration-700 ease-out`} style={{ width: `${percent}%` }}></div>
            </div>
        </div>
    );
};

const SpeedGauge: React.FC<{ speed: string }> = ({ speed }) => {
    const getSpeedColor = (s: string) => {
        if (s === 'INSTANT') return 'bg-emerald-400';
        if (s === 'FAST') return 'bg-blue-400';
        if (s === 'THINKING') return 'bg-purple-400';
        return 'bg-yellow-400';
    };
    
    return (
        <div className="flex flex-col gap-1">
            <span className="text-[7px] font-bold text-neutral-500 uppercase tracking-wider">SPEED</span>
            <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${getSpeedColor(speed)} shadow-[0_0_8px_currentColor]`}></div>
                <span className="text-[8px] font-black text-white uppercase">{speed}</span>
            </div>
        </div>
    );
};

export const ModelPicker: React.FC<ModelPickerProps> = ({
  isOpen,
  onClose,
  activeModelId,
  onSelectModel
}) => {
  const [activeTab, setActiveTab] = useState<'AUTO' | 'GOOGLE' | 'DEEPSEEK' | 'GROQ' | 'ROUTER' | 'MISTRAL'>('AUTO');
  const [statuses, setStatuses] = useState<ProviderStatus[]>([]);

  useEffect(() => {
      if (isOpen) {
          const update = () => setStatuses(KEY_MANAGER.getAllProviderStatuses());
          update();
          const interval = setInterval(update, 2000);
          return () => clearInterval(interval);
      }
  }, [isOpen]);

  if (!isOpen) return null;

  const tabs = {
    'AUTO': {
        icon: <CircuitBoard size={16}/>,
        label: 'HYDRA',
        sub: 'AUTO-PILOT',
        desc: 'Smart Multi-Model Routing',
        accent: 'from-emerald-400 to-cyan-400',
        textAccent: 'text-emerald-400',
        models: MODEL_CATALOG.filter(m => m.id === 'auto-best')
    },
    'GOOGLE': { 
        icon: <Sparkles size={16}/>, 
        label: 'GEMINI', 
        sub: 'DEEPMIND',
        desc: 'Multimodal Native',
        accent: 'from-blue-400 to-indigo-500',
        textAccent: 'text-blue-400',
        models: MODEL_CATALOG.filter(m => m.provider === 'GEMINI' && m.id !== 'auto-best') 
    },
    'DEEPSEEK': { 
        icon: <Brain size={16}/>, 
        label: 'DEEPSEEK', 
        sub: 'REASONING',
        desc: 'Complex Logic & Code',
        accent: 'from-indigo-400 to-purple-500',
        textAccent: 'text-indigo-400',
        models: MODEL_CATALOG.filter(m => m.provider === 'DEEPSEEK') 
    },
    'GROQ': { 
        icon: <Zap size={16}/>, 
        label: 'GROQ', 
        sub: 'LPU ENGINE',
        desc: 'Instant Inference Speed',
        accent: 'from-orange-400 to-red-500',
        textAccent: 'text-orange-400',
        models: MODEL_CATALOG.filter(m => m.provider === 'GROQ') 
    },
    'MISTRAL': { 
        icon: <Wind size={16}/>, 
        label: 'MISTRAL', 
        sub: 'EUROPE',
        desc: 'Efficient & Precise',
        accent: 'from-yellow-400 to-amber-500',
        textAccent: 'text-yellow-400',
        models: MODEL_CATALOG.filter(m => m.provider === 'MISTRAL') 
    },
    'ROUTER': { 
        icon: <Globe size={16}/>, 
        label: 'FRONTIER', 
        sub: 'OPENROUTER',
        desc: 'Aggregated Models',
        accent: 'from-pink-400 to-rose-500',
        textAccent: 'text-pink-400',
        models: MODEL_CATALOG.filter(m => m.provider === 'OPENROUTER') 
    },
  };

  const currentTab = tabs[activeTab];

  return (
    <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-6 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Main Container */}
      <div className="relative z-10 w-full md:w-[900px] h-[90vh] md:h-[650px] bg-[#09090b] md:rounded-[32px] rounded-t-[32px] border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-slide-up ring-1 ring-white/5">
        
        {/* Header */}
        <div className="h-16 px-6 md:px-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                <Layers size={18} className="text-white" />
            </div>
            <div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">
                NEURAL_ENGINE
                </h3>
                <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest">
                    System Architecture Selection
                </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-all border border-white/5"
          >
            <X size={16} />
          </button>
        </div>

        {/* Layout: Sidebar + Grid */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            
            {/* Sidebar Navigation */}
            <div className="md:w-64 bg-black/20 border-b md:border-b-0 md:border-r border-white/5 flex md:flex-col overflow-x-auto md:overflow-y-auto no-scrollbar shrink-0 gap-1 p-2">
                {Object.entries(tabs).map(([key, data]) => {
                    const isActive = activeTab === key;
                    return (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key as any)}
                            className={`
                                flex-1 md:flex-none min-w-[100px] md:w-full p-3 rounded-xl flex md:flex-row flex-col items-center md:items-start gap-3 transition-all border relative overflow-hidden group
                                ${isActive 
                                    ? 'bg-white/5 border-white/10' 
                                    : 'bg-transparent border-transparent hover:bg-white/[0.02]'
                                }
                            `}
                        >
                            {/* Active Indicator Bar */}
                            {isActive && (
                                <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${data.accent} shadow-[0_0_10px_currentColor]`}></div>
                            )}

                            <div className={`
                                p-2 rounded-lg transition-all duration-300 relative z-10
                                ${isActive ? `text-white bg-gradient-to-br ${data.accent} opacity-90` : 'text-neutral-500 bg-white/5 group-hover:text-white'}
                            `}>
                                {React.cloneElement(data.icon as React.ReactElement<any>, { size: 18 })}
                            </div>
                            
                            <div className="text-center md:text-left z-10">
                                <div className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-neutral-400 group-hover:text-white'}`}>
                                    {data.label}
                                </div>
                                <div className="hidden md:block text-[8px] font-bold text-neutral-600 uppercase tracking-wide group-hover:text-neutral-500">
                                    {data.sub}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-zinc-900/30 p-4 md:p-8 overflow-y-auto custom-scroll relative">
                {/* Decoration */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>
                <div className={`absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl ${currentTab.accent} opacity-[0.03] blur-[100px] pointer-events-none rounded-full translate-x-1/2 -translate-y-1/2`}></div>

                <div className="space-y-6 relative z-10">
                    <div className="flex items-end justify-between px-1">
                        <div>
                            <h2 className={`text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r ${currentTab.accent}`}>
                                {currentTab.label}
                            </h2>
                            <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest mt-1">
                                {currentTab.desc}
                            </p>
                        </div>
                        <div className="px-3 py-1 bg-white/5 rounded-full border border-white/5 text-[9px] font-bold text-neutral-400 flex items-center gap-2">
                            <Activity size={10} className="text-emerald-500 animate-pulse" />
                            {currentTab.models.length} MODELS ONLINE
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {currentTab.models.map(model => (
                            <ModelCard 
                                key={model.id} 
                                model={model} 
                                isActive={model.id === activeModelId} 
                                onClick={() => onSelectModel(model.id)} 
                                accentText={currentTab.textAccent}
                                accentGradient={currentTab.accent}
                                statuses={statuses}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="h-12 bg-[#050505] border-t border-white/5 flex items-center justify-between px-6 shrink-0 text-[9px] text-neutral-600 font-mono">
           <div className="flex items-center gap-2">
              <Network size={10} className="text-emerald-500" /> 
              <span className="uppercase tracking-widest">Global_Grid_Active</span>
           </div>
           <div>v13.5 // PLATINUM_KERNEL</div>
        </div>
      </div>
    </div>
  );
};

const ModelCard: React.FC<{ 
    model: any, 
    isActive: boolean, 
    onClick: () => void,
    accentText: string,
    accentGradient: string,
    statuses: ProviderStatus[]
}> = ({ model, isActive, onClick, accentText, accentGradient, statuses }) => {
  
  const isAuto = model.id === 'auto-best';
  
  // Status Logic
  let statusBadge = null;
  if (isAuto) {
      const healthyProviders = statuses.filter(s => s.status === 'HEALTHY');
      const majorProviders = ['GEMINI', 'GROQ', 'OPENAI', 'DEEPSEEK'];
      
      const getDotColor = (pId: string) => {
          const status = statuses.find(s => s.id === pId);
          if (!status || status.status !== 'HEALTHY') return 'bg-neutral-800 border-neutral-700';
          switch(pId) {
              case 'GEMINI': return 'bg-blue-500 border-blue-400';
              case 'GROQ': return 'bg-orange-500 border-orange-400';
              case 'OPENAI': return 'bg-green-500 border-green-400';
              case 'DEEPSEEK': return 'bg-purple-500 border-purple-400';
              default: return 'bg-white border-gray-300';
          }
      };

      statusBadge = (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <div className="flex -space-x-1">
                  {majorProviders.map(p => (
                      <div 
                        key={p} 
                        className={`w-2 h-2 rounded-full border ${getDotColor(p)} shadow-sm`}
                        title={p}
                      />
                  ))}
              </div>
              <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-wider">{healthyProviders.length} ENGINES READY</span>
          </div>
      );
  } else {
      const pStatus = statuses.find(s => s.id === model.provider);
      if (pStatus) {
          const isHealthy = pStatus.status === 'HEALTHY';
          statusBadge = (
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded border ${isHealthy ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'}`}>
                  {isHealthy ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                  <span className="text-[8px] font-bold uppercase tracking-wider">{isHealthy ? 'OPERATIONAL' : `COOLDOWN (${pStatus.cooldownRemaining}m)`}</span>
              </div>
          );
      }
  }

  return (
    <button
      onClick={onClick}
      className={`
        relative w-full text-left transition-all duration-300 group overflow-hidden
        rounded-[20px] border 
        ${isActive 
          ? `bg-white/[0.03] border-${accentText.split('-')[1]}-500/50 shadow-[0_0_30px_-10px_rgba(var(--accent-rgb),0.1)] ring-1 ring-${accentText.split('-')[1]}-500/20` 
          : 'bg-[#0f0f11] border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
        }
      `}
    >
      {/* Active Selection Glow */}
      {isActive && (
          <div className={`absolute inset-0 bg-gradient-to-r ${accentGradient} opacity-5 pointer-events-none`}></div>
      )}

      <div className="flex flex-col md:flex-row gap-5 p-5 relative z-10">
        
        {/* Left: Identity */}
        <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
                <span className={`text-lg font-black uppercase tracking-tight ${isActive ? 'text-white' : 'text-neutral-300 group-hover:text-white'} transition-colors`}>
                    {model.name}
                </span>
                {isAuto && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[8px] font-black tracking-widest uppercase animate-pulse">
                        SMART
                    </span>
                )}
                {model.specs.speed === 'THINKING' && (
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[8px] font-black tracking-widest uppercase">
                        THINKING
                    </span>
                )}
            </div>
            <p className="text-[10px] text-neutral-500 font-medium leading-relaxed pr-4 group-hover:text-neutral-400 transition-colors line-clamp-2">
                {model.description}
            </p>
            
            <div className="flex items-center gap-2 mt-4 flex-wrap">
                {statusBadge}
                {model.specs.context !== 'AUTO' && (
                    <div className="px-2 py-1 rounded bg-white/5 border border-white/5 text-[9px] font-mono text-neutral-400 flex items-center gap-1.5">
                        <Database size={10} /> {model.specs.context} CTX
                    </div>
                )}
                {isActive && (
                    <div className={`px-2 py-1 rounded bg-white/10 border border-white/10 text-[9px] font-bold uppercase tracking-wider text-white flex items-center gap-1.5`}>
                        <CheckCircle2 size={10} className={accentText} /> SELECTED
                    </div>
                )}
            </div>
        </div>

        {/* Right: Stats Grid */}
        <div className="md:w-48 shrink-0 flex flex-col justify-center gap-3 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
            <StatBar 
                label="INTELLIGENCE" 
                value={model.specs.intelligence} 
                max={10} 
                color={model.specs.intelligence >= 9.5 ? 'text-purple-400' : 'text-blue-400'} 
            />
            <SpeedGauge speed={model.specs.speed} />
        </div>

      </div>
    </button>
  );
};
