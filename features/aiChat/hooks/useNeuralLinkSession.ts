
import { useState, useRef, useCallback } from 'react';
import { NeuralLinkService, type NeuralLinkStatus } from '../../../services/neuralLink';
import { MELSA_BRAIN } from '../../../services/melsaBrain';
import { executeNeuralTool } from '../services/toolHandler';
import { type Note } from '../../../types';

export const useNeuralLinkSession = (personaMode: 'melsa' | 'stoic', notes: Note[], setNotes: (notes: Note[]) => void) => {
    const [isLiveMode, setIsLiveMode] = useState(false);
    const [liveStatus, setLiveStatus] = useState<NeuralLinkStatus>('IDLE');
    const [liveTranscript, setLiveTranscript] = useState('');
    const neuralLink = useRef<NeuralLinkService>(new NeuralLinkService());

    const toggleLiveMode = useCallback(async () => {
        if (isLiveMode) {
            neuralLink.current.disconnect();
            setIsLiveMode(false);
            setLiveStatus('IDLE');
        } else {
            setLiveTranscript('');
            const noteContext = notes.map(n => `- ${n.title}`).join('\n');
            const systemInstruction = MELSA_BRAIN.getSystemInstruction(personaMode, noteContext);
            
            setIsLiveMode(true);
            try {
                const storedVoice = localStorage.getItem(`${personaMode}_voice`);
                const voice = storedVoice ? JSON.parse(storedVoice) : (personaMode === 'melsa' ? 'Zephyr' : 'Fenrir');

                await neuralLink.current.connect({
                    modelId: 'gemini-2.5-flash-native-audio-preview-09-2025',
                    persona: personaMode,
                    systemInstruction,
                    voiceName: voice,
                    onStatusChange: (status, error) => {
                        setLiveStatus(status);
                        if (status === 'ERROR') setIsLiveMode(false);
                    },
                    onTranscription: (event) => {
                        if (event.source === 'model') setLiveTranscript(prev => event.isFinal ? event.text : prev + event.text);
                    },
                    onToolCall: async (call) => await executeNeuralTool(call, notes, setNotes)
                });
            } catch (e) {
                setIsLiveMode(false);
            }
        }
    }, [isLiveMode, personaMode, notes, setNotes]);

    return {
        isLiveMode,
        liveStatus,
        liveTranscript,
        toggleLiveMode,
        analyser: neuralLink.current.analyser
    };
};
