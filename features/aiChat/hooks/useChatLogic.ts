
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import useLocalStorage from '../../../hooks/useLocalStorage';
import { type ChatThread, type ChatMessage, type Note } from '../../../types';
import { MODEL_CATALOG, HANISAH_KERNEL } from '../../../services/melsaKernel';
import { STOIC_KERNEL } from '../../../services/stoicKernel';
import { executeNeuralTool } from '../services/toolHandler';
import { speakWithHanisah } from '../../../services/elevenLabsService';
import { useVault } from '../../../contexts/VaultContext';
import { debugService } from '../../../services/debugService';

export const useChatLogic = (notes: Note[], setNotes: (notes: Note[]) => void) => {
    const [threads, setThreads] = useLocalStorage<ChatThread[]>('chat_threads', []);
    const [activeThreadId, setActiveThreadId] = useLocalStorage<string | null>('active_thread_id', null);
    const [globalModelId, setGlobalModelId] = useLocalStorage<string>('global_model_preference', 'llama-3.3-70b-versatile');
    
    const { isVaultUnlocked, lockVault, unlockVault, isVaultConfigEnabled } = useVault();
    const [isAutoSpeak, setIsAutoSpeak] = useLocalStorage<boolean>('is_auto_speak', false);
    
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isLiveModeActive, setIsLiveModeActive] = useState(false);

    // PERSISTENT REF: To prevent race condition during thread creation
    const pendingThreadId = useRef<string | null>(null);

    const activeThread = useMemo(() => {
        const targetId = activeThreadId || pendingThreadId.current;
        return threads.find(t => t.id === targetId) || null;
    }, [threads, activeThreadId]);

    const activeModel = useMemo(() => {
        const id = activeThread?.model_id || globalModelId;
        return MODEL_CATALOG.find(m => m.id === id) || MODEL_CATALOG[0];
    }, [activeThread, globalModelId]);

    const personaMode = activeThread?.persona || 'stoic';
    const vaultEnabled = isVaultConfigEnabled(personaMode);

    const handleNewChat = useCallback(async (persona: 'hanisah' | 'stoic' = 'stoic') => {
        const welcome = persona === 'hanisah' 
            ? "⚡ **HANISAH PLATINUM ONLINE.**\n\n*Halo Sayang, aku sudah siap. Apa yang bisa kubantu hari ini?*" 
            : "🧠 **STOIC_LOGIC ACTIVE.**\n\nMari kita bedah masalah Anda dengan akal budi dan ketenangan.";
        
        const newId = uuidv4();
        pendingThreadId.current = newId;

        const newThread: ChatThread = {
            id: newId,
            title: `NEW_SESSION_${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            persona,
            model_id: globalModelId, 
            messages: [{ id: uuidv4(), role: 'model', text: welcome, metadata: { status: 'success', model: 'System' } }],
            updated: new Date().toISOString(),
            isPinned: false
        };
        
        setThreads(prev => [newThread, ...prev]);
        setActiveThreadId(newId);
        
        console.debug(`[CHAT_LOGIC] New session created: ${newId} (Persona: ${persona})`);
        return newThread;
    }, [setActiveThreadId, setThreads, globalModelId]);

    const renameThread = useCallback(async (id: string, newTitle: string) => {
        setThreads(prev => prev.map(t => t.id === id ? { ...t, title: newTitle, updated: new Date().toISOString() } : t));
    }, [setThreads]);

    const togglePinThread = useCallback(async (id: string) => {
        setThreads(prev => prev.map(t => t.id === id ? { ...t, isPinned: !t.isPinned } : t));
    }, [setThreads]);

    const sendMessage = async (e?: React.FormEvent, attachment?: { data: string, mimeType: string }) => {
        const userMsg = input.trim();
        if ((!userMsg && !attachment) || isLoading) return;

        let targetThread = activeThread;
        let targetId = activeThreadId;

        // DIAGNOSTIC LOG START
        const transmissionId = uuidv4().slice(0,8);
        console.group(`🧠 NEURAL_LINK_TRANSMISSION: ${transmissionId}`);
        console.log("Payload:", { userMsg, attachment: !!attachment, model: activeModel.id });

        // 1. ATOMIC SESSION INITIALIZATION
        if (!targetId || !targetThread) {
            console.log("No active session. Initializing new thread...");
            targetThread = await handleNewChat(personaMode);
            targetId = targetThread.id;
        }

        // 2. STATE PREPARATION
        const userMessageId = uuidv4();
        const modelMessageId = uuidv4();
        const now = new Date().toISOString();

        const newUserMsg: ChatMessage = { 
            id: userMessageId, 
            role: 'user', 
            text: attachment ? (userMsg || "Analyze attachment") : userMsg, 
            metadata: { status: 'success' } 
        };

        const initialModelMsg: ChatMessage = { 
            id: modelMessageId, 
            role: 'model', 
            text: '', 
            metadata: { 
                status: 'success', 
                model: activeModel.name, 
                provider: activeModel.provider 
            } 
        };

        // UI LOCK: Add messages immediately to lock the view into ChatWindow
        setThreads(prev => prev.map(t => t.id === targetId ? { 
            ...t, 
            messages: [...t.messages, newUserMsg, initialModelMsg],
            updated: now 
        } : t));

        if (targetThread.messages.length <= 1 && userMsg) {
            renameThread(targetId, userMsg.slice(0, 30).toUpperCase());
        }

        setInput('');
        setIsLoading(true);

        // 3. EXECUTION BLOCK
        try {
            let noteContext = "";
            if (isVaultUnlocked && vaultEnabled) {
                noteContext = `[VAULT_UNLOCKED]\nNotes: ${notes.slice(0, 20).map(n => n.title).join(', ')}`;
            }

            const kernel = personaMode === 'hanisah' ? HANISAH_KERNEL : STOIC_KERNEL;
            const stream = kernel.streamExecute(userMsg || "Proceed with attachment analysis.", activeModel.id, noteContext, attachment);
            
            let accumulatedText = "";
            let chunkCount = 0;

            for await (const chunk of stream) {
                if (chunk.text) {
                    accumulatedText += chunk.text;
                    chunkCount++;
                }

                // Periodic UI update to reduce render thrashing but keep it responsive
                setThreads(prev => prev.map(t => t.id === targetId ? {
                    ...t,
                    messages: t.messages.map(m => m.id === modelMessageId ? {
                        ...m,
                        text: accumulatedText,
                        metadata: { 
                            ...m.metadata, 
                            ...(chunk.metadata || {}),
                            groundingChunks: chunk.groundingChunks || m.metadata?.groundingChunks 
                        }
                    } : m)
                } : t));
            }

            // 4. RESPONSE VALIDATION
            if (!accumulatedText.trim() && chunkCount === 0) {
                console.warn(`[${transmissionId}] Zero token response detected.`);
                throw new Error("EMPTY_AI_RESPONSE: Node returned zero tokens.");
            }

            console.log(`Transmission success. Chunks: ${chunkCount}, Length: ${accumulatedText.length}`);

            if (isAutoSpeak && accumulatedText) {
                speakWithHanisah(accumulatedText.replace(/[*#_`]/g, ''), personaMode === 'hanisah' ? 'Hanisah' : 'Fenrir');
            }

        } catch (err: any) {
            console.error(`[${transmissionId}] CRITICAL_FAILURE:`, err);
            const errorText = `⚠️ **COMMUNICATION_BREAK**: ${err.message || "Unknown anomaly in logic stream."}\n\n_Sistem tetap aktif. Silakan coba lagi atau ganti model._`;
            
            setThreads(prev => prev.map(t => t.id === targetId ? { 
                ...t, 
                messages: t.messages.map(m => m.id === modelMessageId ? {
                    ...m, 
                    text: errorText, 
                    metadata: { ...m.metadata, status: 'error', errorDetails: err.stack }
                } : m)
            } : t));

            debugService.reportUIError("CHAT_STREAM_FAILURE");
        } finally {
            setIsLoading(false);
            console.groupEnd();
        }
    };

    return {
        threads, setThreads,
        activeThread, activeThreadId, setActiveThreadId,
        isVaultSynced: isVaultUnlocked, 
        setIsVaultSynced: (val: boolean) => val ? unlockVault() : lockVault(),
        isVaultConfigEnabled: vaultEnabled,
        isAutoSpeak, setIsAutoSpeak,
        isLiveModeActive, setIsLiveModeActive, 
        input, setInput,
        isLoading,
        activeModel,
        setGlobalModelId,
        personaMode,
        handleNewChat,
        renameThread,
        togglePinThread,
        sendMessage
    };
};
