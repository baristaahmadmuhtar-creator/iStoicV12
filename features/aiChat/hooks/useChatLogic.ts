
import { useState, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import useLocalStorage from '../../../hooks/useLocalStorage';
import { type ChatThread, type ChatMessage, type Note } from '../../../types';
import { MODEL_CATALOG, MELSA_KERNEL } from '../../../services/melsaKernel';
import { STOIC_KERNEL } from '../../../services/stoicKernel';
import { executeNeuralTool } from '../services/toolHandler';
import { speakWithMelsa } from '../../../services/elevenLabsService';
import { useVault } from '../../../contexts/VaultContext';

export const useChatLogic = (notes: Note[], setNotes: (notes: Note[]) => void) => {
    const [threads, setThreads] = useLocalStorage<ChatThread[]>('chat_threads', []);
    const [activeThreadId, setActiveThreadId] = useLocalStorage<string | null>('active_thread_id', null);
    
    // SECURITY: Use Global Context
    const { isVaultUnlocked, lockVault, unlockVault, isVaultConfigEnabled } = useVault();
    
    // Settings
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
    
    // Check Config relative to persona
    const vaultEnabled = isVaultConfigEnabled(personaMode);

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
            updated: new Date().toISOString(),
            isPinned: false
        };
        
        setThreads(prev => [newThread, ...prev]);
        setActiveThreadId(newThread.id);
    }, [setActiveThreadId, setThreads]);

    const renameThread = useCallback(async (id: string, newTitle: string) => {
        setThreads(prev => prev.map(t => t.id === id ? { ...t, title: newTitle, updated: new Date().toISOString() } : t));
    }, [setThreads]);

    const togglePinThread = useCallback(async (id: string) => {
        setThreads(prev => prev.map(t => t.id === id ? { ...t, isPinned: !t.isPinned } : t));
    }, [setThreads]);

    const sendMessage = async (e?: React.FormEvent, attachment?: { data: string, mimeType: string }) => {
        const userMsg = input.trim();
        // Allow empty message if there is an attachment
        if ((!userMsg && !attachment) || isLoading || !activeThreadId || !activeThread) return;

        // Auto-rename thread based on first message if generic title
        if (activeThread.messages.length <= 1 && activeThread.title.startsWith('SESSION_') && userMsg) {
            renameThread(activeThreadId, userMsg.slice(0, 30).toUpperCase());
        } else if (activeThread.messages.length <= 1 && activeThread.title.startsWith('SESSION_') && attachment) {
            renameThread(activeThreadId, "IMAGE_ANALYSIS");
        }

        // Add User Message
        const messageText = attachment ? (userMsg ? userMsg : "Sent an image.") : userMsg;
        const updatedMessages: ChatMessage[] = [
            ...activeThread.messages, 
            { id: uuidv4(), role: 'user', text: messageText, metadata: { status: 'success' } }
        ];

        // Create Placeholder for AI Message
        const modelMessageId = uuidv4();
        const initialModelMessage: ChatMessage = { 
            id: modelMessageId, 
            role: 'model', 
            text: '', 
            metadata: { status: 'success', model: activeModel.name, provider: activeModel.provider } 
        };

        // Update thread with new messages AND update the timestamp so it bumps to top
        const now = new Date().toISOString();
        setThreads(prev => prev.map(t => t.id === activeThreadId ? { 
            ...t, 
            messages: [...updatedMessages, initialModelMessage],
            updated: now 
        } : t));
        
        setInput('');
        setIsLoading(true);

        try {
            // RAG CONTEXT INJECTION LOGIC (STRICT SECURITY)
            let noteContext = "";
            
            // CRITICAL CHECK: Global Unlock State && Config Enabled
            if (isVaultUnlocked && vaultEnabled) {
                // Limit context size to avoid token overflow
                const relevantNotes = notes.slice(0, 50); 
                const contextList = relevantNotes.map(n => {
                    const taskInfo = n.tasks && n.tasks.length > 0 
                        ? `[Pending Tasks: ${n.tasks.filter(t => !t.isCompleted).length}]` 
                        : '';
                    return `- [${n.id.slice(0,4)}] ${n.title} ${taskInfo}: ${n.content.slice(0, 200)}...`;
                }).join('\n');
                noteContext = `[VAULT_DATABASE_ACTIVE]\n[SECURITY: UNLOCKED]\nBerikut adalah cuplikan catatan user yang TERENKRIPSI namun dibuka untuk sesi ini:\n${contextList}\n[END_VAULT]`;
            } else {
                noteContext = vaultEnabled 
                    ? "🚫 [[VAULT_ACCESS_LOCKED]] (User has NOT authenticated via PIN in Dashboard/Chat. DO NOT reveal any personal data.)" 
                    : "🚫 [[VAULT_SYSTEM_OFFLINE]] (Module disabled in System Configuration. No access possible.)";
            }

            const kernel = personaMode === 'melsa' ? MELSA_KERNEL : STOIC_KERNEL;
            
            // Execute Stream - Kernel will handle routing logic and errors internally
            // Note: Stoic kernel currently doesn't support attachment in `streamExecute` via types signature, 
            // but for simplicity we assume Melsa use cases for visuals mostly. 
            // If Stoic used, attachment will be ignored or handled if kernel updated.
            const stream = kernel.streamExecute(userMsg || (attachment ? "Analyze this image." : "."), activeThread.model_id, noteContext, attachment);
            
            let accumulatedText = "";
            let currentFunctionCall: any = null;

            for await (const chunk of stream) {
                if (chunk.text) accumulatedText += chunk.text;
                if (chunk.functionCall) currentFunctionCall = chunk.functionCall;

                // Update UI Stream in real-time
                setThreads(prev => prev.map(t => t.id === activeThreadId ? {
                    ...t,
                    messages: t.messages.map(m => m.id === modelMessageId ? {
                        ...m,
                        text: accumulatedText,
                        metadata: { 
                            ...m.metadata, 
                            ...(chunk.metadata ? chunk.metadata : {}),
                            groundingChunks: chunk.groundingChunks || m.metadata?.groundingChunks 
                        }
                    } : m)
                } : t));
            }

            if (isAutoSpeak && accumulatedText && !currentFunctionCall) {
                speakWithMelsa(accumulatedText.replace(/[*#_`]/g, ''), personaMode === 'melsa' ? 'Melsa' : 'Fenrir');
            }

            // Handle Function Calling with SECURE CHECKS
            if (currentFunctionCall) {
                let toolResult = "";
                
                if (currentFunctionCall.name === 'manage_note') {
                    if (!vaultEnabled) {
                        toolResult = "❌ SYSTEM_ERROR: Vault Module is disabled in Settings.";
                    } else if (!isVaultUnlocked) {
                        toolResult = "❌ ACCESS_DENIED: Vault Access is Locked. Ask user to click 'Authenticate' (Logo Gembok).";
                    } else {
                        toolResult = await executeNeuralTool(currentFunctionCall, notes, setNotes);
                    }
                } else {
                    toolResult = await executeNeuralTool(currentFunctionCall, notes, setNotes);
                }

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
                    ...m, text: `⚠️ **CRITICAL KERNEL FAILURE**: Sistem tidak dapat memulihkan koneksi.\n\n_Manual Reboot Required._`, metadata: { status: 'error' }
                } : m)
            } : t));
        } finally {
            setIsLoading(false);
        }
    };

    return {
        threads, setThreads,
        activeThread, activeThreadId, setActiveThreadId,
        isVaultSynced: isVaultUnlocked, 
        setIsVaultSynced: (val: boolean) => val ? unlockVault() : lockVault(), // Bridge to Context
        isVaultConfigEnabled: vaultEnabled,
        isAutoSpeak, setIsAutoSpeak, 
        input, setInput,
        isLoading,
        activeModel,
        personaMode,
        handleNewChat,
        renameThread,
        togglePinThread,
        sendMessage
    };
};
