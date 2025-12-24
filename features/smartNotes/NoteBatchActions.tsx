
import { Trash2, X, Archive, FileJson, Bookmark, ArchiveRestore, ShieldAlert } from 'lucide-react';
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
    isViewingArchive,
    selectedNotes,
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
            {/* Floating Island Container */}
            <div className={`
                fixed z-[1100] transition-all duration-500 cubic-bezier(0.2, 0, 0, 1) left-1/2 -translate-x-1/2
                
                /* MOBILE LAYOUT: Bottom Floating Bar */
                bottom-6 w-[90%] md:w-auto md:min-w-[400px]
                
                ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-[200%] opacity-0 pointer-events-none'}
            `}>
                <div className="bg-[#0c0c0e]/90 backdrop-blur-xl border border-white/10 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] rounded-[24px] p-2 flex items-center gap-2 ring-1 ring-white/5">
                    
                    {/* Counter Badge */}
                    <div className="bg-white text-black px-4 py-3 rounded-2xl flex flex-col items-center justify-center min-w-[60px]">
                        <span className="text-xl font-black italic leading-none">{selectedCount}</span>
                        <span className="text-[7px] font-black uppercase tracking-wider">NODES</span>
                    </div>

                    {/* Divider */}
                    <div className="w-[1px] h-8 bg-white/10 mx-1"></div>

                    {/* Actions Row */}
                    <div className="flex flex-1 justify-center gap-1">
                        <ActionButton icon={<Bookmark size={18} />} label="PIN" onClick={onPinSelected} />
                        <ActionButton icon={isViewingArchive ? <ArchiveRestore size={18} /> : <Archive size={18} />} label={isViewingArchive ? 'RESTORE' : 'ARCHIVE'} onClick={onArchiveSelected} />
                        <ActionButton icon={<FileJson size={18} />} label="EXPORT" onClick={handleExport} />
                        <div className="w-[1px] h-8 bg-white/10 mx-1"></div>
                        <ActionButton icon={<ShieldAlert size={18} />} label="PURGE" onClick={onDeleteSelected} variant="danger" />
                    </div>

                    {/* Close Button */}
                    <button 
                        onClick={onCancel} 
                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-all ml-1"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>
            
            {/* Dim Overlay */}
            <div 
                onClick={onCancel}
                className={`fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[1050] transition-opacity duration-500 ${isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            ></div>
        </>
    );
};

const ActionButton: React.FC<{ icon: React.ReactNode, label: string, onClick: () => void, variant?: 'normal' | 'danger' }> = ({ icon, label, onClick, variant = 'normal' }) => (
    <button 
        onClick={onClick}
        className={`relative w-12 h-12 md:w-14 md:h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-300 group overflow-hidden ${
            variant === 'danger' 
            ? 'text-red-500 hover:bg-red-500 hover:text-white' 
            : 'text-neutral-400 hover:text-black hover:bg-white'
        }`}
        title={label}
    >
        <div className="relative z-10 transition-transform duration-300 group-hover:scale-110">{icon}</div>
        <span className={`text-[6px] font-black uppercase tracking-[0.1em] hidden md:block opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0`}>{label}</span>
    </button>
);
