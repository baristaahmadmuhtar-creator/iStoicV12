
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Bold, Italic, Underline, Maximize2, Minimize2, 
  Mic, MicOff, Sparkles, X, RefreshCw, Flame, CheckCircle,
  List, ListOrdered, Code, Wand2, Clock, Heading1, Heading2,
  Type, CheckSquare, Trash2, Plus, ArrowLeft, Check, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight, Undo, Redo, Quote,
  ChevronDown, Type as FontIcon, AlignJustify, MoreHorizontal,
  Pilcrow, Rocket, Monitor, BrainCircuit, GripHorizontal, Link, ListTodo,
  ChefHat, Copy
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { HANISAH_KERNEL } from '../../services/melsaKernel';
import { NOTE_AGENTS } from '../../services/noteAgentService';
import { type TaskItem } from '../../types';
import { TRANSLATIONS, getLang } from '../../services/i18n';
import { useVault } from '../../contexts/VaultContext';

interface AdvancedEditorProps {
  initialContent: string;
  initialTitle: string;
  initialTasks?: TaskItem[];
  initialTags?: string[];
  onSave: (title: string, content: string, tasks: TaskItem[], tags: string[]) => void;
  onDelete: () => void;
  onBack: () => void;
  language: string;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
}

const FONTS = [
    { label: 'Sans', value: 'Plus Jakarta Sans, sans-serif' },
    { label: 'Mono', value: 'JetBrains Mono, monospace' },
    { label: 'Serif', value: 'Playfair Display, serif' },
];

const ToolbarButton: React.FC<{ onClick: (e: React.MouseEvent) => void; icon: React.ReactNode; isActive?: boolean; ariaLabel: string; className?: string; label?: string }> = ({ onClick, icon, isActive, ariaLabel, className, label }) => (
    <button 
        onMouseDown={(e) => { e.preventDefault(); onClick(e); }} 
        className={`
            relative flex items-center justify-center gap-1.5 rounded-lg transition-all duration-200 shrink-0
            ${label ? 'px-3 w-auto' : 'w-8'} h-8
            ${isActive 
                ? 'bg-black dark:bg-white text-white dark:text-black shadow-md' 
                : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            } ${className}
        `}
        aria-label={ariaLabel}
        type="button"
        title={ariaLabel}
    >
        {icon}
        {label && <span className="text-[9px] font-black uppercase tracking-wider">{label}</span>}
    </button>
);

const WRITER_PRESETS = [
    { id: 'GRAMMAR', label: 'FIX_GRAMMAR', icon: <CheckCircle size={12}/>, prompt: "Fix grammar, spelling, and punctuation. Maintain original tone." },
    { id: 'PROFESSIONAL', label: 'POLISH', icon: <Type size={12}/>, prompt: "Rewrite to be more professional, concise, and executive-ready." },
    { id: 'EXPAND', label: 'EXPAND', icon: <Wand2 size={12}/>, prompt: "Elaborate on this point with more details, context, and examples." },
    { id: 'SUMMARIZE', label: 'SUMMARIZE', icon: <Minimize2 size={12}/>, prompt: "Summarize key points into a concise paragraph or list." },
    { id: 'STRUCTURE', label: 'RECIPE/GUIDE', icon: <ListOrdered size={12}/>, prompt: "Format as a structured step-by-step guide or recipe with ingredients/requirements." },
    { id: 'CASUAL', label: 'CASUAL', icon: <Sparkles size={12}/>, prompt: "Rewrite in a friendly, conversational, and engaging tone." }
];

