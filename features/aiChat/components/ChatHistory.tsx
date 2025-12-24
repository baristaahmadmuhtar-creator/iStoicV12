
import React, { useState, useMemo } from 'react';
import { X, History, Trash2, Plus, Search, Edit3, Check, Calendar, Clock, Sparkles, MessageSquare, Flame, Brain } from 'lucide-react';
import { type ChatThread } from '../../../types';

interface ChatHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  threads: ChatThread[];
  activeThreadId: string | null;
  onSelectThread: (id: string) => void;
  onDeleteThread: (id: string) => void;
  onRenameThread: (id: string, newTitle: string) => void;
  onNewChat: () => void;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
  isOpen,
  onClose,
  threads,
  activeThreadId,
  onSelectThread,
  onDeleteThread,
  onRenameThread,
  onNewChat
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const filteredThreads = useMemo(() => {
    return threads.filter(t => 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.messages.some(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [threads, searchQuery]);

  const groups = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const result: Record<string, ChatThread[]> = {
      'TODAY': [],
      'YESTERDAY': [],
      'LAST 7 DAYS': [],
      'OLDER': []
    };

    filteredThreads.forEach(t => {
      const date = new Date(t.updated);
      if (date >= today) result['TODAY'].push(t);
      else if (date >= yesterday) result['YESTERDAY'].push(t);
      else if (date >= lastWeek) result['LAST 7 DAYS'].push(t);
      else result['OLDER'].push(t);
    });

    return result;
  }, [filteredThreads]);

  const handleStartRename = (e: React.MouseEvent, t: ChatThread) => {
    e.stopPropagation();
    setEditingId(t.id);
    setEditValue(t.title);
  };

  const handleCommitRename = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (editingId && editValue.trim()) {
      onRenameThread(editingId, editValue.trim().toUpperCase());
    }
    setEditingId(null);
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[390] animate-fade-in transition-all" 
        onClick={onClose} 
      />
      <div className="fixed inset-y-0 right-0 w-[85%] md:w-80 bg-white dark:bg-[#0a0a0b] border-l border-black/10 dark:border-white/10 z-[400] transform transition-transform duration-500 ease-[cubic-bezier(0.2,0,0,1)] shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header - Optimized Compact */}
        <div className="p-5 md:p-6 border-b border-black/5 dark:border-white/10 bg-zinc-50 dark:bg-black/40 backdrop-blur-xl shrink-0">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <History size={18} className="text-accent" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400 leading-none">CHAT_ARCHIVE</h3>
            </div>
            <button onClick={onClose} className="p-2 text-neutral-400 hover:text-black dark:hover:text-white transition-all">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-3">
            <button 
              onClick={() => { onNewChat(); onClose(); }}
              className="w-full py-3.5 bg-accent text-on-accent rounded-xl flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-accent/20"
            >
              <Plus size={16} /> NEW_NEURAL_LINK
            </button>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={12} />
              <input 
                type="text"
                placeholder="CARI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-accent/30 rounded-xl py-3 pl-10 pr-4 text-[10px] tech-mono font-black uppercase tracking-widest text-black dark:text-white focus:outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-8 pb-32">
          {(Object.entries(groups) as [string, ChatThread[]][]).map(([label, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={label} className="animate-fade-in">
                <p className="text-[8px] font-black text-neutral-500 tracking-[0.3em] uppercase mb-4 pl-1">{label}</p>
                
                <div className="space-y-2">
                  {items.map(t => {
                    const isActive = activeThreadId === t.id;
                    const isEditing = editingId === t.id;
                    
                    return (
                      <div 
                        key={t.id}
                        onClick={() => { if (!isEditing) { onSelectThread(t.id); if(window.innerWidth < 768) onClose(); } }}
                        className={`group relative p-4 rounded-xl border transition-all duration-300 ${
                          isActive 
                          ? 'bg-accent/10 border-accent/20 text-accent' 
                          : 'bg-transparent border-transparent text-neutral-500 hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-accent text-on-accent' : 'bg-black/5 dark:bg-white/5 text-neutral-400'}`}>
                             {t.persona === 'melsa' ? <Flame size={14} /> : <Brain size={14} />}
                          </div>

                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <form onSubmit={handleCommitRename} className="flex items-center gap-2">
                                <input 
                                  autoFocus
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="bg-transparent border-b border-accent w-full text-[10px] font-black uppercase outline-none"
                                />
                              </form>
                            ) : (
                              <p className={`text-[10px] font-black uppercase italic tracking-tighter truncate ${isActive ? 'text-accent' : 'text-black dark:text-white'}`}>
                                {t.title}
                              </p>
                            )}
                          </div>

                          <button 
                            onClick={(e) => { e.stopPropagation(); onDeleteThread(t.id); }} 
                            className="opacity-0 group-hover:opacity-100 p-2 text-neutral-400 hover:text-red-500 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-black/5 dark:border-white/10 bg-zinc-50 dark:bg-black/60 text-center">
           <p className="text-[7px] tech-mono text-neutral-400 uppercase tracking-widest opacity-60">"Hambatan adalah jalan."</p>
        </div>
      </div>
    </>
  );
};
