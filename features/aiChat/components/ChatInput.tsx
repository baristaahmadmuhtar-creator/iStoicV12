
import React, { useRef, useEffect, useState, memo } from 'react';
import { Send, Plus, Loader2, Mic, MicOff, Database, DatabaseZap, Paperclip, X, Image as ImageIcon, Flame, Brain, CornerDownLeft, Clipboard, ShieldCheck, FileText } from 'lucide-react';
import { TRANSLATIONS, getLang } from '../../../services/i18n';
import { debugService } from '../../../services/debugService';
import { UI_REGISTRY, FN_REGISTRY } from '../../../constants/registry';

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
  personaMode?: 'hanisah' | 'stoic';
  isVaultEnabled?: boolean;
  onTogglePersona?: () => void;
}

const MAX_CHARS = 4000;

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
  personaMode = 'hanisah',
  isVaultEnabled = true,
  onTogglePersona
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDictating, setIsDictating] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [attachment, setAttachment] = useState<{ file: File, preview: string, base64: string } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pasteFlash, setPasteFlash] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const currentLang = getLang();
  const t = TRANSLATIONS[currentLang].chat;

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      const newHeight = Math.min(inputRef.current.scrollHeight, 150);
      inputRef.current.style.height = `${Math.max(24, newHeight)}px`;
    }
  }, [input, attachment]);

  // Cleanup dictation on unmount
  useEffect(() => {
      return () => {
          if (recognitionRef.current) recognitionRef.current.stop();
      };
  }, []);

  const handlePaste = (e: React.ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, text);
      
      setPasteFlash(true);
      setTimeout(() => setPasteFlash(false), 500);
  };

  const toggleDictation = (e: React.MouseEvent) => {
    e.stopPropagation();
    debugService.logAction(UI_REGISTRY.CHAT_INPUT_MIC, FN_REGISTRY.CHAT_SEND_MESSAGE, isDictating ? 'STOP' : 'START');
    if (isDictating) {
      recognitionRef.current?.stop();
      setIsDictating(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser does not support Speech Recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = TRANSLATIONS[currentLang].meta.code;
    recognition.continuous = true;
    recognition.interimResults = true; 

    recognition.onstart = () => {
        setIsDictating(true);
        if (navigator.vibrate) navigator.vibrate(50); // Haptic feedback
    };
    
    recognition.onend = () => {
        setIsDictating(false);
    };
    
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
          setInput((prev) => {
              const needsSpace = prev.length > 0 && !prev.endsWith(' ');
              return prev + (needsSpace ? ' ' : '') + finalTranscript;
          });
      }
    };

    recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsDictating(false);
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
          alert("Only images supported.");
          return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
          const result = e.target?.result as string;
          const base64 = result.split(',')[1];
          setAttachment({ file, preview: result, base64 });
      };
      reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) processFile(e.target.files[0]);
      e.target.value = '';
  };

  const handleAttachClick = () => {
      debugService.logAction(UI_REGISTRY.CHAT_INPUT_ATTACH, FN_REGISTRY.CHAT_SEND_MESSAGE, 'OPEN_DIALOG');
      fileInputRef.current?.click();
  };

  const handleNewChatClick = () => {
      debugService.logAction(UI_REGISTRY.CHAT_INPUT_NEW, FN_REGISTRY.CHAT_NEW_SESSION, 'CLICK');
      onNewChat();
  };

  const handleSubmit = () => {
      if (isDictating) {
          recognitionRef.current?.stop();
          setIsDictating(false);
      }
      if ((!input.trim() && !attachment) || isLoading) return;
      if (input.length > MAX_CHARS) {
          alert(`Character limit exceeded (${MAX_CHARS}). Please shorten your message.`);
          return;
      }

      debugService.logAction(UI_REGISTRY.CHAT_INPUT_SEND, FN_REGISTRY.CHAT_SEND_MESSAGE, 'SUBMIT');

      const attachmentPayload = attachment ? { data: attachment.base64, mimeType: attachment.file.type } : undefined;
      onSubmit(undefined, attachmentPayload);
      setAttachment(null);
      // Reset height
      if (inputRef.current) inputRef.current.style.height = 'auto';
  };

  const charCountColor = input.length > MAX_CHARS * 0.9 
      ? 'text-red-500' 
      : input.length > MAX_CHARS * 0.7 
          ? 'text-amber-500' 
          : 'text-neutral-400';

  return (
    <div className="w-full relative group">
      
      {/* Dictation Overlay Indicator */}
      {isDictating && (
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-fade-in z-20">
              <div className="bg-red-500 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-[0_0_20px_rgba(239,68,68,0.4)] border border-red-400">
                  <div className="flex gap-1 items-center h-3">
                      <div className="w-1 bg-white animate-[music-bar_0.8s_ease-in-out_infinite]"></div>
                      <div className="w-1 bg-white animate-[music-bar_0.6s_ease-in-out_infinite]"></div>
                      <div className="w-1 bg-white animate-[music-bar_1.0s_ease-in-out_infinite]"></div>
                  </div>
                  {t.listening}
              </div>
          </div>
      )}

      {/* Paste Flash Indicator */}
      {pasteFlash && (
          <div className="absolute -top-8 right-0 text-[9px] font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg animate-fade-in flex items-center gap-2">
              <Clipboard size={12} /> FORMAT_STRIPPED
          </div>
      )}

      {/* MAIN CAPSULE */}
      <div 
        className={`
            w-full transition-all duration-300 ease-out
            bg-white/95 dark:bg-[#0a0a0b]/95 backdrop-blur-2xl
            border 
            rounded-[28px] p-1.5 flex flex-col
            shadow-[0_8px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_40px_-10px_rgba(0,0,0,0.6)]
            ${isDictating 
                ? 'border-red-500/50 ring-2 ring-red-500/20' 
                : pasteFlash
                    ? 'border-emerald-500/50 ring-2 ring-emerald-500/20'
                    : isFocused || isDragOver 
                        ? 'border-accent/50 ring-2 ring-accent/20 shadow-[0_0_25px_rgba(var(--accent-rgb),0.15)]' 
                        : 'border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
            }
            ${isDragOver ? 'scale-[1.02]' : ''}
        `}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragOver(false); if(e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]); }}
      >
        
        {/* Attachment Preview Area */}
        {attachment && (
            <div className="px-3 pt-3 pb-1 flex animate-slide-up">
                <div className="relative group/preview inline-block">
                    <img src={attachment.preview} alt="Preview" className="h-16 w-auto rounded-xl border border-black/10 dark:border-white/10 shadow-sm object-cover" />
                    <button 
                        onClick={() => setAttachment(null)}
                        aria-label="Remove Attachment"
                        className="absolute -top-2 -right-2 bg-black text-white rounded-full p-1 shadow-md hover:bg-red-500 transition-colors border border-white/20"
                    >
                        <X size={10} />
                    </button>
                </div>
            </div>
        )}

        {/* INPUT AREA */}
        <div className="relative px-3 pt-2 pb-1">
            <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onFocus={() => { setIsFocused(true); onFocusChange(true); }}
                onBlur={() => { setIsFocused(false); onFocusChange(false); }}
                placeholder={isDictating ? t.listening : t.placeholder}
                className="w-full bg-transparent text-[15px] font-medium text-black dark:text-white placeholder:text-neutral-400 resize-none focus:outline-none max-h-60 custom-scroll leading-relaxed"
                rows={1}
                aria-label="Chat Input"
            />
        </div>

        {/* TOOLBAR & ACTIONS */}
        <div className="flex items-center justify-between px-2 pb-1 pt-1 gap-2 border-t border-transparent transition-colors duration-300">
            
            {/* Left Tools */}
            <div className="flex gap-1 items-center">
                <button 
                    onClick={handleNewChatClick}
                    aria-label="New Chat"
                    className="w-8 h-8 flex items-center justify-center rounded-xl text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-95"
                    title={t.newChat}
                >
                    <Plus size={18} strokeWidth={2} />
                </button>
                
                <button 
                    onClick={handleAttachClick}
                    aria-label="Attach Image"
                    className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-95 ${attachment ? 'text-accent bg-accent/10' : 'text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}
                    title="Attach Image"
                >
                    <Paperclip size={16} strokeWidth={2} />
                </button>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*" />

                <div className="w-[1px] h-4 bg-black/10 dark:bg-white/10 mx-1"></div>

                <button 
                    onClick={onToggleVaultSync}
                    disabled={!isVaultEnabled}
                    aria-label={isVaultEnabled ? (isVaultSynced ? "Vault Sync Active" : "Vault Sync Inactive") : "Vault Disabled"}
                    className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-95 ${!isVaultEnabled ? 'opacity-30' : isVaultSynced ? 'text-accent bg-accent/5' : 'text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}
                    title={isVaultEnabled ? "Vault Sync" : "Vault Disabled"}
                >
                    {isVaultSynced ? <DatabaseZap size={16} /> : <Database size={16} />}
                </button>

                <button 
                    onClick={onTogglePersona}
                    aria-label={`Switch to ${personaMode === 'hanisah' ? 'Stoic' : 'Hanisah'} Persona`}
                    className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-95 ${personaMode === 'hanisah' ? 'text-orange-500 bg-orange-500/5' : 'text-cyan-500 bg-cyan-500/5'}`}
                    title="Switch Persona"
                >
                    {personaMode === 'hanisah' ? <Flame size={16} /> : <Brain size={16} />}
                </button>
            </div>

            {/* Right Actions & Status */}
            <div className="flex items-center gap-3">
                {/* Character Counter */}
                <div className={`text-[9px] tech-mono font-bold transition-colors ${charCountColor} hidden sm:block`}>
                    {input.length} <span className="opacity-40">/ {MAX_CHARS}</span>
                </div>

                {/* Dictation */}
                <button 
                    onClick={toggleDictation}
                    aria-label={isDictating ? "Stop Dictation" : "Start Dictation"}
                    className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-95 ${isDictating ? 'bg-red-500 text-white shadow-lg animate-pulse' : 'text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}
                    title="Real-time Dictation"
                >
                    {isDictating ? <MicOff size={16} /> : <Mic size={18} strokeWidth={2} />}
                </button>

                {/* Send Button */}
                <button 
                    onClick={() => handleSubmit()}
                    disabled={(!input.trim() && !attachment) || isLoading || input.length > MAX_CHARS}
                    aria-label="Send Message"
                    className={`
                        w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
                        ${(input.trim() || attachment) && !isLoading && input.length <= MAX_CHARS
                            ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg hover:scale-105 active:scale-95 hover:shadow-[0_0_20px_var(--accent-glow)]' 
                            : 'bg-black/5 dark:bg-white/5 text-neutral-400 cursor-not-allowed'}
                    `}
                >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <CornerDownLeft size={20} strokeWidth={2.5} />}
                </button>
            </div>
        </div>
      </div>
      
      <style>{`
        @keyframes music-bar {
            0%, 100% { height: 4px; }
            50% { height: 12px; }
        }
      `}</style>
    </div>
  );
});
