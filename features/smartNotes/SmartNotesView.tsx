
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  FileText, Search, Plus, CheckSquare, 
  Archive, FolderOpen, Database, 
  ListTodo, ArrowUpRight, Hash, Pin, Trash2, X, Filter
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { type Note } from '../../types';
import { AdvancedEditor } from './AdvancedEditor';
import { NoteBatchActions } from './NoteBatchActions';
// STRICT REGISTRY
import { UI_REGISTRY, FN_REGISTRY } from '../../constants/registry';
import { debugService } from '../../services/debugService';

interface SmartNotesViewProps {
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
}

export const SmartNotesView: React.FC<SmartNotesViewProps> = ({ notes, setNotes }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'editor'>('grid');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'archived'>('all');
  const [editorFontSize, setEditorFontSize] = useState(16);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Safety check: if active note is deleted externally
  useEffect(() => {
      if (activeNoteId && !notes.find(n => n.id === activeNoteId)) {
          setActiveNoteId(null);
          setViewMode('grid');
      }
  }, [notes, activeNoteId]);

  const filteredNotes = useMemo(() => {
    return notes
      .filter(n => {
        const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              n.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesType = filterType === 'archived' ? n.is_archived : !n.is_archived;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
         if (a.is_pinned && !b.is_pinned) return -1;
         if (!a.is_pinned && b.is_pinned) return 1;
         return new Date(b.updated).getTime() - new Date(a.updated).getTime();
      });
  }, [notes, searchQuery, filterType]);

  const activeNote = useMemo(() => notes.find(n => n.id === activeNoteId), [notes, activeNoteId]);

  // Strict Handlers
  const handleCreateNote = () => {
    debugService.logAction(UI_REGISTRY.NOTES_BTN_CREATE, FN_REGISTRY.NOTE_CREATE, 'NEW_NOTE');
    const newNote: Note = {
      id: uuidv4(),
      title: '', 
      content: '',
      tags: [],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      tasks: [],
      is_pinned: false,
      is_archived: false
    };
    setNotes(prev => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
    setViewMode('editor');
  };

  const handleSearchFocus = () => {
      debugService.logAction(UI_REGISTRY.NOTES_INPUT_SEARCH, FN_REGISTRY.NOTE_SEARCH, 'FOCUS');
      setIsSearchFocused(true);
  };

  const handleToggleFilter = () => {
      const newFilter = filterType === 'all' ? 'archived' : 'all';
      debugService.logAction(UI_REGISTRY.NOTES_BTN_FILTER_ARCHIVE, FN_REGISTRY.NOTE_SEARCH, newFilter.toUpperCase());
      setFilterType(newFilter);
  };

  const handleToggleBatchMode = () => {
      debugService.logAction(UI_REGISTRY.NOTES_BTN_BATCH_MODE, FN_REGISTRY.NOTE_BATCH_ACTION, isSelectionMode ? 'OFF' : 'ON');
      setIsSelectionMode(!isSelectionMode);
      // Don't clear selections when toggling mode off/on immediately, 
      // but if turning off, user usually expects to exit selection flow.
      if (isSelectionMode) setSelectedIds(new Set()); 
  };

  const handleNoteClick = (n: Note) => {
      if (isSelectionMode) {
          toggleSelection(n.id);
      } else {
          debugService.logAction(UI_REGISTRY.NOTES_CARD_ITEM, FN_REGISTRY.NOTE_UPDATE, 'OPEN_EDITOR');
          setActiveNoteId(n.id);
          setViewMode('editor');
      }
  };

  const handleDeleteItem = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      e.preventDefault();
      
      const confirmDelete = window.confirm(
          "⚠️ PERMANENT DELETION\n\nAre you sure you want to delete this note? This action CANNOT be undone."
      );

      if (confirmDelete) {
          if (debugService.logAction(UI_REGISTRY.NOTES_BTN_DELETE_ITEM, FN_REGISTRY.NOTE_DELETE, id)) {
              setNotes(prevNotes => prevNotes.filter(n => n.id !== id));
              if (activeNoteId === id) {
                  setActiveNoteId(null);
                  setViewMode('grid');
              }
          }
      }
  };

  const handleSaveNote = useCallback((title: string, content: string, tasks?: any[]) => {
    if (!activeNoteId) return;
    setNotes(prevNotes => prevNotes.map(n => {
      if (n.id === activeNoteId) {
         return { 
             ...n, 
             content, 
             title: title.trim() || 'Untitled Note', 
             tasks: tasks || n.tasks, 
             updated: new Date().toISOString() 
         };
      }
      return n;
    }));
  }, [activeNoteId, setNotes]);

  const handleBackFromEditor = useCallback(() => {
      // Auto-cleanup empty notes
      if (activeNoteId) {
          const current = notes.find(n => n.id === activeNoteId);
          if (current) {
              const isEmpty = !current.title.trim() && (!current.content || current.content === '<div><br></div>') && (!current.tasks || current.tasks.length === 0);
              if (isEmpty) {
                  setNotes(prev => prev.filter(n => n.id !== activeNoteId));
              }
          }
      }
      setActiveNoteId(null);
      setViewMode('grid');
  }, [activeNoteId, notes, setNotes]);

  const handleDeleteNote = useCallback((id: string) => {
      const confirmDelete = window.confirm(
          "⚠️ PERMANENT DELETION\n\nAre you sure you want to delete this note? This action CANNOT be undone."
      );

      if (confirmDelete) {
          debugService.logAction(UI_REGISTRY.NOTES_BTN_DELETE_ITEM, FN_REGISTRY.NOTE_DELETE, 'EXECUTE', { id });
          setNotes(prevNotes => prevNotes.filter(n => n.id !== id));
          
          if (activeNoteId === id) {
              setActiveNoteId(null);
              setViewMode('grid');
          }
      } else {
          debugService.logAction(UI_REGISTRY.NOTES_BTN_DELETE_ITEM, FN_REGISTRY.NOTE_DELETE, 'CANCELLED');
      }
  }, [activeNoteId, setNotes]);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const batchDelete = useCallback(() => {
    const count = selectedIds.size;
    if (count === 0) return;

    // Capture IDs for the closure
    const idsToDelete = new Set(selectedIds);

    const confirmPurge = window.confirm(
        `⚠️ SYSTEM PURGE PROTOCOL\n\nYou are about to PERMANENTLY DELETE ${count} selected item(s).\n\nThis is a destructive action. Data will be unrecoverable.\n\nProceed with purge?`
    );

    if (confirmPurge) {
        debugService.logAction(UI_REGISTRY.NOTES_BTN_BATCH_MODE, FN_REGISTRY.NOTE_BATCH_ACTION, 'PURGE_EXECUTE', { count });
        setNotes(prevNotes => prevNotes.filter(n => !idsToDelete.has(n.id)));
        setSelectedIds(new Set());
        setIsSelectionMode(false);
    } else {
        debugService.logAction(UI_REGISTRY.NOTES_BTN_BATCH_MODE, FN_REGISTRY.NOTE_BATCH_ACTION, 'PURGE_CANCELLED');
    }
  }, [selectedIds, setNotes]);

  const batchArchive = useCallback(() => {
      debugService.logAction(UI_REGISTRY.NOTES_BTN_BATCH_MODE, FN_REGISTRY.NOTE_BATCH_ACTION, 'ARCHIVE_MANY');
      const selected = notes.filter(n => selectedIds.has(n.id));
      const allArchived = selected.every(n => n.is_archived);
      const targetState = !allArchived;

      setNotes(prevNotes => prevNotes.map(n => selectedIds.has(n.id) ? { ...n, is_archived: targetState } : n));
      setSelectedIds(new Set());
      setIsSelectionMode(false);
  }, [notes, selectedIds, setNotes]);
  
  const batchPin = useCallback(() => {
      debugService.logAction(UI_REGISTRY.NOTES_BTN_BATCH_MODE, FN_REGISTRY.NOTE_BATCH_ACTION, 'PIN_MANY');
      const selected = notes.filter(n => selectedIds.has(n.id));
      const allPinned = selected.every(n => n.is_pinned);
      const targetState = !allPinned;

      setNotes(prevNotes => prevNotes.map(n => selectedIds.has(n.id) ? { ...n, is_pinned: targetState } : n));
      setSelectedIds(new Set());
      setIsSelectionMode(false);
  }, [notes, selectedIds, setNotes]);

  // Robust Select All / Deselect All logic
  const handleSelectAll = useCallback(() => {
      const visibleIds = filteredNotes.map(n => n.id);
      const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
      
      const newSet = new Set(selectedIds);
      
      if (allVisibleSelected) {
          // Deselect only the currently visible ones
          visibleIds.forEach(id => newSet.delete(id));
      } else {
          // Select all currently visible ones
          visibleIds.forEach(id => newSet.add(id));
      }
      setSelectedIds(newSet);
  }, [filteredNotes, selectedIds]);

  return (
    <div className="h-[calc(100dvh-2rem)] md:h-[calc(100vh-2rem)] flex flex-col animate-fade-in bg-noise overflow-hidden">
      
      {/* HEADER SECTION */}
      <div className="px-4 md:px-8 lg:px-12 pt-4 md:pt-8 pb-4 shrink-0 flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 z-20">
          <div className="space-y-3 w-full xl:w-auto">
              <div className="flex items-center gap-3 animate-slide-down">
                  <div className="px-3 py-1 rounded-lg bg-accent/10 border border-accent/20 tech-mono text-[9px] font-black uppercase text-accent tracking-[0.3em]">
                      SECURE_VAULT_v2
                  </div>
                  <span className="text-neutral-500 tech-mono text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                      <Database size={10} /> ENCRYPTED_STORAGE
                  </span>
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black italic tracking-tighter text-black dark:text-white leading-[0.85] uppercase drop-shadow-sm animate-slide-down" style={{ animationDelay: '50ms' }}>
                  SMART <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-purple-500 animate-gradient-text">VAULT</span>
              </h1>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 w-full xl:w-auto animate-slide-down" style={{ animationDelay: '100ms' }}>
               {/* Search Bar */}
               <div className={`relative transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isSearchFocused ? 'flex-1 xl:w-96' : 'flex-1 xl:w-64'}`}>
                  <input 
                     type="text" 
                     value={searchQuery}
                     onChange={e => setSearchQuery(e.target.value)}
                     onFocus={handleSearchFocus}
                     onBlur={() => setIsSearchFocused(false)}
                     placeholder={isSearchFocused ? "SEARCH VAULT..." : "SEARCH..."}
                     className="w-full h-12 bg-white dark:bg-[#0f0f11] border border-black/5 dark:border-white/10 rounded-xl pl-11 pr-4 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-accent/50 focus:shadow-[0_0_30px_-10px_var(--accent-glow)] transition-all placeholder:text-neutral-500"
                  />
                  <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isSearchFocused ? 'text-accent' : 'text-neutral-400'}`} size={16} />
                  {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black dark:hover:text-white">
                          <X size={12} />
                      </button>
                  )}
               </div>

               {/* Action Buttons */}
               <div className="flex items-center gap-2">
                   <button 
                     onClick={handleToggleBatchMode}
                     className={`w-12 h-12 flex items-center justify-center rounded-xl border transition-all ${isSelectionMode ? 'bg-accent text-black border-accent shadow-[0_0_15px_var(--accent-glow)]' : 'bg-white dark:bg-[#0f0f11] border-black/5 dark:border-white/10 text-neutral-500 hover:text-black dark:hover:text-white'}`}
                     title="Batch Select"
                   >
                      <CheckSquare size={18} />
                   </button>
                   
                   <button 
                     onClick={handleToggleFilter}
                     className={`w-12 h-12 flex items-center justify-center rounded-xl border transition-all ${filterType === 'archived' ? 'bg-orange-500 text-white border-orange-500 shadow-md' : 'bg-white dark:bg-[#0f0f11] border-black/5 dark:border-white/10 text-neutral-500 hover:text-black dark:hover:text-white'}`}
                     title={filterType === 'all' ? "View Archive" : "Back to Active"}
                   >
                      {filterType === 'archived' ? <Archive size={18} fill="currentColor" /> : <Archive size={18} />}
                   </button>

                   <button 
                    onClick={handleCreateNote}
                    className="h-12 px-6 bg-black dark:bg-white text-white dark:text-black rounded-xl flex items-center gap-3 font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-xl group border border-transparent hover:border-accent/50"
                  >
                     <Plus size={16} className="group-hover:rotate-90 transition-transform" /> <span className="hidden md:inline">CREATE</span>
                  </button>
               </div>
          </div>
      </div>

      {/* FILTER BAR INDICATOR (If Archive or Search active) */}
      {(filterType === 'archived' || searchQuery) && (
          <div className="px-4 md:px-8 lg:px-12 pb-4 flex items-center gap-2 animate-fade-in">
              <div className="h-[1px] bg-black/5 dark:bg-white/10 flex-1"></div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-white/5 border border-black/5 dark:border-white/5 text-[9px] font-black uppercase tracking-widest text-neutral-500">
                  <Filter size={10} /> 
                  {filterType === 'archived' && <span>ARCHIVE_MODE</span>}
                  {filterType === 'archived' && searchQuery && <span>+</span>}
                  {searchQuery && <span>SEARCH_RESULTS</span>}
                  <span className="ml-1 text-accent">{filteredNotes.length} ITEMS</span>
              </div>
              <div className="h-[1px] bg-black/5 dark:bg-white/10 flex-1"></div>
          </div>
      )}

      {/* CONTENT GRID */}
      <div className="flex-1 overflow-y-auto custom-scroll px-4 md:px-8 lg:px-12 pb-32">
          {filteredNotes.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-neutral-400 opacity-40 gap-6 animate-fade-in">
                  <div className="w-32 h-32 rounded-[40px] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center rotate-3">
                      {filterType === 'archived' ? <Archive size={48} strokeWidth={1} /> : <FolderOpen size={48} strokeWidth={1} />}
                  </div>
                  <div className="text-center space-y-2">
                      <p className="text-xs font-black uppercase tracking-[0.3em]">NO_RECORDS_FOUND</p>
                      <p className="text-[10px] font-mono">Vault sector is empty.</p>
                  </div>
              </div>
          ) : (
              <div className="columns-1 md:columns-2 xl:columns-3 gap-6 space-y-6 pb-20">
                  {filteredNotes.map((n) => {
                      const isSelected = selectedIds.has(n.id);
                      const completedTasks = n.tasks?.filter(t => t.isCompleted).length || 0;
                      const totalTasks = n.tasks?.length || 0;
                      const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

                      return (
                          <div 
                              key={n.id} 
                              onClick={() => handleNoteClick(n)} 
                              className={`
                                  break-inside-avoid relative p-6 rounded-[32px] cursor-pointer transition-all duration-500 ease-out group
                                  border hover:-translate-y-2
                                  ${isSelected 
                                      ? 'bg-accent/10 border-accent shadow-[0_0_40px_-10px_var(--accent-glow)]' 
                                      : 'bg-white/80 dark:bg-[#0f0f11]/80 backdrop-blur-md border-black/5 dark:border-white/5 hover:border-accent/30 hover:shadow-xl'
                                  }
                              `}
                          >
                              {/* Selection Circle */}
                              {isSelectionMode && (
                                  <div className={`absolute top-6 right-6 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all z-20 ${isSelected ? 'bg-accent border-accent text-black' : 'border-neutral-400 bg-transparent'}`}>
                                      {isSelected && <CheckSquare size={12} strokeWidth={3} />}
                                  </div>
                              )}

                              {/* Pin Badge */}
                              {n.is_pinned && !isSelectionMode && (
                                  <div className="absolute top-6 right-6 text-accent animate-pulse">
                                      <Pin size={16} fill="currentColor" />
                                  </div>
                              )}

                              {/* Card Content */}
                              <div className="space-y-4">
                                  {/* Icon & Title */}
                                  <div className="flex items-start gap-4">
                                      <div className={`
                                          w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500 border
                                          ${isSelected ? 'bg-accent text-black border-transparent' : 'bg-zinc-100 dark:bg-white/5 border-black/5 dark:border-white/5 text-neutral-400 group-hover:text-accent group-hover:bg-accent/10 group-hover:border-accent/20'}
                                      `}>
                                          <FileText size={20} strokeWidth={2} />
                                      </div>
                                      <div className="flex-1 min-w-0 pt-1">
                                          <h3 className={`text-lg font-black uppercase tracking-tight truncate leading-none mb-1 ${isSelected ? 'text-accent' : 'text-black dark:text-white group-hover:text-accent transition-colors'}`}>
                                              {n.title || 'UNTITLED_ENTRY'}
                                          </h3>
                                          <div className="flex items-center gap-2 text-[8px] tech-mono font-bold text-neutral-400 uppercase tracking-wider">
                                              <span>{new Date(n.updated).toLocaleDateString()}</span>
                                              <span className="w-1 h-1 rounded-full bg-neutral-600"></span>
                                              <span>ID: {n.id.slice(0,4)}</span>
                                          </div>
                                      </div>
                                  </div>

                                  {/* Preview */}
                                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400 font-medium leading-relaxed line-clamp-3">
                                      {n.content.replace(/<[^>]*>/g, ' ').slice(0, 150) || "No preview data available."}
                                  </p>

                                  {/* Task Bar */}
                                  {totalTasks > 0 && (
                                      <div className="space-y-1.5 pt-1">
                                          <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-neutral-500">
                                              <span className="flex items-center gap-1"><ListTodo size={10} /> TASKS</span>
                                              <span>{Math.round(taskProgress)}%</span>
                                          </div>
                                          <div className="h-1.5 w-full bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                                              <div className="h-full bg-accent transition-all duration-700" style={{ width: `${taskProgress}%` }} />
                                          </div>
                                      </div>
                                  )}

                                  {/* Tags & Badges */}
                                  <div className="flex flex-wrap gap-2 pt-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                      {n.tags?.map((tag, i) => (
                                          <span key={i} className="px-2 py-1 rounded bg-zinc-100 dark:bg-white/5 border border-black/5 dark:border-white/5 text-[8px] font-bold uppercase text-neutral-500 flex items-center gap-1">
                                              <Hash size={8} /> {tag}
                                          </span>
                                      ))}
                                      {n.content.length > 500 && (
                                          <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[8px] font-bold uppercase">LONG_READ</span>
                                      )}
                                  </div>
                              </div>

                              {/* Hover Action Overlay (Desktop) - Quick Delete */}
                              {!isSelectionMode && (
                                  <div className="absolute top-6 right-6 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0 hidden md:flex z-20">
                                      {!n.is_pinned && (
                                        <button 
                                            onClick={(e) => handleDeleteItem(e, n.id)}
                                            className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center border border-red-500/20 shadow-sm transition-all"
                                            title="Delete Note"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                      )}
                                      <div className="w-8 h-8 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-sm">
                                          <ArrowUpRight size={14} />
                                      </div>
                                  </div>
                              )}
                          </div>
                      );
                  })}
              </div>
          )}
      </div>

      {/* EDITOR OVERLAY */}
      <div className={`
          fixed inset-0 z-[1500] bg-zinc-50 dark:bg-[#050505] transition-all duration-500 ease-[cubic-bezier(0.2,0,0,1)] flex flex-col
          ${viewMode === 'editor' ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}
      `}>
          {activeNoteId && (
              <div className="flex flex-col h-full max-w-[1400px] mx-auto w-full p-0 md:p-6 lg:p-8">
                  <div className="flex-1 bg-white dark:bg-[#0f0f11] rounded-none md:rounded-[48px] border-x-0 md:border border-black/5 dark:border-white/5 shadow-2xl overflow-hidden relative flex flex-col md:ring-1 ring-white/10">
                      
                      {/* Integrated Advanced Editor with Back Navigation passed down */}
                      <AdvancedEditor 
                          key={activeNoteId}
                          initialContent={activeNote?.content || ''}
                          initialTitle={activeNote?.title || ''}
                          initialTasks={activeNote?.tasks || []}
                          onSave={handleSaveNote}
                          onDelete={() => handleDeleteNote(activeNoteId!)}
                          onBack={handleBackFromEditor}
                          language="en"
                          fontSize={editorFontSize}
                          onFontSizeChange={setEditorFontSize} 
                      />
                  </div>
              </div>
          )}
      </div>

      <NoteBatchActions 
          isSelectionMode={isSelectionMode}
          selectedCount={selectedIds.size}
          totalVisibleCount={filteredNotes.length}
          isViewingArchive={filterType === 'archived'}
          selectedNotes={notes.filter(n => selectedIds.has(n.id))}
          onSelectAll={handleSelectAll}
          onDeselectAll={() => setSelectedIds(new Set())}
          onDeleteSelected={batchDelete}
          onArchiveSelected={batchArchive}
          onPinSelected={batchPin}
          onCancel={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }}
      />
    </div>
  );
};
