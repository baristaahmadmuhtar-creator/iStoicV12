
import { Trash2, X, CheckSquare, Square, Archive, Layers, ShieldAlert, FileJson, Bookmark, ArchiveRestore, Download } from 'lucide-react';
import React from 'react';
import { type Note } from '../../types';

interface NoteBatchActionsProps {
    selectedCount: number;
    totalCount: number;
    isViewingArchive: boolean;
    selectedNotes: Note[];
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onDeleteSelected: () => void;
    onArchiveSelected: () => void;
    onPinSelected: () => void;
    onCancel: () => void;
}

export const NoteBatchActions: React.FC<NoteBatchActionsProps> = ({
    selectedCount,
    totalCount,
    isViewingArchive,
    selectedNotes,
    onSelectAll,
    onDeselectAll,
    onDeleteSelected,
    onArchiveSelected,
    onPinSelected,
    onCancel
}) => {
    // Determine if actions panel should be visible
    const isVisible = selectedCount > 0;

    const handleExport = () => {
        if (selectedNotes.length === 0) return;
        const dataStr = JSON.stringify(selectedNotes, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `istoic_vault_export_${new Date().toISOString().slice(0,10)}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    return (
        <>
            {/* Responsive Panel Container 
                Z-INDEX UPDATE: z-[1100] ensures it sits ABOVE the MobileNav (z-900) 
            */}
            <div className={`
                fixed z-[1100] bg-[#f8f9fa]/95 dark:bg-[#080809]/95 backdrop-blur-2xl border-black/5 dark:border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.4)] transition-all duration-500 cubic-bezier(0.2, 0, 0, 1)
                
                /* MOBILE LAYOUT: Bottom Contextual Bar */
                inset-x-0 bottom-0 border-t flex flex-row items-center justify-between p-3 pb-safe-offset-2
                ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-[120%] opacity-0 pointer-events-none'}

                /* DESKTOP LAYOUT: Right Vertical Sidebar */
                md:inset-y-0 md:right-0 md:left-auto md:bottom-auto md:w-24 md:h-full md:border-l md:border-t-0 md:flex-col md:p-0
                md:${isVisible ? 'translate-x-0' : 'translate-x-full'}
            `}>
                
                {/* Header / Counter */}
                <div className="px-4 py-2 md:p-6 md:border-b md:border-black/5 md:dark:border-white/10 flex flex-col items-center gap-1 md:bg-accent/5 min-w-[80px]">
                    <div className="flex items-center gap-2 md:flex-col">
                        <p className="text-2xl md:text-3xl font-black text-accent leading-none italic">{selectedCount}</p>
                        <p className="tech-mono text-[8px] md:text-[7px] font-black text-neutral-500 uppercase tracking-[0.2em]">SELECTED</p>
                    </div>
                </div>

                {/* Actions Grid */}
                <div className="flex-1 flex flex-row md:flex-col items-center justify-center gap-3 md:gap-6 px-2 overflow-x-auto md:overflow-y-auto no-scrollbar md:py-6 w-full">
                    <ActionButton icon={<Bookmark size={20} />} label="PIN" onClick={onPinSelected} />
                    <ActionButton icon={isViewingArchive ? <ArchiveRestore size={20} /> : <Archive size={20} />} label={isViewingArchive ? 'RESTORE' : 'ARCHIVE'} onClick={onArchiveSelected} />
                    <ActionButton icon={<FileJson size={20} />} label="EXPORT" onClick={handleExport} />
                    
                    {/* Divider */}
                    <div className="w-[1px] h-8 bg-black/10 dark:bg-white/10 mx-2 md:w-8 md:h-[1px] md:my-2 md:mx-0"></div>
                    
                    <ActionButton icon={<ShieldAlert size={20} />} label="PURGE" onClick={onDeleteSelected} variant="danger" />
                </div>

                {/* Footer / Close */}
                <div className="p-0 md:p-4 md:border-t md:border-black/5 md:dark:border-white/5 md:bg-black/5 md:dark:bg-white/5 md:pb-8">
                    <button 
                        onClick={onCancel} 
                        className="w-10 h-10 md:w-full md:h-auto md:py-4 rounded-xl bg-transparent hover:bg-black/5 dark:hover:bg-white/10 text-neutral-400 hover:text-black dark:hover:text-white transition-all flex flex-col items-center justify-center gap-2 group"
                        title="Cancel Selection"
                    >
                        <X size={22} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span className="text-[7px] font-black uppercase tracking-widest hidden md:block opacity-60 group-hover:opacity-100">CANCEL</span>
                    </button>
                </div>
            </div>
            
            {/* Dim Overlay for Desktop (Optional focus mode) */}
            <div 
                onClick={onCancel}
                className={`fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[1050] transition-opacity duration-500 ${isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            ></div>

            <style>{`
                .pb-safe-offset-2 {
                    padding-bottom: calc(env(safe-area-inset-bottom) + 12px);
                }
            `}</style>
        </>
    );
};

const ActionButton: React.FC<{ icon: React.ReactNode, label: string, onClick: () => void, variant?: 'normal' | 'danger' }> = ({ icon, label, onClick, variant = 'normal' }) => (
    <button 
        onClick={onClick}
        className={`relative w-12 h-12 md:w-14 md:h-14 md:rounded-2xl rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-300 group overflow-hidden ${
            variant === 'danger' 
            ? 'text-red-500 hover:bg-red-500 hover:text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]' 
            : 'text-neutral-500 dark:text-neutral-400 hover:text-accent hover:bg-accent/10 dark:hover:bg-accent/5 hover:scale-105'
        }`}
        title={label}
    >
        <div className="relative z-10">{icon}</div>
        <span className={`text-[6px] md:text-[5px] font-black uppercase tracking-[0.2em] hidden md:block opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0`}>{label}</span>
    </button>
);
