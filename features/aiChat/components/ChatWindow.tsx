
import React, { memo, useMemo, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
    Flame, Brain, Check, CircuitBoard, 
    RefreshCw, Loader2, Terminal, Copy, ChevronDown, ChevronRight
} from 'lucide-react';
import { type ChatMessage } from '../../../types';

interface ChatWindowProps {
  messages: ChatMessage[];
  personaMode: 'hanisah' | 'stoic';
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onUpdateMessage?: (messageId: string, newText: string) => void;
}

const ToolExecutionTrace = ({ name, args, status }: { name: string, args: any, status: 'RUNNING' | 'DONE' | 'ERROR' }) => (
    <div className="my-2 rounded-xl overflow-hidden border border-white/5 bg-black/20 shadow-lg animate-slide-up group">
        <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.02] border-b border-white/5">
            <div className="flex items-center gap-2">
                {status === 'RUNNING' ? <RefreshCw size={10} className="animate-spin text-accent" /> : <Check size={10} className="text-emerald-500" />}
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400 group-hover:text-neutral-200 transition-colors">{name.replace(/_/g, ' ')}</span>
            </div>
            <div className={`text-[7px] font-mono px-1.5 py-0.5 rounded ${status === 'RUNNING' ? 'bg-accent/10 text-accent animate-pulse' : 'bg-emerald-500/10 text-emerald-500'}`}>{status}</div>
        </div>
        <div className="p-3">
            <div className="flex items-center gap-2 text-[8px] font-mono text-neutral-600 mb-1">
                <Terminal size={8}/> <span>PAYLOAD_SIGNATURE</span>
            </div>
            <pre className="text-[9px] font-mono text-neutral-400 whitespace-pre-wrap leading-tight overflow-x-auto scrollbar-thin scrollbar-thumb-white/10">
                {JSON.stringify(args, null, 2)}
            </pre>
        </div>
    </div>
);

const ThoughtBlock = ({ text }: { text: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="mb-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 overflow-hidden">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-2 hover:bg-indigo-500/10 transition-colors"
            >
                <div className="flex items-center gap-2 text-indigo-400 text-[9px] font-black uppercase tracking-[0.2em]">
                    <CircuitBoard size={12} className={isOpen ? "text-indigo-300" : "animate-pulse"} /> 
                    NEURAL_CHAIN_OF_THOUGHT
                </div>
                {isOpen ? <ChevronDown size={12} className="text-indigo-400"/> : <ChevronRight size={12} className="text-indigo-400"/>}
            </button>
            {isOpen && (
                <div className="p-4 pt-0 border-t border-indigo-500/10 animate-slide-down">
                    <p className="text-[10px] font-mono text-indigo-200/80 leading-relaxed whitespace-pre-wrap mt-3 font-medium">
                        {text}
                    </p>
                </div>
            )}
        </div>
    );
};

const MessageBubble = memo(({ msg, personaMode, isLoading }: any) => {
    const isModel = msg.role === 'model';
    const [isCopied, setIsCopied] = useState(false);
    
    const { thought, content, toolInfo } = useMemo(() => {
        let text = msg.text || '';
        let thoughtContent = null, toolData = null;
        
        if (text.includes('<think>')) {
            const parts = text.split('</think>');
            thoughtContent = parts[0].replace('<think>', '').trim();
            text = parts[1]?.trim() || '';
        }

        const toolMatch = text.match(/!!TOOL_START:\[(.*?)\]:\[(.*?)]!!/);
        if (toolMatch) {
            try {
                toolData = { name: toolMatch[1], args: JSON.parse(toolMatch[2]), status: 'RUNNING' };
                text = text.replace(toolMatch[0], '');
            } catch (e) {
                // Ignore parse errors for streaming JSON
            }
        }
        
        return { thought: thoughtContent, content: text, toolInfo: toolData };
    }, [msg.text]);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const accentColor = personaMode === 'hanisah' ? 'text-orange-500' : 'text-cyan-500';
    const glowColor = personaMode === 'hanisah' ? 'shadow-orange-500/20' : 'shadow-cyan-500/20';
    
    const bubbleStyle = isModel 
        ? 'bg-[#0f0f11] dark:bg-[#121214] border-black/5 dark:border-white/10 text-neutral-200' 
        : `bg-accent/10 border-accent/20 text-white shadow-lg ${glowColor}`;

    return (
        <div className={`flex w-full mb-8 ${isModel ? 'justify-start' : 'justify-end'} px-4 group/msg animate-fade-in relative`}>
            {isModel && (
                <div className="mr-4 shrink-0 flex flex-col items-center gap-2">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border border-white/10 shadow-xl bg-black/40 backdrop-blur-sm ${personaMode === 'hanisah' ? 'text-orange-500 shadow-orange-900/20' : 'text-cyan-500 shadow-cyan-900/20'}`}>
                        {personaMode === 'hanisah' ? <Flame size={20} fill="currentColor" className="opacity-80" /> : <Brain size={20} className="opacity-80" />}
                    </div>
                    {/* Line connector for continuous feel if needed, hidden for now */}
                </div>
            )}

            <div className={`relative max-w-[90%] md:max-w-[75%] lg:max-w-[65%] flex flex-col ${isModel ? 'items-start' : 'items-end'}`}>
                {isModel && (
                    <div className="flex items-center gap-3 mb-2 px-1 opacity-70">
                        <span className={`text-[8px] font-black uppercase tracking-[0.25em] ${accentColor}`}>
                            {personaMode.toUpperCase()}_KERNEL
                        </span>
                        {isLoading && <Loader2 size={10} className="animate-spin text-neutral-500" />}
                        {msg.metadata?.model && (
                             <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-widest bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                {msg.metadata.provider}::{msg.metadata.model}
                             </span>
                        )}
                    </div>
                )}

                <div className={`relative px-6 py-5 rounded-[24px] border shadow-sm transition-all duration-300 group/bubble ${bubbleStyle} ${isModel ? 'rounded-tl-none' : 'rounded-tr-none'}`}>
                    
                    {/* Copy Button Overlay */}
                    <button 
                        onClick={handleCopy}
                        className={`absolute top-2 right-2 p-1.5 rounded-lg bg-black/20 hover:bg-white/10 text-neutral-400 hover:text-white opacity-0 group-hover/bubble:opacity-100 transition-opacity duration-200 z-10 ${isCopied ? 'text-green-400' : ''}`}
                        title="Copy text"
                    >
                        {isCopied ? <Check size={14} /> : <Copy size={14} />}
                    </button>

                    {thought && <ThoughtBlock text={thought} />}
                    
                    {toolInfo && <ToolExecutionTrace {...toolInfo as any} />}
                    
                    <div className="prose dark:prose-invert prose-sm max-w-none text-[13px] md:text-sm leading-relaxed break-words font-medium">
                        <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
                        {isLoading && isModel && !content && <span className="inline-block w-1.5 h-4 bg-accent align-middle ml-1 animate-pulse"></span>}
                    </div>
                </div>
            </div>
        </div>
    );
});

export const ChatWindow: React.FC<ChatWindowProps> = memo(({ messages, personaMode, isLoading, messagesEndRef }) => {
  return (
    <div className="w-full py-6">
        <div className="relative z-10 max-w-5xl mx-auto">
            {messages.map((msg, i) => (
                <MessageBubble 
                    key={msg.id} 
                    msg={msg} 
                    personaMode={personaMode} 
                    isLoading={isLoading && i === messages.length - 1} 
                />
            ))}
            <div ref={messagesEndRef} className="h-4" />
        </div>
    </div>
  );
});