const DictationOverlay: React.FC<{ onStop: () => void }> = ({ onStop }) => (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[3000] animate-slide-up">
        <div className="bg-black/90 dark:bg-white/90 backdrop-blur-xl text-white dark:text-black px-6 py-3 rounded-full shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] flex items-center gap-4 border border-white/10 ring-1 ring-black/5">
            <div className="flex items-center gap-1">
                <div className="w-1 h-3 bg-red-500 rounded-full animate-[music-bar_0.5s_ease-in-out_infinite]"></div>
                <div className="w-1 h-5 bg-red-500 rounded-full animate-[music-bar_0.5s_ease-in-out_infinite_0.1s]"></div>
                <div className="w-1 h-3 bg-red-500 rounded-full animate-[music-bar_0.5s_ease-in-out_infinite_0.2s]"></div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] min-w-[80px]">Listening...</span>
            <button onClick={onStop} className="w-8 h-8 flex items-center justify-center bg-white/20 dark:bg-black/10 rounded-full hover:bg-white/30 transition-colors">
                <X size={14} />
            </button>
        </div>
        <style>{`@keyframes music-bar { 0%, 100% { height: 8px; opacity: 0.5; } 50% { height: 20px; opacity: 1; } }`}</style>
    </div>
);

export const AdvancedEditor: React.FC<AdvancedEditorProps> = ({ 
    initialContent, 
    initialTitle,
    initialTasks = [],
    initialTags = [],
    onSave,
    onDelete, 
    onBack,
    language, 
    fontSize, 
    onFontSizeChange 
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const currentLang = getLang();
  const t = TRANSLATIONS[currentLang].editor;
  
  const [title, setTitle] = useState(initialTitle);
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [newTag, setNewTag] = useState('');
  
  const [isReadonly, setIsReadonly] = useState(false);
  const [isTaskPanelOpen, setIsTaskPanelOpen] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'SAVED' | 'SYNCING'>('SAVED');
  const [wordCount, setWordCount] = useState(0);
  const [readTime, setReadTime] = useState(0);
  
  const [relatedNotes, setRelatedNotes] = useState<any[]>([]);
  const { isVaultUnlocked } = useVault();
  
  const [formats, setFormats] = useState({
      bold: false, italic: false, underline: false, strikethrough: false,
      ul: false, ol: false, justifyLeft: false, justifyCenter: false,
      justifyRight: false, code: false, h1: false, h2: false, quote: false
  });
  
  const [showHanisahOverlay, setShowHanisahOverlay] = useState(false);
  const [hanisahInstruction, setHanisahInstruction] = useState('');
  const [isHanisahProcessing, setIsHanisahProcessing] = useState(false);
  const [isTaggingProcessing, setIsTaggingProcessing] = useState(false);
  const [hanisahResult, setHanisahResult] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<Range | null>(null);

  const recognitionRef = useRef<any>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const memoryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const completedTasksCount = tasks.filter(t => t.isCompleted).length;
  const taskProgress = tasks.length > 0 ? (completedTasksCount / tasks.length) * 100 : 0;

  const updateStatsAndFormats = useCallback(() => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || "";
    const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
    setWordCount(words);
    setReadTime(Math.ceil(words / 200)); 

    if (!isReadonly) {
        const formatBlock = document.queryCommandValue('formatBlock');
        setFormats({
            bold: document.queryCommandState('bold'),
            italic: document.queryCommandState('italic'),
            underline: document.queryCommandState('underline'),
            strikethrough: document.queryCommandState('strikethrough'),
            ul: document.queryCommandState('insertUnorderedList'),
            ol: document.queryCommandState('insertOrderedList'),
            justifyLeft: document.queryCommandState('justifyLeft'),
            justifyCenter: document.queryCommandState('justifyCenter'),
            justifyRight: document.queryCommandState('justifyRight'),
            code: formatBlock === 'pre',
            h1: typeof formatBlock === 'string' && formatBlock.toLowerCase() === 'h1',
            h2: typeof formatBlock === 'string' && formatBlock.toLowerCase() === 'h2',
            quote: formatBlock === 'blockquote'
        });
    }
  }, [isReadonly]);

  useEffect(() => {
    if (editorRef.current) {
        if (editorRef.current.innerHTML !== initialContent) {
            editorRef.current.innerHTML = initialContent || '<div><br></div>';
        }
        setTitle(initialTitle);
        setTasks(initialTasks);
        setTags(initialTags);
        updateStatsAndFormats();
    }
  }, [initialContent, initialTitle, initialTasks, initialTags, updateStatsAndFormats]);

  const performSave = useCallback((currentTitle: string, currentContent: string, currentTasks: TaskItem[], currentTags: string[]) => {
    onSave(currentTitle, currentContent, currentTasks, currentTags);
    setSyncStatus('SAVED');
  }, [onSave]);

  const triggerAutoSave = useCallback(() => {
      setSyncStatus('SYNCING');
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      const contentToSave = editorRef.current?.innerHTML || '';
      saveTimeoutRef.current = setTimeout(() => {
          performSave(title, contentToSave, tasks, tags);
      }, 800);
  }, [title, tasks, tags, performSave]);

  const triggerMemoryRecall = useCallback(() => {
      if (!isVaultUnlocked) return;
      if (memoryTimeoutRef.current) clearTimeout(memoryTimeoutRef.current);
      memoryTimeoutRef.current = setTimeout(async () => {
          const content = editorRef.current?.innerText || "";
          if (content.length < 50) return;
          const allNotesJson = localStorage.getItem('notes');
          const allNotes = allNotesJson ? JSON.parse(allNotesJson) : [];
          if (allNotes.length === 0) return;
          const ids = await NOTE_AGENTS.runMemoryRecall(content, allNotes);
          if (ids.length > 0) {
              const related = allNotes.filter((n:any) => ids.includes(n.id));
              setRelatedNotes(related);
          }
      }, 3000);
  }, [isVaultUnlocked]);

  useEffect(() => {
    const handleMutation = () => {
      if (!editorRef.current) return;
      updateStatsAndFormats();
      triggerAutoSave();
      triggerMemoryRecall();
    };
    const el = editorRef.current;
    if (el) {
        el.addEventListener('input', handleMutation);
        el.addEventListener('keyup', updateStatsAndFormats);
        el.addEventListener('mouseup', updateStatsAndFormats);
    }
    return () => {
      if (el) {
          el.removeEventListener('input', handleMutation);
          el.removeEventListener('keyup', updateStatsAndFormats);
          el.removeEventListener('mouseup', updateStatsAndFormats);
      }
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (memoryTimeoutRef.current) clearTimeout(memoryTimeoutRef.current);
    };
  }, [triggerAutoSave, updateStatsAndFormats, triggerMemoryRecall]);

  const executeCommand = (command: string, value: string | undefined = undefined) => {
    if (isReadonly) return;
    document.execCommand(command, false, value);
    if (editorRef.current) editorRef.current.focus();
    updateStatsAndFormats(); 
  };

  const handleAddTag = (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!newTag.trim()) return;
      const cleanTag = newTag.trim().toUpperCase();
      if (!tags.includes(cleanTag)) {
          const updatedTags = [...tags, cleanTag];
          setTags(updatedTags);
          triggerAutoSave();
      }
      setNewTag('');
  };

  const removeTag = (tagToRemove: string) => {
      const updatedTags = tags.filter(t => t !== tagToRemove);
      setTags(updatedTags);
      triggerAutoSave();
  };

  const handleAutoTagging = async () => {
      if (isTaggingProcessing || !editorRef.current) return;
      setIsTaggingProcessing(true);
      try {
          const content = editorRef.current.innerText;
          const prompt = `Analyze content. Output JSON: { "suggestedTitle": string, "tags": string[] }`;
          const response = await HANISAH_KERNEL.execute(prompt, 'gemini-3-flash-preview');
          const text = response.text || "{}";
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
              const data = JSON.parse(jsonMatch[0]);
              if (data.tags) setTags(Array.from(new Set([...tags, ...data.tags.map((t:string) => t.toUpperCase())])));
              if (data.suggestedTitle && (!title || title.includes('Untitled'))) setTitle(data.suggestedTitle);
              triggerAutoSave();
          }
      } catch (e) {
          console.error(e);
      } finally {
          setIsTaggingProcessing(false);
      }
  };

  const openHanisahWriter = () => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
          setSelectedText(selection.toString());
          setSelectionRange(selection.getRangeAt(0));
      } else {
          setSelectedText('');
          setSelectionRange(null);
      }
      setHanisahResult(null);
      setShowHanisahOverlay(true);
  };

  const handleHanisahProcess = async (instructionOverride?: string) => {
    const finalInstruction = instructionOverride || hanisahInstruction;
    if (!finalInstruction.trim() || isHanisahProcessing) return;
    
    setIsHanisahProcessing(true);
    setHanisahResult(null);
    
    try {
      // Logic: If text is selected, we EDIT. If no text selected, we GENERATE based on instruction.
      const isEditing = !!selectedText;
      const contextText = selectedText || editorRef.current?.innerText || "";
      
      let prompt;
      if (isEditing) {
          prompt = `[ROLE: HANISAH_EDITOR] TASK: ${finalInstruction}. CONTEXT: """${contextText}""". OUTPUT: Return ONLY the revised text. Keep format (Markdown/HTML).`;
      } else {
          // Generative Mode (e.g. "Buatkan resep kopi susu")
          prompt = `[ROLE: HANISAH_WRITER] TASK: Generate content based on this instruction: "${finalInstruction}". 
          CONTEXT: User is writing a note titled "${title}". 
          FORMAT: Use clean Markdown (Headings, Bullet points). 
          OUTPUT: Return ONLY the generated content.`;
      }

      const response = await HANISAH_KERNEL.execute(prompt, 'gemini-3-flash-preview', "Writer");
      setHanisahResult(response.text || "Failed.");
    } catch (error) { 
        setHanisahResult("Error generating content."); 
    } finally { 
        setIsHanisahProcessing(false); 
    }
  };

  const applyHanisahResult = (mode: 'REPLACE' | 'INSERT' = 'REPLACE') => {
    if (!hanisahResult || !editorRef.current) return;
    editorRef.current.focus();
    
    if (selectionRange && selectedText) {
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(selectionRange);
        if (mode === 'REPLACE') document.execCommand('insertHTML', false, hanisahResult.replace(/\n/g, '<br>'));
        else { selectionRange.collapse(false); document.execCommand('insertHTML', false, " " + hanisahResult.replace(/\n/g, '<br>')); }
    } else {
        // No selection - usually Append or Insert at cursor
        if (mode === 'REPLACE') { 
            // If replacing empty document or generic replace
            const formatted = hanisahResult.split('\n').filter(l => l.trim()).map(l => `<p>${l}</p>`).join(''); 
            if (editorRef.current.innerText.trim() === '') {
                editorRef.current.innerHTML = formatted; 
            } else {
                document.execCommand('insertHTML', false, `<br>${hanisahResult.replace(/\n/g, '<br>')}`);
            }
        }
        else document.execCommand('insertHTML', false, `<br>${hanisahResult.replace(/\n/g, '<br>')}`);
    }
    triggerAutoSave();
    setShowHanisahOverlay(false);
  };

  const toggleDictation = () => {
    if (isReadonly) return;
    if (isDictating) { recognitionRef.current?.stop(); setIsDictating(false); return; }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const r = new SpeechRecognition();
    r.lang = TRANSLATIONS[currentLang].meta.code;
    r.continuous = true; 
    r.interimResults = true; 
    r.onstart = () => setIsDictating(true);
    r.onend = () => setIsDictating(false);
    r.onresult = (e: any) => {
      const result = e.results[e.results.length - 1];
      if (result.isFinal && editorRef.current) {
          editorRef.current.focus();
          document.execCommand('insertText', false, result[0].transcript + ' ');
      }
    };
    recognitionRef.current = r;
    r.start();
  };

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-[#0f0f11] ${isFocusMode ? 'fixed inset-0 z-[1500] p-0' : 'relative rounded-[32px] overflow-hidden'}`}>
      
      {/* HEADER */}
      <div className="sticky top-0 z-[100] px-4 py-3 bg-white/80 dark:bg-[#0f0f11]/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
              <button onClick={onBack} type="button" className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 flex items-center justify-center text-neutral-600 dark:text-neutral-300 transition-all active:scale-95 shrink-0"><ArrowLeft size={18} strokeWidth={2.5} /></button>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${syncStatus === 'SYNCING' ? 'border-accent/30 text-accent bg-accent/5' : 'border-neutral-200 dark:border-white/10 text-neutral-400 bg-neutral-100 dark:bg-white/5'}`}>{syncStatus === 'SYNCING' ? <RefreshCw size={10} className="animate-spin"/> : <Check size={10}/>} {syncStatus === 'SAVED' ? 'SAVED' : 'SAVING'}</div>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={handleAutoTagging} disabled={isTaggingProcessing} type="button" className="w-10 h-10 rounded-full flex items-center justify-center text-neutral-400 hover:text-accent hover:bg-accent/10 transition-all" title="Auto Tagging & Analysis">{isTaggingProcessing ? <RefreshCw size={16} className="animate-spin" /> : <BrainCircuit size={18} />}</button>
             <button onClick={() => setIsTaskPanelOpen(!isTaskPanelOpen)} type="button" className={`relative px-4 py-2 rounded-full flex items-center gap-2 transition-all text-[10px] font-black uppercase tracking-widest border ${isTaskPanelOpen ? 'bg-blue-500 text-white border-blue-600' : 'bg-transparent border-black/10 dark:border-white/10 text-neutral-500 hover:text-black dark:hover:text-white'}`}><CheckSquare size={14} /> TASKS</button>
             <button type="button" onClick={() => setIsFocusMode(!isFocusMode)} className="w-10 h-10 rounded-full flex items-center justify-center text-neutral-400 hover:bg-black/5 dark:hover:bg-white/5 transition-all">{isFocusMode ? <Minimize2 size={18}/> : <Maximize2 size={18}/>}</button>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll px-6 md:px-12 lg:px-24 pt-8 pb-32 flex">
          <div className="flex-1 max-w-3xl mx-auto relative flex flex-col h-full">
              {/* TAGS */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                  {tags.map(tag => (
                      <span key={tag} className="px-2 py-1 rounded bg-accent/10 border border-accent/20 text-[9px] font-bold uppercase text-accent flex items-center gap-1 group">
                          {tag}
                          <button onClick={() => removeTag(tag)} className="hover:text-red-500"><X size={10} /></button>
                      </span>
                  ))}
                  <form onSubmit={handleAddTag} className="relative group">
                      <Plus size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input type="text" value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="ADD TAG" className="bg-zinc-100 dark:bg-white/5 rounded-full pl-6 pr-3 py-1 text-[9px] font-bold uppercase outline-none focus:ring-1 focus:ring-accent w-24 focus:w-32 transition-all" />
                  </form>
              </div>

              <input type="text" value={title} onChange={(e) => { setTitle(e.target.value); triggerAutoSave(); }} placeholder="Untitled Note" className="w-full bg-transparent text-4xl md:text-5xl font-black tracking-tight text-black dark:text-white placeholder:text-neutral-300 dark:placeholder:text-neutral-700 outline-none border-none p-0 leading-tight mb-6" />
              
              <div className="sticky top-0 z-40 py-3 mb-6 bg-white/95 dark:bg-[#0f0f11]/95 backdrop-blur-md -mx-4 px-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                    <ToolbarButton onClick={() => executeCommand('bold')} icon={<Bold size={16} />} isActive={formats.bold} ariaLabel="Bold" />
                    <ToolbarButton onClick={() => executeCommand('italic')} icon={<Italic size={16} />} isActive={formats.italic} ariaLabel="Italic" />
                    <ToolbarButton onClick={() => executeCommand('underline')} icon={<Underline size={16} />} isActive={formats.underline} ariaLabel="Underline" />
                  </div>
                  <button type="button" onClick={openHanisahWriter} className="flex items-center gap-2 px-4 h-9 bg-black dark:bg-white text-white dark:text-black rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg"><Sparkles size={14} /> <span className="text-[10px] font-black uppercase">HANISAH_WRITER</span></button>
              </div>
              <div ref={editorRef} contentEditable={!isReadonly} suppressContentEditableWarning className="min-h-[50vh] flex-1 outline-none prose dark:prose-invert max-w-none" style={{ fontSize: `${fontSize}px` }} data-placeholder="Start writing..." />
          </div>

          {/* MEMORY RECALL SIDEBAR (Desktop) */}
          {!isFocusMode && relatedNotes.length > 0 && (
              <div className="hidden xl:block w-64 ml-8 animate-fade-in">
                  <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-4 flex items-center gap-2">
                      <BrainCircuit size={14} className="text-accent"/> RELATED_MEMORY
                  </h4>
                  <div className="space-y-3">
                      {relatedNotes.map(n => (
                          <div key={n.id} className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-accent/30 transition-all cursor-pointer group">
                              <div className="text-[10px] font-bold text-white mb-1 group-hover:text-accent truncate">{n.title}</div>
                              <p className="text-[9px] text-neutral-500 line-clamp-2">{n.content.slice(0, 50)}</p>
                          </div>
                      ))}
                  </div>
              </div>
          )}
      </div>

      {/* TASK PANEL (Enhanced Sheet Design) */}
      <div className={`
          fixed md:absolute 
          md:top-4 md:right-4 md:bottom-4 md:w-96 
          inset-x-0 bottom-0 top-auto h-[85vh] md:h-auto
          bg-zinc-50/95 dark:bg-[#09090b]/95 backdrop-blur-2xl 
          md:border border-t md:border-t-0 border-black/5 dark:border-white/5 
          md:rounded-3xl rounded-t-[32px]
          transform transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] 
          z-[100] flex flex-col shadow-2xl
          ${isTaskPanelOpen ? 'translate-y-0' : 'translate-y-full md:translate-x-[110%] md:translate-y-0'}
      `}>
          {/* Header */}
          <div className="p-6 pb-4 shrink-0 flex flex-col gap-4 relative">
              <div className="w-12 h-1.5 bg-black/10 dark:bg-white/10 rounded-full mx-auto md:hidden mb-2"></div>
              
              <div className="flex items-start justify-between">
                  <div>
                      <div className="flex items-center gap-3 mb-1">
                          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                              <CheckSquare size={18} />
                          </div>
                          <div>
                              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-black dark:text-white">TASK_MATRIX</h3>
                              <p className="text-[9px] tech-mono text-neutral-500 font-bold uppercase tracking-wider">
                                  {tasks.filter(t => !t.isCompleted).length} PENDING // {tasks.filter(t => t.isCompleted).length} DONE
                              </p>
                          </div>
                      </div>
                  </div>
                  <button 
                    onClick={() => setIsTaskPanelOpen(false)} 
                    className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-neutral-400 transition-all active:scale-95"
                  >
                      <X size={20} />
                  </button>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-700 ease-out" 
                    style={{ width: `${taskProgress}%` }}
                  ></div>
              </div>
          </div>
          
          {/* Task List */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 pt-0 space-y-3 custom-scroll">
              {tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center opacity-40 gap-4">
                      <ListTodo size={48} strokeWidth={1} />
                      <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.3em]">NO_ACTIVE_TASKS</p>
                          <p className="text-[9px] font-mono mt-1">System awaiting input directives.</p>
                      </div>
                  </div>
              ) : (
                  tasks.map(task => (
                      <div 
                        key={task.id} 
                        className={`
                            group flex items-start gap-4 p-4 rounded-2xl border transition-all duration-300
                            ${task.isCompleted 
                                ? 'bg-zinc-100/50 dark:bg-white/[0.02] border-transparent opacity-60' 
                                : 'bg-white dark:bg-white/5 border-black/5 dark:border-white/5 hover:border-blue-500/30 shadow-sm'
                            }
                        `}
                      >
                          <button 
                            onClick={() => !isReadonly && setTasks(prev => prev.map(t => t.id === task.id ? { ...t, isCompleted: !t.isCompleted } : t))}
                            className={`
                                mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0
                                ${task.isCompleted 
                                    ? 'bg-blue-500 border-blue-500 text-white scale-90' 
                                    : 'border-neutral-300 dark:border-white/20 hover:border-blue-500'
                                }
                            `}
                          >
                              {task.isCompleted && <Check size={14} strokeWidth={3} />}
                          </button>
                          
                          <span className={`text-sm font-medium leading-relaxed flex-1 break-words transition-colors ${task.isCompleted ? 'text-neutral-400 line-through decoration-neutral-300 dark:decoration-neutral-700' : 'text-black dark:text-white'}`}>
                              {task.text}
                          </span>
                          
                          {!isReadonly && (
                              <button 
                                onClick={() => setTasks(prev => prev.filter(t => t.id !== task.id))} 
                                className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                                title="Delete Task"
                              >
                                  <Trash2 size={16} />
                              </button>
                          )}
                      </div>
                  ))
              )}
          </div>

          {/* Input Area */}
          {!isReadonly && (
              <div className="p-4 md:p-6 pt-2 pb-safe bg-gradient-to-t from-white dark:from-[#09090b] via-white/90 dark:via-[#09090b]/90 to-transparent">
                  <form 
                    onSubmit={(e) => {
                        e.preventDefault();
                        const input = (e.target as any).taskInput;
                        const text = input.value.trim();
                        if (text) {
                            setTasks(prev => [...prev, { id: uuidv4(), text, isCompleted: false }]);
                            input.value = '';
                        }
                    }}
                    className="flex gap-2"
                  >
                      <input 
                        name="taskInput"
                        placeholder="Add new directive..."
                        className="flex-1 bg-white dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-blue-500 transition-all shadow-sm"
                        autoComplete="off"
                      />
                      <button type="submit" className="w-12 h-12 flex items-center justify-center bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-xl">
                          <Plus size={20} strokeWidth={2.5} />
                      </button>
                  </form>
              </div>
          )}
      </div>

      {isDictating && <DictationOverlay onStop={() => { recognitionRef.current?.stop(); setIsDictating(false); }} />}

      {showHanisahOverlay && (
        <div className="fixed inset-0 z-[2500] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="w-full md:max-w-4xl bg-white dark:bg-[#0a0a0b] rounded-t-[32px] md:rounded-[40px] border border-black/10 dark:border-white/10 overflow-hidden shadow-2xl flex flex-col md:flex-row h-[90vh] md:h-[650px] ring-1 ring-white/5 transition-transform duration-500 ease-out translate-y-0 animate-slide-up">
                
                {/* LEFT: COMMAND CENTER */}
                <div className="w-full md:w-[380px] flex flex-col border-b md:border-b-0 md:border-r border-black/5 dark:border-white/5 bg-zinc-50/50 dark:bg-black/40 h-[45%] md:h-full">
                    <div className="p-5 md:p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20"><Flame size={22} /></div>
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] dark:text-white">HANISAH_WRITER</h3>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${selectedText ? 'bg-orange-500' : 'bg-blue-500'} animate-pulse`}></div>
                                    <p className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest">
                                        {selectedText ? 'EDITING_MODE' : 'GENERATION_MODE'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <button type="button" onClick={() => setShowHanisahOverlay(false)} className="w-9 h-9 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-neutral-400 transition-all"><X size={20}/></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scroll p-5 md:p-6 space-y-6">
                         <div className="space-y-3">
                            <label className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.3em] pl-1">QUICK_PROTOCOLS</label>
                            <div className="grid grid-cols-2 gap-2">
                                {WRITER_PRESETS.map(preset => (
                                    <button type="button" key={preset.id} onClick={() => handleHanisahProcess(preset.prompt)} disabled={isHanisahProcessing} className="p-3 rounded-[16px] bg-white dark:bg-white/5 border border-black/5 dark:border-white/5 hover:border-orange-500/40 hover:bg-orange-500/5 transition-all text-left group">
                                        <div className="flex items-center gap-2 text-neutral-400 group-hover:text-orange-500 mb-1.5">{preset.icon}<span className="text-[8px] font-black uppercase tracking-widest">{preset.label}</span></div>
                                        <p className="text-[8px] font-bold text-neutral-500 leading-tight uppercase opacity-60 group-hover:opacity-100 hidden md:block">{preset.label}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div className="space-y-3 flex-1 flex flex-col">
                            <label className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.3em] pl-1">CUSTOM_DIRECTIVE</label>
                            <div className="relative flex-1">
                                <textarea 
                                    value={hanisahInstruction} 
                                    onChange={(e) => setHanisahInstruction(e.target.value)} 
                                    className="w-full h-full min-h-[100px] bg-white dark:bg-white/5 rounded-[24px] p-5 text-xs font-medium border border-black/5 dark:border-white/5 focus:outline-none focus:border-orange-500/40 resize-none transition-all placeholder:text-neutral-600 leading-relaxed shadow-inner" 
                                    placeholder={selectedText ? "E.g. Rewrite this to be more professional..." : "E.g. Buatkan resep Kopi Susu Gula Aren..."} 
                                />
                                <button type="button" onClick={() => handleHanisahProcess()} disabled={!hanisahInstruction || isHanisahProcessing} className="absolute bottom-3 right-3 p-3 bg-white dark:bg-zinc-800 text-black dark:text-white rounded-2xl shadow-lg border border-black/5 dark:border-white/10 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 group/launch disabled:opacity-0">
                                    <Rocket size={16} className="text-orange-500 group-hover/launch:-translate-y-0.5 transition-transform" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT: RESULT MATRIX */}
                <div className="flex-1 bg-zinc-100 dark:bg-[#0d0d0f] flex flex-col overflow-hidden relative h-[55%] md:h-full">
                    <div className="md:hidden flex justify-center pt-2 pb-1 opacity-20"><GripHorizontal size={20}/></div>
                    <div className="h-12 border-b border-black/5 dark:border-white/5 flex items-center justify-between px-6 bg-white dark:bg-[#0a0a0b] shrink-0">
                        <span className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.3em] flex items-center gap-2"><Monitor size={14} /> RESULT_MATRIX</span>
                        {isHanisahProcessing && <div className="flex gap-1.5 h-3 items-center"><div className="w-1 h-3 bg-orange-500 animate-pulse"></div><div className="w-1 h-3 bg-orange-500 animate-pulse delay-75"></div><div className="w-1 h-3 bg-orange-500 animate-pulse delay-150"></div></div>}
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-10">
                        {hanisahResult ? (
                            <div className="prose dark:prose-invert prose-sm max-w-none text-black dark:text-neutral-200 leading-relaxed bg-white dark:bg-white/[0.03] p-6 rounded-[24px] border border-black/5 dark:border-white/5 shadow-sm animate-slide-up" dangerouslySetInnerHTML={{ __html: hanisahResult.replace(/\n/g, '<br/>') }} /> 
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-20 text-center gap-4">
                                {isHanisahProcessing ? (
                                    <>
                                        <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"></div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500 animate-pulse">SYNTHESIZING_NEURAL_DATA</p>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={48} strokeWidth={1} className="text-orange-500" />
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500">READY_TO_SYNTHESIZE</p>
                                            <p className="text-[8px] font-mono text-neutral-600">Select text to edit or type to generate.</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    
                    {hanisahResult && (
                        <div className="p-4 border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#0a0a0b] flex gap-2 md:gap-3 shrink-0 pb-safe">
                            <button 
                                type="button" 
                                onClick={() => { navigator.clipboard.writeText(hanisahResult); alert("Copied!"); }} 
                                className="w-12 flex items-center justify-center bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-black dark:text-white rounded-xl transition-all border border-black/5 dark:border-white/5"
                                title="Copy to Clipboard"
                            >
                                <Copy size={16} />
                            </button>
                            <button 
                                type="button" 
                                onClick={() => applyHanisahResult('INSERT')} 
                                className="flex-1 py-3 bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-black dark:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                            >
                                INSERT
                            </button>
                            <button 
                                type="button" 
                                onClick={() => applyHanisahResult('REPLACE')} 
                                className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-500/20"
                            >
                                REPLACE
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
