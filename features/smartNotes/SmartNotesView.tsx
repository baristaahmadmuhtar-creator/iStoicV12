
import { AlertCircle, Archive, ArrowLeft, Bookmark, MousePointerSquareDashed, Plus, Trash2, CheckCircle2, ArchiveRestore, Search, FileText, Sparkles, ListTodo, RefreshCw, CheckSquare, Hash, Calendar, ChevronRight, LayoutTemplate, Shield, Database } from 'lucide-react';
import React, { useMemo, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { type Note } from '../../types';
import { NoteBatchActions } from './NoteBatchActions';
import { AdvancedEditor } from './AdvancedEditor';
import useLocalStorage from '../../hooks/useLocalStorage';
import { MELSA_KERNEL } from '../../services/melsaKernel';

const SmartNotesView: React.FC<{notes: Note[], setNotes: any}> = ({ notes, setNotes }) => {
    const [language] = useLocalStorage<'id' | 'en'>('app_language', 'id');
    const [fontSize, setFontSize] = useLocalStorage<number>('notes_font_size', 18);
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'edit' | 'tasks' | 'preview'>('preview');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [viewArchive, setViewArchive] = useState(false);
    const [newTaskText, setNewTaskText] = useState('');
    const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);

    // Optimized filtering
    const filteredNotes = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return notes
            .filter(n => (!!n.is_archived === viewArchive) && (n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query)))
            .sort((a, b) => (a.is_pinned === b.is_pinned ? new Date(b.updated).getTime() - new Date(a.updated).getTime() : a.is_pinned ? -1 : 1));
    }, [notes, searchQuery, viewArchive]);

    const activeNote = useMemo(() => notes.find(n => n.id === activeNoteId), [notes, activeNoteId]);

    // Secure HTML Sanitizer
    const sanitizeHTML = (html: string) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const dangerousTags = ['script', 'iframe', 'object', 'embed', 'form'];
        dangerousTags.forEach(tag => doc.querySelectorAll(tag).forEach(el => el.remove()));
        doc.querySelectorAll('*').forEach(el => {
            const attrs = el.attributes;
            for (let i = attrs.length - 1; i >= 0; i--) {
                const name = attrs[i].name;
                if (name.startsWith('on') || (name === 'href' && attrs[i].value.trim().startsWith('javascript:'))) {
                    el.removeAttribute(name);
                }
            }
        });
        return doc.body.innerHTML;
    };

    const handleUpdate = useCallback((id: string, updates: Partial<Note>) => {
        setNotes((prev: Note[]) => prev.map(n => n.id === id ? { ...n, ...updates, updated: new Date().toISOString() } : n));
    }, [setNotes]);

    const createNote = () => {
        const id = uuidv4();
        const newNote: Note = { id, title: '', content: '', tags: [], created: new Date().toISOString(), updated: new Date().toISOString(), is_archived: false, is_pinned: false, tasks: [] };
        setNotes([newNote, ...notes]);
        setActiveNoteId(id);
        setViewMode('edit');
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleGenerateTasks = async () => {
        if (!activeNote || isGeneratingTasks) return;
        setIsGeneratingTasks(true);
        try {
            const prompt = `Analisa konten catatan ini secara mendalam:\n\nJUDUL: ${activeNote.title}\nISI: ${activeNote.content.replace(/<[^>]*>/g, '')}\n\nInstruksi: Berdasarkan konten di atas, buatkan daftar tugas (to-do list) yang konkret, actionable, dan relevan. Return HANYA dalam format JSON Array string murni (contoh: ["Task 1", "Task 2"]). Jangan ada markdown block atau teks tambahan lain. Maksimal 5 tugas.`;
            
            const response = await MELSA_KERNEL.execute(prompt, 'gemini-3-flash-preview');
            const cleanText = response.text?.replace(/```json/g, '').replace(/```/g, '').trim() || "[]";
            
            let newTasks: string[] = [];
            try {
                newTasks = JSON.parse(cleanText);
            } catch (e) {
                console.error("JSON Parse Error:", e);
            }

            if (Array.isArray(newTasks) && newTasks.length > 0) {
                const taskObjects = newTasks.map(t => ({ id: uuidv4(), text: t, isCompleted: false }));
                handleUpdate(activeNote.id, { tasks: [...(activeNote.tasks || []), ...taskObjects] });
            }
        } catch (error) {
            console.error("Auto Task Gen Failed", error);
        } finally {
            setIsGeneratingTasks(false);
        }
    };

    // Task Calculation
    const totalTasks = activeNote?.tasks?.length || 0;
    const completedTasks = activeNote?.tasks?.filter(t => t.isCompleted).length || 0;
    const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    return (
        <div className="min-h-full flex flex-col p-2 md:p-6 lg:p-8 animate-fade-in pb-32 md:pb-40 h-screen">
             <div className="flex-1 bg-white dark:bg-[#0a0a0b] rounded-[32px] md:rounded-[40px] shadow-sm border border-black/5 dark:border-white/5 flex flex-row relative overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
                
                {/* DELETE MODAL */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 z-[3100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
                        <div className="bg-[#121214] border border-red-500/30 p-8 rounded-[32px] max-w-sm w-full shadow-[0_0_50px_rgba(220,38,38,0.2)] animate-slide-up text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-red-500 shadow-[0_0_20px_#ef4444]"></div>
                            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                                <Trash2 className="text-red-500" size={32} />
                            </div>
                            <h3 className="text-xl font-black text-white uppercase italic mb-2 tracking-tighter">CONFIRM_PURGE?</h3>
                            <p className="text-[10px] text-neutral-400 font-bold tech-mono uppercase tracking-widest mb-8">This action is irreversible. Data will be lost.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border border-white/5">ABORT</button>
                                <button onClick={() => { 
                                    const ids = isSelectionMode ? Array.from(selectedIds) : [activeNoteId];
                                    setNotes(notes.filter(n => !ids.includes(n.id)));
                                    setSelectedIds(new Set());
                                    setIsSelectionMode(false);
                                    setActiveNoteId(null);
                                    setShowDeleteConfirm(false);
                                }} className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)]">EXECUTE</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* LEFT PANEL: LIST VIEW */}
                <div className={`${activeNote ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-[380px] xl:w-[450px] border-r border-black/5 dark:border-white/5 transition-all bg-zinc-50/50 dark:bg-[#0c0c0e]`}>
                    <header className="p-4 md:p-6 border-b border-black/5 dark:border-white/5 shrink-0 bg-white/50 dark:bg-white/[0.01] backdrop-blur-sm">
                        <div className="flex justify-between items-start gap-4 mb-6">
                            <div>
                                <h2 className="text-3xl font-black italic tracking-tighter text-black dark:text-white uppercase leading-none">
                                    {viewArchive ? 'ARCHIVE' : 'VAULT'} <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-purple-500">DB</span>
                                </h2>
                                <p className="text-[8px] font-black tech-mono text-neutral-400 mt-2 uppercase tracking-[0.3em] flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${viewArchive ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`}></div>
                                    {viewArchive ? 'COLD_STORAGE' : 'SECURE_ACTIVE_NODES'}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setViewArchive(!viewArchive)} className={`h-10 w-10 rounded-xl flex items-center justify-center border transition-all ${viewArchive ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-white dark:bg-white/5 border-black/5 dark:border-white/10 text-neutral-400 hover:text-black dark:hover:text-white'}`} title="Toggle Archive">
                                    {viewArchive ? <ArchiveRestore size={18} /> : <Archive size={18}/>}
                                </button>
                                <button onClick={() => setIsSelectionMode(!isSelectionMode)} className={`h-10 w-10 rounded-xl flex items-center justify-center border transition-all ${isSelectionMode ? 'bg-[var(--accent-color)] text-on-accent border-[var(--accent-color)] shadow-md' : 'bg-white dark:bg-white/5 border-black/5 dark:border-white/10 text-neutral-400 hover:text-black dark:hover:text-white'}`} title="Select Mode">
                                    <MousePointerSquareDashed size={18}/>
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex gap-2">
                            <div className="relative flex-1 group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-accent font-black text-xs animate-pulse">{'>'}</span>
                                <input 
                                    value={searchQuery} 
                                    onChange={e => setSearchQuery(e.target.value)} 
                                    className="w-full h-12 bg-white dark:bg-black/40 border border-black/5 dark:border-white/10 rounded-xl pl-10 pr-4 text-[11px] font-mono font-bold outline-none focus:border-accent/50 focus:bg-white dark:focus:bg-black/60 transition-all dark:text-white placeholder:text-neutral-500 uppercase tracking-wider" 
                                    placeholder="QUERY_DATABASE..." 
                                />
                            </div>
                            <button onClick={createNote} className="h-12 w-12 bg-black dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center transition-transform active:scale-95 shadow-lg hover:scale-105">
                                <Plus size={20} strokeWidth={3}/>
                            </button>
                        </div>
                    </header>

                    <div className="flex-1 overflow-y-auto p-4 custom-scroll space-y-3">
                        {filteredNotes.map(n => {
                            const isActive = activeNoteId === n.id;
                            const isSelected = selectedIds.has(n.id);
                            
                            return (
                                <div 
                                    key={n.id} 
                                    onClick={() => isSelectionMode ? toggleSelection(n.id) : (setActiveNoteId(n.id), setViewMode('preview'))} 
                                    className={`
                                        p-5 rounded-[20px] border cursor-pointer transition-all duration-500 relative group overflow-hidden
                                        ${isSelected 
                                            ? 'bg-accent/10 border-accent ring-1 ring-accent' 
                                            : isActive 
                                                ? 'bg-white dark:bg-white/[0.08] border-accent/50 shadow-[0_0_30px_rgba(var(--accent-rgb),0.1)] ring-1 ring-accent/20 translate-x-2' 
                                                : 'bg-white dark:bg-white/[0.02] border-black/5 dark:border-white/5 hover:border-accent/20 hover:bg-white/80 dark:hover:bg-white/[0.04]'
                                        }
                                    `}
                                >
                                    {/* Pinned Glow */}
                                    {n.is_pinned && (
                                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-accent/20 to-transparent rounded-bl-[40px] pointer-events-none"></div>
                                    )}

                                    <div className="flex justify-between items-start mb-2 relative z-10">
                                        <h3 className={`text-[12px] font-black uppercase italic leading-tight truncate flex-1 pr-4 ${isActive ? 'text-black dark:text-white' : 'text-neutral-700 dark:text-neutral-300 group-hover:text-accent'}`}>
                                            {n.title || 'UNTITLED_DATA_NODE'}
                                        </h3>
                                        {isSelectionMode ? (
                                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-accent border-accent text-on-accent' : 'border-neutral-300 dark:border-neutral-700'}`}>
                                                {isSelected && <CheckSquare size={12} strokeWidth={4} />}
                                            </div>
                                        ) : n.is_pinned && <Bookmark size={14} className="text-accent fill-accent" />}
                                    </div>
                                    
                                    <div className="text-[10px] text-neutral-500 font-medium line-clamp-2 leading-relaxed relative z-10 dark:text-neutral-400 min-h-[2.5em] font-mono opacity-80">
                                        {n.content.replace(/<[^>]*>/g, '').substring(0, 100) || "// EMPTY_BUFFER"}
                                    </div>

                                    <div className="mt-4 flex justify-between items-end border-t border-black/5 dark:border-white/5 pt-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[8px] tech-mono uppercase text-neutral-400 font-bold bg-zinc-100 dark:bg-white/5 px-2 py-1 rounded">
                                                {new Date(n.updated).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                            </span>
                                            {n.tasks && n.tasks.length > 0 && (
                                                <span className={`text-[8px] tech-mono font-bold flex items-center gap-1 ${isActive ? 'text-accent' : 'text-neutral-400'}`}>
                                                    <ListTodo size={10} /> {n.tasks.filter(t=>t.isCompleted).length}/{n.tasks.length}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {isActive && !isSelectionMode && (
                                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-accent"></div>
                                    )}
                                </div>
                            );
                        })}
                        
                        {filteredNotes.length === 0 && (
                            <div className="py-20 text-center flex flex-col items-center justify-center text-neutral-400 opacity-50 gap-4">
                                <div className="w-20 h-20 rounded-3xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center border border-black/5 dark:border-white/5">
                                    <Database size={32} strokeWidth={1.5} />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em]">DATABASE_EMPTY</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT PANEL: DETAIL VIEW */}
                <div className={`${!activeNote ? 'hidden lg:flex' : 'flex'} flex-1 flex-col bg-white dark:bg-[#0a0a0b] lg:bg-white lg:dark:bg-black relative`}>
                    {activeNote ? (
                        <div className="flex-1 flex flex-col animate-slide-up overflow-hidden h-full">
                            {/* Sticky Toolbar */}
                            <header className="px-4 py-3 md:px-6 flex items-center justify-between border-b border-black/5 dark:border-white/5 bg-white/80 dark:bg-[#0a0a0b]/90 backdrop-blur-xl sticky top-0 z-30 transition-all">
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setActiveNoteId(null)} className="lg:hidden p-2.5 bg-zinc-100 dark:bg-white/5 rounded-xl hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors">
                                        <ArrowLeft size={18} />
                                    </button>
                                    <div className="hidden lg:flex items-center gap-2">
                                        <div className="w-2 h-2 bg-accent rounded-full animate-pulse shadow-[0_0_8px_var(--accent-color)]"></div>
                                        <span className="text-[9px] font-black tech-mono uppercase tracking-[0.2em] text-neutral-500">DECRYPTED_SESSION_ID_{activeNote.id.slice(0,4)}</span>
                                    </div>
                                </div>

                                <div className="flex bg-zinc-100 dark:bg-white/5 p-1 rounded-xl border border-black/5 dark:border-white/5">
                                    {[
                                        { id: 'preview', icon: <FileText size={14} />, label: 'READ' },
                                        { id: 'edit', icon: <LayoutTemplate size={14} />, label: 'EDIT' },
                                        { id: 'tasks', icon: <ListTodo size={14} />, label: 'TASKS' }
                                    ].map((m: any) => (
                                        <button 
                                            key={m.id} 
                                            onClick={() => setViewMode(m.id)} 
                                            className={`
                                                px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all
                                                ${viewMode === m.id 
                                                    ? 'bg-white dark:bg-[#121214] text-black dark:text-white shadow-sm' 
                                                    : 'text-neutral-400 hover:text-black dark:hover:text-white'
                                                }
                                            `}
                                        >
                                            {m.icon} <span className="hidden md:inline">{m.label}</span>
                                        </button>
                                    ))}
                                </div>

                                <button 
                                    onClick={() => setShowDeleteConfirm(true)} 
                                    className="p-2.5 text-neutral-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                    title="Delete Note"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </header>

                            <div className="flex-1 overflow-y-auto custom-scroll">
                                <div className="max-w-4xl mx-auto px-6 py-8 md:px-12 md:py-12 min-h-[50vh]">
                                    
                                    {/* Title Input */}
                                    <div className="mb-8 group">
                                        <input 
                                            value={activeNote.title} 
                                            onChange={e => handleUpdate(activeNote.id, { title: e.target.value })} 
                                            className="w-full bg-transparent text-4xl md:text-6xl font-black uppercase italic tracking-tighter outline-none text-black dark:text-white placeholder:text-neutral-200 dark:placeholder:text-neutral-800 transition-all border-b border-transparent group-focus-within:border-black/10 dark:group-focus-within:border-white/10 pb-2 leading-none" 
                                            placeholder="UNTITLED_PROJECT" 
                                        />
                                        <div className="flex items-center gap-4 mt-4 opacity-60 pl-1">
                                            <span className="text-[9px] font-bold tech-mono text-neutral-400 uppercase tracking-widest flex items-center gap-1 bg-zinc-100 dark:bg-white/5 px-2 py-1 rounded">
                                                <Hash size={10}/> ID: {activeNote.id.slice(0,8)}
                                            </span>
                                            <span className="text-[9px] font-bold tech-mono text-neutral-400 uppercase tracking-widest flex items-center gap-1 bg-zinc-100 dark:bg-white/5 px-2 py-1 rounded">
                                                <Calendar size={10}/> {new Date(activeNote.updated).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    {viewMode === 'edit' ? (
                                        <AdvancedEditor 
                                            initialContent={activeNote.content} 
                                            onSave={c => handleUpdate(activeNote.id, { content: c })} 
                                            language={language} 
                                            fontSize={fontSize} 
                                            onFontSizeChange={setFontSize} 
                                        />
                                    ) : viewMode === 'preview' ? (
                                        <div 
                                            className="prose dark:prose-invert max-w-none font-medium leading-relaxed pb-32 animate-fade-in text-neutral-800 dark:text-neutral-300" 
                                            style={{ fontSize: `${fontSize}px` }}
                                            dangerouslySetInnerHTML={{ __html: sanitizeHTML(activeNote.content || '<p class="opacity-30 italic text-sm font-mono">// NO_DATA_ENCRYPTED. SWITCH_TO_EDIT_MODE_TO_BEGIN_ENTRY.</p>') }} 
                                        />
                                    ) : (
                                        <div className="space-y-8 animate-slide-up">
                                            {/* TASK MANAGER HEADER */}
                                            <div className="bg-zinc-100 dark:bg-[#121214] p-8 rounded-[32px] border border-black/5 dark:border-white/5 relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-8 opacity-5 dark:opacity-[0.02] transform scale-150 rotate-12 pointer-events-none">
                                                    <ListTodo size={120} />
                                                </div>
                                                
                                                <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 relative z-10 gap-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-14 h-14 rounded-2xl bg-white dark:bg-black border border-black/5 dark:border-white/10 flex items-center justify-center text-accent shadow-lg">
                                                            <CheckSquare size={24} strokeWidth={2.5} />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-xl font-black uppercase italic tracking-tighter text-black dark:text-white leading-none">PROTOCOL_STATUS</h3>
                                                            <p className="text-[10px] font-black tech-mono text-neutral-500 mt-1 uppercase tracking-widest">
                                                                {completedTasks}/{totalTasks} OBJECTIVES_COMPLETE
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-4xl font-black italic text-accent tabular-nums tracking-tighter">{progress}%</div>
                                                </div>
                                                
                                                {/* Progress Bar */}
                                                <div className="h-4 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden relative z-10 border border-black/5 dark:border-white/5">
                                                    <div className="h-full bg-accent transition-all duration-1000 ease-out relative overflow-hidden flex items-center" style={{ width: `${progress}%` }}>
                                                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)] animate-[shimmer_1.5s_infinite]"></div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* AI TASK GENERATOR & INPUT */}
                                            <div className="flex gap-3">
                                                <div className="flex-1 flex gap-2 p-2 bg-white dark:bg-[#121214] rounded-2xl border border-black/5 dark:border-white/5 focus-within:border-accent/50 focus-within:ring-1 focus-within:ring-accent/50 transition-all shadow-sm">
                                                    <input 
                                                        value={newTaskText} 
                                                        onChange={e => setNewTaskText(e.target.value)} 
                                                        onKeyDown={e => e.key === 'Enter' && (setNotes(notes.map(n => n.id === activeNote.id ? {...n, tasks: [...(n.tasks||[]), {id: uuidv4(), text: newTaskText, isCompleted: false}]} : n)), setNewTaskText(''))} 
                                                        className="flex-1 bg-transparent px-4 py-3 text-sm font-bold outline-none text-black dark:text-white placeholder:text-neutral-400 placeholder:text-[10px] placeholder:font-black placeholder:tracking-widest placeholder:uppercase" 
                                                        placeholder="INPUT_NEW_DIRECTIVE..." 
                                                    />
                                                    <button onClick={() => { if(newTaskText.trim()) { setNotes(notes.map(n => n.id === activeNote.id ? {...n, tasks: [...(n.tasks||[]), {id: uuidv4(), text: newTaskText, isCompleted: false}]} : n)); setNewTaskText(''); } }} className="w-12 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center">
                                                        <Plus size={20} strokeWidth={3}/>
                                                    </button>
                                                </div>
                                                <button 
                                                    onClick={handleGenerateTasks} 
                                                    disabled={isGeneratingTasks}
                                                    className={`px-6 rounded-2xl border flex items-center justify-center gap-2 transition-all shadow-lg hover:-translate-y-0.5 ${
                                                        isGeneratingTasks 
                                                        ? 'bg-accent/10 border-accent/20 text-accent cursor-not-allowed' 
                                                        : 'bg-[var(--accent-color)] text-on-accent border-transparent hover:shadow-[0_0_20px_var(--accent-glow)]'
                                                    }`}
                                                    title="Auto-Generate Tasks from Note Content"
                                                >
                                                    {isGeneratingTasks ? <RefreshCw size={20} className="animate-spin" /> : <Sparkles size={20} fill="currentColor" />}
                                                    <span className="hidden md:block text-[10px] font-black uppercase tracking-widest">{isGeneratingTasks ? 'ANALYZING...' : 'AI_EXTRACT'}</span>
                                                </button>
                                            </div>

                                            {/* TASK LIST */}
                                            <div className="space-y-3">
                                                {activeNote.tasks?.map(t => (
                                                    <div key={t.id} className="flex items-center gap-4 p-4 bg-white dark:bg-[#121214] border border-black/5 dark:border-white/5 rounded-2xl transition-all hover:border-accent/30 hover:bg-zinc-50 dark:hover:bg-white/[0.02] group animate-slide-up shadow-sm">
                                                        <button 
                                                            onClick={() => handleUpdate(activeNote.id, { tasks: activeNote.tasks?.map(task => task.id === t.id ? {...task, isCompleted: !task.isCompleted} : task) })} 
                                                            className={`shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${t.isCompleted ? 'bg-accent border-accent text-black' : 'border-neutral-300 dark:border-neutral-700 hover:border-accent'}`}
                                                        >
                                                            {t.isCompleted && <CheckCircle2 size={14} strokeWidth={4} />}
                                                        </button>
                                                        <span className={`text-sm font-bold flex-1 leading-relaxed ${t.isCompleted ? 'line-through opacity-40 text-neutral-500 decoration-2 decoration-neutral-300 dark:decoration-neutral-700' : 'text-black dark:text-neutral-200'}`}>{t.text}</span>
                                                        <button 
                                                            onClick={() => handleUpdate(activeNote.id, { tasks: activeNote.tasks?.filter(task => task.id !== t.id) })} 
                                                            className="text-neutral-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10 rounded-lg"
                                                        >
                                                            <Trash2 size={16}/>
                                                        </button>
                                                    </div>
                                                ))}
                                                {totalTasks === 0 && (
                                                    <div className="py-16 text-center opacity-40 border-2 border-dashed border-black/5 dark:border-white/5 rounded-[32px]">
                                                        <CheckSquare size={48} className="mx-auto mb-4 text-neutral-300 dark:text-neutral-600" strokeWidth={1} />
                                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400">NO_ACTIVE_DIRECTIVES</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* EMPTY STATE */
                        <div className="hidden lg:flex flex-col items-center justify-center h-full relative overflow-hidden bg-white dark:bg-black">
                            {/* Animated Background Grid */}
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)] pointer-events-none"></div>
                            
                            <div className="relative z-10 text-center space-y-6 p-12">
                                <div className="w-24 h-24 mx-auto bg-zinc-100 dark:bg-white/5 rounded-[32px] flex items-center justify-center shadow-2xl border border-black/5 dark:border-white/5 animate-float backdrop-blur-md">
                                    <Shield size={40} className="text-neutral-300 dark:text-neutral-600" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black uppercase italic tracking-tighter text-neutral-300 dark:text-neutral-700">WAITING_FOR_INPUT</h2>
                                    <p className="text-[10px] font-black tech-mono text-neutral-400 mt-2 uppercase tracking-[0.4em] animate-pulse">Select a Data Node to Decrypt</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
             </div>
             
             {/* BATCH ACTIONS COMPONENT */}
             <NoteBatchActions 
                selectedCount={selectedIds.size} 
                totalCount={filteredNotes.length} 
                isViewingArchive={viewArchive} 
                selectedNotes={notes.filter(n => selectedIds.has(n.id))} 
                onSelectAll={() => setSelectedIds(new Set(filteredNotes.map(n => n.id)))} 
                onDeselectAll={() => setSelectedIds(new Set())} 
                onDeleteSelected={() => setShowDeleteConfirm(true)} 
                onArchiveSelected={() => { 
                    setNotes(notes.map(n => selectedIds.has(n.id) ? {...n, is_archived: !n.is_archived} : n)); 
                    setSelectedIds(new Set()); 
                    setIsSelectionMode(false); 
                }} 
                onPinSelected={() => { 
                    setNotes(notes.map(n => selectedIds.has(n.id) ? {...n, is_pinned: !n.is_pinned} : n)); 
                    setSelectedIds(new Set()); 
                    setIsSelectionMode(false); 
                }} 
                onCancel={() => { setSelectedIds(new Set()); setIsSelectionMode(false); }} 
            />
        </div>
    );
};

export default SmartNotesView;
