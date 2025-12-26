
import { v4 as uuidv4 } from 'uuid';
import { type Note } from '../../../types';
import { generateImage, KEY_MANAGER } from '../../../services/geminiService';
import { executeMechanicTool } from '../../mechanic/mechanicTools';
import { GoogleGenAI } from '@google/genai';

/**
 * Proxy Search Agent.
 */
async function performGeminiBackedSearch(query: string): Promise<string> {
    const apiKey = KEY_MANAGER.getKey('GEMINI');
    if (!apiKey) return "ERROR: No search uplink available (Gemini Key missing).";

    try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: { parts: [{ text: `Search Query: "${query}". \n\nGoal: Provide a comprehensive answer, summary, or lyrics based on real-time Google Search results. If it's lyrics, provide the full lyrics. If it's news, provide the latest summary.` }] },
            config: {
                tools: [{ googleSearch: {} }] 
            }
        });

        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
            ?.map((c: any) => c.web?.title ? `[${c.web.title}](${c.web.uri})` : '')
            .filter(Boolean)
            .join(', ');

        const text = response.text || "No results found.";
        return sources ? `${text}\n\nSources: ${sources}` : text;

    } catch (error: any) {
        console.error("Deep Search Proxy Failed:", error);
        return `SEARCH_FAILED: ${error.message}`;
    }
}

export const executeNeuralTool = async (
    fc: any, 
    notes: Note[], 
    setNotes: (notes: Note[]) => void
): Promise<string> => {
    const { name, args } = fc;
    
    // --- 1. NOTE MANAGEMENT ---
    if (name === 'manage_note') {
        const { action, id, title, content, appendContent, tags, taskContent, taskAction, taskDueDate } = args;
        let updatedNotes = [...notes];

        if (action === 'CREATE') {
            const newNote: Note = {
                id: uuidv4(),
                title: title || 'New Entry',
                content: content || '',
                tags: tags || [],
                created: new Date().toISOString(),
                updated: new Date().toISOString(),
                tasks: [],
                is_pinned: false,
                is_archived: false
            };
            setNotes([newNote, ...updatedNotes]);
            return `SUCCESS: Catatan baru "${newNote.title}" telah dibuat. ID: ${newNote.id}`;
        }

        if (action === 'UPDATE' && id) {
            const noteExists = updatedNotes.some(n => n.id === id);
            if (!noteExists) return `ERROR: Node ${id} tidak ditemukan.`;

            let actionStatus = "Updated";

            updatedNotes = updatedNotes.map(n => {
                if (n.id === id) {
                    let noteTasks = [...(n.tasks || [])];
                    
                    if (taskAction === 'ADD' && taskContent) {
                        noteTasks.push({ id: uuidv4(), text: taskContent, isCompleted: false, dueDate: taskDueDate });
                        actionStatus = "Task added";
                    } else if (taskAction === 'TOGGLE' && taskContent) {
                        const targetTask = noteTasks.find(t => t.text.toLowerCase().includes(taskContent.toLowerCase()));
                        if (targetTask) {
                            targetTask.isCompleted = !targetTask.isCompleted;
                            actionStatus = "Task toggled";
                        }
                    }

                    return { 
                        ...n, 
                        title: title || n.title, 
                        content: content || n.content, 
                        tags: tags || n.tags,
                        tasks: noteTasks, 
                        updated: new Date().toISOString() 
                    };
                }
                return n;
            });
            setNotes(updatedNotes);
            return `SUCCESS: ${actionStatus} pada node ${id}.`;
        }

        if (action === 'APPEND' && id && appendContent) {
            const noteIndex = updatedNotes.findIndex(n => n.id === id);
            if (noteIndex === -1) return `ERROR: Node ${id} tidak ditemukan.`;
            
            const note = updatedNotes[noteIndex];
            const newContent = note.content ? `${note.content}\n\n${appendContent}` : appendContent;
            
            updatedNotes[noteIndex] = {
                ...note,
                content: newContent,
                updated: new Date().toISOString()
            };
            setNotes(updatedNotes);
            return `SUCCESS: Konten ditambahkan ke catatan "${note.title}".`;
        }

        if (action === 'DELETE' && id) {
            setNotes(updatedNotes.filter(n => n.id !== id));
            return `SUCCESS: Node data ${id} telah dihapus permanen.`;
        }
    }

    // --- 2. NOTE RETRIEVAL (RAG Lite) ---
    if (name === 'search_notes') {
        const query = args.query.toLowerCase();
        const matches = notes.filter(n => 
            n.title.toLowerCase().includes(query) || 
            n.content.toLowerCase().includes(query) ||
            n.tags?.some(t => t.toLowerCase().includes(query))
        ).slice(0, 5); // Limit results to top 5

        if (matches.length === 0) return "SEARCH_RESULT: Tidak ada catatan yang cocok.";

        const resultStr = matches.map(n => 
            `- ID: ${n.id}\n  Title: ${n.title}\n  Snippet: ${n.content.slice(0, 100)}...`
        ).join('\n');

        return `SEARCH_RESULT:\n${resultStr}\n\n(Gunakan tool 'read_note' dengan ID untuk membaca selengkapnya)`;
    }

    if (name === 'read_note') {
        const note = notes.find(n => n.id === args.id);
        if (!note) return "ERROR: Catatan tidak ditemukan.";
        return `NOTE_CONTENT (ID: ${note.id}):\nTitle: ${note.title}\nFull Content:\n${note.content}\nTags: ${note.tags?.join(', ')}`;
    }

    // --- 3. DEEP SEARCH (The Bridge) ---
    if (name === 'deep_search') {
        return await performGeminiBackedSearch(args.query);
    }

    // --- 4. VISUAL GENERATION ---
    if (name === 'generate_visual') {
        const imgUrl = await generateImage(args.prompt);
        return imgUrl ? `!!IMG:[${args.prompt}]!!` : "ERROR: Gagal mensintesis visual.";
    }

    // --- 5. SYSTEM MECHANIC ---
    if (name === 'system_mechanic_tool') {
        return await executeMechanicTool(fc);
    }

    return "UNKNOWN_PROTOCOL.";
};
