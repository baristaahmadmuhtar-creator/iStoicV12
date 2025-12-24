
import React from 'react';
import { X, Sparkles, Cpu, Zap, Box, Layers, Brain, Activity } from 'lucide-react';
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
  if (!isOpen) return null;

  // Group models by category/provider for better organization
  const groupedModels = {
    'GEMINI_NATIVE': MODEL_CATALOG.filter(m => m.provider === 'GEMINI'),
    'OPEN_ARSENAL': MODEL_CATALOG.filter(m => m.provider !== 'GEMINI')
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-4 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full md:w-[600px] bg-[#0d0d0e] md:rounded-[32px] rounded-t-[32px] border border-white/10 shadow-2xl flex flex-col max-h-[85vh] md:max-h-[80vh] overflow-hidden animate-slide-up">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between shrink-0">
          <div className="space-y-1">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white flex items-center gap-2">
              <Layers size={16} className="text-accent" />
              NEURAL ENGINE CATALOG
            </h3>
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wide">Select Cognitive Processor</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Scrollable Content */}
        <div className="overflow-y-auto custom-scroll p-4 space-y-6">
          
          {/* Gemini Section */}
          <div className="space-y-3">
            <div className="px-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-500">
               <Sparkles size={12} className="text-blue-400" /> Google DeepMind
            </div>
            {groupedModels['GEMINI_NATIVE'].map(model => (
               <ModelCard 
                 key={model.id} 
                 model={model} 
                 isActive={model.id === activeModelId} 
                 onClick={() => onSelectModel(model.id)} 
               />
            ))}
          </div>

          {/* Arsenal Section */}
          {groupedModels['OPEN_ARSENAL'].length > 0 && (
            <div className="space-y-3">
               <div className="px-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-500 mt-4">
                  <Box size={12} className="text-orange-400" /> Open Arsenal (Groq/DeepSeek)
               </div>
               {groupedModels['OPEN_ARSENAL'].map(model => (
                  <ModelCard 
                    key={model.id} 
                    model={model} 
                    isActive={model.id === activeModelId} 
                    onClick={() => onSelectModel(model.id)} 
                  />
               ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-4 bg-black/40 border-t border-white/5 text-center shrink-0">
           <p className="text-[9px] text-neutral-600 tech-mono uppercase tracking-widest">
              SYSTEM_OPTIMIZED_FOR_LOW_LATENCY
           </p>
        </div>
      </div>
    </div>
  );
};

const ModelCard: React.FC<{ model: any, isActive: boolean, onClick: () => void }> = ({ model, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-2xl text-left transition-all border relative overflow-hidden group ${
        isActive 
        ? 'bg-accent/10 border-accent/30 shadow-[0_0_30px_rgba(var(--accent-rgb),0.1)]' 
        : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10'
      }`}
    >
      {isActive && (
        <div className="absolute right-0 top-0 p-3">
           <div className="w-2 h-2 rounded-full bg-accent animate-pulse shadow-[0_0_10px_var(--accent-color)]"></div>
        </div>
      )}

      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all ${
           isActive ? 'bg-accent text-on-accent shadow-lg' : 'bg-black/20 text-neutral-500 group-hover:text-white'
        }`}>
           {model.provider === 'GEMINI' ? <Sparkles size={20} /> : (model.provider === 'DEEPSEEK' ? <Brain size={20} /> : <Cpu size={20} />)}
        </div>

        <div className="flex-1 min-w-0">
           <div className="flex items-center gap-2 mb-1">
              <span className={`text-sm font-black uppercase italic tracking-tighter ${isActive ? 'text-white' : 'text-neutral-300'}`}>
                {model.name}
              </span>
              {model.id.includes('pro') && <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[8px] font-bold border border-purple-500/20">PRO</span>}
           </div>
           
           <p className="text-[10px] text-neutral-500 font-medium leading-relaxed mb-3 line-clamp-2">
             {model.description}
           </p>

           {/* Stats Grid */}
           <div className="grid grid-cols-3 gap-2">
              <div className="bg-black/20 rounded-lg p-1.5 border border-white/5 flex flex-col items-center">
                 <span className="text-[8px] text-neutral-600 font-bold uppercase">SPEED</span>
                 <div className="flex items-center gap-1 text-[9px] font-black text-neutral-300">
                    <Zap size={10} className={model.specs.speed === 'INSTANT' ? 'text-yellow-400' : 'text-neutral-500'} />
                    {model.specs.speed}
                 </div>
              </div>
              <div className="bg-black/20 rounded-lg p-1.5 border border-white/5 flex flex-col items-center">
                 <span className="text-[8px] text-neutral-600 font-bold uppercase">CONTEXT</span>
                 <div className="flex items-center gap-1 text-[9px] font-black text-neutral-300">
                    <Layers size={10} />
                    {model.specs.context}
                 </div>
              </div>
              <div className="bg-black/20 rounded-lg p-1.5 border border-white/5 flex flex-col items-center">
                 <span className="text-[8px] text-neutral-600 font-bold uppercase">IQ SCORE</span>
                 <div className="flex items-center gap-1 text-[9px] font-black text-neutral-300">
                    <Activity size={10} className={model.specs.intelligence >= 10 ? 'text-green-400' : 'text-neutral-500'} />
                    {model.specs.intelligence}/10
                 </div>
              </div>
           </div>
        </div>
      </div>
    </button>
  );
};
