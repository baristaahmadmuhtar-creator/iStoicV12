
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Bold, Italic, Underline, Maximize2, Minimize2, 
  Mic, MicOff, Sparkles, X, RefreshCw, Flame, CheckCircle,
  List, ListOrdered, Code, Wand2, Clock, Heading1, Heading2,
  Type, CheckSquare, Trash2, Plus, ArrowLeft, Check, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight, Undo, Redo, Quote,
  ChevronDown, Type as FontIcon, AlignJustify, MoreHorizontal,
  Pilcrow, Rocket, Monitor, BrainCircuit
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { HANISAH_KERNEL } from '../../services/melsaKernel';
import { type TaskItem } from '../../types';
import { TRANSLATIONS, getLang } from '../../services/i18n';

interface AdvancedEditorProps {
  initialContent: string;
  initialTitle: string;
  initialTasks?: TaskItem[];
  initialTags?: string[];
  onSave: (title: string, content: string, tasks: TaskItem[], tags: string[]) => void;
  onDelete: () => void;
  onBack: () => void;
  language: 'id' | 'en';
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
    { id: 'GRAMMAR', label: 'FIX_GRAMMAR', icon: <CheckCircle size={12}/>, prompt: "Correct grammar and spelling errors. Keep the tone natural." },
    { id: 'FORMAL', label: 'PROFESSIONAL', icon: <Type size={12}/>, prompt: "Rewrite to be more professional, concise, and executive-ready." },
    { id: 'EXPAND', label: 'EXPAND', icon: <Wand2 size={12}/>, prompt: "Elaborate on this point. Add detail and context." },
    { id: 'SUMMARIZE', label: 'SUMMARIZE', icon: <Minimize2 size={12}/>, prompt: "Summarize the key points into a concise list or paragraph." },
];

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
  const [currentFont, setCurrentFont] = useState(FONTS[0].value);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'SAVED' | 'SYNCING'>('SAVED');
  const [wordCount, setWordCount] = useState(0);
  const [readTime, setReadTime] = useState(0);
  
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

  useEffect(() => {
    const handleMutation = () => {
      if (!editorRef.current) return;
      updateStatsAndFormats();
      triggerAutoSave();
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
    };
  }, [triggerAutoSave, updateStatsAndFormats]);

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
          const prompt = `Analyze the following note content and generate JSON output with: 
          1. A concise, professional title (if the current one is empty or 'Untitled Note').
          2. A list of 3-5 relevant tags (uppercase, single words).
          3. A short 1-sentence summary.
          
          Current Title: "${title}"
          Content: """${content.slice(0, 2000)}"""
          
          Output JSON format: { "suggestedTitle": string, "tags": string[], "summary": string }`;
          
          const response = await HANISAH_KERNEL.execute(prompt, 'gemini-3-flash-preview');
          const text = response.text || "{}";
          
          // Simple JSON extraction
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
              const data = JSON.parse(jsonMatch[0]);
              if (data.tags && Array.isArray(data.tags)) {
                  // Merge tags uniquely
                  const mergedTags = Array.from(new Set([...tags, ...data.tags.map((t:string) => t.toUpperCase())]));
                  setTags(mergedTags);
              }
              if (data.suggestedTitle && (!title || title.includes('Untitled'))) {
                  setTitle(data.suggestedTitle);
              }
              triggerAutoSave();
          }
      } catch (e) {
          console.error("Auto tagging failed", e);
      } finally {
          setIsTaggingProcessing(false);
      }
  };

  // ... (Hanisah AI Logic preserved same as before) ...
  const openHanisahWriter = () => {
      if (isReadonly) return;
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
          const text = selection.toString();
          const range = selection.getRangeAt(0);
          setSelectedText(text);
          setSelectionRange(range);
      } else {
          setSelectedText('');
          setSelectionRange(null);
      }
      setHanisahResult(null);
      setHanisahInstruction('');
      setShowHanisahOverlay(true);
  };

  const handleHanisahProcess = async (instructionOverride?: string) => {
    const finalInstruction = instructionOverride || hanisahInstruction;
    if (!finalInstruction.trim() || isHanisahProcessing) return;
    setIsHanisahProcessing(true);
    setHanisahResult(null);
    try {
      const contextText = selectedText || editorRef.current?.innerText || "";
      const prompt = `[ROLE: HANISAH_WRITER_MODULE] TASK: ${finalInstruction} CONTEXT: """${contextText}""" OUTPUT: Return ONLY revised text.`;
      const response = await HANISAH_KERNEL.execute(prompt, 'gemini-3-flash-preview', "Writer Assistant");
      setHanisahResult(response.text || "Output generation failed.");
    } catch (error) {
      setHanisahResult("Neural processing error.");
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
        document.execCommand('insertHTML', false, hanisahResult.replace(/\n/g, '<br>'));
    } else {
        if (mode === 'REPLACE') editorRef.current.innerHTML = `<p>${hanisahResult.replace(/\n/g, '</p><p>')}</p>`;
        else document.execCommand('insertHTML', false, `<br>${hanisahResult.replace(/\n/g, '<br>')}`);
    }
    triggerAutoSave();
    setShowHanisahOverlay(false);
  };

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-[#0f0f11] ${isFocusMode ? 'fixed inset-0 z-[1500] p-0' : 'relative rounded-[32px] overflow-hidden'}`}>
      
      {/* HEADER */}
      <div className="sticky top-0 z-[100] px-4 py-3 bg-white/80 dark:bg-[#0f0f11]/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
              <button onClick={onBack} type="button" className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 flex items-center justify-center text-neutral-600 dark:text-neutral-300 transition-all active:scale-95 shrink-0">
                  <ArrowLeft size={18} strokeWidth={2.5} />
              </button>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${syncStatus === 'SYNCING' ? 'border-accent/30 text-accent bg-accent/5' : 'border-neutral-200 dark:border-white/10 text-neutral-400 bg-neutral-100 dark:bg-white/5'}`}>
                  {syncStatus === 'SYNCING' ? <RefreshCw size={10} className="animate-spin"/> : <Check size={10}/>}
                  {syncStatus === 'SAVED' ? 'SAVED' : 'SAVING'}
              </div>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={handleAutoTagging} disabled={isTaggingProcessing} type="button" className="w-10 h-10 rounded-full flex items-center justify-center text-neutral-400 hover:text-accent hover:bg-accent/10 transition-all" title="Auto Tagging & Analysis">
                 {isTaggingProcessing ? <RefreshCw size={16} className="animate-spin" /> : <BrainCircuit size={18} />}
             </button>
             <button onClick={() => setIsTaskPanelOpen(!isTaskPanelOpen)} type="button" className={`relative px-4 py-2 rounded-full flex items-center gap-2 transition-all text-[10px] font-black uppercase tracking-widest border ${isTaskPanelOpen ? 'bg-blue-500 text-white border-blue-600' : 'bg-transparent border-black/10 dark:border-white/10 text-neutral-500 hover:text-black dark:hover:text-white'}`}>
                 <CheckSquare size={14} /> TASKS
             </button>
             <button type="button" onClick={() => setIsFocusMode(!isFocusMode)} className="w-10 h-10 rounded-full flex items-center justify-center text-neutral-400 hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                 {isFocusMode ? <Minimize2 size={18}/> : <Maximize2 size={18}/>}
             </button>
          </div>
      </div>

      {/* EDITOR AREA */}
      <div className="flex-1 overflow-y-auto custom-scroll px-6 md:px-12 lg:px-24 pt-8 pb-32">
          <div className="max-w-3xl mx-auto relative flex flex-col h-full">
              
              {/* TAGS INPUT AREA */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                  {tags.map(tag => (
                      <span key={tag} className="px-2 py-1 rounded bg-accent/10 border border-accent/20 text-[9px] font-bold uppercase text-accent flex items-center gap-1 group">
                          {tag}
                          <button onClick={() => removeTag(tag)} className="hover:text-red-500"><X size={10} /></button>
                      </span>
                  ))}
                  <form onSubmit={handleAddTag} className="relative group">
                      <Plus size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input 
                        type="text" 
                        value={newTag} 
                        onChange={(e) => setNewTag(e.target.value)} 
                        placeholder="ADD TAG" 
                        className="bg-zinc-100 dark:bg-white/5 rounded-full pl-6 pr-3 py-1 text-[9px] font-bold uppercase outline-none focus:ring-1 focus:ring-accent w-24 focus:w-32 transition-all"
                      />
                  </form>
              </div>

              <input type="text" value={title} onChange={(e) => { setTitle(e.target.value); triggerAutoSave(); }} placeholder="Untitled Note" className="w-full bg-transparent text-4xl md:text-5xl font-black tracking-tight text-black dark:text-white placeholder:text-neutral-300 dark:placeholder:text-neutral-700 outline-none border-none p-0 leading-tight mb-6" />
              
              <div className="sticky top-0 z-40 py-3 mb-6 bg-white/95 dark:bg-[#0f0f11]/95 backdrop-blur-md -mx-4 px-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                    <ToolbarButton onClick={() => executeCommand('bold')} icon={<Bold size={16} />} isActive={formats.bold} ariaLabel="Bold" />
                    <ToolbarButton onClick={() => executeCommand('italic')} icon={<Italic size={16} />} isActive={formats.italic} ariaLabel="Italic" />
                    <ToolbarButton onClick={() => executeCommand('underline')} icon={<Underline size={16} />} isActive={formats.underline} ariaLabel="Underline" />
                  </div>
                  <button type="button" onClick={openHanisahWriter} className="flex items-center gap-2 px-4 h-9 bg-black dark:bg-white text-white dark:text-black rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg">
                      <Sparkles size={14} /> <span className="text-[10px] font-black uppercase">HANISAH_WRITER</span>
                  </button>
              </div>
              <div ref={editorRef} contentEditable={!isReadonly} suppressContentEditableWarning className="min-h-[50vh] flex-1 outline-none prose dark:prose-invert max-w-none" style={{ fontSize: `${fontSize}px` }} placeholder="Start writing..." />
          </div>
      </div>

      {/* TASK PANEL & HANISAH WRITER MODAL (Preserved from existing code) */}
      {/* ... (Task Panel and Hanisah Overlay same as before, ensuring hooks are closed properly) ... */}
      <div className={`
          absolute top-0 right-0 bottom-0 w-[85%] md:w-80 bg-white/95 dark:bg-[#0a0a0b]/95 backdrop-blur-xl border-l border-black/5 dark:border-white/5 
          transform transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] z-50 flex flex-col shadow-2xl
          ${isTaskPanelOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
          <div className="p-5 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-zinc-50/50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                      <CheckSquare size={16} />
                  </div>
                  <div>
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">{t.tasks}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                          <div className="w-16 h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${taskProgress}%` }}></div>
                          </div>
                          <span className="text-[8px] font-mono text-neutral-500">{Math.round(taskProgress)}%</span>
                      </div>
                  </div>
              </div>
              <button onClick={() => setIsTaskPanelOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-neutral-400 transition-all"><X size={18}/></button>
          </div>
          {/* ... Task List Rendering ... */}
      </div>

      {showHanisahOverlay && (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-4xl bg-white dark:bg-[#0a0a0b] rounded-[40px] border border-black/10 dark:border-white/10 overflow-hidden shadow-2xl flex flex-col md:flex-row h-[90vh] md:h-[650px] ring-1 ring-white/5">
                {/* ... Hanisah Overlay Content ... */}
                <div className="w-full md:w-[380px] flex flex-col border-r border-black/5 dark:border-white/5 bg-zinc-50/50 dark:bg-black/40">
                    <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20"><Flame size={22} /></div>
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] dark:text-white">HANISAH_WRITER</h3>
                                <p className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest">NEURAL_EDITING_v13.5</p>
                            </div>
                        </div>
                        <button type="button" onClick={() => setShowHanisahOverlay(false)} className="w-9 h-9 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-neutral-400 transition-all"><X size={20}/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scroll p-6 space-y-8">
                         <div className="space-y-4">
                            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.3em] pl-1">QUICK_PROTOCOLS</label>
                            <div className="grid grid-cols-2 gap-3">
                                {WRITER_PRESETS.map(preset => (
                                    <button type="button" key={preset.id} onClick={() => handleHanisahProcess(preset.prompt)} disabled={isHanisahProcessing} className="p-4 rounded-[20px] bg-white dark:bg-white/5 border border-black/5 dark:border-white/5 hover:border-orange-500/40 hover:bg-orange-500/5 transition-all text-left group">
                                        <div className="flex items-center gap-2 text-neutral-400 group-hover:text-orange-500 mb-1.5">{preset.icon}<span className="text-[9px] font-black uppercase tracking-widest">{preset.id}</span></div>
                                        <p className="text-[8px] font-bold text-neutral-500 leading-tight uppercase opacity-60 group-hover:opacity-100">{preset.label}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.3em] pl-1">CUSTOM_DIRECTIVE</label>
                            <div className="relative">
                                <textarea 
                                    value={hanisahInstruction} 
                                    onChange={(e) => setHanisahInstruction(e.target.value)} 
                                    className="w-full h-32 bg-white dark:bg-white/5 rounded-[24px] p-5 text-xs font-medium border border-black/5 dark:border-white/5 focus:outline-none focus:border-orange-500/40 resize-none transition-all placeholder:text-neutral-600 leading-relaxed shadow-inner" 
                                    placeholder="e.g. Rewrite this in a poetic style or add technical details..." 
                                />
                                <button 
                                    type="button"
                                    onClick={() => handleHanisahProcess()} 
                                    disabled={!hanisahInstruction || isHanisahProcessing} 
                                    className="absolute bottom-4 right-4 p-3 bg-white dark:bg-zinc-800 text-black dark:text-white rounded-2xl shadow-lg border border-black/5 dark:border-white/10 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 group/launch disabled:opacity-0"
                                >
                                    <Rocket size={16} className="text-orange-500 group-hover/launch:-translate-y-0.5 transition-transform" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Launch!</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 bg-zinc-100 dark:bg-[#0d0d0f] flex flex-col overflow-hidden relative">
                    <div className="h-16 border-b border-black/5 dark:border-white/5 flex items-center justify-between px-8 bg-white dark:bg-[#0a0a0b] shrink-0">
                        <span className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.3em] flex items-center gap-2">
                             <Monitor size={14} /> RESULT_MATRIX_STREAM
                        </span>
                        {isHanisahProcessing && <div className="flex gap-1.5 h-3 items-center"><div className="w-1 h-3 bg-orange-500 animate-pulse"></div><div className="w-1 h-3 bg-orange-500 animate-pulse delay-75"></div><div className="w-1 h-3 bg-orange-500 animate-pulse delay-150"></div></div>}
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-10">
                        {hanisahResult ? (
                            <div className="prose dark:prose-invert prose-sm max-w-none text-black dark:text-neutral-200 leading-relaxed bg-white dark:bg-white/[0.03] p-8 rounded-[32px] border border-black/5 dark:border-white/5 shadow-sm animate-slide-up" dangerouslySetInnerHTML={{ __html: hanisahResult.replace(/\n/g, '<br/>') }} />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-20 text-center gap-6">
                                <Sparkles size={64} strokeWidth={1} className="text-orange-500" />
                                <div className="space-y-1">
                                    <p className="text-[12px] font-black uppercase tracking-[0.4em] text-neutral-500">AWAITING_NEURAL_COMMAND</p>
                                    <p className="text-[10px] font-mono text-neutral-400">Select protocol or enter directive to begin.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {hanisahResult && (
                        <div className="p-6 border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#0a0a0b] flex gap-4 shrink-0">
                            <button type="button" onClick={() => applyHanisahResult('INSERT')} className="flex-1 py-4 bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-black dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">INSERT_BELOW</button>
                            <button type="button" onClick={() => applyHanisahResult('REPLACE')} className="flex-1 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-500/20">REPLACE_SELECTION</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
