
import { useState, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import useLocalStorage from '../../../hooks/useLocalStorage';
import { type ChatThread, type ChatMessage, type Note } from '../../../types';
import { MODEL_CATALOG, MELSA_KERNEL } from '../../../services/melsaKernel';
import { STOIC_KERNEL } from '../../../services/stoicKernel';
import { executeNeuralTool } from '../services/toolHandler';
import { speakWithMelsa } from '../../../services/elevenLabsService';

export const useChatLogic = (notes: Note[], setNotes: (notes: Note[]) => void) => {
    const [threads, setThreads] = useLocalStorage<ChatThread[]>('chat_threads', []);
    const [activeThreadId, setActiveThreadId] = useLocalStorage<string | null>('active_thread_id', null);
    
    // Persist Settings
    const [isVaultSynced, setIsVaultSynced] = useLocalStorage<boolean>('is_vault_synced', false);
    const [isAutoSpeak, setIsAutoSpeak] = useLocalStorage<boolean>('is_auto_speak', false);
    
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Memoize active thread to prevent unnecessary re-renders
    const activeThread = useMemo(() => 
        threads.find(t => t.id === activeThreadId) || null, 
    [threads, activeThreadId]);

    const activeModel = useMemo(() => {
        const id = activeThread?.model_id || 'gemini-3-pro-preview';
        return MODEL_CATALOG.find(m => m.id === id) || MODEL_CATALOG[0];
    }, [activeThread]);

    const personaMode = activeThread?.persona || 'melsa';

    const handleNewChat = useCallback(async (persona: 'melsa' | 'stoic' = 'melsa') => {
        const welcome = persona === 'melsa' 
            ? "⚡ **MELSA PLATINUM ONLINE.**\n\n*Halo Sayang, aku sudah siap. Apa yang bisa kubantu hari ini?*" 
            : "🧠 **STOIC_LOGIC ACTIVE.**\n\nMari kita bedah masalah Anda dengan akal budi dan ketenangan.";
        
        const newThread: ChatThread = {
            id: uuidv4(),
            title: `SESSION_${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            persona,
            model_id: 'gemini-3-pro-preview',
            messages: [{ id: uuidv4(), role: 'model', text: welcome, metadata: { status: 'success', model: 'System' } }],
            updated: new Date().toISOString()
        };
        
        setThreads(prev => [newThread, ...prev]);
        setActiveThreadId(newThread.id);
    }, [setActiveThreadId, setThreads]);

    const renameThread = useCallback(async (id: string, newTitle: string) => {
        setThreads(prev => prev.map(t => t.id === id ? { ...t, title: newTitle, updated: new Date().toISOString() } : t));
    }, [setThreads]);

    const sendMessage = async () => {
        const userMsg = input.trim();
        if (!userMsg || isLoading || !activeThreadId || !activeThread) return;

        // Auto-rename thread based on first message if generic title
        if (activeThread.messages.length <= 1 && activeThread.title.startsWith('SESSION_')) {
            renameThread(activeThreadId, userMsg.slice(0, 30).toUpperCase());
        }

        // Add User Message
        const updatedMessages: ChatMessage[] = [
            ...activeThread.messages, 
            { id: uuidv4(), role: 'user', text: userMsg, metadata: { status: 'success' } }
        ];

        // Create Placeholder for AI Message
        const modelMessageId = uuidv4();
        const initialModelMessage: ChatMessage = { 
            id: modelMessageId, 
            role: 'model', 
            text: '', 
            metadata: { status: 'success', model: activeModel.name, provider: activeModel.provider } 
        };

        setThreads(prev => prev.map(t => t.id === activeThreadId ? { ...t, messages: [...updatedMessages, initialModelMessage] } : t));
        setInput('');
        setIsLoading(true);

        try {
            // RAG CONTEXT INJECTION
            let noteContext = "";
            if (isVaultSynced) {
                // Limit context size to avoid token overflow
                const relevantNotes = notes.slice(0, 50); 
                const contextList = relevantNotes.map(n => `- [${n.id.slice(0,4)}] ${n.title}: ${n.content.slice(0, 200)}...`).join('\n');
                noteContext = `[VAULT_DATABASE_ACTIVE]\nBerikut adalah cuplikan catatan user:\n${contextList}\n[END_VAULT]`;
            } else {
                noteContext = "🚫 [[VAULT_ACCESS_LOCKED]] (You cannot see user notes)";
            }

            const kernel = personaMode === 'melsa' ? MELSA_KERNEL : STOIC_KERNEL;
            
            // Execute Stream
            const stream = kernel.streamExecute(userMsg, activeThread.model_id, noteContext);
            
            let accumulatedText = "";
            let currentFunctionCall: any = null;

            for await (const chunk of stream) {
                if (chunk.text) accumulatedText += chunk.text;
                if (chunk.functionCall) currentFunctionCall = chunk.functionCall;

                // Update UI Stream
                setThreads(prev => prev.map(t => t.id === activeThreadId ? {
                    ...t,
                    messages: t.messages.map(m => m.id === modelMessageId ? {
                        ...m,
                        text: accumulatedText,
                        metadata: { 
                            ...m.metadata, 
                            groundingChunks: chunk.groundingChunks || m.metadata?.groundingChunks 
                        }
                    } : m)
                } : t));
            }

            // Text-to-Speech Trigger
            if (isAutoSpeak && accumulatedText && !currentFunctionCall) {
                speakWithMelsa(accumulatedText.replace(/[*#_`]/g, ''), personaMode === 'melsa' ? 'Melsa' : 'Fenrir');
            }

            // Handle Function Calling
            if (currentFunctionCall) {
                // Pass latest state via setNotes to ensure tools act on fresh data
                const toolResult = (currentFunctionCall.name === 'manage_note' && !isVaultSynced)
                    ? "❌ BLOCKED: Vault Access is Locked. Ask user to unlock it."
                    : await executeNeuralTool(currentFunctionCall, notes, setNotes);

                // Send tool result back to model for final response
                const followUpPrompt = `Tool "${currentFunctionCall.name}" Result: ${toolResult}. \nBerdasarkan hasil ini, berikan konfirmasi ramah kepada user.`;
                const followUpStream = kernel.streamExecute(followUpPrompt, activeThread.model_id, noteContext);
                
                accumulatedText += `\n\n> ⚙️ *System Action: ${toolResult}*\n\n`;
                
                for await (const chunk of followUpStream) {
                    if (chunk.text) accumulatedText += chunk.text;
                    setThreads(prev => prev.map(t => t.id === activeThreadId ? {
                        ...t,
                        messages: t.messages.map(m => m.id === modelMessageId ? { ...m, text: accumulatedText } : m)
                    } : t));
                }
            }
        } catch (err: any) {
             setThreads(prev => prev.map(t => t.id === activeThreadId ? { 
                ...t, 
                messages: t.messages.map(m => m.id === modelMessageId ? {
                    ...m, text: `Kernel Crash: ${err.message}`, metadata: { status: 'error' }
                } : m)
            } : t));
        } finally {
            setIsLoading(false);
        }
    };

    return {
        threads, setThreads,
        activeThread, activeThreadId, setActiveThreadId,
        isVaultSynced, setIsVaultSynced,
        isAutoSpeak, setIsAutoSpeak, 
        input, setInput,
        isLoading,
        activeModel,
        personaMode,
        handleNewChat,
        renameThread,
        sendMessage
    };
};
