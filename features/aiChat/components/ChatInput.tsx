
import React, { useRef, useEffect, useState, memo } from 'react';
import { Database, DatabaseZap, Plus, X, Flame, Brain, CornerDownLeft, Square } from 'lucide-react';
import { TRANSLATIONS, getLang } from '../../../services/i18n';

interface ChatInputProps {
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
  onSubmit: (e?: React.FormEvent, attachment?: { data: string, mimeType: string }) => void;
  onStop?: () => void;
  onNewChat: () => void;
  onFocusChange: (isFocused: boolean) => void;
  aiName: string;
  isVaultSynced?: boolean;
  onToggleVaultSync?: () => void;
  personaMode?: 'hanisah' | 'stoic';
  onTogglePersona?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = memo(({
  input, setInput, isLoading, onSubmit, onStop, onNewChat, onFocusChange, 
  isVaultSynced = true, onToggleVaultSync, personaMode = 'hanisah', onTogglePersona
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [attachment, setAttachment] = useState<any>(null);
  
  const currentLang = getLang();
  const t = TRANSLATIONS[currentLang].chat;

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && (input.trim() || attachment)) onSubmit();
    }
  };

  const personaColor = personaMode === 'hanisah' ? 'ring-orange-500/20 border-orange-500/40' : 'ring-cyan-500/20 border-cyan-500/40';

  return (
    <div className="w-full relative group pb-safe">
      <div className={`
          w-full transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
          bg-white/90 dark:bg-[#0a0a0b]/95 backdrop-blur-3xl
          border rounded-[32px] p-2 flex flex-col
          shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)]
          ${isFocused ? `ring-4 ${personaColor}` : 'border-black/5 dark:border-white/10'}
      `}>
        
        {attachment && (
            <div className="px-3 pt-3 flex animate-slide-up">
                <div className="relative group/preview">
                    <img src={attachment.preview} className="h-14 w-14 rounded-xl object-cover border border-white/10" alt="Preview" />
                    <button onClick={() => setAttachment(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg">
                        <X size={10} />
                    </button>
                </div>
            </div>
        )}

        <div className="relative px-3 pt-2">
            <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => { setIsFocused(true); onFocusChange(true); }}
                onBlur={() => { setIsFocused(false); onFocusChange(false); }}
                placeholder={isVaultSynced ? "Vault unlocked. Core memory access granted..." : t.placeholder}
                className="w-full bg-transparent text-sm font-medium text-black dark:text-white placeholder:text-neutral-500 resize-none focus:outline-none min-h-[44px] custom-scroll py-3"
                rows={1}
            />
        </div>

        <div className="flex items-center justify-between px-2 pb-1">
            <div className="flex gap-1 items-center">
                <button onClick={onNewChat} className="w-9 h-9 flex items-center justify-center rounded-xl text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-90" title="New Session">
                    <Plus size={18} />
                </button>
                
                <div className="w-[1px] h-4 bg-black/10 dark:bg-white/10 mx-1"></div>

                <button 
                    onClick={onToggleVaultSync}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all relative group/vault ${isVaultSynced ? 'text-purple-500 bg-purple-500/10' : 'text-neutral-400 hover:bg-black/5 dark:hover:bg-white/5'}`}
                    title={isVaultSynced ? "Vault Unlocked (Decrypted)" : "Vault Locked (Encrypted)"}
                >
                    {isVaultSynced ? (
                        <DatabaseZap size={18} className="animate-pulse" />
                    ) : (
                        <Database size={18} />
                    )}
                    {isVaultSynced && <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white dark:border-black shadow-[0_0_8px_#10b981]"></span>}
                </button>

                <button onClick={onTogglePersona} className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-95 ${personaMode === 'hanisah' ? 'text-orange-500 bg-orange-500/10' : 'text-cyan-500 bg-cyan-500/10'}`} title="Switch Persona">
                    {personaMode === 'hanisah' ? <Flame size={18} /> : <Brain size={18} />}
                </button>
            </div>

            <div className="flex items-center gap-2">
                {isLoading ? (
                    <button onClick={onStop} className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500 text-white shadow-lg animate-pulse active:scale-90">
                        <Square size={16} fill="currentColor" />
                    </button>
                ) : (
                    <button 
                        onClick={() => onSubmit()}
                        disabled={!input.trim() && !attachment}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${input.trim() || attachment ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg hover:scale-105 active:scale-95' : 'bg-black/5 dark:bg-white/5 text-neutral-400'}`}
                    >
                        <CornerDownLeft size={20} strokeWidth={2.5} />
                    </button>
                )}
            </div>
        </div>
      </div>
    </div>
  );
});
