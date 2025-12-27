
import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { NeuralLinkService, type NeuralLinkStatus, type TranscriptionEvent } from '../services/neuralLink';
import { executeNeuralTool } from '../features/aiChat/services/toolHandler';
import { type Note } from '../types';
import { debugService } from '../services/debugService';
import { HANISAH_BRAIN } from '../services/melsaBrain';

interface LiveSessionContextType {
    isLive: boolean;
    isMinimized: boolean;
    status: NeuralLinkStatus;
    transcript: Array<{ role: 'user' | 'model', text: string }>;
    interimTranscript: { role: 'user' | 'model', text: string } | null;
    activeTool: string | null; // Currently executing tool
    analyser: AnalyserNode | null;
    startSession: (persona: 'hanisah' | 'stoic') => void;
    stopSession: () => void;
    toggleMinimize: () => void;
}

const LiveSessionContext = createContext<LiveSessionContextType | undefined>(undefined);

// Receives Notes from App State (IDB Source of Truth)
interface LiveSessionProviderProps {
    children: React.ReactNode;
    notes: Note[];
    setNotes: (notes: Note[]) => void;
}

export const LiveSessionProvider: React.FC<LiveSessionProviderProps> = ({ children, notes, setNotes }) => {
    // We use a Ref to access the latest notes inside async callbacks without stale closures
    const notesRef = useRef(notes);
    
    // Keep Ref in sync with prop updates
    useEffect(() => {
        notesRef.current = notes;
    }, [notes]);

    // Session State
    const [isLive, setIsLive] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [status, setStatus] = useState<NeuralLinkStatus>('IDLE');
    const [transcript, setTranscript] = useState<Array<{ role: 'user' | 'model', text: string }>>([]);
    const [interimTranscript, setInterimTranscript] = useState<{ role: 'user' | 'model', text: string } | null>(null);
    const [activeTool, setActiveTool] = useState<string | null>(null);

    const neuralLink = useRef<NeuralLinkService>(new NeuralLinkService());

    // Clean up on unmount
    useEffect(() => {
        return () => {
            neuralLink.current.disconnect(true);
        };
    }, []);

    const startSession = useCallback(async (persona: 'hanisah' | 'stoic') => {
        if (isLive) return;

        // Reset UI
        setTranscript([]);
        setInterimTranscript(null);
        setIsMinimized(false);
        setIsLive(true);
        setStatus('CONNECTING');

        try {
            // Prepare Context (Use current prop state)
            const noteContext = notes.map(n => `- ${n.title} (ID: ${n.id})`).join('\n');
            const systemInstruction = HANISAH_BRAIN.getSystemInstruction(persona, noteContext);
            const storedVoice = localStorage.getItem(`${persona}_voice`);
            const voice = storedVoice ? JSON.parse(storedVoice) : (persona === 'hanisah' ? 'Zephyr' : 'Fenrir');

            await neuralLink.current.connect({
                modelId: 'gemini-2.5-flash-native-audio-preview-09-2025',
                persona,
                systemInstruction,
                voiceName: voice,
                onStatusChange: (newStatus, err) => {
                    setStatus(newStatus);
                    if (newStatus === 'ERROR') {
                        setIsLive(false);
                        debugService.log('ERROR', 'LIVE_CTX', 'CONNECT_FAIL', err || 'Unknown');
                    }
                },
                onTranscription: (event) => {
                    if (event.isFinal) {
                        setTranscript(prev => [...prev, { role: event.source, text: event.text }]);
                        setInterimTranscript(null);
                    } else {
                        setInterimTranscript({ role: event.source, text: event.text });
                    }
                },
                onToolCall: async (call) => {
                    const toolName = call.name;
                    setActiveTool(toolName); // Show loading indicator
                    debugService.log('INFO', 'LIVE_CTX', 'TOOL_EXEC', toolName);
                    
                    try {
                        // Access LATEST notes via Ref to ensure tool has current DB state
                        const currentNotes = notesRef.current;
                        
                        const result = await executeNeuralTool(call, currentNotes, (newNotes) => {
                            // Update Global App State via Prop function
                            setNotes(newNotes);
                        });
                        return result;
                    } catch (e: any) {
                        console.error("Tool execution failed", e);
                        return `Error executing ${toolName}: ${e.message}`;
                    } finally {
                        setActiveTool(null); // Hide loading
                    }
                }
            });
        } catch (e) {
            console.error(e);
            setIsLive(false);
            setStatus('ERROR');
        }
    }, [isLive, notes, setNotes]);

    const stopSession = useCallback(() => {
        neuralLink.current.disconnect();
        setIsLive(false);
        setIsMinimized(false);
        setStatus('IDLE');
        setActiveTool(null);
    }, []);

    const toggleMinimize = useCallback(() => {
        setIsMinimized(prev => !prev);
    }, []);

    return (
        <LiveSessionContext.Provider value={{
            isLive,
            isMinimized,
            status,
            transcript,
            interimTranscript,
            activeTool,
            analyser: neuralLink.current.analyser,
            startSession,
            stopSession,
            toggleMinimize
        }}>
            {children}
        </LiveSessionContext.Provider>
    );
};

export const useLiveSession = () => {
    const context = useContext(LiveSessionContext);
    if (!context) {
        throw new Error('useLiveSession must be used within a LiveSessionProvider');
    }
    return context;
};
