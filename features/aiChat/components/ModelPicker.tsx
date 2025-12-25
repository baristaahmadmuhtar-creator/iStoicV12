
import React, { useState } from 'react';
import { X, Sparkles, Cpu, Zap, Globe, Layers, Brain, Activity, Box, Wind, Gauge, Database, Info } from 'lucide-react';
import { MODEL_CATALOG } from '../../../services/melsaKernel';

interface ModelPickerProps {
  isOpen: boolean;
  onClose: () => void;
  activeModelId: string;
  onSelectModel: (id: string) => void;
}

export const ModelPicker: React.FC<ModelPickerProps> = ({
  isOpen,
  onClose,
  activeModelId,
  onSelectModel
}) => {
  const [activeTab, setActiveTab] = useState<'GOOGLE' | 'DEEPSEEK' | 'GROQ' | 'ROUTER' | 'MISTRAL'>('GOOGLE');

  if (!isOpen) return null;

  const tabs = {
    'GOOGLE': { 
        icon: <Sparkles size={16}/>, 
        label: 'DEEPMIND', 
        desc: 'Gemini Ecosystem',
        color: 'text-blue-500',
        bg: 'bg-blue-500/10',
        models: MODEL_CATALOG.filter(m => m.provider === 'GEMINI') 
    },
    'DEEPSEEK': { 
        icon: <Brain size={16}/>, 
        label: 'DEEPSEEK', 
        desc: 'Reasoning Models',
        color: 'text-indigo-500',
        bg: 'bg-indigo-500/10',
        models: MODEL_CATALOG.filter(m => m.provider === 'DEEPSEEK') 
    },
    'GROQ': { 
        icon: <Zap size={16}/>, 
        label: 'GROQ LPU', 
        desc: 'Instant Inference',
        color: 'text-orange-500',
        bg: 'bg-orange-500/10',
        models: MODEL_CATALOG.filter(m => m.provider === 'GROQ') 
    },
    'ROUTER': { 
        icon: <Globe size={16}/>, 
        label: 'OPENROUTER', 
        desc: 'Aggregated Frontier',
        color: 'text-pink-500',
        bg: 'bg-pink-500/10',
        models: MODEL_CATALOG.filter(m => m.provider === 'OPENROUTER') 
    },
    'MISTRAL': { 
        icon: <Wind size={16}/>, 
        label: 'MISTRAL', 
        desc: 'European SOTA',
        color: 'text-yellow-500',
        bg: 'bg-yellow-500/10',
        models: MODEL_CATALOG.filter(m => m.provider === 'MISTRAL') 
    }
  };

  const currentTab = tabs[activeTab];

  return (
    <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-6 animate-fade-in">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      />

      <div className="relative z-10 w-full md:w-[750px] bg-[#09090b] md:rounded-[40px] rounded-t-[32px] border border-white/10 shadow-2xl flex flex-col max-h-[90vh] md:max-h-[85vh] overflow-hidden animate-slide-up ring-1 ring-white/10">
        
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between shrink-0">
          <div className="space-y-1.5">
            <h3 className="text-lg font-black uppercase tracking-[0.2em] text-white flex items-center gap-3">
              <Layers size={20} className="text-accent" />
              NEURAL_ENGINE_MATRIX
            </h3>
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest pl-1">
                Select Cognitive Processor Architecture
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Vertical Layout for Desktop: Sidebar Tabs + Content */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            
            {/* Sidebar Tabs */}
            <div className="md:w-48 bg-black/20 border-b md:border-b-0 md:border-r border-white/5 p-2 md:p-4 flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto no-scrollbar shrink-0">
                {Object.entries(tabs).map(([key, data]) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key as any)}
                        className={`
                            flex-1 md:flex-none min-w-[100px] md:w-full p-3 rounded-2xl flex md:flex-row flex-col items-center md:justify-start gap-3 transition-all border
                            ${activeTab === key 
                                ? 'bg-white/10 border-white/10 text-white shadow-lg' 
                                : 'bg-transparent border-transparent text-neutral-500 hover:text-neutral-300 hover:bg-white/5'
                            }
                        `}
                    >
                        <div className={`p-2 rounded-xl ${activeTab === key ? data.bg + ' ' + data.color : 'bg-white/5'}`}>
                            {data.icon}
                        </div>
                        <div className="text-center md:text-left">
                            <div className="text-[9px] font-black uppercase tracking-widest">{data.label}</div>
                            <div className="hidden md:block text-[8px] text-neutral-500 font-medium truncate max-w-[90px]">{data.desc}</div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Models Grid */}
            <div className="flex-1 bg-zinc-900/30 p-4 md:p-6 overflow-y-auto custom-scroll">
                <div className="space-y-4">
                    {currentTab.models.length > 0 ? (
                        currentTab.models.map(model => (
                            <ModelCard 
                                key={model.id} 
                                model={model} 
                                isActive={model.id === activeModelId} 
                                onClick={() => onSelectModel(model.id)} 
                            />
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 opacity-40">
                            <Box size={48} className="mb-4 text-neutral-600"/>
                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">NO_MODELS_AVAILABLE</p>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#050505] border-t border-white/5 flex items-center justify-between shrink-0">
           <div className="flex items-center gap-2 text-[9px] text-neutral-600 tech-mono font-bold">
              <Activity size={10} className="text-emerald-500" /> SYSTEM_READY
           </div>
           <p className="text-[8px] text-neutral-700 font-mono uppercase tracking-widest">
              v13.5 // LATENCY_OPTIMIZED
           </p>
        </div>
      </div>
    </div>
  );
};

const ModelCard: React.FC<{ model: any, isActive: boolean, onClick: () => void }> = ({ model, isActive, onClick }) => {
  const getProviderStyle = (p: string) => {
      if (p === 'GEMINI') return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      if (p === 'DEEPSEEK') return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      if (p === 'GROQ') return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      if (p === 'OPENROUTER') return 'text-pink-400 bg-pink-500/10 border-pink-500/20';
      if (p === 'MISTRAL') return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      return 'text-neutral-400 bg-white/5 border-white/10';
  };

  const style = getProviderStyle(model.provider);

  return (
    <button
      onClick={onClick}
      className={`
        w-full p-5 rounded-[24px] text-left transition-all border relative group overflow-hidden
        ${isActive 
          ? 'bg-accent/5 border-accent/40 shadow-[0_0_40px_-10px_rgba(var(--accent-rgb),0.15)]' 
          : 'bg-[#0f0f11] border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
        }
      `}
    >
      <div className="flex gap-5">
        {/* Icon & Rank */}
        <div className="flex flex-col items-center gap-2">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 ${style}`}>
                {model.provider === 'GEMINI' ? <Sparkles size={24} /> : 
                    model.provider === 'DEEPSEEK' ? <Brain size={24} /> : 
                    model.provider === 'GROQ' ? <Zap size={24} /> :
                    model.provider === 'MISTRAL' ? <Wind size={24} /> :
                    <Globe size={24} />
                }
            </div>
            {model.specs.intelligence >= 9.5 && (
                <div className="px-2 py-0.5 rounded-full bg-white/10 border border-white/5 text-[8px] font-black text-white tracking-wider">
                    ELITE
                </div>
            )}
        </div>

        <div className="flex-1 min-w-0">
           {/* Header */}
           <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                  <span className={`text-base font-black uppercase italic tracking-tighter ${isActive ? 'text-white' : 'text-neutral-300 group-hover:text-white'}`}>
                    {model.name}
                  </span>
                  {model.id.includes('reasoner') && <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[8px] font-bold tracking-wider">THINKING</span>}
                  {model.id.includes('pro') && <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[8px] font-bold tracking-wider">PRO</span>}
                  {model.id.includes('flash') && <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-[8px] font-bold tracking-wider">FLASH</span>}
              </div>
              {isActive && <div className="w-2.5 h-2.5 rounded-full bg-accent shadow-[0_0_10px_var(--accent-color)] animate-pulse"></div>}
           </div>
           
           <p className="text-[10px] text-neutral-500 font-medium leading-relaxed mb-4 line-clamp-2 pr-4">
             {model.description}
           </p>

           {/* Detailed Stats Grid */}
           <div className="grid grid-cols-3 gap-3">
              <StatItem 
                label="SPEED" 
                value={model.specs.speed} 
                icon={<Gauge size={10} />} 
                highlight={model.specs.speed === 'INSTANT'}
              />
              <StatItem 
                label="CONTEXT" 
                value={model.specs.context} 
                icon={<Database size={10} />} 
                highlight={parseInt(model.specs.context) >= 100} // Loose check for high context
              />
              <StatItem 
                label="IQ SCORE" 
                value={`${model.specs.intelligence}/10`} 
                icon={<Activity size={10} />} 
                highlight={model.specs.intelligence >= 9.5}
              />
           </div>
        </div>
      </div>
    </button>
  );
};

const StatItem: React.FC<{ label: string, value: string, icon: React.ReactNode, highlight?: boolean }> = ({ label, value, icon, highlight }) => (
    <div className={`
        flex flex-col gap-1 p-2 rounded-xl border transition-colors
        ${highlight ? 'bg-white/5 border-white/10' : 'bg-black/20 border-transparent'}
    `}>
        <span className="text-[8px] font-bold text-neutral-600 uppercase tracking-widest flex items-center gap-1.5">
            {icon} {label}
        </span>
        <span className={`text-[10px] font-black uppercase ${highlight ? 'text-white' : 'text-neutral-400'}`}>
            {value}
        </span>
    </div>
);
