
import React, { useRef, useEffect, useState, memo } from 'react';
import { Send, Plus, Loader2, Mic, MicOff, Database, DatabaseZap, ArrowUp, Sparkles, Command, Activity, Lock, Paperclip, X, Image as ImageIcon } from 'lucide-react';

interface ChatInputProps {
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
  onSubmit: (e?: React.FormEvent, attachment?: { data: string, mimeType: string }) => void;
  onNewChat: () => void;
  onFocusChange: (isFocused: boolean) => void;
  aiName: string;
  isVaultSynced?: boolean;
  onToggleVaultSync?: () => void;
  personaMode?: 'melsa' | 'stoic';
  isVaultEnabled?: boolean;
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
  onToggleVaultSync,
  personaMode = 'melsa',
  isVaultEnabled = true
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDictating, setIsDictating] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [attachment, setAttachment] = useState<{ file: File, preview: string, base64: string } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      const newHeight = Math.min(inputRef.current.scrollHeight, 150);
      inputRef.current.style.height = `${newHeight}px`;
    }
  }, [input, attachment]); // Also resize if attachment changes space

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
      handleSubmit();
    }
  };

  const processFile = (file: File) => {
      if (!file.type.startsWith('image/')) {
          alert("Currently only images are supported for visual analysis.");
          return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
          const result = e.target?.result as string;
          // result is like "data:image/jpeg;base64,..."
          const base64 = result.split(',')[1];
          setAttachment({
              file,
              preview: result,
              base64: base64
          });
      };
      reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
          processFile(e.target.files[0]);
      }
      // Reset input value to allow re-selecting same file
      e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files?.[0]) {
          processFile(e.dataTransfer.files[0]);
      }
  };

  const handleSubmit = () => {
      if ((!input.trim() && !attachment) || isLoading) return;
      
      const attachmentPayload = attachment ? { data: attachment.base64, mimeType: attachment.file.type } : undefined;
      onSubmit(undefined, attachmentPayload);
      setAttachment(null); // Clear attachment after send
  };

  // Determine Persona Colors
  const isMelsa = personaMode === 'melsa';
  const focusRingStyle = isMelsa 
      ? 'ring-2 ring-orange-500/40 border-orange-500/50 shadow-[0_12px_40px_rgba(249,115,22,0.15)] bg-orange-500/[0.02]' 
      : 'ring-2 ring-cyan-500/40 border-cyan-500/50 shadow-[0_12px_40px_rgba(6,182,212,0.15)] bg-cyan-500/[0.02]';
  
  const hoverBorderStyle = isMelsa
      ? 'hover:border-orange-500/30 dark:hover:border-orange-500/30'
      : 'hover:border-cyan-500/30 dark:hover:border-cyan-500/30';

  const sendButtonStyle = isMelsa
      ? 'bg-orange-600 shadow-orange-500/25'
      : 'bg-cyan-600 shadow-cyan-500/25';

  return (
    <div className="w-full relative group">
      {/* Visual Feedback for Dictation */}
      {isDictating && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 animate-bounce shadow-lg z-10">
              <Activity size={12} className="animate-pulse" /> Listening...
          </div>
      )}

      {/* FLOATING CAPSULE DESIGN */}
      <div 
        className={`
            w-full transition-all duration-300 ease-out
            bg-white/90 dark:bg-[#1a1a1c]/90 backdrop-blur-xl
            border border-black/10 dark:border-white/10
            rounded-[32px] p-2 pl-4 flex flex-col
            shadow-[0_8px_32px_rgba(0,0,0,0.12)]
            ${isFocused || isDragOver ? `${focusRingStyle} scale-[1.01]` : `${hoverBorderStyle}`}
            ${isDictating ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : ''}
            ${isDragOver ? 'border-dashed' : ''}
        `}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        
        {/* Attachment Preview Area */}
        {attachment && (
            <div className="px-1 pt-2 pb-1 flex animate-fade-in">
                <div className="relative group/preview inline-block">
                    <img src={attachment.preview} alt="Preview" className="h-16 w-auto rounded-xl border border-black/10 dark:border-white/10 shadow-sm object-cover" />
                    <button 
                        onClick={() => setAttachment(null)}
                        className="absolute -top-2 -right-2 bg-black text-white rounded-full p-1 opacity-0 group-hover/preview:opacity-100 transition-opacity shadow-md hover:bg-red-500"
                    >
                        <X size={12} />
                    </button>
                </div>
            </div>
        )}

        <div className="flex items-end gap-3 w-full">
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
                onClick={() => fileInputRef.current?.click()}
                className="w-9 h-9 flex items-center justify-center rounded-full text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-all"
                title="Attach Image"
            >
                <Paperclip size={18} />
            </button>
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*" />

            <button 
                onClick={onToggleVaultSync}
                disabled={!isVaultEnabled}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${
                    !isVaultEnabled 
                    ? 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed opacity-50' 
                    : isVaultSynced 
                        ? (isMelsa ? 'text-orange-500 bg-orange-500/10' : 'text-cyan-500 bg-cyan-500/10') 
                        : 'text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/5'
                }`}
                title={!isVaultEnabled ? "Vault Disabled in Settings" : (isVaultSynced ? "Vault Active" : "Vault Offline")}
            >
                {!isVaultEnabled ? <Lock size={14} /> : (isVaultSynced ? <DatabaseZap size={16} /> : <Database size={16} />)}
            </button>
            </div>

            {/* Text Area */}
            <div className="flex-1 py-3 min-w-0">
            <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => { setIsFocused(true); onFocusChange(true); }}
                onBlur={() => { setIsFocused(false); onFocusChange(false); }}
                placeholder={isDictating ? "Silakan bicara..." : isDragOver ? "Drop image here..." : `Tulis ${personaMode}...`}
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
                onClick={() => handleSubmit()}
                disabled={(!input.trim() && !attachment) || isLoading}
                className={`
                h-11 px-6 rounded-full flex items-center gap-2 font-black uppercase text-[10px] tracking-widest transition-all
                ${(input.trim() || attachment) && !isLoading 
                    ? `${sendButtonStyle} text-white shadow-lg hover:scale-105 active:scale-95` 
                    : 'bg-black/5 dark:bg-white/5 text-neutral-400 cursor-not-allowed'}
                `}
            >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={20} strokeWidth={3} />}
            </button>
            </div>
        </div>
      </div>

      {/* Helper Text */}
      <div className={`absolute -top-8 left-0 right-0 text-center text-[9px] tech-mono font-bold text-neutral-400/60 uppercase tracking-widest transition-opacity pointer-events-none hidden md:block ${isFocused ? 'opacity-100' : 'opacity-0'}`}>
        ENTER TO SEND / SHIFT + ENTER FOR NEW LINE / DRAG & DROP IMAGES
      </div>
    </div>
  );
});
