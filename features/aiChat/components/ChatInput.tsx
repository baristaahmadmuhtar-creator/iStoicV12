
import React, { useRef, useEffect, useState, memo } from 'react';
import { Send, Plus, Loader2, Mic, MicOff, Database, DatabaseZap, ArrowUp, Sparkles, Command, Activity } from 'lucide-react';

interface ChatInputProps {
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
  onSubmit: (e?: React.FormEvent) => void;
  onNewChat: () => void;
  onFocusChange: (isFocused: boolean) => void;
  aiName: string;
  isVaultSynced?: boolean;
  onToggleVaultSync?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = memo(({
  input,
  setInput,
  isLoading,
  onSubmit,
  onNewChat,
  onFocusChange,
  aiName,
  isVaultSynced = true,
  onToggleVaultSync
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isDictating, setIsDictating] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      const newHeight = Math.min(inputRef.current.scrollHeight, 150);
      inputRef.current.style.height = `${newHeight}px`;
    }
  }, [input]);

  const toggleDictation = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDictating) {
      recognitionRef.current?.stop();
      setIsDictating(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser Anda tidak mendukung fitur Dictation. Gunakan Chrome/Safari.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => setIsDictating(true);
    recognition.onend = () => setIsDictating(false);
    
    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      if (finalTranscript) {
          setInput((prev) => prev + (prev ? ' ' : '') + finalTranscript);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="w-full relative group">
      {/* Visual Feedback for Dictation */}
      {isDictating && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 animate-bounce shadow-lg z-10">
              <Activity size={12} className="animate-pulse" /> Listening...
          </div>
      )}

      {/* FLOATING CAPSULE DESIGN */}
      <div className={`
        w-full transition-all duration-300 ease-out
        bg-white/90 dark:bg-[#1a1a1c]/90 backdrop-blur-xl
        border border-black/10 dark:border-white/10
        rounded-[32px] p-2 pl-4 flex items-end gap-3
        shadow-[0_8px_32px_rgba(0,0,0,0.12)]
        ${isFocused ? 'ring-2 ring-accent/50 border-accent/30 shadow-[0_12px_40px_rgba(var(--accent-rgb),0.15)] scale-[1.01]' : 'hover:border-black/20 dark:hover:border-white/20'}
        ${isDictating ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : ''}
      `}>
        
        {/* Left Actions */}
        <div className="flex gap-1 pb-1.5 hidden xs:flex">
          <button 
            onClick={onNewChat}
            className="w-9 h-9 flex items-center justify-center rounded-full text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-all"
            title="New Chat"
          >
            <Plus size={18} />
          </button>
           <button 
            onClick={onToggleVaultSync}
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${isVaultSynced ? 'text-accent bg-accent/10' : 'text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/5'}`}
            title={isVaultSynced ? "Vault Active" : "Vault Offline"}
          >
            {isVaultSynced ? <DatabaseZap size={16} /> : <Database size={16} />}
          </button>
        </div>

        {/* Text Area */}
        <div className="flex-1 py-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => { setIsFocused(true); onFocusChange(true); }}
            onBlur={() => { setIsFocused(false); onFocusChange(false); }}
            placeholder={isDictating ? "Silakan bicara..." : `Tulis perintah untuk ${aiName}...`}
            className="w-full bg-transparent text-[15px] font-medium text-black dark:text-white placeholder:text-neutral-400/80 resize-none focus:outline-none max-h-40 custom-scroll leading-relaxed pl-1"
            rows={1}
            style={{ minHeight: '24px' }}
          />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 pb-1.5 pr-1">
           <button 
            onClick={toggleDictation}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${isDictating ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/30' : 'text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/5'}`}
            title="Voice Input (Uses ElevenLabs Voice in Reply)"
          >
            {isDictating ? <Mic size={18} /> : <MicOff size={18} />}
          </button>

          <button 
            onClick={() => onSubmit()}
            disabled={!input.trim() || isLoading}
            className={`
              h-11 px-6 rounded-full flex items-center gap-2 font-black uppercase text-[10px] tracking-widest transition-all
              ${input.trim() && !isLoading 
                ? 'bg-accent text-on-accent shadow-lg shadow-accent/25 hover:scale-105 active:scale-95' 
                : 'bg-black/5 dark:bg-white/5 text-neutral-400 cursor-not-allowed'}
            `}
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={20} strokeWidth={3} />}
          </button>
        </div>
      </div>

      {/* Helper Text */}
      <div className={`absolute -top-8 left-0 right-0 text-center text-[9px] tech-mono font-bold text-neutral-400/60 uppercase tracking-widest transition-opacity pointer-events-none hidden md:block ${isFocused ? 'opacity-100' : 'opacity-0'}`}>
        ENTER TO SEND / SHIFT + ENTER FOR NEW LINE
      </div>
    </div>
  );
});
