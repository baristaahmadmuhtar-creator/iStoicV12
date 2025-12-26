
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
            return `SUCCESS: Created note "${newNote.title}" (ID: ${newNote.id}).`;
        }

        if (action === 'UPDATE' && id) {
            const noteIndex = updatedNotes.findIndex(n => n.id === id);
            if (noteIndex === -1) return `ERROR: Note ID ${id} not found.`;

            let actionStatus = "Updated";
            const note = updatedNotes[noteIndex];
            
            // Task Logic
            let noteTasks = [...(note.tasks || [])];
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

            // Safe Merge: Only update fields if provided in args
            updatedNotes[noteIndex] = {
                ...note,
                title: title !== undefined ? title : note.title,
                content: content !== undefined ? content : note.content,
                tags: tags !== undefined ? tags : note.tags,
                tasks: noteTasks,
                updated: new Date().toISOString()
            };
            
            setNotes(updatedNotes);
            return `SUCCESS: ${actionStatus} on note "${updatedNotes[noteIndex].title}".`;
        }

        if (action === 'APPEND' && id && appendContent) {
            const noteIndex = updatedNotes.findIndex(n => n.id === id);
            if (noteIndex === -1) return `ERROR: Note ID ${id} not found.`;
            
            const note = updatedNotes[noteIndex];
            // Intelligent spacing for append
            const newContent = note.content 
                ? `${note.content}\n\n${appendContent}` 
                : appendContent;
            
            updatedNotes[noteIndex] = {
                ...note,
                content: newContent,
                updated: new Date().toISOString()
            };
            setNotes(updatedNotes);
            return `SUCCESS: Appended content to "${note.title}".`;
        }

        if (action === 'DELETE' && id) {
            setNotes(updatedNotes.filter(n => n.id !== id));
            return `SUCCESS: Note ${id} deleted permanently.`;
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

        if (matches.length === 0) return "SEARCH_RESULT: No matching notes found.";

        const resultStr = matches.map(n => 
            `- ID: ${n.id}\n  Title: ${n.title}\n  Snippet: ${n.content.slice(0, 100).replace(/\n/g, ' ')}...`
        ).join('\n');

        return `SEARCH_RESULT:\n${resultStr}\n\n(Use 'read_note' with ID to see full content)`;
    }

    if (name === 'read_note') {
        const note = notes.find(n => n.id === args.id);
        if (!note) return "ERROR: Note ID not found.";
        
        // Clean HTML tags for AI consumption if content contains HTML
        const cleanContent = note.content.replace(/<[^>]*>/g, '');
        const tasksStr = note.tasks?.map(t => `[${t.isCompleted ? 'x' : ' '}] ${t.text}`).join('\n') || "No tasks";

        return JSON.stringify({
            id: note.id,
            title: note.title,
            content: cleanContent,
            tags: note.tags,
            tasks: tasksStr,
            last_updated: note.updated
        }, null, 2);
    }

    // --- 3. DEEP SEARCH (The Bridge) ---
    if (name === 'deep_search') {
        return await performGeminiBackedSearch(args.query);
    }

    // --- 4. VISUAL GENERATION ---
    if (name === 'generate_visual') {
        const imgUrl = await generateImage(args.prompt);
        return imgUrl ? `!!IMG:[${args.prompt}]!!` : "ERROR: Failed to synthesize visual.";
    }

    // --- 5. SYSTEM MECHANIC ---
    if (name === 'system_mechanic_tool') {
        return await executeMechanicTool(fc);
    }

    return "UNKNOWN_PROTOCOL.";
};
