
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Bold, Italic, Underline, Maximize2, Minimize2, 
  Mic, MicOff, Sparkles, X, RefreshCw, Flame, CheckCircle, Activity,
  AlignLeft, Wand2
} from 'lucide-react';
import { MELSA_KERNEL } from '../../services/melsaKernel';

interface AdvancedEditorProps {
  initialContent: string;
  onSave: (content: string) => void;
  language: 'id' | 'en';
  fontSize: number;
  onFontSizeChange: (size: number) => void;
}

export const AdvancedEditor: React.FC<AdvancedEditorProps> = ({ initialContent, onSave, language, fontSize, onFontSizeChange }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isDictating, setIsDictating] = useState(false);
  const [fontFamily, setFontFamily] = useState('Plus Jakarta Sans');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'SAVED' | 'SYNCING'>('SAVED');
  
  // MELSA Assistant States
  const [showMelsaOverlay, setShowMelsaOverlay] = useState(false);
  const [melsaInstruction, setMelsaInstruction] = useState('');
  const [isMelsaProcessing, setIsMelsaProcessing] = useState(false);
  const [melsaResult, setMelsaResult] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const lastSavedContent = useRef<string>(initialContent);
  // Fix: Use ReturnType<typeof setTimeout> instead of NodeJS.Timeout to avoid missing namespace error in browser environment
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (editorRef.current && initialContent !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = initialContent || '<div><br></div>';
      lastSavedContent.current = initialContent;
    }
  }, []);

  const performSave = useCallback((content: string) => {
    onSave(content);
    lastSavedContent.current = content;
    setSyncStatus('SAVED');
  }, [onSave]);

  // Robust Auto-Save & Data Integrity Logic
  useEffect(() => {
    const handleMutation = () => {
      if (!editorRef.current) return;
      const currentContent = editorRef.current.innerHTML;
      
      if (currentContent !== lastSavedContent.current) {
        setSyncStatus('SYNCING');
        
        // Clear pending save to reset debounce
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        
        // Debounce save for typing performance
        saveTimeoutRef.current = setTimeout(() => {
          performSave(currentContent);
        }, 1000);
      }
    };

    const observer = new MutationObserver(handleMutation);
    if (editorRef.current) {
        observer.observe(editorRef.current, { childList: true, characterData: true, subtree: true });
    }

    return () => {
      observer.disconnect();
      // CRITICAL: Force save on unmount if there are pending changes
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (editorRef.current && editorRef.current.innerHTML !== lastSavedContent.current) {
        console.log("Creating emergency save checkpoint...");
        onSave(editorRef.current.innerHTML);
      }
    };
  }, [performSave, onSave]);

  const executeCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleMelsaProcess = async () => {
    if (!melsaInstruction.trim() || isMelsaProcessing || !editorRef.current) return;
    setIsMelsaProcessing(true);
    setMelsaResult(null);
    try {
      const currentText = editorRef.current.innerText;
      const prompt = `[NEURAL_SYNTHESIS_REQUEST]\n\nINSTRUKSI_TUAN: ${melsaInstruction}\n\nKONTEN_ASLI:\n${currentText}\n\n---\n\nTugas: Jalankan instruksi di atas. Berikan output teks yang sudah rapi dalam format paragraf atau poin-poin yang elegan. Langsung berikan hasilnya saja tanpa basa-basi pembuka.`;
      
      const response = await MELSA_KERNEL.execute(prompt, 'gemini-3-flash-preview', "Konteks: Kamu adalah Melsa, asisten penulis kognitif.");
      setMelsaResult(response.text || "⚠️ Gagal mendapatkan respons saraf.");
    } catch (error) {
      setMelsaResult("⚠️ Sinkronisasi saraf gagal. Silakan coba lagi.");
    } finally {
      setIsMelsaProcessing(false);
    }
  };

  const applyMelsaResult = () => {
    if (!melsaResult || !editorRef.current) return;
    // Simple line-break to HTML conversion for the contentEditable
    const formatted = melsaResult.split('\n').filter(l => l.trim()).map(l => `<p>${l}</p>`).join('');
    editorRef.current.innerHTML = formatted;
    performSave(formatted); // Immediate save
    setShowMelsaOverlay(false);
    setMelsaResult(null);
    setMelsaInstruction('');
  };

  const toggleDictation = () => {
    if (isDictating) {
      recognitionRef.current?.stop();
      setIsDictating(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input not supported in this browser.");
      return;
    }
    const r = new SpeechRecognition();
    r.lang = language === 'id' ? 'id-ID' : 'en-US';
    r.continuous = true;
    r.interimResults = false; // execCommand works best with final results chunks
    r.onstart = () => setIsDictating(true);
    r.onend = () => setIsDictating(false);
    r.onresult = (e: any) => {
      const text = e.results[e.results.length - 1][0].transcript;
      document.execCommand('insertText', false, text + ' ');
    };
    recognitionRef.current = r;
    r.start();
  };

  return (
    <div className={`flex flex-col h-full transition-all duration-700 ${isFocusMode ? 'fixed inset-0 z-[1200] bg-zinc-50 dark:bg-black p-4 md:p-12 pb-safe' : 'relative'}`}>
      
      {/* DICTATION OVERLAY */}
      {isDictating && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2 animate-bounce shadow-xl z-[1300]">
            <Activity size={14} className="animate-pulse" /> Recording...
        </div>
      )}

      {/* MELSA SYNTHESIS MODAL */}
      {showMelsaOverlay && (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-[#050505]/80 backdrop-blur-xl animate-fade-in">
            <div className="w-full max-w-2xl bg-white dark:bg-[#0d0d0e] border border-orange-500/20 rounded-[40px] overflow-hidden shadow-[0_0_120px_rgba(234,88,12,0.15)] animate-slide-up ring-1 ring-white/5">
                <div className="p-6 md:p-10 space-y-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-orange-600/10 text-orange-600 rounded-2xl border border-orange-600/20 flex items-center justify-center">
                                <Sparkles size={24} className={isMelsaProcessing ? 'animate-spin-slow' : 'animate-pulse'} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-[0.3em] text-black dark:text-white">MELSA_SYNTHESIS</h3>
                                <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mt-1 italic">AI Cognitive Rewrite Engine</p>
                            </div>
                        </div>
                        <button onClick={() => setShowMelsaOverlay(false)} className="p-3 text-neutral-500 hover:text-red-500 hover:bg-red-500/5 rounded-2xl transition-all">
                            <X size={20}/>
                        </button>
                    </div>

                    {!melsaResult ? (
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest px-2">Perintah untuk Melsa, Tuan?</p>
                                <textarea 
                                    value={melsaInstruction}
                                    onChange={(e) => setMelsaInstruction(e.target.value)}
                                    autoFocus
                                    placeholder="Contoh: 'Rapikan teks ini', 'Buat rangkuman', atau 'Ubah jadi nada yang lebih profesional'..."
                                    className="w-full bg-zinc-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/10 p-6 rounded-3xl text-sm font-medium text-black dark:text-white focus:border-orange-500/40 h-40 resize-none outline-none transition-all shadow-inner placeholder:italic placeholder:opacity-50"
                                />
                                <div className="flex gap-2 flex-wrap pt-2">
                                    {[
                                        { l: 'RINGKAS (CONCISE)', p: 'Tulis ulang konten ini menjadi jauh lebih ringkas, padat, dan langsung pada intinya. Hilangkan repetisi.' },
                                        { l: 'PROFESIONAL', p: 'Ubah nada bahasa menjadi lebih formal, profesional, elegan, dan korporat.' },
                                        { l: 'POIN-POIN', p: 'Ubah struktur konten ini menjadi daftar poin-poin (bullet points) agar mudah dibaca sekilas.' },
                                        { l: 'FIX GRAMMAR', p: 'Perbaiki tata bahasa, ejaan, dan tanda baca sesuai standar baku tanpa mengubah makna.' }
                                    ].map((action) => (
                                        <button 
                                            key={action.l}
                                            onClick={() => setMelsaInstruction(action.p)}
                                            className="px-3 py-1.5 rounded-lg border border-orange-500/20 bg-orange-500/5 text-orange-600 hover:bg-orange-500 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest flex items-center gap-1 group"
                                        >
                                            <Wand2 size={10} className="opacity-50 group-hover:opacity-100" /> {action.l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-2 text-[9px] font-black text-orange-500 tracking-widest uppercase">
                                    <CheckCircle size={14}/> SYNTHESIS_COMPLETE
                                </div>
                            </div>
                            <div className="bg-zinc-50 dark:bg-black/40 p-8 rounded-[32px] border border-black/5 dark:border-white/5 max-h-[350px] overflow-y-auto custom-scroll text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed italic shadow-inner">
                                {melsaResult}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-4">
                        {!melsaResult ? (
                            <button 
                                onClick={handleMelsaProcess} 
                                disabled={!melsaInstruction.trim() || isMelsaProcessing} 
                                className="flex-1 py-6 bg-orange-600 text-white rounded-[24px] font-black uppercase text-[11px] tracking-[0.4em] flex items-center justify-center gap-3 shadow-2xl hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all group"
                            >
                                {isMelsaProcessing ? <RefreshCw className="animate-spin" size={18} /> : <Flame size={18} className="group-hover:scale-125 transition-transform" />} 
                                {isMelsaProcessing ? "PROCESSING..." : "ACTIVATE_MELSA"}
                            </button>
                        ) : (
                            <>
                                <button onClick={() => setMelsaResult(null)} className="px-8 py-6 bg-zinc-100 dark:bg-white/5 text-neutral-400 hover:text-black dark:hover:text-white rounded-[24px] font-black uppercase text-[10px] tracking-widest transition-all">
                                    RETRY
                                </button>
                                <button onClick={applyMelsaResult} className="flex-1 py-6 bg-emerald-600 text-white rounded-[24px] font-black uppercase text-[11px] tracking-[0.4em] flex items-center justify-center gap-3 shadow-2xl hover:scale-[1.02] active:scale-95 transition-all">
                                    <CheckCircle size={18} /> APPLY
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* RESPONSIVE TOOLBAR */}
      <div className={`flex flex-wrap items-center justify-between gap-3 p-3 mb-6 bg-white/80 dark:bg-white/[0.03] backdrop-blur-2xl rounded-[28px] border border-black/5 dark:border-white/10 sticky top-0 z-30 transition-all ${isFocusMode ? 'shadow-2xl' : 'shadow-sm'}`}>
        
        {/* Formatting Group */}
        <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-2xl">
          <ToolbarButton onClick={() => executeCommand('bold')} icon={<Bold size={16} />} title="Bold" />
          <ToolbarButton onClick={() => executeCommand('italic')} icon={<Italic size={16} />} title="Italic" />
          <ToolbarButton onClick={() => executeCommand('underline')} icon={<Underline size={16} />} title="Underline" />
        </div>

        {/* Neural Actions Group (Melsa + Voice) - High Priority */}
        <div className="flex items-center gap-2 flex-1 justify-center sm:justify-start min-w-fit">
            <button 
                onClick={() => setShowMelsaOverlay(true)} 
                className="flex-1 sm:flex-none px-4 py-3 bg-orange-600/10 text-orange-600 hover:bg-orange-600/20 rounded-xl transition-all group flex items-center justify-center gap-2 border border-orange-500/20 min-w-[100px]" 
                title="Melsa AI Writer"
            >
                <Sparkles size={16} className="group-hover:rotate-12 transition-transform" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em]">MELSA</span>
            </button>
            
            <button 
                onClick={toggleDictation} 
                className={`flex-1 sm:flex-none px-4 py-3 rounded-xl transition-all flex items-center justify-center gap-2 border min-w-[100px] ${isDictating ? 'bg-red-500 text-white animate-pulse border-red-400' : 'bg-black/5 dark:bg-white/5 text-neutral-500 border-transparent hover:bg-black/10'}`}
                title="Voice Dictation"
            >
                {isDictating ? <Mic size={16} /> : <MicOff size={16} />}
                <span className="text-[9px] font-black uppercase tracking-[0.2em]">{isDictating ? 'ON_AIR' : 'DIKTE'}</span>
            </button>
        </div>

        {/* View Controls & Sync Status */}
        <div className="flex items-center gap-2">
          {syncStatus === 'SYNCING' && <RefreshCw size={14} className="animate-spin text-neutral-400 mr-2" />}
          {syncStatus === 'SAVED' && <CheckCircle size={14} className="text-green-500 mr-2" />}
          
          <div className="hidden md:flex bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-black/5 dark:border-white/5">
            {[14, 18, 24].map(size => (
               <button 
                 key={size}
                 onClick={() => onFontSizeChange(size)}
                 className={`w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-black transition-all ${fontSize === size ? 'bg-white dark:bg-white/10 text-accent shadow-sm' : 'text-neutral-500 hover:text-white'}`}
               >
                 {size}
               </button>
            ))}
          </div>

          <button onClick={() => setIsFocusMode(!isFocusMode)} className="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-accent hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-black/5">
            {isFocusMode ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>

      <div 
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className={`flex-1 outline-none text-black dark:text-neutral-200 selection:bg-accent/20 custom-scroll overflow-y-auto pb-60 px-2 md:px-4 transition-all ${isFocusMode ? 'max-w-4xl mx-auto w-full text-center md:text-left pt-10' : ''}`}
        style={{ fontSize: `${fontSize}px`, fontFamily: fontFamily, lineHeight: '1.9' }}
        data-placeholder="Mulai menulis, Tuan..."
      />
      
      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #666;
          cursor: text;
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
};

const ToolbarButton: React.FC<{ onClick: () => void, icon: React.ReactNode, title?: string }> = ({ onClick, icon, title }) => (
  <button onClick={onClick} className="w-9 h-9 flex items-center justify-center text-neutral-500 hover:text-accent hover:bg-white dark:hover:bg-white/10 rounded-xl transition-all active:scale-95" title={title}>
    {icon}
  </button>
);
