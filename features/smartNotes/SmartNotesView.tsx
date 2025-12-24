
import { AlertCircle, Archive, ArrowLeft, Bookmark, MousePointerSquareDashed, Plus, Trash2, CheckCircle2, ArchiveRestore, Search } from 'lucide-react';
import React, { useMemo, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { type Note } from '../../types';
import { NoteBatchActions } from './NoteBatchActions';
import { AdvancedEditor } from './AdvancedEditor';
import useLocalStorage from '../../hooks/useLocalStorage';

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

    return (
        <div className="min-h-full flex flex-col p-2 md:p-6 lg:p-8 animate-fade-in pb-32 md:pb-40">
             <div className="flex-1 bg-white dark:bg-[#0a0a0b] rounded-[32px] md:rounded-[40px] shadow-sm border border-black/5 dark:border-white/5 flex flex-col relative overflow-hidden">
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

                {activeNote ? (
                    <div className="flex-1 flex flex-col animate-slide-up overflow-hidden">
                        <header className="px-4 py-4 md:px-6 flex items-center justify-between border-b border-black/5 dark:border-white/5 bg-white/50 dark:bg-black/50 backdrop-blur-sm sticky top-0 z-20">
                            <button onClick={() => setActiveNoteId(null)} className="p-3 bg-zinc-100 dark:bg-white/5 rounded-2xl hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors"><ArrowLeft size={20} /></button>
                            <div className="flex bg-zinc-100 dark:bg-white/5 p-1 rounded-2xl mx-2">
                                {['preview', 'edit', 'tasks'].map((m: any) => (
                                    <button key={m} onClick={() => setViewMode(m)} className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${viewMode === m ? 'bg-white dark:bg-black text-accent shadow-sm' : 'text-neutral-400'}`}>{m}</button>
                                ))}
                            </div>
                            <button onClick={() => setShowDeleteConfirm(true)} className="p-3 text-neutral-400 hover:text-red-500 bg-transparent hover:bg-red-500/10 rounded-2xl transition-all"><Trash2 size={20} /></button>
                        </header>
                        <div className="flex-1 overflow-y-auto p-4 md:p-12 custom-scroll">
                            <div className="max-w-4xl mx-auto min-h-[50vh]">
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
                                    <div className="space-y-4">
                                        <div className="flex gap-2 p-2 bg-zinc-100 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5 focus-within:border-accent/50 transition-colors">
                                            <input value={newTaskText} onChange={e => setNewTaskText(e.target.value)} onKeyDown={e => e.key === 'Enter' && (setNotes(notes.map(n => n.id === activeNote.id ? {...n, tasks: [...(n.tasks||[]), {id: uuidv4(), text: newTaskText, isCompleted: false}]} : n)), setNewTaskText(''))} className="flex-1 bg-transparent px-4 py-2 text-sm font-bold outline-none dark:text-white" placeholder="Input tugas baru..." />
                                            <button onClick={() => { if(newTaskText.trim()) { setNotes(notes.map(n => n.id === activeNote.id ? {...n, tasks: [...(n.tasks||[]), {id: uuidv4(), text: newTaskText, isCompleted: false}]} : n)); setNewTaskText(''); } }} className="p-2 bg-accent text-on-accent rounded-xl"><Plus size={18}/></button>
                                        </div>
                                        {activeNote.tasks?.map(t => (
                                            <div key={t.id} className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-white/[0.02] border border-black/5 rounded-2xl transition-all hover:bg-zinc-100 dark:hover:bg-white/5">
                                                <button onClick={() => handleUpdate(activeNote.id, { tasks: activeNote.tasks?.map(task => task.id === t.id ? {...task, isCompleted: !task.isCompleted} : task) })} className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${t.isCompleted ? 'bg-accent border-accent text-black' : 'border-neutral-300 dark:border-neutral-600'}`}>{t.isCompleted && <CheckCircle2 size={14} />}</button>
                                                <span className={`text-sm font-bold flex-1 ${t.isCompleted ? 'line-through opacity-40' : 'dark:text-neutral-200'}`}>{t.text}</span>
                                                <button onClick={() => handleUpdate(activeNote.id, { tasks: activeNote.tasks?.filter(task => task.id !== t.id) })} className="text-neutral-300 hover:text-red-500"><Trash2 size={16}/></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <header className="p-4 md:p-8 border-b border-black/5 dark:border-white/5">
                            {/* Responsive Header: Title hides/shrinks on mobile to fit buttons */}
                            <div className="flex justify-between items-end gap-2 mb-6">
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-3xl md:text-6xl font-black italic tracking-tighter dark:text-white uppercase leading-none truncate">
                                        {viewArchive ? 'ARCHIVE' : 'VAULT'} <span className="text-accent hidden sm:inline">DB</span>
                                    </h2>
                                    <p className="text-[9px] font-black tech-mono text-neutral-400 mt-2 uppercase tracking-widest hidden sm:block">SECURE_DATA_STORAGE</p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button onClick={() => setViewArchive(!viewArchive)} className={`h-12 w-12 rounded-2xl flex items-center justify-center border transition-all ${viewArchive ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-white dark:bg-white/5 border-black/5 dark:border-white/10 text-neutral-400'}`} title="Toggle Archive">
                                        {viewArchive ? <ArchiveRestore size={20} /> : <Archive size={20}/>}
                                    </button>
                                    <button onClick={() => setIsSelectionMode(!isSelectionMode)} className={`h-12 w-12 rounded-2xl flex items-center justify-center border transition-all ${isSelectionMode ? 'bg-white dark:bg-white text-black border-white' : 'bg-white dark:bg-white/5 border-black/5 dark:border-white/10 text-neutral-400'}`} title="Select Mode">
                                        <MousePointerSquareDashed size={20}/>
                                    </button>
                                    <button onClick={createNote} className="h-12 px-5 bg-accent text-on-accent font-black uppercase text-[10px] rounded-2xl flex items-center gap-2 transition-transform active:scale-95 shadow-[0_0_20px_var(--accent-glow)] hover:scale-105">
                                        <Plus size={18}/> <span className="hidden xs:inline">BARU</span>
                                    </button>
                                </div>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full h-14 bg-zinc-100 dark:bg-white/5 rounded-2xl pl-12 pr-6 text-sm font-bold outline-none focus:ring-2 ring-accent/30 transition-all dark:text-white placeholder:text-neutral-400 uppercase" placeholder="CARI DATABASE..." />
                            </div>
                        </header>
                        <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scroll">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                                {filteredNotes.map(n => (
                                    <div key={n.id} onClick={() => isSelectionMode ? toggleSelection(n.id) : (setActiveNoteId(n.id), setViewMode('preview'))} className={`p-6 h-64 rounded-[28px] border cursor-pointer transition-all hover:-translate-y-1 relative group overflow-hidden ${selectedIds.has(n.id) ? 'bg-accent/10 border-accent ring-1 ring-accent' : 'bg-zinc-50 dark:bg-white/[0.03] border-black/5 dark:border-white/5 hover:border-accent/30'}`}>
                                        <div className="flex justify-between mb-4 relative z-10">
                                            <h3 className="text-xl font-black uppercase italic leading-none truncate flex-1 dark:text-white pr-2">{n.title || 'TANPA_JUDUL'}</h3>
                                            {n.is_pinned && <Bookmark size={16} className="text-accent fill-accent" />}
                                        </div>
                                        <div className="text-[11px] text-neutral-500 font-medium line-clamp-5 leading-relaxed relative z-10 dark:text-neutral-400">
                                            {n.content.replace(/<[^>]*>/g, '').substring(0, 300) || "Data kosong."}
                                        </div>
                                        <div className="absolute bottom-0 left-0 right-0 p-6 pt-10 bg-gradient-to-t from-white dark:from-black/90 to-transparent flex justify-between items-end opacity-90">
                                            <span className="text-[9px] tech-mono uppercase text-neutral-400 font-bold">{new Date(n.updated).toLocaleDateString()}</span>
                                            {isSelectionMode && (
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedIds.has(n.id) ? 'bg-accent border-accent text-black' : 'border-neutral-300'}`}>
                                                    {selectedIds.has(n.id) && <CheckCircle2 size={14} />}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {filteredNotes.length === 0 && (
                                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-neutral-400 opacity-50">
                                        <div className="w-16 h-16 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                                            <Archive size={24} />
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-widest">DATA_NOT_FOUND</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
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
