
import { AlertCircle, Archive, ArrowLeft, Bookmark, MousePointerSquareDashed, Plus, Trash2, CheckCircle2, ArchiveRestore, Search, FileText, Sparkles, ListTodo, RefreshCw, CheckSquare } from 'lucide-react';
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
             <div className="flex-1 bg-white dark:bg-[#0a0a0b] rounded-[32px] md:rounded-[40px] shadow-sm border border-black/5 dark:border-white/5 flex flex-row relative overflow-hidden">
                {showDeleteConfirm && (
                    <div className="fixed inset-0 z-[3100] bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
                        <div className="bg-white dark:bg-[#121214] border border-red-500/20 p-8 rounded-[32px] max-w-sm w-full shadow-2xl animate-slide-up text-center">
                            <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
                            <h3 className="text-xl font-black text-white uppercase italic mb-6">Hapus Permanen?</h3>
                            <div className="flex gap-3">
                                <button onClick={() => { 
                                    const ids = isSelectionMode ? Array.from(selectedIds) : [activeNoteId];
                                    setNotes(notes.filter(n => !ids.includes(n.id)));
                                    setSelectedIds(new Set());
                                    setIsSelectionMode(false);
                                    setActiveNoteId(null);
                                    setShowDeleteConfirm(false);
                                }} className="flex-1 py-4 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase">HAPUS</button>
                                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-4 bg-white/5 text-neutral-400 rounded-xl font-black text-[10px] uppercase">BATAL</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* LEFT PANEL: LIST VIEW (Visible on LG, or when no note active on Mobile) */}
                <div className={`${activeNote ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-[380px] xl:w-[450px] border-r border-black/5 dark:border-white/5 transition-all`}>
                    <header className="p-4 md:p-6 border-b border-black/5 dark:border-white/5 shrink-0">
                        <div className="flex justify-between items-end gap-2 mb-6">
                            <div className="flex-1 min-w-0">
                                <h2 className="text-3xl font-black italic tracking-tighter dark:text-white uppercase leading-none truncate">
                                    {viewArchive ? 'ARCHIVE' : 'VAULT'} <span className="text-accent hidden sm:inline">DB</span>
                                </h2>
                                <p className="text-[9px] font-black tech-mono text-neutral-400 mt-2 uppercase tracking-widest hidden sm:block">SECURE_DATA_STORAGE</p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <button onClick={() => setViewArchive(!viewArchive)} className={`h-10 w-10 rounded-xl flex items-center justify-center border transition-all ${viewArchive ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-white dark:bg-white/5 border-black/5 dark:border-white/10 text-neutral-400'}`} title="Toggle Archive">
                                    {viewArchive ? <ArchiveRestore size={18} /> : <Archive size={18}/>}
                                </button>
                                <button onClick={() => setIsSelectionMode(!isSelectionMode)} className={`h-10 w-10 rounded-xl flex items-center justify-center border transition-all ${isSelectionMode ? 'bg-white dark:bg-white text-black border-white' : 'bg-white dark:bg-white/5 border-black/5 dark:border-white/10 text-neutral-400'}`} title="Select Mode">
                                    <MousePointerSquareDashed size={18}/>
                                </button>
                                <button onClick={createNote} className="h-10 px-4 bg-accent text-on-accent font-black uppercase text-[10px] rounded-xl flex items-center gap-2 transition-transform active:scale-95 shadow-[0_0_20px_var(--accent-glow)] hover:scale-105">
                                    <Plus size={16}/> <span className="hidden xs:inline">BARU</span>
                                </button>
                            </div>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full h-12 bg-zinc-100 dark:bg-white/5 rounded-xl pl-12 pr-6 text-xs font-bold outline-none focus:ring-2 ring-accent/30 transition-all dark:text-white placeholder:text-neutral-400 uppercase" placeholder="CARI DATABASE..." />
                        </div>
                    </header>
                    <div className="flex-1 overflow-y-auto p-4 custom-scroll">
                        <div className="grid grid-cols-1 gap-3">
                            {filteredNotes.map(n => {
                                const isActive = activeNoteId === n.id;
                                const nTasks = n.tasks?.length || 0;
                                const nCompleted = n.tasks?.filter(t => t.isCompleted).length || 0;
                                const nProgress = nTasks > 0 ? Math.round((nCompleted / nTasks) * 100) : 0;

                                return (
                                    <div key={n.id} onClick={() => isSelectionMode ? toggleSelection(n.id) : (setActiveNoteId(n.id), setViewMode('preview'))} className={`p-5 rounded-[20px] border cursor-pointer transition-all hover:-translate-y-1 relative group overflow-hidden ${
                                        selectedIds.has(n.id) 
                                        ? 'bg-accent/10 border-accent ring-1 ring-accent' 
                                        : isActive 
                                            ? 'border-accent bg-accent/[0.04] shadow-[0_0_30px_rgba(var(--accent-rgb),0.1)] ring-1 ring-accent/30' 
                                            : 'bg-zinc-50 dark:bg-white/[0.03] border-black/5 dark:border-white/5 hover:border-accent/30'
                                    }`}>
                                        <div className="flex justify-between mb-2 relative z-10">
                                            <h3 className={`text-base font-black uppercase italic leading-none truncate flex-1 pr-2 ${isActive ? 'text-accent' : 'dark:text-white'}`}>{n.title || 'TANPA_JUDUL'}</h3>
                                            {n.is_pinned && <Bookmark size={14} className="text-accent fill-accent" />}
                                        </div>
                                        <div className="text-[10px] text-neutral-500 font-medium line-clamp-3 leading-relaxed relative z-10 dark:text-neutral-400">
                                            {n.content.replace(/<[^>]*>/g, '').substring(0, 150) || "Data kosong."}
                                        </div>
                                        
                                        {/* Task Indicator in List */}
                                        {nTasks > 0 && (
                                            <div className="mt-3 relative h-1 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden w-2/3">
                                                <div className="absolute top-0 left-0 h-full bg-accent transition-all duration-500" style={{ width: `${nProgress}%` }}></div>
                                            </div>
                                        )}

                                        <div className="mt-3 flex justify-between items-end opacity-60">
                                            <span className="text-[8px] tech-mono uppercase text-neutral-400 font-bold">{new Date(n.updated).toLocaleDateString()}</span>
                                            {isSelectionMode && (
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedIds.has(n.id) ? 'bg-accent border-accent text-black' : 'border-neutral-300'}`}>
                                                    {selectedIds.has(n.id) && <CheckCircle2 size={12} />}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredNotes.length === 0 && (
                                <div className="py-20 text-center flex flex-col items-center justify-center text-neutral-400 opacity-50 gap-4">
                                    <Archive size={24} />
                                    <p className="text-[10px] font-black uppercase tracking-widest">DATA_NOT_FOUND</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL: DETAIL VIEW (Visible on LG, or when note active on Mobile) */}
                <div className={`${!activeNote ? 'hidden lg:flex' : 'flex'} flex-1 flex-col bg-white dark:bg-[#0a0a0b] lg:bg-zinc-50/30 lg:dark:bg-white/[0.01]`}>
                    {activeNote ? (
                        <div className="flex-1 flex flex-col animate-slide-up overflow-hidden h-full">
                            <header className="px-4 py-4 md:px-6 flex items-center justify-between border-b border-black/5 dark:border-white/5 bg-white/80 dark:bg-[#0a0a0b]/80 backdrop-blur-md sticky top-0 z-20">
                                <button onClick={() => setActiveNoteId(null)} className="lg:hidden p-3 bg-zinc-100 dark:bg-white/5 rounded-2xl hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors"><ArrowLeft size={20} /></button>
                                <div className="hidden lg:block"></div> {/* Spacer */}
                                <div className="flex bg-zinc-100 dark:bg-white/5 p-1 rounded-2xl mx-2">
                                    {['preview', 'edit', 'tasks'].map((m: any) => (
                                        <button key={m} onClick={() => setViewMode(m)} className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${viewMode === m ? 'bg-white dark:bg-black text-accent shadow-sm' : 'text-neutral-400'}`}>{m}</button>
                                    ))}
                                </div>
                                <button onClick={() => setShowDeleteConfirm(true)} className="p-3 text-neutral-400 hover:text-red-500 bg-transparent hover:bg-red-500/10 rounded-2xl transition-all"><Trash2 size={20} /></button>
                            </header>
                            <div className="flex-1 overflow-y-auto p-4 md:p-12 custom-scroll">
                                <div className="max-w-3xl mx-auto min-h-[50vh]">
                                    <input value={activeNote.title} onChange={e => handleUpdate(activeNote.id, { title: e.target.value })} className="w-full bg-transparent text-3xl md:text-4xl font-black uppercase italic mb-8 outline-none dark:text-white placeholder:text-neutral-300 dark:placeholder:text-neutral-700" placeholder="JUDUL_NODE..." />
                                    {viewMode === 'edit' ? (
                                        <AdvancedEditor initialContent={activeNote.content} onSave={c => handleUpdate(activeNote.id, { content: c })} language={language} fontSize={fontSize} onFontSizeChange={setFontSize} />
                                    ) : viewMode === 'preview' ? (
                                        <div 
                                            className="prose dark:prose-invert max-w-none font-medium leading-relaxed pb-32" 
                                            style={{ fontSize: `${fontSize}px` }}
                                            dangerouslySetInnerHTML={{ __html: sanitizeHTML(activeNote.content || '<p class="opacity-30 italic">Belum ada data kognitif.</p>') }} 
                                        />
                                    ) : (
                                        <div className="space-y-6">
                                            {/* TASK MANAGER HEADER */}
                                            <div className="bg-zinc-100 dark:bg-white/[0.03] p-6 rounded-[32px] border border-black/5 dark:border-white/5 relative overflow-hidden">
                                                <div className="flex items-center justify-between mb-4 relative z-10">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-accent/20 text-accent flex items-center justify-center">
                                                            <ListTodo size={20} />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-sm font-black uppercase tracking-widest dark:text-white">TASK_PROTOCOL</h3>
                                                            <p className="text-[10px] font-mono text-neutral-500">{completedTasks}/{totalTasks} COMPLETED</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-2xl font-black italic text-accent">{progress}%</div>
                                                </div>
                                                {/* Progress Bar */}
                                                <div className="h-3 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden relative z-10">
                                                    <div className="h-full bg-accent transition-all duration-700 ease-[cubic-bezier(0.25,0.76,0.35,0.98)] relative overflow-hidden" style={{ width: `${progress}%` }}>
                                                        <div className="absolute inset-0 bg-white/20 animate-[pulse-slow_2s_infinite]"></div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* AI TASK GENERATOR & INPUT */}
                                            <div className="flex gap-2">
                                                <div className="flex-1 flex gap-2 p-2 bg-zinc-100 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5 focus-within:border-accent/50 transition-colors shadow-sm">
                                                    <input 
                                                        value={newTaskText} 
                                                        onChange={e => setNewTaskText(e.target.value)} 
                                                        onKeyDown={e => e.key === 'Enter' && (setNotes(notes.map(n => n.id === activeNote.id ? {...n, tasks: [...(n.tasks||[]), {id: uuidv4(), text: newTaskText, isCompleted: false}]} : n)), setNewTaskText(''))} 
                                                        className="flex-1 bg-transparent px-4 py-3 text-sm font-bold outline-none dark:text-white placeholder:text-neutral-400 placeholder:text-[11px] placeholder:tracking-wide placeholder:uppercase" 
                                                        placeholder="Input tugas manual..." 
                                                    />
                                                    <button onClick={() => { if(newTaskText.trim()) { setNotes(notes.map(n => n.id === activeNote.id ? {...n, tasks: [...(n.tasks||[]), {id: uuidv4(), text: newTaskText, isCompleted: false}]} : n)); setNewTaskText(''); } }} className="p-3 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:scale-105 active:scale-95 transition-all"><Plus size={18}/></button>
                                                </div>
                                                <button 
                                                    onClick={handleGenerateTasks} 
                                                    disabled={isGeneratingTasks}
                                                    className={`px-5 rounded-2xl border flex items-center justify-center gap-2 transition-all shadow-lg ${
                                                        isGeneratingTasks 
                                                        ? 'bg-accent/10 border-accent/20 text-accent cursor-not-allowed' 
                                                        : 'bg-accent text-on-accent border-transparent hover:scale-105 active:scale-95 hover:shadow-accent/20'
                                                    }`}
                                                    title="Auto-Generate Tasks from Note Content"
                                                >
                                                    {isGeneratingTasks ? <RefreshCw size={20} className="animate-spin" /> : <Sparkles size={20} />}
                                                    <span className="hidden md:block text-[10px] font-black uppercase tracking-widest">{isGeneratingTasks ? 'SYNTHESIZING...' : 'AI_AUTO_TASK'}</span>
                                                </button>
                                            </div>

                                            {/* TASK LIST */}
                                            <div className="space-y-2">
                                                {activeNote.tasks?.map(t => (
                                                    <div key={t.id} className="flex items-start gap-4 p-4 bg-white dark:bg-[#0f0f11] border border-black/5 dark:border-white/5 rounded-2xl transition-all hover:border-accent/30 group animate-slide-up shadow-sm">
                                                        <button 
                                                            onClick={() => handleUpdate(activeNote.id, { tasks: activeNote.tasks?.map(task => task.id === t.id ? {...task, isCompleted: !task.isCompleted} : task) })} 
                                                            className={`shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all mt-0.5 ${t.isCompleted ? 'bg-accent border-accent text-black scale-110' : 'border-neutral-300 dark:border-neutral-700 hover:border-accent'}`}
                                                        >
                                                            {t.isCompleted && <CheckCircle2 size={14} strokeWidth={3} />}
                                                        </button>
                                                        <span className={`text-sm font-medium flex-1 leading-relaxed ${t.isCompleted ? 'line-through opacity-40 decoration-2 decoration-neutral-400' : 'dark:text-neutral-200'}`}>{t.text}</span>
                                                        <button 
                                                            onClick={() => handleUpdate(activeNote.id, { tasks: activeNote.tasks?.filter(task => task.id !== t.id) })} 
                                                            className="text-neutral-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-all"
                                                        >
                                                            <Trash2 size={16}/>
                                                        </button>
                                                    </div>
                                                ))}
                                                {totalTasks === 0 && (
                                                    <div className="py-12 text-center opacity-40">
                                                        <CheckSquare size={32} className="mx-auto mb-2 text-neutral-400" />
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">NO_ACTIVE_TASKS</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="hidden lg:flex flex-col items-center justify-center h-full text-neutral-400 opacity-40 gap-4">
                            <FileText size={64} strokeWidth={1} />
                            <p className="text-xs font-black uppercase tracking-[0.3em]">Select a Node to Decrypt</p>
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
