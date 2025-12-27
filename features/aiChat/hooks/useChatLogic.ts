
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import useLocalStorage from '../../../hooks/useLocalStorage';
import { type ChatThread, type ChatMessage, type Note } from '../../../types';
import { MODEL_CATALOG, HANISAH_KERNEL } from '../../../services/melsaKernel';
import { STOIC_KERNEL } from '../../../services/stoicKernel';
import { executeNeuralTool } from '../services/toolHandler';
import { speakWithHanisah } from '../../../services/elevenLabsService';
import { useVault } from '../../../contexts/VaultContext';
import { useNeuralLink } from '../../../contexts/NeuralLinkContext';
import { db } from '../../../services/storage';

export const useChatLogic = (notes: Note[], setNotes: (notes: Note[]) => void) => {
    // We keep `threads` in state for React rendering, but initialize empty
    const [threads, setThreads] = useState<ChatThread[]>([]);
    // Track active thread ID in localStorage for persistence across reloads
    const [activeThreadId, setActiveThreadId] = useLocalStorage<string | null>('active_thread_id', null);
    const [globalModelId, setGlobalModelId] = useLocalStorage<string>('global_model_preference', 'llama-3.3-70b-versatile');
    
    const { isVaultUnlocked, lockVault, unlockVault, isVaultConfigEnabled } = useVault();
    const [isAutoSpeak] = useLocalStorage<boolean>('is_auto_speak', false);
    
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [, setIsLiveModeActive] = useState(false);

    const { setActiveTask } = useNeuralLink();

    const pendingThreadId = useRef<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Load threads from DB on mount
    useEffect(() => {
        const loadThreads = async () => {
            const storedThreads = await db.getAll<ChatThread>('CHATS');
            // Sort by updated descending
            storedThreads.sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
            setThreads(storedThreads);
        };
        loadThreads();
    }, []);

    // Persist threads to DB whenever they change
    useEffect(() => {
        if (threads.length > 0) {
            // Debounce or save individually? For safety, we save individually in actions, but bulk save here just in case.
            // Actually, better to save in actions to avoid perf hit.
            // But for simplicity in migration, we can do a bulk save for now or optimize later.
            // Let's rely on specific actions updating the DB.
        }
    }, [threads]);

    // Helper to update state AND DB
    const updateThreadsAndDB = useCallback((newThreads: ChatThread[]) => {
        setThreads(newThreads);
        // Fire and forget save
        db.saveAll('CHATS', newThreads).catch(e => console.warn("DB Save Failed", e));
    }, []);

    const activeThread = useMemo(() => {
        const targetId = activeThreadId || pendingThreadId.current;
        return threads.find(t => t.id === targetId) || null;
    }, [threads, activeThreadId]);

    const activeModel = useMemo(() => {
        const id = activeThread?.model_id || globalModelId;
        const validId = id === 'gemini-2.5-flash' ? 'gemini-2.0-flash-exp' : id;
        return MODEL_CATALOG.find(m => m.id === validId) || MODEL_CATALOG[0];
    }, [activeThread, globalModelId]);

    const personaMode = activeThread?.persona || 'stoic';
    const vaultEnabled = isVaultConfigEnabled(personaMode);

    const handleNewChat = useCallback(async (persona: 'hanisah' | 'stoic' = 'stoic') => {
        const welcome = persona === 'hanisah' 
            ? "Hanisah online. Sistem siap bantu Tuan. Apa rencana besar hari ini? Jangan yang bikin pusing ya, lagi pengen santai nih." 
            : "🧠 **STOIC_LOGIC ACTIVE.**\n\nSelamat datang kembali. Mari kita analisis situasi Anda dengan perspektif kontrol internal.";
        
        const newId = uuidv4();
        pendingThreadId.current = newId;

        const newThread: ChatThread = {
            id: newId,
            title: `SESSION_${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            persona,
            model_id: globalModelId, 
            messages: [{ id: uuidv4(), role: 'model', text: welcome, metadata: { status: 'success', model: 'System' } }],
            updated: new Date().toISOString(),
            isPinned: false
        };
        
        const updatedThreads = [newThread, ...threads];
        updateThreadsAndDB(updatedThreads);
        setActiveThreadId(newId);
        return newThread;
    }, [setActiveThreadId, threads, globalModelId, updateThreadsAndDB]);

    const renameThread = useCallback(async (id: string, newTitle: string) => {
        const updated = threads.map(t => t.id === id ? { ...t, title: newTitle, updated: new Date().toISOString() } : t);
        updateThreadsAndDB(updated);
    }, [threads, updateThreadsAndDB]);

    const togglePinThread = useCallback(async (id: string) => {
        const updated = threads.map(t => t.id === id ? { ...t, isPinned: !t.isPinned } : t);
        updateThreadsAndDB(updated);
    }, [threads, updateThreadsAndDB]);

    const stopGeneration = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsLoading(false);
            setActiveTask(null);
        }
    }, [setActiveTask]);

    const sendMessage = async (e?: React.FormEvent, attachment?: { data: string, mimeType: string }) => {
        const userMsg = input.trim();
        if ((!userMsg && !attachment) || isLoading) return;

        let targetThread = activeThread;
        let targetId = activeThreadId;

        if (!targetId || !targetThread) {
            targetThread = await handleNewChat(personaMode);
            targetId = targetThread.id;
        }

        const userMessageId = uuidv4();
        const modelMessageId = uuidv4();
        const now = new Date().toISOString();

        const newUserMsg: ChatMessage = { id: userMessageId, role: 'user', text: attachment ? (userMsg || "Analyze attachment") : userMsg, metadata: { status: 'success' } };
        const initialModelMsg: ChatMessage = { id: modelMessageId, role: 'model', text: '', metadata: { status: 'success', model: activeModel.name, provider: activeModel.provider } };

        const tempThreads = threads.map(t => t.id === targetId ? { ...t, messages: [...t.messages, newUserMsg, initialModelMsg], updated: now } : t);
        updateThreadsAndDB(tempThreads);

        if (targetThread.messages.length <= 1 && userMsg) {
            renameThread(targetId, userMsg.slice(0, 30).toUpperCase());
        }

        setInput('');
        setIsLoading(true);

        const controller = new AbortController();
        abortControllerRef.current = controller;
        const signal = controller.signal;

        try {
            // REAL VAULT GATING LOGIC
            const vaultUnlockedFlag = isVaultUnlocked && vaultEnabled;
            let vaultContext = "";
            
            if (vaultUnlockedFlag) {
                vaultContext = `[VAULT_STATUS: DECRYPTED]\nYou have access to user nodes via 'search_notes' and 'read_note'. Current Node Count: ${notes.length}`;
            } else {
                vaultContext = `[VAULT_STATUS: ENCRYPTED]\nVault access is locked. Do not attempt to read notes. If the user asks about personal memory, tell them to unlock the vault via the PIN icon.`;
            }

            const kernel = personaMode === 'hanisah' ? HANISAH_KERNEL : STOIC_KERNEL;
            
            const stream = kernel.streamExecute(
                userMsg || "Analyze attachment", 
                activeModel.id, 
                vaultContext, 
                attachment,
                { signal, vaultUnlocked: vaultUnlockedFlag } 
            );
            
            let accumulatedText = "";

            for await (const chunk of stream) {
                if (signal.aborted) throw new Error("ABORTED_BY_USER");

                if (chunk.text) {
                    accumulatedText += chunk.text;
                }

                if (chunk.functionCall) {
                    const toolName = chunk.functionCall.name;
                    setActiveTask(`ACCESSING: ${toolName.toUpperCase()}...`);
                    
                    const toolMarker = `!!TOOL_START:[${toolName}]:[${JSON.stringify(chunk.functionCall.args)}]!!`;
                    
                    // We update state for UI feedback but don't DB save every token
                    setThreads(prev => prev.map(t => t.id === targetId ? {
                        ...t,
                        messages: t.messages.map(m => m.id === modelMessageId ? { ...m, text: accumulatedText + toolMarker } : m)
                    } : t));

                    try {
                        const toolResult = await executeNeuralTool(chunk.functionCall, notes, setNotes);
                        accumulatedText += `\n\n> ⚙️ **${toolName.toUpperCase()}**: _${toolResult.slice(0, 150)}${toolResult.length > 150 ? '...' : ''}_\n\n`;
                    } catch (toolError: any) {
                        accumulatedText += `\n\n> ❌ **TOOL_FAIL**: ${toolError.message}\n\n`;
                    } finally {
                        setActiveTask(null);
                    }
                }

                setThreads(prev => prev.map(t => t.id === targetId ? {
                    ...t,
                    messages: t.messages.map(m => m.id === modelMessageId ? {
                        ...m,
                        text: accumulatedText,
                        metadata: { ...m.metadata, ...(chunk.metadata || {}), groundingChunks: chunk.groundingChunks || m.metadata?.groundingChunks }
                    } : m)
                } : t));
            }

            // Final DB Save on Completion
            setThreads(prev => {
                const finalThreads = prev.map(t => t.id === targetId ? {
                    ...t,
                    messages: t.messages.map(m => m.id === modelMessageId ? {
                        ...m,
                        text: accumulatedText
                    } : m)
                } : t);
                db.saveAll('CHATS', finalThreads); // Background save
                return finalThreads;
            });

            if (isAutoSpeak && accumulatedText) {
                speakWithHanisah(accumulatedText.replace(/[*#_`]/g, ''), personaMode === 'hanisah' ? 'Hanisah' : 'Fenrir');
            }

        } catch (err: any) {
            let errorText = `⚠️ **COMMUNICATION_BREAK**: ${err.message}`;
            if (err.message === "ABORTED_BY_USER") errorText = `\n\n> 🛑 **INTERRUPTED**`;
            
            const errThreads = threads.map(t => t.id === targetId ? { 
                ...t, 
                messages: t.messages.map(m => m.id === modelMessageId ? { ...m, text: m.text + errorText } : m)
            } : t);
            updateThreadsAndDB(errThreads);
        } finally {
            setIsLoading(false);
            setActiveTask(null);
            abortControllerRef.current = null;
        }
    };

    return {
        threads, setThreads: updateThreadsAndDB, // Expose wrapped setter
        activeThread, activeThreadId, setActiveThreadId,
        isVaultSynced: isVaultUnlocked, 
        setIsVaultSynced: (val: boolean) => val ? unlockVault() : lockVault(),
        isVaultConfigEnabled: vaultEnabled,
        isLiveModeActive: false, setIsLiveModeActive, 
        input, setInput,
        isLoading,
        activeModel,
        setGlobalModelId,
        personaMode,
        handleNewChat,
        renameThread,
        togglePinThread,
        sendMessage,
        stopGeneration 
    };
};
