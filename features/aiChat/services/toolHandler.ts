
import { v4 as uuidv4 } from 'uuid';
import { type Note } from '../../../types';
import { generateImage } from '../../../services/geminiService';

export const executeNeuralTool = async (
    fc: any, 
    notes: Note[], 
    setNotes: (notes: Note[]) => void
): Promise<string> => {
    const { name, args } = fc;
    
    if (name === 'manage_note') {
        const { action, id, title, content, tags, taskContent, taskAction, taskDueDate } = args;
        let updatedNotes = [...notes];

        if (action === 'CREATE') {
            const newNote: Note = {
                id: uuidv4(),
                title: title || 'Brain Dump',
                content: content || '',
                tags: tags || [],
                created: new Date().toISOString(),
                updated: new Date().toISOString(),
                tasks: []
            };
            setNotes([newNote, ...updatedNotes]);
            return `SUCCESS: Catatan baru "${newNote.title}" telah dibuat di Vault.`;
        }

        if (action === 'UPDATE' && id) {
            const noteExists = updatedNotes.some(n => n.id === id);
            if (!noteExists) return `ERROR: Node ${id} tidak ditemukan.`;

            updatedNotes = updatedNotes.map(n => {
                if (n.id === id) {
                    const noteTasks = [...(n.tasks || [])];
                    if (taskAction === 'ADD' && taskContent) {
                        noteTasks.push({ id: uuidv4(), text: taskContent, isCompleted: false, dueDate: taskDueDate });
                    }
                    return { 
                        ...n, 
                        title: title || n.title, 
                        content: content || n.content, 
                        tasks: noteTasks, 
                        updated: new Date().toISOString() 
                    };
                }
                return n;
            });
            setNotes(updatedNotes);
            return `SUCCESS: Sinkronisasi data ke node ${id} selesai.`;
        }

        if (action === 'DELETE' && id) {
            setNotes(updatedNotes.filter(n => n.id !== id));
            return `SUCCESS: Node data ${id} telah dihapus permanen.`;
        }
    }

    if (name === 'generate_visual') {
        const imgUrl = await generateImage(args.prompt);
        return imgUrl ? `IMAGE_GENERATED: ![Visual](${imgUrl})` : "ERROR: Gagal mensintesis visual.";
    }

    return "UNKNOWN_PROTOCOL.";
};
