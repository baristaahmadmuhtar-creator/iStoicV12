
import React, { memo, useMemo } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
    Flame, Brain, Check, CircuitBoard, 
    RefreshCw, Loader2, Terminal
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
    <div className="my-3 rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-xl animate-slide-up">
        <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
            <div className="flex items-center gap-2">
                {status === 'RUNNING' ? <RefreshCw size={10} className="animate-spin text-accent" /> : <Check size={10} className="text-emerald-500" />}
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-300">{name.replace(/_/g, ' ')}</span>
            </div>
            <div className={`text-[7px] font-mono px-1.5 py-0.5 rounded ${status === 'RUNNING' ? 'bg-accent/20 text-accent animate-pulse' : 'bg-emerald-500/20 text-emerald-500'}`}>{status}</div>
        </div>
        <div className="p-4">
            <div className="flex items-center gap-2 text-[8px] font-mono text-neutral-500 mb-1">
                <Terminal size={8}/> <span>PAYLOAD:</span>
            </div>
            <pre className="text-[10px] font-mono text-accent/70 whitespace-pre-wrap leading-tight overflow-x-auto">
                {JSON.stringify(args, null, 2)}
            </pre>
        </div>
    </div>
);

const MessageBubble = memo(({ msg, personaMode, isLoading }: any) => {
    const isModel = msg.role === 'model';
    
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

    const accentColor = personaMode === 'hanisah' ? 'text-orange-500' : 'text-cyan-500';
    const bubbleBg = isModel 
        ? 'bg-[#0f0f11] dark:bg-[#121214] border-black/5 dark:border-white/5' 
        : 'bg-accent/10 border-accent/20 text-white';

    return (
        <div className={`flex w-full mb-6 ${isModel ? 'justify-start' : 'justify-end'} px-4 group/msg animate-fade-in`}>
            {isModel && (
                <div className="mr-3 shrink-0">
                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center border border-white/10 shadow-lg ${personaMode === 'hanisah' ? 'bg-orange-500/10 text-orange-500' : 'bg-cyan-500/10 text-cyan-500'}`}>
                        {personaMode === 'hanisah' ? <Flame size={18} /> : <Brain size={18} />}
                    </div>
                </div>
            )}

            <div className={`relative max-w-[90%] md:max-w-[80%] flex flex-col ${isModel ? 'items-start' : 'items-end'}`}>
                {isModel && (
                    <div className="flex items-center gap-2 mb-1.5 px-1 opacity-50">
                        <span className={`text-[8px] font-black uppercase tracking-widest ${accentColor}`}>
                            {personaMode.toUpperCase()}_KERNEL
                        </span>
                        {isLoading && <Loader2 size={8} className="animate-spin text-accent" />}
                    </div>
                )}

                <div className={`relative px-5 py-4 rounded-[28px] border shadow-sm transition-all duration-300 ${bubbleBg} ${isModel ? 'rounded-tl-none' : 'rounded-tr-none'}`}>
                    {thought && (
                        <div className="mb-4 p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl">
                             <div className="flex items-center gap-2 mb-2 text-indigo-400 text-[8px] font-black uppercase tracking-widest">
                                <CircuitBoard size={10} className="animate-pulse" /> LOGIC_TRACE
                             </div>
                             <p className="text-[10px] font-mono text-neutral-400 leading-relaxed italic">{thought}</p>
                        </div>
                    )}
                    
                    {toolInfo && <ToolExecutionTrace {...toolInfo as any} />}
                    
                    <div className="prose dark:prose-invert prose-sm max-w-none text-[13px] md:text-sm leading-relaxed break-words">
                        <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
                        {isLoading && isModel && !content && <span className="inline-block w-1.5 h-4 bg-accent align-middle ml-1 animate-pulse"></span>}
                    </div>
                </div>

                {isModel && msg.metadata?.model && (
                    <div className="mt-2 px-2 flex items-center gap-2 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                         <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-widest bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                            {msg.metadata.provider} // {msg.metadata.model}
                         </span>
                    </div>
                )}
            </div>
        </div>
    );
});

export const ChatWindow: React.FC<ChatWindowProps> = memo(({ messages, personaMode, isLoading, messagesEndRef }) => {
  return (
    <div className="w-full py-8">
        <div className="relative z-10 max-w-4xl mx-auto">
            {messages.map((msg, i) => (
                <MessageBubble 
                    key={msg.id} 
                    msg={msg} 
                    personaMode={personaMode} 
                    isLoading={isLoading && i === messages.length - 1} 
                />
            ))}
            <div ref={messagesEndRef} className="h-10" />
        </div>
    </div>
  );
});
